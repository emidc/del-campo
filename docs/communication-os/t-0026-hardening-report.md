# T-0026 — Endurecimiento de Communication OS antes de la prueba real de CO01

- **Workstream:** BOS · **Fecha:** 2026-10-07 · **Tarea:** T-0026 (`READY`, `riskClass: HIGH`)
- **Alcance de este trabajo:** solo código y tests locales. Nada contra Supabase, Meta ni
  Vercel de producción; ninguna credencial real. Las decisiones que no están tomadas (rol
  de base, RLS / Data API, límite de login) quedan como pasos de verificación, no como
  política inventada.
- **Aislamiento:** no se leyó ni se tocó `v0/fase-8/` ni `v0/fase-9/` ni material de Risk OS.
- **Actualización:** la revisión fría (`T-0026-COLD-REVIEW.md`) y la remediación
  (`T-0026-REMEDIATION.md`) son la capa de evidencia más reciente. Las afirmaciones de
  este informe que dejaron de ser ciertas están marcadas **[Obsoleto]** donde aparecen.

## 1. Qué había de T-0026 antes de este trabajo

Hechos verificados en el repositorio, no en la documentación:

- T-0026 existe solo como contrato (`TASKS/T-0026-despliegue-y-aceptacion-co01.md`,
  `status: READY`). **No hay código de T-0026:** ni reproceso, ni endpoint de retención,
  ni `docs/despliegue/vercel-communication.md`, ni script de aceptación.
- T-0024 y T-0025 (`DONE`) dejan: receptor con firma y entrega cruda guardada antes del
  200 (`contexts/communication/src/application/webhook.ts`), procesamiento idempotente
  por `wamid` y estados que solo avanzan (`persistence/store.ts`), envío con clave de
  idempotencia persistida antes de la llamada (`application/reply.ts`), retención como
  operación sin programar (`application/operations.ts`) y la UI con credencial
  compartida (`apps/communication`).

## 2. La propiedad que importa

`webhook entregado → guardado durable → procesado una vez o reintentable con seguridad → estado de falla visible`

Antes de este trabajo, la cadena se cortaba después del segundo eslabón:

| Propiedad | Antes | Ahora |
|---|---|---|
| **Idempotencia de transporte** (Meta repite la entrega) | Sí: cada POST firmado se guarda como fila nueva; el mensaje es único por `wamid`. | Sin cambios. |
| **Idempotencia de procesamiento** (procesar dos veces la misma entrega) | Sí: `on conflict (wamid) do nothing` y estados que solo avanzan (`outranks`). | Sin cambios; ahora probada también bajo reproceso repetido y concurrente. |
| **Reintento / reproceso** | **No existía.** Una entrega `failed` o `pending` quedaba así para siempre. Meta no reintenta después de un 200. | `reprocessDeliveries` + `GET /api/jobs/reprocess`. |
| **Retención** | Borraba toda entrega de más de 30 días, **incluidas las no procesadas** (había un test que lo afirmaba). | Borra solo las procesadas; las vencidas sin procesar se conservan y se cuentan. |
| **Observabilidad** | La UI mostraba la última entrega *recibida*: sana aunque nada se procesara. | La UI muestra además el último procesamiento y un aviso con `failed` y atascadas. |

## 3. Hipótesis

### H1 — Las entregas fallidas o atascadas nunca se reprocesan · **CONFIRMED**

**Evidencia.**
- `webhook.ts` marca `failed` si el procesamiento falla después del 200
  (`afterResponse` → `store.fail`). No había ningún código que leyera `body_raw` de una
  entrega existente: `grep` de `body_raw` solo encontraba el `insert`.
- Si el proceso cae entre el 200 y `after()` (o si `markDeliveryFailed` también falla),
  la entrega queda `pending` sin que nada la retome.
- T-0026 y `SLICES/CO01.md` §8 piden el reproceso explícitamente; T-0025 lo dejó fuera
  de alcance.

**Acción.**
- Migración `0003_delivery_reprocessing.sql` (con reversa): `reprocess_count`,
  `last_reprocessed_at` y un índice parcial sobre las no procesadas.
- `domain/reprocessing.ts`: una `pending` de más de **15 min** está atascada (una
  función de Vercel no vive tanto). El mismo umbral usa la UI.
