# Revisión ciega R-33 — T-0044

- **Tarea:** T-0044 · Leer el kind como YAML, eximir las altas de planificación y escribir los límites del control (CHORE, MEDIUM, POS)
- **Fecha:** 2026-11-10
- **Revisor:** subagente aislado (sin transcript ni narrativa de la implementación)
- **Qué se revisó:** el contrato de `TASKS/T-0044-seguimiento-revision-control.md` (frontmatter, Why, Outcome, Non-scope, Verification, Data effects), el diff completo de la rama `task/T-0044-revision-seguimiento` (commit `03133c3` sobre `origin/main` = `b80911a`) más el parche del owner a `scripts/check-review-required.mjs`, y por cuenta propia R-33, D-0052, D-0086, `DECISIONS/0086-control-del-cambio-por-diff.md`, `scripts/check-task-contract.mjs`, `scripts/check-docs.mjs` y `.github/workflows/project-os-check.yml`.
- **Desvío del paso 1 de R-33, declarado:** el contrato se leyó desde la rama, porque la tarea no existe en `main`. Ver el Act on 4.

## Entorno

La copia `full` no es un repositorio git, así que los comandos con `CHECK_BASE_REF` no se pueden correr ahí. Cloné `/home/user/del-campo` en
`<scratchpad de la sesión>/probe`, hice checkout de la rama, apunté `origin/main` a `b80911a` (en el clon, `origin/main` resolvía al `main` local del original, `6d27aba`, que está atrasado) y apliqué el parche copiando `full/scripts/check-review-required.mjs` en un commit de sonda. `node_modules` es un symlink. No se tocó `/home/user/del-campo`.

## Comandos de Verification y resultado

| Comando | Resultado |
|---|---|
| `pnpm check` | **exit 1, por falta de Postgres.** `check-docs` pasó (85 decisiones, 50 ADRs, 44 tareas, 0 avisos), `check-agent-run` pasó, `node --test scripts/tests/*.test.mjs` dio 255/255, y `typecheck` y `lint` pasaron. `pnpm test` dio 42 fallos y 593 cancelados, todos por `ECONNREFUSED 127.0.0.1:5432` o derivados de eso (el CLI `persistence/cli.ts create` y cancelaciones en cascada). No hay ningún fallo ajeno a la base. |
| `node --test scripts/tests/check-review-required.test.mjs scripts/tests/check-task-contract.test.mjs scripts/tests/check-task-contract-policy.test.mjs` | 56/56 pass |
| `CHECK_BASE_REF=origin/main node scripts/check-task-contract.mjs` | **exit 1:** `la rama declara T-0044 pero TASKS/T-0044-*.md no existe en el merge-base (b80911a…): la tarea debe estar en main antes de implementarla`. Ver el Act on 4. |
| `CHECK_BASE_REF=origin/main node scripts/check-review-required.mjs` | exit 1 sin reporte: el diff toca `scripts/check-review-required.mjs` y `scripts/tests/…`, y falta `REVIEWS/T-0044…`. Con un `REVIEWS/T-0044-blind-review.md` de sonda, pasan las dos versiones, la de la rama y la de la base copiada en `.ci-base/`. |
| `grep -n 'match(/\^kind' scripts/check-review-required.mjs && exit 1 \|\| true` | pasa (no hay coincidencias) |

Sondas propias: `<scratchpad de la sesión>/probes/sondas.mjs`, que se corre con `node sondas.mjs <raíz>`. Arma repos git temporales y ejecuta `run()` de `check-review-required.mjs` y de `check-task-contract.mjs`. Las corrí contra el checker parcheado y contra el de `origin/main`, que copié en `scratchpad/old/`, para distinguir lo que es regresión de lo que ya existía.

---

## Act on

### 1. La exención de planificación deja pasar código: `docs/`, `SLICES/` y `DECISIONS/` se aceptan con cualquier extensión (regresión)

