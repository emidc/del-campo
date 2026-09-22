# Revisión ciega final de T-0016

**Workstream:** BOS

**PR:** #23, `task/T-0016-busqueda-y-consulta-vs01` contra `origin/main`

**Base revisada:** `06851732d6112e4cf92d61f8394ffd933f7ddd1c`

**HEAD revisado:** `65e6643ae471055a8d9a719216528b709f75f28f`

**Procedimiento:** R-33 / D-0048 / D-0052

**Veredicto:** **PASS**

## Orden de revisión

El contrato de `TASKS/T-0016-busqueda-y-consulta-vs01.md` se leyó primero desde
`origin/main`. Luego se consultaron R-33, `DOMAIN.md` §63, §65 y §74,
`SLICES/VS01.md` §2 y las decisiones aplicables. Después se inspeccionó el diff completo
contra `origin/main`, tests incluidos, excluyendo `ops/evidence/**` y
`REVIEWS/T-0016/**`.

Las conclusiones preliminares se congelaron en `/private/tmp/T-0016-preliminary.md`
antes de auditar `ops/evidence/T-0016.md` y el reporte previo. La auditoría posterior no
cambió el veredicto preliminar.

## Verificación independiente previa a Evidence

La primera ejecución literal de `pnpm check` llegó hasta los tests de integración y
falló porque el worktree no tenía `DATABASE_URL`; no fue un fallo funcional. Después de
confirmar el PostgreSQL local y sus migraciones se ejecutó:

```bash
DATABASE_URL=postgres://localhost:5432/delcampo_dev pnpm check
```

Resultado: exit `0`; documentación, AgentRun, typecheck y lint en verde; **81 tests de
paquetes pasaron**, incluidos 21 casos de T-0016.

También se verificó independientemente:

- rechazo de criterios vacíos, `asOf` inválido y `membershipAt` sin zona;
- ausencia de residuos sintéticos en `policy`, `person_profile` y
  `external_reference` después de los rollbacks;
- ausencia en el diff de servidor HTTP, listener, endpoint o puerto público;
- `git diff --check` limpio para implementación y contrato.

## Act on

Ninguno. No se encontró un defecto de corrección, pérdida de datos ni incumplimiento del
contrato que deba resolverse antes del merge.

## Consider

### C1 · Validar también la fecha calendario de `membershipAt` antes de consultar

`assertZonedInstant` exige forma ISO con `Z` u offset y usa `Date.parse`, pero JavaScript
normaliza fechas imposibles como `2026-02-30T12:00:00Z`. PostgreSQL real rechaza ese
valor al convertirlo a `timestamptz`, por lo que el camino soportado no lo acepta
silenciosamente; aun así, una validación por round-trip y un test adversarial darían un
error de aplicación consistente incluso cuando la Party consultada no existe. Es una
mejora defensiva, no un bloqueo de los casos válidos fijados por el owner.

## Noted

- `searchPolicies` devuelve `NO_RESULTS` para cero coincidencias y siempre
  `CANDIDATES` para una o varias, sin `selectedPolicyId`, ranking ni truncamiento. Los
  siete campos de §65 y el alias de aseguradora tienen cobertura.
- Una Policy sin documentos permanece en búsqueda y detalle. Los documentos se cuentan
  con subconsultas y se consultan aparte; no existe un `INNER JOIN` que elimine la
  Policy.
- `NO_REFERENCE` se distingue de `KNOWN_UNRESOLVED`; este último conserva
  `unresolvedReason`, procedencia y destino nulo conforme a §74 y D-0054.
- La resolución canónica sigue `mergedIntoPartyId` recursivamente. La prueba cubre uno y
  varios saltos, dos Policies apuntadas históricamente a IDs perdedores, resultado con
  una sola identidad canónica y membresías deduplicadas.
- `OrganizationMembership` recibe un instante ISO zonado y compara `timestamptz`
  directamente con `[validFrom, validTo)`. Inicio exacto, instante intradía, fin exacto
  y offsets equivalentes están probados.
- El diff agrega sólo funciones internas de `packages/db`; no incorpora acceso público
  antes de T-0018.
- Las fixtures están rotuladas como sintéticas, usan `example.invalid`, corren dentro de
  transacciones revertidas y no consultan sistemas externos.

## Dismissed

### D1 · Los tres `Act on` del reporte anterior siguen abiertos

Descartado para el HEAD actual. El reporte previo revisó una versión anterior y fue
correcto al marcar STOP: faltaban canonicalización de Party, motivo documental y
semántica temporal. El diff actual incorpora las tres correcciones y pruebas causales;
la reproducción independiente pasó sobre el HEAD indicado arriba.

### D2 · La ausencia documental puede eliminar una Policy

Descartado. La consulta parte de `policy`, usa `LEFT JOIN` para versión/tomador y
subconsultas correlacionadas para documentos y referencias. Tanto búsqueda como detalle
prueban explícitamente una Policy sin `DocumentLink` ni `ExternalReference`.

### D3 · Una cadena de merges puede duplicar o perder Policies

Descartado. Cada Party tiene un único `mergedIntoPartyId`, el schema impide ciclos y el
CTE recursivo conserva el origen hasta una única canónica. La prueba adversarial de dos
saltos mantiene ambas Policies y deduplica la navegación organizacional.

### D4 · El primer `pnpm check` rojo es una regresión

Descartado. El fallo fue únicamente configuración ausente del worktree: los tres tests
de integración abortaron antes de ejecutarse. Con la URL local explícita, el comando
contractual completo pasó sin cambios de código.

## Auditoría posterior de Evidence y reporte previo

`ops/evidence/T-0016.md` conserva el run original y agrega por separado la corrección de
los tres hallazgos. El addendum registra verificación sobre `9c03471`; entre ese commit y
el HEAD revisado sólo cambió el estado de la tarea, no implementación ni tests. La
ejecución independiente actual reproduce sus 81 tests verdes y confirma rollback,
fixtures sintéticas y ausencia de superficie pública.

El reporte previo permanece útil como registro histórico del STOP inicial. No es el
veredicto del HEAD actual: las líneas y conductas que motivaron A1, A2 y A3 fueron
reemplazadas y quedaron cubiertas por tests específicos.

## Veredicto final

**PASS.** No hay `Act on`. El HEAD actual satisface el contrato de T-0016 y cierra los
tres bloqueos del STOP anterior. C1 puede atenderse en una mejora defensiva posterior
sin impedir el merge de esta tarea.
