---
id: T-0054
title: Aceptar C6 con los recorridos R1 a R6
kind: REVIEW
status: DONE
workstream: BOS
riskClass: LOW
size: S
created: 2026-11-11
contextRefs: [docs/north-star/12-plan-hacia-la-north-star.md, docs/north-star/prototipo/pruebas/r1-manuel.js, docs/north-star/prototipo/pruebas/r2-evangelina.js, docs/north-star/prototipo/pruebas/r4-r5-r6.js, scripts/aceptacion/c6-recorridos.mjs]
decisionRefs: [D-0089]
---

## Why

C6-03b del plan: aceptar C6 cuando los recorridos pasan contra el servidor. El owner eligió
construir antes lo que faltaba (tareas, T-0052; interlocutores del siniestro, T-0053) y, el
11/11/2026, dejar la facturación a compañías fuera de C6: Commission sigue DEFERRED en
DOMAIN §45 y lo que pide R5 (ARCA, Drive, envío a compañías) tiene efecto externo.

## Outcome

C6 queda aceptado con la parte de C6 de R1, R2, R4 y R6 recorrida en un navegador contra
el servidor local, con datos sintéticos y cuatro integrantes de roles distintos. Lo que no
cubre C6 queda listado por la propia prueba: R3 (alta asistida y tareas desde un correo),
R5 (facturación) y las piezas de skills, notificaciones, WhatsApp y Risk OS de los otros
recorridos.

## Non-scope

Facturación a compañías, que espera su propio POC cuando se entienda el flujo de
comisiones. Observar C6 con datos reales, que es E2-02 y la semana de prueba.

## Verification

```bash
node scripts/aceptacion/c6-recorridos.mjs
```

Evidencia en `ops/evidence/T-0054.md`.
