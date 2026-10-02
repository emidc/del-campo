// T-0022 — la restricción de rotulado de D-0057 y D-0064, verificada.
//
// Lo que estas pruebas impiden que vuelva: que una carpeta se lea como el documento de
// la póliza, y que un enlace que nadie comprobó se presente como comprobado.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { PolicyDocumentAccess } from '@del-campo/api'

import { describirAcceso } from './acceso-documental.ts'
import type { DescripcionDeAcceso } from './acceso-documental.ts'

const ARCHIVO = 'https://drive.google.com/file/d/SINTETICO-001/view'
const CARPETA = 'https://drive.google.com/drive/folders/SINTETICO-002'

const acceso = (over: Partial<PolicyDocumentAccess>): PolicyDocumentAccess => ({
  policyId: 'sintetico',
  document: null,
  clientFolder: null,
  pending: null,
  ...over,
})

/** El tipo de retorno se ensancha a propósito: cada caso compara el objeto entero. */
const describir = (over: Partial<PolicyDocumentAccess>): DescripcionDeAcceso =>
  describirAcceso(acceso(over))

describe('describirAcceso — T-0022', () => {
  it('un documento comprobado por una persona no lleva sufijo ni sello', () => {
    assert.deepEqual(describir({ document: { kind: 'FILE', url: ARCHIVO, level: 'HUMAN' } }), {
      forma: 'DOCUMENTO',
      enlace: {
        texto: 'Abrir documento',
        clase: 'enlace-documento',
        url: ARCHIVO,
        sinComprobar: false,
      },
      pendiente: null,
    })
  })

  it('un documento de Zoho dice "según Zoho" y pide el sello "sin comprobar"', () => {
    assert.deepEqual(
      describir({ document: { kind: 'FILE', url: ARCHIVO, level: 'ZOHO_UNVERIFIED' } }),
      {
        forma: 'DOCUMENTO',
        enlace: {
          texto: 'Abrir documento (según Zoho)',
          clase: 'enlace-documento enlace-documento--zoho',
          url: ARCHIVO,
          sinComprobar: true,
        },
        pendiente: null,
      },
    )
  })

  it('una carpeta comprobada nunca se rotula como documento', () => {
    assert.deepEqual(
      describir({ clientFolder: { kind: 'FOLDER', url: CARPETA, level: 'HUMAN' } }),
      {
        forma: 'CARPETA',
        enlace: {
          texto: 'Abrir carpeta del cliente',
          clase: 'enlace-carpeta',
          url: CARPETA,
          sinComprobar: false,
        },
        aclaracion: 'No es el documento de la póliza',
      },
    )
  })

  it('una carpeta de Zoho lleva sufijo, sello y la aclaración de que no es el documento', () => {
    assert.deepEqual(
      describir({ clientFolder: { kind: 'FOLDER', url: CARPETA, level: 'ZOHO_UNVERIFIED' } }),
      {
        forma: 'CARPETA',
        enlace: {
          texto: 'Abrir carpeta del cliente (según Zoho)',
          clase: 'enlace-carpeta enlace-carpeta--zoho',
          url: CARPETA,
          sinComprobar: true,
        },
        aclaracion: 'No es el documento de la póliza',
      },
    )
  })

  it('el pendiente humano acompaña al enlace de Zoho, no lo reemplaza', () => {
    assert.deepEqual(
      describir({
        document: { kind: 'FILE', url: ARCHIVO, level: 'ZOHO_UNVERIFIED' },
        pending: { reason: 'INACCESSIBLE' },
      }),
      {
        forma: 'DOCUMENTO',
        enlace: {
          texto: 'Abrir documento (según Zoho)',
          clase: 'enlace-documento enlace-documento--zoho',
          url: ARCHIVO,
          sinComprobar: true,
        },
        pendiente: 'inaccesible con la cuenta que comprobó',
      },
    )
  })

  it('la carpeta de Zoho con pendiente humano conserva los dos textos', () => {
    assert.deepEqual(
      describir({
        clientFolder: { kind: 'FOLDER', url: CARPETA, level: 'ZOHO_UNVERIFIED' },
        pending: { reason: 'AMBIGUOUS' },
      }),
      {
        forma: 'CARPETA',
        enlace: {
          texto: 'Abrir carpeta del cliente (según Zoho)',
          clase: 'enlace-carpeta enlace-carpeta--zoho',
          url: CARPETA,
          sinComprobar: true,
        },
        aclaracion: 'No es el documento de la póliza · ambiguo',
      },
    )
  })

  it('sin enlace de ningún nivel sigue habiendo ausencia explícita', () => {
    assert.deepEqual(describir({ pending: { reason: 'NO_REFERENCE' } }), {
      forma: 'AUSENCIA',
      pendiente: 'sin referencia en el origen',
    })
  })

  /** Ningún rótulo de la pantalla afirma comprobación sobre un enlace de Zoho. */
  it('ningún texto mostrado para un enlace de Zoho dice "comprobado"', () => {
    const descripciones: DescripcionDeAcceso[] = [
      describir({ document: { kind: 'FILE', url: ARCHIVO, level: 'ZOHO_UNVERIFIED' } }),
      describir({ clientFolder: { kind: 'FOLDER', url: CARPETA, level: 'ZOHO_UNVERIFIED' } }),
    ]
    for (const descripcion of descripciones) {
      const textos =
        descripcion.forma === 'AUSENCIA'
          ? [descripcion.pendiente ?? '']
          : descripcion.forma === 'CARPETA'
            ? [descripcion.enlace.texto, descripcion.aclaracion]
            : [descripcion.enlace.texto, descripcion.pendiente ?? '']
      for (const texto of textos) {
        assert.ok(!/comprobad[oa]\b/i.test(texto), `"${texto}" no debe afirmar comprobación`)
      }
    }
  })
})
