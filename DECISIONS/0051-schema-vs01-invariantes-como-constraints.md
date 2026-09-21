# ADR-0051 — Schema de VS01 con las invariantes de DOMAIN.md §67 como constraints

- **Id en `decisions.yaml`:** D-0051
- **Fecha:** 2026-09-21
- **Supersede:** —

## Contexto

`T-0012` traduce el subconjunto de `DOMAIN.md` §63 a tablas de Postgres, con las
invariantes de §67 (INV-001..INV-023, INV-PV-001..INV-PV-006) expresadas como
constraints donde son expresables. Es un cambio de schema sobre `Party` y `Policy`,
los dos agregados centrales nombrados explícitamente por R-05, y dispara este ADR por
esa regla sola, incluso si cada mecanismo individual pudiera parecer una decisión
técnica pequeña.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0051. La migración es
`packages/db/migrations/0001_vs01_core_schema.sql`.

## Mecanismo elegido por invariante

| Invariante | Mecanismo | Nota |
| --- | --- | --- |
| INV-001 (identidad estable) | Trigger `party_id_immutable`, `BEFORE UPDATE OF id`: rechaza cualquier `UPDATE` que cambie `party.id`. | Corregido tras BR-002/BR-003 de la revisión ciega (`REVIEWS/T-0012/blind-review.md`): la versión previa de esta fila afirmaba "ninguna operación del schema permite reasignarlo" sin que existiera ningún mecanismo que lo impidiera, y PostgreSQL aceptaba el `UPDATE`. |
| INV-002 (merge preserva historia) | Trigger `party_merged_no_delete`, `BEFORE DELETE WHEN (old.status = 'MERGED')`: rechaza el borrado de una Party ya fusionada. | Corregido tras BR-003: la versión previa afirmaba que las FKs de quien referencia a la perdedora impedían el `DELETE`, lo cual es falso para una Party perdedora sin referencias — PostgreSQL aceptaba el borrado. |
| INV-003 (sin ciclos de merge) | Trigger `party_merge_cycle_guard`, `BEFORE INSERT OR UPDATE OF merged_into_party_id`. Recorre la cadena desde el nuevo destino y aborta si vuelve a encontrar un nodo visitado (incluida la propia fila, que cubre auto-merge). Desde BR-001, además adquiere `pg_advisory_xact_lock` sobre una clave fija antes de recorrer la cadena, serializando las escrituras del grafo de merge entre sí. | No expresable como `CHECK` ni `FK`: requiere seguir una cadena transitiva. Costo O(longitud de la cadena) por escritura; aceptable para el volumen de VS01. Sin el lock, dos merges concurrentes que alteran extremos distintos de la cadena no se ven entre sí y pueden confirmar un ciclo — reproducido con dos sesiones reales en `packages/db/src/schema.integration.test.ts` (BR-001). |
| INV-004 (PartyRole no se borra físicamente) | Trigger `party_role_no_delete`, `BEFORE DELETE`: rechaza cualquier borrado; el cierre de un rol es un `UPDATE` de `valid_to`. | Corregido tras BR-003: no existía ningún mecanismo, y PostgreSQL aceptaba el `DELETE`. |
| INV-005 (CLIENT no se persiste) | El `CHECK` de `party_role.role` no admite `'CLIENT'` como valor. | Satisfecho por omisión: `CLIENT` nunca es un valor posible del enum. |
| INV-006 (a lo sumo un rol activo) | `EXCLUDE USING gist` sobre `(party_id, role, tstzrange(valid_from, coalesce(valid_to, infinity)))`. `valid_to IS NULL` es la definición de "activo" — decisión explícita tomada con el owner durante esta tarea, ver sección siguiente. | El mismo `EXCLUDE` cubre también el no-solapamiento de §13. |
| INV-011/INV-PV-003 (sin solapamiento de PolicyVersion) | `EXCLUDE USING gist` sobre `(policy_id, daterange(effective_from, coalesce(effective_to, infinity)))`, con `btree_gist`. | Igual que D-0045 anticipó. |
| INV-012/INV-PV-004 (a lo sumo una versión abierta) | El mismo `EXCLUDE` de la fila anterior. Ver la nota de causalidad más abajo: se agregó además un índice único parcial por trazabilidad de intención con D-0045, pero no es el mecanismo causal real mientras el `EXCLUDE` exista. | Ver `## Hallazgo sobre INV-PV-004` abajo. |
| INV-015 (aseguradoras de catálogo curado) | No enforceable únicamente desde esta tabla: es una disciplina del importador (T-0013). El schema sí fuerza que `insurer.organization_party_id` sea una Party `ORGANIZATION` real, vía trigger `require_party_kind`. | Documentado como límite conocido, no fingido como cubierto. |
| INV-020 (unicidad de policyNumber por aseguradora) | `UNIQUE (insurer_id, policy_number)` en `policy`. `insurer_id NOT NULL` por D-0038. | — |
| INV-021 (Endorsement exige Policy) | `endorsement.policy_id NOT NULL` + FK a `policy`. Además, `policy_version.endorsement_id`/`policy_id` tienen FK compuesta contra `endorsement (id, policy_id)`. | La regla de descarte de D-0037 (Endorsements sin Policy padre) es de importación, no de esta tabla. La FK compuesta se agregó tras BR-004: sin ella, una `PolicyVersion` podía citar un Endorsement de OTRA Policy. |
| INV-022 (resolver no borra el origen) | Trigger `external_reference_source_is_immutable`, `BEFORE UPDATE`: congela `source_system`/`source_entity_type`/`source_external_id`/`source_value` una vez insertados. | No es un `CHECK` de una sola fila: ambos estados (resuelto/no resuelto) son formas válidas: la restricción es sobre qué puede cambiar. |
| INV-023 (tomador único) | `policy_version.holder_party_id NOT NULL` + FK. | — |
| INV-PV-005/INV-013 (versión cerrada es historia) | Trigger `policy_version_closed_immutable`, `BEFORE UPDATE OR DELETE`: si `OLD.effective_to` no es nulo, rechaza el `UPDATE`/`DELETE`. Distingue por el valor viejo, así que nunca alcanza al `INSERT` de historia ya cerrada que hará el importador de T-0013. | Corregido tras BR-002: no existía ningún mecanismo, y PostgreSQL aceptaba sobrescribir o borrar una versión cerrada. |
| §6/§10/§11/§17/§22 (kind coherente con profile/insurer/membership) | Trigger `party_kind_immutable_with_dependents`, `BEFORE UPDATE OF kind`: rechaza el cambio si existe un `PersonProfile`/`OrganizationProfile`/`Insurer`/`OrganizationMembership` dependiente. | Corregido tras BR-005: los triggers de `require_party_kind` sólo validaban el `INSERT` del hijo; un `UPDATE` posterior de `party.kind` los invalidaba en silencio. |
| §47 (DocumentLink referencia un recurso real) | Trigger `policy_no_delete_with_document_links`, `BEFORE DELETE ON policy`: rechaza el borrado de una Policy con `document_link` asociados. | Corregido tras BR-006: `resource_id` es polimórfico por diseño y no admite FK real; el trigger existente sólo validaba `INSERT`/`UPDATE` de `document_link`, no el borrado del recurso. |
| Q-12/D-0050 (linaje de `coverage_data`) | `CHECK policy_version_coverage_lineage`: si `coverage_data` no es `NULL`, exige `coverage_source_batch_id` y `coverage_source_record_id` no nulos. Los tres `NULL` juntos siguen siendo "dato ausente". | Corregido tras BR-007: no existía ningún `CHECK` que vinculara la presencia de `coverage_data` con su linaje. |

