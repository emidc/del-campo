// Lectura de cookies del header `Cookie`, sin dependencias. La credencial compartida de
// D-0066 que vivía acá se retiró en la fase 5 de T-0035: la sesión es la de Google
// (`@del-campo/identidad`).

export const readCookie = (header: string | null, name: string): string | undefined => {
  if (header === null) return undefined
  for (const part of header.split(';')) {
    const cut = part.indexOf('=')
    if (cut !== -1 && part.slice(0, cut).trim() === name) return part.slice(cut + 1).trim()
  }
  return undefined
}
