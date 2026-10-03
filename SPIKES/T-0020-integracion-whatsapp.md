# Spike T-0020 — Cómo Communication OS sincroniza mensajes 1:1 de WhatsApp

- **Tarea:** `TASKS/T-0020-spike-integracion-whatsapp.md`
- **Fecha:** 2026-10-02
- **Estado:** borrador para revisión del owner. La prueba contra el número dedicado
  quedó pendiente por decisión del owner (ver "Resultados con el número dedicado").
- **Decisiones que alimenta:** ADR nuevo de mecanismo de integración, D-0028 (OPEN),
  D-0014 (PROVISIONAL).
- **Fuentes:** todas consultadas el **2026-10-02**. La lista completa está al final.
  Las afirmaciones sobre la plataforma salen de ahí o de la prueba de concepto, no de
  memoria.

## Resumen y recomendación

**Recomendación: WhatsApp Cloud API oficial, con el número dedicado (y luego el
corporativo) registrado solo en la API.** La prueba de concepto lo demostró de punta a
punta: entrante, saliente, idempotencia ante reintentos y orden estable.

**Se descarta la sesión de dispositivo vinculado con bibliotecas no oficiales**
(Baileys, whatsapp-web.js) para cualquier número de Del Campo. Captura todo, incluido lo
escrito desde el teléfono, pero contradice las condiciones de uso de WhatsApp, expone el
número a un bloqueo que la propia FAQ de WhatsApp describe como posiblemente permanente,
y su identificador de participante (LID) no siempre se puede resolver a un teléfono. No
se probó: el riesgo sobre el número no se justifica para un spike.

**Queda una decisión de producto abierta para el owner:** ¿las personas de Del Campo van
a seguir escribiendo desde la app del teléfono?

- **Si no:** Cloud API sola alcanza. Todo saliente pasa por Communication OS, que lo
  persiste al enviarlo.
- **Si sí:** la única vía oficial es la **coexistencia** (app WhatsApp Business + Cloud
  API en el mismo número), que entrega los mensajes escritos desde el teléfono por el
  webhook `smb_message_echoes` y sincroniza hasta 6 meses de historial. Pero Meta solo
  la habilita a **Solution Partners o Tech Providers** mediante Embedded Signup. Para Del
  Campo implica convertirse en Tech Provider (con verificación del negocio y de acceso) o
  contratar un BSP. Ninguna de las dos cosas está en el alcance de T-0020 ni se aceptó en
  nombre de Del Campo.

## Mecanismos comparados

Tres variantes: A) Cloud API con el número solo en la API (lo que se probó); B) Cloud
API con coexistencia; C) sesión de dispositivo vinculado no oficial.

| Criterio | A. Cloud API sola | B. Cloud API + coexistencia | C. Dispositivo vinculado no oficial |
|---|---|---|---|
| Entrantes | Sí, webhook `messages` [1] | Sí, igual que A [4] | Sí, por el socket [9] |
| Salientes enviados por la API | Solo `statuses`, **sin cuerpo** (PoC) | Igual que A | — |
| Salientes escritos desde el teléfono | No aplica: el número no puede usarse en la app | Sí, webhook `smb_message_echoes` [4] | Sí, la sesión ve todo lo de la cuenta [9] |
| Historial previo | No. No hay endpoint de lectura de mensajes; solo lo que llega por webhook desde el alta | Hasta 6 meses, webhook `history`, en las 24 h posteriores al alta [4] | Sincronización al vincular y bajo demanda (`fetchMessageHistory`) [9]; cantidad no documentada |
| Id de mensaje | `wamid` (único; contiene el teléfono codificado, ver PoC) | `wamid` | `key.id` de la biblioteca |
| Id de participante | `wa_id` (teléfono) y, desde abril de 2026, BSUID (`user_id`) [3] | Igual que A | JID por teléfono o LID; el LID no siempre se resuelve a teléfono [10] |
| Entrega y reintento | Reintentos con frecuencia decreciente hasta 7 días; puede haber duplicados [1] | Igual que A | Ninguna garantía: si el proceso está caído, depende de lo que la biblioteca recupere al reconectar |
| Orden | No documentado; timestamps con resolución de segundos (PoC) | Igual que A | No documentado |
| Costo | No-template gratis dentro de la ventana de servicio; plantillas fuera de ella, por mensaje [2] (ver nota de costos) | Igual que A, más el costo del partner o de ser Tech Provider | Sin costo de Meta; costo operativo del proceso y de la sesión |
| Condiciones y riesgo | Uso oficial. Riesgo de calidad del número (calificación y límites) [5] | Uso oficial vía partner. Throughput fijo de 20 mps [4]; hay que abrir la app al menos cada 14 días [6] | Contra las condiciones de uso [7]; bloqueo temporal o permanente [8] |

