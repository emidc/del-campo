---
id: T-0025
title: Entregar la UI de conversaciones de CO01, con credencial compartida y respuesta
kind: FEATURE
status: READY
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-10-04
blockedBy: [T-0024]
contextRefs: [SLICES/CO01.md, DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0065-whatsapp-cloud-api-y-persistencia.md,
              DECISIONS/0066-credencial-compartida-co01.md,
              DECISIONS/0058-nextjs-en-vercel.md,
              SPIKES/T-0020-integracion-whatsapp.md, contexts/communication/README.md,
              ENGINEERING_RULES.md]
decisionRefs: [D-0058, D-0063, D-0065, D-0066]
---

## Why

T-0024 deja a Communication OS recibiendo y guardando los mensajes de WhatsApp, pero
nadie puede verlos ni contestarlos. La aceptación de CO01 (`SLICES/CO01.md` §4) exige
que todos los salientes de la prueba se envíen desde la UI, que ninguno salga con la
ventana de servicio cerrada, que cada saliente muestre su último estado y que el hilo
coincida con el orden del teléfono. Esta tarea entrega esa UI en local, con la
credencial compartida de D-0066, y habilita la tarea de despliegue y aceptación de CO01
(§8, punto 3).

## Outcome

- **Communication OS tiene su propia app web en el workspace**, separada de `apps/web`,
  con el mismo stack que la app de VS01 (Next.js y TypeScript, D-0058) y sin dependencias
  que no estén ya en el repositorio. La app importa solo lo que exporta
  `@del-campo/communication`. `pnpm lint` falla si la app importa algo de `packages/*`,
  de `apps/web`, de otro contexto o de un archivo interno del contexto, y sigue fallando
  si `apps/web` o `packages/*` importan un contexto. La regla de T-0024, que prohíbe a
  todo `apps/*` importar contextos, se acota a lo que dice D-0063. `pnpm typecheck` y
  `pnpm lint` cubren la app.
- **Nada se ve ni se envía sin la credencial compartida (D-0066).**
  - Cada página y cada endpoint de la UI la exigen y la validan en el servidor.
  - La contraseña se compara contra un hash guardado en una variable de entorno, en
    tiempo constante.
  - Si la credencial no está configurada, la UI niega todo: no hay modo abierto.
  - El receptor de webhooks queda fuera de la credencial y lo sigue protegiendo la
    firma.
  - El mecanismo (Basic Auth o formulario con cookie firmada) lo elige esta tarea y lo
    documenta.
- **La lista de conversaciones** tiene una entrada por participante, ordenada por el
  último mensaje. Identifica al participante con el nombre de perfil y los últimos 4
  dígitos del `wa_id`, o con el BSUID si falta el teléfono. Nunca muestra el `wamid` ni
  el teléfono completo. Muestra la hora de la última entrega de webhook recibida, para
  que la UI no aparente estar al día si el receptor dejó de recibir.
- **El hilo de cada conversación:**
  - muestra los mensajes en el orden de `listThread`, con dirección y hora;
  - muestra el último estado de cada saliente y, si es `failed`, su error;
  - muestra los entrantes de tipos fuera de alcance como un marcador sin contenido.
- **Lo nuevo aparece sin recargar a mano**, tanto los mensajes como los cambios de
  estado. El mecanismo (polling o push) lo elige esta tarea y lo documenta.
- **La ventana de servicio** está abierta si el último entrante del participante tiene
  menos de 24 horas según su timestamp de WhatsApp. La UI muestra si está abierta. Con
  la ventana cerrada, el servidor rechaza el envío, aunque la petición no venga del
  botón.
- **Responder desde el hilo:**
  - envía texto libre por Cloud API desde el número configurado;
  - si la API acepta, el saliente se persiste con `recordOutboundMessage` y el `wamid`
    devuelto;
  - si la API lo rechaza o la red falla, la UI muestra el error y no crea el mensaje
    como enviado;
  - repetir el mismo intento de envío (doble clic, reintento del navegador) no produce
    un segundo envío ni un segundo mensaje (R-20);
  - si hace falta una consulta o una migración nueva para esto, va en
    `contexts/communication`, con su reversa.
- **Configuración:** el token de usuario del sistema, el `phone_number_id`, la versión de
  la Graph API y la credencial compartida se leen de variables de entorno. Sus nombres
  están documentados en el README de la app, sin valores. Ninguno está en el
  repositorio (R-16, R-18).
