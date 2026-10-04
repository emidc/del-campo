# T-0025 — Revisión ciega (R-33)

- **Base revisada:** rama `task/T-0025-ui-de-conversaciones-co01`, sin commits propios:
  `HEAD` = `main` = `e33ae0b0e1de5f49b622409e30df89cff6e36fa0`, más los cambios sin
  commitear del árbol de trabajo (los del diff entregado).
- **Contrato:** el de `main` (`contrato-desde-main.md`). Lo comparé con
  `git show main:TASKS/T-0025-…` y es idéntico. La única diferencia de la rama es
  `status: READY → ACTIVE`.
- **Contexto leído por cuenta propia:** `ENGINEERING_RULES.md` (completo, con foco en
  R-05, R-09b, R-13, R-16 a R-28 y R-33), `DOMAIN.md` §52, `decisions.yaml` (D-0052,
  D-0058, D-0063, D-0065, D-0066), `DECISIONS/0063-…`, `DECISIONS/0066-…`,
  `SLICES/CO01.md` (§2, §4, §8), `eslint.config.js` completo,
  `contexts/communication/package.json`, `scripts/check-docs.mjs` (secciones de R-09b) y
  `REVIEWS/T-0024-blind-review.md` como modelo de formato.
- **Orden:** corrí los tres comandos de `## Verification` antes de abrir
  `ops/evidence/T-0025.md`. Después revisé el diff y probé hipótesis con sondas. Leí la
  evidencia al final y la contrasté en la sección correspondiente.
- **Reviewer:** subagente aislado, sin transcript ni justificación de quien implementó.

## Verificación ejecutada antes de leer evidencia

Corrí los tres comandos en serie, más `pnpm typecheck` y `pnpm lint` por separado, con
Postgres local levantado.

### 1. `pnpm check`

```text
$ pnpm check; echo "EXIT $?"
✓ 66 decisiones, 29 ADRs, 26 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
[… tests de scripts/tests, todos ✔; aparece "fatal: Not a valid object name
 origin/main", que es la salida esperada del test del baseRef no resoluble …]
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication
$ eslint .
$ node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 "packages/**/*.test.ts" "apps/**/src/**/*.test.ts" "contexts/**/src/**/*.test.ts"
[…]
ℹ tests 337
ℹ suites 75
ℹ pass 337
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
EXIT 0
```

### 2. `COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test pnpm test`

```text
ℹ tests 337
ℹ suites 75
ℹ pass 337
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
EXIT 0
```

Entre los suites que corrieron están `denegación sin credencial válida (R-28)`,
`sin configuración se niega todo (D-0066)`,
`estructura: toda página y todo endpoint pasan por el guard`, `ventana de servicio`,
`cliente de envío de Cloud API` y los de `ui.integration.test.ts`. Ninguno quedó en
`skip`.

### 3. `pnpm --filter "./apps/communication" build`

```text
├ ○ /_not-found
├ ƒ /api/conversations
├ ƒ /api/conversations/[id]
├ ƒ /api/conversations/[id]/reply
├ ƒ /api/login
├ ƒ /api/logout
├ ƒ /c/[id]
├ ƒ /login
└ ƒ /webhook
EXIT 0
```

Después del build, busqué en `apps/communication/.next/static` la forma del hash
(`scrypt:32768`), `COMMUNICATION_UI_SESSION_SECRET` y `WHATSAPP_ACCESS_TOKEN`. No hubo
coincidencias: nada de la configuración llegó al bundle del cliente.

`pnpm typecheck` → `EXIT 0`; `pnpm lint` → `EXIT 0`.

## Sondas propias

Todos los archivos de prueba fueron temporales y los borré en el mismo comando.
Comparé `git status --porcelain` con una foto tomada antes: «árbol igual».

**Lint (R-25, D-0063).** Fallan como corresponde:

