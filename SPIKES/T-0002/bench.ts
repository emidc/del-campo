// Costo de RLS frente al filtro en la aplicación, con un volumen sintético mayor que la
// cartera real (orden de magnitud, no una medición de producción). Al final restaura la
// semilla chica con setup-db.ts.
import { spawnSync } from 'node:child_process'
import { conectar, enContexto } from './db.ts'
import { AHORA } from './seed.ts'

const EMPRESAS = 2000
const POLIZAS_POR_EMPRESA = 10
const OPERADORES = 50
const EMPRESAS_POR_OPERADOR = 40
const REPETICIONES = 30

spawnSync(process.execPath, ['setup-db.ts'], { cwd: import.meta.dirname, stdio: 'ignore' })
const owner = conectar('owner')
await owner`update authz.reloj set habilitado = true`
await owner.unsafe(`
  insert into broker.empresa (id, nombre)
    select gen_random_uuid(), 'bench ' || g from generate_series(1, ${EMPRESAS}) g;
  insert into broker.poliza (id, empresa_id, numero, vence)
    select gen_random_uuid(), e.id, 'B-' || e.nombre || '-' || g, date '2027-01-01'
    from broker.empresa e cross join generate_series(1, ${POLIZAS_POR_EMPRESA}) g where e.nombre like 'bench %';
  insert into broker.usuario (id, nombre, tipo, rol)
    select gen_random_uuid(), 'bench op ' || g, 'INTERNO', 'OPERADOR' from generate_series(1, ${OPERADORES}) g;
  insert into broker.asignacion (usuario_id, empresa_id, desde)
    select u.id, e.id, timestamptz '2026-01-01'
    from (select id, row_number() over (order by id) - 1 as n from broker.usuario where nombre like 'bench op %') u
    join (select id, row_number() over (order by id) - 1 as n from broker.empresa where nombre like 'bench %') e
      on e.n / ${EMPRESAS_POR_OPERADOR} = u.n;
  analyze;`)
const [op] = await owner<{ id: string }[]>`select id from broker.usuario where nombre = 'bench op 1'`
if (op === undefined) throw new Error('sin operador de bench')

const app = conectar('app')
const plain = conectar('plain')
const ctx = { usuario: op.id, instante: AHORA }

async function medir(nombre: string, fn: () => Promise<number>): Promise<void> {
  let filas = 0
  await fn()
  const t0 = performance.now()
  for (let i = 0; i < REPETICIONES; i++) filas = await fn()
  const ms = (performance.now() - t0) / REPETICIONES
  console.log(`${nombre.padEnd(46)} ${String(filas).padStart(6)} filas  ${ms.toFixed(2).padStart(7)} ms/consulta`)
}

console.log(`volumen: ${EMPRESAS} empresas, ${EMPRESAS * POLIZAS_POR_EMPRESA} pólizas, operador con ${EMPRESAS_POR_OPERADOR} empresas`)
await medir('RLS: select * from poliza (sin WHERE)', () =>
  enContexto(app, ctx, async (tx) => (await tx`select * from broker.poliza`).length))
await medir('Aplicación: WHERE empresa_id = any(asignadas)', () =>
  enContexto(plain, ctx, async (tx) => {
    const asignadas = (await tx<{ id: string }[]>`select empresa_id as id from broker.asignacion
      where usuario_id = ${op.id} and tstzrange(desde, coalesce(hasta, 'infinity')) @> ${AHORA}::timestamptz`).map((f) => f.id)
    return (await tx`select * from broker.poliza where empresa_id = any(${asignadas}::uuid[])`).length
  }))
await medir('Sin autorización (BYPASSRLS, todas)', () =>
  enContexto(plain, ctx, async (tx) => (await tx`select * from broker.poliza`).length))

const plan = await enContexto(app, ctx, (tx) => tx.unsafe('explain (analyze, costs off, timing off, summary off) select * from broker.poliza'))
console.log('\nplan con RLS:')
for (const f of plan) console.log('  ' + String(Object.values(f)[0]))

await Promise.all([owner.end(), app.end(), plain.end()])
spawnSync(process.execPath, ['setup-db.ts'], { cwd: import.meta.dirname, stdio: 'ignore' })
