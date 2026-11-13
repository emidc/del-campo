---
id: T-0066
title: Comunicación como sección de Broker OS
status: READY
created: 2026-11-13
linear: EMI-137
---

## Para qué

Que las conversaciones con clientes se vean dentro de Broker OS, en la misma aplicación y
la misma base, y no en un sistema aparte.

Va después de riesgos, salvo que Emiliano lo adelante.

## Listo cuando

- Las conversaciones se ven en una sección de Broker OS con el mismo login.
- Los datos viven en la base de Broker OS.
- Se eliminaron `apps/communication` y `contexts/communication` y, con la aprobación de Emiliano, sus proyectos de Vercel y Supabase.
- `pnpm check` en verde.

## Fuera de alcance

Funciones nuevas de WhatsApp o correo.
