---
id: T-0038
title: Registrar las decisiones de operación de noviembre y el plan hacia la north star
kind: REVIEW
status: ACTIVE
workstream: POS
riskClass: MEDIUM
size: M
created: 2026-11-07
blockedBy: []
contextRefs: [PROJECT.md, ENGINEERING_RULES.md, decisions.yaml,
              docs/north-star/11-decisiones-y-hoja-de-ruta.md,
              docs/north-star/12-plan-hacia-la-north-star.md,
              docs/north-star/12-plan-hacia-la-north-star.csv]
decisionRefs: [D-0016, D-0022, D-0079, D-0080, D-0081, D-0082, D-0083, D-0084]
---

## Why

El plan hacia la north star (v4, revisado por el owner el 2026-11-07) depende de cinco
respuestas que todavía no estaban registradas: cuántos frentes activos hay, cuánto se
puede gastar, qué agentes trabajan en el repo, cómo aprueba un operador único y con qué
alcance se acepta RO01. Sin registrarlas, el validador impone otro WIP y las tareas citan
otro presupuesto. Habilita cargar el plan en Linear y abrir el PR de preparación
multiagente (T-0039).

## Outcome

`decisions.yaml` registra D-0080 a D-0084 con su ADR, y D-0016, D-0022 y D-0079 quedan
reemplazadas en parte. `scripts/check-docs.mjs` acepta cinco tareas `ACTIVE` sin contar
las que declaran `waiting`, y un test lo prueba. El plan v4 vive en
`docs/north-star/12-plan-hacia-la-north-star.md`, con sus fechas optimista, probable y
pesimista, el camino crítico y una aceptación propia por tarea. T-0039, T-0040 y T-0041
existen como contratos. T-0032 sigue `BLOCKED` y T-0036 sigue `DRAFT`.

## Non-scope

- Implementar T-0039, T-0040 o T-0041.
- Cambiar el estado de T-0032 o T-0036.
- Resolver D-0043, que sigue `OPEN`.
- Comprometer en ciclos de Linear el trabajo posterior al ciclo 5.

## Verification

```bash
pnpm check
pnpm decisions
node --test scripts/tests/check-docs-wip.test.mjs
```

- [ ] El owner aprueba D-0080 a D-0084 en la revisión del PR.
- [ ] El owner confirma que el plan publicado es la versión que quiere seguir.
