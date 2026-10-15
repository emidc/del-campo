# T-0029: revisión ciega (R-33)

- **Base revisada:** rama `task/T-0029-risk-importacion-validada`, código en
  `a6de412c769efee63f783b3cbe4c71eb2cf0d146` (un commit sobre `main` = `4add4bc`). El
  diff que me pasaron (`diff.patch`, 3239 líneas) coincide byte a byte con
  `git diff 4add4bc...a6de412`: 28 archivos, todos bajo `contexts/risk/` salvo
  `ops/runs/2026-10-15.jsonl`. No toca `DOMAIN.md`, `SPIKES/`, `.claude/`,
  `.github/workflows/`, `package.json` de la raíz ni `pnpm-lock.yaml`, y no agrega
  dependencias (en `contexts/risk/package.json` sólo se agrega el script `import`).
  **Al revisar, la rama ya tenía otro commit:** `db5925f` («T-0029: registro de la
  corrida»), que sólo agrega una línea a `ops/runs/2026-10-15.jsonl`
  (`git diff a6de412 db5925f --stat`: 1 archivo, +1). No cambia nada del código.
- **Contrato:** el de `main` (`contrato-desde-main.md`). No leí el archivo de la tarea de
  la rama.
- **Contexto leído por mi cuenta:** `ENGINEERING_RULES.md` (R-19, R-33),
  `SLICES/RO01.md` (§2 «Importación validada», §5, §7 A6), `SLICES/RO01-decisiones.md`
  punto 9 (H3, H7, en texto del owner), `decisions.yaml` (D-0055, D-0063, D-0067,
  D-0068), `DOMAIN.md` (lo que dice de `EnterpriseRisk` y Risk OS),
  `SPIKES/T-0021/v0/fase-15/validador/` (los cuatro `.ts`), `contrato/` (los cuatro CSV,
  y en detalle las reglas RV-ID, RV-RSK, RV-EVA, RV-ACC-08/11, RV-TRF-04, RV-ECO-02),
  `invalidos/base/`, `invalidos/invalidos.test.ts`,
  `SPIKES/T-0021/regresion-ejecutable/metodologia.ts` (`alcanza`, `safetyCritical`),
  `contexts/risk/migrations/0001_risk_schema.sql` (dominios, `accion_estado`,
  `evaluacion_sin_ramas`, trigger de la anterior), `contexts/risk/README.md` y
  `REVIEWS/T-0028-blind-review.md` como modelo de formato.
- **Orden:** corrí los comandos de `## Verification` antes de abrir cualquier archivo de
  evidencia. Después leí el diff entero, comparé el port contra el spike con `diff`,
  leí los tests y probé hipótesis con sondas propias en el scratchpad, fuera del repo.
  No leí `ops/evidence/T-0029.md`, que según el encargo todavía no existe.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien
  implementó.

## Verificación ejecutada antes de leer evidencia

Entorno: Node 22.22.0 (pnpm avisa `wanted node >=24`), Postgres 16 en
`localhost:5432`, rol `root` con password `root`. A mitad de la revisión el cluster
quedó `down` (archivo pid viejo, el contenedor se reinició): la primera corrida de
`pnpm test` dio 133 fallas por `ECONNREFUSED`. Lo levanté con
`pg_ctlcluster 16 main start` y repetí todo. Las salidas de abajo son de después de
levantarlo.

### 1. `pnpm check`

```text
$ RISK_DATABASE_URL=postgres://root:root@localhost:5432/delcampo_risk_test pnpm check; echo exit=$?
✓ 68 decisiones, 31 ADRs, 32 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
# tests 174 · pass 174 · fail 0
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication
$ eslint .
$ node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 …
# tests 925 · suites 137 · pass 921 · fail 0 · cancelled 4 · skipped 0
not ok 51 - cliente de envío de Cloud API
[ELIFECYCLE] Test failed.
exit=1
```

Typecheck y lint pasan, incluidos los límites de módulo de R-25. Los 4 cancelados son de
`cliente de envío de Cloud API` (Communication). El encargo dice que pasan igual en
`main` con Node 22; no lo comprobé corriendo `main`. Ninguno es de `contexts/risk`.