### Nota de costos

La página oficial de precios dice, al 2026-10-02: "All non-template messages are free"
y "Utility template messages sent within an open customer service window are free" [2].
Los cambios anunciados para el 1 de octubre de 2026 en la página de actualizaciones son
de tarifas en algunos mercados, sin incluir Argentina [2b].

Hay publicaciones de terceros que afirman que desde el **1 de octubre de 2026** se
cobran los mensajes de servicio y las plantillas utility dentro de la ventana [11]. **No
lo encontré en la documentación oficial.** Antes de cerrar el ADR, el owner tiene que
confirmarlo en la facturación de WhatsApp Manager.

En la PoC, el primer saliente fue la plantilla `hello_world`, enviada desde el panel.
Llegó con `pricing.category: "marketing"` y `billable: true` (fixture
`real-status.redacted.json`): Meta la clasifica como marketing y facturable aunque sea
la plantilla de ejemplo. Los salientes de texto libre posteriores fueron respuestas
dentro de la ventana de servicio. El owner verificó que no se generó ningún cargo.

## Prueba de concepto

Código descartable en `SPIKES/T-0020/` (ver su README). Servidor HTTP local, túnel
`cloudflared`, Postgres local `delcampo_spike_t0020`. Sin dependencias nuevas ni
importaciones de Broker OS.

### Resultados con el número de prueba de Meta (2026-10-02)

Seis mensajes persistidos, listados por `wa_timestamp, wa_message_id`:

| Hora (UTC) | Dirección | Cuerpo |
|---|---|---|
| 21:21:15 | inbound | texto |
| 21:33:49 | inbound | texto |
| 21:35:04 | outbound | sin cuerpo |
| 21:35:47 | outbound | sin cuerpo |
| 21:39:20 | outbound | sin cuerpo |
| 21:42:05 | inbound | texto |

- **Entrante y saliente persistidos con dirección y timestamp:** sí.
- **Reintento sin duplicados:** `node --run replay` envió dos veces el mismo payload
  firmado. Resultado: `webhook_delivery=2`, `message=1`. Además, se reenvió el
  `body_raw` de una entrega real: sumó una fila en `webhook_delivery` y ninguna en
  `message`.
- **Orden:** el listado coincide con el orden en que se escribieron los mensajes.

### Resultados con el número dedicado

**Pendiente.** El owner decidió el 2026-10-03 postergar la prueba con el número
dedicado. La tarea pide demostrar la prueba de concepto "contra el número dedicado", así
que ese criterio de verificación **no está cumplido**. Lo que sí está demostrado es el
mismo flujo con el número de prueba de Meta, en la misma WABA, app y servidor. Para
cerrarlo, alcanza con agregar el número a la WABA, confirmar `status: CONNECTED` y
`platform_type: CLOUD_API`, y repetir entrante, saliente, `list` y `replay`.

### Hallazgos

