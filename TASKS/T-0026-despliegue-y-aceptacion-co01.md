---
id: T-0026
title: Desplegar Communication OS y ejecutar la aceptación de CO01
kind: FEATURE
status: READY
workstream: BOS
riskClass: HIGH
size: L
created: 2026-10-04
blockedBy: [T-0025]
contextRefs: [SLICES/CO01.md, DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0065-whatsapp-cloud-api-y-persistencia.md,
              DECISIONS/0066-credencial-compartida-co01.md,
              DECISIONS/0058-nextjs-en-vercel.md, docs/despliegue/vercel-vs01.md,
              contexts/communication/README.md, SPIKES/T-0020-integracion-whatsapp.md,
              ENGINEERING_RULES.md]
decisionRefs: [D-0013, D-0014, D-0058, D-0063, D-0065, D-0066]
---

## Why

T-0024 y T-0025 dejan a Communication OS recibiendo, mostrando y respondiendo mensajes,
pero solo en local, con la API de Meta simulada. CO01 se acepta con 72 horas de uso
real del número dedicado (`SLICES/CO01.md` §4). Esta tarea pone Communication OS en
producción, separado de VS01, completa lo operativo que el contrato pide (retención y
reproceso) y ejecuta el protocolo de aceptación. Su resultado decide si CO01 se acepta y
alimenta la decisión de cierre de Q4 sobre Communication OS (D-0063).

## Outcome

- **Communication OS corre en su propio proyecto de Vercel**, con la app de
  `apps/communication`, y en su propia base Postgres hosteada (D-0013), separados del
  proyecto y de la base de VS01. Ninguno usa credenciales, variables ni datos de VS01.
  El receptor y la UI responden en un subdominio de `delcampobroker.com`.
- **`docs/despliegue/vercel-communication.md`** documenta, como
  `docs/despliegue/vercel-vs01.md`:
  - la configuración del proyecto y la lista de variables de entorno, sin valores;
  - cómo crear la base y aplicar y revertir las migraciones del contexto. Las ejecuta
    el owner (R-13): ningún agente se conecta a la base hosteada;
  - cómo apuntar el webhook de Meta a la URL de producción y comprobar las dos
    suscripciones (`subscribed_apps` y el campo `messages`);
  - cómo volver a la versión anterior y cómo apagar todo (desuscribir el webhook,
    pausar el proyecto, borrar la base);
  - el plan y los costos de Vercel y de la base. Esta tarea no contrata nada: si hace
    falta un plan pago, lo decide el owner (R-14).
- **El receptor en producción** guarda la entrega antes de responder 200 y termina el
  procesamiento en el runtime de Vercel. Si el runtime no garantiza el trabajo después de
  responder, procesa antes de responder. La firma es obligatoria.
- **Retención programada:** una tarea programada borra las entregas crudas de más de 30
  días con `purgeExpiredDeliveries` (D-0065). Su endpoint exige un secreto propio y
  queda fuera de la credencial de la UI.
- **Reproceso:** existe una operación idempotente que vuelve a procesar las entregas
  pendientes o `failed`, porque Meta no reintenta después de un 200. Corre de forma
  programada y también a pedido del owner, y registra qué reprocesó.
- **Contratos con respuestas reales (R-27):** una respuesta real de envío de la Cloud API
  y un webhook real del número dedicado quedan como fixtures redactados en
  `contexts/communication/fixtures/`, revisados a mano por el owner. Los tests de
  contrato los usan en lugar de la forma documentada.
- **Script de aceptación:** compara la lista de marcadores que llevan los participantes
  (un archivo local, ignorado por git) contra la base, y calcula mensajes perdidos,
  duplicados por `wamid`, orden por conversación, mediana de latencia de recepción y
  salientes enviados con la ventana cerrada. El informe que produce contiene solo
  códigos de participante, marcadores, conteos y tiempos. Lo corre el owner.
- **La aceptación de CO01 está ejecutada según §4**, con su informe en
  `ops/evidence/T-0026-aceptacion.md`: cada criterio con su valor medido y si cumple. Si
  alguno no cumple, el informe lo dice y CO01 no se declara aceptado (§4, punto 5).

## Non-scope

- El número corporativo, conversaciones con clientes, plantillas, mensajes fuera de la
  ventana de servicio y campañas.
