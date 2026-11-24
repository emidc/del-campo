// Qué hacer con lo que la persona escribió en el título editable de una tarea o gestión.

export const LARGO_MAXIMO_DE_NOMBRE = 200

export type Decision =
  | { readonly tipo: 'cerrar' }
  | { readonly tipo: 'error'; readonly mensaje: string }
  | { readonly tipo: 'guardar'; readonly nombre: string }

/** Sin cambios se cierra sin guardar; vacío o demasiado largo, se avisa y la edición sigue abierta. */
export const decidirNombre = (original: string, escrito: string): Decision => {
  const nombre = escrito.trim()
  if (nombre === '') return { tipo: 'error', mensaje: 'El nombre no puede quedar vacío.' }
  if (nombre.length > LARGO_MAXIMO_DE_NOMBRE) {
    return { tipo: 'error', mensaje: `El nombre puede tener hasta ${String(LARGO_MAXIMO_DE_NOMBRE)} caracteres.` }
  }
  if (nombre === original.trim()) return { tipo: 'cerrar' }
  return { tipo: 'guardar', nombre }
}