### 2. `RISK_DATABASE_URL=…/delcampo_risk_test pnpm test`

Antes de correrlo comprobé que `delcampo_risk_test` estuviera vacía (sólo
`schema_migrations` con filas).

```text
# tests 925 · pass 921 · fail 0 · cancelled 4 (los mismos de Communication)
ok 57 - A3: reimportación de un lote confirmado
ok 58 - A4: una falla a mitad de la escritura no deja nada
ok 59 - línea de comandos
ok 60 - A1: las 8 sintéticas
ok 61 - A2: cada caso inválido da exactamente su error y no escribe nada
ok 62 - A3: reimportación
ok 63 - lotes posteriores contra lo ya importado
ok 64 - A4 y lo que el validador no rechaza: ninguna escritura incompleta
ok 66 - huella de un lote
ok 68 - lector de CSV portado (H7)
ok 88 - validador: el contrato
ok 89 - validador: lotes válidos de la 15b
ok 90 - validador: los 55 casos inválidos de la 15b, cada uno con su error y ningún otro
ok 91 - validador: cada regla de aviso aparece sin rechazos
ok 92 - validador: lote posterior contra lo ya registrado
```

### 3 y 4. Las dos importaciones en `delcampo_risk_dev`

Partí de una base vacía (`dropdb` + `createdb`). **El comando del contrato no corre tal
como está escrito:**

```text
$ RISK_DATABASE_URL=postgres://root:root@localhost:5432/delcampo_risk_dev \
    pnpm --filter @del-campo/risk import SPIKES/T-0021/v0/fase-15/sinteticos; echo exit=$?
 ERROR  Unknown option: 'recursive'
For help, run: pnpm help import
exit=1
```

`pnpm import` es un comando propio de pnpm y gana sobre el script (ver C1). Seguí con
`run import`:

```text
$ RISK_DATABASE_URL=…/delcampo_risk_dev pnpm --filter @del-campo/risk run import SPIKES/T-0021/v0/fase-15/sinteticos
fecha de corte 2026-10-15
importado
huella b0fbe446a291129ffdd1bcdf856a1b8d55599cf702d70b7ef256f562ccceeaee
0 rechazos, 103 avisos
por archivo:
  risks.csv: 84 filas, 0 rechazos, 103 avisos
  action-plan.csv: 10 filas, 0 rechazos, 0 avisos
  risk-transfer.csv: 33 filas, 0 rechazos, 0 avisos
por regla:
  aviso RV-ACC-11: 20
  aviso RV-ECO-02: 26
  aviso RV-EVA-08: 57
lote 1; filas escritas:
  riesgo: 60  miembro_escenario: 2  accion: 10  evaluacion: 82
  accion_estado: 9  transferencia: 32  evento_poliza: 1  revision_humana: 1
hallazgos: […103 líneas de aviso…]
exit=0

$ (la misma línea otra vez)
fecha de corte 2026-10-15
ya importado: no se validó ni se escribió nada
huella b0fbe446a291129ffdd1bcdf856a1b8d55599cf702d70b7ef256f562ccceeaee
lote 1, importado el 2026-10-15T17:21:23.733Z por root
origen /home/claude/del-campo/SPIKES/T-0021/v0/fase-15/sinteticos
filas escritas entonces: (los mismos conteos)
exit=0
```

Los conteos por tabla (`riesgo` 60, `evaluacion` 82, `accion` 10, `transferencia` 32,
`revision_humana` 1, `lote_importacion` 1) eran los mismos antes y después de la segunda
corrida (`diff` vacío). Las casillas humanas del contrato (el caso inválido elegido a
mano, la lectura del informe sin valores) le quedan al owner. Las cubre en parte el
test `línea de comandos` y en parte mis sondas S1 y S5.

## Sondas

Son scripts propios en el scratchpad. No cambié ningún archivo del repo. Las que
escriben en la base corren dentro de `enTransaccionRevertida` sobre
`delcampo_risk_test`, o sobre `delcampo_risk_dev`, que rehíce con `dropdb`/`createdb`.

