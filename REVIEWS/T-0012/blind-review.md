# Revisión ciega independiente — T-0012

**Reviewer:** Codex, sesión independiente sin transcript ni resumen del implementador  
**Merge-base:** `d3bd14d70d45662236fdea908d65a303f56dbaff` (`main`)  
**HEAD revisado:** `e3905d327b0860e9f3e871bc871418d012ebf5cb`  
**Orden de revisión:** contrato desde `main` → dominio/decisiones/ADRs → diff → PostgreSQL y Verification → conclusiones preliminares → evidencia.  

## Conclusiones preliminares — escritas antes de leer Evidence

En este punto no se abrió `ops/evidence/T-0012.md`. `pnpm check` pasó sobre una base
reconstruida, pero las pruebas adversariales directas encontraron estados que contradicen
invariantes explícitas. El verdict preliminar es **STOP**.

### Act on

#### BR-001 — BLOCKER — INV-003 admite ciclos bajo concurrencia

- **Ubicación:** `packages/db/migrations/0001_vs01_core_schema.sql:45`, función
  `prevent_party_merge_cycle` y trigger `party_merge_cycle_guard`.
- **Requisito:** DOMAIN INV-003; TaskSpec exige que los ciclos de merge sean rechazados
  por PostgreSQL.
- **Evidencia:** dos transacciones concurrentes actualizaron extremos distintos, una
  `A → B` y otra `B → A`, antes de liberar ambos commits. Las dos promesas terminaron
  `fulfilled` y la consulta posterior devolvió ambos `merged_into_party_id` no nulos.
- **Impacto:** PostgreSQL puede confirmar una cadena cíclica aunque todos los tests
  secuenciales estén verdes. La resolución canónica deja de terminar.
- **Corrección mínima sugerida:** serializar las escrituras que puedan alterar la cadena
  con un lock transaccional estable para el grafo o un mecanismo equivalente que haga que
  una de las dos transacciones observe/rechace a la otra; agregar la reproducción
  concurrente como test.

#### BR-002 — BLOCKER — INV-PV-005/INV-013 no tienen enforcement y la historia se sobrescribe

- **Ubicación:** `packages/db/migrations/0001_vs01_core_schema.sql:286`, tabla
  `policy_version`; no hay trigger ni permisos que impidan `UPDATE`/`DELETE` histórico.
- **Requisito:** INV-PV-005, INV-013 y el Outcome que exige INV-PV-001..006 como
  constraints donde sean expresables o motivo documentado donde no lo sean.
- **Evidencia:** una versión cerrada con `premium = 100` aceptó
  `UPDATE policy_version SET premium = 999`; la lectura posterior devolvió `999`.
- **Impacto:** la pregunta contractual a fecha que justifica `PolicyVersion` puede
  cambiar retrospectivamente sin conservar el estado anterior.
- **Corrección mínima sugerida:** definir y aplicar el mecanismo PostgreSQL de
  inmutabilidad compatible con la carga inicial, o documentar explícitamente el límite
  contractual si requiere una decisión previa; agregar test negativo y causal.

#### BR-003 — BLOCKER — la identidad y la historia de Party/Prospect son mutables o borrables

- **Ubicación:** `packages/db/migrations/0001_vs01_core_schema.sql:18` y `:143`.
- **Requisito:** INV-001, INV-002, INV-004 y D-0004.
- **Evidencia:** PostgreSQL aceptó cambiar el `party.id` de una Party sin referencias;
  aceptó borrar una Party perdedora después de `A → B`; y aceptó borrar una fila de
  `party_role`. Esto contradice además la afirmación de D-0051 de que el schema no permite
  reasignar `party.id` y de que las FKs impiden borrar a la perdedora.
- **Impacto:** IDs canónicos pueden cambiar o reutilizarse y la evolución de Prospect
  puede perderse físicamente, rompiendo referencias e historia.
- **Corrección mínima sugerida:** impedir en PostgreSQL cambios de PK y borrados que
  destruyan identidad/historia para las tablas alcanzadas; agregar tests negativos y de
  causalidad. Si alguna prohibición se delega a roles/permisos futuros, el TaskSpec exige
  documentar por qué no está expresada ahora.

#### BR-004 — MAJOR — `PolicyVersion.endorsement_id` admite un Endorsement de otra Policy

- **Ubicación:** `packages/db/migrations/0001_vs01_core_schema.sql:264` y `:303`.
- **Requisito:** DOMAIN §28 y D-0037: el Endorsement que origina la versión es un evento
  de esa Policy.