- desde `apps/communication`: `@del-campo/db`, `postgres`,
  `@del-campo/communication/src/persistence/store.ts`, `../../../web/src/lib/sesion.ts`,
  `./../../../../packages/db/src/index.ts` e
  `import('../../../../contexts/communication/src/…')`;
- desde `apps/web`: `@del-campo/communication` y `../../communication/src/lib/auth.ts`;
- desde `packages/db`: `../../../apps/communication/src/lib/auth.ts`;
- desde `contexts/communication`: `@del-campo/communication-web` y
  `../../../../apps/communication/…`.

`export { connect } from '@del-campo/communication'` desde la app pasa. Los `.js` y los
`.tsx` fuera del tsconfig fallan con el error del project service, no con la regla. La
excepción es `.mjs`: ver C3.

**Participante con solo entrantes fuera de alcance.** El probe corrió desde el
scratchpad contra `delcampo_communication_test`, con el handler y las lecturas reales.
Al terminar truncó las tablas. Ver A1.

```text
status 200
unsupported_message { n: 1 }
message { n: 0 }
conversationList {"conversations":[],"lastDeliveryAt":"2026-10-04T14:20:12.704Z"}
```

## Contraste con la evidencia, leída después

`ops/evidence/T-0025.md` coincide con lo que observé en los tres comandos: 337 tests,
build con las mismas rutas y `exit=0`. La sonda de lint de la evidencia cubre los seis
casos que pide el contrato. Las mías suman las variantes de ruta, `packages → app`,
`contexto → app` y `.mjs`. Lo que la evidencia no dice:

- **No tiene la estructura de R-09b.** Faltan `## Comandos y salida literal`,
  `## Observación externa` y `## Qué NO se verificó`. El encabezado de procedencia no
  tiene el SHA de la rama ni los `runId`, o la constancia de que no hay. `pnpm check`
  hoy pasa porque la tarea está `ACTIVE`. Al pasar a `DONE`, `check-docs` va a fallar.
  Ver A2.
- **Una comprobación humana de `## Verification` quedó a medias, y lo declara:**
  «Pendiente de ojos humanos: … no pude ver en el navegador que el entrante nuevo
  aparece sin recargar». Lo mismo pasa con la consola del navegador. La consulta del
  polling sí está probada con `curl`. Lo que no se observó es la UI. Ver A2.
- No menciona A1, ni que se modificó un test existente (N1).

## Act on

### A1 — Un participante cuyos entrantes son solo de tipos fuera de alcance no aparece en la lista

- **Dónde:** `contexts/communication/src/persistence/conversations.ts:40-53`. El CTE
  `conv` se arma solo desde `communication.message`, y `from conv join agg using (k)` es
  un inner join. Además, el id de conversación es `min(message.id)` (`:5-8`, `:62-72`),
  así que sin una fila en `message` no hay id posible.
- **Problema:** el contrato pide «una entrada por participante» y que los entrantes
  fuera de alcance se vean «como un marcador sin contenido». Un participante que solo
  mandó una imagen, un audio o un sticker queda guardado en `unsupported_message`, con
  la ventana abierta, pero no figura en la lista. Su marcador no se ve en ningún lado y
  no se le puede responder. Sondeado arriba: 1 fila en `unsupported_message`, 0 en
  `message`, lista vacía.
- **Escenario:** durante CO01, un participante arranca con una nota de voz o una foto,
  algo habitual en WhatsApp. El operador mira la UI y no ve nada, aunque el receptor
  marca la entrega como recibida. Hasta que el participante escriba texto, la
  conversación no existe para la UI. El protocolo de CO01 usa marcadores de texto, así
  que no rompe la métrica de «perdidos». Sí rompe una frase literal del Outcome.
