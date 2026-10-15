# T-0028 — Revisión ciega (R-33)

- **Base revisada:** rama `task/T-0028-risk-contexto-esquema-funciones`, `HEAD` =
  `21f7759f600a7a7a473af3ab9d741ac9f8395565` (dos commits sobre `main` =
  `3547de3fefedafcecd6012307cca49bd87e5469f`: `c6cbdc1` con el contexto y `21f7759` con
  la evidencia). El diff entregado (`diff.patch`, 4134 líneas) coincide con
  `git diff main...HEAD`: 29 archivos, ninguno bajo `SPIKES/`, `packages/*`, `apps/*`,
  `DOMAIN.md`, `.claude/` ni `.github/`.
- **Contrato:** el de `main` (`contrato-desde-main.md`). Lo comparé con
  `git show main:TASKS/T-0028-…` y es idéntico. La única diferencia de la rama en el
  archivo de la tarea es `status: DRAFT → ACTIVE`.
- **Contexto leído por cuenta propia:** `ENGINEERING_RULES.md` (R-13, R-19, R-22, R-23,
  R-25, R-26, R-29 a R-33), `SLICES/RO01.md` §3, `SLICES/RO01-decisiones.md` (texto
  literal del owner), `DECISIONS/0051-…` (tabla de mecanismos, en particular BR-004),
  `decisions.yaml` (D-0051, D-0052), `SPIKES/T-0021/v1/metodologia-v1.md` §14,
  `SPIKES/T-0021/regresion-ejecutable/metodologia.ts` completo,
  `SPIKES/T-0021/v0/fase-15/sinteticos/ciclo.ts`,
  `SPIKES/T-0021/v0/fase-15/contrato/reglas-validacion.csv` (RV-EVA-*, RV-ACC-*,
  RV-REV-*), `SPIKES/T-0021/v0/fase-15/verificacion-15b.md` §4, `eslint.config.js`
  completo, `scripts/guard-db-tests.mjs`, `contexts/communication/src/persistence/migrations.ts`
  (para comparar la copia) y `REVIEWS/T-0025-blind-review.md` como modelo de formato.
- **Orden:** corrí los cuatro comandos de `## Verification` antes de abrir
  `ops/evidence/T-0028.md`. Después leí el diff, comparé el port contra el spike línea a
  línea y probé hipótesis con sondas. Leí la evidencia al final.
- **Reviewer:** subagente aislado, sin transcript ni justificación de quien implementó.

## Verificación ejecutada antes de leer evidencia

Node 24.22.0 (`/tmp/claude-0/node24/bin`), Postgres 17 en `localhost:5432`, usuario
`postgres` con `trust`.

### 1. `pnpm check`

Sin variables, `pnpm check` falla: los tests de integración de Broker no tienen
`DATABASE_URL` (el contenedor no tiene `.env` ni rol `root`). Es el entorno, no el diff.
Con la base local:

```text
$ DATABASE_URL=postgres://postgres@localhost:5432/delcampo_test \
  RISK_DATABASE_URL=postgres://postgres@localhost:5432/delcampo_risk_test pnpm check; echo exit=$?
✓ 68 decisiones, 31 ADRs, 32 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
[… scripts/tests: "fatal: Not a valid object name origin/main" es la salida esperada …]
ℹ tests 174 · pass 174 · fail 0
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication
$ eslint .
$ node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 "packages/**/*.test.ts" "apps/**/src/**/*.test.ts" "contexts/**/src/**/*.test.ts"
ℹ tests 734 · suites 118 · pass 734 · fail 0 · skipped 0 · todo 0
exit=0
```

### 2. `createdb delcampo_risk_test`

`createdb` no existe en el contenedor. La base ya estaba creada (la listé en
`pg_database`); `openTestDatabase()` la crea si falta.

### 3. `RISK_DATABASE_URL=… pnpm test`

```text
$ DATABASE_URL=postgres://postgres@localhost:5432/delcampo_test \
  RISK_DATABASE_URL=postgres://postgres@localhost:5432/delcampo_risk_test pnpm test; echo exit=$?
ℹ tests 734 · suites 118 · pass 734 · fail 0 · cancelled 0 · skipped 0 · todo 0
exit=0
```

