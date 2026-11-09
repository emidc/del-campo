---
id: T-0039
title: Proteger rutas y capturar AgentRun también para Codex y Gemini
kind: CHORE
status: ACTIVE
workstream: POS
riskClass: MEDIUM
size: S
created: 2026-11-07
blockedBy: [T-0038]
contextRefs: [DECISIONS/0082-tres-proveedores-de-agentes.md, ops/AGENTRUN.md,
              .claude/hooks/protect-paths.mjs, ENGINEERING_RULES.md]
decisionRefs: [D-0016, D-0074, D-0082]
---

## Why

D-0082 admite Codex y Gemini como agentes de ejecución, pero hasta hoy la protección local
de rutas sensibles y la captura de AgentRun sólo existen para Claude Code. Mientras eso
siga así, esos dos proveedores trabajan sólo con datos sintéticos y sus corridas no se
pueden comparar. Habilita usarlos con datos de nivel 2 bajo cuentas registradas.

## Outcome

Dos partes, cada una con su aceptación:

- **GOV-04a.** Codex y Gemini no pueden escribir en una ruta protegida desde la máquina
  local. Listo cuando una prueba por proveedor muestra el rechazo, sin duplicar lo que ya
  hace cumplir CI (`check-task-contract`, revisión de PR).
- **GOV-04b.** Una corrida de Codex y una de Gemini dejan su AgentRun con el formato que
  valida `scripts/check-agent-run.mjs`, con `provider` y `settingSources` reales. Listo
  cuando `pnpm check` valida ambas.

## Non-scope

- Editar `.claude/**`: cualquier cambio ahí necesita aprobación explícita del owner.
- Duplicar en local los controles que ya resuelve CI.
- Elegir un proveedor para benchmark (D-0043 sigue `OPEN`).

## Verification

```bash
pnpm check
```

- [ ] Una prueba por proveedor muestra el rechazo de escritura en una ruta protegida.
- [ ] `ops/runs/` contiene un AgentRun de Codex y uno de Gemini que el checker valida.
