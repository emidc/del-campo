// Lo que exporta el paquete es una lista cerrada: una función nueva que compare o agregue
// `C_raw` fuera de una organización no sale del contexto sin cambiar este test (RO01 §3).

import assert from 'node:assert/strict'
import { it } from 'node:test'

import * as risk from './index.ts'

it('el paquete exporta las lecturas por organización y los casos de uso de la actualización, sin comparar ni agregar C_raw', () => {
  assert.deepEqual(Object.keys(risk).sort(), [
    'BANDAS',
    'BASES',
    'CAUSAS_REORDENAMIENTO',
    'CORTES_BANDA',
    'DIMENSIONES',
    'DISPARADORES',
    'ESTADOS_ACCION',
    'ESTADOS_REVISION',
    'FACTORES',
    'LOGIN_MAXIMO_FALLIDOS',
    'LOGIN_VENTANA_MINUTOS',
    'MOTIVOS',
    'NIVELES',
    'PATRONES_REORDENAMIENTO',
    'RechazoActualizacion',
    'SUFICIENCIAS',
    'TIPOS_EVENTO',
    'TIPOS_NOVEDAD',
    'TIPOS_REORDENAMIENTO',
    'UNCERTAINTY',
    'VERSION_METODOLOGIA',
    'VISTAS_CON_RESULTADOS',
    'abrirRevisionesPorCambioDeVersion',
    'altaAccion',
    'altaCobertura',
    'cambiarEstadoAccion',
    'cargarReevaluacion',
    'cerrarConReevaluacion',
    'cerrarSinCambio',
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
    'pantallaOrdenPrevio',
    'rankingOrganizacion',
    'registrarEficacia',
    'registrarEventoPoliza',
    'registrarNovedad',
    'registrarOrdenPrevio',
    'reordenar',
    'revisar',
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
