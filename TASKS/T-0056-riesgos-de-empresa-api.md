---
id: T-0056
title: Entregar los riesgos de una empresa a Broker OS con el token entre contextos (C4-03a)
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-11-11
blockedBy: [T-0036]
contextRefs: [docs/desarrollo/riesgos-en-la-ficha.md, DECISIONS/0071-integracion-por-api-y-correspondencia-de-empresas.md]
decisionRefs: [D-0071, D-0077]
---

## Why

La ficha de empresa de Broker OS tiene que mostrar los riesgos de Risk OS (C4-03b). Para eso
Risk OS necesita una lectura por empresa que respete su propia admisión, su matriz y sus
asignaciones, y un endpoint que la entregue a Broker OS con el token de D-0077.

## Outcome

`GET /api/entre-contextos/empresas/[empresa]/riesgos` en Risk OS responde, con un token de
Broker OS válido y de un solo uso, `sin_vinculo`, `pendiente` o la lista de riesgos de la
organización vinculada y verificada, en el orden del ranking y sin `C_raw` ni el vector. Una
organización que la persona no tiene asignada responde como `sin_vinculo`. Sin token válido,
401 sin tocar la base; en `legacy`, 404; sin `RISK_JWKS_BROKER`, 503. Diseño:
`docs/desarrollo/riesgos-en-la-ficha.md` §2.

## Data effects

Ninguna migración. El endpoint lee y deja en `registro_acceso` el acceso a resultados, como la
lista; un token rechazado o repetido queda en `evento_auditoria`.

## Non-scope

- El cliente de Broker OS y la sección de la ficha (C4-03b).
- Configurar `RISK_JWKS_BROKER` en producción.

## Verification

```bash
pnpm check
node --import ./scripts/guard-db-tests.mjs --test apps/risk/src/lib/llamada.integration.test.ts
```
