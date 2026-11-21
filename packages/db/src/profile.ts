// Perfiles del equipo (0028): nombre visible y foto. Corren con el Ejecutor que les dan;
// desde la app, la transacción de `conDatos`. Las funciones de `authz` deciden quién ve y
// quién edita: cada persona su perfil, un Administrador el de cualquiera.

import type postgres from 'postgres'

type QueryExecutor = postgres.Sql | postgres.TransactionSql

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type PhotoType = (typeof PHOTO_TYPES)[number]
/** El tope de la base. La app achica la imagen antes de mandarla. */
export const MAX_PHOTO_BYTES = 300_000

export interface MemberPhoto {
  readonly bytes: Uint8Array
  readonly type: PhotoType
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const getMemberPhoto = async (sql: QueryExecutor, userId: string): Promise<MemberPhoto | null> => {
  if (!UUID.test(userId)) return null
  const [fila] = await sql<{ photo: Uint8Array; photo_type: PhotoType }[]>`
    select photo, photo_type from authz.foto_integrante(${userId}::uuid)
  `
  return fila === undefined ? null : { bytes: fila.photo, type: fila.photo_type }
}

/**
 * Cambia el nombre visible (vacío lo borra y se muestra el correo) y, si se pasa
 * `photo`, la foto (`null` la quita). `undefined` deja la foto como está.
 */
export const updateProfile = async (
  sql: QueryExecutor,
  userId: string,
  name: string,
  photo?: MemberPhoto | null,
): Promise<void> => {
  if (!UUID.test(userId)) throw new Error('perfil inexistente')
  if (photo !== undefined && photo !== null && photo.bytes.byteLength > MAX_PHOTO_BYTES) throw new Error('la foto es muy grande')
  const bytes = photo === undefined || photo === null ? null : Buffer.from(photo.bytes)
  await sql`
    select authz.editar_perfil(
      ${userId}::uuid, ${name.trim().slice(0, 80)}, ${photo !== undefined}, ${bytes}::bytea, ${photo?.type ?? null}::text
    )
  `
}

export interface OwnProfile {
  readonly userId: string
  readonly email: string
  /** El nombre visible guardado, o el correo si no cargó uno. */
  readonly name: string
  readonly hasDisplayName: boolean
  readonly hasPhoto: boolean
}

/** El perfil de quien está usando la app, tal como quedó guardado en Equipo. */
export const getOwnProfile = async (sql: QueryExecutor): Promise<OwnProfile | null> => {
  const [fila] = await sql<{ id: string; email: string; nombre: string; con_foto: boolean }[]>`
    select e.id, e.email, e.nombre, e.con_foto from authz.equipo_visible() e where e.id = authz.usuario()
  `
  return fila === undefined
    ? null
    : { userId: fila.id, email: fila.email, name: fila.nombre, hasDisplayName: fila.nombre !== fila.email, hasPhoto: fila.con_foto }
}
