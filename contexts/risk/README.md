# Risk OS — `@del-campo/risk`

Contexto de D-0063 para Risk OS v1 (`SLICES/RO01.md`). Guarda riesgos, evaluaciones,
acciones, coberturas y lo que agregaron las decisiones del owner
(`SLICES/RO01-decisiones.md`), y calcula los derivados de la metodología v1 con funciones
puras. Lo creó T-0028; el importador es T-0029, la app y el acceso T-0030, la actualización
e historial T-0031, el despliegue T-0032.

No importa nada de Broker OS (`packages/*`, `apps/*`) ni de otro contexto, y nadie más lo
importa: no tiene `Party`, `Policy` ni claves foráneas a otro esquema (D-0063, D-0067). Lo
hace cumplir `pnpm lint` (R-25).

## Estructura

| Carpeta | Qué hay | Puede importar |
|---|---|---|
| `src/domain/` | Metodología v1 portada de `SPIKES/T-0021/regresion-ejecutable/metodologia.ts` sin cambiar reglas (`metodologia.ts`), el modelo mínimo (`modelo.ts`) y las lecturas de una organización: historia, vigente (8a), derivados, ranking, posición del padre, cola (`lectura.ts`). Del importador (T-0029): el lector de CSV de la 15b (`csv.ts`), el contrato leído de `contrato/` (`contrato.ts`), las 71 reglas contra el lote y lo que ya existe en la base (`validador.ts`), el paso de filas del CSV a filas del esquema (`importacion.ts`) y el informe en sus dos modos (`informe.ts`). De las vistas (T-0030): lo registrado de una organización (`organizacion.ts`) y el armado de cada vista con las reglas de RO01 §3 (`vistas.ts`). De la actualización (T-0031): qué abre y qué cierra una revisión pendiente y por qué se rechaza un pedido (`actualizacion.ts`), el reordenamiento profesional al lado del calculado (`reordenamiento.ts`), el historial de un riesgo armado de todas sus filas (`historial.ts`) y el conteo de ciclos de A7 (`ciclos.ts`). Puro. | Solo `src/domain/` |
| `src/persistence/` | Conexión, runner de migraciones y su CLI; lo que la importación lee y escribe (`importacion.ts`); lo que leen las vistas (`vistas.ts`) y el acceso (`acceso.ts`, T-0030); el bloqueo por organización, la inserción y las lecturas de la actualización (`actualizacion.ts`, T-0031). | `domain`, `postgres`, `node:*` |
| `src/acceptance/` | El script de aceptación de RO01 §6 (T-0032): el manifiesto privado del owner (`manifiesto.ts`), una lectura de sólo lectura que no registra accesos (`lectura.ts`), la medición de A6, A7, A8, A9 y A12 con los disparadores de reapertura y su informe sin valores (`medicion.ts`) y su línea de comandos (`cli.ts`). El paquete no lo exporta. | `domain`, `persistence`, `node:*` |
| `src/application/` | **Lo único que exporta el paquete**: una lista cerrada, sin funciones que comparen o agreguen `C_raw` entre riesgos sueltos u organizaciones (RO01 §3). | `domain`, `persistence` |
| `src/testing/` | Soporte de los tests: lee los CSV sintéticos de `SPIKES/T-0021/v0/` y compara con `regresion-emi41.csv` (`sinteticos.ts`, `regresion.ts`), y arma lotes a partir de las sintéticas y de los inválidos de la 15b (`lotes.ts`); el ensayo de la aceptación sobre una base vacía (`ensayo.ts`, `cli-ensayo.ts`, T-0032). El paquete no lo exporta. | Lo que el lint permite a todo el contexto: nada de Broker ni de otro contexto. Hoy importa `domain` y `node:*`. |
| `migrations/` | SQL del esquema `risk`, con su reversa en `down/`. | — |
| `deploy/` | `rol-app.sql`: el rol `risk_app` con que corre la app en la base hosteada (T-0032). | — |
| `contrato/` | Copia byte a byte de `SPIKES/T-0021/v0/fase-15/contrato/`: columnas de los tres CSV y las 71 reglas. Un test falla si se aparta del spike. | — |

Cada derivado lleva la versión de las funciones que lo calcularon (`metodologia v1`):
`derivados`, `rankingOrganizacion` y `colaDeValidacion` la piden como primer argumento y
rechazan una que no conocen.

## Esquema

