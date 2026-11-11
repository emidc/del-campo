---
id: T-0051
title: Cotizaciones con propuestas por compañía
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-11-11
contextRefs: [DOMAIN.md, docs/north-star/12-plan-hacia-la-north-star.md, TASKS/T-0045-gestiones-manuales.md]
decisionRefs: [D-0022, D-0089]
---

## Why

C6-02c del plan: una cotización se registra y se sigue hasta su resultado. Es lo último
de C6 antes de aceptar los recorridos R1 a R6. El owner pidió avanzar el 11/11/2026.

## Outcome

Una gestión de tipo Cotización se pide a una o más compañías activas, una propuesta por
compañía. Cada propuesta pasa de Pedida a Cotizada (prima, moneda, hasta cuándo vale y una
nota) o a No cotiza. El cliente elige a lo sumo una propuesta cotizada, y la elección se
puede deshacer. La base hace cumplir una propuesta por compañía, prima en toda propuesta
cotizada o elegida, una sola elegida y propuestas sólo en cotizaciones. Cada pedido,
respuesta y elección queda en la historia. La lista de gestiones muestra cuántas
cotizaron o cuál eligió el cliente.

Quote y QuoteOption siguen sin entidad propia (DOMAIN §39 y §40): son la gestión y sus
propuestas.

## Non-scope

Pedir la cotización a la compañía por sistema o correo, documentos de la propuesta,
coberturas detalladas, emisión desde la propuesta elegida (Issuance) y el indicador K-14.

## Data effects

Migración `0016_cotizacion_propuestas.sql`: tabla `service_case_quote_option`, trigger
que la limita a cotizaciones y evento PROPUESTA. No toca datos existentes. La aplica el
owner con `pnpm db:migrate`; la inversa está en `down/`.

## Verification

```bash
node --test packages/db/src/service-case.integration.test.ts
node --test packages/api/src/gestiones/prima.test.ts
pnpm check
```
