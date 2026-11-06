# Communication OS — UI de conversaciones (`apps/communication`)

App web de CO01 (`SLICES/CO01.md`), creada en T-0025. Muestra las conversaciones de
WhatsApp que recibe el contexto `@del-campo/communication`, y permite responder dentro
de la ventana de servicio. Es una app aparte de `apps/web` (D-0063), con el mismo stack
(Next.js, D-0058) y sin dependencias nuevas.

**Importa del workspace solo `@del-campo/communication`**, y solo su raíz. No importa
`packages/*`, `apps/web`, otro contexto, un archivo interno del suyo ni `postgres`. Lo
hace cumplir `pnpm lint` (R-25).

## Rutas

| Ruta | Qué es | Protección |
|---|---|---|
| `/login`, `GET /api/auth/google/start`, `GET /api/auth/google/callback`, `POST /api/logout` | Entrar con Google y salir | Logout: mismo origen (`Origin`). Sin configuración, se niegan. |
| `/` | Lista de conversaciones | Sesión de Google |
| `/c/{id}` | Hilo y respuesta | Sesión de Google |
| `GET /api/conversations` | Datos de la lista | Sesión de Google |
| `GET /api/conversations/{id}` | Datos del hilo | Sesión de Google |
| `POST /api/conversations/{id}/reply` | Envío | Sesión de Google y mismo origen |
| `GET`/`POST /webhook` | Receptor de Meta (T-0024) | Firma `X-Hub-Signature-256`, **no** la sesión |
| `GET /api/jobs/retention` | Retención de D-0065 (T-0026) | `Authorization: Bearer $CRON_SECRET`, **no** la sesión |
| `GET /api/jobs/reprocess` | Reproceso de entregas `failed` y atascadas (T-0026) | `Authorization: Bearer $CRON_SECRET`, **no** la sesión |

El `{id}` de una conversación es opaco: no codifica el teléfono ni el `wamid`.

## Sesión

Se entra con Google, sólo por invitación (ver «Acceso por persona»). La sesión es la cookie
`co01_identidad`, cifrada con `@del-campo/identidad` y una clave derivada de
`COMMUNICATION_UI_SESSION_SECRET`. Dura 8 h y lleva la identidad, no permisos.

- **Sin configuración, se niega todo:** si falta cualquiera de las variables de Google o el
  secreto, las páginas mandan a `/login`, que dice que la UI no está configurada, y los
  endpoints responden 503. No hay modo abierto.
- **La credencial compartida de D-0066 se retiró** en la fase 5 de T-0035, junto con
  `POST /api/login` y el script del hash.

## Variables de entorno

Ninguna está en el repositorio (R-16, R-18). Acá van solo los nombres; los valores
locales viven en un `.env.local` de esta carpeta, que está gitignored.

| Variable | Para qué | Obligatoria |
|---|---|---|
| `COMMUNICATION_DATABASE_URL` | Base del contexto | Sí |
| `COMMUNICATION_UI_SESSION_SECRET` | Cifra la sesión de Google, de 32 caracteres o más | Sí, o la UI se niega |
| `COMMUNICATION_BASE_URL` | Origen público de la app, por ejemplo `https://…vercel.app`. La URI de redirección es este origen más `/api/auth/google/callback` | Sí, o la UI se niega |
| `COMMUNICATION_GOOGLE_CLIENT_ID`, `COMMUNICATION_GOOGLE_CLIENT_SECRET` | Cliente OAuth External de Google (fase 1 del plan de T-0035) | Sí, o la UI se niega |
| `AUTH_MODE` | Sin valor u `oidc`. `legacy` se retiró en la fase 5 de T-0035 y, como un valor desconocido, falla | No |
| `WHATSAPP_ACCESS_TOKEN` | Token de usuario del sistema de Meta | Para enviar |
| `WHATSAPP_PHONE_NUMBER_ID` | Número desde el que se envía, y el único cuyos webhooks se persisten (CO01 §3) | Para enviar, recibir y reprocesar |
| `WHATSAPP_GRAPH_API_VERSION` | Versión de la Graph API, por ejemplo `v23.0` | Para enviar |
| `WHATSAPP_GRAPH_BASE_URL` | Solo para el Meta simulado; solo acepta `localhost` | No |
| `WHATSAPP_APP_SECRET` | Firma de los webhooks | Para recibir |
| `WHATSAPP_VERIFY_TOKEN` | Verificación de la URL del webhook | Para recibir |
| `CRON_SECRET` | Secreto de las tareas programadas, de 32 caracteres o más. Vercel lo manda solo a sus cron jobs | Para retención y reproceso |

Sin la configuración de envío, la UI muestra las conversaciones y deshabilita la
respuesta. Sin la del webhook (incluido `WHATSAPP_PHONE_NUMBER_ID`), `/webhook` responde
503 y Meta reintenta. Sin `CRON_SECRET`, las tareas responden 503.

