---
id: T-0055
title: Fijar las consultas y el corte de datos de la semana de prueba
kind: CHORE
status: ACTIVE
workstream: BOS
riskClass: LOW
size: S
created: 2026-11-11
contextRefs: [docs/north-star/12-plan-hacia-la-north-star.md, SLICES/VS01.md, TASKS/T-0037-datos-vivos-y-planes.md, TASKS/T-0054-aceptar-c6.md]
decisionRefs: [D-0089]
---

> 2026-11-12: C4-03b quedó hecho (T-0056 y T-0057), así que la consulta 13 ya se resuelve en
> Broker OS. Falta la confirmación del owner y el refresco de datos de `T-0037`.

## Why

E2-02 del plan: antes de la semana sin Zoho CRM (E2-03) hay que fijar qué consultas se van
a medir y con qué corte de datos. El owner pidió arrancarla el 11/11/2026, con C6 aceptado.

## Outcome

`docs/migration/E2-02-consultas-semana-de-prueba.md` fija la lista de consultas
habituales, dónde se resuelve cada una en Broker OS y un registro para E2-03. El corte de
los datos es la fecha del lote, que cada pantalla ya muestra.

Quedan fuera de esta tarea, y la mantienen abierta: la confirmación de la lista por el
owner, el refresco de datos (DAT-01 y C3-06 en `T-0037`, postergado al 01/01/2027) y los
riesgos en la ficha de empresa (C4-03b), que pide la consulta 13.

## Non-scope

Correr la semana de prueba (E2-03). Construir C4-03b o C5-02c.

## Verification

- [ ] El owner confirma la lista de consultas, en el PR o en el hilo del proyecto.

```bash
pnpm check
```
