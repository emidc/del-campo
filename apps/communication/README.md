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
| `/login`, `POST /api/login`, `POST /api/logout` | Entrar y salir | Mismo origen (`Origin`). Sin configuración, se niegan. |
| `/` | Lista de conversaciones | Credencial compartida |
| `/c/{id}` | Hilo y respuesta | Credencial compartida |
| `GET /api/conversations` | Datos de la lista | Credencial compartida |
| `GET /api/conversations/{id}` | Datos del hilo | Credencial compartida |
| `POST /api/conversations/{id}/reply` | Envío | Credencial compartida y mismo origen |
| `GET`/`POST /webhook` | Receptor de Meta (T-0024) | Firma `X-Hub-Signature-256`, **no** la credencial |
| `GET /api/jobs/retention` | Retención de D-0065 (T-0026) | `Authorization: Bearer $CRON_SECRET`, **no** la credencial |
| `GET /api/jobs/reprocess` | Reproceso de entregas `failed` y atascadas (T-0026) | `Authorization: Bearer $CRON_SECRET`, **no** la credencial |

El `{id}` de una conversación es opaco: no codifica el teléfono ni el `wamid`.

## Credencial compartida (D-0066)

Formulario con cookie firmada, no Basic Auth: la lista y el hilo se consultan cada 3 s,
y con Basic Auth cada consulta recalcularía el hash de la contraseña.

- **Contraseña:** aleatoria, de **20 caracteres o más** (por ejemplo,
  `openssl rand -base64 24`). La genera y la guarda el owner (R-16). El script del hash
  rechaza las más cortas.
- **Hash:** `scrypt` de `node:crypto` (N=2^15, r=8, p=1, sal de 16 bytes), con el
  formato `scrypt:N:r:p:<sal>:<hash>`. El separador no es `$` porque Next.js expande
  `$VAR` en los `.env`. Se genera con:

  ```bash
  node apps/communication/scripts/hash-password.ts     # pide la contraseña sin eco
  ```

- **Al entrar:** el usuario y el hash se comparan en tiempo constante. El scrypt se
  calcula siempre, aunque el usuario esté mal.
- **Sesión:** cookie `co01_session` = `v1.<vencimiento>.<HMAC-SHA256>`. Dura 8 h y no
  lleva datos. Se emite con `HttpOnly`, `SameSite=Strict` y, fuera de `localhost`,
  `Secure`. La firma cubre una huella del hash: rotar la contraseña cierra todas las
  sesiones.
- **Sin configuración, se niega todo:** si falta o es inválida cualquiera de las tres
  variables, las páginas mandan a `/login`, que dice que la UI no está configurada, y
  los endpoints responden 503. No hay modo abierto.
- **Sin límite de intentos de login** en T-0025, porque la UI solo corre en local. Sigue
  sin límite en la app; ver `docs/communication-os/t-0026-hardening-report.md` (H7).

## Variables de entorno

Ninguna está en el repositorio (R-16, R-18). Acá van solo los nombres; los valores
locales viven en un `.env.local` de esta carpeta, que está gitignored.

| Variable | Para qué | Obligatoria |
|---|---|---|
| `COMMUNICATION_DATABASE_URL` | Base del contexto | Sí |
| `COMMUNICATION_UI_USER` | Usuario compartido | Sí, o la UI se niega |
| `COMMUNICATION_UI_PASSWORD_HASH` | Hash de la contraseña (ver arriba) | Sí, o la UI se niega |
| `COMMUNICATION_UI_SESSION_SECRET` | Clave de la firma de la cookie, de 32 caracteres o más | Sí, o la UI se niega |
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

- **`/api/jobs/retention`** borra las entregas procesadas de más de 30 días y el texto
  de los intentos no aceptados. Las vencidas sin procesar **no** las borra: las cuenta en
  `unprocessedKept`, que tiene que ser 0.

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
`COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_dev`, las
tres variables de la credencial, `WHATSAPP_GRAPH_BASE_URL=http://127.0.0.1:4010`, un
token y un `phone_number_id` inventados, y `WHATSAPP_APP_SECRET` y
`WHATSAPP_VERIFY_TOKEN` de prueba para mandar webhooks firmados.

Con el Meta simulado, un texto con `#rechazar` produce un rechazo (131030), uno con
`#colgar` queda sin confirmar, y `GET http://127.0.0.1:4010/calls` cuenta las llamadas.

## Logs

Solo ids, conteos y estados. Nada de contenido, teléfonos ni `wamid` (R-19).