Sólo el contexto: 309 tests, 27 suites, 309 pass, ningún `skip`. Corrieron, entre otros,
«los 59 objetos coinciden; S15 sin la posición», «una copia de la regresión con un valor
alterado hace fallar la comparación», 197 casos de «cada restricción rechaza su caso» más
«los casos cubren todas las restricciones del esquema», «ninguna tabla admite UPDATE,
DELETE ni TRUNCATE», «aplicar, revertir todas y volver a aplicar».

### 4. Arnés del spike

```text
$ (cd SPIKES/T-0021/regresion-ejecutable && node --run test)
ℹ tests 213 · suites 34 · pass 211 · fail 0 · cancelled 0 · skipped 0 · todo 2
```

### Comprobaciones humanas, repetidas por mí

- **Migraciones con la CLI sobre `delcampo_risk_test`:** `down` → «down
  0001_risk_schema.sql»; `down` → «no hay migraciones aplicadas»; `migrate` →
  «0001_risk_schema.sql»; `migrate` → «ninguna migración pendiente». Con
  `RISK_DATABASE_URL=…/delcampo_test` la CLI se niega («no es delcampo_risk_dev ni
  delcampo_risk_test», exit 1). La base quedó migrada, como la encontré.
- **Lint (sondas temporales, borradas en el mismo comando; `git status` igual antes y
  después).** Fallan como corresponde: desde `contexts/risk` hacia `@del-campo/db`,
  `@del-campo/communication` y `../../../communication/src/…`; desde `src/domain` hacia
  `node:fs` y `../persistence/…`; desde `src/persistence` hacia `../application/…`;
  desde `contexts/communication` hacia `@del-campo/risk`; desde `packages/db` hacia
  `@del-campo/risk` y `../../../contexts/risk/…`; desde `apps/web/src` y
  `apps/communication/src` hacia `@del-campo/risk`. **Pasa sin error** un archivo de
  `src/domain` que importa `../testing/sinteticos.ts` (que usa `node:fs`): ver A3.
- **Oráculo, mutación por mutación.** Con un script en el scratchpad apliqué 317
  mutaciones de a una (`ext`, `sc`, `I`, `C`, `pos`) sobre el `resultado_nuevo` de cada
  fila de las 8 empresas en una copia en memoria de `regresion-emi41.csv`.
  `compararConRegresion` detectó 271. Las 46 que no detectó son todas de las tres
  exclusiones deliberadas: filas del otro evaluador del mismo riesgo (que no son la fila
  comparada), banda/banderas/I de un padre y posiciones de S15. El oráculo no es
  tautológico.

## Sondas propias contra la base

Un script en el scratchpad que usa `fixtures.ts` y `enTransaccionRevertida` del propio
contexto: cada sonda escribe la base válida, intenta la escritura y revierte.

```text
ACEPTA   reordenamiento_vigente con evaluación de otra organización
ACEPTA   reevaluación accion_ejecutada que nombra una decision_tratamiento
ACEPTA   revision_pendiente accion_ejecutada sobre una decision_tratamiento
ACEPTA   cierre con reevaluacion_aceptada que nombra la inicial (no posterior)
ACEPTA   orden_previo_item sobre un escenario
ACEPTA   orden_previo_item dos riesgos con la misma posición
ACEPTA   registro_acceso inicio_sesion con organizacion
RECHAZA  accion_estado efecto con una evaluación que no nombra la acción: accion_estado_reevaluacion_de_esta_accion
ACEPTA   evaluación sobre escenario
RECHAZA  evidencia multidimensional: "searching for elements in multidimensional arrays is not supported"
ACEPTA   factor_objetivo con duplicados
RECHAZA  id con salto de línea final: id_persona_formato
ACEPTA   alter table … disable trigger solo_insercion + update de evaluación (dueño)
ACEPTA   set local session_replication_role = replica + delete de novedad
RECHAZA  miembro_escenario de otra organización: miembro_escenario_escenario
ACEPTA   novedad sobre un padre
ACEPTA   reordenamiento con orden_previo de otra persona
ACEPTA   evaluación desde sesión con evaluador «Cualquier nombre» distinto de la persona
ACEPTA   accion importada con autor persona
```

Además confirmé por lectura que el trigger `evaluacion_anterior_registrada` cierra los
ciclos de un `INSERT` de varias filas porque un `BEFORE ROW` ve las filas anteriores de
la misma sentencia y no la propia: con una sola inicial, sin dos sucesoras y la anterior
del mismo riesgo, la historia es una cadena.