- **Evidencia:** una `PolicyVersion` de P1 aceptó `endorsement_id` de un Endorsement cuya
  FK apunta a P2.
- **Impacto:** el historial puede atribuir a una póliza un cambio originado en otra.
- **Corrección mínima sugerida:** hacer cumplir el par `(endorsement_id, policy_id)` con
  FK compuesta o trigger y agregar caso negativo.

#### BR-005 — MAJOR — los triggers de kind se pueden invalidar actualizando `party.kind`

- **Ubicación:** `packages/db/migrations/0001_vs01_core_schema.sql:83`, triggers de
  `person_profile`, `organization_profile`, `organization_membership` e `insurer`.
- **Requisito:** DOMAIN §6, §10, §11, §17 y §22.
- **Evidencia:** después de crear `PersonProfile` para una Party `PERSON`, PostgreSQL
  aceptó `UPDATE party SET kind = 'ORGANIZATION'`; la fila de PersonProfile quedó unida a
  una Party ORGANIZATION. El mismo patrón alcanza a Insurer y OrganizationMembership.
- **Impacto:** estados inválidos aparecen mediante updates aunque inserts aislados estén
  validados.
- **Corrección mínima sugerida:** proteger el cambio de `party.kind` cuando existan filas
  dependientes incompatibles, o volverlo inmutable, con tests de update.

#### BR-006 — MAJOR — `DocumentLink` emula una FK sólo en insert/update y admite huérfanos

- **Ubicación:** `packages/db/migrations/0001_vs01_core_schema.sql:353`, trigger
  `document_link_resource_exists`.
- **Requisito:** DOMAIN §47 y el Outcome que incluye `DocumentLink` como vínculo a un
  recurso real.
- **Evidencia:** se creó un link a una Policy, se borró esa Policy y el `DocumentLink`
  permaneció. El trigger no observa deletes del padre.
- **Impacto:** VS01 puede conservar enlaces que afirman pertenecer a una Policy que ya no
  existe; la existencia sólo se garantiza al escribir el link.
- **Corrección mínima sugerida:** para el único `resource_type = POLICY` de VS01, usar una
  FK real o impedir el delete del padre; agregar test de borrado.

#### BR-007 — MAJOR — `coverage_data` puede existir sin el linaje exigido por Q-12

- **Ubicación:** `packages/db/migrations/0001_vs01_core_schema.sql:299`.
- **Requisito:** respuesta del owner a Q-12 y D-0050: bloque opaco con trazabilidad al
  registro y lote de origen, sin fabricar datos.
- **Evidencia:** PostgreSQL aceptó `coverage_data = {"incendio": true}` con
  `coverage_source_batch_id` y `coverage_source_record_id` ambos `NULL`.
- **Impacto:** una cobertura puede entrar al dominio sin poder rastrearse al origen, aun
  cuando el schema ya posee las columnas destinadas a hacerlo.
- **Corrección mínima sugerida:** agregar un CHECK que vincule presencia de contenido con
  ambos identificadores de linaje, preservando que los tres puedan ser `NULL` cuando el
  dato está ausente.

#### BR-008 — MAJOR — no existe migración hacia atrás

- **Ubicación:** `packages/db/src/cli.ts:118` y `:176`; sólo existen `migrate` hacia
  adelante y `reset`, que elimina la base completa y reaplica el schema.
- **Requisito:** Outcome “la migración es reversible” y Verification “corre hacia
  adelante y hacia atrás sobre una base local limpia”.
- **Evidencia:** el único archivo es `0001_vs01_core_schema.sql`; no hay down migration ni
  comando de rollback. `pnpm db:reset` demostró reconstrucción limpia, no inversión de la
  migración.
- **Impacto:** una condición literal de DONE no es ejecutable; en una base con otros
  objetos o datos, `reset` no es reversión.
- **Corrección mínima sugerida:** incorporar la inversa soportada por el runner y
  demostrar `up → down → up` sobre una base local limpia.

### Consider

- La constraint de `PolicyVersion` y el índice parcial protegen ambos la versión abierta.
  La redundancia agrega costo de escritura y mantenimiento, pero preserva INV-PV-004 si
  alguna vez se relaja el EXCLUDE; está documentada y no es por sí sola un defecto.
