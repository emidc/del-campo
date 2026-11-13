---
id: T-0062
title: Servidor MCP de Broker OS
status: ACTIVE
created: 2026-11-13
linear:
---

## Para qué

Para que un agente en Claude pueda leer una empresa y guardar su trabajo de riesgos en
Broker OS sin copiar y pegar.

## Listo cuando

- Una persona del equipo conecta el MCP a Claude con su propio usuario.
- Herramientas disponibles: buscar empresa, leer su ficha y sus pólizas, leer las tres listas de riesgos, crear y editar ítems, comentar.
- Lo que escribe el agente queda registrado con el agente y la persona en cuyo nombre actuó.
- Un usuario cliente no puede usar el MCP.
- `pnpm check` en verde.

## Fuera de alcance

Herramientas para otras secciones (gestiones, siniestros, comunicación): se agregan cuando un agente concreto las necesite.

## Avance

- 2026-11-13: primera parte. Servidor en `/api/mcp/<token>`, token personal desde la pantalla "Conectar Claude", y herramientas de lectura: `buscar_clientes`, `leer_cliente`, `leer_poliza`. Cada llamada queda en la auditoría con origen `mcp`.
- Falta: las herramientas de riesgos (leer, crear, editar y comentar), que dependen de `T-0061`.
