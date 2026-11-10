# Revisión ciega R-33 · T-0037 I1a (C3-01a)

**Revisado:** rama `task/T-0037-lotes-por-manifiesto` en `e669435` contra `main` en `7ee0309`.
**Revisor:** subagente aislado de Claude Code, sin el transcript ni la justificación de la
sesión que implementó. Recibió el contrato de la tarea leído desde `main`, la fila C3-01a
del plan y el diff completo con tests; buscó `DOMAIN.md` y `decisions.yaml` por su cuenta
y corrió la verificación antes de leer `ops/evidence/T-0037.md`. El revisor no podía
escribir archivos: este reporte es su salida, copiada por la sesión que implementó. Al
final, la sección «Cierre» es de esa sesión, no del revisor.

**Veredicto del revisor: 1 Act on. No mergear hasta resolverlo.** Staging cumple el
criterio de C3-01a, pero el diff rompía `load-policies` en cuanto entraba un segundo lote,
y la documentación nueva indicaba correrlo así.

## 1. Qué corrió y qué salió

- `pnpm check` con `DATABASE_URL=postgres://localhost:5432/delcampo_dev`, Node 22.23.4:
  salida 1. `scripts/tests` 259/259; `tsc` y `eslint` sin errores; `pnpm test`
  `# tests 1477 · pass 1473 · fail 0 · cancelled 4`. Los 4 cancelados son de
  `contexts/communication/src/integration/cloud-api.contract.test.ts` y se cancelan igual
  corriendo ese archivo solo. Todos los tests de `packages/db/src/import/**` pasan.
- Ida y vuelta de 0012 sobre `delcampo_dev` con foto del catálogo (constraints, índices,
  RLS, grants de tabla y columna): antes y después de la vuelta, idéntica. Un lote legado
  sintético (huella `profile-…json`) sobrevive con su `batch_id`. Con un registro en dos
  lotes, `db:down` falla con salida 1 y no toca nada. Con dos lotes de huella
  `repeat('0',64)` previos, `db:migrate` fallaba por el índice único (C2).
- Prueba sintética propia, fuera del repo: lote A con P-1 y P-2, lote B con P-1 y P-3;
  `importarPolizas(A)` e `importarPolizas(B)` → `importadas A=2 B=2; policy_version
  global (nuevas)=3`.
- No corrió el CLI de punta a punta: `conectar()` sólo acepta `delcampo_t0013_dev` y tenía
  prohibido usarla.

## 2. Hallazgos

### Act on

**A1. Con un segundo lote, `load-policies` aborta con una «discrepancia» falsa, después de
haber escrito en el dominio.** `packages/db/src/import/cli.ts:127-152` y
`policies.ts:73-78`. `importarPolizas` lee sólo el lote; el control del CLI compara
contra `count(*)` de `policy_version` de todos los lotes. Basta un registro ausente en B o
que en B pase a excepción (por ejemplo, fuera de la ventana fija de `enScope`, D-0031)
para que el CLI muera después de que `importarPolizas`, `importarEndosos` e
`importarRenovaciones` escribieron sin transacción. Lo agrava `lote-manifiesto.md`, que
indicaba correr `load-parties`, `load-policies` y `report` sobre cualquier lote, cuando
aplicar un lote posterior al dominio es I2 y espera la elección del §3 del diseño.
Sugerencia: (a) comparar contra las `policy_version` del lote, o (b) mientras no exista
I2, que `load-parties` y `load-policies` rechacen un lote posterior y que el documento lo
diga; en ambos casos, un test con dos lotes.

### Consider

**C1. `report` mezcla conteos por lote con conteos de toda la base** (`report.ts:26-44`).
`sinPolicyPadre` puede dar negativo con dos lotes; las excepciones, sin lote en su
identidad, se arrastran de un lote a otro. Sugerencia: filtrar los conteos de dominio por
lote o rotular cuáles son globales.

**C2. El índice único parcial de huella alcanza al lote sintético, al revés de lo que
dice su comentario** (`0012_staging_por_lote.sql:36-42`). El seed usa `'0'.repeat(64)`,
que cumple el patrón. Una base de Preview con dos lotes sintéticos quedaría trabada en
`db:migrate`.

**C3. El aislamiento entre lotes está probado sólo para `importarContactos`**
(`lote-staging.integration.test.ts:300-311`). Quitar el `where batch_id` de los demás
lectores no rompe ningún test.