- `application/reprocess.ts` · `reprocessDeliveries(sql, { phoneNumberId })`:
  - toma las `failed` y las `pending` atascadas, primero las nunca reprocesadas, en lotes de 100;
  - procesa cada una en su propia transacción, con `select … for update skip locked`:
    dos corridas simultáneas no toman la misma;
  - escribe el contenido en un savepoint: si una escritura falla, se deshace la entrega
    entera, queda `failed` con el error y el intento contado;
  - usa el `received_at` original, así la latencia de CO01 §4 no se distorsiona;
  - devuelve qué entregas reprocesó y cómo terminó cada una, y lo registra en el log
    (solo ids).
- `processDelivery` se separó en `applyDelivery(tx, …)`, que reusan el receptor y el
  reproceso. `markDeliveryFailed` ya no pasa a `failed` una entrega que otro procesó.
- App: `GET /api/jobs/reprocess`, detrás de `CRON_SECRET` (`apps/communication/src/lib/jobs.ts`).

**Tests** (`reprocess.integration.test.ts`):
- el procesamiento falla después del 200 → `failed` visible → el reproceso lo recupera
  con un solo mensaje;
- `process` y `fail` fallan los dos → queda `pending` → no se toca mientras puede estar
  en curso → atascada a los 15 min → se reprocesa;
- el proceso cae antes de `after()` → la UI ve recepción sana pero ningún procesamiento → se reprocesa;
- reprocesar 3 veces entregas ya aplicadas no duplica mensajes ni baja `read` a `delivered`;
- una segunda corrida no encuentra nada;
- dos corridas en paralelo sobre 8 entregas: 8 procesadas en total, 8 mensajes, cada
  una reprocesada una sola vez;
- un error de la base a mitad de la entrega (un trigger del test) no deja el mensaje
  bueno a medias; arreglada la causa, la próxima corrida recupera los dos;
- una entrega con elementos descartados sigue `failed` y no tapa a las demás con `limit: 1`;
- un cuerpo no JSON queda `failed` sin citar contenido.

**Queda manual / producción.**
- Programar el reproceso (ver checklist). En Hobby, Vercel limita los cron a uno por día:
  durante la prueba conviene correrlo también a mano después de cada incidente.
- Una entrega `failed` por algo determinista (por ejemplo, un tipo de estado que el
  parser no conoce) va a seguir `failed` en cada corrida. Es visible a propósito. Hay
  que leer su `processing_error`, que no lleva contenido. Arreglar el parser o cerrarla a
  mano es decisión del owner.

### H2 — La retención borra a los 30 días sin mirar el estado · **CONFIRMED**

**Evidencia.** `deleteDeliveriesReceivedBefore` hacía
`delete … where received_at < cutoff`, sin condición de estado, y
`retention.integration.test.ts` lo afirmaba: *"también borra las fallidas: la retención
es de 30 días para todo el crudo"*. Sin reproceso, una entrega `failed` era la única copia
de su mensaje (Cloud API no permite releer, D-0065) y se perdía sin aviso a los 30 días.

**Acción.**
- `purgeExpiredDeliveries` borra solo las `processed` vencidas.
- `applyRetention` devuelve `unprocessedKept`: cuántas vencidas no se borraron por no
  estar procesadas.
- El endpoint de retención lo registra en el log.

**Conflicto con D-0065 (no se resolvió en silencio).** D-0065 dice: *"El payload crudo
de cada webhook se conserva 30 días para reprocesar y después se borra"*. Leída
literalmente, la retención nueva conserva algunas entregas más de 30 días. La razón que
da la propia decisión es reprocesar, y borrar lo que no se recuperó contradice esa
razón, R-21 (una falla nunca queda solo como línea de log) y la pregunta de aceptación
"cero mensajes perdidos". La excepción queda acotada, porque esas entregas son visibles
en la UI (H3) y en `unprocessedKept`.
**Recomendación:** que el owner confirme la lectura y, si la acepta, la registre en
D-0065 con un "salvo las no procesadas, que se conservan hasta recuperarlas o
descartarlas con decisión del owner". Este trabajo no edita `decisions.yaml`: el
CLAUDE.md del repo pide plan mode para eso.
**[Obsoleto]** Registrarlo editando D-0065 contradice su ADR, que pide un ADR nuevo que
la reemplace (revisión fría §7). La propuesta para ese ADR está en
`T-0026-REMEDIATION.md` §10.

**Tests.**
- `retention.integration.test.ts`: una `failed` y una `pending` vencidas no se borran,
  y la procesada sí; `unprocessedKept = 2`.
- Una vencida reprocesada entra después en la retención, y su mensaje queda.
- `ui.integration.test.ts` actualizado con el campo nuevo.

