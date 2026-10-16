// Lo que exporta el paquete es una lista cerrada: una función nueva que compare o agregue
// `C_raw` fuera de una organización no sale del contexto sin cambiar este test (RO01 §3).

import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as risk from './index.ts'

it('el paquete exporta sólo las lecturas por organización, sin comparar ni agregar C_raw', () => {
  assert.deepEqual(Object.keys(risk).sort(), [
    'BANDAS',
    'CORTES_BANDA',
    'DIMENSIONES',
    'NIVELES',
    'VERSION_METODOLOGIA',
    'VISTAS_CON_RESULTADOS',
    'colaDeValidacion',
    'connect',
    'derivados',
    'exigirVersion',
    'historia',
    'iEfectivoTexto',
    'importarLote',
    'iniciarSesion',
    'leerArchivosDeLote',
    'leerContrato',
    'migrate',
    'numeroDePosicion',
    'organizaciones',
    'rankingOrganizacion',
    'sesionVigente',
    'vigente',
    'vistaActividad',
    'vistaDetalle',
    'vistaEscenarios',
    'vistaLista',
    'vistaPlan',
    'vistaTransferencia',
  ])
  for (const nombre of Object.keys(risk)) {
    assert.doesNotMatch(nombre, /compar|promedio|suma|total|agreg|portfolio|cartera/i, nombre)
  }
})