`PLANNING` incluye `/^docs\//`, `/^SLICES\//` y `/^DECISIONS\//` sin restringir la extensión. `docs/` no es sólo documentación: `git ls-files docs | grep -v '\.md$'` da 46 archivos, entre ellos `docs/north-star/prototipo/index.html`, `package.json`, `pruebas/*.js` (incluido `permisos.js`) y `correr-todo.sh`. R-33 dice que el prototipo «trabaja con una tarea por versión» y que su revisión de Gauntlet es «una equivalencia, no una exención». Con el parche, una FEATURE del prototipo que se agrega y se implementa en el mismo PR, desde una rama `chore/` o `docs/`, no exige revisión. `check-task-contract` tampoco la frena, porque una rama sin id no exige que la tarea esté en `main`. D-0052 dice ahora «sin implementación ni rutas sensibles», y el código no comprueba la primera condición.

**Reproducción** (sonda 1): base con `docs/north-star/prototipo/index.html`; rama `chore/prototipo-v26` que agrega `TASKS/T-0050-prototipo-v26.md` (`kind: FEATURE`), modifica `index.html` y agrega `pruebas/permisos.js`.
- Parcheado: `review.ok=true`, «T-0050 es FEATURE y esta rama sólo la planifica»; `contract.ok=true`.
- `origin/main`: `review.ok=false`, «T-0050 es FEATURE y la rama no agrega ni modifica un reporte en REVIEWS/».

**Corrección sugerida:** que la exención exija `.md` (o una lista cerrada de extensiones de texto como `.md` y `.csv`) también bajo `docs/`, `SLICES/` y `DECISIONS/`, y agregar una prueba con `docs/**/*.js` o `*.html`. La otra opción es excluir `docs/north-star/prototipo/` de forma explícita.

### 2. Una rama `amend/` que renombra el archivo de una FEATURE de la base queda exenta (regresión)

`added` sólo mira que haya un estado `A` bajo `TASKS/${id}-`, y no que la tarea falte en la base. Con `--no-renames`, un renombre aparece como `D` más `A`. En una rama `amend/`, `check-task-contract` vuelve antes del chequeo «una tarea existente no se borra ni se renombra», así que el renombre pasa. El resultado es que la enmienda de contrato de una FEATURE, que antes exigía revisión, deja de exigirla si además se renombra el archivo. D-0086 dice que «un cambio de contrato necesita su propio PR de enmienda», y el comentario del código dice que la revisión se exige «cuando el kind ya está en la base». Acá el kind ya está en la base y no se exige.

**Reproducción** (sondas 2 y 2b): base con `TASKS/T-0050-a.md` (`kind: FEATURE`); rama `amend/T-0050-cambio` con `git mv TASKS/T-0050-a.md TASKS/T-0050-b.md` y el Outcome cambiado.
- Parcheado: `review.ok=true` («sólo la planifica»), `contract.ok=true`. `check-docs` tampoco lo frena: hay un solo archivo y su nombre empieza con el id.
- Mismo cambio sin renombrar: `review.ok=false`.
- `origin/main`, con y sin renombre: `review.ok=false`.

**Corrección sugerida:** eximir sólo cuando `kindAt(mergeBase, id) === null`, es decir, cuando la tarea no existe en la base. Eso también cierra por construcción la variante «misma tarea agregada con otro nombre» (sonda 4, hoy frenada por `check-docs`). Agregar la prueba del renombre en `amend/`.

### 3. Un archivo señuelo que no es `.md` en `TASKS/` decide el kind (ya existía, pero contradice el Outcome)

`kindAt` toma el primer archivo de `ls-tree` que empiece con `TASKS/${id}-`, sin mirar la extensión. `check-docs` sólo valida los `.md`, así que un `TASKS/T-0050-0.txt` con frontmatter `kind: CHORE` ordena antes que `TASKS/T-0050-real.md` (`kind: FEATURE`) y es el que se lee. Una vez en `main`, el señuelo hace que la base y la rama digan CHORE, y la implementación posterior en `task/T-0050-…` con código fuera de las rutas sensibles no exige revisión. El Outcome de T-0044 es que el kind se lea del frontmatter de la tarea, y acá se lee de otro archivo. `findTaskFileAtRef` de `check-task-contract.mjs` tiene el mismo patrón, así que el congelamiento del contrato también compararía el señuelo.

