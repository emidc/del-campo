---
id: T-0052
title: Tareas con responsable, estado e historia
kind: FEATURE
status: DONE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-11-11
contextRefs: [DOMAIN.md, docs/north-star/12-plan-hacia-la-north-star.md, docs/north-star/prototipo/pruebas/r1-manuel.js, docs/north-star/prototipo/pruebas/r2-evangelina.js, TASKS/T-0045-gestiones-manuales.md]
decisionRefs: [D-0022, D-0089]
---

## Why

Aceptar C6 con los recorridos R1 a R6 pide tareas: Manuel destraba y se queda con una
tarea, Evangelina crea una de seguimiento de renovación. El owner eligió el 11/11/2026
construir lo que falta antes de aceptar C6, empezando por tareas.

## Outcome

Una tarea es de un cliente y puede citar una póliza y una gestión del mismo cliente. Tiene
título, responsable, vencimiento y estado: Pendiente, En curso, Trabada, En revisión o
Hecha. Se crea desde la ficha del cliente, la póliza, la gestión o una renovación (tarea
de seguimiento). Se cambia de estado, se pasa a otra persona y se comenta, siempre con
historia. Inicio suma «Mis tareas», «Mis tareas vencidas» y «Tareas trabadas». Se ve y se
asigna con la misma regla que una gestión: quien ve al cliente.

Task sigue fuera de DOMAIN como entidad con reglas propias, igual que la gestión: es
trabajo interno del equipo sobre un cliente.

## Non-scope

Notificaciones, tareas sin cliente (por ejemplo, las que nacen de un correo), tareas
recurrentes, subtareas y la numeración K-xx del prototipo.

## Data effects

Migración `0017_tarea.sql`: tablas `task` y `task_event`, con RLS. No toca datos
existentes. La aplica el owner con `pnpm db:migrate`; la inversa está en `down/`.

## Verification

```bash
node --test packages/db/src/task.integration.test.ts
node --test packages/api/src/inicio/indicadores.test.ts
pnpm check
```