- **Qué hacer:** armar `conv` desde la unión de `message` y `unsupported_message`, con
  un id opaco que no dependa solo de `message`. Por ejemplo, la clave del grupo
  codificada, o `min` sobre las dos tablas con prefijo de origen. Sumar el caso a
  `ui.integration.test.ts`. La alternativa es que el owner acepte la limitación por
  escrito, como ya se aceptó la de la conversación partida (`conversations.ts:7-8`), y
  que quede registrada en el README y en la evidencia. En silencio, no.

### A2 — La evidencia no puede sostener un `DONE` tal como está

- **Dónde:** `ops/evidence/T-0025.md`; `scripts/check-docs.mjs:20-21`
  (`EVIDENCE_SECTIONS`).
- **Problema:**
  1. Faltan las tres secciones obligatorias de R-09b y el encabezado de procedencia
     completo.
  2. La comprobación humana «un entrante nuevo que aparece sin recargar» del recorrido
     de `## Verification` no se observó en la UI. La evidencia lo dice con honestidad,
     pero `CLAUDE.md` prohíbe declarar terminada una tarea cuya `## Verification` no se
     ejecutó.
- **Escenario:** la tarea pasa a `DONE` con esta evidencia. Hay dos salidas: `pnpm check`
  rompe en CI, o alguien agrega las secciones después del hecho sin marcarlas como
  retrofit, que R-09b prohíbe. El polling en sí (`polling.tsx`) parece correcto por
  lectura, pero nadie lo vio funcionar.
- **Qué hacer antes del merge:**
  - completar el recorrido en el navegador: abrir `/c/1`, mandar un webhook firmado y
    ver que el mensaje aparece solo, mirando también la consola;
  - reorganizar la evidencia con las secciones de R-09b. Para «Observación externa»
    sirven los `curl` contra `next start` y el contador del Meta simulado. «Qué NO se
    verificó» tiene que incluir al menos: el contrato del envío no tiene respuesta real
    (R-27), no hay límite de intentos de login, la carga del polling es una estimación
    y A1 si no se corrige;
  - agregar el SHA de la rama y los `runId`.

## Consider

### C1 — Un intento `pending` abandonado responde `in-progress` para siempre a su misma clave

- **Dónde:** `contexts/communication/src/application/reply.ts:62-63`
  (`case 'pending': return { kind: 'in-progress' }`), frente a
  `domain/reply.ts` (`visibleAttemptState`, `STALE_PENDING_MS = 60 s`).
- **Problema:** el hilo muestra un `pending` de más de 60 s como «sin confirmar», pero
  el envío con la misma clave sigue devolviendo `409 in-progress`, «Este envío ya está
  en curso». El cliente no rota la clave ante `in-progress`, porque no está en `FINAL`
  (`Thread.tsx:54`). El operador queda en un bucle: cada clic responde «en curso»,
  mientras el hilo dice «sin confirmar». Recién al editar el texto sale una clave nueva.
  `applyRetention` lo cierra a la hora, pero todavía no hay nada que la programe.
- **Escenario:** la función de Vercel muere entre la llamada a la API y el
  `settleAccepted`. El navegador no recibe respuesta y muestra «Podés reintentar: no se
  envía dos veces». El operador reintenta con la misma clave y recibe «en curso»
  indefinidamente.
- **Sugerencia:** en `fromExisting`, devolver `unconfirmed` cuando el `pending` es más
  viejo que `STALE_PENDING_MS`, con la misma regla que ya usa el hilo. Sigue sin
  reenviar, que es lo que importa para R-20. Sumar un test con la clave repetida sobre
  un `pending` viejo; el actual solo mira el hilo.

### C2 — Cuando la API aceptó pero no se pudo persistir, se descarta el `wamid`

- **Dónde:** `reply.ts:132-137` y `migrations/0002_outbound_attempt.sql:36`
  (`check ((state = 'accepted') = (wamid is not null))`).