**Reproducción** (sondas 3a, 3b y 3c):
- 3a: rama `docs/plan` que agrega `TASKS/T-0050-0.txt` (CHORE) y `TASKS/T-0050-real.md` (FEATURE): `review.ok=true`, sin razones.
- 3b: los dos ya en la base, rama `task/T-0050-impl` que agrega `apps/web/src/components/boton.tsx`: `review.ok=true`, `contract.ok=true`.
- 3c, el control sin señuelo: `review.ok=false`.
- `origin/main` da el mismo resultado: no es regresión.

**Corrección sugerida:** filtrar `path.endsWith('.md') && !path.endsWith('_TEMPLATE.md')` en `kindAt`, y en el mismo cambio en `findTaskFileAtRef`; o fallar si hay más de un archivo para el id. Si el owner prefiere no ampliar el alcance de T-0044, abrir una tarea aparte. Es una línea.

### 4. La propia T-0044 no cumple su Verification: la tarea no está en `main`

`CHECK_BASE_REF=origin/main node scripts/check-task-contract.mjs` sale con 1 en esta rama, porque `TASKS/T-0044-*.md` no existe en el merge-base. El mismo PR agrega la tarea y la implementa en una rama `task/`, que es justo lo que el control prohíbe. Por la misma razón, el paso 1 de R-33 («contrato leído desde `main`») no se pudo cumplir en esta revisión.

**Reproducción:** en el clon de sonda, `CHECK_BASE_REF=origin/main node scripts/check-task-contract.mjs` → `error la rama declara T-0044 pero TASKS/T-0044-*.md no existe en el merge-base`.

**Corrección:** separar el alta de T-0044 en un PR de planificación (rama `docs/` o `chore/`) y rebasar esta rama encima, o que el owner deje por escrito la excepción. En cualquiera de los dos casos, la revisión debería repetirse con el contrato leído desde `main`.

---

## Consider

- **Los `.md` de la raíz incluyen `CLAUDE.md` y `AGENTS.md`**, que son el contrato operativo de los agentes y no simple documentación (sonda 6: exento). No hay regresión respecto de una CHORE, que tampoco exigía revisión por tocarlos, pero la exención los trata como planificación. Se podría excluirlos de `PLANNING` y que exijan implementación.
- **`check-task-contract` no frena el borrado ni el renombre en ramas `amend/`.** Ese chequeo vuelve antes, cuando sólo comprueba que la rama no toque otros archivos. Es preexistente y es lo que habilita el Act on 2. Aunque se corrija el Act on 2, conviene decidir si una enmienda puede renombrar el archivo de una tarea.
- **Las pruebas no cubren** el renombre en `amend/`, el código bajo `docs/`, ni el caso en que el mismo PR agrega la tarea y además toca una ruta sensible. Este último hoy funciona bien, porque ninguna ruta de `PLANNING` es sensible, pero esa propiedad no está fijada por ninguna prueba.
- **El texto de D-0052** («sin implementación ni rutas sensibles») es más estricto que el código. El de R-33 («no toca más que documentación») y el del ADR, que enumera `docs/` sin extensión, coinciden con el código pero no con lo que de verdad hay en `docs/`. Una vez corregido el Act on 1, conviene alinear los tres textos con la lista real.

## Noted

- El ADR de D-0086 enumera `TASKS/` dentro de lo exento, pero el código sólo acepta `TASKS/T-\d{4}-*.md` de primer nivel. El código es más estricto que el texto. Es inofensivo, pero el texto no coincide.
- En `decisions.yaml`, el statement de D-0086 tiene una línea de más de 150 caracteres («…reporte en REVIEWS/; un PR que sólo planifica la tarea no la exige. CI corre…»). Es un escalar plegado (`>`), así que el resultado es el mismo; sólo rompe el ancho del resto del archivo.
- Si el frontmatter de una tarea está roto en la base, todo PR que lo arregle falla para siempre (sonda 8). Falla de forma segura, y `check-docs` impide que un frontmatter así llegue a `main`.
- El checker de la rama importa `./check-task-contract.mjs`. En `.ci-base/` eso resuelve porque el workflow copia los dos scripts en el mismo bucle, y la versión de la base exporta `parseFrontmatter` (línea 116 en `origin/main`). Si el bucle cambiara de orden o corriera sólo `check-review-required`, el import fallaría, aunque fallaría de forma segura. Es un acoplamiento nuevo entre los dos validadores.
- El mensaje de salida ahora muestra las razones de una exención («✓ el diff no exige revisión ciega (T-0050 es FEATURE y esta rama sólo la planifica…)»). Es una mejora de trazabilidad.
- Los dos límites que D-0086 agrega (que `.ci-base/` resuelve sus dependencias desde el `node_modules` del PR, y que el control es de presencia) describen bien lo que hace el código y el workflow. El Non-scope los excluye de forma explícita.

