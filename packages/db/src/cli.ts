// Crear, resetear y migrar la base local. Un comando, un efecto, y todo contra `psql`:
// no hay driver de Node en T-0010 porque todavía no hay una consulta que lo use, y una
// dependencia sin consumidor es una decisión tomada por adelantado. → R-01, D-0045
//
// Postgres corre nativo en la máquina de desarrollo, con la versión mayor fijada en
// `.postgres-version`. CI usa un contenedor: la diferencia es deliberada y la cubre
// R-17, porque el veredicto lo da CI. → D-0046, docs/desarrollo/postgres-local.md

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { archivosDeMigracion, ErrorDeMigraciones, pendientes } from './migraciones.ts'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..')
const DIRECTORIO_MIGRACIONES = join(RAIZ, 'packages', 'db', 'migrations')
const DIRECTORIO_DOWN = join(DIRECTORIO_MIGRACIONES, 'down')
const LEDGER = 'schema_migrations'

const morir = (mensaje: string): never => {
  process.stderr.write(`✗ ${mensaje}\n`)
  process.exit(1)
}

/** `.env` local, sin dependencia: una línea `CLAVE=valor`, sin comillas ni expansión. */
const leerEnv = (): Record<string, string> => {
  const archivo = join(RAIZ, '.env')
  if (!existsSync(archivo)) return {}

  const pares: Record<string, string> = {}
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const limpia = linea.trim()
    if (limpia === '' || limpia.startsWith('#')) continue
    const corte = limpia.indexOf('=')
    if (corte === -1) continue
    pares[limpia.slice(0, corte).trim()] = limpia.slice(corte + 1).trim()
  }
  return pares
}

const urlDeLaBase = (): URL => {
  const crudo = process.env.DATABASE_URL ?? leerEnv().DATABASE_URL
  if (crudo === undefined || crudo === '') {
    return morir('falta DATABASE_URL. Copiá .env.example a .env — ver docs/desarrollo/postgres-local.md')
  }
  try {
    return new URL(crudo)
  } catch {
    return morir(`DATABASE_URL no es una URL válida: ${crudo}`)
  }
}

const nombreDeLaBase = (url: URL): string => {
  const nombre = url.pathname.replace(/^\//, '')
  if (nombre === '') return morir('DATABASE_URL no nombra ninguna base de datos.')
  return nombre
}

/** `psql` contra la base del URL. Devuelve stdout; aborta al primer error de SQL. */
const psql = (url: URL, argumentos: readonly string[]): string =>
  execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', url.href, ...argumentos], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })

/** Igual, pero contra `postgres`: para CREATE/DROP DATABASE, que no corren desde adentro. */
const psqlAdmin = (url: URL, sql: string): string => {
  const administrativa = new URL(url.href)
  administrativa.pathname = '/postgres'
  return psql(administrativa, ['-tAc', sql])
}

const versionMayorFijada = (): number => {
  const archivo = join(RAIZ, '.postgres-version')
  const contenido = readFileSync(archivo, 'utf8').trim()
  const mayor = Number(contenido)
  if (!Number.isInteger(mayor)) {
    return morir(`.postgres-version debe contener sólo la versión mayor, por ejemplo 17. Contiene: "${contenido}"`)
  }
  return mayor
}

const comprobarVersion = (url: URL): number => {
  const fijada = versionMayorFijada()
  let numerica: string
  try {
    numerica = psqlAdmin(url, 'show server_version_num').trim()
  } catch {
    return morir(
      `no hay un Postgres respondiendo en ${url.host}. Instalación y arranque: docs/desarrollo/postgres-local.md`,
    )
  }

  const mayor = Math.floor(Number(numerica) / 10000)
  if (mayor !== fijada) {
    return morir(
      `Postgres local es ${String(mayor)} y .postgres-version fija ${String(fijada)}. ` +
        'La versión mayor local tiene que coincidir con la de CI: docs/desarrollo/postgres-local.md',
    )
  }
  return mayor
}

const existeLaBase = (url: URL): boolean =>
  psqlAdmin(url, `select 1 from pg_database where datname = '${nombreDeLaBase(url)}'`).trim() === '1'

const migracionesEnDisco = (): string[] =>
  existsSync(DIRECTORIO_MIGRACIONES) ? readdirSync(DIRECTORIO_MIGRACIONES) : []

const existeLedger = (url: URL): boolean =>
  psql(url, ['-tAc', `select to_regclass('public.${LEDGER}') is not null`]).trim() === 't'

const aplicadas = (url: URL): string[] =>
  psql(url, ['-tAc', `select archivo from ${LEDGER} order by archivo`])
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '')