1. **La configuración tiene tres pasos independientes, y Meta no avisa si falta uno.**
   Verificar la URL del webhook; suscribir el campo `messages` en la app
   (`POST /{app-id}/subscriptions`); suscribir la app a la WABA
   (`POST /{waba-id}/subscribed_apps`). Con la URL verificada y el botón "Probar"
   funcionando, no llegaba ningún mensaje real hasta completar los otros dos. En el panel
   actual, la tabla de campos no apareció; se resolvió por API.
2. **La app tiene que estar publicada.** Sin publicar, solo llegan los webhooks de prueba
   del panel. Publicar exigió URL de política de privacidad, condiciones y eliminación de
   datos.
3. **Los salientes no traen cuerpo.** Los webhooks `statuses` traen `wamid`, estado,
   destinatario y precio, pero no el texto. El contenido solo lo conoce quien envía.
4. **El `wamid` contiene el teléfono del participante codificado en base64.** Hay que
   tratarlo como dato personal (R-19): no alcanza con recortar `wa_id` en logs.
5. **Llega el BSUID.** Los payloads reales traen `contacts[].user_id`, `from_user_id` y
   `recipient_user_id` además de `wa_id`. Meta documenta que, si el usuario activa nombre
   de usuario, el teléfono puede no venir en el webhook salvo interacción en los últimos
   30 días [3].
6. **Formato de número en Argentina.** El `wa_id` entrante viene con el 9 (`549…`), y
   el envío funcionó con ese mismo formato en `to`. El primer intento falló con `131030`
   (destinatario no autorizado), un error del filtro de destinatarios permitidos que
   aplica el número de prueba. En la práctica, `wa_id` sirve tal cual para responder.
7. **Los timestamps tienen resolución de segundos.** Dos mensajes en el mismo segundo
   empatan, y el desempate por `wamid` no es cronológico.
8. **`read` puede llegar sin `delivered`.** Meta lo documenta: si el usuario está en el
   chat al recibir, solo se envía `read` [1b]. El modelo de estados no puede asumir una
   secuencia completa.

## Entrada para D-0014: qué proceso tiene que estar encendido

Con Cloud API (A o B):

- **Un receptor HTTPS público** con certificado válido que responda 200 rápido. No
  necesita sesión persistente ni IP estable: Meta llama a la URL y la API se llama por
  HTTPS saliente.
- **Tolera caídas cortas:** Meta reintenta hasta 7 días [1]. El receptor tiene que ser
  idempotente por `wamid` (la PoC lo es).
- **El procesamiento puede ir aparte del receptor.** La PoC guarda la entrega cruda antes
  de responder y procesa después. Así, el receptor puede ser una función request/response
  y el trabajo largo, un worker (D-0012).
- **No exige un proceso always-on.** Lo que sí exige es una URL estable, algo que el túnel
  rápido de la PoC no da.

Con dispositivo vinculado (C), descartado: un proceso always-on con socket permanente,
estado de sesión persistido y el teléfono principal activo.

## Propuesta para D-0028: política de persistencia

A diferencia de Gmail (D-0010), WhatsApp no tiene un system of record consultable: Cloud
API no permite releer mensajes. **Si Communication OS no copia el contenido, se pierde.**

Propuesta:

- **Se copia:** texto de mensajes entrantes y salientes, `wamid`, dirección,
  `phone_number_id`, `wa_id`, BSUID, timestamp de WhatsApp y de recepción, y el último
  estado.
- **Se guarda al enviar:** el saliente se persiste en el momento del envío con el `wamid`
  que devuelve la API. Los `statuses` solo lo actualizan.
- **Payload crudo:** se conserva 30 días para reprocesar. Cubre los 7 días de
  reintentos de Meta y deja margen para corregir errores. Después se borra.
- **Se indexa:** participante (`wa_id` y BSUID), `wamid` único, timestamp. El texto, para
  búsqueda, solo si la función lo justifica.
- **Clasificación:** datos personales de clientes (R-19). El `wamid` cuenta como dato
  personal.