**Queda manual.** La confirmación del owner sobre D-0065 descrita arriba.

### H3 — La UI muestra "última entrega recibida" sana aunque el procesamiento esté trabado · **CONFIRMED**

**Evidencia.** `lastDeliveryReceivedAt` era `select max(received_at) from webhook_delivery`,
sin mirar `processing`. Un receptor que guarda y no procesa mostraba una hora reciente,
mientras los mensajes faltaban en los hilos.

**Acción.**
- `deliveryBacklog` / `deliveryHealth` devuelven:
  - `lastDeliveryAt` (recibida);
  - `lastProcessedAt`;
  - `failed`;
  - `stalled` (`pending` de más de 15 min);
  - `oldestUnprocessedAt`.
- La lista y el hilo la devuelven como `deliveries`.
- `Freshness` muestra las dos horas y, si `failed + stalled > 0`, un aviso
  (`role="alert"`) con los conteos y la entrega más vieja.
- Una `pending` de segundos no cuenta: es el procesamiento normal en curso.

**Tests.**
- `reprocess.integration.test.ts`: recepción "sana" con `lastProcessedAt = null` y
  `stalled = 1`; una `pending` recién llegada no es atascada; los conteos vuelven a 0
  después del reproceso.
- `ui.integration.test.ts`: forma completa con y sin entregas.

**Queda manual.** Ver el aviso en el recorrido real: provocar una `failed` (punto de la
checklist) y comprobar que aparece y desaparece después del reproceso.

### H4 — Hace falta `prepare: false` con el Transaction pooler de Supabase · **CONFIRMED**

**Evidencia.**
- `contexts/communication/src/persistence/database.ts` creaba la conexión sin `prepare`;
  `postgres` usa sentencias preparadas con nombre por defecto.
- El único precedente de despliegue del repo, `docs/despliegue/vercel-vs01.md` §3, usa
  el **Transaction pooler (6543)** para la app en Vercel y dice: *"La app ya usa
  `prepare: false`, que ese modo exige"* (`packages/api/src/db.ts`).
- T-0026 pide documentar Communication OS "como `vercel-vs01.md`".

**Acción.** `connect` pasa `prepare: false`. Contra una conexión directa o de sesión
(migraciones, tests) no cambia el comportamiento. Las transacciones de `sql.begin` y los
savepoints funcionan en modo transacción.

**Tests.** `persistence/database.test.ts` comprueba que la opción está en `false`, sin
conectarse. Todas las suites de integración corren con la opción nueva.

**Queda manual.** `docs/despliegue/vercel-communication.md` (todavía no existe) tiene que
decir: Transaction pooler para `COMMUNICATION_DATABASE_URL` en Vercel y Session pooler
para migrar.

### H5 — La app usa una conexión con el dueño de la base y no un rol de mínimo privilegio · **CONFIRMED** (como estado por defecto; la política no está decidida)

**Evidencia.**
- Ninguna migración ni documento del repo crea roles o hace `grant`/`revoke` (búsqueda
  en `contexts/`, `packages/db/migrations/` y `docs/`).
- La app toma una sola URL (`COMMUNICATION_DATABASE_URL`). Siguiendo el precedente de
  VS01, esa URL es la del panel de Supabase, con el usuario `postgres`, el mismo que
  aplica las migraciones y por lo tanto es dueño de las tablas.
- Ese rol puede hacer `delete` sobre `message` y `drop table`, cosas que la app nunca
  necesita (R-23).

**Acción.** Ninguna en el código: ni D-0013, ni D-0065, ni T-0026 fijan un rol de
aplicación, y crear uno en producción es una acción del owner (R-13). Sí se validó en
local, sobre `delcampo_communication_test`, el conjunto **mínimo** de permisos con el
que funcionan todas las escrituras y lecturas de la app (incluidos el reproceso con
`for update skip locked` y el `nextval` de `unsupported_message.id`). Con esos
permisos, `delete from message`, `drop table` y leer `schema_migrations` se niegan:

```sql
-- Propuesta, NO aplicada. La corre el owner en la base de Communication OS, después de migrar.
create role communication_app login password '<generada por el owner>' noinherit;
grant usage on schema communication to communication_app;
grant select, insert, update, delete on communication.webhook_delivery to communication_app;
grant select, insert on communication.message, communication.unsupported_message to communication_app;
grant select, insert, update on communication.outbound_status, communication.outbound_attempt to communication_app;
grant usage on sequence communication.message_id_seq to communication_app;
-- Por el pooler, el usuario es `communication_app.<project-ref>`.
```

