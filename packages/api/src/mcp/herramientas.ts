// T-0062 — Las herramientas que Broker OS le ofrece a un agente. Pocas y con nombre de
// tarea; cada una corre con el usuario dueño del token, por el mismo camino que la app.

import type { Principal } from '../session/admission.ts'
import { party, policy, search } from '../vs01/queries.ts'
import type { Herramienta } from './servidor.ts'
import { ErrorDeHerramienta } from './servidor.ts'

export interface ContextoMcp {
  readonly usuarioId: string
  readonly principal: Principal
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const hoy = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())

const texto = (argumentos: Readonly<Record<string, unknown>>, campo: string): string | undefined => {
  const valor = argumentos[campo]
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim().slice(0, 200) : undefined
}

const id = (argumentos: Readonly<Record<string, unknown>>, campo: string): string => {
  const valor = texto(argumentos, campo)
  if (valor === undefined || !UUID.test(valor)) throw new ErrorDeHerramienta(`Falta "${campo}" o no es un id válido.`)
  return valor
}

const buscarClientes: Herramienta<ContextoMcp> = {
  name: 'buscar_clientes',
  description:
    'Busca clientes de Del Campo (empresas o personas) por nombre de empresa, apellido, nombre, CUIT, DNI o número de póliza. ' +
    'Devuelve cada cliente con su id y sus pólizas vigentes encontradas. Usar el id en leer_cliente.',
  soloLectura: true,
  inputSchema: {
    type: 'object',
    properties: {
      empresa: { type: 'string', description: 'Nombre o parte del nombre de la empresa' },
      apellido: { type: 'string' },
      nombre: { type: 'string' },
      cuit: { type: 'string' },
      dni: { type: 'string' },
      numero_poliza: { type: 'string' },
    },
    additionalProperties: false,
  },
  ejecutar: async ({ principal }, argumentos) => {
    const criterios = {
      company: texto(argumentos, 'empresa'),
      lastName: texto(argumentos, 'apellido'),
      firstName: texto(argumentos, 'nombre'),
      cuit: texto(argumentos, 'cuit'),
      dni: texto(argumentos, 'dni'),
      policyNumber: texto(argumentos, 'numero_poliza'),
    }
    const usados = Object.fromEntries(Object.entries(criterios).filter(([, valor]) => valor !== undefined))
    if (Object.keys(usados).length === 0) throw new ErrorDeHerramienta('Indicar al menos un dato para buscar.')
    const resultado = await search(principal, { ...usados, asOf: hoy() })

    const clientes = new Map<string, { id: string; tipo: string; nombre: string; cuit: string | null; dni: string | null; polizas: unknown[] }>()
    for (const candidato of resultado.candidates) {
      const titular = candidato.holder
      if (titular === null) continue
      const cliente = clientes.get(titular.partyId) ?? {
        id: titular.partyId,
        tipo: titular.kind === 'ORGANIZATION' ? 'empresa' : 'persona',
        nombre: titular.displayName,
        cuit: titular.cuit,
        dni: titular.dni,
        polizas: [],
      }
      cliente.polizas.push({
        id: candidato.policyId,
        numero: candidato.policyNumber,
        aseguradora: candidato.insurer.name,
        vigencia_hasta: candidato.currentVersion?.termEndDate ?? null,
      })
      clientes.set(titular.partyId, cliente)
    }
    return { clientes: [...clientes.values()] }
  },
}

const leerCliente: Herramienta<ContextoMcp> = {
  name: 'leer_cliente',
  description:
    'Lee la ficha de un cliente: datos básicos, pólizas a la fecha, organizaciones a las que pertenece y contactos.',
  soloLectura: true,
  inputSchema: {
    type: 'object',
    properties: { cliente_id: { type: 'string', description: 'Id devuelto por buscar_clientes' } },
    required: ['cliente_id'],
    additionalProperties: false,
  },
  ejecutar: async ({ principal }, argumentos) => {
    const fecha = hoy()
    const ficha = await party(principal, id(argumentos, 'cliente_id'), fecha, `${fecha}T12:00:00Z`)
    if (ficha === null) throw new ErrorDeHerramienta('No existe un cliente con ese id.')
    return ficha
  },
}

const leerPoliza: Herramienta<ContextoMcp> = {
  name: 'leer_poliza',
  description:
    'Lee el detalle de una póliza: aseguradora, titular, vigencia, versiones, endosos y referencias a documentos.',
  soloLectura: true,
  inputSchema: {
    type: 'object',
    properties: { poliza_id: { type: 'string', description: 'Id de la póliza, de buscar_clientes o leer_cliente' } },
    required: ['poliza_id'],
    additionalProperties: false,
  },
  ejecutar: async ({ principal }, argumentos) => {
    const vista = await policy(principal, id(argumentos, 'poliza_id'), hoy())
    if (vista === null) throw new ErrorDeHerramienta('No existe una póliza con ese id.')
    return vista.detail
  },
}

export const HERRAMIENTAS_MCP: readonly Herramienta<ContextoMcp>[] = [buscarClientes, leerCliente, leerPoliza]

export const INSTRUCCIONES_MCP =
  'Broker OS es el sistema de Del Campo Broker. Estas herramientas leen clientes y pólizas reales con el usuario ' +
  'de la persona del equipo que conectó el agente. Los datos provienen del último lote importado de Zoho y pueden ' +
  'no estar al día. No inventar datos que las herramientas no devuelvan.'