- El test automatizado de causalidad omite desmontar el `UNIQUE` de
  `(insurer_id, policy_number)` y el `NOT NULL` de `holder_party_id`. La revisión los
  desmontó manualmente: sin cada mecanismo la escritura inválida pasó y, restaurado por
  rollback, volvió a fallar. Conviene que la evidencia no atribuya esa causalidad a la
  suite automatizada.

### Noted

- Los intervalos `[effective_from, effective_to)` están implementados correctamente:
  versiones adyacentes con igualdad en el límite fueron aceptadas.
- Los casos secuenciales de INV-003 rechazaron self-cycle, ciclos de longitud 2 y 3;
  una cadena válida de 100 nodos y una Party canónica con destino `NULL` fueron aceptadas.
- `coverage_data` es `jsonb` nullable y sin default: la ausencia de dato sigue siendo
  distinguible de una afirmación de ausencia de cobertura.
- Las cuatro secciones congeladas del TaskSpec (`Why`, `Outcome`, `Non-scope`,
  `Verification`) no cambiaron respecto del merge-base.

### Dismissed

- **“`jsonb` resuelve D-0025 de hecho” — descartado.** El tipo valida sintaxis pero no
  impone claves ni semántica interna; D-0025 sigue OPEN. El problema real es el linaje
  opcional de BR-007.
- **“El índice parcial redundante invalida INV-PV-004” — descartado.** Con el EXCLUDE
  presente el índice no es causal, pero la invariante sí queda protegida. La causalidad
  redundante está declarada en D-0051.
- **“Los rangos prohíben límites contiguos válidos” — descartado.** La reproducción con
  fin e inicio iguales pasó, consistente con la semántica semiabierta del dominio.

## Auditoría de Evidence

Esta sección se escribió después de cerrar las conclusiones preliminares.

### Coincide con la observación independiente

- Reproduce el mismo merge-base, la reconstrucción limpia y un `pnpm check` verde.
- Las salidas de los tests negativos y de causalidad existentes corresponden al estado
  actual. Los tiempos cambian, como es esperable, pero la cantidad y los resultados
  coinciden.
- Describe correctamente la redundancia entre EXCLUDE e índice parcial para la versión
  abierta y no le atribuye causalidad ficticia al índice.
- Los tres canarios fallan por las mismas capas y códigos de salida observados de manera
  independiente.
- `## Qué NO se verificó` declara expresamente la ausencia de down migration, CI real y
  carga concurrente. La reproducción de BR-001 convierte este último límite en defecto
  confirmado.

### No coincide o es insuficiente

#### BR-009 — MAJOR — Evidence y D-0051 atribuyen cobertura inexistente

- **Ubicación:** `ops/evidence/T-0012.md:365` y
  `DECISIONS/0051-schema-vs01-invariantes-como-constraints.md:21`.
- **Requisito:** R-03, R-04, R-09b y el Outcome de T-0012.
- **Evidencia:** Evidence afirma que INV-001, INV-002, INV-004, INV-PV-005 y otras
  invariantes tienen mecanismo documentado; D-0051 afirma cobertura de INV-001..023.
  Las reproducciones BR-002/003 muestran que `party.id` y PolicyVersion son mutables y
  que Party/PartyRole pueden borrarse. D-0051 ni siquiera enumera un mecanismo para
  INV-PV-005.
- **Impacto:** la documentación canónica afirma garantías que PostgreSQL no ofrece.
- **Corrección mínima sugerida:** corregir implementación y luego alinear D-0051 y
  Evidence con los mecanismos realmente comprobados; si alguna invariante no es
  expresable en esta fase, documentar ese límite sin declararla cubierta.

#### BR-010 — MAJOR — la procedencia de Evidence no satisface R-09b

- **Ubicación:** `ops/evidence/T-0012.md:7`.
- **Requisito:** R-09b exige SHA de main, SHA de rama y los `runId` involucrados, o
  constancia explícita de que no existen.
- **Evidencia:** figura el SHA de main y el nombre de rama, pero no el SHA de la rama. La
  celda AgentRun remite al ledger sin registrar ningún valor de `runId`.
- **Impacto:** no se puede reconstruir exactamente qué commit ni qué ejecución produjo
  la salida literal.
- **Corrección mínima sugerida:** registrar el SHA exacto verificado y el/los `runId`
  concretos, sin reconstruir eventos que no hayan quedado guardados.

#### BR-011 — MAJOR — `DONE` contradice límites materiales admitidos por la evidencia

