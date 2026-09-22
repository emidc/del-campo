# Revisión ciega R-33 — T-0019 (final)

**Veredicto:** PASS

**Workstream:** `BOS`  
**PR:** `#25`  
**Base revisada:** `origin/main` @ `5f78f5ab3a7fb653a87a49a506492b330c540f9b`  
**Rama revisada:** `task/T-0019-asociacion-documental-policy` @ `a8801950699ed275bf09a018cd209e5b75cd083e`

## Orden y alcance

La revisión se hizo en una sesión nueva y sin transcript ni resumen del implementador.
Se siguió este orden:

1. contrato de `T-0019` leído desde `origin/main`, reglas, `contextRefs`,
   `decisions.yaml` y ADRs referenciados;
2. diff completo `origin/main...HEAD`, tests incluidos, excluyendo
   `ops/evidence/**` y sin leer `REVIEWS/T-0019/*`;
3. comandos de `## Verification` y reproducciones adversariales sobre PostgreSQL real;
4. congelado del corte preliminar;
5. auditoría de Evidence y de los dos reportes previos.

Hecho: el árbol estaba limpio al comenzar, la rama coincidía con la solicitada y el
contrato base estaba en `status: READY`. Suposición explícita: el `origin/main` local
solicitado, cuyo SHA se registra arriba, es la base autoritativa de esta revisión.

## Corte preliminar congelado antes de Evidence

### Act on

Ninguno.

El schema final cumple la relación exactamente-una para el subconjunto documental:

- `relation_type = 'POLICY_DOCUMENT'` es el discriminador físico;
- la PK sobre `external_reference_id` impide una segunda Policy simultánea;
- las FKs preservan la existencia de ambos extremos;
- un trigger inmediato impide asociar referencias no documentales;
- constraint triggers diferibles impiden confirmar un `POLICY_DOCUMENT` sin asociación
  o conservar una asociación cuyo discriminador dejó de ser documental;
- el preflight de `0002` impide instalar esos mecanismos sobre un estado preexistente
  que ya viole participación total.

La pertenencia queda en `policy_document_reference.policy_id`; el destino intentado
permanece exclusivamente en `ExternalReference.resolved_target_type` /
`resolved_target_id`. No se observó mezcla de ambos ejes ni alteración del origen,
estado de resolución o `unresolvedReason`.

### Consider

Ninguno.

### Noted

- `package.json` serializa las suites de packages con `--test-concurrency=1`. Los tests
  de causalidad modifican DDL transaccionalmente sobre una base compartida; la
  serialización evita interferencia entre archivos y el costo observado es pequeño.
- El `down` es deliberadamente conservador: sólo retira `0002` cuando la asociación
  está vacía. Esto coincide con `## Data effects` y evita borrar pertenencia documental
  en silencio.
- La política de corrección o reasignación de `policy_id` sigue pendiente para antes de
  importar datos, tal como declara D-0054. El diff no fabrica ese workflow.

### Dismissed

- **Permitir actualizar `policy_id` no bloquea T-0019.** El contrato exige una única
  pertenencia en cada estado, no inmutabilidad histórica; gobernar la reasignación está
  declarado fuera de esta decisión y debe resolverse antes de poblar datos.
- **Que `down` rechace una tabla con filas no contradice reversibilidad.** La inversa
  existe y funciona sobre el estado seguro definido por la tarea; el rechazo con datos
  es el mecanismo requerido para no destruir la pertenencia.
- **La serialización global de tests no es un defecto funcional.** Responde a mutaciones
  DDL reales de las suites sobre el mismo schema y no cambia el comportamiento de
  producción.

## Verificación independiente

El primer `pnpm db:reset` sin `DATABASE_URL` falló antes de tocar la base porque este
worktree no contiene `.env`. Se repitió con la URL local sin credenciales documentada
por el repositorio; es una condición ambiental, no un fallo del diff.

En el orden contractual, con
`DATABASE_URL=postgres://localhost:5432/delcampo_dev`:

1. `pnpm db:reset` — **PASS**; aplicó `0001` y `0002`.
2. `pnpm db:down` — **PASS**; retiró `0002`.
3. `pnpm db:migrate` — **PASS**; reaplicó `0002`.
4. `pnpm check` — **PASS**; documentación, AgentRun, typecheck, lint y tests: 55 tests
   de scripts y 60 tests de packages, 0 fallos, 0 skips.