Todo vive en el esquema de Postgres `risk`, incluido el ledger de migraciones
(`risk.schema_migrations`). Cada tabla nombra en su `comment on table` la superficie de
RO01 §2 que la usa; cada restricción tiene nombre y cita la regla del contrato
(`SPIKES/T-0021/v0/fase-15/contrato/reglas-validacion.csv`) que transcribe.

**Ninguna tabla admite `UPDATE`, `DELETE` ni `TRUNCATE`** (R-22, R-23): lo impide el
trigger `risk.solo_insercion()`. Un cambio de estado es una fila nueva y el vigente es el
de la última: el estado de una acción (`accion_estado`), la revisión humana
(`revision_humana`), el cierre de una revisión pendiente (`cierre_revision`). Una
corrección de una evaluación es otra evaluación que apunta a la anterior.

**Ningún derivado se guarda** (decisión 6a): no hay columnas de `C_raw`, banda, banderas,
techo, I efectivo ni posición. La excepción es `reordenamiento.orden_calculado`, una foto
para auditoría con la versión de las funciones que la produjo; si no coincide con el
recálculo, es un error y no un dato.

| Tabla | Qué guarda |
|---|---|
| `persona`, `registro_acceso` | Las personas con acceso y cada inicio de sesión o vista con resultados. |
| `usuario`, `credencial` | El usuario de cada persona y sus credenciales: hash scrypt, la vigente es la última, un hash nulo es la baja (D-0069, T-0030). |
| `riesgo`, `miembro_escenario` | La identidad del riesgo (riesgo, padre, sub-riesgo, escenario) y los miembros de cada escenario. |
| `evaluacion` | Evaluación inmutable con sus siete factores. Una sola inicial por riesgo, ninguna con dos sucesoras, la anterior ya registrada y del mismo riesgo; el padre no tiene. |
| `accion`, `accion_estado` | Acciones y decisiones de tratamiento de un riesgo, y cada cambio de estado, ejecución y eficacia. |
| `transferencia`, `evento_poliza` | Coberturas sobre un riesgo y eventos de póliza como observaciones locales (D-0067). |
| `revision_humana` | `review_status` de evaluaciones, acciones y coberturas; `accepted` sólo por una persona. |
| `novedad` | Novedades append-only sobre un riesgo, una acción o una cobertura (H2). |
| `revision_pendiente`, `cierre_revision` | Revisiones abiertas por actividad y su cierre por una persona. |
| `orden_previo`, `orden_previo_item` | Orden y bandas del revisor por empresa, antes de ver resultados (decisión 6). |
| `reordenamiento`, `reordenamiento_vigente` | Reordenamiento profesional con causa y las evaluaciones con que se calculó el orden (decisión 5). |
| (0004, T-0031) | Sin tablas nuevas: lo de una sesión es `human`; el orden de estados de una acción; una reevaluación por `accion_ejecutada` y una revisión abierta por una acción nombran una acción `cumplida`; una revisión se cierra con una reevaluación del motivo, posterior a la apertura y `accepted`, una reevaluación cierra una sola, y la que cerró una revisión no pasa después a `rejected` ni a `needs_revision`; el orden previo va antes del primer acceso a resultados, sin posiciones repetidas. Triggers `AFTER INSERT` que informan su nombre como `constraint`. |
| `login_fallido` | Cada login fallido con la huella sha256 del usuario, para el límite de intentos (D-0069, T-0032). |
| `lote_importacion` | Cada lote importado: huella de los tres archivos y del lote, origen, quién y cuándo, fecha de corte, filas por archivo, avisos y filas escritas por tabla (T-0029). |

## Bases locales

Solo dos: `delcampo_risk_dev` y `delcampo_risk_test`, en `localhost`. Son bases aparte de
las de Broker y de Communication OS. El runner rechaza cualquier otra.

```bash
# Crear la base de desarrollo y aplicar las migraciones
pnpm --filter @del-campo/risk run db:create

# Lo mismo sobre la de tests
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test \
  pnpm --filter @del-campo/risk run db:create

# Aplicar las pendientes / revertir la última aplicada
pnpm --filter @del-campo/risk run db:migrate
pnpm --filter @del-campo/risk run db:down

# Descartar todo
dropdb delcampo_risk_dev
```

Sin `RISK_DATABASE_URL`, el runner apunta a `delcampo_risk_dev`. `db:down` revierte una
sola migración; con todas revertidas, queda el esquema vacío con su ledger. Como las
tablas son sólo de inserción, la única forma de vaciar una base es `db:down` o `dropdb`.

## Importar un lote

Un lote son los tres CSV (`risks.csv`, `action-plan.csv`, `risk-transfer.csv`) en una
carpeta. Se importa todo o nada, en una transacción:

1. Si la huella de los tres archivos es la de un lote ya importado, responde
   `ya importado` sin validar ni escribir (H3).
2. Si no, valida el lote completo con las 71 reglas, contra lo que ya está en la base (un
   lote posterior puede reevaluar un riesgo importado antes; repetir un id es RV-ID-02).
   Con un rechazo no escribe nada; los avisos no bloquean.
3. Si una celda con valor no tiene columna en el esquema (por ejemplo `uncertainty` en un
   evento de póliza), no escribe nada y dice cuál.
4. Escribe las filas, registra el lote en `lote_importacion` y confirma. Si la base rechaza
   una fila o la conexión se corta, no queda nada.

```bash
pnpm --filter @del-campo/risk run import SPIKES/T-0021/v0/fase-15/sinteticos \
  [--corte AAAA-MM-DD] [--por nombre] [--sin-valores]
```

Hace falta `run`: `pnpm import` es un comando propio de pnpm. Apunta a
`RISK_DATABASE_URL` o, si falta, a `delcampo_risk_dev`, y aplica las migraciones
pendientes antes. `--corte` es la fecha contra la que se miran vencimientos (por defecto,
hoy). `--sin-valores` deja el informe sin mensajes ni celdas, sólo conteos, líneas e ids:
es el único informe que puede versionarse o publicarse con datos reales. La preparación
privada con agentes autorizados se rige por D-0070 y
`docs/despliegue/preparacion-datasets-risk.md`. Sale con 0 si el lote quedó
importado (ahora o antes), con 1 si no se escribió nada y con 2 si la carpeta o las
opciones no sirven.

## Personas con acceso a la UI

La app (`apps/risk`) deja entrar sólo a una persona con usuario y contraseña propios
(D-0069). Las da de alta el owner; la app no tiene pantalla para esto:

```bash
# La contraseña se lee de la entrada estándar, nunca de un argumento (20 caracteres o más)
openssl rand -base64 24 | tee /dev/tty | \
  pnpm --filter @del-campo/risk run persona alta --nombre "Nombre Apellido" --usuario nombre
pnpm --filter @del-campo/risk run persona clave --usuario nombre   # contraseña nueva
pnpm --filter @del-campo/risk run persona baja --usuario nombre    # ya no entra
```

Como el importador, apunta a `RISK_DATABASE_URL` o a `delcampo_risk_dev`, y sólo opera
sobre las dos bases locales. Una contraseña nueva o la baja dejan sin valor las sesiones
abiertas: el guard de la app compara la credencial de la cookie con la vigente en cada
request.

## Vistas

`src/application/vistas.ts` tiene un caso de uso por vista, cada uno con la sesión de una
persona y de una sola organización: lista (ranking D10, seguridad, no evaluables y cola),
escenarios, plan de acción, transferencia, actividad y detalle. Lo calculado sale de las
funciones de `src/domain/` en el momento: nada se guarda. Las que muestran ranking, bandas
o `C_raw` (lista, escenarios, detalle) registran el acceso en `registro_acceso` antes de
devolver nada. `C_raw` sólo sale en el detalle, junto al vector completo y las dos
banderas (H6).

## Actualización (T-0031)

`src/application/actualizacion.ts` tiene un caso de uso por operación de RO01 §2, cada uno con
la sesión de la persona que la registra (autor, `actor = human`, `origen = sesion`) y en una
sola transacción, serializada por organización con un advisory lock:

| Caso de uso | Qué escribe |
|---|---|
| `registrarNovedad` | Una novedad. Si es `informacion_nueva` o `cambio_contexto`, abre una revisión pendiente; un comentario no abre nada. |
| `altaAccion`, `cambiarEstadoAccion`, `registrarEficacia` | La acción con su estado inicial; cada cambio de estado con su comentario (guardado como novedad de la acción). Pasar a `cumplida` exige fecha y evidencia de ejecución y abre una revisión. |
| `cargarReevaluacion` | Otra evaluación que apunta a la última de la cadena, `pending`. No reemplaza a la vigente hasta que alguien la acepte. |
| `revisar` | `review_status` de una evaluación, acción o cobertura. |
| `cerrarConReevaluacion`, `cerrarSinCambio` | El cierre de una revisión: con la reevaluación del motivo (que acepta si hacía falta) o sin cambio, con fundamento. |
| `altaCobertura`, `registrarEventoPoliza` | Una cobertura y sus eventos como observaciones locales (D-0067). |
| `reordenar` | Un reordenamiento con causa, fundamento y patrón, la foto del orden calculado y las evaluaciones vigentes con que se calculó. Se aplica mientras esas no cambien. |
| `pantallaOrdenPrevio`, `registrarOrdenPrevio` | El material ciego de una empresa (sin ranking, bandas ni `C_raw`, no registra acceso) y el orden previo del revisor, que se rechaza si ya vio resultados. |
| `abrirRevisionesPorCambioDeVersion` | Una revisión por riesgo con evaluación vigente cuando cambian las funciones. |

