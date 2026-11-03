// Crea la base y los roles del spike y aplica schema.sql como owner. Idempotente: borra
// y vuelve a crear los esquemas. Se revierte con `node setup-db.ts --borrar`.
import { readFileSync } from 'node:fs'
import { conectar, conectarCluster, ROLES, SPIKE_DB } from './db.ts'
import { sembrar } from './seed.ts'

const cluster = conectarCluster()
const ident = (nombre: string): string => `"${nombre.replaceAll('"', '""')}"`

if (process.argv.includes('--borrar')) {
  await cluster.unsafe(`drop database if exists ${ident(SPIKE_DB)} with (force)`)
  for (const rol of Object.values(ROLES)) await cluster.unsafe(`drop role if exists ${ident(rol)}`)
  await cluster.end()
  console.log(`borrados ${SPIKE_DB} y los roles spike_t0002_*`)
  process.exit(0)
}

// Ningún rol es superusuario. Sólo _plain y _service tienen BYPASSRLS, a propósito.
const atributos: Record<string, string> = {
  [ROLES.owner]: 'login nobypassrls',
  [ROLES.app]: 'login nobypassrls',
  [ROLES.plain]: 'login bypassrls',
  [ROLES.worker]: 'login nobypassrls',
  [ROLES.mcp]: 'login nobypassrls',
  [ROLES.service]: 'login bypassrls',
  [ROLES.riskapp]: 'login nobypassrls',
}
for (const [rol, attrs] of Object.entries(atributos)) {
  const [existe] = await cluster`select 1 from pg_roles where rolname = ${rol}`
  await cluster.unsafe(`${existe ? 'alter' : 'create'} role ${ident(rol)} ${attrs} nosuperuser nocreatedb nocreaterole`)
}
const [hay] = await cluster`select 1 from pg_database where datname = ${SPIKE_DB}`
if (!hay) await cluster.unsafe(`create database ${ident(SPIKE_DB)} owner ${ident(ROLES.owner)}`)
await cluster.end()

const owner = conectar('owner', { max: 1 })
await owner.unsafe(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
await sembrar(owner)
await owner.end()
console.log(`${SPIKE_DB}: schema aplicado y semilla cargada`)
