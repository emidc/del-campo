---
id: T-0020
title: Decidir cómo Communication OS sincroniza mensajes 1:1 de WhatsApp
kind: SPIKE
status: DONE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-29
blockedBy: []
contextRefs: [DOMAIN.md, decisions.yaml, ENGINEERING_RULES.md, DECISIONS/0063-aislamiento-por-contexto-q4.md]
decisionRefs: [D-0010, D-0012, D-0014, D-0028, D-0063]
---

## Why

Communication OS tiene que demostrar en Q4 la sincronización continua de mensajes de
texto de WhatsApp en conversaciones 1:1 de prueba. Tiene que mostrar identidad del
participante, dirección, timestamps, orden, persistencia, ausencia de duplicados y
actualización continua. Todavía no sabemos cómo entran los mensajes al sistema, y de
eso depende todo lo demás:

- qué se persiste y cómo se clasifica (D-0028, hoy OPEN);
- qué proceso tiene que estar siempre encendido y dónde corre (D-0014);
- si el número dedicado alcanza para capturar también los mensajes que una persona
  escribe desde el teléfono.

La importación manual es solo un hito intermedio, no el objetivo. Este spike habilita
el ADR de mecanismo de integración y el contrato de Communication OS.

## Outcome

`SPIKES/T-0020-integracion-whatsapp.md` compara los mecanismos candidatos con fuentes
actuales verificables y recomienda uno. Como mínimo compara:

- la API oficial de WhatsApp Business (Cloud API), incluida cualquier modalidad que
  permita convivir con la app en el mismo número;
- una sesión de dispositivo vinculado mediante bibliotecas no oficiales.

La recomendación se apoya en una prueba de concepto mínima con el número dedicado. La
prueba muestra, sobre un Postgres local y con conversaciones 1:1 de prueba entre
participantes que consintieron:

- recepción de un mensaje entrante;
- captura de un mensaje saliente;
- persistencia idempotente, donde un mismo mensaje recibido dos veces queda una sola
  vez;
- orden estable por timestamp.

## Non-scope

- Grupos, adjuntos, audio, reacciones, estados y email.
- El número corporativo de Del Campo y cualquier conversación con clientes reales.
- Envío de mensajes a terceros, campañas o plantillas de marketing.
- UI, despliegue en producción, worker productivo e IA.
- Integración con Broker OS: nada de resolución contra `Party` ni lectura de su esquema
  (D-0063).
- Crear `contexts/communication`. El código de la prueba de concepto es descartable y
  vive en `SPIKES/T-0020/`, fuera del workspace.
- Contratar planes pagos o aceptar condiciones comerciales en nombre de Del Campo.

## Verification

```bash
pnpm check
```

Comprobaciones humanas. El spike no está terminado hasta que estén respondidas por
escrito en `SPIKES/T-0020-integracion-whatsapp.md`:

- [ ] Para cada mecanismo está respondido, con fuente y fecha de consulta:
  - si captura mensajes entrantes y salientes, incluidos los escritos desde la app del
    teléfono;
  - si permite recuperar historial previo;
  - qué identificador estable tiene cada mensaje y cada participante;
  - qué garantías de entrega, reintento y orden ofrece;
  - qué costo tiene;
  - qué exigen sus condiciones de uso y qué riesgo de bloqueo del número implica.
- [ ] La prueba de concepto demostró, contra el número dedicado:
  - un mensaje entrante y uno saliente persistidos con dirección y timestamp;
  - un reenvío o reintento que no duplicó filas;
  - dos mensajes consultados en el orden correcto.
- [ ] Está escrito qué proceso tiene que estar siempre encendido, si alguno, y qué le
      exige al hosting: IP, sesión persistente, webhook público. Esa es la entrada para
      D-0014.
- [ ] Está propuesta una política de persistencia para D-0028: qué se copia, qué se
      indexa y con qué clasificación de datos.
- [ ] Las respuestas reales capturadas quedaron como fixtures en el repositorio, con
      números, nombres y textos reemplazados por valores sintéticos, y la redacción se
      verificó a mano.
- [ ] Está escrito qué falta para operar con el número corporativo, sin presumir que
      esté aprobado.

## Decision unlocked

- Un ADR nuevo sobre el mecanismo de integración de WhatsApp.
- Una propuesta concreta para cerrar D-0028.
- La entrada que necesita D-0014 para el worker de Communication OS.
- La redacción del contrato de Communication OS, análogo a `SLICES/VS01.md`, que define
  su aceptación de Q4.

## Data effects

- **Sistemas externos:** el alta del número dedicado, la cuenta o app de Meta y
  cualquier vinculación de dispositivo los ejecuta el owner (R-14, R-16). Ningún agente
  recibe credenciales ni tokens.
- **Mensajes:** solo conversaciones de prueba entre participantes que consintieron.
  Ningún mensaje real entra al repositorio ni aparece en evidencia sin redactar (R-19).
- **Base de datos:** solo Postgres local. Se revierte borrando la base del spike.

## Risks

- **Timebox:** una semana de trabajo técnico. La espera por verificaciones de Meta no
  cuenta. Si esa espera supera dos semanas, el owner decide si marcar la tarea `BLOCKED`
  y empezar `T-0021`.
- **Una sesión no oficial puede provocar el bloqueo del número.** Por eso la prueba usa
  solo el número dedicado, y la recomendación tiene que pesar ese riesgo aunque la
  prueba salga bien.
- **Las capacidades de WhatsApp cambian seguido.** Toda afirmación sobre la plataforma
  lleva fuente y fecha, y no se acepta de memoria de un modelo.

## Cierre

Cerrada el 2026-10-03. Documento: `SPIKES/T-0020-integracion-whatsapp.md`. Evidencia:
`ops/evidence/T-0020.md`. La prueba de concepto se hizo con el número de prueba de Meta,
no con el número dedicado. El owner aceptó esa desviación el 2026-10-03 y postergó la
repetición con el dedicado (ver la evidencia, "Aceptación del owner").