- **Fuera de alcance de la propuesta:** adjuntos, audio y grupos (non-scope de T-0020).

## Fixtures

En `SPIKES/T-0020/fixtures/`:

- `real-inbound.redacted.json`: entrante real.
- `real-status.redacted.json`: estado real.

Los generó `redact.ts` a partir de `captures/`, que no se versiona. Teléfonos, nombre,
texto, `wamid` e ids quedaron reemplazados por valores sintéticos. Una búsqueda
automática del número real, del nombre y de los textos escritos dio cero coincidencias.
**Falta la revisión a mano del owner.**

Los dos archivos se redactaron por separado, así que el `wamid.SYNTH-REDACTED-0001` de
uno y del otro **no** son el mismo mensaje.

## Qué falta para operar con el número corporativo

Sin presumir que nada de esto esté aprobado:

1. **La decisión de producto** sobre si se escribe desde el teléfono, que define A o B.
2. **Si es B:** convertirse en Tech Provider (verificación del negocio y de acceso) o
   contratar un BSP, y pasar por Embedded Signup.
3. **Si es A:** borrar la cuenta de la app en ese número antes de registrarlo en la API.
   El número deja de usarse desde el teléfono.
4. **Verificación del negocio:** sin ella, el límite es 250 destinatarios únicos cada
   24 horas fuera de la ventana de servicio [5]. Las respuestas dentro de la ventana no
   cuentan.
5. **Revisión del nombre visible** del número corporativo.
6. **Método de pago,** si se van a enviar plantillas. Aceptarlo es un compromiso comercial
   del owner (R-14).
7. **URL estable del webhook** (D-0014) y un token de sistema en lugar del token
   temporal del panel. Lo gestiona el owner (R-16).
8. **Política de privacidad pública real.** La que se publicó para el spike tiene que
   revisarse antes de usar el número con clientes.

## Qué no se verificó

- La prueba de concepto contra el número dedicado: postergada por el owner; solo se usó
  el número de prueba de Meta.
- La vía no oficial (C) no se probó: el riesgo de bloqueo no se justificaba.
- La coexistencia (B) no se probó: requiere ser partner.
- El orden de los webhooks bajo carga, y los duplicados reales de Meta (solo se simuló un
  reintento).
- El cobro de mensajes de servicio desde 2026-10-01 (ver nota de costos).
- La regla de cierre de sesión de dispositivos vinculados por inactividad del teléfono
  principal: la FAQ oficial no se pudo consultar.

## Fuentes (consultadas el 2026-10-02)

- [1] Meta, Webhooks overview: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
- [1b] Meta, Status messages webhook reference: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status
- [2] Meta, Pricing: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- [2b] Meta, Pricing updates: https://developers.facebook.com/docs/whatsapp/pricing/updates-to-pricing
- [3] Meta, Business-scoped user IDs: https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids
- [4] Meta, Onboarding WhatsApp Business app users (coexistence): https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
- [5] Meta, Messaging limits: https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits
- [6] respond.io, WhatsApp Coexistence (requisito de abrir la app cada 14 días; fuente de terceros): https://respond.io/help/whatsapp/whatsapp-coexistence
- [7] WhatsApp, Terms of Service: https://www.whatsapp.com/legal/terms-of-service
- [8] WhatsApp Help Center, apps no oficiales: https://faq.whatsapp.com/1217634902127718
- [9] Baileys, history sync: https://baileys.wiki/docs/socket/history-sync ; repositorio y descargo: https://github.com/WhiskeySockets/Baileys
- [10] Baileys, issue #2414 sobre LID: https://github.com/WhiskeySockets/Baileys/issues/2414
- [11] Darwin AI, "service messages billed starting October 2026" (terceros, no confirmado por Meta): https://help.getdarwin.ai/en/articles/16516839-whatsapp-business-platform-pricing-changes-service-messages-billed-starting-october-2026
