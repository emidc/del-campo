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
| INV-001 (identidad estable) | Ninguna operación del schema permite reasignar `party.id`; no hay una escritura que lo requiera. | No es una constraint: es la ausencia de un mecanismo de reasignación. |
| INV-002 (merge preserva historia) | `party.status`/`merged_into_party_id` + `ON DELETE` no declarado (no hay `DELETE` posible sin violar FKs de quien referencia la Party perdedora). | La ausencia de cascada de borrado es deliberada. |
| INV-003 (sin ciclos de merge) | Trigger `party_merge_cycle_guard`, `BEFORE INSERT OR UPDATE OF merged_into_party_id`. Recorre la cadena desde el nuevo destino y aborta si vuelve a encontrar un nodo visitado (incluida la propia fila, que cubre auto-merge). | No expresable como `CHECK` ni `FK`: requiere seguir una cadena transitiva. Costo O(longitud de la cadena) por escritura; aceptable para el volumen de VS01. |
| INV-005 (CLIENT no se persiste) | El `CHECK` de `party_role.role` no admite `'CLIENT'` como valor. | Satisfecho por omisión: `CLIENT` nunca es un valor posible del enum. |
| INV-006 (a lo sumo un rol activo) | `EXCLUDE USING gist` sobre `(party_id, role, tstzrange(valid_from, coalesce(valid_to, infinity)))`. `valid_to IS NULL` es la definición de "activo" — decisión explícita tomada con el owner durante esta tarea, ver sección siguiente. | El mismo `EXCLUDE` cubre también el no-solapamiento de §13. |
| INV-011/INV-PV-003 (sin solapamiento de PolicyVersion) | `EXCLUDE USING gist` sobre `(policy_id, daterange(effective_from, coalesce(effective_to, infinity)))`, con `btree_gist`. | Igual que D-0045 anticipó. |
| INV-012/INV-PV-004 (a lo sumo una versión abierta) | El mismo `EXCLUDE` de la fila anterior. Ver la nota de causalidad más abajo: se agregó además un índice único parcial por trazabilidad de intención con D-0045, pero no es el mecanismo causal real mientras el `EXCLUDE` exista. | Ver `## Hallazgo sobre INV-PV-004` abajo. |
| INV-015 (aseguradoras de catálogo curado) | No enforceable únicamente desde esta tabla: es una disciplina del importador (T-0013). El schema sí fuerza que `insurer.organization_party_id` sea una Party `ORGANIZATION` real, vía trigger `require_party_kind`. | Documentado como límite conocido, no fingido como cubierto. |
| INV-020 (unicidad de policyNumber por aseguradora) | `UNIQUE (insurer_id, policy_number)` en `policy`. `insurer_id NOT NULL` por D-0038. | — |
| INV-021 (Endorsement exige Policy) | `endorsement.policy_id NOT NULL` + FK a `policy`. | La regla de descarte de D-0037 (Endorsements sin Policy padre) es de importación, no de esta tabla: la tabla sólo puede garantizar que toda fila que exista tenga Policy. |
| INV-022 (resolver no borra el origen) | Trigger `external_reference_source_is_immutable`, `BEFORE UPDATE`: congela `source_system`/`source_entity_type`/`source_external_id`/`source_value` una vez insertados. | No es un `CHECK` de una sola fila: ambos estados (resuelto/no resuelto) son formas válidas: la restricción es sobre qué puede cambiar. |
| INV-023 (tomador único) | `policy_version.holder_party_id NOT NULL` + FK. | — |

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

`D-0045` y el README de `packages/db/migrations` describen "a lo sumo una versión
abierta" como si necesitara un índice único parcial separado del `EXCLUDE`. Se
implementó ese índice (`policy_version_one_open_per_policy`) por trazabilidad de esa
intención, pero la prueba de causalidad de `## Verification` (ver
`ops/evidence/T-0012.md`) mostró que, con el `EXCLUDE` presente, retirar el índice
parcial **no** permite la escritura inválida: el `EXCLUDE` la rechaza igual. El índice
parcial sólo se vuelve causal si el `EXCLUDE` también está ausente. Se documenta el
hallazgo en vez de reportar una prueba de causalidad que no sería real, y se conserva
el índice como defensa en profundidad y como ancla para el caso en que `INV-PV-003` se
relaje en el futuro sin que `INV-PV-004` deba relajarse con ella.

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

## Criterio de falsación

Que aparezca un caso real donde `PartyRole.status` necesite distinguir un motivo de
cierre distinto de "el intervalo terminó", momento en el que el enum de `status` se
amplía (R-01, segundo caso) y se reevalúa si debe participar del `EXCLUDE`.
