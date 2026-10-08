// Reproceso de entregas (T-0026), contra el Postgres local (R-26). Lo que se prueba es
// la cadena entera: entrega recibida → guardada → procesada una vez o reprocesable →
// fallo visible. Sin skip: si no hay Postgres, la suite falla.
//
// Las fallas de base son reales (un trigger que rechaza un insert, una transacción
// abierta en otra conexión que retiene un lock), no un store simulado: lo que se prueba
// es el límite de la transacción (revisión fría de T-0026, M04 y S-HOL).

import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'

import postgres from 'postgres'

import { STALLED_PENDING_AFTER_MS } from '../domain/reprocessing.ts'
import { RAW_DELIVERY_RETENTION_DAYS } from '../domain/retention.ts'
import type { Sql } from '../persistence/database.ts'
import { openTestDatabase, testDatabaseUrl, truncateAll } from '../persistence/testing.ts'
import { deliveryHealth } from './conversations.ts'
import { applyRetention } from './operations.ts'
import { reprocessDeliveries } from './reprocess.ts'
import {
  readFixture,
  sign,
  statusPayload,
  TEST_APP_SECRET,
  TEST_PHONE_NUMBER_ID,
  TEST_VERIFY_TOKEN,
  textPayload,
  webhookPost,
} from './testing.ts'
import { createWebhookHandler, deliveryStore, type DeliveryStore } from './webhook.ts'

let sql: Sql

before(async () => {
  sql = await openTestDatabase()
})
beforeEach(() => truncateAll(sql))
after(() => sql.end())

const NUMBER = TEST_PHONE_NUMBER_ID
/** Un número con la forma correcta que no es el de los fixtures: el error de configuración de S9b. */
const WRONG_NUMBER = '800000000000999'
const LATER = (): Date => new Date(Date.now() + STALLED_PENDING_AFTER_MS + 60_000)
const reprocess = (options: { now?: Date; limit?: number; phoneNumberId?: string } = {}) =>
  reprocessDeliveries(sql, { phoneNumberId: NUMBER, ...options })

/** Recibe con el store dado y corre el procesamiento posterior a la respuesta, si lo hay. */
const deliverWith = async (store: DeliveryStore, body: string, runAfter = true, phoneNumberId = NUMBER): Promise<number> => {
  const handle = createWebhookHandler({ verifyToken: TEST_VERIFY_TOKEN, appSecret: TEST_APP_SECRET, phoneNumberId, store })
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
  sql<
    {
      processing: string
      processingError: string | null
      reprocessCount: number
      appliedCount: number
      ignoredCount: number
      phoneNumberFilter: string | null
    }[]
  >`
    select processing, processing_error as "processingError", reprocess_count as "reprocessCount",
           applied_count as "appliedCount", ignored_count as "ignoredCount",
           phone_number_filter as "phoneNumberFilter"
    from communication.webhook_delivery order by id`

/** Lo que una entrega deja en el dominio, para comparar dos caminos. */
const domainSnapshot = async () => ({
  messages: await sql`select wamid, direction, phone_number_id, wa_id, body from communication.message order by wamid`,
  unsupported: await sql`select wamid, type, phone_number_id from communication.unsupported_message order by wamid`,
  statuses: await sql`select wamid, status from communication.outbound_status order by wamid`,
  deliveries: (await deliveries()).map((d) => [d.processing, d.appliedCount, d.ignoredCount, d.phoneNumberFilter]),
})

/** Una entrega con un cambio del número propio y otro de otro número, como las de S7. */
const mixedPayload = (ownWamid: string, otherWamid: string): string => {
  const own = JSON.parse(textPayload({ wamid: ownWamid, timestamp: 1790000000 })) as { entry: { changes: unknown[] }[] }
  const other = JSON.parse(
    textPayload({ wamid: otherWamid, timestamp: 1790000001 }).replace(NUMBER, '800000000000009'),
  ) as { entry: unknown[] }
  return JSON.stringify({ ...own, entry: [...own.entry, ...other.entry] })
}

/** Falla si `promise` no termina en `ms`: un lock sin tope se ve como un test que no cuelga. */
const within = async <T,>(ms: number, promise: Promise<T>): Promise<T> => {
  let timer: NodeJS.Timeout | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`no terminó en ${String(ms)} ms: hay una espera de lock sin tope`))
    }, ms)
  })
  try {
    return await Promise.race([promise, deadline])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Otra conexión, en su propio pool, con una transacción abierta: así retiene locks como
 * una sesión `idle in transaction` del pooler. `release` termina la transacción.
 */
const openForeignTransaction = async () => {
  const foreign = postgres(testDatabaseUrl(), { max: 1, prepare: false, onnotice: () => undefined })
  const tx = await foreign.reserve()
  await tx`begin`
  return {
    tx,
    release: async (outcome: 'commit' | 'rollback') => {
      await tx.unsafe(outcome)
      tx.release()
      await foreign.end()
    },
  }
}

describe('procesamiento que falla después del 200', () => {
  it('la entrega queda failed, visible, y el reproceso la recupera sin duplicar', async () => {
    const body = textPayload({ wamid: 'wamid.SYNTH-RP-1', timestamp: 1790000000 })
    assert.equal(await deliverWith(failingProcessStore(), body), 200)
    assert.equal(await count('message'), 0)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.processingError]), [['failed', 'conexión perdida']])
    assert.equal((await deliveryHealth(sql)).failed, 1)

    const result = await reprocess()
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
    assert.equal((await reprocess()).deliveries.length, 0)
    assert.deepEqual([(await deliveryHealth(sql)).stalled, (await deliveryHealth(sql)).failed], [0, 0])

    assert.equal((await deliveryHealth(sql, LATER())).stalled, 1)
    assert.equal((await reprocess({ now: LATER() })).processed, 1)
    assert.equal(await count('message'), 1)
  })
})