- **Ubicación:** `TASKS/T-0012-schema-con-invariantes-como-constraints.md:5` y
  `ops/evidence/T-0012.md:56`, `:355`, `:359`.
- **Requisito:** R-07/R-09 y la Verification de T-0012.
- **Evidencia:** la tarea está `DONE`, pero Evidence reconoce que no ejecutó la migración
  hacia atrás y que el cambio de CI sujeto a aprobación humana no se aplicó ni corrió.
- **Impacto:** el estado afirma Definition of Done antes de cumplir una comprobación
  literal y antes de la compuerta humana requerida por R-13 para CI.
- **Corrección mínima sugerida:** retirar `DONE` hasta corregir/verificar los findings y
  aplicar/validar el workflow mediante la intervención humana ya prevista.

#### BR-012 — MINOR — trazabilidad administrativa incompleta

- **Ubicación:** `decisions.yaml:19` y frontmatter de T-0012.
- **Requisito:** coherencia del índice y del contrato de tarea.
- **Evidencia:** `pnpm decisions` muestra las tres decisiones nuevas, pero el campo global
  `updated` sigue en `2026-09-20` y `decisionRefs` de T-0012 no incluye D-0049, D-0050 ni
  D-0051.
- **Impacto:** no cambia el comportamiento, pero dificulta rastrear desde la tarea las
  decisiones que creó.
- **Corrección mínima sugerida:** actualizar la metadata permitida sin tocar las cuatro
  secciones congeladas.

La Evidence es fiel respecto de lo que sí ejecutó y bastante explícita sobre lo que no
ejecutó. El problema es que transforma dos límites materiales en una interpretación de
DONE y presenta como cubiertas invariantes que no están enforced.

## Invariantes auditados

| Invariante | Enforcement real | Test observado | Causalidad comprobada | Resultado |
| --- | --- | --- | --- | --- |
| INV-001 | PK UUID, pero `id` admite UPDATE | Ninguno | Sin mecanismo que retirar; UPDATE pasó | **FAIL** |
| INV-002 | Estado/FK de merge, sin guard de DELETE | Ninguno | Sin mecanismo; delete de perdedora pasó | **FAIL** |
| INV-003 | Trigger recursivo + CHECK de self-cycle | Negativo secuencial de longitud 2; probes 1/2/3/100/NULL | Trigger retirado: ciclo de 2 pasó; concurrencia con trigger: ciclo pasó | **FAIL concurrente** |
| INV-004 | Intervalo de PartyRole, sin guard de DELETE | Ninguno | Sin mecanismo; delete de role pasó | **FAIL** |
| INV-005 | CHECK sólo admite `PROSPECT` | Flujo positivo con PROSPECT | No se retiró; SQL no permite CLIENT | PASS |
| INV-006 | EXCLUDE GiST por `(party_id, role, tstzrange)` | Negativo de dos roles abiertos | EXCLUDE retirado/restaurado | PASS |
| INV-007 | Columnas temporales, sin protección de historia | Ninguno | No hay mecanismo de inmutabilidad | No demostrado |
| INV-008..010 | Forma del schema: membership independiente; Policy sin Quote/Issuance; estado sólo en PolicyVersion | Flujo positivo parcial | No aplica mecanismo removible único | PASS por estructura, sin tests dedicados |
| INV-011 / PV-003 | EXCLUDE GiST por Policy y daterange `[)` | Solapamiento negativo y adyacencia positiva | EXCLUDE retirado/restaurado | PASS |
| INV-012 / PV-004 | Mismo EXCLUDE + índice parcial redundante | Dos abiertas negativo | EXCLUDE causal; índice solo no causal | PASS |
| INV-013 / PV-005 | Ninguno contra UPDATE/DELETE de versión | Ninguno | UPDATE de premium histórico pasó | **FAIL** |
| INV-014 | FK de predecesora + tabla ExternalReference, sin obligación relacional | Ninguno | No demostrado | Parcial/documental |
| INV-015 | No es enforceable por tabla; trigger sólo valida kind | Ninguno | Límite documentado | Pendiente de importador |
| INV-016 | DocumentLink guarda referencia, no bytes/ACL | Ninguno | No aplica | PASS por estructura |
| INV-017 | BusinessAuditEvent fuera del subconjunto §63 | Ninguno | No aplica | Fuera de alcance |
| INV-018 | UUID internos como PK; naturales no son PK | Flujo positivo | No aplica | PASS por estructura |
| INV-019 | ExternalReference representa unresolved, sin obligación desde Policy | Ninguno | No demostrado | Parcial/documental |
| INV-020 | UNIQUE `(insurer_id, policy_number)` | Negativo de duplicado | UNIQUE retirado: pasó; restaurado: falló | PASS |
| INV-021 | `endorsement.policy_id NOT NULL` + FK | Sin negativo dedicado | Mecanismo evidente; además se observó inconsistencia cruzada con PolicyVersion | PASS estrecho; BR-004 pendiente |
| INV-022 | Trigger de inmutabilidad de campos fuente | Negativo de UPDATE | Trigger retirado/restaurado | PASS |
| INV-023 | `holder_party_id NOT NULL` + FK | Negativo sin holder | NOT NULL retirado: pasó; restaurado: falló | PASS |
| PV-001 | `policy_id NOT NULL` + FK | Flujo positivo, sin negativo dedicado | No desmontado | PASS por constraint |
| PV-002 | UNIQUE `(policy_id, version_number)` | Sin test dedicado | No desmontado | PASS por constraint |
| PV-006 | Consecuencia del EXCLUDE `[)` | Solapamiento y adyacencia | Misma causalidad de PV-003 | PASS |

