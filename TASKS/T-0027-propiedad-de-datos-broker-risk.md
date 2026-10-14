---
id: T-0027
title: Registrar la propiedad de datos entre Broker OS y Risk OS
kind: REVIEW
status: DONE
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-10-14
blockedBy: []
contextRefs: [DECISIONS/0063-aislamiento-por-contexto-q4.md, DOMAIN.md, PROJECT.md,
              decisions.yaml, DECISIONS/0050-formato-fisico-de-coverage-data.md,
              SPIKES/T-0021-formatos-y-modelo-risk-os.md,
              SPIKES/T-0021/v0/fase-15/decisiones-15a.md,
              SPIKES/T-0021/v0/fase-15/contrato/columnas-risk-transfer.csv,
              SPIKES/T-0021/v0/fase-15/contrato/columnas-risks.csv]
decisionRefs: [D-0025, D-0050, D-0063, D-0067]
---

## Why

D-0063 separa Broker OS y Risk OS en contextos con esquemas propios, pero no dice qué
dato es de quién. EMI-18 lo pide antes de que exista `contexts/risk`, para no duplicar
dominio ni acoplar los sistemas antes del cierre de Q4. El único solapamiento real está
en `risk-transfer.csv`, que estructura cobertura y eventos de póliza que en Broker OS son
de `Policy` y de un `coverageData` opaco. El owner decidió los cuatro puntos de la
propuesta el 2026-10-14. Esta tarea los registra para que el importador de los tres CSV
(EMI-23) sepa qué valores aceptan `organizacion_id`, `poliza_ref` y los eventos de póliza.

## Outcome

D-0067 existe en `decisions.yaml` con su ADR,
`DECISIONS/0067-propiedad-de-datos-broker-risk.md`. El ADR tiene el inventario de
propiedad por concepto, la regla de autoridad única y proyecciones locales, las
decisiones sobre `DOMAIN.md`, cobertura y hechos de póliza, y `organizacion_id` y
`poliza_ref`, y dice que no autoriza datos reales.

`DOMAIN.md` §3 tiene un estado de modelado para conceptos cuyo modelo es de otro
contexto. `RiskAssessment` (§46) y `EnterpriseRisk` (§76) están en ese estado y apuntan a
los contratos de T-0021, sin incorporar el modelo de Risk OS. `PROJECT.md` §4 nombra que
no hay flujos de datos entre Broker OS y Risk OS en Q4.

Los contratos de T-0021 no cambian, y ninguna decisión `OPEN` queda resuelta.

## Non-scope

- No hay código, esquema, migraciones ni `contexts/risk`.
- No se autoriza usar ni almacenar datos reales en Risk OS (R-19). D-0062 no se extiende.
- No se resuelve D-0025: la evaluación de transferencia de Risk OS no estructura la
  cobertura de `PolicyVersion`.
- No se define la integración, la reconciliación de identidades ni contratos entre
  contextos: se deciden al cierre de Q4.
- No se tocan los contratos ni los CSV sintéticos de T-0021.

## Verification

```bash
pnpm check
pnpm decisions
git diff --check
git diff --name-only origin/main -- SPIKES/
```

- [ ] El owner confirma que el ADR y el `statement` de D-0067 reflejan sus decisiones A
      a D del 2026-10-14, incluidas sus precisiones en B y C y la regla general.
- [ ] El owner confirma que `DOMAIN.md` §46 y §76 identifican a Risk OS como dueño sin
      incorporar su modelo, y que ninguna decisión `OPEN` quedó resuelta por redacción.

## Notes

- Propuesta y decisiones: hilo de EMI-18 en el proyecto, 2026-10-14. La propuesta no se
  versiona; lo que decidió el owner está en el ADR.
