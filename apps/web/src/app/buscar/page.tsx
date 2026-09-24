import type { PolicyCandidate, PolicyDocumentAccess, SearchOutcome } from '@del-campo/api'
import { latestBatch, search } from '@del-campo/api'
import Link from 'next/link'

import { AccesoDocumental } from '@/app/_componentes/AccesoDocumental'
import { Cabecera } from '@/app/_componentes/Cabecera'
import type { ValorDeParametro, Valores } from '@/lib/criterios'
import { CAMPOS, fechaDeHoy, leerCriterios } from '@/lib/criterios'
import { requireAdmitted } from '@/lib/sesion'

export const dynamic = 'force-dynamic'

const SIN_REFERENCIA: PolicyDocumentAccess = {
  policyId: '',
  document: null,
  clientFolder: null,
  pending: null,
}

function Formulario({ valores }: { readonly valores: Valores }) {
  return (
    <form className="buscador" method="get" action="/buscar">
      {CAMPOS.map((campo) => (
        <div className="campo" key={campo.nombre}>
          <label htmlFor={campo.nombre}>{campo.etiqueta}</label>
          <input
            id={campo.nombre}
            name={campo.nombre}
            defaultValue={valores[campo.nombre]}
            autoComplete="off"
          />
        </div>
      ))}
      <div className="acciones">
        <button type="submit">Buscar</button>
        <Link className="boton boton--secundario" href="/buscar">
          Limpiar
        </Link>
      </div>
    </form>
  )
}

function Candidato({
  candidato,
  acceso,
}: {
  readonly candidato: PolicyCandidate
  readonly acceso: PolicyDocumentAccess
}) {
  const version = candidato.currentVersion
  return (
    <article className="tarjeta">
      <h3>
        <Link href={`/poliza/${candidato.policyId}`}>
          Póliza {candidato.policyNumber} · {candidato.insurer.name}
        </Link>
      </h3>
      <p className="meta">
        Tomador: {candidato.holder?.displayName ?? 'sin tomador en la versión vigente'}
        {candidato.holder?.dni === null || candidato.holder?.dni === undefined
          ? ''
          : ` · DNI ${candidato.holder.dni}`}
        {candidato.holder?.cuit === null || candidato.holder?.cuit === undefined
          ? ''
          : ` · CUIT ${candidato.holder.cuit}`}
      </p>
      <p className="meta">
        {version === null
          ? 'Sin versión vigente a la fecha consultada'
          : `Vigencia ${version.termStartDate} → ${version.termEndDate}${
              version.status === null ? '' : ` · ${version.status}`
            }`}
      </p>
      <AccesoDocumental acceso={acceso} />
    </article>
  )
}

function Resultados({ resultado }: { readonly resultado: SearchOutcome }) {
  if (resultado.state === 'NO_RESULTS') {
    return (
      <p className="estado">
        <strong>Sin resultados.</strong> Ninguna póliza del lote coincide con esos
        criterios. No hallar resultados no significa que la póliza no exista: puede estar
        fuera del lote importado.
      </p>
    )
  }

  const { tally } = resultado
  return (
    <>
      {resultado.ambiguous ? (
        <p className="estado estado--aviso">
          <strong>{resultado.candidates.length} candidatos.</strong> La coincidencia no es
          inequívoca: elegí explícitamente cuál es la póliza antes de abrir su documento.
        </p>
      ) : null}

      <p className="conteos">
        Sobre {tally.denominator} póliza{tally.denominator === 1 ? '' : 's'} consultada
        {tally.denominator === 1 ? '' : 's'}: {tally.withDocument} con documento,{' '}
        {tally.withClientFolderOnly} sólo con carpeta del cliente, {tally.withPending} con
        pendiente documental y {tally.withoutReference} sin referencia.
      </p>

      {resultado.candidates.map((candidato) => (
        <Candidato
          key={candidato.policyId}
          candidato={candidato}
          acceso={resultado.documentAccess.get(candidato.policyId) ?? SIN_REFERENCIA}
        />
      ))}
    </>
  )
}

export default async function BuscarPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, ValorDeParametro>>
}) {
  const principal = await requireAdmitted()
  const params = await searchParams
  const asOf = fechaDeHoy()
  const { valores, criterios } = leerCriterios(params, asOf)
  const [lote, resultado] = await Promise.all([
    latestBatch(),
    criterios === null ? Promise.resolve(null) : search(principal, criterios),
  ])

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <Formulario valores={valores} />
      {resultado === null ? (
        <p className="estado">
          Cargá al menos uno de los siete criterios de búsqueda para empezar.
        </p>
      ) : (
        <Resultados resultado={resultado} />
      )}
    </main>
  )
}
