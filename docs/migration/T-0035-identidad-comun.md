# Plan de migración a la identidad común (T-0035)

**Estado:** aprobado por el owner el 2026-11-03 como base para pasar `T-0035` a READY
(§5). Es la condición de `## Data effects` de `T-0035`. La autenticación la fija D-0077 y la autorización D-0022.

Este plan no ejecuta nada. Cada paso contra producción lo hace o lo aprueba el owner
(R-13, R-14). Ningún email, nombre ni contraseña de personas reales entra en el
repositorio, en una tarea ni en un log (R-18, R-19). Las listas de invitados se cargan con
un script que lee de la entrada estándar.

## 1. Punto de partida

| Contexto | Hoy | Dónde vive | Decisión que rige |
|---|---|---|---|
| Broker OS (VS01, `apps/web`) | Google OIDC con cliente de audiencia Internal; admisión por `hd` del Workspace y lista de emails en `VS01_ADMITTED_ACCOUNTS` | `app_user` (email, `status` ACTIVE/INACTIVE, `auth_provider`) en la base de VS01; la lista, en una variable de Vercel | D-0059, D-0060 |
| Communication OS (CO01, `apps/communication`) | Un usuario y una contraseña compartidos; hash scrypt en una variable de entorno | Ninguna tabla de personas | D-0066 |
| Risk OS (RO01, `apps/risk`) | Usuario y contraseña por persona; cookie HMAC; baja como fila sin hash | `risk.persona`, `risk.usuario`, `risk.credencial` (sólo inserción) | D-0069 |

Lo que no puede perderse:

- **Risk OS:** la autoría. Cada fila escrita desde una sesión y cada `registro_acceso`
  apuntan a un `risk.persona.id`, y el orden previo del revisor depende de esa historia
  (RO01 §6). La migración vincula personas existentes; no crea personas nuevas para gente
  que ya existe.
- **Broker OS:** los `app_user` existentes y lo que referencia a ellos.
- **Communication OS:** nada por persona, porque hoy no hay personas. Lo que se pierde es
  la credencial compartida, que es justamente el objetivo.

## 2. Destino

En cada contexto, con migraciones sólo aditivas:

- **Usuario interno** con estado `INVITADO`, `ACTIVO` o `BAJA` y rol (Administrador,
  Operador Del Campo o Revisor profesional). En Risk OS es la `risk.persona` existente; en
  Broker OS, `app_user`; en Communication OS, una tabla nueva.
- **Credencial** como fila (`proveedor`, `sujeto`) ligada al usuario interno. C1 sólo usa
  `google`. Las credenciales scrypt de Risk OS quedan como otro proveedor, `password`,
  hasta el cierre (fase 5).
- **Invitación** por email, creada por un Administrador. El primer login de Google con ese
  email verificado crea la credencial y activa al usuario. Desde entonces la identidad es
  el `sub` y no el email.
- **Admisión en la base en cada request** con `authz.usuario()`, y el principal fijado
  local a la transacción (D-0022).

La capa común de sesión sale de `packages/api/src/session/` y pasa a un paquete propio que
importan las tres apps. Hoy R-25 impide que `apps/risk` y `apps/communication` importen
`packages/*`, así que la implementación tiene que ampliar esa regla para este único
paquete. Ese cambio va en el mismo PR y se señala en la revisión.

## 3. Fases

Cada fase es un PR, un despliegue y una comprobación. Una fase no empieza hasta que la
anterior está estable en producción. En cada contexto, el método de entrada se elige con
una variable de entorno, `AUTH_MODE`, que vale `legacy` u `oidc`. No hay modo mixto: con
dos métodos vivos a la vez, la baja tendría que hacerse dos veces y la revocación dejaría
de ser inmediata.

### Fase 0 — Código y pruebas, sin producción

- Paquete común de sesión: OIDC de D-0060 con audiencia External, admisión sin `hd`,
  invitación, vínculo de credencial, y token entre contextos (ES256, 60 s, `aud`, `jti`).
- Migraciones aditivas de los tres contextos, con RLS y las funciones `authz.*` del spike
  T-0002 llevadas a producción.