## Acceso por persona (T-0035)

Se entra con Google, sólo con una invitación de un Administrador (D-0072), y la identidad es el `sub` de Google
(D-0077). En cada request, la base vuelve a admitir a la persona y las consultas corren
como `communication_app` con RLS (migración 0005, D-0022): una baja corta el acceso en
el request siguiente. El Administrador y el Operador Del Campo ven y responden las
conversaciones (decisión del owner del 2026-11-03); el Revisor profesional no ve
Comunicación, y a quien no puede responder la UI no le muestra el formulario. Cada envío queda a
nombre de quien lo hizo y en `audit_event`, sin texto ni teléfono.

Las invitaciones se cargan con la CLI del contexto
(`pnpm --filter @del-campo/communication acceso`, ver
`contexts/communication/src/application/acceso-cli.ts`). Invitar a personas reales en
producción lo hace o lo aprueba el owner (`docs/migration/T-0035-identidad-comun.md`).

El webhook y las tareas programadas no usan la sesión: los protegen la firma de Meta y
`CRON_SECRET`, y no actúan en nombre de una persona.

## Entregas sin procesar y tareas programadas (T-0026)

Recibir no es procesar. El receptor guarda la entrega, responde 200 y la procesa
después; si eso falla, la entrega queda `failed`, y si el proceso cae antes, queda
`pending`. Meta no reintenta después de un 200, así que:

- **La UI muestra el atraso:** junto a la última entrega recibida, el último
  procesamiento y, si hay entregas `failed` o `pending` de más de 15 minutos, un aviso
  con cuántas son y desde cuándo. Sus mensajes pueden faltar en los hilos hasta que se
  reprocesen.
- **`/api/jobs/reprocess`** las vuelve a procesar. Es idempotente: no duplica mensajes ni
  retrocede estados, y se puede correr programado y a pedido:

  ```bash
  curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/jobs/reprocess
  ```

- **`/api/jobs/retention`** borra las entregas crudas de cualquier estado al cumplir 30 días y el texto
  de los intentos no aceptados. Las vencidas sin procesar también se borran y se cuentan en
  `unprocessedDeleted`; después ya no pueden reprocesarse.

Las dos responden JSON con conteos e ids de entrega, sin contenido.

## Actualización: polling

La lista y el hilo se consultan cada 3 s mientras la pestaña está visible, y al volver a
ella. Un mensaje nuevo o un cambio de estado aparece en unos 3 s más lo que tarda la
consulta. Se eligió polling y no push porque SSE o WebSocket en Vercel chocan con la
duración de las funciones y pedirían infraestructura nueva. Cada pantalla muestra la
hora de la última entrega de webhook recibida y el atraso de procesamiento, para que no
aparente estar al día si el receptor dejó de recibir o de procesar.

## Responder y la idempotencia (R-20)

- El servidor rechaza el envío si la ventana de 24 h está cerrada, venga o no del botón.
- El navegador genera una clave (UUID) por intento. Se reusa si se reintenta el mismo
  texto y cambia con el texto o después de un resultado definitivo.
- El servidor guarda la clave en `communication.outbound_attempt` **antes** de llamar a
  la API. Si la clave ya existe, devuelve el resultado anterior sin volver a enviar.
- Si la API acepta, el saliente se persiste con su `wamid`. Si la rechaza, se muestra
  el error y no se crea el mensaje.
- Si no se sabe qué pasó (timeout, red, 5xx, o la API aceptó y no se pudo persistir), el
  intento queda **sin confirmar** y se ve en el hilo. No se reintenta solo: Cloud API no
  permite verificar si un envío salió, así que lo decide el operador.

## Correr en local

```bash
pnpm --filter @del-campo/communication db:create          # delcampo_communication_dev
node apps/communication/scripts/fake-meta.ts              # Meta simulado en 127.0.0.1:4010
pnpm --filter ./apps/communication dev                    # http://localhost:3100
```

`.env.local` de esta carpeta, con valores de prueba (nunca los reales):
`COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_dev`,
`COMMUNICATION_BASE_URL=http://localhost:3100`, un cliente OAuth de prueba y el secreto de
sesión, `WHATSAPP_GRAPH_BASE_URL=http://127.0.0.1:4010`, un
token y un `phone_number_id` inventados, y `WHATSAPP_APP_SECRET` y
`WHATSAPP_VERIFY_TOKEN` de prueba para mandar webhooks firmados.

Con el Meta simulado, un texto con `#rechazar` produce un rechazo (131030), uno con
`#colgar` queda sin confirmar, y `GET http://127.0.0.1:4010/calls` cuenta las llamadas.

## Logs

Solo ids, conteos y estados. Nada de contenido, teléfonos ni `wamid` (R-19).
