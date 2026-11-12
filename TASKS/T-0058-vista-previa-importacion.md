---
id: T-0058
title: Mostrar la vista previa de un lote de riesgos sin escribir (C5-01)
kind: FEATURE
status: DONE
workstream: BOS
riskClass: LOW
size: S
created: 2026-11-12
blockedBy: []
contextRefs: [docs/north-star/12-plan-hacia-la-north-star.md, docs/north-star/05-contratos-de-integracion.md]
decisionRefs: []
---

> Lectura elegida para C5-01: la vista previa va en la importación que ya existe (T-0029, tres
> CSV, línea de comandos), no en una pantalla nueva ni en el formato de un solo CSV del prototipo.
> E2-01 (contrato de C5) no está escrito; esta tarea no lo adelanta.

## Why

Antes de importar un lote de evaluaciones a Risk OS, quien importa tiene que ver qué va a
cambiar y qué está mal sin escribir nada, y poder no seguir (C5-01). Hoy la única forma de
saberlo es importar.

## Outcome

`pnpm --filter @del-campo/risk run import <carpeta> --vista-previa` valida el lote contra lo que
ya está en Risk OS, escribe las filas dentro de la transacción y la revierte. El informe dice los
riesgos nuevos, los riesgos que ya están y reciben filas, las filas por tabla y los rechazos y
avisos; un lote inválido sale rechazado como hoy. No queda ninguna fila ni registro de lote, y
el mismo lote se puede importar después.

## Data effects

Ninguno. La vista previa abre una transacción que siempre se revierte; puede consumir valores
de secuencias.

## Non-scope

- Pantalla de importación en Risk OS.
- Reimportación con IDs estables (C5-02a) y aceptación de lo importado (C5-02c).

## Verification

```bash
pnpm check
node --import ./scripts/guard-db-tests.mjs --test contexts/risk/src/application/importar.integration.test.ts
```

- [x] Un lote válido y uno inválido en vista previa no dejan filas (`C5-01: vista previa`).