Un pedido que no cumple una regla se rechaza con `RechazoActualizacion` y su motivo; lo que la
base rechaza (las restricciones de 0004 y las de siempre) vuelve con el mismo tipo y el nombre
de la restricción. En los dos casos la transacción se revierte entera.

El detalle trae `cambios`: el historial del riesgo armado de cada fila de cada tabla que lo
nombra, con quién, cuándo, qué y el estado anterior (`TABLAS_DEL_HISTORIAL` dice por qué las
que no entran no entran).

```bash
# Conteo de ciclos de A7: revisiones que una persona abrió y cerró, por empresa y disparador
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_dev \
  pnpm --filter @del-campo/risk run ciclos --empresas ORG-A,ORG-B,ORG-C,ORG-D,ORG-E

# Lo mismo y, aparte, una línea por ciclo que cuenta
  pnpm --filter @del-campo/risk run ciclos --empresas ORG-A,ORG-B,ORG-C,ORG-D,ORG-E --detalle
```

El resumen tiene sólo códigos de empresa, conteos y fechas: es el que puede salir del equipo
del owner. Sale con 0 si A7 se cumple. `--detalle` no lo cambia: le agrega, abajo, por cada
ciclo que cuenta, la empresa, la revisión, el disparador y su referencia, la apertura, el
cierre, el resultado, la evaluación si la hay y el nombre de la persona que cerró. Lleva ids
y personas, así que es para verificar en ese equipo, no para compartir (decisión del owner,
2026-10-17).

Una reevaluación materialmente idéntica a la evaluación vigente se rechaza: mismos factores
(estado, valor, rango y observación) y mismos campos evaluativos (base, evidencia, causa,
evento, consecuencia, monto, moneda, uncertainty y su nota, necesidad de validación). Sólo
cambian metadatos: fecha, autor, motivo, acción, justificación, versión. Si la revisión
concluye que no cambió nada, se cierra «sin cambio» con su fundamento. Con un cambio
evaluativo real entra aunque la criticidad o el vector den lo mismo (decisión del owner,
2026-10-17; `cambiosEvaluativos` en `src/domain/actualizacion.ts`).

## Base hosteada y aceptación (T-0032)

Los scripts de arriba operan sobre la base hosteada sólo con `--hosteada`, que lee
`RISK_HOSTED_DATABASE_URL` e ignora `RISK_DATABASE_URL`; sin la opción, ignoran la hosteada y
sólo tocan `delcampo_risk_dev` y `delcampo_risk_test` en localhost. Con `--hosteada` no
migran salvo `db:migrate`, el importador es sin valores por defecto y ningún mensaje repite la
URL ni el texto de un error de la base (sólo su código). Los tests se niegan a correr con
`RISK_HOSTED_DATABASE_URL` definida. Los pasos, en orden, están en
`docs/despliegue/vercel-risk.md`.

```bash
pnpm --filter @del-campo/risk run db:migrate --hosteada        # owner, rol administrativo
psql "$RISK_HOSTED_DATABASE_URL" -f contexts/risk/deploy/rol-app.sql
pnpm --filter @del-campo/risk run db:verificar --hosteada      # con risk_app: sale con 2 si algo no cumple
pnpm --filter @del-campo/risk run aceptacion <manifiesto.json> --hosteada

# El ensayo con las sintéticas, en local y sobre delcampo_risk_dev vacía
pnpm --filter @del-campo/risk run ensayo /tmp/manifiesto.json
pnpm --filter @del-campo/risk run aceptacion /tmp/manifiesto.json
```

`risk_app` lee e inserta en `risk` y nada más: no es dueño de ninguna tabla, así que no puede
desactivar el trigger de sólo inserción (R-22). `aceptacion` lee una foto en una transacción
de sólo lectura y devuelve A6, A7, A8, A9 sobre las históricas, A12 y los disparadores de
reapertura con códigos H1 a H5 y R1, conteos, fechas, `regla_id`, prefijos de huella e ids
de riesgo y de revisión: ningún título, texto, monto, nombre ni id de organización. Sale con
0 si todo cumple, con 1 si algo no y con 2 si falla el manifiesto o la base.

