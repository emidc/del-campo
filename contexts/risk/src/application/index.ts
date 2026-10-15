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
export { connect, type Sql } from '../persistence/database.ts'