const migrar = (url: URL): void => {
  const todas = archivosDeMigracion(migracionesEnDisco())

  // El ledger se lee antes de cualquier atajo: si la base registra una migración que ya
  // no está en el repositorio, hay que enterarse incluso —sobre todo— cuando el
  // directorio quedó vacío. Un early return acá esconde exactamente la deriva que
  // `pendientes` existe para detectar.
  const hayLedger = existeLedger(url)
  const faltan = pendientes(todas, hayLedger ? aplicadas(url) : [])

  // Con cero migraciones no se toca la base: ni siquiera se crea el ledger. Una base
  // recién creada por T-0010 tiene cero tablas, que es lo que la tarea promete.
  if (todas.length === 0) {
    process.stdout.write('· sin migraciones: la base queda vacía (la primera es de T-0012)\n')
    return
  }

  if (!hayLedger) {
    psql(url, [
      '-c',
      `create table ${LEDGER} (
         archivo text primary key,
         aplicada_en timestamptz not null default now()
       )`,
    ])
  }

  if (faltan.length === 0) {
    process.stdout.write(`· ${String(todas.length)} migración(es), ninguna pendiente\n`)
    return
  }

  for (const migracion of faltan) {
    // Una transacción por migración, con el registro adentro: si el SQL falla, el
    // ledger no miente sobre lo que quedó aplicado.
    psql(url, [
      '-1',
      '-f',
      join(DIRECTORIO_MIGRACIONES, migracion.archivo),
      '-c',
      `insert into ${LEDGER} (archivo) values ('${migracion.archivo}')`,
    ])
    process.stdout.write(`✓ ${migracion.archivo}\n`)
  }
}

// BR-008 (revisión ciega T-0012): revierte la ÚLTIMA migración aplicada, no todas.
// El down de cada migración vive en `migrations/down/<mismo-archivo>.sql`; si no
// existe, es una migración irreversible declarada así por su ausencia, y `down`
// falla en vez de inventar un rollback. → ## Outcome "la migración es reversible"
const bajar = (url: URL): void => {
  if (!existeLedger(url)) {
    process.stdout.write('· no hay ledger: ninguna migración aplicada\n')
    return
  }

  const aplicadasActuales = aplicadas(url)
  const ultima = aplicadasActuales.at(-1)
  if (ultima === undefined) {
    process.stdout.write('· no hay migraciones aplicadas\n')
    return
  }

  const archivoDown = join(DIRECTORIO_DOWN, ultima)
  if (!existsSync(archivoDown)) {
    morir(`no existe down para "${ultima}" en ${archivoDown}: es irreversible.`)
    return
  }

  psql(url, ['-1', '-f', archivoDown, '-c', `delete from ${LEDGER} where archivo = '${ultima}'`])
  process.stdout.write(`✓ down: ${ultima}\n`)
}

const crear = (url: URL): void => {
  comprobarVersion(url)
  const nombre = nombreDeLaBase(url)
  if (existeLaBase(url)) {
    process.stdout.write(`· ${nombre} ya existe\n`)
  } else {
    psqlAdmin(url, `create database "${nombre}"`)
    process.stdout.write(`✓ base creada: ${nombre}\n`)
  }
  migrar(url)
}

const resetear = (url: URL): void => {
  const nombre = nombreDeLaBase(url)

  // R-19: esto sólo puede correr contra una base local, y se comprueba ANTES de abrir
  // una conexión. Un destino equivocado tiene que ser rechazado por lo que dice el
  // DATABASE_URL, no por lo que responda el servidor del otro lado: el drop de una base
  // no tiene deshacer.
  if (!/_dev$|_test$/.test(nombre)) {
    morir(`db:reset sólo opera sobre bases terminadas en _dev o _test. DATABASE_URL apunta a "${nombre}".`)
  }
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    morir(`db:reset sólo opera sobre localhost. DATABASE_URL apunta a "${url.hostname}".`)
  }

  comprobarVersion(url)
  psqlAdmin(url, `drop database if exists "${nombre}" with (force)`)
  process.stdout.write(`✓ base eliminada: ${nombre}\n`)
  crear(url)
}

const version = (url: URL): void => {
  const mayor = comprobarVersion(url)
  process.stdout.write(`✓ Postgres ${String(mayor)} local coincide con .postgres-version\n`)
}

const url = urlDeLaBase()
const comando = process.argv[2]

// Un error esperado sale como una línea legible, no como un stack trace: quien corre
// `pnpm db:migrate` necesita saber qué hacer, no en qué archivo se lanzó la excepción.
try {
  switch (comando) {
    case 'create':
      crear(url)
      break
    case 'reset':
      resetear(url)
      break
    case 'migrate':
      migrar(url)
      break
    case 'down':
      bajar(url)
      break
    case 'version':
      version(url)
      break
    default:
      morir(`comando desconocido: "${comando ?? ''}". Se espera create, reset, migrate, down o version.`)
  }
} catch (error) {
  if (error instanceof ErrorDeMigraciones) morir(error.message)
  throw error
}
