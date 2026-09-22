// Fixtures sintéticas únicamente: nada acá viene del lote real. → R-19
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'

import { parsearManifiesto, verificarLote } from './verify-manifest.ts'

const hashDe = (contenido: string): string => createHash('sha256').update(contenido).digest('hex')

describe('parsearManifiesto', () => {
  it('extrae sólo identidad y hashes, ignorando el resto del perfil', () => {
    const crudo = JSON.stringify({
      mode: 'profile',
      facts: [
        {
          archive_id: 'ZIP-01',
          local_archive_name: 'Ejemplo_2026_09_16.zip',
          sha256: 'abc123',
          bytes: 999,
          files: [
            {
              file_id: 'ZIP-01-CSV-01',
              local_member_name: 'Ejemplo_2026_09_16.csv',
              raw_relative_path: 'raw/abc123/0001.csv',
              sha256: 'def456',
              profile: { rows: 10 },
            },
          ],
        },
      ],
    })

    const manifiesto = parsearManifiesto(crudo)
    assert.deepEqual(manifiesto, [
      {
        archiveId: 'ZIP-01',
        localArchiveName: 'Ejemplo_2026_09_16.zip',
        sha256: 'abc123',
        files: [{ fileId: 'ZIP-01-CSV-01', rawRelativePath: 'raw/abc123/0001.csv', sha256: 'def456' }],
      },
    ])
  })
})

describe('verificarLote', () => {
  const directorio = mkdtempSync(join(tmpdir(), 't0013-manifest-'))
  after(() => {
    rmSync(directorio, { recursive: true, force: true })
  })

  it('reporta coincide=true cuando el hash real coincide con el declarado, y false cuando no', async () => {
    const contenidoZip = 'contenido sintético del zip'
    const contenidoCsv = 'contenido sintético del csv'

    mkdirSync(join(directorio, 'original-zips'), { recursive: true })
    mkdirSync(join(directorio, 'raw', 'hashdelcsv'), { recursive: true })
    writeFileSync(join(directorio, 'original-zips', 'Ejemplo_2026_09_16.zip'), contenidoZip)
    writeFileSync(join(directorio, 'raw', 'hashdelcsv', '0001.csv'), contenidoCsv)

    const manifiesto = parsearManifiesto(
      JSON.stringify({
        facts: [
          {
            archive_id: 'ZIP-01',
            local_archive_name: 'Ejemplo_2026_09_16.zip',
            sha256: hashDe(contenidoZip),
            files: [
              {
                file_id: 'ZIP-01-CSV-01',
                raw_relative_path: 'raw/hashdelcsv/0001.csv',
                sha256: 'hash-incorrecto-a-propósito',
              },
            ],
          },
        ],
      }),
    )

    const resultados = []
    for await (const resultado of verificarLote(manifiesto, directorio)) {
      resultados.push(resultado)
    }

    assert.equal(resultados.length, 2)
    assert.equal(resultados[0]?.coincide, true)
    assert.equal(resultados[1]?.coincide, false)
  })
})
