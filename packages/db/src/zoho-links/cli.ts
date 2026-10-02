// T-0022 — entrypoint del operador para regenerar el nivel "según Zoho" de VS01.
//
// La ruta del lote es un argumento, no una constante: este CLI no sabe ni decide qué
// lote se carga, y por eso puede correrse sobre una carpeta de fixtures sintéticas sin
// tocar nada real.
//
// Salida agregada únicamente: conteos por módulo y por motivo de omisión. Nunca una URL,
// un id de registro ni un valor de columna del lote. → R-19 / D-0053 / D-0064

import { conectar } from '../import/db.ts'
import { loadZohoLinks } from './load.ts'
import type { ZohoLinkCounts } from './load.ts'

const morir = (mensaje: string): never => {
  process.stderr.write(`✗ ${mensaje}\n`)
  process.exit(1)
}

const raizDelLote = ((): string => {
  const ruta = process.argv[3]
  if (process.argv[2] !== 'load' || ruta === undefined) {
    return morir('uso: node packages/db/src/zoho-links/cli.ts load <ruta-del-lote>')
  }
  return ruta
})()

const linea = (modulo: string, conteos: ZohoLinkCounts): string => {
  const omitidos = Object.entries(conteos.omitidos)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([motivo, cantidad]) => `${motivo}=${String(cantidad)}`)
    .join(' ')
  return (
    `  ${modulo}: ${String(conteos.filas)} fila(s), ${String(conteos.ofrecidos)} ofrecido(s)` +
    (omitidos === '' ? '' : `, omitidos: ${omitidos}`)
  )
}

const sql = conectar()
try {
  const resultado = await sql.begin((tx) => loadZohoLinks(tx, raizDelLote))

  process.stdout.write(
    `✓ enlaces de Zoho (D-0064): ${String(resultado.borrados)} de la foto anterior borrado(s), ` +
      `${String(resultado.insertados.policy)} de póliza y ` +
      `${String(resultado.insertados.party)} de cliente escrito(s)\n`,
  )
  process.stdout.write(linea('polizas  ', resultado.polizas) + '\n')
  process.stdout.write(linea('clientes ', resultado.clientes) + '\n')
} finally {
  await sql.end()
}
