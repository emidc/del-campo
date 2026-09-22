# Revisión ciega R-33 — T-0019 (rerun)

**Veredicto:** STOP

**Base revisada:** `origin/main` @ `5f78f5ab3a7fb653a87a49a506492b330c540f9b`  
**Rama revisada:** `task/T-0019-asociacion-documental-policy` @ `3fc1b5921fdabae1156ab56be55e88310e21a3b1`

## Corte preliminar congelado antes de Evidence

Este corte se escribió después de leer el contrato desde `origin/main`, inspeccionar el
diff completo excluyendo `ops/evidence/**` y el reporte previo, ejecutar `## Verification`
y realizar pruebas adversariales. A esta altura todavía no se había leído ni
`ops/evidence/T-0019.md` ni `REVIEWS/T-0019/blind-review.md`.

### Act on

1. **MAJOR — la migración no valida filas `POLICY_DOCUMENT` preexistentes y puede
   confirmar un schema que viola la participación total.**

   `0002_policy_document_reference.sql` instala constraint triggers que se disparan sólo
   ante eventos futuros sobre `external_reference` o `policy_document_reference`. No
   comprueba el estado ya presente al momento del upgrade. Reproducción sobre el schema
   0001: revertir 0002, insertar una `external_reference` sintética con
   `relation_type = 'POLICY_DOCUMENT'`, y volver a correr `pnpm db:migrate`. La migración
   finaliza con éxito; un `LEFT JOIN` muestra `policy_id IS NULL` para esa referencia.
   Esto contradice el Outcome y D-0054/DOMAIN.md §74: toda referencia discriminada como
   documental debe participar en exactamente una asociación al confirmar la transacción.

   **Acción requerida:** hacer que el `up` falle explícitamente (o migre de forma
   determinista, si existiera una fuente autorizada) cuando encuentre filas
   `POLICY_DOCUMENT` sin exactamente una asociación, y agregar una prueba de upgrade que
   parta de datos preexistentes. En el estado actual, el schema sólo garantiza la
   invariante para escrituras posteriores a instalar los triggers.

### Consider

Ninguno en el corte preliminar.

### Noted

- La PK sobre `external_reference_id` impide dos Policies para una misma referencia.
- Las FKs `RESTRICT` preservan ambos extremos y el índice por `policy_id` soporta la
  lectura desde Policy.
- El trigger inmediato rechaza asociaciones cuyo `relation_type` no sea
  `POLICY_DOCUMENT`; los triggers diferibles rechazan una referencia documental nueva
  sin pertenencia y el borrado aislado de su asociación.
- La pertenencia y `resolved_target_type/resolved_target_id` permanecen como ejes
  distintos; las fixtures verificadas son sintéticas y transaccionales.
- El down elimina 0002 sólo con la asociación vacía y la secuencia limpia
  `up -> down -> up` deja ledger y schema consistentes.

### Dismissed

- **La asociación permite reasignar `policy_id`.** No se considera hallazgo de esta
  tarea: el contrato exige pertenencia única en cada estado, no inmutabilidad histórica,
  y el ADR declara que gobernar la corrección/reasignación queda pendiente antes de
  importar datos.
- **El test suite global pasa a concurrencia 1.** No se considera defecto funcional:
  los tests de causalidad alteran objetos del schema dentro de transacciones y el cambio
  evita interferencia entre archivos; el costo observado sigue siendo pequeño.

## Verificación independiente

- `pnpm db:reset`: falló inicialmente porque el worktree no contiene `.env`; repetido
  con `DATABASE_URL=postgres://localhost:5432/delcampo_dev`, pasó y aplicó 0001/0002.
- `pnpm db:down`: pasó y revirtió 0002.
- `pnpm db:migrate`: pasó y reaplicó 0002.
- `pnpm check`: pasó; 55 checks del repositorio y 59 tests de paquetes, 0 fallos,
  0 skips.
- Prueba adversarial de upgrade con fixture sintética preexistente: reprodujo el
  `POLICY_DOCUMENT` huérfano descrito en Act on 1.

## Auditoría posterior de Evidence

Evidence y el reporte anterior se abrieron únicamente después de congelar el corte
precedente.

### Cobertura confirmada

- El addendum de `ops/evidence/T-0019.md` registra la corrección de los dos hallazgos
  del STOP anterior: participación obligatoria para nuevas referencias
  `POLICY_DOCUMENT` y rechazo de asociaciones con otro `relation_type`. Las salidas
  nominales coinciden con esta ejecución independiente.
- `ops/evidence/T-0019-observation.sql` crea sólo fixtures rotuladas como sintéticas,
  fuerza los constraints diferibles y revierte la transacción. No hay indicios de PII,
  datos reales, acceso a Drive ni persistencia de fixtures.
- La corrección evidenciada corresponde a
  `cbd1ac775c47d3a95814d485605666531260f018`; entre ese commit y el HEAD revisado, fuera
  de Evidence y Reviews, sólo cambió `## Notes` de la tarea. Migración, ADR, dominio y
  tests no quedaron stale respecto del código revisado.
- El reporte previo permite comprobar que sus `BR-001` y `BR-002` sí fueron atendidos
  para escrituras posteriores a instalar 0002. El finding de este rerun es diferente:
  examina el estado que ya existe antes de que los triggers sean creados.

### Hueco de cobertura

Evidence declara que no importó ni hizo backfill y que “la migración crea estructura
vacía”, pero no verifica esa precondición ni prueba un upgrade desde 0001 con datos. La
estructura nueva queda vacía; `external_reference` no necesariamente. Como los triggers
no son retroactivos, el verde de Evidence no cubre el caso reproducido en Act on 1 y no
cambia el veredicto.

## Veredicto final

**STOP — 1 MAJOR.** No hay BLOCKER adicional ni otros `Act on`. Antes de integrar, el
`up` de 0002 debe rechazar explícitamente cualquier `POLICY_DOCUMENT` preexistente sin
pertenencia (no hay información autorizada para inferir un backfill) y la suite debe
probar esa ruta de upgrade. Con esa corrección, corresponde repetir la prueba adversarial
y la verificación contractual.