| # | Hipótesis | Resultado |
|---|---|---|
| S1 | El modo sin valores puede mostrar una celda que no es un id cuando cae en una columna de id. | **Confirmada** (A1). |
| S2 | Una cadena de reevaluaciones sin inicial (A→B, B→A) pasa el validador y la base la rechaza. | Confirmada: `falla_escritura`, restricción `evaluacion_anterior_registrada`, 0 rechazos del validador y 0 filas. El todo o nada se sostiene, pero hay un hueco del contrato (C3). |
| S3 | Las reglas que miran lo ya registrado funcionan con lo que devuelve `leerExistentes`, no sólo con un `Existentes` armado a mano. | Funcionan. Un sub_riesgo nuevo bajo un padre registrado entra (RV-RSK-03). Un escenario nuevo con miembros registrados entra (RV-RSK-05). Un riesgo nuevo con el origen de otro ya registrado es RV-ID-03. Una evaluación con un origen registrado es RV-ID-03. Una reevaluación sobre una anterior registrada con fecha previa da el aviso RV-EVA-06. En todos los casos la base quedó sin filas. |
| S4 | RV-ACC-11 se evalúa sobre un riesgo registrado que un lote posterior vuelve safety_critical. | **No se evalúa** (C2). Si esa misma reevaluación va en el mismo lote que la base, da `a:RV-ACC-11`. Como lote posterior, no da nada. |
| S5 | Una opción mal tipeada en la línea de comandos cae al modo con valores sin avisar. | **Confirmada** (C4). |
| S6 | Tres importaciones simultáneas del mismo lote escriben una sola vez. | Sí: `importado`, `ya importado`, `ya importado`; 1 lote y 82 evaluaciones. |
| S7 | Dos lotes distintos con los mismos ids, importados a la vez: el segundo ve lo que escribió el primero y lo rechaza en la validación, no con una falla de escritura. | Sí: uno `importado` y el otro `rechazado` con 18 rechazos. El bloqueo consultivo se toma antes de leer lo existente y funciona. |

Al terminar, `delcampo_risk_test` tiene sus dos migraciones y cero filas en todas las
tablas, sin triggers ni funciones `t0029_*` sueltas. `delcampo_risk_dev` quedó con las
sintéticas importadas (lote 1), como estaba al empezar. `git status` está limpio.

## Lo que comprobé y está bien

- **Port:** `csv.ts` es el del spike con otro comentario de cabecera, y un test lo
  compara con el spike debajo del encabezado. `contrato.ts` sólo cambia de dónde vienen
  los bytes. `validador.ts`: revisé cada hunk del `diff` contra el spike. Las
  diferencias son tres. El contrato llega por argumento. Se usa `metodologia.ts` v1:
  sacar `evaluable` de `safetyCritical` no cambia el resultado, porque en el spike
  `alcanza` sólo lo usa con `reglas === 'v0.3'`. Y `existentes` se amplió. El cambio de
  RV-RSK-03 (`p?.tipo_objeto !== 'padre' || …`) da lo mismo que el original. `primero()`
  reemplaza `a || b || ''` con la misma semántica sobre strings.
- **Todo o nada:** todo pasa en `db.begin` (CLI) o en `db.savepoint` (tests). Se toma
  `pg_advisory_xact_lock`, se vuelve a buscar la huella y se lee lo existente, en ese
  orden. El lote se registra al final y `lote_importacion.huella` es `unique`. Las
  pruebas A4 inyectan la falla en la última tabla y cortan la conexión en
  `revision_humana` con commits de verdad. S6 y S7 cubren la concurrencia.
- **H3:** la huella se busca antes de validar y sale `ya_importado` sin abrir la
  transacción de escritura. Un lote con otro byte se valida y cae en RV-ID-02 (test y
  S7).
