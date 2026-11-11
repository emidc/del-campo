// C6-03b — Aceptación de C6 contra el servidor (T-0052).
//
// Levanta la app de verdad (`next dev`) contra una base local nueva y desechable, con datos
// sintéticos, y recorre en un navegador la parte de C6 de los recorridos R1 a R6 del
// prototipo (docs/north-star/prototipo/pruebas/r1-manuel.js … r4-r5-r6.js): inicio por rol
// y delegación, renovaciones, cotización y siniestro por etapas. Lo que esos recorridos
// piden de otras capacidades (riesgos, skills de Gemini, facturación, interlocutores,
// WhatsApp) se lista al final como no cubierto.
//
// R-19: nada de lo que se escribe sale de datos reales. La base se crea con un nombre fijo
// en el mismo servidor local de DATABASE_URL y se borra al terminar; el script se niega a
// correr si ese servidor no es local.
//
// Uso: node scripts/aceptacion/c6-recorridos.mjs   (necesita Playwright con Chromium)

import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import postgres from 'postgres'

const raiz = fileURLToPath(new URL('../../', import.meta.url))
const { SESSION_COOKIE, sealSession } = await import(join(raiz, 'packages/api/src/session/session.ts'))

const morir = (mensaje) => {
  console.error(`✗ ${mensaje}`)
  process.exit(1)
}

const leerEnv = () => {
  const archivo = join(raiz, '.env')
  if (!existsSync(archivo)) return {}
  const pares = {}
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    pares[limpia.slice(0, corte).trim()] = limpia.slice(corte + 1).trim()
  }
  return pares
}

const cargarPlaywright = () => {
  for (const desde of [import.meta.url, join(raiz, 'docs/north-star/prototipo/package.json')]) {
    try {
      return createRequire(desde)('playwright')
    } catch {
      // se prueba el siguiente
    }
  }
  return morir('falta Playwright: instalalo en docs/north-star/prototipo (npm install) o de forma global')
}

const urlBase = process.env.DATABASE_URL ?? leerEnv().DATABASE_URL
if (!urlBase) morir('falta DATABASE_URL. Ver docs/desarrollo/postgres-local.md')
const servidor = new URL(urlBase)
if (!['localhost', '127.0.0.1', '::1', '[::1]', ''].includes(servidor.hostname)) {
  morir('DATABASE_URL no apunta a un Postgres local: esta prueba sólo corre contra una base desechable propia')
}

const BASE = 'delcampo_aceptacion_c6'
const urlPrueba = new URL(urlBase)
urlPrueba.pathname = `/${BASE}`
const PUERTO = Number(process.env.ACEPTACION_PUERTO ?? 3999)
const APP = `http://localhost:${String(PUERTO)}`
const SECRETO = randomBytes(32).toString('base64')

// ── Resultado ────────────────────────────────────────────────────────────────

const resultados = []
const ok = (id, descripcion, cumple, detalle = '') => {
  resultados.push({ id, descripcion, cumple })
  console.log(`${cumple ? '✓' : '✗'} ${id} ${descripcion}${cumple || detalle === '' ? '' : ` — ${detalle}`}`)
}

const NO_CUBIERTO = [
  'R1: matriz de riesgos, solicitudes de reevaluación, portal de la empresa, zonas y transferencias (Risk OS, C7 en adelante).',
  'R1: aviso a la persona que delegó (no hay notificaciones todavía).',
  'R2: ejecución automática de renovaciones por WhatsApp y su ventana de 24 h (C10).',
  'R3: alta asistida por Gemini desde un correo (skills e IA, E3 en adelante).',
  'R4: skill de cotización, MCP y guardado en Drive (la cotización se carga a mano).',
  'R5: facturación a compañías y comprobantes de ARCA (no construida).',
  'R6: interlocutores del siniestro, borradores a terceros y correos sin identificar.',
  'Indicadores K-xx del prototipo con su numeración: Inicio usa los seis definidos en T-0049.',
]

// ── Base desechable ──────────────────────────────────────────────────────────

