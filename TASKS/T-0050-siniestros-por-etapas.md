---
id: T-0050
title: Siniestros por etapas con requisitos
kind: FEATURE
status: DONE
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-11-11
contextRefs: [DOMAIN.md, docs/north-star/12-plan-hacia-la-north-star.md, TASKS/T-0045-gestiones-manuales.md]
decisionRefs: [D-0022, D-0089]
---

## Why

C6-02a del plan: un siniestro recorre sus etapas con trazas. El owner lo eligió el
11/11/2026 después del inicio con indicadores.

## Outcome

Una gestión de tipo Siniestro tiene etapa: Denuncia, Documentación, Inspección o peritaje,
Liquidación, Pago o rechazo y Cierre. Nace en Denuncia con requisitos de fábrica por etapa,
y se pueden agregar otros a la etapa actual. Avanzar es de a una etapa y sólo con los
requisitos de la actual cumplidos; volver es de a una. La base hace cumplir las dos reglas.
Cada avance y cada requisito cumplido quedan en la historia. La lista de gestiones muestra
la etapa.

Claim sigue sin entidad propia (DOMAIN §42): es una gestión con etapa, sin interlocutores,
documentos ni borradores a terceros todavía.

## Non-scope

Interlocutores (compañía, perito, taller), documentos del siniestro, borradores a terceros,
números de siniestro de la compañía y cualquier comunicación externa.

## Data effects

Migración `0015_siniestro_etapas.sql`: columna `claim_stage` en `service_case`, tabla
`service_case_requirement`, triggers de etapa inicial, requisitos de fábrica y cambio de
etapa, y eventos ETAPA y REQUISITO. Los siniestros ya existentes pasan a Denuncia con sus
requisitos. La aplica el owner con `pnpm db:migrate`; la inversa está en `down/`.

## Verification

```bash
node --test packages/db/src/service-case.integration.test.ts
pnpm check
```