## Decisión tomada con el owner: qué significa "activo" en PartyRole

`DOMAIN.md` §12 da a `PartyRole` tanto un campo `status` como un intervalo
`validFrom`/`validTo?`, sin decir cuál de los dos determina "activo" para INV-006. Se
consultó al owner en vez de resolverlo en el schema en silencio. Resultado: `valid_to
IS NULL` es la autoridad, igual que en `PolicyVersion`. `status` queda como campo
secundario — hoy con un único valor posible (`'ACTIVE'`) — para cuando exista
necesidad real de distinguir motivos de cierre (R-01: no se amplía el enum sin un
segundo caso concreto).

## Hallazgo sobre INV-PV-004: el índice único parcial no es causalmente independiente

El `EXCLUDE` de `PolicyVersion` compara `daterange(effective_from, coalesce(effective_to,
'infinity'))`. Al coalescer `NULL` a `infinity`, dos versiones abiertas de la misma
`policy_id` producen siempre rangos infinitos que solapan entre sí, sin importar sus
fechas de inicio. Consecuencia: el mismo `EXCLUDE` que impide el solapamiento entre
versiones cerradas (INV-PV-003) también impide, como corolario matemático y no como
mecanismo aparte, que existan dos versiones abiertas (INV-PV-004).

`D-0045` y el README de `packages/db/migrations` describían "a lo sumo una versión
abierta" como si necesitara un índice único parcial separado del `EXCLUDE`. Se había
implementado ese índice (`policy_version_one_open_per_policy`) por trazabilidad de esa
intención, y la prueba de causalidad de `## Verification` (ver `ops/evidence/T-0012.md`)
mostró que, con el `EXCLUDE` presente, retirar el índice parcial **no** permitía la
escritura inválida: el `EXCLUDE` la rechazaba igual. **Corrección post revisión ciega
(BR-009):** el hallazgo estaba bien documentado, pero se había conservado el índice de
todos modos "como defensa en profundidad". El reviewer señaló que eso es redundancia
sin beneficio observado — no hay prueba de que valga su costo de escritura y
mantenimiento — y se retiró en la corrección de BR-001..BR-008. Si en el futuro se
relaja el `EXCLUDE`, INV-PV-004 necesita un mecanismo nuevo evaluado en ese momento,
no este índice reintroducido a ciegas.