const crearBase = async () => {
  const admin = postgres(urlBase, { max: 1, onnotice: () => undefined })
  try {
    await admin.unsafe(`drop database if exists ${BASE} with (force)`)
    await admin.unsafe(`create database ${BASE}`)
  } finally {
    await admin.end()
  }
  const migrar = spawnSync(process.execPath, [join(raiz, 'packages/db/src/cli.ts'), 'migrate'], {
    cwd: raiz,
    env: { ...process.env, DATABASE_URL: urlPrueba.toString() },
    encoding: 'utf8',
  })
  if (migrar.status !== 0) morir(`las migraciones fallaron:\n${migrar.stdout}\n${migrar.stderr}`)
}

const borrarBase = async () => {
  const admin = postgres(urlBase, { max: 1, onnotice: () => undefined })
  try {
    await admin.unsafe(`drop database if exists ${BASE} with (force)`)
  } finally {
    await admin.end()
  }
}

// Personas del prototipo con correos sintéticos. Manuel administra; el resto opera.
const PERSONAS = {
  manuel: { email: 'manuel@aceptacion.test', rol: 'ADMINISTRADOR' },
  evangelina: { email: 'evangelina@aceptacion.test', rol: 'OPERADOR' },
  lucia: { email: 'lucia@aceptacion.test', rol: 'OPERADOR' },
  pilar: { email: 'pilar@aceptacion.test', rol: 'OPERADOR' },
}

const sembrar = async () => {
  const sql = postgres(urlPrueba.toString(), { max: 1, onnotice: () => undefined })
  try {
    return await sql.begin(async (tx) => {
      const id = async (consulta) => (await consulta)[0].id
      const usuarios = {}
      for (const [clave, p] of Object.entries(PERSONAS)) {
        usuarios[clave] = await id(tx`
          insert into app_user (email, status, auth_provider, role) values (${p.email}, 'ACTIVE', 'google', ${p.rol})
          returning id
        `)
        await tx`insert into user_credential (user_id, provider, subject) values (${usuarios[clave]}, 'google', ${`sub-${clave}`})`
      }

      const persona = await id(tx`insert into party (kind) values ('PERSON') returning id`)
      await tx`insert into person_profile (party_id, first_name, last_name) values (${persona}, 'Rosa', 'Sintética')`
      const empresa = await id(tx`insert into party (kind) values ('ORGANIZATION') returning id`)
      await tx`insert into organization_profile (party_id, legal_name) values (${empresa}, 'Constructora Sintética SA')`

      const companias = {}
      for (const nombre of ['Aseguradora Alfa', 'Aseguradora Beta', 'Aseguradora Gama']) {
        const org = await id(tx`insert into party (kind) values ('ORGANIZATION') returning id`)
        companias[nombre] = await id(
          tx`insert into insurer (organization_party_id, canonical_name) values (${org}, ${nombre}) returning id`,
        )
      }

      // Auto de Rosa: renovación manual dentro de 20 días (R2) y póliza del siniestro (R6).
      const poliza = await id(
        tx`insert into policy (insurer_id, policy_number) values (${companias['Aseguradora Alfa']}, 'ACEP-AUTO-1') returning id`,
      )
      await tx`
        insert into policy_version (
          policy_id, version_number, effective_from, holder_party_id,
          term_start_date, term_end_date, renewal_mode, status, source_event_type
        )
        values (${poliza}, 1, current_date - 345, ${persona}, current_date - 345, current_date + 20, 'MANUAL', 'ACTIVE', 'ISSUANCE')
      `

      await tx`
        insert into client_assignment (user_id, client_party_id, valid) values
          (${usuarios.evangelina}, ${persona}, tstzrange(now() - interval '1 day', null, '[)')),
          (${usuarios.pilar}, ${persona}, tstzrange(now() - interval '1 day', null, '[)')),
          (${usuarios.lucia}, ${empresa}, tstzrange(now() - interval '1 day', null, '[)'))
      `

      // R1: una gestión trabada, sin responsable, que Manuel delega.
      const trabada = await id(tx`
        insert into service_case (kind, title, party_id, policy_id, due_date, assigned_user_id, created_by_user_id)
        values ('ENDOSO', 'Cambio de uso del auto de Rosa', ${persona}, ${poliza}, current_date + 3, null, ${usuarios.manuel})
        returning id
      `)
      await tx`
        insert into service_case_event (service_case_id, kind, body, to_status, author_user_id)
        values (${trabada}, 'ALTA', null, 'ABIERTA', ${usuarios.manuel})
      `
      return { persona, empresa, poliza, trabada }
    })
  } finally {
    await sql.end()
  }
}

