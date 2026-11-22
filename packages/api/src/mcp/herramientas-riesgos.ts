// T-0062 — Las herramientas del agente de riesgos: leer lo que Broker OS sabe de una empresa
// (listas, ubicaciones, condiciones, coberturas, relevamientos, conclusiones) y guardar su
// trabajo. Todo corre por `conDatos`, como `broker_app` y a nombre de quien conectó el agente,
// y cada fila que escribe lleva el agente (`riesgos@1`).
//
// Lo que el agente escribe queda para que una persona lo revise: una condición que infiere
// queda propuesta, una cobertura sin confirmar y una conclusión sin aceptar. Confirmar y
// aceptar se hace desde la app, no desde acá.
//
// Las notas del cerebro de riesgos no viven en Broker OS: la conclusión sólo guarda su ID.

import type {
  ConclusionLevel,
  CoverageKind,
  FactSource,
  FactStatus,
  FindingAspect,
  FindingPriority,
  FindingResult,
  NewCoverage,
  NewEvidence,
  NewFinding,
  RiskItemFields,
  RiskList,
} from '@del-campo/db'
import {
  RISK_LISTS,
  RISK_LIST_COLUMNS,
  cleanRiskItemCode,
  cleanRiskItemFields,
  commentRiskItem,
  coveragesAt,
  createLocation,
  createRiskItem,
  listRiskItems,
  portfolioWithCondition,
  recordConclusion,
  recordCoverage,
  recordFact,
  recordSurvey,
  retireRiskItem,
  tallyFindings,
  updateRiskItem,
} from '@del-campo/db'
import postgres from 'postgres'

import type { Conexion } from '../acceso/base.ts'
import type { Ejecutor } from '../acceso/datos.ts'
import { conDatos } from '../acceso/datos.ts'
import { sql } from '../db.ts'
import { riesgosDeEmpresaCon } from '../riesgos/seccion.ts'
import type { Principal } from '../session/admission.ts'
import type { Herramienta } from './servidor.ts'
import { ErrorDeHerramienta } from './servidor.ts'

export interface ContextoRiesgos {
  readonly principal: Principal
  /** Sólo para tests: la conexión por la que corre `conDatos`. */
  readonly conexion?: Conexion
}

type Args = Readonly<Record<string, unknown>>

/** El agente que firma lo que se escribe, si la llamada no dice otro. */
export const AGENTE_RIESGOS = 'riesgos@1'
const AGENTE = /^[a-z][a-z0-9-]{1,40}@[0-9][0-9.]{0,15}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FECHA = /^\d{4}-\d{2}-\d{2}$/
const NOTA = /^(F-[A-Z0-9-]{2,30}|[A-Z]{2,4}-[0-9]{3})$/
const CLAVE = /^[a-z][a-z0-9_]{1,60}$/

// ── Lectura de argumentos ───────────────────────────────────────────────────

const esObjeto = (valor: unknown): valor is Args => typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const opcional = (a: Args, campo: string, max = 4000): string | null => {
  const valor = a[campo]
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'string') throw new ErrorDeHerramienta(`"${campo}" tiene que ser texto.`)
  const limpio = valor.trim()
  if (limpio.length > max) throw new ErrorDeHerramienta(`"${campo}" es demasiado largo (hasta ${String(max)} caracteres).`)
  return limpio === '' ? null : limpio
}

const requerido = (a: Args, campo: string, max = 4000): string => {
  const valor = opcional(a, campo, max)
  if (valor === null) throw new ErrorDeHerramienta(`Falta "${campo}".`)
  return valor
}

const idOpcional = (a: Args, campo: string): string | null => {
  const valor = opcional(a, campo, 100)
  if (valor !== null && !UUID.test(valor)) throw new ErrorDeHerramienta(`"${campo}" no es un id válido.`)
  return valor
}

const id = (a: Args, campo: string): string => {
  const valor = idOpcional(a, campo)
  if (valor === null) throw new ErrorDeHerramienta(`Falta "${campo}".`)
  return valor
}

const fecha = (a: Args, campo: string): string | null => {
  const valor = opcional(a, campo, 10)
  if (valor !== null && (!FECHA.test(valor) || Number.isNaN(Date.parse(valor)))) {
    throw new ErrorDeHerramienta(`"${campo}" va con formato AAAA-MM-DD.`)
  }
  return valor
}

const opcion = <T extends string>(a: Args, campo: string, opciones: readonly T[]): T | null => {
  const valor = opcional(a, campo, 40)
  if (valor === null) return null
  const mayus = valor.toUpperCase()
  if (!(opciones as readonly string[]).includes(mayus)) {
    throw new ErrorDeHerramienta(`"${campo}" tiene que ser uno de: ${opciones.join(', ')}.`)
  }
  return mayus as T
}

