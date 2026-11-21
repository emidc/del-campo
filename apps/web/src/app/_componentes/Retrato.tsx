// Foto en miniatura de un integrante del equipo, o sus iniciales si no tiene foto.

export const fotoDe = (usuario: string): string => `/api/equipo/foto/${usuario}`

const iniciales = (nombre: string): string =>
  nombre
    .replace(/@.*$/, '')
    .split(/[\s._-]+/)
    .filter((p) => p !== '')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')

export function Retrato({
  usuario,
  nombre,
  conFoto,
  tamano = 28,
}: {
  readonly usuario: string
  readonly nombre: string
  readonly conFoto: boolean
  readonly tamano?: number
}) {
  const estilo = { width: tamano, height: tamano, fontSize: Math.round(tamano * 0.4) }
  return conFoto ? (
    <img className="retrato" src={fotoDe(usuario)} alt="" width={tamano} height={tamano} style={estilo} />
  ) : (
    <span className="retrato retrato--iniciales" aria-hidden="true" style={estilo}>
      {iniciales(nombre)}
    </span>
  )
}

/** El nombre de cada integrante como etiqueta; si dos comparten nombre, se agrega el correo. */
export const etiquetasDeIntegrantes = <T extends { readonly name: string; readonly email: string }>(
  integrantes: readonly T[],
): Map<T, string> => {
  const repetidos = new Set(
    integrantes.map((i) => i.name).filter((nombre, indice, todos) => todos.indexOf(nombre) !== indice),
  )
  return new Map(integrantes.map((i) => [i, repetidos.has(i.name) && i.name !== i.email ? `${i.name} (${i.email})` : i.name]))
}