Una migración futura que agregue tablas exigiría ampliar estos permisos. Ese
acoplamiento es parte de lo que se decide.

**Tests.** Comprobación manual local con `psql`. No queda un test automático, porque el
rol es configuración de despliegue y no del esquema.

**Queda manual.** Decisión del owner: o rol dedicado (propuesta de arriba), o aceptar el
dueño durante CO01 y dejarlo escrito en `vercel-communication.md` como riesgo aceptado.

### H6 — Hay que verificar en producción la exposición por Data API y RLS · **UNRESOLVED**

**Evidencia del repositorio.**
- Todas las tablas viven en el esquema `communication`, no en `public`.
- Las migraciones no hacen `grant` a `anon` ni a `authenticated`, ni habilitan RLS.
- Lo que el repo no puede saber: qué esquemas expone el Data API del proyecto, si está
  habilitado, y qué privilegios por defecto puso Supabase sobre esquemas nuevos. Eso
  depende de la configuración del proyecto, que no está en Git.

**Acción.** Ninguna en el código. Habilitar RLS o revocar privilegios es política, y la
pregunta de autorización sigue abierta en D-0022 / T-0002.

**Verificación exacta** (la corre el owner en el SQL editor del proyecto de
Communication OS; ninguna devuelve contenido de mensajes):

```sql
-- 1. Ningún privilegio de los roles del Data API sobre el esquema o sus tablas: todo false / sin filas.
select has_schema_privilege('anon', 'communication', 'USAGE')          as anon_usage,
       has_schema_privilege('authenticated', 'communication', 'USAGE') as auth_usage;
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'communication' and grantee in ('anon', 'authenticated', 'PUBLIC');

-- 2. Privilegios por defecto que alcanzarían a tablas futuras del esquema: sin filas.
select pg_get_userbyid(d.defaclrole) as owner, d.defaclobjtype, d.defaclacl
from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'communication';

-- 3. Estado de RLS, para registrarlo en la evidencia (hoy, false en todas).
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'communication' and c.relkind = 'r' order by 1;
```

Y desde fuera (con la clave `anon` pública del proyecto, que no es un secreto del
despliegue):

```bash
# Tiene que fallar con PGRST106 (esquema no expuesto) o 401/404; nunca 200 con filas.
curl -sS "https://<project-ref>.supabase.co/rest/v1/webhook_delivery?select=id&limit=1" \
  -H "apikey: <anon key>" -H "Accept-Profile: communication"
```

En el panel: *Project Settings → Data API*. `communication` **no** debe estar en
*Exposed schemas*; si el proyecto no usa el Data API, lo más simple es deshabilitarlo.
Si cualquiera de las comprobaciones falla, la defensa local mínima (para decidir) es
`alter table … enable row level security` en las cinco tablas, sin políticas. El dueño
no queda afectado; `anon` y `authenticated` quedan sin acceso.

### H7 — Falta un límite de intentos de login · **CONFIRMED** (falta; no se implementó)

**Evidencia.** `apps/communication/src/lib/handlers.ts` (`loginResponse`) no limita
intentos, y el README de la app lo dice: *"Sin límite de intentos de login en T-0025 … Se
revisa en la tarea de despliegue"*.

**Por qué no se implementó acá.**
- **Fuerza bruta:** con una contraseña aleatoria de ≥ 20 caracteres (el script de hash
  rechaza las más cortas) y scrypt N=2¹⁵, la fuerza bruta en línea no es un riesgo
  realista.
- **Costo de cada intento:** el riesgo real es el costo, porque cada intento calcula un
  scrypt de unos 32 MiB, y eso es abuso de cómputo y de facturación de Vercel.
- **Un contador en memoria** por instancia de función no limita nada en serverless.
- **Uno durable** pide una tabla y una política (ventana, umbral, por IP o global) que
  ninguna decisión fija. Con un contador global, cualquiera podría además bloquear el
  acceso del owner durante la prueba.

**Recomendación.** Una regla de rate limit de la plataforma (Vercel Firewall) sobre
`POST /api/login`, decidida por el owner según lo que ofrezca su plan, y registrada en
`vercel-communication.md`. Si el plan no la ofrece, decidir explícitamente entre una
tabla de intentos o aceptar el riesgo durante las 72 h.

**Tests.** Ninguno nuevo: no hay comportamiento nuevo.