const opcionRequerida = <T extends string>(a: Args, campo: string, opciones: readonly T[]): T => {
  const valor = opcion(a, campo, opciones)
  if (valor === null) throw new ErrorDeHerramienta(`Falta "${campo}" (${opciones.join(', ')}).`)
  return valor
}

const clave = (a: Args, campo: string): string => {
  const valor = requerido(a, campo, 61).toLowerCase()
  if (!CLAVE.test(valor)) throw new ErrorDeHerramienta(`"${campo}" va en minúsculas y con guiones bajos, por ejemplo zona_inundable.`)
  return valor
}

const lista = (a: Args, campo: string, maximo = 100): readonly Args[] => {
  const valor = a[campo]
  if (!Array.isArray(valor) || valor.length === 0) throw new ErrorDeHerramienta(`"${campo}" tiene que ser una lista con al menos un elemento.`)
  if (valor.length > maximo) throw new ErrorDeHerramienta(`"${campo}" admite hasta ${String(maximo)} elementos por llamada.`)
  return valor.map((elemento, i) => {
    if (!esObjeto(elemento)) throw new ErrorDeHerramienta(`"${campo}[${String(i)}]" tiene que ser un objeto.`)
    return elemento
  })
}

const agente = (a: Args): string => {
  const valor = opcional(a, 'agente', 60) ?? AGENTE_RIESGOS
  if (!AGENTE.test(valor)) throw new ErrorDeHerramienta('"agente" va con nombre y versión, por ejemplo riesgos@1.')
  return valor
}

const numero = (a: Args, campo: string): number | null => {
  const valor = a[campo]
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    throw new ErrorDeHerramienta(`"${campo}" tiene que ser un número mayor o igual a cero.`)
  }
  return valor
}

/** Ante un error, cada elemento de una lista dice cuál fue. */
const enElemento = <T>(campo: string, i: number, leer: () => T): T => {
  try {
    return leer()
  } catch (error) {
    if (error instanceof ErrorDeHerramienta) throw new ErrorDeHerramienta(`${campo}[${String(i)}]: ${error.message}`)
    throw error
  }
}

// ── Ejecución ───────────────────────────────────────────────────────────────

const MOTIVOS: Readonly<Record<string, string>> = {
  location_fact_valor_segun_estado: 'Una condición DESCONOCIDO va sin valor; las demás llevan valor.',
  location_fact_confirmado_con_evidencia:
    'CONFIRMADO necesita fuente VISITA, DOCUMENTO o POLIZA y la referencia (documento y página, o fecha de visita).',
  location_fact_agente_propone: 'Lo que infiere el agente va con fuente AGENTE y estado PROPUESTO, y viceversa.',
  location_fact_ubicacion_de_la_empresa: 'La ubicación no es de esa empresa.',
  survey_ubicacion_de_la_empresa: 'La ubicación no es de esa empresa.',
  risk_conclusion_ubicacion_de_la_empresa: 'La ubicación no es de esa empresa.',
  policy_coverage_endoso_de_la_poliza: 'El endoso no es de esa póliza.',
  risk_conclusion_endoso_de_la_poliza: 'El endoso no es de esa póliza.',
  policy_coverage_reemplaza_de_la_poliza: 'La cobertura que se reemplaza no es de esa póliza.',
  policy_coverage_reemplaza_id_key: 'Esa cobertura ya fue reemplazada por otra: reemplazar la vigente.',
  policy_coverage_monto_con_moneda: 'Un monto va con su moneda (ARS, USD).',
  risk_conclusion_cobertura_cita_poliza: 'Una conclusión de nivel 3 cita la póliza (poliza_id).',
}

/** Corre la operación a nombre de la persona y traduce el rechazo de la base a algo que el agente entienda. */
const correr = async <T>(contexto: ContextoRiesgos, operacion: (tx: Ejecutor) => Promise<T>): Promise<T> => {
  try {
    return await conDatos(contexto.conexion ?? sql(), contexto.principal, operacion)
  } catch (error) {
    if (error instanceof postgres.PostgresError) {
      if (error.code === '42501') throw new ErrorDeHerramienta('No hay acceso a esa empresa o póliza, o no existe.')
      if (error.code === 'P0001') throw new ErrorDeHerramienta(error.message)
      const motivo = error.constraint_name === undefined ? undefined : MOTIVOS[error.constraint_name]
      if (motivo !== undefined) throw new ErrorDeHerramienta(motivo)
      if (error.code === '23503') throw new ErrorDeHerramienta('Algún id no existe o no es de esa empresa.')
      if (error.code === '23514' || error.code === '22P02' || error.code === '22007' || error.code === '22008') {
        throw new ErrorDeHerramienta(`La base rechazó un dato${error.constraint_name === undefined ? '' : ` (${error.constraint_name})`}.`)
      }
    }
    throw error
  }
}

// ── Lectura ─────────────────────────────────────────────────────────────────