## Port de la metodología

Comparé `contexts/risk/src/domain/metodologia.ts` con
`SPIKES/T-0021/regresion-ejecutable/metodologia.ts` función por función. Las de la lista
del Outcome (`vPorDimension`, `criticidad`, `banda`, `CORTES_BANDA`, `evaluar`,
`techoPlausible`, `iEfectivo`, `peorCreibleFueraDeRango`, `consecuenciaExtrema`,
`safetyCritical`, `compararD10`, `compararAcotado`, `rankingD10`, `posicionPadre`,
`colaValidacion`) son el cuerpo del spike con el parámetro `reglas` fijado en
`'v1 candidate'`:

- `iEfectivo`: `reglas === 'v1 candidate' && …` pasa a `…`; idéntico en v1.
- `alcanza`: `(reglas !== 'v0.3' || !evaluable) && f.max…` pasa a `f.max…`; idéntico con
  `v1 candidate`. La opción c ([F11-7]) se conserva.
- `evaluar`: el arreglo `cotas` pasa a la lista `acotadas` y la condición
  `cotas.some(c > cRaw)` a `acotadas.some(cPorDimension[d] > cRaw)`; mismo conjunto, mismo
  resultado. `acotadas` se agrega a la salida evaluable y no la lee nada del cálculo.
- `colaValidacion`: `iPersMaximo(f)` = `techo(f.i.pers)` se inlinea.

`lectura.ts` porta `historia`, `vigente`, `derivados`, `ranking` y `posicion` de
`v0/fase-15/sinteticos/ciclo.ts` con las mismas reglas; lo nuevo es que `historia` falla
ante dos iniciales, ramas o evaluaciones sueltas (decisión 8, RV-EVA-03/07) y que
`rankingOrganizacion` falla ante dos organizaciones o un padre con evaluación. No
encontré ningún cambio de regla.

## Contraste con la evidencia, leída después

`ops/evidence/T-0028.md` coincide con lo que observé: 734 tests en `pnpm check` y
`pnpm test`, 309 del contexto, 211 pass / 0 fail / 2 todo en el arnés, el ciclo
`down`/`down`/`migrate`/`migrate` con la misma salida, 59/59 objetos con S15 sin
posición, y las cuatro sondas de lint del contrato (yo agregué las de `persistence →
application`, `domain → persistence`, `communication → risk`, `packages/db → risk` por
ruta y `apps/communication → risk`). Tiene las secciones de R-09b (`Comandos y salida
literal`, `Observación externa`, `Qué NO se verificó`) y el SHA base. Declara con
honestidad que `createdb` no existe y que sin `DATABASE_URL` los tests se cancelan.

Lo que la evidencia no dice o dice distinto:

- **«Lo que la base no hace cumplir»** deja a la aplicación «que las evaluaciones de
  `reordenamiento_vigente` sean de riesgos de la organización». Es una invariante de
  relación expresable con claves compuestas, y el test
  `esquema.integration.test.ts:447` se titula «un reordenamiento mezcla una sola»
  organización. Ver A1.
- **«Lo que viene de una sesión tiene persona (decisión 2)»** es cierto para
  `autor_persona_id`, pero `evaluacion.evaluador` sigue siendo texto libre también desde
  una sesión. Ver A2.
- **La sonda de `domain → node:fs`** pasa, pero no cubre `domain → ../testing/`, que
  `pnpm lint` deja pasar. Ver A3.
- No menciona que el sólo inserción por trigger lo saltea el dueño de las tablas
  (C4), ni que se modificó un test existente de `scripts/tests/` (N5).

## Act on

### A1 — `reordenamiento_vigente` admite evaluaciones de otra organización

- **Dónde:** `contexts/risk/migrations/0001_risk_schema.sql:707-711`. La tabla tiene sólo
  `reordenamiento_id` y `evaluacion_id`, cada una con su FK simple.
- **Problema:** el reordenamiento (`:664-701`) se cuida de que `risk_id_sube`,
  `risk_id_baja`, `risk_id` y `orden_previo_id` sean de su `organizacion_id`, con FKs
  compuestas. Las evaluaciones «con las que se calculó el orden», que es lo que permite
  reproducir `orden_calculado` (decisión 5), no tienen esa restricción. Sondeado: una
  fila con `B.reordenamiento` (ORG_A) y `B.inicialOrgB` (ORG_B) se acepta. El test
  `esquema.integration.test.ts:447` se titula «organizaciones distintas no comparten un
  orden: un reordenamiento mezcla una sola» y sólo prueba `risk_id_baja`; el título
  promete más de lo que la base garantiza.