## Verification independiente

- `pnpm db:version && pnpm db:reset && pnpm check` — exit `0` fuera del sandbox:
  PostgreSQL 17; base `delcampo_dev` eliminada/recreada; migración `0001` aplicada;
  55 tests del arnés y 24 tests de paquetes en verde, typecheck y lint en verde.
- `pnpm decisions` — exit `0`: 51 decisiones, 19 ADRs; D-0022..D-0030 y D-0043
  permanecen OPEN.
- Pruebas SQL/driver descartables — confirmaron causalidad de EXCLUDE, trigger de merge,
  trigger de ExternalReference, UNIQUE de póliza y NOT NULL de holder; confirmaron los
  estados inválidos descritos en BR-001..007.
- Migración hacia atrás — **no ejecutable**: no existe comando ni artefacto inverso.

## Canarios

| Canario | Exit de `pnpm check` | Causa observada | Limpieza |
| --- | ---: | --- | --- |
| Error de tipos | 2 | TS2322 en archivo temporal de `packages/domain` | Eliminado |
| Límite de módulo | 1 | `no-restricted-syntax` R-25 por importar `node:fs` desde domain | Eliminado |
| Test fallido | 1 | AssertionError `1 !== 2` en test temporal de db | Eliminado |

## Decisiones y ADRs

- D-0049 corresponde a la dependencia `postgres`; no agrega ORM ni DSL y SQL sigue
  siendo la fuente canónica.
- D-0050 mantiene `coverage_data` opaco, nullable y sin default; D-0025 sigue OPEN. Su
  promesa de linaje no está enforced (BR-007).
- D-0051 coincide con varios mecanismos concretos, pero sobredeclara cobertura de
  invariantes (BR-009) y afirma erróneamente que las FKs impiden borrar toda Party
  perdedora.
- Ningún concepto NAMED pasó a MODELED y no hubo cambios en DOMAIN.md.

## CI pendiente

El diff propuesto agrega Postgres 17, `DATABASE_URL` a una base `_test` y
`pnpm db:migrate` antes de `pnpm check`. Es suficiente para que la suite PostgreSQL se
ejecute en el workflow existente. La diferencia material con lo verificado localmente es
macOS/Postgres nativo frente a Ubuntu/contenedor, aceptada provisionalmente por D-0046.

El workflow real no fue modificado. Una persona autorizada debe aplicar el diff, revisar
el cambio protegido por R-13/R-15 y observar un run real de GitHub Actions. Hasta eso, el
CI actual carece de `DATABASE_URL` y servicio Postgres.

## Scope audit

- `Why`, `Outcome`, `Non-scope` y `Verification`: sin cambios respecto de merge-base.
- Decisiones OPEN: D-0022..D-0030 y D-0043 siguen documentalmente OPEN; `jsonb` no cierra
  D-0025. BR-007 afecta linaje, no estructura interna de cobertura.
- DOMAIN.md: sin cambios.
- Dependencias: sólo `postgres@3.4.9`, con ADR D-0049; sin ORM/schema DSL paralelo.
- Fuera de scope: no aparecieron importador, UI, endpoints, autorización,
  PortfolioAssignment, PortalGrant ni entidades DEFERRED. El único cambio protegido es
  una propuesta bajo `REVIEWS/T-0012/`, no el workflow real.

## Estado final

