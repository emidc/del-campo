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
- 2026-11-22: herramientas del agente de riesgos (`mcp/herramientas-riesgos.ts`): `leer_riesgos_empresa`, `leer_coberturas_poliza`, `cifras_de_cartera`, `guardar_item_riesgo`, `comentar_item_riesgo`, `registrar_ubicacion`, `registrar_condiciones`, `registrar_coberturas`, `registrar_relevamiento` y `registrar_conclusion`. Todo lo que escriben queda firmado con el agente (`riesgos@1`) y la persona. La conclusión aplica la escala de la plantilla de notas v2: nivel 2 pide la condición declarada o confirmada; nivel 3 cita la póliza, y "no cubre" sólo con el texto que lo dice (si no, queda pendiente).