- **Tests (R-26):**
  - unit: ventana de servicio, validación de la credencial e idempotencia del envío;
  - integración contra el Postgres local: lista, hilo, persistencia del saliente y
    rechazo con la ventana cerrada;
  - denegación (R-28): sin credencial y con credencial inválida, en cada página, en cada
    endpoint de datos y en el de envío, sin exponer datos;
  - el cliente de envío se prueba contra la forma de respuesta y de error documentada
    por Meta, sin llamadas reales.

  `pnpm test` los incluye.

## Non-scope

- Despliegue, proyecto de Vercel, base hosteada, URL pública, carga de credenciales
  reales, tarea programada de retención y reproceso de entregas. Son de la tarea 3 de
  CO01.
- Credenciales reales de Meta y cualquier envío real: en esta tarea no sale ningún
  mensaje hacia un número (R-14, R-16).
- Plantillas, mensajes fuera de la ventana de servicio, adjuntos, audio, reacciones,
  grupos y campañas.
- Login con identidad individual, roles y auditoría por usuario (D-0066).
- Integración con Broker OS: ni el login de VS01, ni `Party`, ni código de `apps/web` o
  `packages/*` (D-0063).
- Búsqueda, IA y clasificación de mensajes.
- Cambios en la recepción de webhooks de T-0024, salvo las lecturas que la UI necesite.
- Cambios en `apps/web`, en `packages/*` o en `DOMAIN.md`, salvo lo mínimo de
  configuración del workspace, del lint, del typecheck y del script de tests.

## Verification

```bash
pnpm check
COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test pnpm test
pnpm --filter "./apps/communication" build
```

Comprobaciones humanas, registradas en `ops/evidence/T-0025.md`:

- [ ] Imports de prueba hacen fallar `pnpm lint`, y se revierten: desde la app hacia
      `@del-campo/db`, hacia `apps/web` y hacia un archivo interno de
      `contexts/communication`; y desde `apps/web` hacia `@del-campo/communication`. Un
      import de la app hacia `@del-campo/communication` pasa.
- [ ] Con la app levantada en local, sin credencial y con credencial inválida, cada
      página y cada endpoint de datos y de envío responden sin datos (`curl`). El webhook
      sigue respondiendo sin credencial.
- [ ] Recorrido en local contra `delcampo_communication_dev`, con datos sintéticos y la
      API de Meta simulada: login, lista, hilo, un entrante nuevo que aparece sin
      recargar, una respuesta con la ventana abierta que queda persistida con su `wamid`,
      una respuesta con la ventana cerrada que el servidor rechaza, y un rechazo de la API
      que se muestra sin crear el mensaje.
- [ ] El mismo intento de envío repetido produce una sola llamada a la API y un solo
      mensaje.
- [ ] La UI no muestra ningún `wamid` ni teléfono completo, y los logs de la app no
      contienen contenido, teléfonos ni `wamid`.
- [ ] El repositorio no contiene tokens, secretos ni el hash de la credencial.
- [ ] Revisión ciega por subagente aislado (R-33), registrada en
      `REVIEWS/T-0025-*.md`.

## Data effects

- **Bases de datos:** solo `delcampo_communication_dev` y `delcampo_communication_test`,
  locales. Si hace falta una migración nueva en el esquema `communication`, es
  reversible con su `down`; las bases se revierten con `dropdb`.
- **Sistemas externos:** ninguno. La API de Meta se simula.

## Risks

- **El contrato del envío no tiene una respuesta real capturada (R-27).** T-0020 envió
  por la API, pero solo versionó los webhooks. Los tests de esta tarea usan la forma
  documentada por Meta, marcada como tal. La captura redactada de una respuesta real
  queda para la tarea de despliegue, que es la primera en enviar.
- **La Cloud API no acepta claves de idempotencia.** Si el proceso cae entre que la API
  acepta y el saliente se persiste, queda un mensaje enviado sin fila. Ese estado tiene
  que quedar visible como un intento sin confirmar; no se puede perder en silencio.
- **Ventana en el borde de las 24 horas.** Meta mide la ventana de su lado. Un envío
  cerca del límite puede ser aceptado por la UI y rechazado por la API: en ese caso se
  muestra el error y no se persiste nada.
- **Aflojar el lint de T-0024.** Acotar la regla a `apps/web` no puede abrir la puerta a
  que la app importe Broker. Los imports de prueba de Verification cubren los dos
  sentidos.

## Notes

D-0058 fija Next.js para la app de VS01. Esta tarea usa el mismo stack para no sumar
dependencias ni un segundo framework. Si la implementación necesita algo que no esté en
el repositorio, eso requiere un ADR (R-05) antes de incorporarlo.