- **Por qué es Act on y no un límite aceptable:** es una invariante de una relación, la
  clase que el Outcome y D-0051 ponen en la base; el esquema ya resuelve el mismo patrón
  con claves compuestas en el resto de las tablas; y D-0051 tiene el precedente exacto
  (BR-004: una `PolicyVersion` podía citar un Endorsement de otra Policy, y se cerró con
  una FK compuesta). Una foto de auditoría que mezcla una evaluación de otra empresa es
  justamente lo que RO01 §3 regla 4 prohíbe.
- **Qué hacer:** agregar `risk_id` y `organizacion_id` a `reordenamiento_vigente`, con FK
  `(evaluacion_id, risk_id) → evaluacion (id, risk_id)`,
  `(risk_id, organizacion_id) → riesgo (id, organizacion_id)` y
  `(reordenamiento_id, organizacion_id) → reordenamiento (id, organizacion_id)` (requiere
  `unique (id, organizacion_id)` en `reordenamiento`). Un caso por FK nueva, y sacar el
  punto de «Lo que la base no hace cumplir» (queda ahí sólo que fueran las vigentes, que
  sí es temporal). Si se decide no hacerlo, renombrar el test para que diga lo que prueba.

### A2 — Desde una sesión, `evaluacion.evaluador` sigue siendo un nombre escrito libremente

- **Dónde:** `0001_risk_schema.sql:222` (`evaluador risk.texto not null`) y `:369`
  (`evaluacion_autor_de_sesion`), frente a `:543-547` (`revision_humana_revisor`).
- **Problema:** la decisión 2 del owner dice, literal: «La identidad de quien evalúa,
  revisa o acepta deriva de la sesión y no de un nombre escrito libremente», y el
  Outcome: «el autor de cada registro es una referencia a la persona, no un texto
  libre». Para quien revisa el esquema lo hace bien: desde una sesión,
  `revisado_por_origen` tiene que ser nulo y `revisor_persona_id` no nulo. Para quien
  evalúa, no: una evaluación con `origen = 'sesion'`, `autor_persona_id = PER-…01` y
  `evaluador = 'Cualquier nombre'` se acepta (sondeado). Quedan dos identidades del
  evaluador en la misma fila, y una es texto libre.
- **Escenario:** en T-0030 un formulario de evaluación precarga o deja editar
  `evaluador`; el historial y la revisión profesional (decisión 6: «un profesional
  distinto del evaluador original») leen un nombre que no es el de la sesión. Que el
  revisor sea distinto del evaluador deja de ser comprobable contra la base.
- **Qué hacer:** el mismo patrón que `revision_humana_revisor`: `evaluador` nullable (o
  renombrado `evaluador_origen`) y `check (case origen when 'sesion' then evaluador is
  null else evaluador is not null end)`, con su caso en `CASOS`. Revisar si algún otro
  texto de autoría quedó igual (no encontré otro).

### A3 — `pnpm lint` deja que `src/domain` importe `src/testing` (y cualquier carpeta hermana)

- **Dónde:** `eslint.config.js:271`. El bloque de `src/domain` prohíbe por regex sólo
  `(persistence|application)/`; `contextoAislado` prohíbe salir de `src/` con dos `..`.
  Un `../testing/…` no cumple ninguna de las dos.
- **Problema:** el Outcome pide que `pnpm lint` falle «si `src/domain` importa algo». Con
  `src/testing/` nuevo —que usa `node:fs` y lee los CSV del spike— un archivo de dominio
  puede hacer `import { leerArchivo } from '../testing/sinteticos.ts'` y `pnpm lint` sale
  0 (sondeado, y borrado). La regla «domain no importa nada fuera de domain» queda
  escrita en el mensaje pero no en el selector. El README (tabla «Puede importar») dice
  además que `src/testing/` sólo importa `domain` y `node:*`; nada lo hace cumplir
  (sondeado: `src/testing` → `../persistence/…` pasa).
