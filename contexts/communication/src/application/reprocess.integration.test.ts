// Reproceso de entregas (T-0026), contra el Postgres local (R-26). Lo que se prueba es
// la cadena entera: entrega recibida → guardada → procesada una vez o reprocesable →
// fallo visible. Sin skip: si no hay Postgres, la suite falla.

import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import { STALLED_PENDING_AFTER_MS } from '../domain/reprocessing.ts'
import type { Sql } from '../persistence/database.ts'
import { openTestDatabase, truncateAll } from '../persistence/testing.ts'
import { deliveryHealth } from './conversations.ts'
import { reprocessDeliveries } from './reprocess.ts'
import { sign, statusPayload, TEST_APP_SECRET, TEST_VERIFY_TOKEN, textPayload, webhookPost } from './testing.ts'
import { createWebhookHandler, deliveryStore, type DeliveryStore } from './webhook.ts'

let sql: Sql

before(async () => {
  sql = await openTestDatabase()
})
beforeEach(() => truncateAll(sql))
after(() => sql.end())

const NUMBER = '800000000000001'
const LATER = (): Date => new Date(Date.now() + STALLED_PENDING_AFTER_MS + 60_000)

/** Recibe con el store dado y corre el procesamiento posterior a la respuesta, si lo hay. */
const deliverWith = async (store: DeliveryStore, body: string, runAfter = true): Promise<number> => {
  const handle = createWebhookHandler({ verifyToken: TEST_VERIFY_TOKEN, appSecret: TEST_APP_SECRET, store })
  const { response, process } = await handle(webhookPost(body, sign(body)))
  if (runAfter) await process?.()
  return response.status
}
const deliver = (body: string, runAfter = true): Promise<number> => deliverWith(deliveryStore(sql), body, runAfter)

/** El procesamiento falla después del 200, como una caída de la base a mitad de camino. */
const failingProcessStore = (): DeliveryStore => {
  const real = deliveryStore(sql)
  return { ...real, process: () => Promise.reject(new Error('conexión perdida')) }
}

