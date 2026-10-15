# T-0028: cierre de los hallazgos de la revisión ciega

- **Base revisada:** rama `task/T-0028-risk-contexto-esquema-funciones`. `HEAD` es
  `af31dca4d58b4d84a9b74c884df2b46cec443e7a` («T-0028: atender la revisión ciega»). La
  revisión ciega (`REVIEWS/T-0028-blind-review.md`) se hizo sobre `21f7759`. El
  `git diff 21f7759 af31dca` toca 8 archivos: la migración `0001_risk_schema.sql`, que se
  editó en el mismo archivo; `esquema.integration.test.ts`; `fixtures.ts`;
  `lectura.test.ts`; `testing/regresion.ts`; `eslint.config.js`; `ops/evidence/T-0028.md`
  y el informe ciego, que se agregó sin cambios. No toca `.claude/`, `.github/`,
  `DOMAIN.md`, `packages/*`, `apps/*` ni `SPIKES/`.
- **Orden de trabajo:** leí el informe ciego y el diff. Probé cada arreglo con sondas
  propias y corrí los comandos. Recién después leí la sección «Revisión ciega (R-33)» de la
  evidencia.
- **Reviewer:** un subagente nuevo que no vio la conversación de quien implementó.
- **Entorno:** Node 24.22.0 y Postgres 17 en `localhost:5432` (usuario `postgres`, con
  `trust`). Todos los datos son sintéticos (R-19).

## Qué corrí

### `pnpm check`

```text
$ DATABASE_URL=postgres://postgres@localhost:5432/delcampo_test \
  RISK_DATABASE_URL=postgres://postgres@localhost:5432/delcampo_risk_test pnpm check; echo exit=$?
✓ 68 decisiones, 31 ADRs, 32 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
ℹ tests 174 · pass 174 · fail 0            (scripts/tests)
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication
$ eslint .
ℹ tests 737 · pass 737 · fail 0 · cancelled 0 · skipped 0
exit=0
```

### Tests del contexto

```text
$ RISK_DATABASE_URL=postgres://postgres@localhost:5432/delcampo_risk_test \
  node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 "contexts/risk/src/**/*.test.ts"
ℹ tests 312 · suites 27 · pass 312 · fail 0 · cancelled 0 · skipped 0 · todo 0
```

Son 309 + 3. Las tres nuevas son el caso `evaluacion_evaluador`, el tercer caso de
`reordenamiento_vigente` (antes eran dos FK simples y ahora son tres compuestas) y el test
de C1. Coinciden con la evidencia: 199 restricciones con caso propio y 13 `unique` que
sólo son destino de una FK.

### Arnés del spike

```text
$ (cd SPIKES/T-0021/regresion-ejecutable && node --run test)
ℹ tests 213 · suites 34 · pass 211 · fail 0 · cancelled 0 · skipped 0 · todo 2
```

### CI (sólo lectura por la API REST)