const leerRiesgos: Herramienta<ContextoRiesgos> = {
  name: 'leer_riesgos_empresa',
  description:
    'Lee todo lo de riesgos de una empresa: las listas Riesgos, Acciones, Transferencia y Fuentes (con sus comentarios), ' +
    'las ubicaciones, las condiciones vigentes (con estado y fuente), los relevamientos con sus hallazgos y las ' +
    'conclusiones del agente con su revisión. Leerla antes de proponer cambios.',
  soloLectura: true,
  inputSchema: {
    type: 'object',
    properties: { cliente_id: { type: 'string', description: 'Id de la empresa, de buscar_clientes' } },
    required: ['cliente_id'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const vista = await riesgosDeEmpresaCon(contexto.conexion ?? sql(), contexto.principal, id(a, 'cliente_id'))
    return { ...vista, columnas_de_cada_lista: RISK_LIST_COLUMNS }
  },
}

const leerCoberturas: Herramienta<ContextoRiesgos> = {
  name: 'leer_coberturas_poliza',
  description:
    'Lee las coberturas, sublímites, condiciones y exclusiones que rigen en una póliza a una fecha (hoy si no se indica), ' +
    'con el endoso, el documento y la página o cláusula de donde sale cada valor, y si una persona del equipo lo confirmó.',
  soloLectura: true,
  inputSchema: {
    type: 'object',
    properties: {
      poliza_id: { type: 'string' },
      fecha: { type: 'string', description: 'AAAA-MM-DD' },
    },
    required: ['poliza_id'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const poliza = id(a, 'poliza_id')
    const alDia = fecha(a, 'fecha') ?? hoy()
    const coberturas = await correr(contexto, (tx) => coveragesAt(tx, poliza, alDia))
    return { fecha: alDia, coberturas }
  },
}

const ASPECTOS: readonly FindingAspect[] = ['PROTECCION', 'MANTENIMIENTO', 'PRUEBA', 'HALLAZGO']
const RESULTADOS: readonly FindingResult[] = ['CUMPLE', 'PARCIAL', 'NO_CUMPLE', 'NO_EXISTE', 'NO_VERIFICADO']
const PRIORIDADES: readonly FindingPriority[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA']
const ESTADOS: readonly FactStatus[] = ['DESCONOCIDO', 'DECLARADO', 'CONFIRMADO', 'PROPUESTO']
const FUENTES: readonly FactSource[] = ['CLIENTE', 'VISITA', 'DOCUMENTO', 'POLIZA', 'AGENTE']
const TIPOS: readonly CoverageKind[] = ['COBERTURA', 'SUBLIMITE', 'CONDICION', 'EXCLUSION']

const cifrasDeCartera: Herramienta<ContextoRiesgos> = {
  name: 'cifras_de_cartera',
  description:
    'Cifras propias de la cartera de Del Campo. Con atributo y valor: las empresas con esa condición vigente (declarada o ' +
    'confirmada) y qué ubicaciones la activan. Con tema y aspecto: cuántas empresas tienen cada resultado en su ' +
    'relevamiento más reciente de ese tema.',
  soloLectura: true,
  inputSchema: {
    type: 'object',
    properties: {
      atributo: { type: 'string', description: 'Por ejemplo zona_inundable' },
      valor: { type: 'string', description: 'Por ejemplo si' },
      tema: { type: 'string', description: 'Por ejemplo bomba_incendio' },
      aspecto: { type: 'string', enum: ASPECTOS },
    },
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    if (a.atributo !== undefined) {
      const atributo = clave(a, 'atributo')
      const valor = requerido(a, 'valor', 2000)
      return { empresas: await correr(contexto, (tx) => portfolioWithCondition(tx, { attribute: atributo, value: valor })) }
    }
    if (a.tema !== undefined) {
      const tema = clave(a, 'tema')
      const aspecto = opcionRequerida(a, 'aspecto', ASPECTOS)
      return { resultados: await correr(contexto, (tx) => tallyFindings(tx, { topic: tema, aspect: aspecto })) }
    }
    throw new ErrorDeHerramienta('Indicar atributo y valor, o tema y aspecto.')
  },
}

// ── Listas ──────────────────────────────────────────────────────────────────

const guardarItem: Herramienta<ContextoRiesgos> = {
  name: 'guardar_item_riesgo',
  description:
    'Crea o edita un ítem de las listas de una empresa (RIESGO, ACCION, TRANSFERENCIA, FUENTE). Sin item_id lo crea con ' +
    'el código indicado (R1, A01, T01, Z3). Con item_id lo edita: sólo cambia los campos que se envían (un texto vacío ' +
    'borra el campo) y lo anterior queda en el historial. dar_de_baja true lo saca de la lista sin borrarlo. ' +
    'Las columnas de cada lista están en columnas_de_cada_lista de leer_riesgos_empresa. Guardar sólo lo que el equipo aprobó.',
  soloLectura: false,
  inputSchema: {
    type: 'object',
    properties: {
      cliente_id: { type: 'string' },
      lista: { type: 'string', enum: RISK_LISTS },
      codigo: { type: 'string', description: 'Sólo al crear' },
      item_id: { type: 'string', description: 'Sólo al editar' },
      campos: { type: 'object', additionalProperties: { type: 'string' } },
      dar_de_baja: { type: 'boolean' },
      agente: { type: 'string', description: 'Nombre y versión de las instrucciones, por defecto riesgos@1' },
    },
    required: ['cliente_id', 'lista'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const empresa = id(a, 'cliente_id')
    const listaElegida: RiskList = opcionRequerida(a, 'lista', RISK_LISTS)
    const item = idOpcional(a, 'item_id')
    const firma = agente(a)
    const crudo = a.campos === undefined ? {} : a.campos
    if (!esObjeto(crudo)) throw new ErrorDeHerramienta('"campos" tiene que ser un objeto con las columnas de la lista.')
    const columnas = new Set(RISK_LIST_COLUMNS[listaElegida].map((c) => c.key))
    const desconocidas = Object.keys(crudo).filter((k) => !columnas.has(k))
    if (desconocidas.length > 0) {
      throw new ErrorDeHerramienta(`La lista ${listaElegida} no tiene: ${desconocidas.join(', ')}. Columnas: ${[...columnas].join(', ')}.`)
    }
    const campos = cleanRiskItemFields(listaElegida, crudo)
    if (campos === null) throw new ErrorDeHerramienta('Algún campo es demasiado largo (hasta 4000 caracteres).')

    if (item === null) {
      const codigo = cleanRiskItemCode(requerido(a, 'codigo', 20))
      if (codigo === null) throw new ErrorDeHerramienta('El código va con una letra y números, por ejemplo R30 o A27.')
      return correr(contexto, async (tx) => {
        const r = await createRiskItem(tx, { partyId: empresa, list: listaElegida, code: codigo, fields: campos, agent: firma })
        if (r.kind !== 'ok') throw new ErrorDeHerramienta(`Ya hay un ítem ${codigo} en la lista ${listaElegida}.`)
        if (a.dar_de_baja === true) await retireRiskItem(tx, empresa, r.id, true, firma)
        return { item_id: r.id, codigo }
      })
    }

    return correr(contexto, async (tx) => {
      const actual = (await listRiskItems(tx, empresa, { list: listaElegida, includeRetired: true })).find((i) => i.id === item)
      if (actual === undefined) throw new ErrorDeHerramienta(`No hay un ítem con ese id en la lista ${listaElegida} de esa empresa.`)
      const enviados = Object.keys(crudo)
      if (enviados.length > 0) {
        const nuevos: RiskItemFields = Object.fromEntries(
          Object.entries({ ...actual.fields, ...campos }).filter(([k]) => !enviados.includes(k) || campos[k] !== undefined),
        )
        await updateRiskItem(tx, empresa, item, nuevos, firma)
      }
      if (typeof a.dar_de_baja === 'boolean' && a.dar_de_baja !== actual.retired) {
        await retireRiskItem(tx, empresa, item, a.dar_de_baja, firma)
      }
      return { item_id: item, codigo: actual.code }
    })
  },
}

const comentarItem: Herramienta<ContextoRiesgos> = {
  name: 'comentar_item_riesgo',
  description: 'Agrega un comentario a un ítem de las listas de riesgos de una empresa.',
  soloLectura: false,
  inputSchema: {
    type: 'object',
    properties: {
      cliente_id: { type: 'string' },
      item_id: { type: 'string' },
      texto: { type: 'string' },
      agente: { type: 'string' },
    },
    required: ['cliente_id', 'item_id', 'texto'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const empresa = id(a, 'cliente_id')
    const item = id(a, 'item_id')
    const texto = requerido(a, 'texto')
    const firma = agente(a)
    const r = await correr(contexto, (tx) => commentRiskItem(tx, empresa, item, texto, firma))
    if (r.kind !== 'ok') throw new ErrorDeHerramienta('No hay un ítem con ese id en esa empresa.')
    return { comentario_id: r.id }
  },
}

// ── Ubicaciones y condiciones ───────────────────────────────────────────────

const registrarUbicacion: Herramienta<ContextoRiesgos> = {
  name: 'registrar_ubicacion',
  description: 'Registra una ubicación de la empresa (planta, depósito, hotel, obra). Mirar antes las que ya tiene en leer_riesgos_empresa.',
  soloLectura: false,
  inputSchema: {
    type: 'object',
    properties: {
      cliente_id: { type: 'string' },
      nombre: { type: 'string' },
      direccion: { type: 'string' },
      localidad: { type: 'string' },
      provincia: { type: 'string' },
      agente: { type: 'string' },
    },
    required: ['cliente_id', 'nombre'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const nueva = {
      partyId: id(a, 'cliente_id'),
      name: requerido(a, 'nombre', 200),
      address: opcional(a, 'direccion', 300),
      locality: opcional(a, 'localidad', 120),
      province: opcional(a, 'provincia', 120),
      agent: agente(a),
    }
    return { ubicacion_id: await correr(contexto, (tx) => createLocation(tx, nueva)) }
  },
}

const registrarCondiciones: Herramienta<ContextoRiesgos> = {
  name: 'registrar_condiciones',
  description:
    'Registra condiciones observables de la empresa o de una ubicación (zona_inundable, obra_en_curso, subsuelo, ' +
    'carga_ve, rociadores…). No pisa la anterior: la vigente es la última. Estado: DESCONOCIDO (sin valor), DECLARADO ' +
    '(lo dijo el cliente, fuente CLIENTE), CONFIRMADO (fuente VISITA, DOCUMENTO o POLIZA, con referencia) o PROPUESTO ' +
    '(lo infiere el agente, fuente AGENTE). Sin ubicacion_id vale para toda la empresa.',
  soloLectura: false,
  inputSchema: {
    type: 'object',
    properties: {
      cliente_id: { type: 'string' },
      condiciones: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ubicacion_id: { type: 'string' },
            atributo: { type: 'string' },
            valor: { type: 'string' },
            estado: { type: 'string', enum: ESTADOS },
            fuente: { type: 'string', enum: FUENTES },
            referencia: { type: 'string', description: 'Documento y página, o fecha y quién visitó' },
            observado_el: { type: 'string', description: 'AAAA-MM-DD' },
          },
          required: ['atributo', 'estado', 'fuente'],
        },
      },
      agente: { type: 'string' },
    },
    required: ['cliente_id', 'condiciones'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const empresa = id(a, 'cliente_id')
    const firma = agente(a)
    const condiciones = lista(a, 'condiciones').map((c, i) =>
      enElemento('condiciones', i, () => ({
        partyId: empresa,
        locationId: idOpcional(c, 'ubicacion_id'),
        attribute: clave(c, 'atributo'),
        value: opcional(c, 'valor', 2000),
        status: opcionRequerida(c, 'estado', ESTADOS),
        source: opcionRequerida(c, 'fuente', FUENTES),
        sourceReference: opcional(c, 'referencia', 500),
        observedOn: fecha(c, 'observado_el'),
        agent: firma,
      })),
    )
    const ids = await correr(contexto, async (tx) => {
      const guardadas: string[] = []
      for (const c of condiciones) guardadas.push(await recordFact(tx, c))
      return guardadas
    })
    return { condicion_ids: ids }
  },
}

// ── Coberturas ──────────────────────────────────────────────────────────────

const registrarCoberturas: Herramienta<ContextoRiesgos> = {
  name: 'registrar_coberturas',
  description:
    'Registra lo que dice una póliza o un endoso: coberturas, sublímites, condiciones y exclusiones, cada uno con el ' +
    'documento y la página o cláusula de donde sale. Un endoso que cambia un valor es una fila nueva con reemplaza_id de ' +
    'la que cambia (leer_coberturas_poliza da los ids). Una exclusión sólo se registra si está escrita en la póliza. ' +
    'Queda sin confirmar hasta que una persona del equipo la confirme en la app.',
  soloLectura: false,
  inputSchema: {
    type: 'object',
    properties: {
      poliza_id: { type: 'string' },
      endoso_id: { type: 'string', description: 'Si sale de un endoso; sin él es la póliza base' },
      coberturas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: TIPOS },
            cobertura: { type: 'string', description: 'Por ejemplo Incendio, Robo, Inundación' },
            ubicacion_id: { type: 'string' },
            bien: { type: 'string' },
            monto: { type: 'number' },
            moneda: { type: 'string', description: 'ARS, USD' },
            base_del_limite: { type: 'string', description: 'Por evento, por año, a primer riesgo…' },
            franquicia: { type: 'string' },
            detalle: { type: 'string' },
            rige_desde: { type: 'string', description: 'AAAA-MM-DD' },
            reemplaza_id: { type: 'string' },
            documento: { type: 'string' },
            pagina_o_clausula: { type: 'string' },
          },
          required: ['tipo', 'cobertura', 'rige_desde', 'documento', 'pagina_o_clausula'],
        },
      },
      agente: { type: 'string' },
    },
    required: ['poliza_id', 'coberturas'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const poliza = id(a, 'poliza_id')
    const endoso = idOpcional(a, 'endoso_id')
    const firma = agente(a)
    const coberturas: NewCoverage[] = lista(a, 'coberturas', 200).map((c, i) =>
      enElemento('coberturas', i, () => {
        const desde = fecha(c, 'rige_desde')
        if (desde === null) throw new ErrorDeHerramienta('Falta "rige_desde".')
        const moneda = opcional(c, 'moneda', 3)?.toUpperCase() ?? null
        if (moneda !== null && !/^[A-Z]{3}$/.test(moneda)) throw new ErrorDeHerramienta('"moneda" va con tres letras: ARS, USD.')
        return {
          policyId: poliza,
          endorsementId: endoso,
          kind: opcionRequerida(c, 'tipo', TIPOS),
          coverage: requerido(c, 'cobertura', 200),
          locationId: idOpcional(c, 'ubicacion_id'),
          asset: opcional(c, 'bien', 200),
          limitAmount: numero(c, 'monto'),
          currency: moneda,
          limitBasis: opcional(c, 'base_del_limite', 200),
          deductible: opcional(c, 'franquicia', 300),
          detail: opcional(c, 'detalle', 2000),
          effectiveFrom: desde,
          replacesId: idOpcional(c, 'reemplaza_id'),
          sourceDocument: requerido(c, 'documento', 300),
          sourceLocation: requerido(c, 'pagina_o_clausula', 200),
          agent: firma,
        }
      }),
    )
    const ids = await correr(contexto, async (tx) => {
      const guardadas: string[] = []
      for (const c of coberturas) guardadas.push(await recordCoverage(tx, c))
      return guardadas
    })
    return { cobertura_ids: ids }
  },
}

// ── Relevamientos ───────────────────────────────────────────────────────────

const registrarRelevamiento: Herramienta<ContextoRiesgos> = {
  name: 'registrar_relevamiento',
  description:
    'Registra un relevamiento o inspección de la empresa (propio o de terceros) con sus hallazgos, uno por sector, tema ' +
    'y aspecto (PROTECCION, MANTENIMIENTO, PRUEBA, HALLAZGO). El tema va en minúsculas con guiones bajos y conviene ' +
    'repetir los mismos temas entre empresas (bomba_incendio, rociadores, tablero_electrico) para sacar cifras de cartera.',
  soloLectura: false,
  inputSchema: {
    type: 'object',
    properties: {
      cliente_id: { type: 'string' },
      ubicacion_id: { type: 'string' },
      fecha_visita: { type: 'string', description: 'AAAA-MM-DD' },
      realizado_por: { type: 'string', description: 'Quién relevó (persona o empresa)' },
      documento: { type: 'string', description: 'Informe de donde sale' },
      resumen: { type: 'string' },
      hallazgos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sector: { type: 'string' },
            tema: { type: 'string' },
            aspecto: { type: 'string', enum: ASPECTOS },
            resultado: { type: 'string', enum: RESULTADOS },
            prioridad: { type: 'string', enum: PRIORIDADES },
            descripcion: { type: 'string' },
            recomendacion: { type: 'string' },
            pagina: { type: 'string', description: 'Dónde está en el informe' },
          },
          required: ['tema', 'aspecto', 'resultado', 'descripcion'],
        },
      },
      agente: { type: 'string' },
    },
    required: ['cliente_id', 'fecha_visita', 'realizado_por', 'hallazgos'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const visita = fecha(a, 'fecha_visita')
    if (visita === null) throw new ErrorDeHerramienta('Falta "fecha_visita".')
    const hallazgos: NewFinding[] = lista(a, 'hallazgos', 300).map((h, i) =>
      enElemento('hallazgos', i, () => ({
        area: opcional(h, 'sector', 200),
        topic: clave(h, 'tema'),
        aspect: opcionRequerida(h, 'aspecto', ASPECTOS),
        result: opcionRequerida(h, 'resultado', RESULTADOS),
        priority: opcion(h, 'prioridad', PRIORIDADES),
        description: requerido(h, 'descripcion'),
        recommendation: opcional(h, 'recomendacion'),
        sourceLocation: opcional(h, 'pagina', 200),
      })),
    )
    const nuevo = {
      partyId: id(a, 'cliente_id'),
      locationId: idOpcional(a, 'ubicacion_id'),
      visitedOn: visita,
      performedBy: requerido(a, 'realizado_por', 300),
      sourceDocument: opcional(a, 'documento', 300),
      summary: opcional(a, 'resumen'),
      findings: hallazgos,
      agent: agente(a),
    }
    return { relevamiento_id: await correr(contexto, (tx) => recordSurvey(tx, nuevo)) }
  },
}

