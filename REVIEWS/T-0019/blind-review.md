# Revisión ciega de T-0019

- Workstream: `BOS`
- PR: `#25`
- Rama: `task/T-0019-asociacion-documental-policy`
- Base: `origin/main` (`5f78f5ab3a7fb653a87a49a506492b330c540f9b`)
- Head: `79c26108d6db0f35937b408472e536ab3e711465`
- Procedimiento: R-33 / D-0052
- Veredicto preliminar: **STOP**

## Alcance y supuestos

La revisión se hizo sin transcript ni resumen del implementador. El contrato se leyó
primero mediante
`git show origin/main:TASKS/T-0019-asociar-referencia-documental-con-policy.md`.
Antes de abrir Evidence se inspeccionaron el diff completo `origin/main...HEAD` —tests
incluidos, `ops/evidence/**` excluido—, `DOMAIN.md`, `decisions.yaml`, `SLICES/VS01.md`,
R-33 y los ADR de D-0034, D-0045, D-0051 y D-0054.

El test nuevo identifica sus fixtures documentales con
`relation_type = 'POLICY_DOCUMENT'`. Se usa ese mismo criterio para probar la
cardinalidad prometida. Si ese literal no identifica el subconjunto documental, el diff
no define ningún otro criterio físico que lo identifique; ése sería el mismo hueco de
modelado.

## Verificación independiente previa a Evidence

Con `DATABASE_URL=postgres://localhost:5432/delcampo_dev`, en el orden contractual:

1. `pnpm db:reset` — **PASS**; aplicó `0001` y `0002`.
2. `pnpm db:down` — primer intento bloqueado por el sandbox en localhost; repetido con
   autorización, **PASS**; revirtió `0002`.
3. `pnpm db:migrate` — mismo límite ambiental inicial; repetido con autorización,
   **PASS**; reaplicó `0002`.
4. `pnpm check` — **PASS**: documentación, AgentRun, typecheck, lint y tests; 55 tests
   de scripts y 54 tests de packages, sin fallos.

Los bloqueos iniciales de localhost fueron ambientales y no se atribuyen al diff.

Comprobaciones adversariales adicionales, todas con fixtures sintéticas:

- PostgreSQL aceptó una `ExternalReference` `POLICY_DOCUMENT` sin fila en
  `policy_document_reference`: `document_without_association|1|0`.
- PostgreSQL aceptó una asociación cuyo extremo tenía
  `relation_type = 'RENEWED_FROM_POLICY'`.
- Tras `up → down → up`, el ledger contenía `0001` y `0002` y la tabla existía.
- Con una asociación persistida, el runner real `db:down` falló como debía y conservó
  atómicamente tabla, datos y ledger. Luego se eliminaron sólo las seis fixtures de la
  revisión y la tabla quedó vacía, con `0002` todavía aplicado.
- Con la concurrencia anterior —sin `--test-concurrency=1`— se reprodujeron fallos
  cruzados entre archivos que mutan DDL sobre la misma base. No quedaron sesiones
  activas después del diagnóstico.

## Conclusiones preliminares

Esta sección quedó cerrada **antes** de abrir `ops/evidence/T-0019.md` y
`ops/evidence/T-0019-observation.sql`. La auditoría posterior se agrega por separado y
no reescribe estas conclusiones.

### Act on

#### BR-001 — BLOCKER — La cardinalidad física es `0..1`, no exactamente una

El contrato y `DOMAIN.md` 2159-2161 dicen que una referencia documental pertenece a
exactamente una Policy con integridad referencial. La PK de
`policy_document_reference.external_reference_id` (`0002`, líneas 7-16) sólo impide una
segunda fila; no obliga a que exista la primera. PostgreSQL aceptó una referencia
`POLICY_DOCUMENT` válida sin asociación.

El schema admite así el estado ambiguo que T-0019 debía eliminar: VS01 no puede
distinguir de forma confiable “no había referencia documental” de “la referencia existe
pero nunca recibió o perdió su Policy”. Los tests de líneas 121-178 crean ambas filas
voluntariamente, y el negativo de líneas 180-198 prueba sólo “a lo sumo una”.

**Acción:** definir físicamente qué hace documental a una `ExternalReference` y exigir
que ese subconjunto participe en exactamente una asociación, con negativo y prueba del
mecanismo causal. Si la intención fuese permitir cero, debe resolverse explícitamente la
contradicción con contrato, dominio y D-0054; no decidirla en silencio en la migración.

#### BR-002 — MAJOR — La asociación documental acepta otras relaciones

La FK valida sólo `external_reference.id`; no valida que el extremo sea documental.
PostgreSQL aceptó asociar una referencia `RENEWED_FROM_POLICY`. Esto contradice la
asociación específica de D-0054: una consulta por Policy podría presentar continuidad
de renovación como ausencia documental.

El helper de test usa `POLICY_DOCUMENT` en líneas 94-115, pero ningún negativo intenta
asociar otro `relation_type`. La prueba causal de líneas 282-299 sólo cubre orfandad de
IDs.

**Acción:** imponer en PostgreSQL la compatibilidad con el discriminador documental —o
adoptar y documentar otro discriminador inequívoco— y agregar su negativo causal, sin
mezclar pertenencia con `resolved_target_type/resolved_target_id`.

