---
id: T-0047
title: Una funcionalidad en un solo PR y revisión sólo en permisos o seguridad
kind: CHORE
status: DONE
workstream: POS
riskClass: MEDIUM
size: S
created: 2026-11-11
contextRefs: [scripts/check-task-contract.mjs, scripts/check-review-required.mjs, ENGINEERING_RULES.md]
decisionRefs: [D-0052, D-0086, D-0089]
---

## Why

T-0045 y T-0046 necesitaron dos PR cada una: uno para dar de alta la tarea y otro para
el código, porque CI exigía la tarea en `main`. Además pedían un reporte en `REVIEWS/`
por ser FEATURE con migración. El owner eligió el 11/11/2026 sacar las dos exigencias y
dejar el control mínimo en un PR con tests en verde.

## Outcome

- Una rama `task/T-xxxx` pasa si la tarea existe en la rama, esté o no en `main`.
- `REVIEWS/` se exige sólo si el diff toca identidad y autorización, controles de acceso
  de las apps, guardrails o validadores.
- R-33, `docs/desarrollo/agentes.md` y `decisions.yaml` (D-0089) dicen lo mismo.

## Non-scope

Cambiar el congelamiento del contrato de una tarea que ya está en `main` (D-0086), las
rutas protegidas por los hooks locales y el workflow de CI.

## Verification

```bash
node --test scripts/tests/check-task-contract.test.mjs scripts/tests/check-review-required.test.mjs
pnpm check
```
