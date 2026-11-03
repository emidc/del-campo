# `@del-campo/identidad`

La capa común y mínima de identidad de D-0077, para las apps de Broker OS, Risk OS y
Communication OS (T-0035). Tiene cuatro piezas:

| Módulo | Qué hace |
|---|---|
| `oidc.ts` | Google OIDC con `openid-client` (D-0060): URL de autorización con PKCE, `state` y `nonce`, y canje del código. Sin `hd`: admite cuentas externas. |
| `sesion.ts`, `handshake.ts` | Cookie de sesión y cookie del handshake como JWE con `jose`, con nombre y propósito propios por app. |
| `admision.ts` | Reglas puras: si una sesión es utilizable y qué hacer con un login (entrar, vincular una invitación o rechazar). |
| `token.ts` | Token firmado entre contextos (ES256): emisión, verificación de firma, emisor, audiencia, vencimiento, `kid` y reutilización, y JWKS con varias claves para rotar. |

**Lo que no hace, a propósito (decisión del owner del 2026-11-03):** autorización de
negocio, permisos, roles, auditoría y acceso a la base. Eso es de cada contexto. El
paquete no importa nada del workspace y no conoce Postgres; lo hace cumplir `pnpm lint`
(R-25).

La admisión que decide este paquete es la de la sesión y la del vínculo. La revocación
inmediata no: la baja la resuelve cada contexto en su base en cada request (D-0022).
