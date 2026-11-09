---
id: T-0042
title: Corregir la deriva de AGENTS, CLAUDE y PROJECT y alinear el validador con D-0080
kind: CHORE
status: DONE
workstream: POS
riskClass: LOW
size: S
created: 2026-11-09
blockedBy: []
contextRefs: [AGENTS.md, CLAUDE.md, PROJECT.md, ENGINEERING_RULES.md, decisions.yaml,
              docs/audits/reconciliation-2026-10-08.md]
decisionRefs: [D-0016, D-0074, D-0080, D-0082, D-0083]
---

## Why

La revisión de las reglas de gobierno del 09/11/2026 encontró que los documentos que todo
agente carga al arrancar dicen cosas falsas sobre el repositorio. `AGENTS.md` afirma que no
hay importación, UI, endpoints ni autorización, y resume R-14 de forma más débil que la
regla. `CLAUDE.md` lista comandos que ya no son ciertos. `PROJECT.md` mezcla el estado
vigente con la crónica de septiembre y octubre. Son DD1, DD2 y POS-1 de la conciliación del
08/10, todavía pendientes. Además `check-docs.mjs` exige un solo spike activo, cuando D-0080
dice que no hay sublímites por tipo. Codex y Gemini leen sólo `AGENTS.md`, así que una
instrucción falsa ahí produce decisiones equivocadas en cualquiera de los tres agentes.

## Outcome

`AGENTS.md` no afirma estado del programa: remite a `PROJECT.md`, copia la lista completa de
R-14 sobre Drive y resume los límites que un agente necesita al arrancar (D-0082, D-0074,
R-19 y el alcance de D-0083). `CLAUDE.md` contiene sólo lo específico de Claude Code y sus
comandos coinciden con `package.json`. `PROJECT.md` §3 dice la fase, lo que existe, los
frentes y dónde está el plan; la crónica vive en `docs/history/`. El mapa de documentos
incluye `SLICES/RO01.md`, `docs/north-star/` y `docs/desarrollo/agentes.md`.
`check-docs.mjs` no tiene sublímite de spikes. El título de D-0016 coincide con su
statement y `docs/desarrollo/agentes.md` no exige un proveedor distinto para revisar.

## Non-scope

- Cambiar obligaciones vigentes: AgentRun, R-09b, R-31, R-33, el congelamiento de contratos
  y las etiquetas ACTIVA/LATENTE quedan para el PR de política, que necesita otra
  aprobación del owner.
- Tocar `.claude/**`, `.github/workflows/**`, los hooks o `check-task-contract.mjs`.
- Cambiar el statement o el estado de cualquier decisión; sólo el título de D-0016.
- Decidir sobre `ARCHITECTURE.md`, cuyo disparador de ~5 ADR ya se superó.

## Verification

```bash
pnpm check
node -e "const s=require('./package.json').scripts;for(const c of ['check','decisions','typecheck','lint','test','dev','build','db:create','db:reset','db:migrate','db:version'])if(!s[c])throw new Error('falta '+c)"
grep -c "No hay importación, ni UI, ni endpoints" AGENTS.md CLAUDE.md PROJECT.md | grep -v ':0' && exit 1 || true
grep -n "activeSpikes" scripts/check-docs.mjs && exit 1 || true
```

- [x] `AGENTS.md` lista crear, mover, renombrar, modificar y eliminar en Drive, igual que R-14.
- [x] El resumen de D-0083 en `AGENTS.md` conserva su alcance: uso interno, no habilita
      publicar, exportar ni entregar al cliente, ni aprobar sin la revisión y la pausa.
- [x] Ningún hecho de la crónica de `PROJECT.md` se perdió: está en `docs/history/`.
