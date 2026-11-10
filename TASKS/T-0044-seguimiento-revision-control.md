---
id: T-0044
title: Leer el kind como YAML, eximir las altas de planificación y escribir los límites del control
kind: CHORE
status: DONE
workstream: POS
riskClass: MEDIUM
size: S
created: 2026-11-10
blockedBy: []
contextRefs: [ENGINEERING_RULES.md, decisions.yaml, DECISIONS/0086-control-del-cambio-por-diff.md,
              scripts/check-review-required.mjs, scripts/check-task-contract.mjs]
decisionRefs: [D-0052, D-0086]
---

## Why

Una revisión independiente de los PR #130 y #131, del 10/11/2026, encontró cinco puntos
en el estado final. `check-review-required.mjs` lee el kind con una expresión regular que
no reconoce `kind: "FEATURE"`, así que una FEATURE con el valor entre comillas pasa sin
revisión. Agregar una tarea FEATURE en un PR de planificación exige una revisión ciega de
un contrato que todavía no existe en `main`. Y dos límites del control no estaban
escritos: la copia de la base en `.ci-base/` resuelve sus dependencias desde el
`node_modules` del PR, y el control comprueba que el reporte exista, no lo que dice. El
owner aprobó corregir los cinco puntos el 10/11/2026.

## Outcome

`check-review-required.mjs` lee el kind del frontmatter con el parser YAML de
`check-task-contract.mjs`, y una tarea cuyo kind no se puede leer falla. Un PR que agrega
una tarea FEATURE o MIGRATION que la base no tiene, y cuyo resto del diff es texto de la lista
del ADR de D-0086, no exige revisión; la exige el PR que la implementa,
porque el kind ya está en la base. Un renombre no cuenta como alta. R-33, D-0052 y D-0086
dicen eso, y D-0086 nombra como límites que `.ci-base/` no aísla las dependencias y que
el control es de presencia. Las pruebas de `check-review-required.test.mjs` cubren el kind
entre comillas, el kind ilegible, la tarea sin `.md`, el alta de planificación, el alta
con código y el renombre.

## Non-scope

- Agregar un workflow `check-base` con `pull_request_target`: el owner lo dejó para más
  adelante.
- Aislar la ejecución de `.ci-base/` de las dependencias del PR.
- Validar el contenido, la independencia o la vigencia de un reporte en `REVIEWS/`.
- Cambiar la lista `SENSITIVE`.

## Verification

```bash
pnpm check
node --test scripts/tests/check-review-required.test.mjs scripts/tests/check-task-contract.test.mjs scripts/tests/check-task-contract-policy.test.mjs
CHECK_BASE_REF=origin/main node scripts/check-task-contract.mjs
CHECK_BASE_REF=origin/main node scripts/check-review-required.mjs
grep -n 'match(/\^kind' scripts/check-review-required.mjs && exit 1 || true
```

- [x] Un subagente aislado revisó el diff según R-33 y su reporte está en `REVIEWS/`.

## Data effects

No toca bases de datos ni sistemas externos.