**Límite de intentos de login:** 10 fallidos de un usuario en 15 minutos lo bloquean 15
minutos (`LOGIN_MAXIMO_FALLIDOS`, `LOGIN_VENTANA_MINUTOS`); se guarda sólo la huella del
usuario.

## Tests

`pnpm test` incluye los del contexto (R-26):

| Capa | Archivos | Qué cubre |
|---|---|---|
| unit, oráculo externo | `src/domain/regresion.test.ts` | Los derivados de las 8 sintéticas contra `SPIKES/T-0021/v0/fase-11/regresion-emi41.csv`: 59 objetos, S15 sin la posición (`verificacion-15b.md` §4). Falla si se altera un valor de esa tabla en una copia. |
| unit | `src/domain/*.test.ts`, `src/application/*.test.ts` | Las funciones v1 (casos PV, bandas, §9.3, banderas, D10, padre, cola), las propiedades 1 a 7 de la metodología §14, las reglas 3 y 5 de RO01 §3 y lo que exporta el paquete. |
| integración | `*.integration.test.ts` | Contra Postgres: migrar, revertir y volver a migrar; un caso por restricción, comparado con el catálogo; sólo inserción en todas las tablas; comentarios RO01 y ausencia de derivados guardados. |
| integración, vistas | `src/application/vistas.integration.test.ts`, `acceso.integration.test.ts` | Las reglas 1 a 7 de RO01 §3 sobre las vistas de las 8 sintéticas: `C_raw` sólo en la criticidad del detalle; el ranking contra `rankingOrganizacion` y, en las organizaciones sin filas de la 15b, contra `regresion-emi41.csv`; el techo no mueve posiciones; el filtro por unidad las conserva; `unknown` sin valor; la evaluación usada y su rótulo; versiones; el registro de acceso; login, rotación y baja. |
| integración, actualización | `src/application/actualizacion.integration.test.ts`, `historial.integration.test.ts`, `ciclos.integration.test.ts` | El ciclo de S07-R06 (15B-A01 cumplida, reevaluación, cierre) da lo mismo que `regresion-emi41.csv`; qué abre y qué no abre una revisión; rechazos; una falla inyectada después de cada escritura de cada operación no deja nada; orden previo, reordenamiento y cambio de versión; el historial contra las filas de la base, tabla por tabla; ninguna tabla sin razón; ningún `UPDATE` ni `DELETE` en el código; el conteo de A7. |
| integración, despliegue y aceptación | `src/application/rol-app.integration.test.ts`, `src/acceptance/*.test.ts`, `src/persistence/database.test.ts` | `risk_app` hace lo que la app necesita y nada más (UPDATE, DELETE, TRUNCATE, desactivar el trigger, crear, leer fuera de `risk`: 42501) y `db:verificar` lo distingue del administrativo; el modo hosteado; el ensayo completo cumple los criterios, lo que falta no, y el informe no tiene ningún texto de la base; el manifiesto y su línea de comandos no repiten contenido. |
| integración, importación | `src/application/importar*.integration.test.ts` | Las sintéticas con los mismos 103 avisos que el validador de la 15b y los derivados desde la base contra `regresion-emi41.csv`; los 55 inválidos, cada uno con su error y cero filas; reimportación; lotes posteriores; fallas de la base, una conexión cortada y la línea de comandos. |

Los de integración corren siempre sobre `delcampo_risk_test`: la crean si no existe y
aplican las migraciones. Como el esquema no se puede vaciar, cada caso escribe dentro de
una transacción que se revierte; los de `importar-confirmado` confirman de verdad y
rehacen el esquema (`db:down` y migrar) antes de cada caso y al terminar. La URL sale de `RISK_DATABASE_URL` o, si falta, de
`DATABASE_URL` con el nombre de la base cambiado; `scripts/guard-db-tests.mjs` valida las
dos antes de cualquier test.

```bash
pnpm test                                   # todo el workspace
node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 \
  "contexts/risk/src/**/*.test.ts"          # solo este contexto
```

## Pendiente para otras tareas

- **Invariantes de varias filas.** 0004 suma las que la base puede comprobar al escribir; las
  que siguen en la aplicación están en el encabezado de la migración y en
  `ops/evidence/T-0031.md`.

## Datos

Sólo sintéticos (R-19). Ningún test, fixture ni migración usa valores de las cinco
empresas históricas; el oráculo lee las 8 sintéticas de `SPIKES/T-0021/v0/`, que no se
modifica.
