// `@del-campo/identidad`: autenticación, identidad, sesiones y tokens entre contextos
// (D-0077). Nada de autorización de negocio, permisos ni auditoría: eso es de cada
// contexto (decisión del owner del 2026-11-03, T-0035).

export type { Identidad, Proveedor } from './identidad.ts'
export { PROVEEDORES, esProveedor, identidadUtilizable, normalizarEmail } from './identidad.ts'

export type {
  CredencialEncontrada,
  DecisionLogin,
  EstadoSesion,
  EstadoUsuario,
  InvitacionEncontrada,
  RechazoLogin,
  RechazoSesion,
  ResultadoSesion,
} from './admision.ts'
export { decidirLogin, evaluarSesion } from './admision.ts'

export type { AtributosCookie, ConfigSesion } from './sesion.ts'
export {
  DURACION_SESION_SEGUNDOS,
  MIN_LARGO_SECRETO,
  cookieBorrada,
  cookieDeSesion,
  leerSesion,
  sellarSesion,
} from './sesion.ts'

export { DURACION_HANDSHAKE_SEGUNDOS, leerHandshake, sellarHandshake } from './handshake.ts'

export type { ConfigOidc, Handshake, PedidoDeAutorizacion } from './oidc.ts'
export { EMISOR_GOOGLE, SCOPES, identidadDeClaims, identidadDelCallback, pedirAutorizacion } from './oidc.ts'

export type { Emision, Jwks, ParDeClaves, RechazoToken, RegistroJti, ResultadoToken, UsoJti, Verificacion } from './token.ts'
export {
  ALGORITMO,
  DURACION_MAXIMA_SEGUNDOS,
  DURACION_TOKEN_SEGUNDOS,
  JTI_LARGO_MAXIMO,
  TOLERANCIA_SEGUNDOS,
  clavePublica,
  emitirToken,
  generarParDeClaves,
  jwksDe,
  registroJtiEnMemoria,
  verificarToken,
} from './token.ts'

// Sólo para tests: los formatos bancarios de `bancarios.js` y su detector (T-0035).
export { datosBancariosEn, FORMATOS_BANCARIOS, TEXTO_CON_DATOS_BANCARIOS } from './pruebas/bancarios.ts'
