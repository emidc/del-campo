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