// ── Servidor ─────────────────────────────────────────────────────────────────

const levantarServidor = async () => {
  const proceso = spawn('pnpm', ['--filter', '@del-campo/web', 'exec', 'next', 'dev', '-p', String(PUERTO)], {
    cwd: raiz,
    env: {
      ...process.env,
      DATABASE_URL: urlPrueba.toString(),
      VS01_SESSION_SECRET: SECRETO,
      AUTH_MODE: 'oidc',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  let salida = ''
  proceso.stdout.on('data', (d) => (salida += d))
  proceso.stderr.on('data', (d) => (salida += d))
  const limite = Date.now() + 120_000
  while (Date.now() < limite) {
    try {
      const r = await fetch(`${APP}/login`)
      if (r.status < 500) return proceso
    } catch {
      // todavía no escucha
    }
    if (proceso.exitCode !== null) break
    await new Promise((listo) => setTimeout(listo, 1000))
  }
  try {
    process.kill(-proceso.pid)
  } catch {
    // ya terminó
  }
  return morir(`el servidor no arrancó:\n${salida.slice(-3000)}`)
}

// ── Recorridos ───────────────────────────────────────────────────────────────

const recorrer = async (mundo) => {
  const { chromium } = cargarPlaywright()
  const navegador = await chromium.launch()
  const erroresJs = []
  const como = async (clave) => {
    const p = PERSONAS[clave]
    const cookie = await sealSession(
      { sub: `sub-${clave}`, email: p.email, emailVerified: true, hostedDomain: null, displayName: null },
      SECRETO,
    )
    const contexto = await navegador.newContext({ locale: 'es-AR', timezoneId: 'America/Argentina/Mendoza' })
    await contexto.addCookies([{ name: SESSION_COOKIE, value: cookie, url: APP }])
    const pagina = await contexto.newPage()
    pagina.on('pageerror', (e) => erroresJs.push(`${clave}: ${e.message}`))
    return pagina
  }
  const texto = async (pagina, selector = 'main') => (await pagina.locator(selector).first().innerText()).replace(/\s+/g, ' ')
  const indicador = async (pagina, titulo) => {
    await pagina.goto(`${APP}/inicio`)
    const tarjeta = pagina.locator('.indicador', { has: pagina.locator('.indicador__titulo', { hasText: titulo }) })
    return Number(await tarjeta.locator('.indicador__valor').innerText())
  }
  const enviar = async (pagina, boton) => {
    await Promise.all([pagina.waitForLoadState('networkidle'), boton.click()])
    await pagina.waitForLoadState('networkidle')
  }

  // R1 — Manuel ve lo trabado y lo delega.
  const manuel = await como('manuel')
  ok('R1.1', 'El inicio de Manuel cuenta 1 gestión sin responsable', (await indicador(manuel, 'Gestiones sin responsable')) === 1)
  await manuel.goto(`${APP}/gestiones/${mundo.trabada}`)
  await manuel.selectOption('#responsable', { label: PERSONAS.evangelina.email })
  await enviar(manuel, manuel.getByRole('button', { name: 'Asignar', exact: true }))
  let t = await texto(manuel)
  ok('R1.2', 'La gestión pasa a Evangelina y queda en la historia', t.includes(`Responsable: ${PERSONAS.evangelina.email}`) && t.includes(`Asignó a ${PERSONAS.evangelina.email}`))
  ok('R1.3', 'El indicador de sin responsable baja a 0', (await indicador(manuel, 'Gestiones sin responsable')) === 0)
  await manuel.goto(`${APP}/gestiones/equipo`)
  t = await texto(manuel)
  ok('R1.4', 'La carga del equipo muestra a Evangelina con 1 abierta', new RegExp(`${PERSONAS.evangelina.email.replace('.', '\\.')} 1 `).test(t), t.slice(0, 300))
  const evangelina = await como('evangelina')
  await evangelina.goto(`${APP}/inicio`)
  ok('R1.5', 'La gestión delegada aparece en «A atender» de Evangelina', (await texto(evangelina)).includes('Cambio de uso del auto de Rosa'))

  // R2 — Evangelina atiende una renovación manual.
  ok('R2.1', 'El inicio de Evangelina cuenta 1 renovación manual pendiente', (await indicador(evangelina, 'Renovaciones manuales pendientes')) === 1)
  await evangelina.locator('.indicador', { hasText: 'Renovaciones manuales pendientes' }).click()
  await evangelina.waitForLoadState('networkidle')
  t = await texto(evangelina)
  ok('R2.2', 'El indicador lleva a la lista filtrada con la póliza ACEP-AUTO-1', evangelina.url().includes('modo=MANUAL') && t.includes('ACEP-AUTO-1'))
  await enviar(evangelina, evangelina.getByRole('link', { name: 'Crear gestión' }).first())
  ok('R2.3', 'La gestión nace como Renovación desde la póliza', (await evangelina.locator('#tipo').inputValue()) === 'RENOVACION')
  await enviar(evangelina, evangelina.getByRole('button', { name: 'Crear gestión' }))
  t = await texto(evangelina)
  ok('R2.4', 'La gestión de renovación queda creada a su nombre', /\/gestiones\/[0-9a-f-]{36}/.test(evangelina.url()) && t.includes('Renovación') && t.includes('Responsable: vos'))
  ok('R2.5', 'Las renovaciones manuales pendientes bajan a 0', (await indicador(evangelina, 'Renovaciones manuales pendientes')) === 0)

  // R4 — Lucía cotiza una caución para la empresa.
  const lucia = await como('lucia')
  await lucia.goto(`${APP}/gestiones/nueva?parte=${mundo.empresa}`)
  await lucia.selectOption('#tipo', 'COTIZACION')
  await lucia.fill('#titulo', 'Caución · garantía de contrato')
  await enviar(lucia, lucia.getByRole('button', { name: 'Crear gestión' }))
  const cotizacion = lucia.url()
  for (const compania of ['Aseguradora Alfa', 'Aseguradora Beta', 'Aseguradora Gama']) {
    await lucia.selectOption('#compania', { label: compania })
    await enviar(lucia, lucia.getByRole('button', { name: 'Pedir', exact: true }))
  }
  t = await texto(lucia)
  ok('R4.1', 'Pedida a tres compañías', t.includes('Pedida a 3 · cotizaron 0'))
  const tarjeta = (compania) => lucia.locator('article.tarjeta', { hasText: compania })
  await tarjeta('Aseguradora Alfa').locator('input[name="prima"]').fill('ciento ochenta')
  await enviar(lucia, tarjeta('Aseguradora Alfa').getByRole('button', { name: 'Guardar cotización' }))
  ok('R4.2', 'Una prima mal escrita vuelve con aviso y no se guarda', (await texto(lucia)).includes('La prima tiene que ser un monto positivo') && (await texto(lucia)).includes('cotizaron 0'))
  await tarjeta('Aseguradora Alfa').locator('input[name="prima"]').fill('1.665.000')
  await tarjeta('Aseguradora Alfa').locator('input[name="vence"]').fill('2099-12-31')
  await enviar(lucia, tarjeta('Aseguradora Alfa').getByRole('button', { name: 'Guardar cotización' }))
  await enviar(lucia, tarjeta('Aseguradora Beta').getByRole('button', { name: 'No cotiza' }))
  await tarjeta('Aseguradora Gama').locator('input[name="prima"]').fill('1.480.500,50')
  await enviar(lucia, tarjeta('Aseguradora Gama').getByRole('button', { name: 'Guardar cotización' }))
  t = await texto(lucia)
  ok('R4.3', 'Dos cotizaron con su prima y una no cotiza', t.includes('cotizaron 2') && t.includes('Aseguradora Gama · Cotizada · $ 1.480.500,50') && t.includes('Aseguradora Beta · No cotiza'))
  await enviar(lucia, tarjeta('Aseguradora Gama').getByRole('button', { name: 'El cliente eligió esta' }))
  t = await texto(lucia)
  ok('R4.4', 'El cliente elige una propuesta y queda en la historia', t.includes('El cliente eligió Aseguradora Gama') && t.includes('Aseguradora Gama · Elegida'))
  await lucia.goto(`${APP}/gestiones?parte=${mundo.empresa}`)
  ok('R4.5', 'Visible en las gestiones de la empresa con su resultado', (await texto(lucia)).includes('eligió Aseguradora Gama'))
  await lucia.goto(`${APP}/gestiones/${mundo.trabada}`)
  ok('R4.perm', 'Lucía no ve la gestión de una clienta que no tiene asignada', (await lucia.locator('h1').first().innerText()) !== 'Cambio de uso del auto de Rosa')

  // R6 — Pilar lleva un siniestro por etapas.
  const pilar = await como('pilar')
  await pilar.goto(`${APP}/gestiones/nueva?poliza=${mundo.poliza}`)
  await pilar.selectOption('#tipo', 'SINIESTRO')
  await pilar.fill('#titulo', 'Choque en estacionamiento')
  await enviar(pilar, pilar.getByRole('button', { name: 'Crear gestión' }))
  t = await texto(pilar)
  ok('R6.1', 'El siniestro nace en Denuncia con sus requisitos pendientes', (await pilar.locator('.etapa--actual').innerText()).includes('Denuncia') && t.includes('Falta Denuncia presentada a la compañía'))
  await enviar(pilar, pilar.getByRole('button', { name: 'Avanzar a la siguiente etapa →' }))
  t = await texto(pilar)
  ok('R6.2', 'Avanzar con un requisito pendiente se rechaza con el motivo', t.includes('No se puede avanzar: falta Denuncia presentada a la compañía') && (await pilar.locator('.etapa--actual').innerText()).includes('Denuncia'))
  await enviar(pilar, pilar.locator('li', { hasText: 'Denuncia presentada a la compañía' }).getByRole('button', { name: 'Marcar cumplido' }))
  await enviar(pilar, pilar.getByRole('button', { name: 'Avanzar a la siguiente etapa →' }))
  t = await texto(pilar)
  ok('R6.3', 'Con el requisito cumplido la etapa avanza y queda el evento', (await pilar.locator('.etapa--actual').innerText()).includes('Documentación') && t.includes('Etapa: Denuncia → Documentación') && t.includes('Cumplido: Denuncia presentada a la compañía'))
  await lucia.goto(cotizacion)
  ok('R6.perm', 'Pilar no ve la cotización de una empresa que no tiene asignada', (await (await como('pilar')).goto(cotizacion))?.status() === 404)

  ok('R.err', 'Sin errores de JavaScript en el navegador', erroresJs.length === 0, erroresJs.join(' | '))
  await navegador.close()
}

// ── Corrida ──────────────────────────────────────────────────────────────────

let servidorProc
try {
  await crearBase()
  const mundo = await sembrar()
  servidorProc = await levantarServidor()
  await recorrer(mundo)
} catch (error) {
  ok('R.corrida', 'La corrida terminó sin excepciones', false, error instanceof Error ? error.stack ?? error.message : String(error))
} finally {
  if (servidorProc !== undefined) {
    try {
      process.kill(-servidorProc.pid)
    } catch {
      // ya terminó
    }
  }
  await borrarBase().catch(() => undefined)
}

const fallidos = resultados.filter((r) => !r.cumple)
console.log(`\n${String(resultados.length - fallidos.length)} de ${String(resultados.length)} comprobaciones en verde.`)
console.log('\nNo cubierto por C6:')
for (const linea of NO_CUBIERTO) console.log(`  · ${linea}`)
process.exit(fallidos.length === 0 ? 0 : 1)