describe('una falla real de la base en el procesamiento inicial (M04)', () => {
  const rejectInsert = (wamid: string) =>
    sql.unsafe(`
      create function communication.test_reject_insert() returns trigger language plpgsql as $$
      begin
        if new.wamid = '${wamid}' then raise exception 'rechazado por el test'; end if;
        return new;
      end $$;
      create trigger test_reject_insert before insert on communication.message
        for each row execute function communication.test_reject_insert();`)
  const allowInserts = () =>
    sql.unsafe(`
      drop trigger if exists test_reject_insert on communication.message;
      drop function if exists communication.test_reject_insert();`)

  it('el receptor real deja la entrega failed sin escritos a medias, y el reproceso deja un solo mensaje', async () => {
    const body = textPayload(
      { wamid: 'wamid.SYNTH-M04-BUENO', timestamp: 1790000000 },
      { wamid: 'wamid.SYNTH-M04-MALO', timestamp: 1790000001 },
    )
    await rejectInsert('wamid.SYNTH-M04-MALO')
    try {
      // El store real: la transacción de `processDelivery` es la que falla, en el segundo insert.
      assert.equal(await deliver(body), 200)
      assert.equal(await count('message'), 0, 'el rollback deshizo también el mensaje bueno')
      assert.deepEqual((await deliveries()).map((d) => [d.processing, d.processingError, d.reprocessCount]), [
        ['failed', 'rechazado por el test', 0],
      ])
      const [raw] = await sql<{ bodyRaw: string }[]>`select body_raw as "bodyRaw" from communication.webhook_delivery`
      assert.equal(raw?.bodyRaw, body, 'el crudo quedó para reprocesar')
      const health = await deliveryHealth(sql)
      assert.deepEqual([health.failed, health.lastProcessedAt], [1, null])

      // Mientras la causa sigue, el reproceso falla igual y lo cuenta.
      assert.equal((await reprocess()).failed, 1)
      assert.equal(await count('message'), 0)
    } finally {
      await allowInserts()
    }
    assert.equal((await reprocess()).processed, 1)
    // Meta reenvía la misma entrega y otra corrida pasa: sigue habiendo un mensaje por wamid.
    await deliver(body)
    assert.equal((await reprocess()).deliveries.length, 0)
    assert.deepEqual(
      (await sql<{ wamid: string }[]>`select wamid from communication.message order by wamid`).map((r) => r.wamid),
      ['wamid.SYNTH-M04-BUENO', 'wamid.SYNTH-M04-MALO'],
    )
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.reprocessCount]), [['processed', 2], ['processed', 0]])
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

    assert.equal((await reprocess({ now: LATER() })).processed, 1)
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

    for (let i = 0; i < 3; i++) await reprocess()
    assert.equal(await count('message'), 1)
    const [status] = await sql<{ status: string }[]>`select status from communication.outbound_status`
    assert.equal(status?.status, 'read')
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.reprocessCount]), [['processed', 1], ['processed', 1], ['processed', 0]])
  })

  it('una segunda corrida no encuentra nada que hacer', async () => {
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-RP-5', timestamp: 1790000000 }))
    assert.equal((await reprocess()).processed, 1)
    assert.deepEqual(await reprocess(), { deliveries: [], processed: 0, ignored: 0, failed: 0, skipped: 0 })
  })

  it('dos reprocesos simultáneos procesan cada entrega una sola vez', async () => {
    for (let i = 0; i < 8; i++) {
      await deliverWith(failingProcessStore(), textPayload({ wamid: `wamid.SYNTH-RP-C${String(i)}`, timestamp: 1790000000 + i }))
    }
    const [a, b] = await Promise.all([reprocess(), reprocess()])
    assert.equal(a.processed + b.processed, 8)
    assert.equal(a.failed + b.failed, 0)
    assert.equal(await count('message'), 8)
    assert.deepEqual([...new Set((await deliveries()).map((d) => `${d.processing}:${String(d.reprocessCount)}`))], ['processed:1'])
  })

  it('tres reprocesos en pools independientes, con copias de la misma entrega, dejan un mensaje por wamid', async () => {
    for (let i = 0; i < 12; i++) {
      const body = textPayload({ wamid: `wamid.SYNTH-RP-P${String(i % 6)}`, timestamp: 1790000000 + i })
      await deliverWith(failingProcessStore(), body)
    }
    const pools = [0, 1, 2].map(() => postgres(testDatabaseUrl(), { max: 2, prepare: false, onnotice: () => undefined }))
    try {
      const results = await Promise.all(pools.map((pool) => reprocessDeliveries(pool, { phoneNumberId: NUMBER })))
      assert.equal(results.reduce((n, r) => n + r.processed, 0), 12)
      assert.equal(results.reduce((n, r) => n + r.failed, 0), 0)
    } finally {
      await Promise.all(pools.map((pool) => pool.end()))
    }
    assert.equal(await count('message'), 6)
    assert.deepEqual([...new Set((await deliveries()).map((d) => `${d.processing}:${String(d.reprocessCount)}`))], ['processed:1'])
  })
})

