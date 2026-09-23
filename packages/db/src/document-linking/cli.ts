// T-0017 — entrypoint del operador para la carga repetible del insumo revisado.
// Toda la carga corre en una única transacción (D-0054 depende de que sus triggers
// deferrable vean el batch completo antes de comprometerse); un fallo a mitad de
// camino no deja pertenencias a medio escribir.
//
// Salida agregada únicamente: conteos y motivos de rechazo por fila/columna, nunca una
// URL ni un valor de columna del insumo (R-19/D-0053).

import { conectar } from '../import/db.ts'
import { loadDocumentVerificationInput } from './load.ts'

const morir = (mensaje: string): never => {
  process.stderr.write(`✗ ${mensaje}\n`)
  process.exit(1)
}

const requerirRutaInsumo = (): string => {
  const ruta = process.argv[3]
  if (process.argv[2] !== 'load' || ruta === undefined) {
    return morir('uso: node packages/db/src/document-linking/cli.ts load <ruta-del-csv>')
  }
  return ruta
}

const rutaInsumo = requerirRutaInsumo()

const sql = conectar()
try {
  const resultado = await sql.begin(async (tx) => {
    const [batch] = await tx<{ id: string }[]>`
      insert into document_verification_batch (source_file, notes)
      values (${rutaInsumo}, ${'T-0017 cli run'})
      returning id
    `
    if (batch === undefined) throw new Error('no se pudo crear document_verification_batch')
    return loadDocumentVerificationInput(tx, batch.id, rutaInsumo)
  })

  process.stdout.write(
    `✓ vinculación documental (batch ${resultado.batchId}): ` +
      `${String(resultado.totalRows)} fila(s), ${String(resultado.loaded)} cargada(s), ` +
      `${String(resultado.rejected.length)} rechazada(s), ` +
      `${String(resultado.ambiguousPolicyIds.length)} Policy(ies) con ambigüedad nueva\n`,
  )
  for (const error of resultado.rejected) {
    process.stderr.write(`  ✗ fila ${String(error.rowNumber)}, columna "${error.column}": ${error.reason}\n`)
  }
} finally {
  await sql.end()
}