- Las pruebas de `## Verification` de T-0035 corren en CI contra Postgres.
- `AUTH_MODE=legacy` por defecto, así que desplegar esta fase no cambia nada para nadie.

**Vuelta atrás:** revertir el PR. Las migraciones son aditivas y quedan sin uso.

### Fase 1 — Cliente de Google External (owner)

El owner coordina y aprueba la creación; la ejecuta quien tenga permisos de
administración en el proyecto de Google Cloud. Se crean clientes OAuth **nuevos** de
audiencia External, con scopes `openid email profile`. La implementación evalúa usar un
cliente por app (Broker OS, Communication OS y Risk OS) dentro del mismo proyecto, en
lugar de uno con tres URIs de redirección; la elección queda en el PR de la fase 0. El
cliente Internal de VS01 se mantiene disponible durante toda la migración, como vuelta
atrás de Broker OS.

**Vuelta atrás:** borrar los clientes nuevos. Nadie los usa todavía.

### Fase 2 — Broker OS pasa a `oidc`

0. Las migraciones 0007 a 0010 de Broker OS están aplicadas en la base de
   producción (`pnpm db:migrate` con aprobación del owner). La 0008 es la que deja a la
   conexión de la app asumir `broker_app`: sin ella, `AUTH_MODE=oidc` rechazaría todo
   request. La 0009 acota el alcance de una empresa asignada (`D-0027`): sin ella, el
   Operador de una empresa vería las pólizas personales de sus miembros. La 0010 deja a
   `broker_app` leer la referencia documental y la fecha del lote, que VS01 consulta: sin
   ella, la búsqueda y la ficha de póliza fallarían.
1. El owner carga las invitaciones de las personas que hoy están en
   `VS01_ADMITTED_ACCOUNTS`, con su rol, mediante el script (stdin, sin archivos en el
   repo). Si una entrada de la lista ya tiene `sub` fijado, la credencial se crea
   directamente con él.
2. Se configuran las variables del cliente nuevo en Vercel y `AUTH_MODE=oidc`.
3. Comprobación: cada persona entra con su cuenta; una cuenta no invitada recibe un
   rechazo; una baja hecha por un Administrador corta el acceso en el request siguiente.

**Vuelta atrás:** `AUTH_MODE=legacy` y volver a desplegar. La lista y el cliente Internal
siguen intactos. Las filas nuevas quedan sin uso.

### Fase 3 — Communication OS pasa a `oidc` y la credencial compartida muere

1. Invitaciones para las personas que hoy comparten la credencial, con su rol.
2. `AUTH_MODE=oidc` y despliegue. Desde acá, cada acción queda a nombre de una persona.
3. Comprobación igual que en la fase 2, más que la contraseña compartida ya no entra.
4. Pasados **siete días estables**, el owner borra de Vercel la variable con el hash de
   la contraseña compartida. Con eso se cumple «la credencial compartida de CO01 deja de
   existir». Ese borrado es el único paso de la fase que no se deshace con una variable.

**Vuelta atrás:** antes del paso 4, `AUTH_MODE=legacy`. Después del paso 4, hay que
generar una contraseña nueva con `scripts/hash-password.ts`. La anterior no vuelve, que es
lo esperado: la rotación pendiente de la credencial compartida queda resuelta así.

### Fase 4 — Risk OS pasa a `oidc`

0. La migración 0006 de Risk OS está aplicada en su base de producción y `rol-app.sql`
   vuelto a correr, con aprobación del owner. Agrega las tablas de identidad, asignación y
   auditoría, `risk_persona` y RLS; `risk_app` sigue viendo lo mismo por la política
   `legado_risk_app`. Con `legacy` no cambia nada. Antes de activar `oidc`, el owner
   asigna a cada Operador y Revisor sus organizaciones, una por una.
1. Por cada `risk.persona` con usuario activo, el owner carga una invitación con el
   `persona_id`, para que el primer login de Google se vincule a esa misma persona y la
   autoría se mantenga (`pnpm --filter @del-campo/risk run acceso invitar --persona PER-…
   --email … --rol …`). Las personas dadas de baja no se invitan.
2. `AUTH_MODE=oidc` y despliegue.
3. Comprobación igual que en la fase 2. Además, una persona que entra con Google ve como
   propias las acciones que registró con contraseña, y `registro_acceso` sigue
   registrando a la misma persona.