### H8 — Hay que restringir los eventos al número de WhatsApp esperado · **CONFIRMED**

**Evidencia.**
- `parseDelivery` aceptaba cualquier `metadata.phone_number_id`.
- La app de Meta está suscripta a la WABA, no a un número.
- CO01 §3 fija un único número (el dedicado) y deja fuera el corporativo y a los
  clientes.
- Cualquier otro número de la misma WABA (el de prueba de Meta, o el corporativo si se
  sumara) habría escrito conversaciones en la base y en la UI, y habría habilitado
  respuestas a esas personas.

**Acción.**
- `parseDelivery(payload, { phoneNumberId })` ignora los cambios de otro número y los
  cuenta en `ignored`, sin marcar la entrega `failed`.
- `createWebhookHandler` acepta `phoneNumberId` y rechaza `''`.
- La ruta `/webhook` **exige** `WHATSAPP_PHONE_NUMBER_ID`. Sin él responde 503: no hay
  modo que acepte todo.
- El reproceso aplica el mismo filtro y también exige la variable.

**Tests.**
- `payload.test.ts`: sin filtro acepta, con filtro ignora (`ignored: 2`), y lo del
  número propio pasa.
- `reprocess.integration.test.ts`: el receptor filtrado deja la entrega `processed` sin
  mensajes, el reproceso filtra igual, y un `phoneNumberId` vacío es un error.
  **[Obsoleto]** Ese `processed` sin mensajes era la pérdida silenciosa S9b de la
  revisión fría. Ahora una entrega con todo de otro número queda `ignored`, la UI la
  muestra y el reproceso la vuelve a evaluar si cambia el número (`T-0026-REMEDIATION.md` §4).

**Queda manual.**
- Confirmar en el panel de Meta que la WABA solo tiene el número dedicado, o anotar qué
  otros números tiene.
- El cuerpo crudo de una entrega de otro número igual se guarda, porque se guarda antes
  de parsear, y se borra a los 30 días con la retención normal.

## 4. Otros hallazgos de la inspección

- **Falta todo lo documental de T-0026.** `docs/despliegue/vercel-communication.md`, el
  script de aceptación y los fixtures reales de envío (R-27) siguen pendientes. Este
  trabajo no los crea: dependen de decisiones y accesos del owner.
- **Orden de los empates después de un reproceso.** El hilo ordena por `wa_timestamp` y
  desempata por `id`. Un mensaje recuperado por reproceso recibe un `id` posterior, así
  que solo cambia de lugar frente a otro mensaje **del mismo segundo**. Si pasa durante
  la prueba, se anota en el informe de aceptación (criterio "Orden").
