---
id: T-0019
title: Asociar referencias documentales con su Policy de pertenencia
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-09-21
blockedBy: [T-0012]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, ENGINEERING_RULES.md]
decisionRefs: [D-0034, D-0045, D-0051, D-0054]
---

## Why

VS01 debe explicar una ausencia documental conocida sin confundir la Policy a la que
pertenece la referencia con el destino que esa referencia intenta resolver.

## Outcome

El schema asocia inequívocamente una referencia documental con una única Policy de
pertenencia mediante integridad referencial, separada de
`ExternalReference.resolvedTargetType/resolvedTargetId`. La asociación conserva en
`ExternalReference` el origen inmutable, el estado de resolución y
`unresolvedReason` conforme a D-0034. La decisión física queda registrada en un ADR.
La migración es reversible y las pruebas sintéticas cubren la asociación válida, sus
restricciones y la independencia entre pertenencia y destino.

## Non-scope

- Sin consumir la asociación desde las consultas de T-0016.
- Sin importar datos, acceder a Drive ni vincular documentos reales.
- Sin convertir `ExternalReference` en una relación polimórfica genérica ni decidir
  asociaciones para recursos distintos de Policy y referencias no documentales.
- Sin modificar la semántica de resolución, el origen inmutable o los motivos de
  D-0034.

## Verification

```bash
pnpm db:reset
pnpm db:down
pnpm db:migrate
pnpm check
```

- [ ] Una referencia documental se asocia a exactamente una Policy de pertenencia y
      puede conservar un destino resuelto distinto.
- [ ] PostgreSQL rechaza Policies o ExternalReferences inexistentes y una segunda
      Policy de pertenencia para la misma referencia.
- [ ] Una referencia no resuelta conserva origen y `unresolvedReason` sin fabricar un
      destino.
- [ ] La secuencia `up → down → up` deja el ledger y el schema consistentes.

## Data effects

Agrega una migración de schema sobre PostgreSQL local y su inversa. No carga datos de
negocio. Las pruebas escriben únicamente fixtures sintéticas dentro de transacciones
descartables. La reversión elimina sólo la estructura nueva después de comprobar que
no contiene asociaciones que deban preservarse.

## Notes

Creada a partir del STOP de la revisión ciega de T-0016. El owner confirmó el
21/09/2026 que la Policy de pertenencia es un eje distinto del destino que la
referencia intenta resolver, y que esta dependencia se integra antes de que T-0016 la
consuma. T-0016 permanece sin merge hasta cerrar sus hallazgos y repetir R-33.

La primera revisión ciega de T-0019 quedó en STOP: detectó que la asociación inicial
imponía sólo cardinalidad `0..1` y aceptaba referencias no documentales. La corrección
define `POLICY_DOCUMENT` como discriminador físico y exige participación total mediante
constraints diferibles. La política de reasignación se mantiene fuera de esta tarea;
debe gobernarse antes de importar datos.
