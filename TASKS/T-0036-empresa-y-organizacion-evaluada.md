---
id: T-0036
title: Modelar la organización evaluada de Risk OS y su correspondencia con la empresa (C2)
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-11-02
blockedBy: []
contextRefs: [DOMAIN.md, SLICES/RO01.md, DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md,
              DECISIONS/0071-integracion-por-api-y-correspondencia-de-empresas.md]
decisionRefs: [D-0063, D-0067, D-0071, D-0084]
---

## Notas de implementación

Resuelto antes del esquema (pendientes de D-0071):

- **Cardinalidad:** una empresa tiene como mucho una organización evaluada; los
  establecimientos son zonas de la misma organización. Lo eligió el owner sobre la
  recomendación de D-0071, en el hilo de C4-03b (2026-11-11).
- **Dónde se vincula:** por ahora con la CLI `organizacion` de Risk OS, con el id de la
  empresa copiado de Broker OS (la segunda opción de D-0071).
- El owner pidió seguir con esta tarea en local mientras T-0032 cierra su aceptación.

Efecto en datos: migración aditiva 0011 en la base de Risk OS, con tres tablas nuevas, vacías
y de sólo inserción; no cambia ninguna existente. Los tests están en
`contexts/risk/src/application/organizacion-evaluada.integration.test.ts`. Diseño:
`docs/desarrollo/riesgos-en-la-ficha.md` §1.

## Why

D-0067 decide que Risk OS conserva su propia organización evaluada (sector, tamaño,
unidades), pero hoy solo existe `organizacion_id` como texto opaco en `risk.riesgo`. La
north star v25 muestra Riesgos solo dentro de la ficha de empresa y usa zonas para el
layout y la inspección. Sin una entidad y una correspondencia explícita, el corte C4 no
puede proyectar los riesgos en la empresa de Broker OS.

## Outcome

Risk OS tiene una entidad de organización evaluada con sector, tamaño y zonas, y existe
una correspondencia explícita empresa ↔ organización según D-0071: cada organización
evaluada se vincula como mucho con una empresa, a mano, por una persona autorizada, con el
id de la empresa como referencia opaca sin clave foránea, y puede quedar pendiente. Antes
del esquema, el owner confirma si una empresa admite más de una organización evaluada.

## Non-scope

- Mostrar riesgos en la interfaz de Broker OS (corte C4).
- Relevamiento e inspección (corte C7).
- Sincronización automática entre contextos.

## Verification

```bash
pnpm check
```

- [ ] Una empresa real de las aceptadas en RO01 queda vinculada a su organización evaluada, revisado por el owner.