- **Qué hacer:** en el bloque de `src/domain`, prohibir todo relativo que suba de
  carpeta (`/^\.\.\x2F|\x2F\.\.\x2F/` o equivalente, dado que `src/domain` es plano), o
  listar por la positiva lo permitido (`./`). Agregar la sonda `domain → ../testing/` a
  las del contrato. El mismo selector vive en el bloque generado para `communication`,
  así que el arreglo lo cubre también (hoy `src/acceptance/` de communication tiene la
  misma exposición).

## Consider

### C1 — Una reevaluación `accion_ejecutada` o una revisión pendiente pueden nombrar una decisión de tratamiento

- **Dónde:** `0001_risk_schema.sql:362` (`evaluacion_accion_del_mismo_riesgo`) y `:598`
  (`revision_pendiente_accion_del_riesgo`): FK a `accion (id, risk_id)` sin el tipo.
- **Problema:** RV-EVA-05 exige que la acción esté `cumplida`, y sólo una
  `tipo_registro = 'accion'` puede tener estado (`accion_estado_solo_acciones`). Una
  decisión de tratamiento no puede estar cumplida nunca, así que nombrarla es siempre
  inválido, independientemente del momento; es fijo y de una relación. Sondeado: las dos
  se aceptan con `B.decision`. La aplicación lo atraparía si implementa RV-EVA-05 entera,
  por eso no es Act on.
- **Qué hacer:** el patrón de `accion_estado`: columna `accion_tipo default 'accion'`
  con check, y FK `(accion_id, risk_id, accion_tipo) → accion (id, risk_id,
  tipo_registro)` (requiere el `unique` de destino).

### C2 — El test de la propiedad 6 de §14 prueba que un filtro no muta su entrada

- **Dónde:** `contexts/risk/src/domain/lectura.test.ts:81-89`.
- **Problema:** «un cambio de versión nunca sobrescribe una ficha anterior» se prueba
  llamando dos veces a `historia` y comprobando que el arreglo anterior no cambió. Es
  verdad por construcción de una función pura, y la evaluación «nueva» ni siquiera tiene
  otra versión (`modelo.Evaluacion` no tiene campo de versión). La garantía real de la
  propiedad 6 es la de la base (`solo_insercion`, `evaluacion_sin_ramas`,
  `evaluacion_anterior_del_mismo_riesgo`), y esa sí está probada en la integración.
- **Qué hacer:** reapuntar el test: una reevaluación con `motivo =
  'cambio_version_metodologia'` y `version_metodologia` distinta se inserta, el `UPDATE`
  de la anterior falla, y la anterior sigue con su versión. O, si se deja, rotularlo como
  lo que es y citar el test de integración como la evidencia de la propiedad.

### C3 — `rankingOrganizacion` exporta `items` con `C_raw` sin vector ni banderas

- **Dónde:** `contexts/risk/src/domain/lectura.ts:106` (`items: Map<string,
  ItemRanking>`), exportado por `src/application/index.ts`.
- **Problema:** RO01 §3 regla 1: «Toda salida que muestre o entregue `C_raw` … trae en
  el mismo registro el vector completo … y las dos banderas». `ItemRanking` trae `cRaw`,
  `iEfectivo` e `iPers` y nada más. El test de la regla 1 es de la tarea que implementa la
  superficie (T-0030), pero la capa de aplicación que T-0028 cierra ya entrega una forma
  que, serializada tal cual, la viola; y en un padre, `items` lleva el `cRaw` del hijo
  bajo el id del padre.
- **Qué hacer:** que `RankingOrganizacion` no exponga `items` (las posiciones ya dan el
  orden, y `derivados` da `C_raw` con el vector), o que cada ítem lleve sus `Derivados`.
  Como mínimo, una línea en el README para T-0030.

### C4 — El sólo inserción lo saltea el dueño de las tablas

- **Dónde:** `0001_risk_schema.sql:66-72` y `:717-727`.
- **Problema:** R-22 pide que «el rol de aplicación no tiene `UPDATE` ni `DELETE`»; acá
  el mecanismo es un trigger. Sondeado en transacción revertida: `alter table
  risk.evaluacion disable trigger solo_insercion` seguido de un `UPDATE` se acepta, y
  `set local session_replication_role = replica` permite un `DELETE`. Con un único rol
  dueño del esquema para migrar y para servir, la garantía es de convención.
- **Qué hacer:** dejarlo escrito en `## Qué NO se verificó` y como requisito para T-0032:
  el rol de la app no es dueño de `risk.*` y no tiene `UPDATE`/`DELETE`/`TRUNCATE`
  (además del trigger).

