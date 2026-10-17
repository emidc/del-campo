// Lo único que exporta @del-campo/risk (D-0063). Quien consuma el contexto —el importador de
// T-0029, la app de T-0030— importa de acá y de ningún otro archivo.
//
// Se exportan las lecturas de una organización y no las piezas sueltas de la metodología: el
// ranking, las posiciones y la cola salen de `rankingOrganizacion`, que rechaza mezclar
// organizaciones, y no hay ninguna función que compare o agregue `C_raw` entre riesgos
// sueltos o entre organizaciones (RO01 §3, reglas 1, 2 y 4). `compararD10` y `rankingD10`
// quedan dentro del dominio.

export {
  BANDAS,
  CORTES_BANDA,
  DIMENSIONES,
  iEfectivoTexto,
  NIVELES,
  type Banda,
  type Dimension,
  type Evaluabilidad,
  type Factor,
  type Factores,
  type IEfectivo,
  type MotivoNoEvaluable,
  type Nivel,
  type Recuperacion,
  type Uncertainty,
} from '../domain/metodologia.ts'
export {
  exigirVersion,
  VERSION_METODOLOGIA,
  type Evaluacion,
  type ReviewStatus,
  type Riesgo,
  type TipoObjeto,
  type VersionFunciones,
} from '../domain/modelo.ts'
export {
  colaDeValidacion,
  derivados,
  historia,
  numeroDePosicion,
  rankingOrganizacion,
  vigente,
  type Derivados,
  type NoEvaluable,
  type RankingOrganizacion,
} from '../domain/lectura.ts'
export { connect, type Sql, type TransactionSql } from '../persistence/database.ts'

// T-0030: las vistas, cada una de una organización y con la sesión de una persona; las que
// entregan ranking, bandas o `C_raw` registran el acceso (RO01 §2, Acceso). `C_raw` sólo sale en
// el detalle, junto al vector y las banderas (H6).
export type {
  AccionVista, Banderas, CoberturaVista, CriticidadDetalle, EvaluacionDetalle, EvaluacionUsada, EventoVista, FactorDetalle,
  FactorVista, FilaCola, FilaEscenario, FilaNoEvaluable, FilaRanking, FilaSeguridad, HijoEnLista, Identidad, ItemActividad,
  Lectura, LimiteDisponible, Movimiento, NovedadVista, RevisionPendienteVista, RiesgoEnPlan, RiesgoEnTransferencia, Tratamiento,
  VistaActividad, VistaDetalle, VistaEscenarios, VistaLista, VistaPlan, VistaTransferencia,
} from '../domain/vistas.ts'
export type { NombreFactor, Procedencia, RevisionRegistrada } from '../domain/organizacion.ts'
export type { Organizacion } from '../persistence/vistas.ts'
export {
  organizaciones, vistaActividad, vistaDetalle, vistaEscenarios, vistaLista, vistaPlan, vistaTransferencia,
  VISTAS_CON_RESULTADOS, type VistaConResultados,
} from './vistas.ts'
// Acceso por persona (D-0069): la sesión es la identidad que la app pasa a todo lo demás.
export { iniciarSesion, sesionVigente, type Sesion } from './acceso.ts'
// Operación de la base y carga de lotes: los usa la app en sus tests de integración y T-0032.
export { migrate } from '../persistence/migrations.ts'
export { importarLote, leerArchivosDeLote, leerContrato } from './importar.ts'
// T-0031: la actualización. Cada caso de uso pide la sesión de una persona, que es el autor de lo
// que escribe, y corre en una sola transacción: una operación compuesta no deja estado intermedio
// (RO01 A5). Una regla que no se cumple termina en `RechazoActualizacion`, sin escribir nada.
export {
  abrirRevisionesPorCambioDeVersion, altaAccion, altaCobertura, BASES, cambiarEstadoAccion, cargarReevaluacion, cerrarConReevaluacion,
  cerrarSinCambio, pantallaOrdenPrevio, RechazoActualizacion, registrarEficacia, registrarEventoPoliza, registrarNovedad,
  registrarOrdenPrevio, reordenar, revisar, SUFICIENCIAS, TIPOS_EVENTO, UNCERTAINTY,
  type FactorPedido, type ObjetoCiego, type ObjetoRevisado, type Opciones, type PantallaOrdenPrevio, type PedidoAccion, type PedidoCobertura,
  type PedidoEficacia, type PedidoEstadoAccion, type PedidoEvento, type PedidoNovedad, type PedidoOrdenPrevio, type PedidoReevaluacion,
} from './actualizacion.ts'
export {
  DISPARADORES, ESTADOS_ACCION, ESTADOS_REVISION, MOTIVOS, TIPOS_NOVEDAD,
  type Disparador, type EstadoAccion, type EstadoRevisionHumana, type Motivo, type TipoNovedad,
} from '../domain/actualizacion.ts'
export { CAUSAS_REORDENAMIENTO, PATRONES_REORDENAMIENTO, TIPOS_REORDENAMIENTO, type PedidoReordenamiento, type PosicionProfesional } from '../domain/reordenamiento.ts'
export type { EntradaHistorial, TablaHistorial } from '../domain/historial.ts'
export type { ReordenamientoVista } from '../domain/vistas.ts'
export { FACTORES } from '../domain/organizacion.ts'
