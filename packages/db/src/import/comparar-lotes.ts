// T-0037 (I1b) — compara dos lotes de staging y sólo cuenta. → docs/migration/zoho/T-0037-refresco.md §2 y §3
//
// Clasifica cada registro de origen de cada módulo:
//  - NUEVO: está en el lote nuevo y no en el anterior;
//  - IGUAL: mismos valores en los campos que el dominio usa;
//  - CAMBIADO: cambió alguno de esos campos;
//  - AUSENTE: estaba en el anterior y no está en el nuevo.
// Para los CAMBIADO cuenta, campo por campo, cuántos registros cambiaron ese campo. Con
// esos conteos el owner elige entre versión nueva o corrección (§3, C3-02).
//
// No escribe nada: corre en una transacción de sólo lectura y no toca el dominio.
// La salida es agregada (conteos, fechas de export y nombres de campo): nunca un id de
// registro ni un valor de columna del lote. → D-0053, R-19

import type { Ejecutor } from './db.ts'
import { MODULOS, NOMBRE_ZOHO } from './lote.ts'
import type { Modulo } from './lote.ts'
import { CAMPOS_CONTACTO, CAMPOS_CUENTA, CAMPOS_ENDOSO, CAMPOS_POLIZA } from './zoho-fields.ts'

/**
 * Los campos de cada módulo que el dominio lee hoy: T-0013 (`policies.ts`, `parties.ts`) y
 * T-0022 (`zoho-links/load.ts`). Un cambio en otra columna del crudo no cambia nada que
 * Broker OS muestre, así que no hace CAMBIADO a un registro. Si un importador empieza a
 * leer otra columna, se agrega acá.
 */
export const CAMPOS_COMPARADOS: Readonly<Record<Modulo, readonly string[]>> = {
  polizas: [
    CAMPOS_POLIZA.numeroDePoliza,
    CAMPOS_POLIZA.estado,
    CAMPOS_POLIZA.vigenciaInicio,
    CAMPOS_POLIZA.vigenciaFin,
    CAMPOS_POLIZA.contactoId,
    CAMPOS_POLIZA.cuentaId,
    CAMPOS_POLIZA.companiaId,
    CAMPOS_POLIZA.compania,
    CAMPOS_POLIZA.riesgo,
    CAMPOS_POLIZA.prima,
    CAMPOS_POLIZA.moneda,
    CAMPOS_POLIZA.tipoDeRenovacion,
    CAMPOS_POLIZA.renovadaDePolizaN,
    CAMPOS_POLIZA.urlDriveDocPoliza,
  ],
  endosos: [
    CAMPOS_ENDOSO.numeroDeEndoso,
    CAMPOS_ENDOSO.perteneceAPolizaNId,
    CAMPOS_ENDOSO.tipoEndoso,
    CAMPOS_ENDOSO.inicioVigencia,
    CAMPOS_ENDOSO.finVigencia,
  ],
  contactos: [
    CAMPOS_CONTACTO.nombre,
    CAMPOS_CONTACTO.apellidos,
    CAMPOS_CONTACTO.dni,
    CAMPOS_CONTACTO.cuil,
    CAMPOS_CONTACTO.nombreDeCuentaId,
    CAMPOS_CONTACTO.correoElectronico,
    CAMPOS_CONTACTO.correoElectronicoSecundario,
    CAMPOS_CONTACTO.telefono,
    CAMPOS_CONTACTO.movil,
    CAMPOS_CONTACTO.driveUrl,
  ],
  cuentas: [CAMPOS_CUENTA.nombreDeCuenta, CAMPOS_CUENTA.cuit, CAMPOS_CUENTA.telefono, CAMPOS_CUENTA.driveUrl],
}

const TABLAS: Readonly<Record<Modulo, string>> = {
  polizas: 'staging_policy',
  endosos: 'staging_endorsement',
  contactos: 'staging_contact',
  cuentas: 'staging_account',
}

export interface ConteoClases {
  readonly nuevos: number
  readonly iguales: number
  readonly cambiados: number
  readonly ausentes: number
}

export interface ComparacionModulo extends ConteoClases {
  readonly exportadoAnterior: string
  readonly exportadoNuevo: string
  /** Por campo comparado, cuántos registros CAMBIADO tienen ese campo distinto. Siempre trae todos los campos. */
  readonly cambiosPorCampo: Readonly<Record<string, number>>
}

export interface ComparacionLotes {
  /** Fecha de corte de cada lote: la fecha de export más antigua de sus módulos. */
  readonly corteAnterior: string
  readonly corteNuevo: string
  readonly modulos: Readonly<Record<Modulo, ComparacionModulo>>
}

export class ComparacionInvalida extends Error {
  override readonly name = 'ComparacionInvalida'
}

/**
 * Las fechas de export de un lote por módulo. Un lote cargado antes de T-0037 no las
 * tiene: compararlo daría clases sin fecha, así que se rechaza.
 */