### Consider

#### C-001 — Definir si la pertenencia puede borrarse o reasignarse

Las FKs `RESTRICT` impiden borrar Policy y ExternalReference mientras la asociación
existe. Sin embargo, `DELETE` sobre `policy_document_reference` está permitido —se usó
para limpiar la fixture de revisión— y `policy_id` puede actualizarse. El guard del down
protege la reversión de schema, no el DML ordinario.

El contrato no declara inmutabilidad ni un workflow de corrección, por lo que esto no se
eleva a `Act on`. Antes de importar datos conviene decidir si borrar o reasignar debe ser
una corrección permitida, historia efectiva-fechada o una operación prohibida/auditada;
la pertenencia documental toca los casos probatorios de `DOMAIN.md` §2.4.

### Noted

- Pertenencia y destino están físicamente separados: `policy_id` vive en la asociación
  y `resolved_target_type/resolved_target_id` permanecen en `external_reference`.
- La PK rechaza una segunda Policy simultánea; las FKs rechazan extremos inexistentes y
  evitan borrar esos extremos mientras la asociación exista.
- La reversión es real: vacío, el down elimina tabla y ledger; con filas, falla
  atómicamente y conserva ambos.
- Las fixtures nuevas son sintéticas y cada test queda en una transacción descartable.
  No hubo acceso a Drive ni a datos reales.
- Serializar la suite es un cambio amplio, pero el diagnóstico con la concurrencia
  anterior reprodujo interferencia real entre archivos que alteran el schema compartido.

### Dismissed

- **Confusión pertenencia/destino:** descartada; no se reutiliza
  `resolved_target_id`, y el test resuelto usa IDs distintos.
- **Duplicación simultánea:** descartada; la PK es causal, pues al retirarla dos Policies
  para la misma referencia fueron aceptadas.
- **Borrado por cascada de los extremos:** descartado; ambas FKs son `RESTRICT`. Esto no
  descarta C-001 sobre borrar la fila de unión.
- **Rollback sólo aparente:** descartado; se ejercitó el runner y su ledger en éxito y en
  rechazo con datos, además del test de `DOWN_SQL`.
- **Datos reales o ampliación a Drive/importación/T-0016:** descartado; el diff se limita
  a schema, ADR y tests sintéticos.
- **Serialización global sin causa observable:** descartada; al quitar el flag se
  reprodujeron fallos de DDL compartido y con él `pnpm check` pasa. Aislar bases o schemas
  por archivo sería un rediseño posterior, no alcance de T-0019.

## Auditoría posterior de Evidence

Evidence se abrió sólo después de persistir la sección preliminar.

### Correspondencia con la verificación independiente

- `ops/evidence/T-0019.md` registra los cuatro comandos en el orden contractual y todos
  con exit `0`. Las salidas relevantes coinciden con la ejecución independiente.
- El SHA declarado (`15888ade86ab1a240dd4a5879302ce82cbc97834`) es el commit de
  implementación. Entre ese commit y el `HEAD` revisado sólo se agregaron los dos
  archivos de Evidence y se cambió el estado de la tarea de `ACTIVE` a `DONE`; no cambió
  schema, ADR, dominio, runner ni tests. Por eso la evidencia no está stale respecto del
  código revisado.
- La observación SQL usa únicamente valores explícitamente sintéticos dentro de
  `BEGIN/ROLLBACK`. Confirma el caso positivo: pertenencia, origen, estado y motivo se
  leen juntos sin fabricar `resolved_target_id`.
- Evidence reconoce correctamente que no consumió T-0016, no importó ni hizo backfill,
  no usó datos reales y no midió performance. Todo eso coincide con el Non-scope.
- Evidence no ejecutó el runner contra asociaciones persistidas; su test sólo ejercita
  el `DOWN_SQL` dentro de una transacción. La comprobación independiente sí ejecutó el
  runner real con una asociación sintética y confirmó que tabla y ledger se conservan
  al fallar, por lo que no se agrega finding de reversibilidad.

### Huecos que Evidence no detecta

La observación externa y los tests documentados crean voluntariamente primero una
referencia `POLICY_DOCUMENT` y luego su asociación. No intentan:

1. confirmar que PostgreSQL rechace una referencia documental sin asociación; ni
2. confirmar que rechace asociar una referencia no documental.

Por eso el verde documentado prueba `1..1` para la fila de unión ya creada —unicidad y
existencia de sus extremos—, pero no la participación total ni la frontera documental.
Evidence no contradice las reproducciones `BR-001` y `BR-002` y no cambia el veredicto.

## Veredicto final

**STOP — 1 BLOCKER, 1 MAJOR, 1 Consider.**

- `BR-001` debe resolverse porque el outcome promete exactamente una Policy y el schema
  admite cero.
- `BR-002` debe resolverse porque la asociación específica admite referencias no
  documentales.
- `C-001` requiere una decisión explícita antes de datos importados, pero no bloquea por
  sí solo este contrato.

CI verde —informado por el solicitante— y los checks locales verdes no alteran el
veredicto: ninguno contiene los dos negativos que reprodujeron los incumplimientos.