- La verificación del negocio en Meta.
- Login con identidad individual e integración con Broker OS (D-0063, D-0066).
- Cambios en el proyecto, la base o el despliegue de VS01.
- Monitoreo y alertas más allá de la hora de la última entrega que ya muestra la UI.
- Contratar planes pagos o aceptar condiciones comerciales en nombre de Del Campo.
- Adjuntos, audio, reacciones, grupos, búsqueda e IA.

## Verification

```bash
pnpm check
COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test pnpm test
pnpm --filter "./apps/communication" build
```

Comprobaciones humanas, registradas en `ops/evidence/T-0026.md`:

- [ ] El owner siguió `docs/despliegue/vercel-communication.md` de punta a punta, y lo
      que no coincidió quedó corregido en el documento.
- [ ] Las migraciones del contexto se aplicaron en la base hosteada, ejecutadas por el
      owner, y la reversa está probada en local.
- [ ] Meta verificó el webhook contra la URL de producción, y las dos suscripciones
      están comprobadas con su consulta.
- [ ] Contra producción (`curl`), sin credencial y con credencial inválida, cada página
      y cada endpoint de datos y de envío responden sin datos; el webhook sin firma
      responde 401; el endpoint de retención sin su secreto responde sin borrar nada.
- [ ] La retención programada corrió al menos una vez, y el reproceso recuperó una
      entrega `failed` provocada sin duplicar mensajes.
- [ ] Los fixtures reales redactados no contienen teléfonos, nombres, textos ni `wamid`
      reales, revisado a mano por el owner.
- [ ] El repositorio no contiene tokens, secretos, el hash de la credencial ni el archivo
      de marcadores.
- [ ] `ops/evidence/T-0026-aceptacion.md` tiene los ocho criterios de `SLICES/CO01.md`
      §4 con su valor medido, incluida la caída provocada de al menos 10 minutos.
- [ ] Revisión ciega por subagente aislado (R-33), registrada en `REVIEWS/T-0026-*.md`.

## Data effects

- **Sistemas externos:** un proyecto nuevo de Vercel, una base Postgres hosteada nueva,
  un subdominio de `delcampobroker.com` y el cambio de la URL del webhook en la app de
  Meta, del túnel a producción. Los crea y configura el owner (R-13, R-14).
- **Mensajes reales:** solo con el número dedicado y con las dos personas del equipo
  que consintieron por escrito (CO01 §3). Contenido inventado; ningún cliente (R-19).
- **Credenciales:** token de usuario del sistema, App Secret, token de verificación,
  credencial compartida de la UI y secreto de las tareas programadas. Las genera y carga
  el owner como variables del despliegue; ningún agente las recibe (R-16).
- **Datos personales en producción:** las conversaciones de prueba quedan en la base
  hosteada. Al cerrar Q4 se decide si se conservan; si no, se borra la base.
- **Reversión:** desuscribir el webhook o apuntarlo a otra URL, pausar el proyecto de
  Vercel y borrar la base hosteada.

## Risks

- **Latencia por arranque en frío.** Una función que arranca en frío puede subir la
  latencia de recepción. La mediana menor a 10 segundos lo absorbe si el arranque es
  ocasional; si no, se documenta y se discute con el owner antes de cambiar el umbral.
- **Límites del plan gratuito.** Las tareas programadas del plan Hobby de Vercel pueden
  estar limitadas en frecuencia, y el uso de una herramienta interna de la correduría
  probablemente es comercial (ver `docs/despliegue/vercel-vs01.md` §8). La retención
  diaria alcanza; el reproceso también puede correrse a pedido.
- **Depende de pendientes del owner** (CO01 §7): número dedicado dado de alta y probado,
  token de usuario del sistema, subdominio, credencial compartida y consentimiento de
  los participantes. Sin ellos la tarea se puede preparar, pero no aceptar.
- **La prueba dura 72 horas de calendario** y depende de que los participantes
  escriban primero cada día (CO01 §3).
- **Un envío confirmado por la API sin fila persistida** (riesgo de T-0025) tiene que
  quedar visible durante la prueba; si aparece, cuenta como hallazgo del informe.

## Notes

`riskClass: HIGH` porque la tarea envía mensajes reales, configura sistemas externos y
deja datos personales en una base hosteada: se trabaja en plan mode y con aprobación del
owner en cada paso externo (R-13). La prueba de concepto de T-0020 con el número
dedicado, pendiente del owner, conviene hacerla antes de empezar esta tarea.
