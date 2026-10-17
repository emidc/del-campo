// El ensayo de la aceptación (T-0032, paso 4) sobre una base local vacía, para la evidencia:
// carga las sintéticas como H1 a H5, recorre importación, orden previo, ciclos, revisión y
// reordenamiento, y escribe el manifiesto. Después, el script de aceptación mide esa base.
//
//   RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_dev \
//     pnpm --filter @del-campo/risk run ensayo <manifiesto.json>
//   pnpm --filter @del-campo/risk run aceptacion <manifiesto.json>
//
// Sólo local (delcampo_risk_dev o delcampo_risk_test, vacía): no acepta `--hosteada`. Escribe y
// no se revierte, porque el esquema es sólo de inserción: para repetirlo, la base se borra y se
// vuelve a crear (`db:create`).

import { writeFileSync } from 'node:fs'

import { connect, destinoDe, HOSTED_FLAG } from '../persistence/database.ts'
import { migrate } from '../persistence/migrations.ts'
import { ensayar } from './ensayo.ts'

const die = (message: string): never => {
  process.stderr.write(`✗ ${message}\n`)
  process.exit(2)
}

const args = process.argv.slice(2)
if (args.includes(HOSTED_FLAG)) die('el ensayo es sólo para una base local vacía')
const d = destinoDe(args, process.env, 'postgres://localhost:5432/delcampo_risk_dev')
if ('error' in d) die(d.error)
const { destino, args: resto } = d as Exclude<typeof d, { error: string }>
if (resto.length !== 1) die('uso: pnpm --filter @del-campo/risk run ensayo <manifiesto.json>')

const sql = connect(destino.url)
try {
  await migrate(sql)
  const manifiesto = await ensayar(sql)
  writeFileSync(resto[0] ?? '', `${JSON.stringify(manifiesto, null, 2)}\n`)
  process.stdout.write(`✓ ensayo cargado en ${destino.nombre}; manifiesto en ${resto[0] ?? ''}\n`)
} finally {
  await sql.end()
}