- **Problema:** en ese camino se sabe que el mensaje salió y se conoce su `wamid`. Igual
  se cierra como `unconfirmed`, con el mismo rótulo que un timeout («puede haber
  salido»), y el schema prohíbe guardar el `wamid` fuera de `accepted`. Se pierde el dato
  que permitiría reconciliar (R-20): los webhooks de estado de ese `wamid` llegan a
  `outbound_status` y no se pueden atar a ningún intento ni mensaje. El operador recibe
  una incertidumbre que el sistema no tenía, y puede reenviar algo que ya salió.
- **Sugerencia:** permitir `wamid` en `unconfirmed`, o un estado aparte
  (`accepted_unrecorded`), y guardarlo en `settleNotAccepted`. Dentro de esta tarea
  alcanza con cambiar el `check` de la 0002, que todavía no se aplicó en ningún entorno
  compartido. Además, mostrar en el hilo «salió, no quedó registrado» en lugar de
  «puede haber salido».

### C3 — Un `.mjs` dentro de la app cruza el límite sin que `pnpm lint` ni `pnpm typecheck` lo vean

- **Dónde:** `eslint.config.js:155-157` (`'**/*.mjs'` en `ignores` global) y
  `apps/communication/tsconfig.json` (`allowJs: true`).
- **Reproducción** (temporal, borrada):
  `apps/communication/src/lib/zzq.mjs` con
  `export * from '../../../../packages/db/src/index.ts'` y `zzq2.ts` con
  `export * from './zzq.mjs'`. ESLint dice «File ignored because of a matching ignore
  pattern», con 0 errores, y `tsc -p apps/communication` no reporta nada.
- **Problema:** el contrato dice que `pnpm lint` falla si la app importa algo de
  `packages/*`. El ignore existe por el arnés de Project OS y es anterior a esta tarea.
  También afecta a `contexts/` y a `apps/web`. La forma es rebuscada, pero R-25 existe
  justamente para el agente que no ve el límite.
- **Sugerencia:** acotar el ignore a donde viven esos `.mjs` (`scripts/**`,
  `REVIEWS/**`) o extender los bloques de R-25 a `**/*.{js,mjs}` en `apps/` y
  `contexts/`. Cuesta una línea. Si se deja para otra tarea, que quede en «Qué NO se
  verificó».

### C4 — La denegación de las páginas se prueba por texto, no por comportamiento

- **Dónde:** `apps/communication/src/lib/deny.test.ts:208`
  (`assert.match(source, /await requireSession\(\)/)`).
- **Problema:** el contrato pide tests de denegación «en cada página». Para las páginas,
  el test solo comprueba que el texto `await requireSession()` aparezca en el archivo.
  Pasaría igual si apareciera en un comentario, o si la llamada estuviera después de
  algo que renderiza datos. `requireSession` (`page-guard.ts`) no tiene test propio. La
  cobertura de comportamiento de las páginas hoy sale solo de los `curl` de la evidencia.
  Hoy las páginas no cargan datos en el servidor (los pide el cliente, detrás de
  `withSession`), así que el riesgo actual es bajo.
- **Sugerencia:** extraer la decisión de `requireSession` a una función pura
  (`config`, `cookie` → `ok | redirect`) y probarla con las mismas variantes de
  `CREDENTIALS`. Otra opción: un test que exija que `requireSession()` sea la primera
  sentencia del componente.

## Noted

- **N1 — Se modificó un test existente** (`contexts/communication/src/persistence/migrations.integration.test.ts`:
  `TABLES` y `FILES`). El cambio es el esperable por la migración 0002 y no afloja
  ninguna aserción: ahora exige revertir dos migraciones en orden inverso y reaplicar
  las dos. R-13 igual pide marcarlo en el PR y que tenga revisión humana. También cambió
  `truncateAll` en `persistence/testing.ts`, un helper.
- **N2 — Sesión sin revocación del lado del servidor y login sin límite de intentos.**
  El logout solo borra la cookie (`handlers.ts:160`). Una cookie robada vale 8 h, salvo
  que se rote la contraseña o el secreto. El README y la evidencia lo dejan para T-0026.
  Es coherente con D-0066 para una UI local.