## Dismissed

- **Kind en minúsculas o con otra capitalización (`feature`, `Feature`):** `check-review-required` no los reconoce y pasan (sonda 5). Lo descarto porque `check-docs.mjs`, que corre en `pnpm check`, rechaza todo kind fuera de `['FEATURE','SPIKE','POC','CHORE','MIGRATION','REVIEW']` («kind inválido»), así que un archivo así no llega a CI en verde. Modificar `check-docs` para permitirlo es tocar una ruta sensible, que exige revisión.
- **Kind que no es string (`[FEATURE]`, `1`, `null`, `""`):** falla con «no se pudo leer su kind» (sonda 5). Es el comportamiento que pide el Outcome.
- **`!!str FEATURE` o `"FEATURE "`:** se leen como FEATURE y exigen revisión (sonda 5).
- **FEATURE de la base agregada de nuevo con otro nombre en una rama `task/`** (sonda 4): `check-review-required` la exime, pero `check-docs` falla con «id de tarea duplicado», y si se borra el original, `check-task-contract` falla con «una tarea existente no se borra ni se renombra». En `amend/` sí pasa: es el Act on 2.
- **Un PR de planificación que además borra código** (sonda 7): exige revisión, porque `planningOnly` mira todos los cambios, los borrados incluidos.
- **FEATURE nueva junto con código en `apps/`** (sonda 9 y prueba del diff): exige revisión.
- **Una implementación posterior que sólo toca documentación, con el kind ya en la base:** exige revisión (prueba nueva 5; también las sondas 2b y 3c como control). Sólo el renombre y el señuelo la saltan: son los Act on 2 y 3.
- **Regresión en las tareas existentes por pasar a YAML:** las 44 tareas de `TASKS/` dan un kind string con `parseFrontmatter`. Ninguna se vuelve ilegible.
- **Que `check-review-required` falle hoy en esta rama:** se debe a que falta el reporte en `REVIEWS/`. Con el reporte de sonda pasan la versión de la rama y la de la base.

---

## Re-revisión de las correcciones

- **Fecha:** 2026-11-10
- **Qué se revisó:**
  - `scratchpad/staging/scripts/check-review-required.mjs`, contrastado con `/mnt/project-files/T-0044/check-review-required.patch`. `git apply --check` aplica el parche limpio sobre `03133c3` y el resultado es idéntico al staging. El encabezado `b/` del parche trae la ruta absoluta del staging, y aun así aplica.
  - Los textos sin commitear de R-33, D-0052, D-0086 (ADR y statement) y T-0044 en `/home/user/del-campo`.
  - `scripts/tests/check-review-required.test.mjs`, con tres pruebas nuevas: prototipo, renombre y archivo no `.md`.
  - El cambio de rama a `chore/T-0044-revision-seguimiento`.
- **Entorno:** copié todo eso al clon de sonda, hice commit y renombré ahí la rama. El diff contra `origin/main` (sin contar el validador) quedó idéntico al del repo. No toqué nada en `/home/user/del-campo`.

### Comandos y resultado

| Comando | Resultado |
|---|---|
| `pnpm check` | No lo corrí completo porque no hay Postgres. Las mismas etapas que antes sí: `check-docs` ✓ (85/50/44, 0 avisos), `check-agent-run` ✓, `node --test scripts/tests/*.test.mjs` 258/258. `pnpm test` depende de la base. |
| `node --test …check-review-required… …check-task-contract… …policy…` | 59/59 pass |
| `CHECK_BASE_REF=origin/main node scripts/check-task-contract.mjs` | ✓ contrato de tarea intacto (exit 0) con la rama `chore/T-0044-…` |
| `CHECK_BASE_REF=origin/main node scripts/check-review-required.mjs` | exit 1 sólo porque falta `REVIEWS/T-0044…`. Es esperado: el diff toca validadores. |
| grep de `match(/^kind` | pasa |