describe('un lock retenido por otra conexión (S-HOL)', () => {
  it('no traba el lote: esa entrega queda failed con el intento contado y las demás se procesan', async () => {
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-HOL-RETENIDO', timestamp: 1790000000 }))
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-HOL-LIBRE', timestamp: 1790000001 }))
    const foreign = await openForeignTransaction()
    try {
      // Otra sesión insertó el mismo wamid y no confirmó: el insert del reproceso espera su resultado.
      await foreign.tx`
        insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
        values ('wamid.SYNTH-HOL-RETENIDO', 'inbound', ${NUMBER}, '15550199001', 'de la otra sesión', now())`
      const result = await within(20_000, reprocess())
      assert.deepEqual(result.deliveries.map((d) => d.outcome), ['failed', 'processed'], 'la retenida no trabó a la siguiente')
      // El intento de la retenida quedó contado, con su error: rota al final de la cola.
      assert.deepEqual((await deliveries()).map((d) => [d.processing, d.reprocessCount, d.processingError !== null]), [
        ['failed', 1, true],
        ['processed', 1, false],
      ])
      assert.equal((await deliveryHealth(sql)).failed, 1, 'se ve')
    } finally {
      await foreign.release('rollback')
    }
    // Liberado el lock, la corrida siguiente la recupera.
    assert.equal((await reprocess()).processed, 1)
    assert.equal(await count('message'), 2)
  })

  it('si la otra sesión confirma el mismo wamid, el reproceso posterior no lo duplica', async () => {
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-HOL-C', timestamp: 1790000000 }))
    const foreign = await openForeignTransaction()
    try {
      await foreign.tx`
        insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
        values ('wamid.SYNTH-HOL-C', 'inbound', ${NUMBER}, '15550199001', 'de la otra sesión', now())`
      assert.equal((await within(20_000, reprocess())).failed, 1)
    } finally {
      await foreign.release('commit')
    }
    assert.equal((await reprocess()).processed, 1)
    assert.equal(await count('message'), 1)
  })

  it('una entrega bloqueada por otro reproceso se saltea, sigue failed y entra en la corrida siguiente', async () => {
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-HOL-F1', timestamp: 1790000000 }))
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-HOL-F2', timestamp: 1790000001 }))
    const foreign = await openForeignTransaction()
    try {
      await foreign.tx`select id from communication.webhook_delivery where id = 1 for update`
      const result = await within(20_000, reprocess())
      assert.deepEqual(result.deliveries.map((d) => [d.id, d.outcome]), [[1, 'skipped'], [2, 'processed']])
      assert.deepEqual((await deliveries()).map((d) => [d.processing, d.reprocessCount]), [['failed', 0], ['processed', 1]])
    } finally {
      await foreign.release('rollback')
    }
    assert.deepEqual((await reprocess()).deliveries.map((d) => [d.id, d.outcome]), [[1, 'processed']])
    assert.equal(await count('message'), 2)
  })

  it('el procesamiento inicial tampoco espera sin tope: queda failed y se reprocesa', async () => {
    const foreign = await openForeignTransaction()
    try {
      await foreign.tx`
        insert into communication.message (wamid, direction, phone_number_id, wa_id, body, wa_timestamp)
        values ('wamid.SYNTH-HOL-I', 'inbound', ${NUMBER}, '15550199001', 'de la otra sesión', now())`
      await within(20_000, deliver(textPayload({ wamid: 'wamid.SYNTH-HOL-I', timestamp: 1790000000 })))
      assert.deepEqual((await deliveries()).map((d) => d.processing), ['failed'])
    } finally {
      await foreign.release('rollback')
    }
    assert.equal((await reprocess()).processed, 1)
    assert.equal(await count('message'), 1)
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
      const result = await reprocess()
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
    assert.equal((await reprocess()).processed, 1)
    assert.equal(await count('message'), 2)
  })

  it('una entrega con elementos descartados sigue failed, se cuenta y no tapa a las demás', async () => {
    await deliver(statusPayload({ wamid: 'wamid.SYNTH-RP-D', status: 'deleted', timestamp: 1790000000 }))
    assert.equal((await reprocess()).failed, 1)
    await deliverWith(failingProcessStore(), textPayload({ wamid: 'wamid.SYNTH-RP-6', timestamp: 1790000000 }))

    // Con lugar para una sola, va primero la que nunca se reprocesó.
    const result = await reprocess({ limit: 1 })
    assert.deepEqual(result.deliveries.map((d) => d.outcome), ['processed'])
    assert.equal(await count('message'), 1)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.reprocessCount]), [['failed', 1], ['processed', 1]])
  })

  it('un cuerpo que no es JSON queda failed sin citar su contenido', async () => {
    await deliver('no es json')
    assert.equal((await reprocess()).failed, 1)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.processingError, d.reprocessCount]), [
      ['failed', 'el cuerpo no es JSON válido', 1],
    ])
  })
})