const count = async (table: string): Promise<number> => {
  const [row] = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from communication.${table}`)
  return row?.n ?? -1
}

const deliveries = () =>
  sql<{ processing: string; processingError: string | null; reprocessCount: number }[]>`
    select processing, processing_error as "processingError", reprocess_count as "reprocessCount"
    from communication.webhook_delivery order by id`

describe('procesamiento que falla después del 200', () => {
  it('la entrega queda failed, visible, y el reproceso la recupera sin duplicar', async () => {
    const body = textPayload({ wamid: 'wamid.SYNTH-RP-1', timestamp: 1790000000 })
    assert.equal(await deliverWith(failingProcessStore(), body), 200)
    assert.equal(await count('message'), 0)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.processingError]), [['failed', 'conexión perdida']])
    assert.equal((await deliveryHealth(sql)).failed, 1)

    const result = await reprocessDeliveries(sql, { phoneNumberId: NUMBER })
    assert.deepEqual([result.processed, result.failed, result.skipped], [1, 0, 0])
    assert.equal(await count('message'), 1)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.processingError, d.reprocessCount]), [['processed', null, 1]])
    assert.equal((await deliveryHealth(sql)).failed, 0)
  })

  it('si tampoco se puede marcar failed, queda pending y se reprocesa cuando se atasca', async () => {
    const real = deliveryStore(sql)
    const store: DeliveryStore = {
      ...real,
      process: () => Promise.reject(new Error('conexión perdida')),
      fail: () => Promise.reject(new Error('conexión perdida')),
    }
    const body = textPayload({ wamid: 'wamid.SYNTH-RP-2', timestamp: 1790000000 })
    await assert.rejects(deliverWith(store, body))
    assert.deepEqual((await deliveries()).map((d) => d.processing), ['pending'])

    // Recién recibida, puede estar en curso: ni se reprocesa ni cuenta como atascada.
    assert.equal((await reprocessDeliveries(sql)).deliveries.length, 0)
    assert.deepEqual([(await deliveryHealth(sql)).stalled, (await deliveryHealth(sql)).failed], [0, 0])

    assert.equal((await deliveryHealth(sql, LATER())).stalled, 1)
    assert.equal((await reprocessDeliveries(sql, { now: LATER() })).processed, 1)
    assert.equal(await count('message'), 1)
  })
})

describe('el proceso cae entre el 200 y el procesamiento', () => {
  it('la entrega pending se ve atascada y el reproceso la procesa', async () => {
    assert.equal(await deliver(textPayload({ wamid: 'wamid.SYNTH-RP-3', timestamp: 1790000000 }), false), 200)
    const health = await deliveryHealth(sql, LATER())
    assert.equal(health.stalled, 1)
    assert.ok(health.lastDeliveryAt instanceof Date, 'la recepción parece sana')
    assert.equal(health.lastProcessedAt, null, 'pero nada se procesó')
    assert.ok(health.oldestUnprocessedAt instanceof Date)

    assert.equal((await reprocessDeliveries(sql, { now: LATER() })).processed, 1)
    assert.equal(await count('message'), 1)
    assert.equal((await deliveryHealth(sql, LATER())).stalled, 0)
  })
})

describe('reprocesar no duplica ni retrocede', () => {
  it('una entrega ya aplicada y marcada failed se reprocesa sin duplicar mensajes ni pisar estados', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-RP-4', timestamp: 1790000000 }))
    await deliver(statusPayload({ wamid: 'wamid.SYNTH-RP-OUT', status: 'delivered', timestamp: 1790000010 }))
    await deliver(statusPayload({ wamid: 'wamid.SYNTH-RP-OUT', status: 'read', timestamp: 1790000020 }))
    // Las dos primeras quedan failed como si el marcado hubiera fallado después de escribir.
    await sql`
      update communication.webhook_delivery set processing = 'failed', processing_error = 'simulado'
      where id in (select id from communication.webhook_delivery order by id limit 2)`

    for (let i = 0; i < 3; i++) await reprocessDeliveries(sql)
    assert.equal(await count('message'), 1)
    const [status] = await sql<{ status: string }[]>`select status from communication.outbound_status`
    assert.equal(status?.status, 'read')
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.reprocessCount]), [['processed', 1], ['processed', 1], ['processed', 0]])
  })

  it('una segunda corrida no encuentra nada que hacer', async () => {
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-RP-5', timestamp: 1790000000 }))
    assert.equal((await reprocessDeliveries(sql)).processed, 1)
    assert.deepEqual(await reprocessDeliveries(sql), { deliveries: [], processed: 0, failed: 0, skipped: 0 })
  })

  it('dos reprocesos simultáneos procesan cada entrega una sola vez', async () => {
    for (let i = 0; i < 8; i++) {
      await deliverWith(failingProcessStore(), textPayload({ wamid: `wamid.SYNTH-RP-C${String(i)}`, timestamp: 1790000000 + i }))
    }
    const [a, b] = await Promise.all([reprocessDeliveries(sql), reprocessDeliveries(sql)])
    assert.equal(a.processed + b.processed, 8)
    assert.equal(a.failed + b.failed, 0)
    assert.equal(await count('message'), 8)
    assert.deepEqual([...new Set((await deliveries()).map((d) => `${d.processing}:${String(d.reprocessCount)}`))], ['processed:1'])
  })
})

describe('fallos que el reproceso no arregla', () => {
  it('un error de la base a mitad de la entrega no deja nada a medias y queda failed con el intento contado', async () => {
    await sql.unsafe(`
      create function communication.test_reject_insert() returns trigger language plpgsql as $$
      begin
        if new.wamid = 'wamid.SYNTH-RP-MALO' then raise exception 'rechazado por el test'; end if;
        return new;
      end $$;
      create trigger test_reject_insert before insert on communication.message
        for each row execute function communication.test_reject_insert();`)
    try {
      await deliverWith(
        failingProcessStore(),
        textPayload(
          { wamid: 'wamid.SYNTH-RP-BUENO', timestamp: 1790000000 },
          { wamid: 'wamid.SYNTH-RP-MALO', timestamp: 1790000001 },
        ),
      )
      const result = await reprocessDeliveries(sql)
      assert.deepEqual([result.processed, result.failed], [0, 1])
      assert.equal(await count('message'), 0, 'el savepoint deshizo también el mensaje bueno')
      assert.deepEqual((await deliveries()).map((d) => [d.processing, d.processingError, d.reprocessCount]), [
        ['failed', 'rechazado por el test', 1],
      ])
    } finally {
      await sql.unsafe(`
        drop trigger test_reject_insert on communication.message;
        drop function communication.test_reject_insert();`)
    }
    // Arreglada la causa, la próxima corrida la recupera entera.
    assert.equal((await reprocessDeliveries(sql)).processed, 1)
    assert.equal(await count('message'), 2)
  })

  it('una entrega con elementos descartados sigue failed, se cuenta y no tapa a las demás', async () => {
    await deliver(statusPayload({ wamid: 'wamid.SYNTH-RP-D', status: 'deleted', timestamp: 1790000000 }))
    assert.equal((await reprocessDeliveries(sql)).failed, 1)
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-RP-6', timestamp: 1790000000 }))

    // Con lugar para una sola, va primero la que nunca se reprocesó.
    const result = await reprocessDeliveries(sql, { limit: 1 })
    assert.deepEqual(result.deliveries.map((d) => d.outcome), ['processed'])
    assert.equal(await count('message'), 1)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.reprocessCount]), [['failed', 1], ['processed', 1]])
  })

  it('un cuerpo que no es JSON queda failed sin citar su contenido', async () => {
    await deliver('no es json')
    assert.equal((await reprocessDeliveries(sql)).failed, 1)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.processingError, d.reprocessCount]), [
      ['failed', 'el cuerpo no es JSON válido', 1],
    ])
  })
})

describe('filtro por número (CO01 §3)', () => {
  const OTHER = textPayload({ wamid: 'wamid.SYNTH-RP-OTRO', timestamp: 1790000000 }).replace(NUMBER, '800000000000009')

  it('el receptor con número configurado ignora lo de otro número y la entrega queda procesada', async () => {
    const handle = createWebhookHandler({
      verifyToken: TEST_VERIFY_TOKEN,
      appSecret: TEST_APP_SECRET,
      phoneNumberId: NUMBER,
      store: deliveryStore(sql),
    })
    const { response, process } = await handle(webhookPost(OTHER, sign(OTHER)))
    await process?.()
    assert.equal(response.status, 200)
    assert.equal(await count('message'), 0)
    assert.deepEqual((await deliveries()).map((d) => d.processing), ['processed'])
  })

  it('el reproceso aplica el mismo filtro', async () => {
    await deliverWith(failingProcessStore(), OTHER)
    assert.equal((await reprocessDeliveries(sql, { phoneNumberId: NUMBER })).processed, 1)
    assert.equal(await count('message'), 0)
  })

  it('un phone_number_id vacío en la configuración es un error, no un filtro que deja pasar todo', () => {
    assert.throws(
      () => createWebhookHandler({ verifyToken: 't', appSecret: 's', phoneNumberId: '', store: deliveryStore(sql) }),
      /phone_number_id/,
    )
  })
})
