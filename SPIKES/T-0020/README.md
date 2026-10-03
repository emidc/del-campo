# Spike T-0020 — webhook de WhatsApp Cloud API

Prueba de concepto **descartable** para `TASKS/T-0020-spike-integracion-whatsapp.md`.
Vive fuera del workspace de pnpm, no importa nada de Broker OS (D-0063) y usa su propia
base, `delcampo_spike_t0020`. Se revierte con:

```bash
dropdb delcampo_spike_t0020
```

Usa Node >= 24 (TypeScript nativo) y el driver `postgres` que ya instala el repo raíz.
Los scripts se corren con `node --run`, desde esta carpeta.

## Archivos

| Archivo | Qué hace |
|---|---|
| `server.ts` | HTTP plano. `GET /webhook` (desafío) y `POST /webhook` (firma, persistencia). |
| `parse.ts` | Recorre `entry[].changes[].value`: `messages[]` de texto, `statuses[]`, ignorados. |
| `db.ts`, `schema.sql`, `setup-db.ts` | Base del spike. `connect` rechaza cualquier otra base. |
| `list.ts` | Lista `message` por `wa_timestamp, wa_message_id`, sin contenido. |
| `replay.ts` | Envía el mismo payload firmado dos veces y verifica 1 fila / 2 entregas. |
| `redact.ts` | Redacta una captura real para convertirla en fixture. |
| `fixtures/` | Payloads sintéticos con la forma documentada por Meta. |
| `spike.test.ts` | Tests con `node --test`. |

Tablas: `webhook_delivery` (cada POST, crudo, antes de responder), `message`
(UNIQUE `wa_message_id`), `message_status` (UNIQUE `wa_message_id, status`) e
`ignored_message` (tipos distintos de `text`: se registra que llegaron).

## Levantar

```bash
cd SPIKES/T-0020
cp .env.example .env        # completar a mano; nunca se versiona
node --run db:setup         # crea la base si falta y aplica schema.sql (idempotente)
node --run test             # sin DATABASE_URL, el test de idempotencia se saltea
node --run start            # escucha en http://localhost:$PORT/webhook
```

En otra terminal:

```bash
cloudflared tunnel --url http://localhost:8787   # el PORT de .env
```

## Qué cargar en Meta

En la app, **WhatsApp → Configuración → Webhook**:

- **URL de callback:** `https://<túnel>.trycloudflare.com/webhook`
- **Token de verificación:** el valor de `WHATSAPP_VERIFY_TOKEN`.
- **Suscripción:** campo `messages`.

`WHATSAPP_APP_SECRET` es el *App Secret* de **Configuración de la app → Básica**. Sin
él, el servidor acepta POST sin firma y lo advierte al arrancar (modo dev).

El túnel rápido cambia de URL en cada arranque: hay que volver a cargarla en Meta.

## Replay

Con el servidor levantado:

```bash
node --run replay
```

Usa `fixtures/inbound-text.json` con un `wamid` nuevo por corrida, lo firma con
`WHATSAPP_APP_SECRET` (si está) y lo envía dos veces. Sale con código 0 si quedan
`webhook_delivery=2` y `message=1`.

## Listar

```bash
node --run list
```

Imprime timestamp, dirección, los últimos 4 dígitos del participante, `wamid` y el largo
del cuerpo. No imprime el contenido.

## Redactar capturas

```bash
mkdir -p captures   # ignorada por Git
node --run redact -- captures/real.json fixtures/<nombre>.json
```

Conserva solo claves estructurales (`type`, `status`, `timestamp`, …) y reemplaza todo
otro string por un valor sintético consistente: el mismo teléfono o `wamid` produce
siempre el mismo reemplazo dentro de la corrida. **La revisión a mano es obligatoria**
antes de versionar el resultado.

## Limitaciones

- **El número dedicado está solo en Cloud API.** Los mensajes escritos desde la app de
  WhatsApp del teléfono no se capturan en esta prueba: con el número registrado en Cloud
  API no hay app de teléfono para ese número.
- **El "saliente" de la prueba es un mensaje enviado por la API y observado vía
  `statuses`.** Los estados no traen el cuerpo, así que la fila `outbound` de `message`
  queda con `body` nulo y con el timestamp del primer estado que llegó.
- **La app sin publicar solo recibe los webhooks de prueba del panel.** Mientras la app
  esté en modo desarrollo, Meta solo entrega los eventos de prueba que se disparan desde
  el panel, no el tráfico real.
- El servidor responde 200 después de guardar la entrega y antes de procesarla. Si el
  procesamiento falla, Meta no reintenta; el cuerpo queda en `webhook_delivery` con
  `error` para reprocesar a mano.
- Grupos, adjuntos, audio y reacciones están fuera de alcance: llegan a
  `ignored_message`.