describe('filtro por número (CO01 §3)', () => {
  const OTHER = textPayload({ wamid: 'wamid.SYNTH-RP-OTRO', timestamp: 1790000000 }).replace(NUMBER, '800000000000009')

  it('el receptor ignora lo de otro número: la entrega queda ignored, no processed', async () => {
    assert.equal(await deliver(OTHER), 200)
    assert.equal(await count('message'), 0)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.appliedCount, d.ignoredCount, d.phoneNumberFilter]), [
      ['ignored', 0, 1, NUMBER],
    ])
  })

  it('el reproceso aplica el mismo filtro: de una entrega mixta guarda solo lo propio (M30)', async () => {
    await deliverWith(failingProcessStore(), mixedPayload('wamid.SYNTH-RP-PROPIO', 'wamid.SYNTH-RP-AJENO'))
    await deliverWith(failingProcessStore(), OTHER)
    const result = await reprocess()
    assert.deepEqual(result.deliveries.map((d) => d.outcome), ['processed', 'ignored'])
    assert.deepEqual(
      (await sql<{ wamid: string }[]>`select wamid from communication.message`).map((r) => r.wamid),
      ['wamid.SYNTH-RP-PROPIO'],
    )
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.appliedCount, d.ignoredCount]), [
      ['processed', 1, 1],
      ['ignored', 0, 1],
    ])
  })

  it('una entrega deja el mismo efecto procesada al recibirla que reprocesada', async () => {
    const bodies = [
      mixedPayload('wamid.SYNTH-EQ-PROPIO', 'wamid.SYNTH-EQ-AJENO'),
      OTHER,
      readFixture('inbound-image.json'),
      statusPayload({ wamid: 'wamid.SYNTH-EQ-OUT', status: 'delivered', timestamp: 1790000000 }),
    ]
    for (const body of bodies) await deliver(body)
    const initial = await domainSnapshot()
    await truncateAll(sql)
    for (const body of bodies) await deliverWith(failingProcessStore(), body)
    await reprocess()
    assert.deepEqual(await domainSnapshot(), initial)
  })

  it('una entrega sin nada que guardar y sin nada ajeno queda processed con 0 escritos, distinta de ignored', async () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'account_update', value: {} }] }] })
    await deliver(body)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.appliedCount, d.ignoredCount]), [['processed', 0, 0]])
    assert.equal((await deliveryHealth(sql)).ignored, 0)
  })

  it('un phone_number_id vacío o sin forma de uno es un error, no un filtro que deja pasar o ignora todo', async () => {
    for (const bad of ['', '   ', 'abc', '+54 9 261 555-0100', '8000 0000 0000 001', '800000000000001x']) {
      assert.throws(
        () => createWebhookHandler({ verifyToken: 't', appSecret: 's', phoneNumberId: bad, store: deliveryStore(sql) }),
        /phone_number_id/,
        JSON.stringify(bad),
      )
      await assert.rejects(reprocessDeliveries(sql, { phoneNumberId: bad }), /phone_number_id/, JSON.stringify(bad))
    }
  })

  it('los espacios y saltos de línea al pegar la variable no cambian el filtro', async () => {
    await deliverWith(deliveryStore(sql), textPayload({ wamid: 'wamid.SYNTH-RP-ESP', timestamp: 1790000000 }), true, ` ${NUMBER}\n`)
    assert.deepEqual((await deliveries()).map((d) => [d.processing, d.phoneNumberFilter]), [['processed', NUMBER]])
    assert.equal(await count('message'), 1)
  })
})

