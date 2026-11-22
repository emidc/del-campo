---
id: T-0061
title: Sección Riesgos de cada empresa en Broker OS
status: DONE
created: 2026-11-13
linear: EMI-131
---

## Para qué

Manuel y Emiliano necesitan ver y editar, en la ficha de cada empresa, el resultado del
trabajo de riesgos: la lista de riesgos, el plan de acción y la transferencia, con
comentarios en cada ítem. Reemplaza a Risk OS como aplicación separada.

## Listo cuando

- En la ficha de una empresa hay una sección Riesgos con tres listas: riesgos, acciones y transferencia.
- El equipo puede agregar, editar y dar de baja ítems, y comentar cada uno.
- Cada cambio guarda quién lo hizo y cuándo.
- Los datos viven en la base de Broker OS, sin llamadas a otro sistema.
- `pnpm check` en verde.

## Fuera de alcance

Cualquier lógica del método de análisis (valoraciones automáticas, pasos, aprobaciones): eso es del agente (T-0063). Migrar los datos históricos de Risk OS.

## Avance
- 22/11/2026: modelo de datos de riesgos (migración `0029`, PR 192) y sección Riesgos en la ficha de empresa con las tres listas, comentarios y registro de quién y cuándo (migración `0030`, PR 193). Primera empresa cargada: Antucura (carga piloto).