// ── Conclusiones ────────────────────────────────────────────────────────────

const SENTIDOS = ['CUBRE', 'NO_CUBRE', 'CUBRE_CON_LIMITE'] as const
type Sentido = (typeof SENTIDOS)[number]

interface EvidenciaVista {
  readonly tipo: 'condicion' | 'cobertura' | 'hallazgo' | 'documento'
  readonly estado?: FactStatus
  readonly tipoCobertura?: CoverageKind
}

/** Lo que hace falta para cada nivel (plantilla de notas v2, §0). null si alcanza. */
export const faltaParaNivel = (nivel: ConclusionLevel, sentido: Sentido | null, evidencia: readonly EvidenciaVista[]): string | null => {
  if (nivel === 1) return null
  if (evidencia.length === 0) return 'Una conclusión respaldada de nivel 2 a 4 lleva evidencia. Si falta un documento, indicar "falta".'
  if (nivel === 2) {
    const activa = evidencia.some(
      (e) => e.tipo === 'hallazgo' || (e.tipo === 'condicion' && (e.estado === 'DECLARADO' || e.estado === 'CONFIRMADO')),
    )
    return activa
      ? null
      : 'El nivel 2 necesita la condición que activa la nota declarada por el cliente o confirmada (una condición DECLARADO o CONFIRMADO, o un hallazgo de relevamiento). Si no, queda pendiente.'
  }
  if (nivel === 3) {
    if (sentido === null) return 'El nivel 3 dice el sentido: CUBRE, NO_CUBRE o CUBRE_CON_LIMITE.'
    const coberturas = evidencia.filter((e) => e.tipo === 'cobertura')
    const documentos = evidencia.filter((e) => e.tipo === 'documento')
    if (coberturas.length + documentos.length === 0) {
      return 'El nivel 3 cita la póliza vigente o sus endosos: una cobertura registrada o el documento con página o cláusula.'
    }
    if (sentido === 'NO_CUBRE' && documentos.length === 0 && !coberturas.some((e) => e.tipoCobertura === 'EXCLUSION')) {
      return 'NO_CUBRE necesita el texto de la póliza que lo dice (una exclusión registrada o el documento con su cláusula). Que no aparezca un adicional no alcanza: queda pendiente y se piden las condiciones particulares y los endosos vigentes.'
    }
    return null
  }
  return evidencia.some((e) => e.tipo === 'documento')
    ? null
    : 'El nivel 4 cita una fuente aplicable a la jurisdicción del cliente y actual (documento con su ubicación).'
}