const fechasDeExport = async (sql: Ejecutor, batchId: string): Promise<Record<Modulo, string>> => {
  const filas = await sql<{ module: string; exported_on: string }[]>`
    select module, exported_on::text as exported_on
    from staging_import_batch_module where batch_id = ${batchId}
  `
  const porNombre = new Map(filas.map((fila) => [fila.module, fila.exported_on]))
  const fechas = {} as Record<Modulo, string>
  for (const modulo of MODULOS) {
    const fecha = porNombre.get(NOMBRE_ZOHO[modulo])
    if (fecha === undefined) {
      throw new ComparacionInvalida(
        `el lote ${batchId} no registra la fecha de export de ${modulo}: cargarlo con su lote.json (load-staging)`,
      )
    }
    fechas[modulo] = fecha
  }
  return fechas
}

/**
 * Un campo vacío y un campo que no está en el crudo valen lo mismo: Zoho escribe la
 * cadena vacía para "sin valor" (`staging.ts`), y un export con otra columna no es un
 * cambio de dato.
 */
const valor = (alias: string, campo: number): string => `nullif(${alias}.raw ->> $${String(campo)}, '')`

const compararModulo = async (
  sql: Ejecutor,
  modulo: Modulo,
  anterior: string,
  nuevo: string,
): Promise<Omit<ComparacionModulo, 'exportadoAnterior' | 'exportadoNuevo'>> => {
  const campos = CAMPOS_COMPARADOS[modulo]
  const tabla = TABLAS[modulo]
  // $1 y $2 son los lotes; $3… los nombres de los campos. Los nombres de tabla salen de
  // una constante de este archivo, nunca de la entrada.
  const distinto = campos.map((_, i) => `${valor('a', i + 3)} is distinct from ${valor('n', i + 3)}`)
  const cambiadoAlguno = distinto.length === 0 ? 'false' : distinto.join(' or ')
  const porCampo = distinto.map((condicion, i) => `count(*) filter (where a.raw is not null and n.raw is not null and (${condicion}))::int as c${String(i)}`)

  const [fila] = await sql.unsafe<Record<string, number>[]>(
    `with a as (select source_record_id, raw from ${tabla} where batch_id = $1),
          n as (select source_record_id, raw from ${tabla} where batch_id = $2)
     select
       count(*) filter (where a.raw is null)::int as nuevos,
       count(*) filter (where n.raw is null)::int as ausentes,
       count(*) filter (where a.raw is not null and n.raw is not null and not (${cambiadoAlguno}))::int as iguales,
       count(*) filter (where a.raw is not null and n.raw is not null and (${cambiadoAlguno}))::int as cambiados
       ${porCampo.length === 0 ? '' : `, ${porCampo.join(', ')}`}
     from a full outer join n on n.source_record_id = a.source_record_id`,
    [anterior, nuevo, ...campos],
  )
  if (fila === undefined) throw new Error(`comparación de ${modulo}: la consulta no devolvió filas`)

  return {
    nuevos: fila.nuevos ?? 0,
    iguales: fila.iguales ?? 0,
    cambiados: fila.cambiados ?? 0,
    ausentes: fila.ausentes ?? 0,
    cambiosPorCampo: Object.fromEntries(campos.map((campo, i) => [campo, fila[`c${String(i)}`] ?? 0])),
  }
}

const corte = (fechas: Record<Modulo, string>): string =>
  MODULOS.map((modulo) => fechas[modulo]).reduce((min, fecha) => (fecha < min ? fecha : min))

/**
 * Compara el lote `anterior` con el `nuevo`. Debe correr en una transacción de sólo
 * lectura del llamador (`sql.begin('read only', …)`): así ni un error de esta función
 * podría escribir en la base.
 */
export const compararLotes = async (sql: Ejecutor, anterior: string, nuevo: string): Promise<ComparacionLotes> => {
  if (anterior === nuevo) throw new ComparacionInvalida('se compara un lote consigo mismo')
  const fechasAnterior = await fechasDeExport(sql, anterior)
  const fechasNuevo = await fechasDeExport(sql, nuevo)
  // Invertir el orden convierte los NUEVO en AUSENTE y al revés, sin que nada falle.
  if (corte(fechasNuevo) < corte(fechasAnterior)) {
    throw new ComparacionInvalida(
      `el lote nuevo tiene un corte anterior (${corte(fechasNuevo)}) al del lote anterior (${corte(fechasAnterior)}): ¿están invertidos?`,
    )
  }

  const modulos = {} as Record<Modulo, ComparacionModulo>
  for (const modulo of MODULOS) {
    modulos[modulo] = {
      exportadoAnterior: fechasAnterior[modulo],
      exportadoNuevo: fechasNuevo[modulo],
      ...(await compararModulo(sql, modulo, anterior, nuevo)),
    }
  }

  return { corteAnterior: corte(fechasAnterior), corteNuevo: corte(fechasNuevo), modulos }
}
