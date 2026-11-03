# ADR-0072 — Acceso individual con Google por invitación y roles administrados en las aplicaciones

- **Id en `decisions.yaml`:** D-0072
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-02
- **Supersede:** al entrar en servicio en cada contexto (corte C1, `T-0035`), D-0066,
  D-0069 y las cláusulas de D-0059 sobre audiencia Internal, pertenencia al Workspace y no
  uso de Supabase Auth. Hasta entonces esas decisiones siguen rigiendo sus despliegues, y
  `T-0035` actualiza sus estados cuando el reemplazo esté en producción.
- **Aprobación:** el owner, el 2026-11-02, «Decisiones de cierre Q4 — Del Campo OS», punto
  1, en el hilo de T-0034.

## Contexto

Hoy hay tres esquemas de acceso: Google corporativo con audiencia Internal en VS01
(D-0059), una credencial compartida en Communication OS (D-0066) y credenciales propias
por persona en Risk OS (D-0069). La north star necesita una sola identidad: autoría,
revisión por una persona distinta del autor (DA-8), Inicio por rol y, más adelante,
portal y MCP.

El owner quiere poder sumar colaboradores externos, como el revisor profesional de Risk
OS, sin comprar licencias de Workspace. Eso descarta la audiencia Internal de D-0059 como
única puerta.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0072.

## Cómo se aplica

- **Autenticación.** Google como proveedor principal, con cualquier cuenta de Google. Para
  quien no tenga Google, un mecanismo alternativo seguro, por ejemplo un enlace por correo.
- **Admisión.** Sólo por invitación o aprobación de un administrador. Autenticarse con
  Google no da acceso a nada: la cuenta tiene que estar invitada y tener un rol.
- **Identidad.** Se asocia por el identificador estable del proveedor, no por el email,
  como ya hace D-0059.
- **Revocación inmediata.** Cada request comprueba en el servidor que la persona siga
  admitida, como hace D-0069 con la credencial vigente. Un token emitido no alcanza: si
  sólo se validara su firma, una baja tardaría lo que dura el token.
- **Roles iniciales.** Administrador, Operador Del Campo y Revisor profesional. Los
  permisos limitan además qué empresas y evaluaciones opera cada persona.
- **Clientes.** La autenticación del portal (corte C12) tiene sus propios permisos y
  reglas, independientes de los usuarios internos.

**Supabase Auth.** El owner prioriza Supabase Auth con Google OAuth y enlace por correo.
D-0013 dice que cada producto de Supabase distinto de Postgres es una decisión separada, y
VS01 hoy usa `openid-client` y `jose` (D-0060). `T-0035` escribe el ADR que confirma la
elección (R-05), con estos puntos a verificar:

- que la base siga siendo un Postgres plano restaurable (D-0013), con los usuarios de
  Auth en el esquema `auth` y la identidad de la aplicación en tablas propias;
- que la revocación sea inmediata con la comprobación del servidor descrita arriba;
- que el plan de Supabase elegido (D-0076) cubra el volumen de usuarios y el envío de
  enlaces por correo;
- su relación con D-0022: dónde se hacen cumplir los permisos (RLS, aplicación o
  híbrido) lo decide el spike `T-0002`, no esta decisión.

## Pendiente de verificación

- El ADR de la biblioteca o servicio de autenticación (`T-0035`, R-05).
- Dónde se hace cumplir la autorización (D-0022, spike `T-0002`) y cómo se asignan
  empresas a cada persona (D-0027). Esta decisión dice que los permisos limitan por
  empresa, no cómo.
- La matriz fina de permisos por rol. La v25 trae una en `permisos.js`; se reescribe
  contra estos tres roles en `T-0035`.
- El plan de migración de usuarios y credenciales de los tres contextos, que `T-0035`
  pide antes de pasar a READY.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Google con audiencia Internal para todos (recomendación original del plan) | Obliga a dar una licencia de Workspace a cada colaborador externo. |
| Mantener credenciales propias por contexto | Tres identidades por persona; no permite autoría ni revisión entre contextos. |
| Admisión automática para todo el dominio | Lo descartó D-0059 y lo vuelve a descartar el owner: autenticarse no da permisos. |

## Consecuencias

**Más fácil:** sumar un revisor externo es invitar una cuenta y darle un rol. Una sola
identidad en los tres contextos habilita DA-8 y la auditoría de C1.

**Más difícil:** admitir cuentas externas agranda la superficie: una cuenta personal de
Google comprometida entra si está invitada. Por eso la invitación explícita, la revocación
inmediata y la auditoría no son opcionales.

## Criterio de falsación

Es ACCEPTED, así que se revisa con un ADR nuevo. Señales para hacerlo: que el ADR de
`T-0035` muestre que Supabase Auth no cumple D-0013 o la revocación inmediata, o que una
cuenta externa comprometida acceda a datos de clientes.