const evidenciaDe = (crudo: Args): NewEvidence => {
  const condicion = idOpcional(crudo, 'condicion_id')
  const cobertura = idOpcional(crudo, 'cobertura_id')
  const hallazgo = idOpcional(crudo, 'hallazgo_id')
  const documento = opcional(crudo, 'documento', 300)
  const cuantos = [condicion, cobertura, hallazgo, documento].filter((v) => v !== null).length
  if (cuantos !== 1) throw new ErrorDeHerramienta('Cada evidencia es una sola cosa: condicion_id, cobertura_id, hallazgo_id o documento.')
  if (condicion !== null) return { locationFactId: condicion }
  if (cobertura !== null) return { policyCoverageId: cobertura }
  if (hallazgo !== null) return { surveyFindingId: hallazgo }
  return { document: documento ?? '', documentLocation: requerido(crudo, 'ubicacion_en_documento', 200) }
}

/** Mira cada evidencia en la base: que sea de la empresa (o de la póliza citada) y qué es. */
const verEvidencia = async (
  tx: Ejecutor,
  empresa: string,
  poliza: string | null,
  evidencia: readonly NewEvidence[],
): Promise<readonly EvidenciaVista[]> => {
  const vistas: EvidenciaVista[] = []
  for (const e of evidencia) {
    if ('locationFactId' in e) {
      const [f] = await tx<{ status: FactStatus }[]>`select status from location_fact where id = ${e.locationFactId} and party_id = ${empresa}`
      if (f === undefined) throw new ErrorDeHerramienta('Una condición citada no existe o no es de esa empresa.')
      vistas.push({ tipo: 'condicion', estado: f.status })
    } else if ('policyCoverageId' in e) {
      const [c] = await tx<{ kind: CoverageKind; policyId: string }[]>`
        select c.kind, c.policy_id as "policyId" from policy_coverage c
        where c.id = ${e.policyCoverageId}
          and exists (select 1 from policy_version v where v.policy_id = c.policy_id and v.holder_party_id = ${empresa})
      `
      if (c === undefined) throw new ErrorDeHerramienta('Una cobertura citada no existe o no es de una póliza de esa empresa.')
      if (poliza !== null && c.policyId !== poliza) throw new ErrorDeHerramienta('Una cobertura citada es de otra póliza que la de la conclusión.')
      vistas.push({ tipo: 'cobertura', tipoCobertura: c.kind })
    } else if ('surveyFindingId' in e) {
      const [h] = await tx`
        select 1 from survey_finding h join survey s on s.id = h.survey_id where h.id = ${e.surveyFindingId} and s.party_id = ${empresa}
      `
      if (h === undefined) throw new ErrorDeHerramienta('Un hallazgo citado no existe o no es de esa empresa.')
      vistas.push({ tipo: 'hallazgo' })
    } else {
      vistas.push({ tipo: 'documento' })
    }
  }
  return vistas
}

