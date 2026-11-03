# ADR-0077 — La identidad de C1 se obtiene con OIDC propio, no con Supabase Auth

- **Id en `decisions.yaml`:** D-0077
- **Estado:** OPEN (propuesta, pendiente de la elección del owner)
- **Fecha:** 2026-11-03
- **Supersede:** — (precisa D-0072 y extiende D-0060 a los tres contextos)

## Contexto

`D-0072` pide autenticación individual con Google en Broker OS, Risk OS y Communication
OS, con cuentas de Google externas, acceso sólo por invitación y revocación inmediata.
Prioriza Supabase Auth, pero deja su adopción y su relación con `D-0060` a un ADR de
`T-0035` (R-05), porque `D-0013` pide justificar por separado cada producto de Supabase
que no sea la base.

Hechos que restringen la elección, relevados el 2026-11-03
(`/mnt/project-files/t-0035/notas-supabase-auth-2026-11-03.md`; volver a verificar
precios antes de contratar):

1. **Ya hay OIDC propio en producción.** VS01 autentica con `openid-client` y `jose`
   (`D-0060`), acotado a `packages/api/src/session/`. La admisión es una función pura
   propia y probada. Lo que cambia con `D-0072` es la audiencia del cliente de Google
   (de Internal a External) y la regla de admisión (lista de invitados en la base en
   lugar de pertenencia al Workspace).
2. **Hoy hay tres proyectos de Supabase separados** (VS01, Communication OS y Risk OS).
   Una identidad común con Supabase Auth obliga a elegir en cuál vive Auth, y las otras
   dos apps tienen que verificar sus tokens por JWKS. La autenticación de los tres
   contextos pasa a depender de un solo proyecto.
3. **Costo y disponibilidad.** En el plan Free, un proyecto se pausa tras una semana sin
   actividad. Si el proyecto que aloja Auth se pausa, nadie entra a ninguno de los tres
   contextos. El plan Pro cuesta USD 25 por mes, más USD 10 por el dominio propio, sin el
   cual la pantalla de consentimiento de Google muestra `<ref>.supabase.co`. Eso choca
   con el tope de USD 45 de `D-0076`, que ya excluye Vercel Pro más Supabase Pro.
4. **El correo incorporado no sirve para externos.** El SMTP de Supabase sólo entrega a
   direcciones del equipo del proyecto, unos 2 correos por hora. El enlace por correo de
   `D-0072` necesita SMTP propio con cualquiera de las dos opciones.
5. **La revocación inmediata no viene del proveedor.** Un token emitido vale hasta
   vencer. El spike `T-0002` mostró que la baja corta el acceso en el request siguiente
   porque la base resuelve la admisión en cada request, no por el token. Eso vale igual
   con las dos opciones.
6. **`D-0022` ya no depende de Supabase Auth.** Las políticas leen el principal de
   `authz.usuario_declarado()`, que hoy toma un GUC fijado por la app. La lectura de los
   claims de Supabase es una rama opcional de esa función.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0077.

## Decisión propuesta

Los tres contextos autentican con OIDC de Google implementado con `openid-client` y
`jose`, la misma pila de `D-0060`, sin Supabase Auth.

- **Un cliente OAuth de Google, audiencia External,** con scopes `openid email profile`
  y una URI de redirección por contexto. Con scopes básicos Google no exige verificar la
  app. Sin verificación de marca, la pantalla de consentimiento no muestra nombre ni
  logo.
- **La identidad es el `sub` de Google,** con `email_verified` obligatorio. El email se
  guarda para mostrar e invitar, no como clave, porque una cuenta puede cambiarlo.
- **Admisión en cada contexto.** Cada contexto tiene su tabla de usuarios con estado
  `INVITADO`, `ACTIVO` o `BAJA`. Un administrador invita por email. El primer login con
  ese email verificado vincula el `sub` y activa al usuario. Sin invitación no hay
  usuario, aunque Google autentique. La admisión es una función pura propia, como en
  VS01, y `authz.usuario()` la vuelve a exigir en la base en cada request.
- **Sesión** en cookie cifrada con `jose` (JWE), como hoy, con vencimiento corto y
  renovación. La sesión no autoriza nada por sí sola: el principal se resuelve en la base
  en cada request y se fija local a la transacción (condiciones 3 y 6 de `D-0022`).
- **Entre contextos** (condición 2 de `D-0022`). Broker OS firma un token de corta
  duración (ES256, 60 segundos) con el `sub` de la persona, `aud` igual al contexto
  destino y `jti` único. Publica su clave pública por JWKS. El contexto destino verifica
  firma, `aud` y vencimiento con `jose`, y después resuelve la admisión y el alcance con
  sus propias tablas. Nunca se reenvía la cookie ni el ID token de Google.
- **El enlace por correo** para personas sin cuenta de Google queda fuera de C1. Cuando
  haga falta, se decide con su propio ADR y un SMTP propio.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Supabase Auth en un proyecto central | Hechos 2 a 4: hace depender a los tres contextos de un proyecto. Para no pausarse necesita el plan Pro y dominio propio, unos USD 35 por mes sobre un tope de USD 45. Tampoco resuelve el correo ni la revocación. Su ventaja real son las pantallas y el enlace por correo ya hechos, y ninguno de los dos entra en C1. |
| Supabase Auth en cada proyecto | Tres identidades distintas para la misma persona, que es lo contrario de `D-0072`. |
| Un proveedor de identidad externo (Auth0, Clerk, WorkOS) | Servicio y costo nuevos sin necesidad concreta (`D-0076`). Además saca la admisión de la base, que es donde el spike `T-0002` mostró que la revocación es inmediata. |
| Una sesión compartida entre contextos por cookie de dominio | Exige un dominio común y une la caída de un contexto con la de los otros. El token por request entre contextos es más acotado y se puede auditar. |

## Consecuencias

**Más fácil:**

- No hay servicio ni costo nuevo, y la base sigue siendo un Postgres plano (`D-0013`).
- La pila y las pruebas de VS01 se reutilizan, y la admisión sigue siendo código propio
  probado.
- Cada contexto puede caerse o pausarse sin dejar afuera a los otros dos.

**Más difícil:**

- Communication OS y Risk OS tienen que adoptar el mismo módulo de sesión. Lo natural es
  extraer `packages/api/src/session/` a un paquete compartido.
- Las pantallas de invitación, alta y baja las escribimos nosotros.
- Las claves de firma entre contextos hay que rotarlas (procedimiento en el plan de
  migración de `T-0035`).
- El enlace por correo, cuando llegue, se construye o se contrata aparte.

**Costo de revertir (estimado):** pasar a Supabase Auth más adelante cambia el módulo de
sesión y la rama de `authz.usuario_declarado()` que lee los claims. Las políticas, las
tablas de admisión y los roles no cambian. Días, no semanas.

## Criterio de falsación

Revisar esta decisión si:

- el enlace por correo pasa a ser necesario para usuarios activos y construirlo cuesta
  más que el plan Pro dentro del tope;
- Google deja de permitir cuentas externas sin verificación con scopes básicos;
- mantener el módulo de sesión en tres contextos produce un defecto de autenticación que
  un proveedor administrado habría evitado.