- **Rama:** `task/T-0012-schema-con-invariantes-como-constraints`
- **HEAD:** `e3905d327b0860e9f3e871bc871418d012ebf5cb`
- **Merge-base:** `d3bd14d70d45662236fdea908d65a303f56dbaff`
- **`git status --short`:**

  ```text
   M ops/runs/2026-09-21.jsonl
  ?? REVIEWS/T-0012/blind-review.md
  ```

- `ops/runs/2026-09-21.jsonl` ya estaba modificado en el preflight y no fue abierto,
  limpiado ni editado manualmente durante la revisión.
- `REVIEWS/T-0012/blind-review.md` es el único artefacto creado por esta revisión, según
  R-33/T-0009.
- No quedan archivos `*canary*` ni `review-t0012-temp.mjs`; `git diff --check` pasó.
- La base local fue reconstruida al final; `pnpm check` volvió a pasar y
  `pnpm db:migrate` informó una migración registrada y ninguna pendiente.
- No se modificaron schema, tests, DOMAIN, decisiones, ADRs, TaskSpec ni workflows.
- Limitaciones: no se ejecutó GitHub Actions ni una down migration inexistente; no se
  usaron datos reales ni sistemas externos.

## Cierre en frío de la corrección

**Fecha:** 2026-09-21. **Reviewer:** sesión independiente nueva, sin transcript ni
resumen de quien implementó la corrección; sólo el repo, este reporte y
`git log c45384b..HEAD`. Rama: `task/T-0012-schema-con-invariantes-como-constraints`.
Commits revisados (`c45384b..HEAD`): `fdd9344`, `7e4050c`, `67fc5de`, `1481521`.

Metodología para cada mecanismo en base de datos: escritura inválida real vía `psql`
contra `delcampo_dev` reconstruida con `pnpm db:reset` → retirar el mecanismo
(`DROP TRIGGER`/`ALTER TABLE ... DROP CONSTRAINT`) → repetir la escritura (debe pasar)
→ restaurar el mecanismo exactamente como en
`packages/db/migrations/0001_vs01_core_schema.sql` → repetir la escritura (debe volver
a fallar). Los mensajes de commit y los tests nuevos no se usaron como evidencia; se
citan sólo como referencia de ubicación.

### BR-001 — CERRADO (concurrencia real, dos sesiones simultáneas)

Se probó con dos procesos `psql` en paralelo (no secuenciales), cada uno en su propia
transacción, con `pg_sleep` para forzar solapamiento real entre el `UPDATE` y el
`COMMIT` de cada uno.

- Con el mecanismo actual (`pg_advisory_xact_lock(7346501)` dentro de
  `prevent_party_merge_cycle`): TX1 (`A→B`) hizo commit; TX2 (`B→A`), lanzado 1s
  después y corriendo en paralelo, fue rechazado en el momento del `UPDATE`:
  `ERROR: merge cycle detected: party B cannot merge into A ... (INV-003)`. Estado
  final: sólo `A` quedó `MERGED`, ningún ciclo.
- Se reemplazó la función por una copia idéntica **sin** la línea
  `perform pg_advisory_xact_lock(...)` (`CREATE OR REPLACE FUNCTION`, mismo trigger).
  Repetido el mismo experimento con las mismas dos parties (restauradas a `ACTIVE`):
  ambas transacciones commitearon. Estado final observado:
  `A.merged_into_party_id = B` y `B.merged_into_party_id = A` simultáneamente —
  ciclo confirmado, reproduciendo exactamente el defecto original de BR-001.
- Se restauró la función exacta de la migración (con el lock) y se repitió una
  tercera vez con las mismas parties limpiadas: TX1 commiteó, TX2 volvió a ser
  rechazado con el mismo error. Causalidad confirmada en ambos sentidos.

### BR-002 / BR-003 — CERRADO (INV-001, INV-002, INV-004, INV-PV-005/INV-013)

Cuatro mecanismos, cada uno con el ciclo completo escritura inválida → retirar →
pasa → restaurar → vuelve a fallar, confirmado por `psql` directo:

- **INV-001** (`party_id_immutable`): `UPDATE party SET id = ...` rechazado con
  `party.id es inmutable (INV-001)`; con el trigger retirado, el mismo `UPDATE`
  pasó (`UPDATE 1`); restaurado, volvió a fallar con el mismo error.