- **Entorno de esta sesión.** El contenedor trae Node 22 y Postgres 16; el repo pide
  Node ≥ 24 y Postgres 17 (CI usa `postgres:17`). Con Node 22, cuatro tests de
  `cloud-api.contract.test.ts` quedan *cancelled* ("Promise resolution is still
  pending"), porque el timer de `AbortSignal.timeout` no mantiene vivo el proceso. Pasa
  igual en `main` sin estos cambios. No es efecto de este trabajo, pero el veredicto lo
  tiene que dar CI.

## 5. Verificación ejecutada

Sobre Postgres 16 local, en `delcampo_communication_test` y `delcampo_test`:

```bash
pnpm typecheck        # ok
pnpm lint             # ok (incluye los límites de R-25)
pnpm --filter "./apps/communication" build   # ok; aparecen /api/jobs/reprocess y /api/jobs/retention
dropdb delcampo_communication_test
# tres corridas seguidas de las suites de communication, la primera sobre base recién creada:
node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 \
  "contexts/**/src/**/*.test.ts" "apps/communication/src/**/*.test.ts"
#   → 176 tests, 172 pass, 0 fail, 4 cancelled (Node 22, ver §4), en las tres
pnpm test             # 373 tests: 369 pass, 0 fail, 4 cancelled (los mismos)
```

`migrations.integration.test.ts` cubre aplicar → revertir todo → volver a aplicar con la
0003, y la reversa de la 0003 con una entrega existente.

## 6. Checklist de la prueba real con WhatsApp Cloud API

Todo lo de esta lista lo ejecuta o aprueba el owner (R-13, R-14, R-16). Ningún agente se
conecta a la base hosteada ni ve credenciales.

**Antes del despliegue**
- [ ] CI verde en la rama con estos cambios (Node 24, Postgres 17).
- [ ] Decidido H2: lectura de D-0065 sobre entregas no procesadas, registrada.
- [ ] Decidido H5: rol dedicado (propuesta de §3) o dueño aceptado como riesgo, por escrito.
- [ ] Decidido H7: regla de rate limit en `POST /api/login`, o riesgo aceptado por escrito.
- [ ] `docs/despliegue/vercel-communication.md` escrito, con lo de esta lista.

**Base (Supabase, proyecto propio de Communication OS, D-0063)**
- [ ] Migraciones 0001–0003 aplicadas por el Session pooler (5432); reversa probada en local.
- [ ] `COMMUNICATION_DATABASE_URL` de Vercel con el **Transaction pooler (6543)** (H4).
- [ ] Las tres consultas de H6 dan sin privilegios para `anon`/`authenticated`; `curl` al
      Data API con `Accept-Profile: communication` no devuelve filas; `communication` no
      está en *Exposed schemas*. Resultado anotado en `ops/evidence/T-0026.md`.

**Vercel (proyecto propio)**
- [ ] Variables cargadas: `COMMUNICATION_DATABASE_URL`, `COMMUNICATION_UI_USER`,
      `COMMUNICATION_UI_PASSWORD_HASH`, `COMMUNICATION_UI_SESSION_SECRET`,
      `WHATSAPP_ACCESS_TOKEN` (token de usuario del sistema), `WHATSAPP_PHONE_NUMBER_ID`
      (el dedicado), `WHATSAPP_GRAPH_API_VERSION`, `WHATSAPP_APP_SECRET`,
      `WHATSAPP_VERIFY_TOKEN`, `CRON_SECRET` (≥ 32 caracteres). **Sin**
      `WHATSAPP_GRAPH_BASE_URL`.
- [ ] Cron configurados (a decidir según plan; ejemplo para `vercel.json` del proyecto):
      `{"crons":[{"path":"/api/jobs/reprocess","schedule":"0 * * * *"},{"path":"/api/jobs/retention","schedule":"30 3 * * *"}]}`.
      En Hobby solo es diaria: el reproceso se corre además a mano.
      **[Obsoleto]** `apps/communication/vercel.json` ya existe, con las dos tareas
      diarias, que corren en cualquier plan. Una frecuencia mayor es decisión del owner
      (`T-0026-REMEDIATION.md` §9).
- [ ] Contra producción: sin credencial y con credencial inválida, páginas y endpoints de
      datos y envío responden sin datos. `/webhook` sin firma → 401.
      `/api/jobs/retention` y `/api/jobs/reprocess` sin `Authorization: Bearer` o con
      otro secreto → 401, sin efectos.

**Meta**
- [ ] Número dedicado `CONNECTED`, `platform_type: CLOUD_API`; la WABA no tiene otros
      números, o están anotados (H8).
- [ ] Webhook verificado contra la URL de producción; `subscribed_apps` y el campo
      `messages` comprobados con su consulta.

**Ensayo de recuperación, antes de empezar las 72 h**
- [ ] Provocar una entrega `failed` (por ejemplo, revocar un momento el permiso de
      escritura del rol de la app, o cortar la base durante un mensaje de prueba): la UI
      muestra el aviso con "1 con error".
- [ ] `curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/jobs/reprocess`
      → `processed: 1`; el mensaje aparece en el hilo una sola vez; el aviso desaparece.
- [ ] Correr el reproceso otra vez → `deliveries: []`.
- [ ] `/api/jobs/retention` → `unprocessedKept: 0`.

**Durante las 72 h**
- [ ] Mirar el aviso de entregas sin procesar en cada revisión diaria. Cualquier `failed`
      o atascada se reprocesa y se anota en el informe; las que siguen fallando se
      investigan por `processing_error`, sin abrir `body_raw`.
- [ ] La caída provocada de ≥ 10 min (CO01 §4) se hace con respuesta 500 o deploy caído,
      **no** con la base caída después del 200. Lo primero lo cubre Meta reintentando;
      lo segundo lo cubre el reproceso, y conviene ensayarlo aparte (punto anterior).
- [ ] Intentos de envío `unconfirmed` visibles en el hilo: se cuentan como hallazgo
      (riesgo de T-0025).

**Al cerrar**
- [ ] `select processing, count(*) from communication.webhook_delivery group by 1`
      → ninguna `failed` ni `pending` sin explicar.
- [ ] Informe de aceptación con los ocho criterios de CO01 §4, en `ops/evidence/T-0026-aceptacion.md`.
