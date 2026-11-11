---
id: T-0048
title: Renovaciones derivadas de las pólizas vigentes
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-11-11
contextRefs: [DOMAIN.md, docs/north-star/12-plan-hacia-la-north-star.md, TASKS/T-0045-gestiones-manuales.md]
decisionRefs: [D-0007, D-0034, D-0089]
---

## Why

C6-02b del plan: las renovaciones próximas tienen que salir de las pólizas vigentes sin
cargarlas a mano. El owner lo eligió el 11/11/2026 como lo siguiente después de asignar
gestiones (T-0046).

## Outcome

`/renovaciones` lista las pólizas cuya versión vigente termina en una ventana (vencidas de
los últimos 60 días, próximos 30, 31 a 60 y 61 a 90), con modo automático o manual y un
estado derivado: renovada (tiene sucesora en Broker OS), con gestión (tiene una gestión de
renovación abierta) o pendiente. Desde cada fila se crea la gestión de renovación con el
formulario completo. Renewal sigue siendo una vista (DOMAIN §34–35): el seguimiento vive en
la gestión, sin tabla nueva. RLS decide qué pólizas ve cada persona.

## Non-scope

Renovar automáticamente, pedir cotizaciones a las compañías, crear gestiones en lote,
métricas de retención y reconstruir la cadena de renovaciones de Zoho.

## Data effects

Ninguno: sólo lectura de `policy`, `policy_version` y `service_case`, sin migración.

## Verification

```bash
node --test packages/db/src/renewal.integration.test.ts
pnpm check
```
