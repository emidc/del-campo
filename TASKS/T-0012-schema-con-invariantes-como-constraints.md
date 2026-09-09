---
id: T-0012
title: Crear el schema de VS01 con las invariantes como constraints de Postgres
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: L
created: 2026-09-08
blockedBy: [T-0010, T-0011]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md]
decisionRefs: [D-0001, D-0004, D-0005, D-0006, D-0012, D-0013, D-0025]
---

## Why

Es el primer commit de código de aplicación de Broker OS, y arranca por las invariantes
a propósito: son la parte de `DOMAIN.md` más cara de retrofitear y la más fácil de
verificar objetivamente. Un test que intenta insertar dos `PolicyVersion` solapadas y
recibe un error **de la base** es evidencia real, no un test escrito para pasar. Es
además la primera observación externa genuina del programa.

## Outcome

Existe el schema del subconjunto de §63 —`Party` con `mergedIntoPartyId` y `status`,
`PersonProfile`, `OrganizationProfile`, `PartyRole`, `ContactPoint`, `Insurer` con su
tabla de alias, `Policy`, `PolicyVersion`, `DocumentLink` y el `User` mínimo que decida
`SLICES/VS01.md`— con las invariantes INV-PV-001 a INV-PV-006 e INV-001 a INV-005
expresadas como constraints de Postgres donde son expresables, y documentadas con su
motivo donde no lo son.

Los tests de integración **intentan violarlas** contra un Postgres real y esperan el
rechazo de la base: intervalos de `PolicyVersion` solapados, más de una versión abierta
por póliza, dos `PartyRole` activos para el mismo par, ciclos de merge.

Las migraciones son SQL y son la fuente de verdad del schema; los tipos se derivan de
la base. La migración es reversible contra base local.

`pnpm check` incorpora acá typecheck, lint y tests, que T-0010 dejó configurados y
ejecutables por comando propio. Las tres comprobaciones de canario de T-0010 se repiten
sobre el check ya cableado: un error de tipo, una violación de límite de módulo y un test
que falla tienen que poner `pnpm check` en rojo, y se eliminan después de comprobarlo.

## Non-scope

- No hay importador, ni búsqueda, ni UI, ni endpoints.
- No hay autorización: `D-0022` sigue abierta y VS01 es interno y de solo lectura.
- No se modela `coverageData` más allá de lo que `D-0025` permite sostener sin decidirla.
- No se crean entidades del subconjunto DEFERRED de `DOMAIN.md`: `RiskObject`, `Quote`,
  `Issuance`, `Claim`, `Commission`, `RiskAssessment`.
- No se crea `PortfolioAssignment` ni `PortalGrant`: `D-0027` depende de `D-0022`.
- No se reabre la elección de dónde vive el schema: la tomó T-0010.

## Verification

```bash
pnpm check
```

Comprobaciones humanas:

- [ ] Cada test negativo falla si se retira la constraint que lo cubre: se comprueba
      retirándola y volviéndola a poner.
- [ ] Cada invariante de `DOMAIN.md` §67 aplicable al subconjunto está cubierta por una
      constraint o tiene escrito por qué no puede estarlo.
- [ ] La migración corre hacia adelante y hacia atrás sobre una base local limpia.
- [ ] `pnpm check` queda en rojo ante un error de tipo, una violación de límite de
      módulo y un test que falla, comprobado con los tres canarios.
- [ ] `INV-003`, que no es expresable como constraint, tiene escrito su mecanismo
      —trigger o comprobación recursiva— y su test negativo.
- [ ] Ninguna decisión `OPEN` quedó resuelta de hecho por una elección de schema.

## Data effects

Crea el schema en base local. Ningún dato real de clientes en esta tarea, R-19.
Reversible por la migración inversa y revirtiendo el PR.

## Notes

**Inputs requeridos — bloquean el pase a `READY`.**

- **Q-12 · ¿Cómo se guarda `coverageData` sin decidir `D-0025`?** `D-0025` está `OPEN` y
  su `unblocked_by` es VS01: no debe resolverse en esta tarea. La opción que preserva la
  decisión es guardar la cobertura como bloque opaco con su linaje de origen, sin
  estructurar ningún campo, y dejar que T-0013 y el uso real produzcan la evidencia. Si
  preferís estructurar algo desde el principio, eso **es** resolver `D-0025` y exige ADR
  antes de esta tarea, no dentro de ella.

Q-5 respondida en T-0010: el schema vive en migraciones SQL, y las constraints se
escriben directamente donde se leen. Q-7 respondida: el cableado de typecheck, lint y
tests a `pnpm check` es de esta tarea y está en su `## Outcome`.

**Dispara ADR** por R-05: cambio de schema en un agregado central, `Party` y `Policy`.

**Permisos, y conviene saberlo antes de empezar.** Los tests de integración de R-26 piden
un Postgres real en CI, y eso se declara como servicio dentro del workflow. Es decir que
esta tarea **toca `.github/workflows/`**: R-13 exige aprobación humana y el agente tiene
la escritura denegada. La consecuencia práctica es que la primera tarea con código de
aplicación necesita una compuerta humana adicional a la del merge, y el agente propone
ese diff en vez de aplicarlo. Extender `pnpm check` no la necesita; agregar el servicio
de Postgres sí.