- **N3 — Comentario desactualizado:** `apps/communication/src/lib/guard.ts:3` cita
  `guard.test.ts`, que no existe. El test es `deny.test.ts`.
- **N4 — Orden en el mismo segundo.** El saliente se guarda con `sentAt = now()`, con
  milisegundos (`reply.ts:124`). Los entrantes traen el timestamp de WhatsApp truncado
  al segundo. Si un entrante y un saliente caen en el mismo segundo, el hilo puede
  invertirlos respecto del teléfono, que es un criterio de CO01 §4. En la práctica es
  raro con dos operadores humanos. Si pasa en la prueba, el remedio sería usar el
  timestamp del estado `sent` de Meta.
- **N5 — `vercel.json`** (`{"framework": "nextjs"}`) entra en esta tarea, aunque el
  proyecto de Vercel está en Non-scope. Es inocuo y no despliega nada. Lo anoto por
  alcance.
- **N6 — Tras `unconfirmed`, el cliente rota la clave y conserva el texto**
  (`Thread.tsx:54,120`). Un segundo clic envía de nuevo. Es la decisión documentada (lo
  decide el operador) y el mensaje lo advierte. Con C2 resuelto, el caso «salió, no
  quedó registrado» dejaría de caer acá.
- **N7 — Los títulos de error de los estados que llegan por webhook** se muestran sin
  pasar por `redactErrorTitle`. Esa redacción solo se aplica a los errores de la
  respuesta de envío. Los títulos documentados por Meta para estados no traen números,
  pero no está garantizado.

## Dismissed

- **D1 — Login y logout fuera de `withSession`.** Es inevitable: el login es donde se
  obtiene la credencial. Los dos exigen el mismo origen, el login niega sin
  configuración y ninguno devuelve datos. Está probado en `deny.test.ts`.
- **D2 — Los GET de datos no chequean `Origin`.** La cookie es `SameSite=Strict` y la
  respuesta es JSON sin CORS. Un sitio ajeno no puede leerla ni mandar la cookie. Los
  POST sí exigen el mismo origen.
- **D3 — La clave de idempotencia no está atada a la conversación.** Reusar una clave en
  otra conversación con el mismo texto devuelve el resultado anterior sin enviar. Exige
  la credencial y una petición armada a mano. Nunca produce un envío doble, que es lo
  que R-20 protege.
- **D4 — Un entrante fuera de alcance abre la ventana** (`lastInboundAt` une
  `unsupported_message`). El contrato dice «el último entrante», sin distinguir el tipo,
  y Meta también abre la ventana con cualquier entrante. Tiene test.
- **D5 — `maxLength={4096}` del textarea cuenta unidades UTF-16 y el servidor cuenta
  code points.** El cliente es más restrictivo, nunca más permisivo. El servidor es el
  que valida.
- **D6 — Basic Auth con la contraseña correcta se niega.** Es lo pedido: el mecanismo
  elegido es la cookie, está documentado y está probado.
- **D7 — `.js` y `.tsx` en la app o en el contexto.** Sondeado: los dos hacen fallar
  `pnpm lint` con el error del project service. Es un mecanismo accidental, pero cierra.
  `.mjs` no cierra; está en C3.

## Límites de esta revisión

- No levanté la app (`next start`) ni repetí los `curl` de denegación ni el recorrido.
  La denegación la cubrí leyendo `guard.ts`, `page-guard.ts` y las rutas, más
  `deny.test.ts`, que corrió en verde.
- No revisé el contenido de `.env.local`, a propósito. Solo comprobé que está ignorado
  por Git y que sus valores no llegaron al bundle del cliente.
- Las afirmaciones C1 y C2 salen de leer el código y el schema. No las sondeé contra la
  base.
- No modifiqué ningún archivo del repositorio salvo este informe.