- **INV-002** (`party_merged_no_delete`): `DELETE` de una Party `MERGED` sin
  referencias rechazado con `no se puede borrar una Party MERGED (INV-002)`; sin
  el trigger, el `DELETE` pasó; restaurado sobre una nueva Party `MERGED`, volvió
  a fallar.
- **INV-004** (`party_role_no_delete`): `DELETE` de un `party_role` rechazado con
  `no se puede borrar (INV-004)`; sin el trigger pasó; restaurado, volvió a fallar.
- **INV-PV-005/INV-013** (`policy_version_closed_immutable`): tanto `UPDATE
  premium` como `DELETE` sobre una `policy_version` con `effective_to` no nulo
  fueron rechazados; sin el trigger, ambos pasaron (se confirmó `SELECT premium`
  devolviendo el valor sobrescrito); restaurado, ambos volvieron a fallar. Se
  verificó además que el `INSERT` directo de una versión ya cerrada (carga
  histórica) sigue permitido, como documenta el ADR.

### BR-004 — CERRADO (FK compuesta `endorsement_id`/`policy_id`)

`INSERT` de una `PolicyVersion` de `P1` con `endorsement_id` de un Endorsement cuya
FK apunta a `P2` fue rechazado:
`violates foreign key constraint "policy_version_endorsement_matches_policy"`. Con
`ALTER TABLE policy_version DROP CONSTRAINT policy_version_endorsement_matches_policy`
el mismo `INSERT` pasó. Restaurada la FK compuesta (`FOREIGN KEY (endorsement_id,
policy_id) REFERENCES endorsement (id, policy_id)`), el mismo `INSERT` volvió a
fallar con el mismo error.

### BR-005 — CERRADO (`party.kind` inmutable con dependientes)

Con un `person_profile` dependiente, `UPDATE party SET kind = 'ORGANIZATION'` fue
rechazado (`no se puede cambiar kind ... con filas dependientes`). Con
`DROP TRIGGER party_kind_immutable_with_dependents` el mismo `UPDATE` pasó.
Restaurado el trigger, volvió a fallar sobre la misma fila.

### BR-006 — CERRADO (`document_link` no sobrevive al borrado de su Policy)

Con un `document_link` apuntando a una Policy sin otras dependencias, `DELETE` de
esa Policy fue rechazado (`no se puede borrar, tiene document_link asociados`). Con
`DROP TRIGGER policy_no_delete_with_document_links` el `DELETE` pasó y el
`document_link` quedó huérfano (confirmado con `SELECT resource_id` apuntando a un
`id` de policy ya no existente). Restaurado el trigger sobre una Policy y link
recreados, el `DELETE` volvió a fallar.

### BR-007 — CERRADO (linaje de `coverage_data`)

`INSERT` de una `PolicyVersion` con `coverage_data` no nulo y
`coverage_source_batch_id`/`coverage_source_record_id` ambos `NULL` fue rechazado
por el `CHECK policy_version_coverage_lineage`. Con
`ALTER TABLE policy_version DROP CONSTRAINT policy_version_coverage_lineage` el
mismo `INSERT` pasó. Restaurado el `CHECK`, volvió a fallar con el mismo mensaje.

### BR-008 — CERRADO (up → down → up, ejecutado por este reviewer)

Sobre `delcampo_dev` reconstruida con `pnpm db:reset`:

```
$ pnpm db:down
✓ down: 0001_vs01_core_schema.sql
$ psql delcampo_dev -c "\dt"
   -- sólo queda schema_migrations; las 14 tablas de la migración desaparecieron
$ pnpm db:migrate
✓ 0001_vs01_core_schema.sql
$ psql delcampo_dev -c "\dt"
   -- las 14 tablas + schema_migrations vuelven a existir
```

Los tres comandos salieron con exit 0. `packages/db/migrations/down/0001_vs01_core_schema.sql`
existe y su orden es el inverso estricto de creación, sin `CASCADE`.

### BR-009 — CERRADO (evidencia y D-0051 ya no declaran cobertura inexistente)

Se leyó `DECISIONS/0051-schema-vs01-invariantes-como-constraints.md` completo y
`ops/evidence/T-0012.md` (bloque de procedencia, `## Qué NO se verificó` y la nueva
sección `## Corrección tras la revisión ciega`). La tabla de mecanismos de D-0051 y
la sección de evidencia ahora atribuyen explícitamente a BR-002/003/004/005/006/007
la corrección de cada falta anterior, en vez de seguir afirmando cobertura. Se
verificó, contra los mecanismos reales probados arriba (BR-001 a BR-008), que lo que
D-0051 y la evidencia describen ahora coincide con lo que Postgres efectivamente
rechaza — no encontré ninguna afirmación de mecanismo que no haya podido reproducir.
El índice parcial redundante de INV-PV-004 fue efectivamente retirado del schema
(no aparece en `0001_vs01_core_schema.sql`) y el ADR lo documenta.

