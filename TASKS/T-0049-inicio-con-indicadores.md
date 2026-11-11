---
id: T-0049
title: Inicio con indicadores y sin ranking
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-11-11
contextRefs: [docs/north-star/12-plan-hacia-la-north-star.md, docs/north-star/06-especificacion-y-handoff.md, TASKS/T-0048-renovaciones.md]
decisionRefs: [D-0007, D-0089]
---

## Why

C6-03a del plan: un inicio donde cada indicador concilia su denominador y lleva a sus casos,
sin ranking entre personas. El owner lo eligió el 11/11/2026 después de renovaciones.

## Outcome

`/inicio` pasa a ser la página de entrada. Muestra seis indicadores (mis gestiones vencidas y
abiertas, gestiones sin responsable, renovaciones manuales pendientes, automáticas a controlar
y vencidas sin renovar), cada uno con su definición, el conjunto sobre el que cuenta y el
enlace a la lista que lo forma. Debajo, mis gestiones abiertas (vencidas primero) y la carga
del equipo en orden alfabético. Todo corre por RLS: cada persona cuenta sólo lo que ve.

## Non-scope

Indicadores de comunicación, riesgos, siniestros por etapas y automatizaciones del prototipo
(K-04 a K-20), que dependen de capacidades que todavía no existen. Inicios distintos por rol.

## Data effects

Ninguno: sólo lectura, sin migración.

## Verification

```bash
node --test packages/api/src/inicio/indicadores.test.ts
pnpm check
```