- **Lo existente en las reglas:** RV-ID-02 (`ids` = evaluaciones, acciones, coberturas
  y eventos; los riesgos no, como dice la regla), RV-ID-03 (cuatro espacios, eventos
  junto con transferencias como en el spike), RV-RSK-01/07/08, RV-EVA-02/03/05/06/07,
  RV-ACC-08 y RV-TRF-04. `sucesora` sale de una subconsulta que no puede devolver dos
  filas por `evaluacion_sin_ramas`. El estado vigente de una acción es la última fila
  de `accion_estado` por `id` (identity).
- **Mapeo:** cada columna de los tres CSV del contrato tiene destino en
  `filasParaEscribir` o figura en `SIN_COLUMNA`, y en ese caso el lote no se escribe.
  `actor`, `base`, `evidencia` y `review_status` se conservan: `pending` no deja fila; el
  resto deja una fila de `revision_humana` con `revisado_por` como texto de origen. No
  se calcula ni se guarda ningún derivado. `origen` es la constante `importacion`.
- **Tests:** A1 compara los 103 hallazgos con lo que imprime la línea de comandos del
  propio validador de la 15b (`validar.ts`), campo por campo. Es un oráculo externo, no
  un número copiado. A2 recorre los 55 casos de `errores-esperados.csv` pasando por
  `importarLote`. Los tests existentes que se tocaron (`esquema.integration.test.ts`,
  `migrations.integration.test.ts`, `fixtures.ts`, `testing/regresion.ts`) sólo suman
  la tabla nueva o extraen `compararLote` sin cambiar lo que comparan. Ninguna aserción
  existente se debilitó.
- **R-18/R-19:** no hay secretos. Los datos son sintéticos (`ORG-SINTETICA-*`,
  `MARCA…`, `Persona sintética`).

## Act on

### A1. El informe sin valores muestra la celda de id tal cual, aunque no sea un id

`contexts/risk/src/domain/informe.ts:71-74` imprime `h.id` en los dos modos.
`h.id` sale de `idDeFila` (`contexts/risk/src/domain/validador.ts:142` y `:573-577`), que
devuelve la celda cruda de `evaluacion_id`/`risk_id`/`accion_id`/`transferencia_id`/
`evento_id`. Que la celda tenga formato de id no se mira. Sonda S1, sobre el lote base:

```text
evaluacion_id = 'MARCA Incendio planta Norte'   accion_id = 'MARCA Cliente SA poliza 123'
informe(..., 'sin_valores'):
  rechazo RV-ID-01 risks.csv:4 MARCA Incendio planta Norte
  rechazo RV-ACC-08 action-plan.csv:2 MARCA Cliente SA poliza 123
  rechazo RV-ID-01 action-plan.csv:2 MARCA Cliente SA poliza 123
```

Escenario: en T-0032 el owner arma los CSV de una histórica y, por una columna
corrida o un id heredado del sistema anterior, en `accion_id` queda un texto con el
nombre de la empresa o un número de póliza. Ese intento sale rechazado por RV-ID-01, y
el informe que pega en la evidencia (RO01 §7 A6, «sin mensajes ni celdas») trae ese
texto. Es justo el caso en que el informe sin valores tiene que proteger, porque los
datos con error son los de los intentos rechazados (R-19). El test de
`informe.test.ts:17-31` no lo detecta: pone marcadores sólo en columnas `texto*` y
`decimal`, nunca en una columna de id.

Arreglo propuesto: en modo sin valores, imprimir el id sólo si cumple el formato de su
entidad (`esIdDe`) y, si no, algo como `(id con formato inválido)`. Y sumar al test
marcado un caso con un marcador en una columna de id.

## Consider

### C1. El comando de `## Verification` y el `USO` de la CLI no corren

El script se llama `import` (`contexts/risk/package.json`), y `pnpm --filter … import`
ejecuta `pnpm import`, el comando de pnpm, que termina con exit 1
(`Unknown option: 'recursive'`). El README del contexto ya documenta `run import` y
explica por qué. Pero la cabecera y el mensaje de uso de la CLI siguen mostrando la
forma que falla: `contexts/risk/src/application/cli-importar.ts:4` y `:26`. Escenario:
el owner corre la línea de `## Verification` o la que le imprime el `USO`, y le sale un
error de pnpm que no menciona el script. Propuesta: corregir las dos líneas y dejar
asentado en la evidencia que la `## Verification` del contrato necesita `run`. El
contrato no se toca desde la rama, y renombrar el script tampoco haría que coincida.

