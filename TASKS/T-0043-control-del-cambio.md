---
id: T-0043
title: Controlar el cambio por el diff, retirar la captura de AgentRun y proteger los validadores
kind: CHORE
status: DONE
workstream: POS
riskClass: MEDIUM
size: M
created: 2026-11-09
blockedBy: [T-0042]
contextRefs: [ENGINEERING_RULES.md, AGENTS.md, decisions.yaml, ops/AGENTRUN.md,
              docs/desarrollo/agentes.md, scripts/check-task-contract.mjs,
              .claude/settings.json, .agents/hooks/protect-paths.mjs]
decisionRefs: [D-0015, D-0052, D-0074, D-0082, D-0085, D-0086]
---

## Why

La revisión de las reglas de gobierno del 09/11/2026, contrastada con una segunda revisión
independiente, encontró cuatro fricciones comprobadas. El congelamiento del contrato
confiaba en el nombre de rama y dejaba cambiar kind, riskClass, contextRefs y Data effects.
Marcar una casilla obligaba a un PR extra por tarea. La revisión ciega dependía de una
etiqueta que pone quien implementa. Y la captura de AgentRun costaba trabajo en cada sesión
sin que ninguna decisión usara sus datos. Además, Claude podía editar los guardrails de
Codex y Gemini, y ningún agente tenía prohibido escribir los validadores.

## Outcome

`check-task-contract.mjs` congela el contrato de toda tarea existente que una rama
modifique, permite marcar casillas y acepta enmiendas sólo en `amend/`. Las 19 pruebas de
aceptación de la segunda revisión pasan. `check-review-required.mjs` exige un reporte en
`REVIEWS/` cuando la tarea es FEATURE o MIGRATION o el diff toca una ruta sensible, y CI
corre ambos controles con la versión de la rama y con la de la base. Los tres proveedores
protegen las mismas cinco rutas y los validadores. No queda ningún hook de captura de
AgentRun; `ops/runs/` sigue validado como histórico. `ENGINEERING_RULES.md`, `D-0015`,
`D-0052` y `D-0082` dicen lo mismo que el código, con `D-0085` y `D-0086` como sus ADR.
R-28 y R-09 están ACTIVA, R-11 LATENTE y R-31 retirada.

## Non-scope

- Elegir una biblioteca de validación en runtime para R-24.
- Cambiar R-01, R-03, R-05 o R-27, o la obligatoriedad por `riskClass`.
- Borrar `ops/runs/` o reescribir evidencia de tareas anteriores que cite `runId`.
- Proteger `.env` de la lectura de Codex y Gemini.

## Verification

```bash
pnpm check
node --test scripts/tests/check-task-contract-policy.test.mjs scripts/tests/check-task-contract.test.mjs scripts/tests/check-review-required.test.mjs scripts/tests/agent-guard.test.mjs scripts/tests/protect-paths.test.mjs
CHECK_BASE_REF=origin/main node scripts/check-task-contract.mjs
CHECK_BASE_REF=origin/main node scripts/check-review-required.mjs
grep -rn "record-agent-run" .claude .codex .gemini package.json && exit 1 || true
```

- [x] Un subagente aislado revisó el diff según R-33 y su reporte está en `REVIEWS/`.
- [x] `.claude/settings.json`, `.claude/hooks/protect-paths.mjs` y
      `.agents/hooks/protect-paths.mjs` nombran las mismas cinco rutas y los validadores.

## Data effects

No toca bases de datos ni sistemas externos. Borra `scripts/record-agent-run.mjs` y deja
de escribir `ops/runs/`; los eventos existentes no cambian.