## Decisiones que esta tarea explícitamente no toma

- `D-0025` (estructura de `coverageData`) permanece `OPEN`. El formato físico elegido
  para esta tarea es D-0050, y su ADR aclara por qué no cierra D-0025.
- `D-0022`, `D-0026`, `D-0027` permanecen `OPEN`. Ninguna tabla de esta migración
  implementa autorización, estructura de producto ni asignación de cartera.
- Ningún concepto de `DOMAIN.md` pasa de `NAMED` a `MODELED`: todo lo que esta
  migración crea ya estaba `MODELED NOW` en el documento antes de esta tarea.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| ENUM nativo de Postgres para `kind`/`status`/`channel`/etc. | `CHECK IN (...)` sobre `text` permite ampliar el conjunto de valores con un `ALTER TABLE` simple; un `ALTER TYPE ... ADD VALUE` de un enum nativo no puede correr dentro de la misma transacción que lo usa, lo que complica migraciones futuras sin ganar nada a cambio en esta escala. |
| FK genérica polimórfica para `DocumentLink.resourceType`/`resourceId` | Postgres no tiene FK polimórfica nativa; se necesitaría una tabla de unión o una function-based constraint para cada tipo posible. VS01 solo necesita `POLICY`; se restringió el `CHECK` a eso y se dejó un trigger de existencia acotado, ampliable cuando exista un segundo caso real (R-01). |
| Enum de PartyRole abierto a futuros roles como texto libre | DOMAIN.md §12 es explícito: solo `PROSPECT` existe hoy; otros roles "sólo se agregarán cuando exista un caso real". Un texto libre permitiría insertar roles no autorizados sin que la base lo note. |

## Consecuencias

**Más fácil.** Cada invariante requerida por `## Outcome` tiene un mecanismo real,
identificado y probado por rechazo real de Postgres, no por un chequeo de aplicación
que un test pueda simular pasando. `D-0025`, `D-0022`, `D-0026` y `D-0027` siguen
abiertas sin que ninguna columna las cierre de hecho.

**Más difícil.** El importador de T-0013 hereda constraints estrictas (D-0038,
D-0037, D-0036) que no admiten atajos: toda excepción de datos reales tiene que
resolverse antes de escribir, no después.

**Costo de revertir:** relajar cualquier `EXCLUDE` o `CHECK` es un `ALTER TABLE`
reversible mecánicamente. Lo que no se revierte gratis es haber decidido, con el
owner, que `PartyRole.status` no participa hoy del enforcement de INV-006: revertir
esa lectura exigiría una migración de datos si `status` llegara a divergir de
`valid_to IS NULL` para filas ya existentes.

## Revisión ciega y corrección (BR-009)

Una revisión ciega independiente (`REVIEWS/T-0012/blind-review.md`) devolvió STOP con
3 BLOCKER y 8 MAJOR. El más relevante para este ADR es BR-009: esta tabla y
`ops/evidence/T-0012.md` afirmaban cobertura de INV-001, INV-002, INV-004 e
INV-PV-005/INV-013 sin que existiera mecanismo alguno contra `UPDATE`/`DELETE` — las
reproducciones de la revisión mostraron que PostgreSQL aceptaba exactamente las
escrituras que estas invariantes debían prohibir. Las filas de la tabla de arriba
correspondientes a esas invariantes quedaron corregidas para describir el mecanismo
real (triggers agregados en la corrección), no el que se había afirmado sin
comprobar. `ops/evidence/T-0012.md` documenta el detalle completo de los 12 findings
y qué se hizo con cada uno.

## Criterio de falsación

Que aparezca un caso real donde `PartyRole.status` necesite distinguir un motivo de
cierre distinto de "el intervalo terminó", momento en el que el enum de `status` se
amplía (R-01, segundo caso) y se reevalúa si debe participar del `EXCLUDE`.
