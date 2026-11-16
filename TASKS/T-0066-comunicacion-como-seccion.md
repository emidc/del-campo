---
id: T-0066
title: Comunicación como sección de Broker OS
status: ACTIVE
created: 2026-11-13
linear:
---

## Para qué

Que las conversaciones con clientes se vean dentro de Broker OS, en la misma aplicación y
la misma base, y no en un sistema aparte.

Emiliano lo adelantó el 15/11/2026, mientras el ejercicio de riesgos sigue en curso.

## Listo cuando

- Las conversaciones se ven en una sección de Broker OS con el mismo login.
- Los datos viven en la base de Broker OS.
- Se eliminaron `apps/communication` y `contexts/communication` y, con la aprobación de Emiliano, sus proyectos de Vercel y Supabase.
- `pnpm check` en verde.

## Fuera de alcance

Funciones nuevas de WhatsApp o correo.

## Plan

1. Tablas de mensajes en la base de Broker OS (migración 0021).
2. Receptor del webhook de Meta, envío y tareas programadas (retención y reproceso) en Broker OS.
3. Sección Comunicación (lista e hilo) y la conversación en la ficha del cliente cuando el teléfono coincide con un contacto.
4. Emiliano apunta el webhook de Meta a Broker OS; después se borran `apps/communication` y `contexts/communication`.

## Avance

- 16/11/2026: paso 1. Las cinco tablas de mensajes quedan en el esquema `communication` de la base de Broker OS, con la forma final de las migraciones de Communication OS. El equipo lee todo y registra sus respuestas; la entrega cruda del webhook sólo la toca la conexión dueña. No se traen usuarios, invitaciones ni auditoría de Communication OS.
- 16/11/2026: paso 2. El código de Communication OS (parseo, receptor, envío por Cloud API, reproceso, retención, lectura de conversaciones y respuesta) queda en `packages/api/src/comunicacion`, con sus tests corriendo contra la base de Broker. Broker OS expone `/api/whatsapp/webhook`, `/api/jobs/reprocess` y `/api/jobs/retention`, con los mismos horarios de cron. Sin variables configuradas responden 503, así que nada cambia en producción hasta el corte. Decisiones de Emiliano: se arranca vacío, sin migrar mensajes, y todo el equipo ve las conversaciones. Para el corte (paso 4) el proyecto de Vercel de Broker OS necesita `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_GRAPH_API_VERSION` y `CRON_SECRET`.
- 16/11/2026: paso 3. Sección Comunicación en el menú: bandeja de WhatsApp (todas, las que se pueden responder y las sin identificar), hilo con respuesta dentro de la ventana de 24 h y pestaña WhatsApp en la ficha del cliente. Una conversación se vincula a un cliente cuando los últimos 10 dígitos del teléfono coinciden con un teléfono vigente de su ficha; no se guarda el vínculo, se calcula al leer. El número completo no se muestra. El estado de las entregas crudas se cuenta con la conexión de la app, porque `broker_app` no las lee.
