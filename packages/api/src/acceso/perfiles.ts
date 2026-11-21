// Perfiles del equipo (0028): la foto de un integrante y la edición de nombre y foto.
// Corren por `conDatos`; quién puede editar lo decide `authz.editar_perfil`.

import type { MemberPhoto } from '@del-campo/db'
import { MAX_PHOTO_BYTES, PHOTO_TYPES, getMemberPhoto, updateProfile } from '@del-campo/db'

import { sql } from '../db.ts'
import type { Principal } from '../session/admission.ts'
import { conDatos } from './datos.ts'

export type { MemberPhoto }
export { MAX_PHOTO_BYTES, PHOTO_TYPES }

export const fotoDeIntegrante = (principal: Principal, usuario: string): Promise<MemberPhoto | null> =>
  conDatos(sql(), principal, (tx) => getMemberPhoto(tx, usuario))

export const editarPerfil = (principal: Principal, usuario: string, nombre: string, foto?: MemberPhoto | null): Promise<void> =>
  conDatos(sql(), principal, (tx) => updateProfile(tx, usuario, nombre, foto))