### C2. Los avisos RV-ACC-11 y RV-ECO-02 no se evalúan sobre riesgos ya registrados

`contexts/risk/src/domain/validador.ts:521-533`: `vigente(filas)` busca la inicial
sólo entre las filas del lote. Un riesgo registrado que un lote posterior reevalúa no
tiene inicial en ese lote, así que se saltea, y tampoco se miran sus acciones ni sus
coberturas registradas. El comentario lo reconoce («T-0029, evidencia»). Sonda S4: una
reevaluación de R2 con `i_pers = 5`, con la decisión de tratamiento de R2 vencida, da
RV-ACC-11 si va en el mismo lote que la base y no da nada como lote posterior. Las dos
reglas son avisos y no bloquean. Pero la tarea dice que una regla que no se implementa
como está escrita se reporta al owner y no se resuelve en silencio (`## Risks`). Y RO01
§2 cuenta los lotes posteriores como parte de la importación validada. Propuesta: que
la evidencia lo diga explícitamente como diferencia con el contrato. Otra opción es
evaluarlas con la cadena y las acciones registradas, que `leerExistentes` ya casi trae.

### C3. Diferencias entre contrato y esquema que el importador sólo descubre al escribir

En los tres casos se sostiene el todo o nada, y el lote no entra:

- Una cadena sin inicial (ciclo) pasa las 71 reglas y la rechaza la base. El
  comentario de `contexts/risk/src/domain/importacion.ts:99-103` lo admite. Sonda S2:
  `falla_escritura` en `evaluacion_anterior_registrada`, 0 rechazos.
- Un evento `firma` con monto pasa RV-TRF-05 y lo rechaza `evento_poliza_monto`. Lo
  muestra el test `importar.integration.test.ts:252-265`.
- Las columnas de ejecución de una decisión de tratamiento y la incertidumbre o la
  revisión de un evento: el contrato las tolera, el esquema no las tiene, y el lote
  sale `sin_destino` (`importacion.ts:53-56`).

Con datos reales, el owner vería «la escritura falló» o «celdas sin columna» en lugar
de una `regla_id` que pueda corregir en el origen. El informe sin valores de un
`falla_escritura` sólo trae tabla, restricción y código. Propuesta: listar las tres
diferencias en la evidencia para que el owner decida si van como reglas en el contrato
(no se cambian en esta tarea, por `## Non-scope`) o como columnas en el esquema.

### C4. Una opción mal escrita cae al modo con valores sin avisar

`contexts/risk/src/application/cli-importar.ts:43-48`: sólo se rechazan los argumentos
que empiezan con `--`. Cualquier otro se ignora, y `modo` es `con_valores` salvo que
aparezca exactamente `--sin-valores`. Sonda S5: con `—sin-valores` (raya larga, la que
deja un procesador de texto al copiar la instrucción) o con `sin-valores`, la
importación corre y el informe sale con mensajes y orígenes (`[EV-0008] — risks.csv
EVA-…: factores asignados…`). Con datos reales, ese es el informe que el owner podría
pegar. Propuesta: rechazar los argumentos posicionales que no son valor de una opción
conocida (o cualquier argumento que empiece con `—` o `-`). Otra opción es pedir un
modo explícito.

## Noted

- **N1. La copia del contrato.** `contexts/risk/contrato/` es copia de
  `SPIKES/T-0021/v0/fase-15/contrato/`, y la tarea dice «leídas de ahí». La copia está
  atada por `importar.test.ts:12-18`, que compara byte a byte, así que no puede
  divergir sin que falle `pnpm check`. Lo dejo anotado como diferencia de forma, no de
  efecto.
- **N2. La CLI aplica migraciones** antes de importar
  (`cli-importar.ts:60`). Está documentado en el README. Importar sobre una base con
  una migración pendiente la aplica sin preguntar.
