---
id: T-0036
title: Modelar la organización evaluada de Risk OS y su correspondencia con la empresa (C2)
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-11-02
blockedBy: [T-0032, T-0034]
contextRefs: [DOMAIN.md, SLICES/RO01.md, DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md]
decisionRefs: [D-0063, D-0067]
---

## Why

D-0067 decide que Risk OS conserva su propia organización evaluada (sector, tamaño,
unidades), pero hoy solo existe `organizacion_id` como texto opaco en `risk.riesgo`. La
north star v25 muestra Riesgos solo dentro de la ficha de empresa y usa zonas para el
layout y la inspección. Sin una entidad y una correspondencia explícita, el corte C4 no
puede proyectar los riesgos en la empresa de Broker OS.

## Outcome

Risk OS tiene una entidad de organización evaluada con sector, tamaño y zonas, y existe
una correspondencia explícita empresa ↔ organización según la regla registrada en
T-0034, sin copiar identidades internas en contra de D-0067.

## Non-scope

- Mostrar riesgos en la interfaz de Broker OS (corte C4).
- Relevamiento e inspección (corte C7).
- Sincronización automática entre contextos.

## Verification

```bash
pnpm check
```

- [ ] Una empresa real de las aceptadas en RO01 queda vinculada a su organización evaluada, revisado por el owner.
