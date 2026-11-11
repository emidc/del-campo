---
id: T-0045
title: Crear, seguir y cerrar gestiones manuales en Broker OS
kind: FEATURE
status: DONE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-11-11
blockedBy: []
contextRefs: [DOMAIN.md, packages/db/migrations/0007_identidad_y_autorizacion.sql,
              packages/db/migrations/0009_alcance_empresa_y_persona.sql]
decisionRefs: [D-0022]
---

## Why

El equipo sigue sus siniestros, endosos, cotizaciones, renovaciones y reclamos en Zoho.
Para que Broker OS sea útil sin abrir Zoho, el owner eligió el 11/11/2026 empezar por
las gestiones manuales (C6-01): crear una gestión desde la ficha del cliente o de la
póliza, seguirla y cerrarla.

## Outcome

Una persona con acceso a un cliente crea una gestión (tipo, título, póliza opcional,
vencimiento, nota), la ve en `/gestiones`, le agrega notas, le cambia el estado, la toma
como responsable y la cierra con un resultado. La historia queda sólo de alta. Lo que se
ve y se escribe lo decide RLS con el mismo alcance que el cliente (D-0022): un Operador
sólo sus clientes, el Administrador todo, el Revisor nada.

## Non-scope

Asignar a otra persona, adjuntos, recordatorios, notificaciones, importar gestiones de
Zoho y modelar el siniestro (`Claim`, DOMAIN.md §42, sigue sin modelar).

## Data effects

Migración `0013_gestion.sql`: dos tablas nuevas (`service_case`, `service_case_event`),
una función de trigger y `authz.correo_integrante`. No toca datos existentes. La aplica
el owner en producción con `pnpm db:migrate`.

## Verification

```bash
pnpm db:migrate
node --test packages/db/src/service-case.integration.test.ts
pnpm check
```
