---
id: T-0053
title: Interlocutores del siniestro
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-11-11
contextRefs: [DOMAIN.md, docs/north-star/prototipo/pruebas/r4-r5-r6.js, TASKS/T-0050-siniestros-por-etapas.md]
decisionRefs: [D-0022, D-0089]
---

## Why

Aceptar C6 con el recorrido R6 pide los interlocutores del siniestro: Pilar ve con quién
habla en cada siniestro, quién de Del Campo lo atiende, cuándo fue el último contacto y qué
falta. Es la segunda de las piezas que el owner eligió construir antes de aceptar C6.

## Outcome

Un siniestro tiene interlocutores: rol (cliente, compañía, perito, taller, liquidador,
abogado, tercero u otro), nombre, teléfono o correo, responsable interno, último contacto y
pendiente; sin pendiente se muestra «Sin intervención». Desde el siniestro se suma un
interlocutor, se registra un contacto de hoy con lo que se habló y se cambian el pendiente
y el responsable. Todo queda en la historia de la gestión. Se ve y se escribe con la misma
regla que la gestión, y el responsable tiene que ver al cliente.

El interlocutor no es una Party ni una entidad de DOMAIN: es un dato de trabajo del
siniestro, como un requisito.

## Non-scope

Borradores y envíos a terceros, último contacto anotado solo al enviar, vincular un
interlocutor a una persona de la base, y notificaciones.

## Data effects

Migración `0018_siniestro_interlocutores.sql`: tabla `service_case_contact` con RLS y el
evento INTERLOCUTOR en `service_case_event`. No toca datos existentes. La aplica el owner
con `pnpm db:migrate`; la inversa está en `down/`.

## Verification

```bash
node --test packages/db/src/claim-contact.integration.test.ts
node scripts/aceptacion/c6-recorridos.mjs
pnpm check
```
