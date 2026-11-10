# ADR-0086 — El control del cambio mira el diff, no el nombre de la rama ni la etiqueta

- **Id en `decisions.yaml`:** D-0086
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-09
- **Supersede:** en parte D-0052 (la revisión ciega no se hacía cumplir por CI).
- **Aprobación:** el owner, el 2026-11-09, en el hilo «Revisar las reglas de gobierno del repo».

## Contexto

La revisión del 09/11/2026 y una segunda revisión independiente encontraron cuatro
huecos, comprobados con 19 pruebas de aceptación contra el checker de `6d27aba`:

- `check-task-contract.mjs` eximía por completo las ramas `docs/` y `chore/`, y en una
  rama `task/T-x` sólo congelaba T-x. Desde cualquier rama se podía pasar una tarea de
  FEATURE a CHORE, bajar su `riskClass`, quitar `contextRefs` o borrar `Data effects`.
- Marcar una casilla de `## Verification` era un cambio prohibido, así que cada tarea
  necesitaba un PR extra sólo para cerrarse: 13 PR de cierre hasta `#129`.
- La revisión ciega se disparaba por `kind`. Un cambio a autorización, a una migración o
  a un validador etiquetado CHORE/LOW no la exigía.
- Una rama podía aflojar el checker que la juzga, porque CI corría la versión de la rama.

## Referencia canónica

`decisions.yaml`, D-0086.

## Cómo se aplica

- `scripts/check-task-contract.mjs` compara toda tarea existente modificada contra el
  merge-base. Normaliza sólo las marcas `[x]` fuera de bloques de código. Una tarea nueva
  no tiene contrato que congelar. Borrar o renombrar una tarea existente falla. Una
  enmienda va en `amend/T-xxxx-…` y no puede tocar otro archivo.
- `scripts/check-review-required.mjs` exige un archivo en `REVIEWS/` que nombre la tarea
  cuando la tarea es FEATURE o MIGRATION o cuando el diff toca una ruta de su lista
  `SENSITIVE`. Un archivo nuevo en `apps/*/src/lib/` cuenta. La lista no exime: el revisor
  o el owner pueden escalar otro cambio. El kind se lee como YAML del `.md` de la tarea
  en `TASKS/`, y un kind ilegible falla. Un PR que agrega una tarea FEATURE o MIGRATION que
  la base no tiene, y cuyo resto del diff son `.md` de `TASKS/`, `docs/`, `SLICES/`,
  `DECISIONS/` o de la raíz, o `decisions.yaml`, la planifica y no exige revisión. El
  prototipo (`docs/north-star/prototipo/`) es código y no cuenta. El PR que la implementa
  sí la exige, porque el kind ya está en la base (T-0044).
- El workflow corre los dos controles con la versión de la rama y con la de la base.
  Límite: en un `pull_request` el YAML del workflow es el de la rama, así que un PR podría
  quitar la corrida de la base. Ese cambio toca `.github/workflows/`, exige revisión ciega
  y lo ve el owner al mergear; cerrarlo del todo exige un ruleset o un workflow requerido
  desde `main`, que esta decisión no toma.
- Límite: copiar el script de la base a `.ci-base/` fija el archivo del validador, no el
  código que carga. Sus imports (`yaml`) se resuelven desde el `node_modules` que instaló
  el PR, y la corrida va después de `pnpm check` de la rama. Aislarlo exige un entorno
  aparte con dependencias de la base; queda para un `check-base`, si el owner lo pide.
- Límite: el control es de presencia. Comprueba que un archivo de `REVIEWS/` nombre la
  tarea, no su contenido, la independencia del revisor ni que cubra la versión final; un
  archivo vacío pasa. Lo que vale como revisión lo decide el owner leyendo el reporte.
- `.claude/settings.json`, `.claude/hooks/protect-paths.mjs` y
  `.agents/hooks/protect-paths.mjs` protegen las mismas cinco rutas y los validadores.
  Ejecutar un validador sigue libre; escribirlo, moverlo o borrarlo, no.
- Una tarea pasa a `DONE` en su propio PR cuando su outcome está verificado y sus
  aprobaciones obtenidas. Si falta una aceptación posterior, sigue `ACTIVE` (con
  `waiting` sólo si la espera es pasiva) o `BLOCKED`.
- El prototipo de `docs/north-star/prototipo` trabaja con una tarea por versión y sólo
  datos sintéticos. La revisión de Gauntlet vale como revisión ciega si cumple R-33:
  revisor aislado del implementador, contrato leído desde `main`, diff completo,
  comprobaciones propias y reporte ligado a la versión.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Revisión obligatoria para todo `riskClass` MEDIUM | La etiqueta la pone quien implementa; el diff es más difícil de rebajar |
| Seguir confiando en el nombre de rama | Es justo lo que dejaba pasar los cambios de contrato |
| Comprobar en CI que el revisor estuvo aislado | No es observable desde afuera; sigue siendo procedimiento |

## Consecuencias

**Más fácil:** cerrar una tarea en su propio PR; una rama no puede aflojar sus controles
sin que el cambio quede a la vista del owner.
**Más difícil:** un PR que toca una ruta sensible queda rojo hasta que tenga su reporte de
revisión; un cambio de contrato necesita su propio PR de enmienda.

## Revisión posterior

Una revisión independiente del 10/11/2026 sobre el estado mergeado encontró el kind entre
comillas, la fricción de las altas de planificación y los dos límites anteriores. Se
corrigieron en T-0044.

## Criterio de falsación

Se revisa si la lista de rutas deja pasar a `main` un cambio sensible sin revisión, o si
la exigencia produce reportes vacíos sólo para pasar CI.