**C4. El lote cargado antes de T-0037 no se reconoce, y recargar el 16/09 lo duplica**
(`lote-staging.ts:56-62`). Su huella es el nombre del perfil. Recargarlo crea un segundo
lote con el mismo crudo y bloquea `db:down` de 0012. Está documentado; convendría un paso
que actualice la huella del lote legado cuando el owner la confirme.

### Noted

- **N1.** Aplicar 0012 en producción es inocuo: staging sólo tiene la fila de
  `staging_import_batch` con huella `profile-…json`, fuera del índice parcial; el cambio de
  PK es sobre tablas vacías; la tabla nueva tiene RLS y no tiene grants para `broker_*`.
- **N2.** La cabecera de VS01 puede mostrar la fecha de un lote que el dominio no tiene
  (`batch.ts:44-50`). Parte de H1/H4, declarado para I3.
- **N3.** La identidad del lote es el hash de los bytes del perfil (reformatearlo da otro
  lote) y hay una ventana entre verificar y releer un CSV. No material con lotes locales.
- **N4.** La evidencia creó y borró una base `delcampo_t0013_dev` sintética para correr el
  CLI; `guard-db-tests` trata ese nombre como la base con datos reales. Falta una vía
  sintética para el CLI que no dependa de ese nombre.
- **N5.** El corte fijo de `enScope` (2026-09-16, D-0031) no sirve para un lote
  posterior. Corresponde a I2.

### Dismissed

- **D1.** Los 4 cancelados y la salida 1 de `pnpm check`: el diff no toca ese contexto; se
  explican por Node 22 frente al 24 que pide el repo.
- **D2.** Migración y su inversa: conserva filas, vuelta exacta, se niega sin efectos
  parciales cuando revertir descartaría crudo (R-23).
- **D3.** Validación del manifiesto: rechaza JSON inválido, claves desconocidas, módulos de
  más o de menos, CSV repetido, fechas imposibles y rutas que salen del lote; cruza cada CSV
  con el perfil y recalcula su SHA-256. Cubierto por tests.
- **D4.** Idempotencia de `load-staging`: mismo perfil reutiliza el lote; otra fecha u otro
  CSV se rechaza; todo en `sql.begin`.
- **D5.** Tests existentes modificados: las aserciones quedaron más estrictas
  (`assert.ok(primera >= 1)` → `assert.equal(primera, 1)`); ninguna se relajó.

## 3. ¿Se cumple C3-01a?

En staging, sí: los dos lotes conviven en los cuatro módulos y ningún lote exige editar
código. Faltaba resolver A1 antes del merge.

---

## Cierre (sesión que implementó, 2026-11-10)

| Hallazgo | Qué se hizo |
|---|---|
| A1 | Camino (b). `load-parties` y `load-policies` se niegan cuando staging tiene otro lote con filas (`otrosLotesConFilas` en `lote-staging.ts`, `batchUnicoParaDominio` en `cli.ts`), antes de escribir nada. `lote-manifiesto.md` dice que en I1 un lote nuevo sólo se carga a staging. Test de integración de la cuenta de lotes y corrida del CLI con dos lotes sintéticos en la evidencia. El control de discrepancia queda como estaba: con un solo lote sigue comparando conjuntos iguales |
| C1 | Rotulado en `lote-manifiesto.md`: los conteos de fuente son del lote y los de dominio de toda la base, y `sinPolicyPadre` no vale con más de un lote. Filtrar el dominio por lote queda para I1b |
| C2 | El índice excluye `repeat('0', 64)` y el comentario lo dice. Comprobado: dos lotes con esa huella se insertan después de 0012 |
| C3 | El test de dos lotes cubre `importarCuentas`, `importarContactos`, `importarMembresias`, `importarEndosos` y `generarReporte`. `importarPolizas` e `importarRenovaciones` siguen sin test de dos lotes: necesitan catálogo de aseguradoras y, con la guarda de A1, el CLI no los corre con dos lotes |
| C4 | Sin cambio de código. Documentado en `lote-manifiesto.md` que recargar el 16/09 crea un segundo lote y bloquea el dominio hasta I2 y `db:down` de 0012. Reconocer el lote legado necesita que el owner confirme la huella: se propone para I1b |
| N1–N5 | Sin cambio. N4 queda anotado en la evidencia |