**Vuelta atrás:** `AUTH_MODE=legacy`. Las credenciales scrypt siguen vigentes en
`risk.credencial` y nada se borra, porque el esquema es sólo de inserción.

### Fase 5 — Cierre (owner, después de 14 días estables en los tres contextos)

- Se inserta en `risk.credencial` una fila de baja para cada contraseña. El historial
  queda, porque es sólo de inserción.
- Se quitan de Vercel `VS01_ADMITTED_ACCOUNTS` y `VS01_GOOGLE_WORKSPACE_DOMAIN`, y se
  retira el cliente Internal de VS01.
- Se quita el modo `legacy` del código, y D-0059 (en las cláusulas que reemplaza D-0072),
  D-0066 y D-0069 pasan a SUPERSEDED en `decisions.yaml`.

**Vuelta atrás:** ya no es por variable. Volver a contraseñas en Risk OS exige credenciales
nuevas, y volver al cliente Internal exige volver a crearlo. Por eso esta fase espera 14
días y la aprobación explícita del owner.

## 4. Lo que hace el owner y lo que hace el agente

| Paso | Quién |
|---|---|
| Código, migraciones, pruebas, PRs (fase 0) | Agente, con revisión y merge del owner |
| Cliente OAuth External (fase 1) | Owner, o quien administre el proyecto de Google Cloud |
| Cargar invitaciones con datos reales (fases 2 a 4) | Owner, con el script |
| Variables de Vercel y despliegues a producción | Owner |
| Borrar la credencial compartida y cerrar el modo legacy (fases 3 y 5) | Owner, con aprobación explícita |

## 5. Decisiones del owner (2026-11-03)

Respondidas en el hilo de T-0035 al aprobar este plan.

1. **Roles iniciales.** El owner es el Administrador inicial y Manuel el Revisor
   profesional. El resto del equipo entra como Operador Del Campo, sujeto a la validación
   individual de permisos. La nómina definitiva y las cuentas se validan y se entregan
   fuera del repositorio antes de cargar invitaciones en producción.
2. **Alcance por empresa (D-0027).** Asignaciones explícitas por empresa. Se permite una
   carga masiva inicial de todas las empresas existentes para los Operadores que necesiten
   la cartera completa, materializada como una asignación individual por empresa y nunca
   como un privilegio universal permanente. Los clientes nuevos se asignan según las
   responsabilidades de cada Operador.
3. **Cliente OAuth External.** Lo coordina y aprueba el owner y lo ejecuta quien
   administre Google Cloud. Se evalúan clientes separados por app (fase 1).
4. **Orden.** Broker OS, Communication OS y Risk OS. Se prioriza eliminar la credencial
   compartida y Risk OS va último para proteger la identidad y la autoría históricas.

### Condiciones antes de ejecutar la fase 2

Tienen que estar probadas, con evidencia en `ops/evidence/T-0035.md`:

- la vuelta atrás de la autenticación (`AUTH_MODE` de `oidc` a `legacy` y de vuelta, en
  cada contexto);
- la revocación de sesiones: una baja corta una sesión ya abierta en el request
  siguiente;
- la propagación segura de la identidad entre contextos, incluidos los rechazos por
  firma, `aud`, vencimiento y admisión del destino;
- la rotación de las claves de firma entre contextos, sin cortar a quien está usando el
  sistema.
- que `staging_import_batch.notes` en la base de producción no contenga información
  confidencial, porque la 0010 la deja leer a `broker_app` para mostrar el lote (revisión
  del owner del #107). Si la contiene, se quita `notes` del grant antes de activar `oidc`;
- que una negativa de la base (sin credencial, de baja o sin rol) responda igual que una
  cuenta no admitida, con el motivo sólo en `audit_event` (`acceso.consultar`).

### Lo que esta aprobación no autoriza

- El borrado de la credencial compartida (fase 3, paso 4).
- El cierre de los mecanismos anteriores (fase 5).

Los dos requieren una aprobación específica del owner, después de los siete y catorce
días de observación. Nada de C1 agrega infraestructura ni supera el tope de `D-0076`.