### BR-010 — CERRADO (procedencia verificable)

`ops/evidence/T-0012.md` registra `SHA de HEAD verificado al cerrar la corrección:
67fc5de269f7fd0510ce9a20bec7a335557207f1` y `runId: r_8729729c7f39980b6452`. Confirmado
con `grep r_8729729c7f39980b6452 ops/runs/2026-09-21.jsonl`: existe una línea
`RUN_STARTED` con ese `runId`, `taskId: T-0012`, `branch:
task/T-0012-schema-con-invariantes-como-constraints` y `repoSha:
c45384bd6b21b1bdc817dd612dfaf02d7a20023b` (SHA de main al momento de ese
`RUN_STARTED`, consistente con el commit del reporte de revisión ciega). El SHA de
HEAD declarado (`67fc5de`) es el commit inmediatamente anterior al que registra esta
misma corrección de BR-010 (`1481521`), lo cual es inevitable por construcción — un
commit no puede citarse a sí mismo — y el documento no pretende lo contrario. El
`runId` de la sesión que generó el reporte de revisión ciega se declara
explícitamente como no registrado, sin reconstruirlo. Procedencia verificable con las
salidas de arriba.

### BR-011 — NO APLICA (correctamente, según el propio reporte)

BR-011 era sólo de estado (`DONE` → debía bajar a algo distinto de `DONE`) y el
enunciado de esta tarea de cierre en frío lo excluye explícitamente. Confirmado que
el frontmatter de `TASKS/T-0012-schema-con-invariantes-como-constraints.md` sigue en
`status: ACTIVE`, no `DONE` — coherente con no haber sido re-cerrado antes de que un
revisor en frío corriera esta prueba de causalidad, tal como pedía la corrección
mínima sugerida de BR-011.

### BR-012 — CERRADO (trazabilidad administrativa)

`decisions.yaml` línea de cabecera: `updated: 2026-09-21` (era `2026-09-20`).
Frontmatter de T-0012: `decisionRefs: [D-0001, D-0004, D-0005, D-0006, D-0012,
D-0013, D-0025, D-0049, D-0050, D-0051]` — incluye las tres decisiones nuevas.
`pnpm decisions` sigue en verde. Sólo se tocaron frontmatter/metadata; las cuatro
secciones congeladas (`Why`, `Outcome`, `Non-scope`, `Verification`) no cambiaron
entre `c45384b` y HEAD (confirmado por inspección del diff de
`TASKS/T-0012-schema-con-invariantes-como-constraints.md`, que sólo modifica la
línea `decisionRefs`).

### Verificación completa del harness

Sobre `delcampo_dev` reconstruida (`pnpm db:reset`, exit 0):

- `pnpm check` — exit `0`. 43/43 tests en verde, incluida la suite de concurrencia
  con dos sesiones reales para BR-001 (`schema.integration.test.ts`), que reproduce
  independientemente el mismo resultado que esta revisión obtuvo por `psql` directo.
- `pnpm typecheck` — sin salida, exit `0`.
- `pnpm lint` — sin salida, exit `0`.
- `pnpm test` — mismo resultado que `pnpm check` (43/43), exit `0`.
- `pnpm db:reset` final ejecutado para dejar la base reconstruida.

### Estado del working tree al cerrar

`git status --short` mostró únicamente `M ops/runs/2026-09-21.jsonl`, que ya estaba
modificado antes de empezar esta revisión (no fue tocado por este cierre). Ningún
`ALTER`/`DROP` manual contra la base quedó pendiente: cada mecanismo retirado durante
las pruebas fue restaurado en la misma sesión de `psql`, y la base fue reconstruida
por completo al final con `pnpm db:reset`. No se modificó ningún archivo de
código/schema del repositorio.

### Resumen

12 de 12 hallazgos con veredicto: **11 CERRADO** (BR-001 a BR-010, BR-012) y **1 NO
APLICA** (BR-011, correctamente no re-cerrado — es de estado, no de mecanismo, y el
propio reporte original ya lo señalaba así). No quedan hallazgos con causalidad no
reproducida.