Volví a correr las sondas 1 a 9 y agregué R1 a R10 en el mismo `probes/sondas.mjs`. Las corrí contra el checker corregido y contra el de `origin/main`.

### Estado de los Act on originales

| # | Estado | Evidencia |
|---|---|---|
| 1 Código en `docs/` | **Cerrado.** | Sonda 1 → exige revisión. R5, un `.md` dentro del prototipo, también la exige. Hay prueba nueva. |
| 2 Renombre en `amend/` | **Cerrado.** | Sondas 2 y 4 → exigen revisión (`baseKind === null`). Hay prueba nueva. |
| 3 Señuelo no `.md` | **Cerrado** para el señuelo (3a y 3b exigen revisión), **pero la corrección abre el Act on R-1.** | |
| 4 Tarea fuera de `main` | **Cerrado mecánicamente** (`check-task-contract` en verde). El desvío de procedimiento sigue: ver Consider R-1. | |

### Act on

#### R-1. Una tarea cuyo archivo no termina en `.md` queda invisible para `kindAt`, así que una FEATURE pasa sin revisión (regresión que introduce la corrección del Act on 3)

`kindAt` ahora exige `^TASKS/T-xxxx-[^/]+\.md$`. Si el único archivo de la tarea es, por ejemplo, `TASKS/T-0050-x.MD` o `.txt`, `kindAt` devuelve `null` en la base y en la rama, y la tarea se trata como inexistente: no exige revisión y no cuenta como ilegible. Ningún otro control lo frena:
- `check-docs` sólo lista archivos que terminan en `.md`, así que no valida el frontmatter, el kind ni el id del `.MD`.
- `check-task-contract` (`findTaskFileAtRef` y `findTaskFileInWorkingTree`) busca con `startsWith('TASKS/T-xxxx-')`, así que acepta el `.MD` como la tarea de la rama `task/`.
- `changedTaskFiles` filtra `.md`, así que el contrato de ese archivo tampoco se congela. Eso ya pasaba antes.

Con el código de `origin/main` los mismos casos exigían revisión, porque `startsWith` leía el kind del `.MD`.

**Reproducción** (`probes/sondas.mjs`):
- R1: base con `TASKS/T-0050-x.MD` (`kind: FEATURE`); rama `task/T-0050-impl` que agrega `apps/web/src/components/boton.tsx`.
  - Corregido: `review.ok=true`, sin razones; `contract.ok=true`.
  - `origin/main`: `review.ok=false` («T-0050 es FEATURE…»).
- R2: lo mismo con `.txt`. Corregido: `review.ok=true`. `origin/main`: `review.ok=false`.
- R3: rama `chore/x` que agrega `TASKS/T-0050-x.MD` (FEATURE) y código. Corregido: `review.ok=true`. `origin/main`: `review.ok=false`.

**Corrección sugerida:** en `kindAt`, si existe algún archivo con el prefijo `TASKS/T-xxxx-` y ninguno es un `.md` de primer nivel, devolver `UNREADABLE`, no `null`. La otra opción es fallar ante cualquier archivo de `TASKS/` que no sea `.md` y no sea `_TEMPLATE.md`. Agregar la prueba «la tarea sólo como `.MD` falla». Alinear también `findTaskFileAtRef` de `check-task-contract.mjs` con el mismo criterio, para que los dos validadores identifiquen la tarea igual. Ese archivo es un validador protegido y lo aplica el owner.

### Consider

- **R-1. La rama `chore/T-0044-…` cierra el Act on 4 en el control, no en el procedimiento.** R-29 dice «Sin tarea se admiten `docs/` y `chore/`», y T-0044 es una tarea. Usar `chore/` con id evita la regla «la tarea debe estar en main antes de implementarla». Hay precedente (`origin/chore/T-0043-control-del-cambio`), pero sigue sin estar escrito. Hay dos consecuencias:
  - El paso 1 de R-33 (contrato leído desde `main`) sigue sin cumplirse.
  - El contrato de T-0044 no está congelado: su Outcome cambió durante la rama, entre la primera revisión y esta.

  Recomiendo que el owner acepte el desvío de forma explícita en el PR, o que R-29 diga cuándo vale `chore/T-xxxx`. El riesgo queda acotado porque `check-review-required` sigue tomando el id de una rama `chore/T-xxxx` (sonda R7: una FEATURE agregada e implementada así exige revisión).
