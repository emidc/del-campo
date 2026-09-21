// Orden y validación de las migraciones. Funciones puras: no leen el disco ni hablan
// con la base, y por eso son las únicas piezas de T-0010 que se pueden testear sin
// Postgres. El I/O vive en `cli.ts`.

export type Migracion = {
  readonly numero: number
  readonly slug: string
  readonly archivo: string
}

const NOMBRE = /^(\d{4})_([a-z0-9]+(?:[-_][a-z0-9]+)*)\.sql$/

export class ErrorDeMigraciones extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorDeMigraciones'
  }
}

/**
 * Un nombre de archivo válido es `NNNN_slug.sql`. El número ordena; el slug es para
 * quien lee el `git log`. Cualquier otra cosa es un error y no un archivo ignorado:
 * una migración que el runner saltea en silencio es un schema que diverge en silencio.
 */
export const parsearNombre = (archivo: string): Migracion => {
  const coincidencia = NOMBRE.exec(archivo)
  if (!coincidencia) {
    throw new ErrorDeMigraciones(
      `nombre de migración inválido: "${archivo}". Se espera NNNN_slug.sql, por ejemplo 0001_party.sql.`,
    )
  }
  const digitos = coincidencia[1] ?? ''
  const slug = coincidencia[2] ?? ''
  return { numero: Number(digitos), slug, archivo }
}

/**
 * Convierte los nombres de un directorio en la lista ordenada de migraciones.
 * Rechaza duplicados de número: dos migraciones con el mismo número aplican en un
 * orden que depende del sistema de archivos, y eso deja de ser reproducible.
 */
export const archivosDeMigracion = (nombres: readonly string[]): Migracion[] => {
  const migraciones = nombres
    .filter((nombre) => nombre.endsWith('.sql'))
    .map(parsearNombre)
    .sort((a, b) => a.numero - b.numero)

  const vistos = new Map<number, string>()
  for (const migracion of migraciones) {
    const previo = vistos.get(migracion.numero)
    if (previo !== undefined) {
      throw new ErrorDeMigraciones(
        `número de migración duplicado ${String(migracion.numero)}: "${previo}" y "${migracion.archivo}".`,
      )
    }
    vistos.set(migracion.numero, migracion.archivo)
  }

  return migraciones
}

/**
 * Las que faltan aplicar, en orden. Si la base registra una migración que ya no está
 * en el repositorio, falla: significa que alguien editó la historia del schema, y
 * seguir adelante produciría una base que ningún commit describe. → R-23
 */
export const pendientes = (
  todas: readonly Migracion[],
  aplicadas: readonly string[],
): Migracion[] => {
  const conocidas = new Set(todas.map((migracion) => migracion.archivo))
  const huerfanas = aplicadas.filter((archivo) => !conocidas.has(archivo))
  if (huerfanas.length > 0) {
    throw new ErrorDeMigraciones(
      `la base registra migraciones que no están en el repositorio: ${huerfanas.join(', ')}. ` +
        'No se aplica nada: resolvé la divergencia a mano o reseteá la base local.',
    )
  }

  const yaAplicadas = new Set(aplicadas)
  return todas.filter((migracion) => !yaAplicadas.has(migracion.archivo))
}
