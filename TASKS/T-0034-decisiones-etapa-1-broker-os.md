---
id: T-0034
title: Registrar las decisiones del owner que habilitan la etapa 1 de Broker OS
kind: REVIEW
status: READY
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-11-02
blockedBy: []
contextRefs: [PROJECT.md, decisions.yaml, ENGINEERING_RULES.md, SLICES/CO01.md,
              DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0066-credencial-compartida-co01.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md,
              DECISIONS/0069-acceso-por-persona-risk-os.md,
              DECISIONS/0070-preparacion-asistida-datasets-risk-os.md]
decisionRefs: [D-0062, D-0063, D-0066, D-0067, D-0069, D-0070]
---

## Why

La etapa 1 del plan de paso a producción (identidad única, correspondencia empresa ↔
organización y datos vivos) choca con decisiones provisionales o sin registrar:
D-0063 y D-0067 se deciden al cierre de Q4; D-0066 y D-0069 sostienen dos esquemas de
acceso distintos del Google de VS01; D-0062 deja datos reales en planes gratuitos;
Communication OS ya recibe mensajes de clientes sin una decisión que amplíe el alcance
aceptado de CO01; y R-19 no autoriza todavía el envío de datos a LLM externos fuera de
D-0070. Sin estas decisiones, T-0035 a T-0037 no se pueden empezar.

## Outcome

`decisions.yaml` y `DECISIONS/` registran la decisión del owner sobre cada punto:
el estado de D-0063 y D-0067 al cierre de Q4 y la regla de correspondencia empresa ↔
organización evaluada; el esquema único de acceso que reemplaza a D-0066 y D-0069;
el alcance de clientes en CO01 (U1); los proveedores, modelos y datos permitidos para
LLM externos en el relevamiento (extensión de D-0070 bajo R-19); y el plan para D-0062.
Cada decisión nueva o revisada tiene `falsified_by` o `unblocked_by` según su estado.

## Non-scope

- Resolver D-0022: lo resuelve el spike T-0002.
- Resolver D-0025 (representación de la cobertura); se decide antes del corte C9.
- Decisiones AD-11 a AD-17 de la etapa 2 en adelante.
- Implementar cualquier cambio de código o de configuración.

## Verification

```bash
pnpm check
pnpm decisions
```

- [ ] El owner aprobó por escrito cada decisión registrada (review del PR).
- [ ] Ninguna decisión `OPEN` se resolvió sin ADR.
