# Communication OS — `@del-campo/communication`

Contexto de D-0063 para el laboratorio de WhatsApp de Q4 (`SLICES/CO01.md`). Recibe los
webhooks de WhatsApp Cloud API y guarda los mensajes tal como fija D-0065. Lo creó
T-0024; T-0025 le sumó las lecturas de la UI, el envío por Cloud API y los intentos de
envío.

No importa nada de Broker OS (`packages/*`, `apps/*`) ni de otro contexto, y Broker no
lo importa. Su único consumidor es su app, `apps/communication`, que importa solo la raíz
del paquete. Lo hace cumplir `pnpm lint` (R-25).

## Estructura

| Carpeta | Qué hay | Puede importar |
|---|---|---|
| `src/domain/` | Parseo del webhook, regla de estados, retención, ventana de servicio, reglas de la respuesta. Puro. | Solo `src/domain/` |
| `src/integration/` | Cliente de envío de Cloud API (D-0063 lo ubica en el contexto). | `domain`, `node:*` |
| `src/persistence/` | Conexión, runner de migraciones, escrituras y lecturas. | `domain`, `postgres`, `node:*` |
| `src/application/` | Receptor del webhook, lecturas de la UI, envío y operaciones. **Lo único que exporta el paquete.** | `domain`, `integration`, `persistence` |
| `migrations/` | SQL del esquema `communication`, con su reversa en `down/`. | — |
| `fixtures/` | Payloads de Meta: sintéticos, reales redactados de T-0020 (R-27) y `send-*.documented.json`, con la forma documentada del envío, sin captura real. | — |

## Esquema

Todo vive en el esquema de Postgres `communication`, incluido el ledger de migraciones
(`communication.schema_migrations`).

| Tabla | Qué guarda |
|---|---|
| `webhook_delivery` | Cada POST con firma válida, crudo, con su hora de recepción, el resultado del procesamiento (`pending`, `processed` o `failed` con su error) y cuántas veces se reprocesó. Las procesadas se borran a los 30 días; las `pending` y `failed` se conservan hasta que el reproceso las recupere (T-0026). |
| `message` | Textos entrantes y salientes. `wamid` único; participante por `wa_id`, BSUID o ambos. |
| `outbound_status` | El último estado de cada `wamid` saliente (`sent` < `delivered` < `read` < `failed`). No tiene FK a `message`: también registra estados de salientes que no salieron de acá. |
| `unsupported_message` | Entrantes de tipos fuera de alcance: que llegaron, de quién y cuándo, sin contenido. |
| `outbound_attempt` | Cada intento de envío desde la UI, con su clave de idempotencia guardada antes de llamar a la API (R-20): `pending`, `accepted`, `rejected` o `unconfirmed`. El texto se borra al aceptarse, porque ya está en `message`, y a los 30 días en los no aceptados. |

## Bases locales

Solo dos: `delcampo_communication_dev` y `delcampo_communication_test`, en `localhost`.
Son bases aparte de las de Broker. El runner rechaza cualquier otra.

```bash
# Crear la base de desarrollo y aplicar las migraciones
pnpm --filter @del-campo/communication db:create

# Lo mismo sobre la de tests
COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test \
  pnpm --filter @del-campo/communication db:create

# Aplicar las pendientes / revertir la última aplicada
pnpm --filter @del-campo/communication db:migrate
pnpm --filter @del-campo/communication db:down

# Descartar todo
dropdb delcampo_communication_dev
```

Sin `COMMUNICATION_DATABASE_URL`, el runner apunta a `delcampo_communication_dev`.
`db:down` revierte una sola migración; con todas revertidas, queda el esquema vacío con
su ledger.

## Tests

`pnpm test` incluye los del contexto, en tres capas (R-26):

| Capa | Archivos | Qué cubre |
|---|---|---|
| unit | `*.test.ts` | Parseo, firma, desafío, regla de estados, runner, ventana de servicio, reglas de la respuesta. |
| integración | `*.integration.test.ts` | Contra Postgres: idempotencia, orden del hilo, estados fuera de orden, retención, reproceso y migraciones; y lo de la UI: lista, hilo, envío, idempotencia del envío, ventana cerrada, retención de intentos. |
| contrato | `*.contract.test.ts` | Los payloads reales redactados de `fixtures/real-*`, y el cliente de envío contra la forma documentada de `fixtures/send-*`. |

Los de integración y de contrato corren siempre sobre `delcampo_communication_test`:
la crean si no existe, aplican las migraciones y vacían sus tablas antes de cada test.
La URL sale de `COMMUNICATION_DATABASE_URL` o, si falta, de `DATABASE_URL` con el
nombre de la base cambiado. Así, `pnpm check` local y CI los corren en esa base y nunca
en la de Broker. `scripts/guard-db-tests.mjs` valida las dos variables antes de
cualquier test.

```bash
pnpm test                                   # todo el workspace
node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 \
  "contexts/communication/src/**/*.test.ts" # solo este contexto
```

## Uso desde una app

La app de la UI es `apps/communication` (T-0025); ver su README. El receptor se monta
así:

```ts
import { connect, createWebhookHandler, deliveryStore } from '@del-campo/communication'

const sql = connect(process.env.COMMUNICATION_DATABASE_URL!)
const handle = createWebhookHandler({
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
  appSecret: process.env.WHATSAPP_APP_SECRET!,   // obligatorio: no hay modo sin firma
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!, // lo de otro número se ignora (CO01 §3)
  store: deliveryStore(sql),
})

// En un route handler: responder primero, procesar después.
const { response, process } = await handle(request)
if (process) waitUntil(process())
return response
```

Además exporta:

- `conversationList` y `conversationThread`: lo que muestra la UI, sin `wamid` ni `wa_id`
  completo.
- `sendReply` y `cloudApiSender`: responder desde el hilo con la clave de idempotencia
  persistida antes del envío (R-20).
- `applyRetention`: la retención completa para la tarea programada. Borra las entregas
  crudas procesadas y el texto de los intentos no aceptados de más de 30 días, y cierra
  como `unconfirmed` los `pending` abandonados. Las entregas vencidas sin procesar no se
  borran: se cuentan en `unprocessedKept`.
- `purgeExpiredDeliveries`: solo las entregas crudas procesadas.
- `reprocessDeliveries`: vuelve a procesar las entregas `failed` y las `pending` de más de
  15 minutos (Meta no reintenta después de un 200). Idempotente, una transacción por
  entrega con la fila bloqueada; devuelve qué reprocesó y cómo terminó cada una.
- `deliveryHealth`: última entrega recibida, último procesamiento y cuántas hay `failed`
  o atascadas. La lista y el hilo lo incluyen como `deliveries`.
- `recordOutboundMessage` y `listThread`, de T-0024.

## Datos

Los mensajes son datos personales de clientes, y el `wamid` también, porque codifica el
teléfono (D-0065, R-19). Nada de contenido, teléfonos ni `wamid` en logs. Los fixtures
son sintéticos o redactados; un fixture nuevo de un payload real pasa por
`SPIKES/T-0020/redact.ts` y por revisión a mano.