- **N3. Las bases que acepta la CLI.** `notLocalDatabase` sólo permite
  `delcampo_risk_dev` y `delcampo_risk_test` en localhost. Es lo que pide
  `## Data effects`, pero D-0068 ubica las históricas en Supabase. T-0032 va a tener
  que abrir esa puerta, y RO01 §7 A6 pide además que los intentos fallidos queden
  contados: hoy un intento rechazado no se registra en ninguna parte (sólo los lotes
  escritos entran en `lote_importacion`). Es para T-0032, no para esta tarea.
- **N4. La fecha de corte por defecto** es la fecha UTC
  (`cli-importar.ts:46`). Después de las 21 en Argentina es «mañana», y eso mueve
  RV-TRF-09 y RV-ACC-11. Queda registrada en `lote_importacion.fecha_corte`.
- **N5. Conexión cortada.** El test de `importar-confirmado.integration.test.ts:92-123`
  documenta que postgres.js 3.4.9 tira el proceso con un `TypeError` no capturado. En
  la CLI real, un corte termina en una traza y no en el informe `falla_escritura`. La
  base queda limpia, que es lo que importa.
- **N6. Normalización al escribir.** Las listas se recortan elemento por elemento
  (`importacion.ts:46-49`). Si un riesgo nuevo trae varias filas, su `id_origen` y su
  `lote_origen` salen de la primera, y RV-RSK-01 no compara esas dos columnas. Es
  coherente con el spike, pero «queda como está en el archivo» vale para las celdas,
  no para la forma de las listas.
- **N7. Lo que los tests no cubren.** Los tests no prueban contra la base RV-RSK-03,
  RV-RSK-05, RV-ID-03 ni RV-EVA-06 con lo registrado; el test unitario de RV-ID-03 arma
  las claves de `origenes` a mano. Mi sonda S3 los corrió por `leerExistentes` y dan
  bien. Agregarlo a `lotes posteriores` sería barato.
- **N8. Entorno.** `pnpm check` termina con exit 1 por los 4 cancelados de
  Communication, que según el encargo son preexistentes con Node 22. El HEAD de la
  rama avanzó a `db5925f` durante la revisión, sólo con la línea de `ops/runs`.

## Dismissed

- **RV-EVA-05 ignora `efecto` en una acción registrada** (`validador.ts`:
  `'efecto' in a` es falso para `AccionExistente`). En el spike, «ya informada» es una
  acción no cumplida que tiene efecto. Una acción así no puede estar registrada: si
  tiene efecto sin estar cumplida, la rechaza RV-ACC-09, y `accion_estado` guarda el
  efecto junto con el estado. El camino no se alcanza.
- **`safetyCritical(fac.i)` sin `evaluable`.** En el spike, `evaluable` sólo cambia el
  resultado de `alcanza` con `reglas === 'v0.3'`. La v1 portada no tiene ese modo. Es
  equivalente.
- **RV-RSK-07 rechaza cualquier fila de un padre registrado.** La regla es «un padre
  tiene más de una fila». La fila registrada más la del lote ya son dos, así que es la
  lectura literal.
- **Carrera entre importaciones.** Entre la primera búsqueda de la huella y el bloqueo
  puede entrar otra importación. Se vuelve a buscar dentro del bloqueo y la huella es
  `unique`. S6 y S7 lo confirman con procesos concurrentes reales.
- **RV-ACC-08 contra una evaluación registrada siempre falla.** Una evaluación
  registrada sólo puede apuntar a una acción que ya existe, y repetir esa acción en el
  lote es RV-ID-02. Es la consecuencia esperada de RV-ID-02, no un error del port.

## Conclusión

Un `Act on` (A1). El resto del diff hace lo que el contrato pide: todo o nada real con
bloqueo y huella, port fiel al spike con `existentes` bien resuelto contra la base, y
tests que comparan con oráculos externos (el validador de la 15b y
`regresion-emi41.csv`). A1 es chico de arreglar, pero toca la única salida que el
contrato y R-19 dejan salir con datos reales. Los `Consider` son, sobre todo, cosas que
la evidencia tiene que reportarle al owner (C1, C2, C3) y una protección barata en la
CLI (C4).
