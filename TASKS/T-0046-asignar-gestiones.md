---
id: T-0046
title: Asignar gestiones y ver la carga del equipo
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-11-11
blockedBy: [T-0045]
contextRefs: [TASKS/T-0045-gestiones-manuales.md, packages/db/migrations/0013_gestion.sql]
decisionRefs: [D-0022]
---

## Why

Con las gestiones manuales en producción (T-0045), el owner eligió el 11/11/2026 que lo
siguiente sea repartir el trabajo: asignar cada gestión a un integrante y ver cuánto
tiene cada uno.

## Outcome

En el detalle de una gestión se elige el responsable entre los integrantes que ven a su
cliente (Administrador u Operador con el cliente asignado); asignar a otro queda
rechazado por RLS. Cada asignación queda en la historia. `/gestiones/equipo` muestra las
abiertas y vencidas por responsable, y la lista filtra por responsable o sin responsable.

## Non-scope

Notificar al responsable, reasignar en lote y métricas históricas.

## Data effects

Migración `0014_gestion_asignacion.sql`: función `authz.integrantes_que_ven`, política
de actualización de `service_case` y un tipo de evento nuevo (`ASIGNACION`). No toca
datos. La aplica el owner con `pnpm db:migrate`.

## Verification

```bash
pnpm db:migrate
node --test packages/db/src/service-case.integration.test.ts
pnpm check
```
