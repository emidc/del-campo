---
id: T-0072
title: Avisar los mensajes de WhatsApp al responsable del cliente
status: ACTIVE
created: 2026-11-22
linear: EMI-142
---

## Para qué

Pedido de Emiliano (22/11/2026). Cuando entra un mensaje de un cliente, el aviso le llega
a un integrante del equipo: el responsable asignado al cliente o, si no tiene, Victoria.
Si el mensaje no se asocia a ningún cliente, le llega a Matías. Todo el equipo puede ver
y responder cualquier conversación.

## Listo cuando

- La ficha del cliente tiene «Responsable de mensajes», editable con cualquier integrante del equipo o sin asignar.
- En Comunicación cada conversación dice a quién avisa, y la pestaña «Para mí, sin responder» muestra las que esperan respuesta de quien mira.
- El menú muestra en Comunicación cuántas tiene pendientes cada persona.
- `pnpm check` en verde.

## Fuera de alcance

Avisos por correo, push o WhatsApp al integrante: el aviso se ve dentro de Broker OS.

## Avance

- 22/11/2026: responsable por cliente (migración `0031`), regla de avisos y pantallas. Queda que Emiliano aplique `0031` en producción.