La línea `fatal: Not a valid object name origin/main` emitida durante `pnpm check`
pertenece a una fixture negativa del checker; el test que exige ese rechazo pasó y el
comando completo terminó con exit `0`.

El check remoto actual del PR también figura en **pass**.

## Pruebas adversariales

Todas usaron únicamente fixtures sintéticas locales.

### Upgrade desde `0001` con `POLICY_DOCUMENT` preexistente

Se retiró `0002`, se insertó una referencia documental bajo el schema `0001` y se
ejecutó el runner real:

- `pnpm db:migrate` rechazó el upgrade con el error de preflight;
- el ledger conservó únicamente `0001_vs01_core_schema.sql`;
- `policy_document_reference` siguió sin existir;
- la referencia preexistente permaneció intacta.

Tras borrar sólo esa fixture sintética, el runner aplicó `0002` normalmente. Esto
confirma que el fallo es atómico y no inventa un backfill sin evidencia.

### Participación total y discriminador

- Confirmar una transacción con `POLICY_DOCUMENT` sin asociación fue rechazado por el
  constraint diferible.
- Asociar una referencia `RENEWED_FROM_POLICY` a una Policy existente fue rechazado por
  el trigger de discriminador.
- Crear la referencia documental y su asociación en sentencias separadas de una misma
  transacción, forzar constraints y leer pertenencia/origen/motivo sin destino fabricado
  fue aceptado.

### `down` y ledger

- Con una asociación persistida, el runner real rechazó `db:down` y conservó la fila,
  la tabla y ambas entradas del ledger.
- Después de eliminar únicamente las fixtures de revisión, `db:down` retiró `0002`:
  el ledger conservó `0001`, y tabla, funciones y trigger de totality dejaron de existir.
- `db:migrate` restauró `0002`, la estructura y las dos entradas del ledger.

No quedaron fixtures de la revisión persistidas; la base local terminó con `0001` y
`0002` aplicadas.

## Auditoría posterior de Evidence y revisiones previas

Esta sección se escribió únicamente después de congelar el corte anterior.

### Evidence

- `ops/evidence/T-0019.md` conserva la ejecución original y separa explícitamente los
  addenda posteriores a cada STOP, con los SHAs de las correcciones. Sus salidas
  coinciden con la verificación independiente.
- `ops/evidence/T-0019-observation.sql` usa IDs y valores rotulados como sintéticos,
  fuerza los constraints diferibles antes de leer y termina con `ROLLBACK`. No hay
  datos reales, PII, acceso a Drive ni efectos externos.
- El único cambio entre la corrección funcional `de1ccc7` y el HEAD revisado es el
  addendum de `ops/evidence/T-0019.md`; implementación, dominio, ADR y tests no quedaron
  stale respecto de la evidencia final.
- Los límites declarados por Evidence —sin importación, consumo desde T-0016, datos
  reales ni medición de volumen— coinciden con el `Non-scope`.

### Cierre de los STOP anteriores

- `blind-review.md` encontró cardinalidad `0..1` y aceptación de referencias no
  documentales. Ambos estados ahora son rechazados por mecanismos físicos y tests
  causales; las reproducciones independientes también fallaron como exige el contrato.
- `blind-review-rerun.md` encontró que los constraint triggers no validaban filas
  anteriores a su creación. El preflight de `0002` y el test de upgrade agregados lo
  corrigen; la reproducción desde `0001` confirmó además atomicidad de schema y ledger.
- Los descartes previos sobre reasignación y serialización siguen siendo válidos por las
  razones escritas en el corte preliminar de este reporte.

La lectura posterior no aportó evidencia que cambie el veredicto preliminar.

## Veredicto final

**PASS — ningún `Act on` ni `Consider`.** El HEAD revisado satisface el contrato de
T-0019, D-0054 y `DOMAIN.md` §74; los tres hallazgos materiales de las revisiones
anteriores están corregidos y reproducidos adversarialmente. R-33 queda cumplida para
este snapshot. El merge a `main` continúa sujeto a la aprobación humana de R-13.