describe('número mal configurado (S9b de la revisión fría)', () => {
  const deliverToWrongNumber = (body: string) => deliverWith(deliveryStore(sql), body, true, WRONG_NUMBER)

  it('no se ve sano: las entregas quedan ignored y la salud las cuenta', async () => {
    for (let i = 0; i < 3; i++) await deliverToWrongNumber(textPayload({ wamid: `wamid.SYNTH-S9B-${String(i)}`, timestamp: 1790000000 + i }))
    assert.equal(await count('message'), 0)
    assert.deepEqual([...new Set((await deliveries()).map((d) => `${d.processing}:${String(d.phoneNumberFilter)}`))], [
      `ignored:${WRONG_NUMBER}`,
    ])
    const health = await deliveryHealth(sql)
    assert.equal(health.ignored, 3)
    assert.equal(health.lastProcessedAt, null, 'ignorar no cuenta como procesar')
    assert.ok(health.lastDeliveryAt instanceof Date)
  })

  it('con el número sin corregir el reproceso no las vuelve a tomar; corregido, las recupera una vez', async () => {
    for (let i = 0; i < 3; i++) await deliverToWrongNumber(textPayload({ wamid: `wamid.SYNTH-S9B-R${String(i)}`, timestamp: 1790000000 + i }))
    assert.equal((await reprocess({ phoneNumberId: WRONG_NUMBER })).deliveries.length, 0)

    const result = await reprocess()
    assert.deepEqual([result.processed, result.ignored, result.failed], [3, 0, 0])
    assert.equal(await count('message'), 3)
    assert.equal((await deliveryHealth(sql)).ignored, 0)
    assert.equal((await reprocess()).deliveries.length, 0)
    assert.equal(await count('message'), 3)
  })

  it('el tráfico de otro número con el número bien configurado queda ignored y no se reprocesa en cada corrida', async () => {
    await deliver(textPayload({ wamid: 'wamid.SYNTH-S9B-AJENO', timestamp: 1790000000 }).replace(NUMBER, '800000000000009'))
    assert.equal((await reprocess()).deliveries.length, 0)
    // Pasadas las 24 h, deja de alertar.
    assert.equal((await deliveryHealth(sql, new Date(Date.now() + 25 * 3600 * 1000))).ignored, 0)
  })

  it('al vencer, la retención la borra como a una procesada y lo informa aparte', async () => {
    await deliverToWrongNumber(textPayload({ wamid: 'wamid.SYNTH-S9B-RET', timestamp: 1790000000 }))
    await deliver(textPayload({ wamid: 'wamid.SYNTH-S9B-OK', timestamp: 1790000001 }))
    const result = await applyRetention(sql, new Date(Date.now() + (RAW_DELIVERY_RETENTION_DAYS + 1) * 86_400_000))
    assert.deepEqual([result.deliveries, result.ignoredDeleted, result.unprocessedKept], [2, 1, 0])
  })
})