Los check-runs del commit `af31dca` (la cabeza de la PR #81) son `check: success` y
`Vercel Preview Comments: success`. Todos los pasos del job `check` terminaron en
`success`. No pude bajar el log, porque la descarga del blob devuelve 403, así que no vi
cuántos tests corrieron en CI.

### Sondas de lint (temporales, borradas)

Escribí archivos `zz_sonda_*.ts` y corrí `npx eslint` sobre cada uno. Después los borré y
`git status` quedó limpio.

| Desde | Import | Resultado |
|---|---|---|
| `contexts/risk/src/domain` | `../testing/sinteticos.ts` | **falla**: «domain no importa nada fuera de domain (D-0063)» |
| `contexts/risk/src/domain` | `./../testing/sinteticos.ts` | **falla** (mismo mensaje) |
| `contexts/risk/src/domain` | `.././testing/sinteticos.ts` | **falla** |
| `contexts/risk/src/domain` | `./sub/../../testing/sinteticos.ts` | **falla** (domain y además «no importa fuera de su src/») |
| `contexts/risk/src/domain` | `export * from '../testing/…'` | **falla** |
| `contexts/risk/src/domain` | `import('./../testing/…')` dinámico | **falla** |
| `contexts/risk/src/domain` | `../persistence/fixtures.ts` | **falla** (las dos reglas) |
| `contexts/risk/src/domain` | `./metodologia.ts` (control) | pasa, exit 0 |
| `contexts/communication/src/domain` | `../acceptance/x.ts` y `./../acceptance/x.ts` | **falla**: el arreglo cubre también communication |
| `contexts/risk/src/testing` | `../persistence/fixtures.ts` | **pasa**, exit 0 (ver X3) |

`src/domain` no tiene subcarpetas en ninguno de los dos contextos, así que prohibir todo
segmento `..` no le prohíbe nada legítimo. Los `*.test.ts` de domain siguen excluidos de
ese bloque y pueden importar `../testing/` como antes.

### Sondas SQL (transacciones revertidas)

El script `zz_sonda_cierre.ts` estuvo temporalmente en `contexts/risk/src/persistence/` y
ya lo borré. Usa `base`, `fila` e `insertar` de `fixtures.ts`, y `enTransaccionRevertida`
de `testing.ts`. Cada sonda escribe la base válida, intenta la escritura y revierte.

```text
--- A1
ACEPTA   control: reordenamiento_vigente válido (ORG_A, riesgo A, inicial A)
RECHAZA  ORG_B + riesgo B + evaluación B sobre reordenamiento de ORG_A: reordenamiento_vigente_reordenamiento
RECHAZA  ORG_A + riesgo B + evaluación B: reordenamiento_vigente_riesgo_de_la_organizacion
RECHAZA  ORG_A + riesgo A + evaluación B: reordenamiento_vigente_evaluacion_del_riesgo
RECHAZA  organizacion_id null: not-null
RECHAZA  risk_id null: not-null
RECHAZA  ORG inexistente + riesgo A + eva A: reordenamiento_vigente_reordenamiento
RECHAZA  insert con la forma vieja (sin organizacion_id ni risk_id): not-null
RECHAZA  evaluación de un riesgo declarada con otro riesgo de ORG_A: reordenamiento_vigente_evaluacion_del_riesgo
--- A2
ACEPTA   control: importación con evaluador texto
RECHAZA  sesión, autor persona, evaluador "Cualquier nombre": evaluacion_evaluador
ACEPTA   sesión, autor persona, evaluador null
RECHAZA  importación, evaluador null: evaluacion_evaluador
RECHAZA  sesión, evaluador null, autor null: evaluacion_autor_de_sesion
RECHAZA  importación, evaluador "": texto_no_vacio
--- C1
ACEPTA   control: reevaluación accion_ejecutada con acción
RECHAZA  reevaluación accion_ejecutada con decisión de tratamiento: evaluacion_accion_del_mismo_riesgo
RECHAZA  reevaluación accion_ejecutada con acción de otra org: evaluacion_accion_del_mismo_riesgo
RECHAZA  reevaluación con accion_tipo explícito: cannot insert a non-DEFAULT value into column "accion_tipo"
ACEPTA   control: revision_pendiente accion_ejecutada con una acción nueva
RECHAZA  revision_pendiente accion_ejecutada con decisión: revision_pendiente_accion_del_riesgo
--- C4 (sin cambio esperado)
ACEPTA   alter table risk.evaluacion disable trigger solo_insercion + update
RECHAZA  update con el trigger: «risk.evaluacion: sólo inserción; un update no se permite (R-22, R-23)»
```

En el catálogo de `delcampo_risk_test`, `evaluacion.evaluador` es nullable. Las columnas
`evaluacion.accion_tipo` y `revision_pendiente.accion_tipo` son `GENERATED ALWAYS`.
`reordenamiento_vigente` tiene `organizacion_id` y `risk_id`, las dos `NOT NULL`.

## Hallazgos de la revisión ciega

| Id | Estado | Cómo lo comprobé |
|---|---|---|
| **A1** | **Cerrado** | Hay tres FK compuestas (`reordenamiento → (id, organizacion_id)`, `riesgo → (id, organizacion_id)`, `evaluacion → (id, risk_id)`) y las dos columnas nuevas son `NOT NULL`. Las sondas prueban las tres combinaciones para meter una evaluación de ORG_B, una organización inexistente, un riesgo mal declarado y la forma vieja del insert: todas se rechazan, cada una con la restricción esperada. El control válido pasa. El test se renombró y ahora prueba riesgos y evaluaciones vigentes. «Lo que la base no hace cumplir» ya no lista ese punto: quedan «fueran las vigentes» y el recálculo, que dependen del momento. |
| **A2** | **Cerrado** | `evaluacion_evaluador` sigue el patrón de `revision_humana_revisor`: desde una sesión el texto es nulo y la identidad es `autor_persona_id`; desde una importación el texto es obligatorio. Sondeado en los cuatro cuadrantes. Ningún código TS lee `evaluacion.evaluador` de la base (lo busqué con grep); el oráculo lee la columna `evaluador` del CSV, no de la tabla. No encontré otro texto de autoría libre que venga de una sesión. |
| **A3** | **Cerrado** | Hay un `prohibirImports('/(^\|\x2F)\.\.(\x2F\|$)/')` nuevo en el bloque de domain, que el config genera para cada contexto. Lo probé con 10 sondas (tabla de arriba). Fallan `../testing/`, `./../testing/`, `.././`, `export *` e `import()`; desde communication fallan `../acceptance/` y `./../acceptance/`. Pasa el control `./metodologia.ts`. El resto del hallazgo (que `src/testing` → `persistence` pase) no está atendido: ver X3. |
| **C1** | **Cerrado** | `accion_tipo` es una columna generada (sólo puede valer `'accion'` o `NULL` y no se puede escribir) y la FK va a `accion (id, risk_id, tipo_registro)` en `evaluacion` y en `revision_pendiente`, con su `unique` de destino. Las sondas rechazan la decisión de tratamiento en las dos tablas y aceptan la acción. Un `accion_tipo` explícito es un error de Postgres. Con `accion_id` nulo la FK no se evalúa (MATCH SIMPLE), así que las demás reevaluaciones y revisiones no cambian. |
| **C2** | **Cerrado con respuesta escrita aceptable** | Esta era una de las dos salidas que proponía el informe: el test se rotuló «del lado de la lectura» y cita a `«un UPDATE sobre una evaluación escrita falla»`. Comprobé que ese test existe (`esquema.integration.test.ts:389`) y que pasa. |
| **C3** | **Cerrado con respuesta escrita aceptable** | La respuesta dice que `items` es la entrada del orden, de una sola organización; que `derivados` entrega el vector con las banderas, y que la regla 1 es responsabilidad de la superficie (T-0030). Es defendible porque `rankingOrganizacion` no mezcla organizaciones y la regla 1 habla de lo que se muestra o entrega. El informe pedía «como mínimo una línea en el README» y no se agregó: la advertencia vive sólo en la evidencia. Lo dejo como parte de X1. |
| **C4** | **Cerrado con respuesta escrita aceptable** (con una reserva, X1) | La evidencia agrega la sección «Rol de base para el despliegue (T-0032)» y lo deriva a T-0032. La sonda confirma que la limitación sigue igual, como se esperaba. La reserva es que `TASKS/T-0032-…` no lo menciona y no lista `ops/evidence/T-0028.md` en `contextRefs` (sí lista `contexts/risk/README.md`, que tampoco lo dice). Además, la evidencia escribe «R-22 pide además que … no sea dueño del esquema». R-22 no dice eso: dice «no tiene `UPDATE` ni `DELETE`», y lo de no ser dueño era una sugerencia del informe. |
| **N1** | **Cerrado con respuesta escrita aceptable** | Es heredado del spike. Cambiarlo sería cambiar una regla, y eso está en Non-scope. |
| **N2** | **Cerrado** | La comparación ahora es `b === a \|\| b.startsWith(`${a} · `)`. Lo comprobé con el formato real de `regresion-emi41.csv` (`C 60 · pos 1 · Alta · …`): `C 64 · pos 1` ya no coincide con `C 64 · pos 12 · …`, `C 6` tampoco coincide con `C 64 · …`, y el caso sin posición (`C 64` contra `C 64 · Alta…`) sigue coincidiendo. El oráculo sigue en verde: 59/59. No hay un test que fije el caso `pos 1`/`pos 12`, cosa que el informe tampoco pedía. |
| **N3** | **Cerrado con respuesta escrita aceptable** | Son restricciones que el contrato no promete. Quedan derivadas a T-0029 y T-0030. |
| **N4** | **Cerrado con respuesta escrita aceptable** (ver X2) | Comprobé que el CI de `af31dca` está en verde. La evidencia, sin embargo, se contradice sobre el CI. |
| **N5** | **Cerrado con respuesta escrita aceptable** | La modificación sólo agrega aserciones. La evidencia dice que «queda marcado en la PR»; no lo verifiqué en la descripción de la PR. |
| **N6** | **Cerrado con respuesta escrita aceptable** | `src/testing/` es soporte de tests, no se exporta y ahora queda fuera del alcance de domain por lint. |

## Contraste con la resolución de quien implementó

La tabla de la evidencia coincide con lo que observé en A1, A2, A3, C1, C2 y N2, y también
en los números: 312 tests del contexto, 737 en total, 199 casos y 13 `unique` de destino.
Las diferencias son tres:

- **A3** dice «Resuelto». El núcleo está resuelto, pero la segunda mitad del hallazgo
  (`src/testing` no está acotado como dice el README) no se menciona: X3.
- **C4** dice «Derivado a T-0032», pero T-0032 no se enteró: X1.
- **N4** dice «CI de la PR #81 en verde», mientras que «Qué NO se verificó» sigue diciendo
  «CI. No se corrió el workflow»: X2.

## Hallazgos nuevos

### Consider

- **X1: Lo derivado a otras tareas vive sólo en la evidencia de T-0028.** C4 (el rol de la
  app no es dueño de `risk.*` y no tiene `UPDATE`/`DELETE`/`TRUNCATE`; los triggers solos
  se pueden saltear) y C3 (`items` trae `C_raw` sin el vector) se resolvieron como
  requisitos de T-0032 y T-0030. Pero ni `TASKS/T-0032-risk-despliegue-y-aceptacion.md`
  ni `contexts/risk/README.md` (que está en los `contextRefs` de T-0032) lo dicen, y
  T-0032 no lista `ops/evidence/T-0028.md`. T-0032 es `riskClass: HIGH`: quien la
  implemente no tiene cómo enterarse. **Qué hacer:** agregar dos líneas al README del
  contexto (el requisito del rol y la advertencia sobre `items`), que es el documento que
  T-0030 y T-0032 ya leen. También sirve agregarlas a `## Risks` o al Outcome de T-0032,
  pero eso cambia el contrato de otra tarea. De paso, corregir «R-22 pide además que …
  no sea dueño del esquema»: eso no es de R-22, es la recomendación del informe.

### Noted

- **X2: La evidencia se contradice sobre el CI.** La tabla R-33 dice (N4) «CI de la PR
  #81 en verde» y «Qué NO se verificó» sigue diciendo «CI. No se corrió el workflow». El
  CI de `af31dca` está en verde (lo comprobé por REST), pero no pude ver el log para
  confirmar que los tests de `contexts/risk` corrieron en CI y no se cancelaron. Conviene
  dejar una sola versión: que CI está en verde en `af31dca`, con lo que se sabe y lo que no.
- **X3: El README del contexto promete que `src/testing/` sólo importa `domain` y
  `node:*`, y el lint no lo hace cumplir.** Esto era la segunda mitad de A3 y la
  resolución no la menciona. Sonda: `src/testing/zz.ts` → `../persistence/fixtures.ts`
  da exit 0. El riesgo es bajo, porque `testing` no se exporta y sólo lo usan los tests.
  Se arregla con un bloque más en el config, o ajustando la tabla del README para que
  diga lo que de verdad se controla.
- **X4: La migración `0001_risk_schema.sql` se editó en el mismo archivo.** El runner no
  guarda un checksum, así que una base local migrada con `c6cbdc1` queda con el esquema
  viejo sin ningún aviso (`migrate` contesta «ninguna migración pendiente»). Como la rama
  no se mergeó y la única base local es `delcampo_risk_test` (que los tests rearman), hoy
  no afecta. Quien tenga una `delcampo_risk_dev` de antes tiene que hacer `down` y
  `migrate`. Después del merge, cualquier cambio va en `0002`.
- **X5: El caso de `evaluacion_evaluador` en `CASOS` cubre una sola dirección** (una
  sesión con texto). La otra (una importación sin texto) la probé yo y la base la rechaza,
  pero ningún test la fija. Como el test de catálogo exige un caso por restricción y no
  uno por rama, no es una falta de cobertura del contrato.

No encontré regresiones: `pnpm check` (typecheck, lint y 737 tests), la suite del
contexto (312), el oráculo 59/59, el arnés del spike (211/0/2) y el CI de `af31dca` están
en verde. Las FK nuevas no cambian el comportamiento cuando `accion_id` es nulo, y la
regla de lint nueva no bloquea ningún import legítimo de `src/domain`, que no tiene
subcarpetas.

## Veredicto

**Los hallazgos Act on (A1, A2 y A3) están cerrados, y C1 también, todos con arreglos
comprobados con sondas propias.** C2, C3, C4 y N1 a N6 se cierran con una respuesta
escrita aceptable. No queda ningún hallazgo abierto que bloquee el merge. Antes de pedir
el merge, recomiendo atender X1, que son dos líneas en `contexts/risk/README.md` para que
el requisito del rol (C4) y la advertencia sobre `items` (C3) lleguen a T-0030 y T-0032,
y la contradicción X2 de la evidencia. X3, X4 y X5 quedan anotados.

## Límites

- No corrí CI ni probé con un rol que no sea `postgres` (superusuario).
- No pude leer el log del job de CI.
- No revisé la descripción de la PR #81 (N5).
- No modifiqué ningún archivo del repositorio salvo este informe. Las sondas de lint y SQL
  se borraron, y las de SQL corrieron en transacciones revertidas. `git status` quedó
  limpio antes de escribir este archivo.