const nivelDe = (valor: unknown): ConclusionLevel => {
  if (valor === 1 || valor === 2 || valor === 3 || valor === 4) return valor
  throw new ErrorDeHerramienta('"nivel" va de 1 a 4.')
}

const registrarConclusion: Herramienta<ContextoRiesgos> = {
  name: 'registrar_conclusion',
  description:
    'Registra una conclusión del agente sobre la empresa, con el nivel de la plantilla de notas v2: 1 orientar ' +
    '(preguntas, qué inspeccionar), 2 caracterizar el riesgo (condición declarada o confirmada), 3 concluir sobre la ' +
    'cobertura (cita la póliza vigente y sus endosos; dice CUBRE, NO_CUBRE o CUBRE_CON_LIMITE), 4 normativa o mercado ' +
    '(fuente aplicable y actual). Lleva el ID de la nota del cerebro que la respalda y la evidencia. Si falta una pieza, ' +
    'indicar en "falta" el documento específico: queda PENDIENTE. Nunca concluir NO_CUBRE sólo porque un adicional no ' +
    'aparece en el PDF. Queda para que una persona del equipo la acepte o rechace.',
  soloLectura: false,
  inputSchema: {
    type: 'object',
    properties: {
      cliente_id: { type: 'string' },
      ubicacion_id: { type: 'string' },
      nivel: { type: 'integer', minimum: 1, maximum: 4 },
      enunciado: { type: 'string', description: 'Lo que se concluye, en lenguaje para el dueño de la empresa' },
      nota_id: { type: 'string', description: 'CLI-001, INC-004, F-LEA-WEB-12…' },
      nota_version: { type: 'string', description: 'fecha_nota o versión de la nota usada' },
      poliza_id: { type: 'string', description: 'Obligatoria en nivel 3' },
      endoso_id: { type: 'string' },
      sentido: { type: 'string', enum: SENTIDOS, description: 'Sólo nivel 3' },
      falta: { type: 'string', description: 'El documento específico que falta; deja la conclusión pendiente' },
      evidencia: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            condicion_id: { type: 'string' },
            cobertura_id: { type: 'string' },
            hallazgo_id: { type: 'string' },
            documento: { type: 'string' },
            ubicacion_en_documento: { type: 'string', description: 'Página, cláusula o minuto' },
          },
        },
      },
      agente: { type: 'string' },
    },
    required: ['cliente_id', 'nivel', 'enunciado', 'nota_id'],
    additionalProperties: false,
  },
  ejecutar: async (contexto, a) => {
    const empresa = id(a, 'cliente_id')
    const nivel = nivelDe(a.nivel)
    const nota = requerido(a, 'nota_id', 40).toUpperCase()
    if (!NOTA.test(nota)) throw new ErrorDeHerramienta('"nota_id" es el ID de una nota del cerebro: INC-004, CLI-001 o F-LEA-WEB-12.')
    const poliza = idOpcional(a, 'poliza_id')
    if (nivel === 3 && poliza === null) throw new ErrorDeHerramienta('Una conclusión de nivel 3 cita la póliza (poliza_id).')
    const sentido = nivel === 3 ? opcion(a, 'sentido', SENTIDOS) : null
    const falta = opcional(a, 'falta', 500)
    const evidencia = a.evidencia === undefined ? [] : lista(a, 'evidencia', 50).map((e, i) => enElemento('evidencia', i, () => evidenciaDe(e)))
    const nueva = {
      partyId: empresa,
      locationId: idOpcional(a, 'ubicacion_id'),
      level: nivel,
      statement: requerido(a, 'enunciado'),
      noteId: nota,
      noteVersion: opcional(a, 'nota_version', 40),
      policyId: poliza,
      endorsementId: idOpcional(a, 'endoso_id'),
      missingDocument: falta,
      evidence: evidencia,
      agent: agente(a),
    }
    return correr(contexto, async (tx) => {
      const vistas = await verEvidencia(tx, empresa, poliza, evidencia)
      if (falta === null) {
        const motivo = faltaParaNivel(nivel, sentido, vistas)
        if (motivo !== null) throw new ErrorDeHerramienta(motivo)
      }
      const conclusion = await recordConclusion(tx, nueva)
      return { conclusion_id: conclusion, estado: falta === null ? 'RESPALDADA' : 'PENDIENTE' }
    })
  },
}

const hoy = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())

export const HERRAMIENTAS_RIESGOS: readonly Herramienta<ContextoRiesgos>[] = [
  leerRiesgos,
  leerCoberturas,
  cifrasDeCartera,
  guardarItem,
  comentarItem,
  registrarUbicacion,
  registrarCondiciones,
  registrarCoberturas,
  registrarRelevamiento,
  registrarConclusion,
]