- **R-2. Los textos son más amplios que el código, en la dirección segura.** R-33, D-0052 y el Outcome de T-0044 dicen «el resto del diff son `.md` fuera del prototipo o `decisions.yaml`». El código sólo acepta `.md` de `TASKS/` (primer nivel), `docs/`, `SLICES/`, `DECISIONS/` y la raíz, así que `apps/web/README.md`, `ops/*.md` o `REVIEWS/*.md` no cuentan como planificación (sonda R4: exige revisión). El ADR de D-0086 enumera las carpetas y coincide exactamente con el código. Conviene que R-33 y D-0052 citen la misma lista o remitan al ADR.
- **R-3.** Sigue el Consider original sobre `CLAUDE.md` y `AGENTS.md` como planificación (sonda 6: exento).

### Noted

- La rama `chore/T-0050-…` con un id que no existe en ningún lado y código común no exige revisión (sonda R8). Ya pasaba antes (igual en `origin/main`) y equivale a una rama `chore/` sin id. Lo anoto porque el precedente `chore/T-xxxx` lo vuelve más probable.
- Un PR de planificación que además modifica otra FEATURE de la base exige revisión para esa otra tarea (sonda R9), y `check-task-contract` frena el cambio de contrato. Es correcto.
- Las pruebas nuevas cubren el prototipo, el renombre y el señuelo `.txt`, pero no la tarea que sólo existe como `.MD` o `.txt` (Act on R-1).
- Retiro el Noted original sobre el ancho de línea de `decisions.yaml`. Es una práctica común en el archivo (decenas de líneas de más de 120 caracteres) y no tiene efecto en un escalar `>`.

### Dismissed

- **Dos `.md` de la misma tarea con kinds distintos** (sonda R10: el checker pasa): `check-docs` falla con «id de tarea duplicado». Si el señuelo lleva otro id, falla porque el nombre del archivo debe empezar con el id. No llega a CI en verde.
- **Kind en minúsculas** (sonda 5): sin cambios respecto de la primera revisión. Lo frena `check-docs`.
- **El `.md` dentro de `docs/north-star/prototipo/`** (R5): exige revisión, que es lo coherente con «el prototipo es código».
- **Planificar en `chore/T-xxxx` con la tarea nueva** (R6): exento, como dicen los textos. La implementación posterior exige revisión porque el kind ya está en la base.

**Resultado de la re-revisión:** los cuatro Act on originales están cerrados en el código. Queda un Act on nuevo (R-1), una regresión que introduce la corrección del señuelo, con una corrección de una línea en `kindAt`.

## Respuesta del implementador

- **R-1 (Act on), corregido:** si hay archivos con el prefijo `TASKS/T-xxxx-` y ninguno es
  el `.md` de primer nivel, `kindAt` devuelve ilegible y el control falla. Hay una prueba
  nueva para `.MD` y `.txt`. Las sondas R1, R2 y R3 ahora exigen revisión. Esta corrección
  no tuvo una tercera revisión: la verificaron las sondas del revisor y la suite.
- **`findTaskFileAtRef` de `check-task-contract.mjs`:** tiene el mismo patrón `startsWith`,
  pero queda fuera del alcance de T-0044. Con este cambio, una tarea sin `.md` ya falla en
  `check-review-required`.
- **Textos (Consider):** R-33, D-0052 y el Outcome remiten ahora a la lista del ADR de
  D-0086, en vez de resumirla.
- **Rama `chore/T-0044-…` y contrato leído desde la rama (Consider):** se sigue el
  precedente de T-0043. Lo decide el owner en el PR.
- **`CLAUDE.md` y `AGENTS.md` como planificación (Consider):** no es regresión, porque sin
  una tarea FEATURE nueva tampoco exigían revisión. Se deja como está.