## Noted

- **N1 — La posición de un padre en un bloque provisional usa el ítem de un hijo
  arbitrario** (`lectura.ts:172-173`: `hijosPrioritarios[0]`). Con hijos de igual
  `C_raw` e I efectivo indeterminado, el padre compite con el `iEfectivo` del primero
  según el orden del `sort`. Es heredado tal cual de `ciclo.ts:88-89`: no es un cambio
  de regla; la metodología no lo define. Para EMI-43.
- **N2 — El oráculo compara un padre con `startsWith`** (`testing/regresion.ts:137`).
  `C 64 · pos 1` es prefijo de `C 64 · pos 12 …`. Con las posiciones de las 8 sintéticas
  (máximo 6) no se dispara; con un lote más grande, comparar `C · pos` contra el prefijo
  hasta el siguiente `·`.
- **N3 — Restricciones finas que no están y no promete el contrato:** `factor_objetivo`
  admite duplicados (`{p,p}`); `orden_previo_item` admite dos riesgos en la misma
  posición y un escenario; `registro_acceso` de `inicio_sesion` admite
  `organizacion_id`; un reordenamiento puede citar el orden previo de otra persona;
  una novedad puede apuntar a un padre. Ninguna rompe una regla escrita; las anoto para
  T-0030/T-0031.
- **N4 — Los comandos de `## Verification` no corren literales en este contenedor**:
  no hay `createdb` y `pnpm test` necesita `DATABASE_URL` para los tests de Broker. Lo
  dice la evidencia; lo repito porque CI es la otra mitad que no se corrió.
- **N5 — Se modificó un test existente** (`scripts/tests/guard-db-tests.test.mjs`,
  +4 aserciones para `RISK_DATABASE_URL`) y la guarda (`scripts/guard-db-tests.mjs`)
  pasó de una variable a una lista. No afloja nada: las aserciones previas siguen. R-13
  pide marcarlo en el PR.
- **N6 — `src/testing/` es una cuarta carpeta** que el Outcome no lista (domain,
  persistence, application). Es soporte de tests, no se exporta y el README la explica;
  su único problema es el de A3.

## Dismissed

- **D1 — «Ninguna función compara `C_raw` entre riesgos» frente a `compararD10`.** RO01
  §3 regla 2 permite expresamente «ordenar dentro de una organización (D10)», y
  `compararD10`/`rankingD10` no salen del paquete: el test de `application/index.test.ts`
  fija la lista de exports y `rankingOrganizacion` falla con dos organizaciones.
- **D2 — Arreglos multidimensionales en `risk.referencias`.** La base los rechaza igual
  (con un error de `array_position`, no con el nombre de la restricción). No dejan pasar
  nada inválido.
- **D3 — El campo `acotadas` agregado a `evaluar`.** Es salida adicional; ninguna
  función de cálculo lo lee y el conjunto de dimensiones que acota es el mismo que el
  arreglo `cotas` del spike. No cambia ninguna regla.
- **D4 — Tercera copia del runner de migraciones.** Aceptada en `## Risks` del contrato
  y en D-0063; la copia es fiel a la de communication (diff: sólo comentarios).
- **D5 — `cierre_revision` admite como «reevaluación aceptada» la inicial del riesgo.**
  Que sea posterior a la apertura, `accepted` y con el motivo del disparador depende del
  estado en otro momento; la evidencia lo lista como de la aplicación y el Outcome lo
  permite.
- **D6 — Evaluaciones sobre escenarios.** Un escenario por causa común tiene sus propios
  factores (§10.3); el ranking lo deja fuera y la propiedad 5 está probada sobre las
  sintéticas.

## Límites de esta revisión

- No corrí CI ni probé con un rol distinto de `postgres` (superusuario).
- No revisé uno por uno los 197 casos de restricción: confié en el test que los compara
  con el catálogo, después de leer su consulta y comprobar que excluye sólo los `unique`
  que contienen la clave primaria y las PK de identidad.
- No verifiqué las propiedades §14 con otra implementación; leí los tests y corrieron en
  verde.
- No modifiqué ningún archivo del repositorio salvo este informe; las sondas de lint se
  borraron en el mismo comando y las de la base corrieron en transacciones revertidas.
  La base `delcampo_risk_test` quedó migrada, como la encontré.
