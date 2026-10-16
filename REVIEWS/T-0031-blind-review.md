# T-0031: revisión ciega (R-33)

- **Base revisada:** worktree aislado en HEAD `5c78bf7` («Merge main en T-0031
  (Verification con run, PR #86)»), rama de T-0031 con `main` mergeado. Debajo, los dos
  commits de la tarea: `15c53d1` (contexto: actualización, revisión pendiente e
  historial) y `e00768c` (app: formularios, orden previo e historial). El diff que me
  pasaron (`diff.patch`, 4801 líneas) es `git diff origin/main...HEAD`: 45 archivos, en
  `apps/risk/` (tres POST nuevos, página de orden previo, formularios, vistas, tests),
  `contexts/risk/` (migración `0004` con su reversa, dominio, aplicación, persistencia,
  script `ciclos`, tests) y los README de los dos. No toca `DOMAIN.md`, `TASKS/`,
  `.claude/`, `.github/`, `apps/web`, `apps/communication` ni `packages/*`.
- **Contrato:** el de `main` (`contrato-desde-main.md`). No leí `TASKS/T-0031-*.md` de la
  rama ni `ops/evidence/T-0031.md`.
- **Contexto leído por mi cuenta:** `SLICES/RO01.md` (§3 completo, §6 con A5, A7, A8 y
  A12, protocolo de aceptación), `SLICES/RO01-decisiones.md` (decisiones 6 y 7),
  `SPIKES/T-0021/v0/fase-15/dossier-fase-15a.md` §5, `SPIKES/T-0021/v0/fase-13/dossier-cierre-emi15.md`
  §5 (disparadores de reapertura), `SPIKES/T-0021/v0/fase-15/sinteticos/ciclo.ts`,
  `contexts/risk/migrations/0001_risk_schema.sql` (tablas que usa la tarea),
  `contexts/risk/README.md` (CLI de personas) y `REVIEWS/T-0030-blind-review.md` como
  modelo de formato.
- **Orden:** corrí `pnpm check` antes de leer el diff, después el subconjunto de Risk y
  `pnpm test` y el build; recién entonces leí el diff contra el contrato. Después probé
  hipótesis con sondas propias: `volverA` aislada en un script de Node, y la app compilada
  levantada con `next start` en el puerto 3217 contra `delcampo_risk_dev`, recorrida con
  `curl` y un script `fetch` en `revision/sondas/`.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien
  implementó.
- **Efecto de la revisión sobre `delcampo_risk_dev`:** di de alta dos personas
  sintéticas (`sonda-revisora`, `sonda-operadora`) con el CLI y al final las di de baja.
  El esquema es de sólo inserción, así que quedan: sus filas de persona, usuario,
  credencial y acceso; **un orden previo de `sonda-revisora` para
  `ORG-…NDTEX` con las 8 posiciones en 1** (hallazgo A2); la acción 15B-A04
  (`RSK-…CZZF`) pasada a `cumplida`, su revisión `REV-…QTD0` cerrada con la reevaluación
  `EVA-…FRFEB`, que después marqué `rejected` (hallazgo A1). Todo sintético y local; no se
  puede borrar sin saltear los triggers y no lo hice. Quien use esa base para el recorrido
  humano del contrato tiene que saber que esas filas son de la sonda. Paré el servidor y
  borré las cookies.

## Verificación ejecutada antes de leer el diff

Entorno: Node 22.22.0 (pnpm avisa `wanted node >=24`), Postgres 16 en `localhost:5432`,
con `env.sh` (PGUSER, PGPASSWORD, `RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test`,
`DATABASE_URL`).

### 1. `pnpm check`

```text
✓ 69 decisiones, 32 ADRs, 32 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
ok 1..   (scripts/tests: todos ok)
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication && tsc --noEmit -p apps/risk
$ eslint .
$ node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 "packages/**/*.test.ts" "apps/**/src/**/*.test.ts" "contexts/**/src/**/*.test.ts"
# tests 1130 · suites 164 · pass 1008 · fail 118 · cancelled 4 · skipped 0
[ELIFECYCLE] Command failed with exit code 1.
exit=1
```

`typecheck` y `lint` pasan sin salida. Las fallas tienen todas su `location` en
`packages/db` (138 líneas de ubicación; 93 veces `relation "party" does not exist`) y en
`contexts/communication` (5: `not ok 61 - cliente de envío de Cloud API`, `cancelledByParent`,
«Promise resolution is still pending»). Ninguna falla está en `contexts/risk` ni en
`apps/risk`. Es el patrón conocido de este entorno (PG16 no migra la base de Broker; Node
22 en communication); no lo reproduje sobre `main`, lo tomo del encargo.

### 2. `RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test pnpm test`

```text
# tests 1130 · suites 164 · pass 1008 · fail 118 · cancelled 4 · skipped 0
exit=1      (mismas fallas: 138 ubicaciones en packages/db, 5 en contexts/communication)
```

Subconjunto de Risk, solo:

```text
$ node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 "contexts/risk/src/**/*.test.ts" "apps/risk/src/**/*.test.ts"
1..74
# tests 705 · suites 73 · pass 705 · fail 0 · cancelled 0 · skipped 0
exit=0
```

### 3. `pnpm --filter "./apps/risk" run build`

```text
▲ Next.js 16.3.6 (Turbopack)
✓ Compiled successfully in 4.8s
  Finished TypeScript in 3.4s ...
✓ Generating static pages using 3 workers (2/2) in 174ms
Route (app): … ƒ /api/o/[org]/orden-previo · ƒ /api/o/[org]/reordenar · ƒ /api/r/[id]/actualizar
             · ƒ /o/[org]/orden-previo · … (21 rutas)
exit=0
```

### Comprobaciones humanas del contrato

No las hice como owner. Recorrí por HTTP un ciclo parecido al de la primera
comprobación (acción cumplida → revisión abierta → reevaluación → cierre aceptando) y el
detalle muestra quién, cuándo, antes y después de cada fila; ver A1, que salió de ese
recorrido.

## Hallazgos

### Act on

**A1. Una reevaluación que ya cerró una revisión se puede rechazar después: la revisión
queda cerrada como «reevaluación aceptada», la vigente vuelve a la anterior y A7 cuenta el
ciclo.** *(comprobado con sonda)*

- Dónde: `revisar` (`contexts/risk/src/application/actualizacion.ts:436-450`) escribe
  cualquier estado sobre cualquier evaluación sin mirar `cierre_revision`; el trigger
  `cierre_revision_reevaluacion_valida` (`migrations/0004_actualizacion.sql`, §4) exige
  `accepted` sólo en el instante del cierre; `contarCiclos`
  (`src/domain/ciclos.ts:55`) cuenta toda revisión de sesión con cierre, sin mirar el
  estado actual de la evaluación que la cerró.
- Sonda (app compilada, `delcampo_risk_dev`): `cumplir` 15B-A04 → `REV-…QTD0` abierta;
  reevaluación `EVA-…FRFEB` cargada; `op=cerrar` → «Reevaluación aceptada y revisión
  cerrada.»; `op=revisar estado=rejected` sobre `EVA-…FRFEB` → «Revisión registrada.».
  Resultado: `revision_humana` de `EVA-…FRFEB` = `accepted`, `rejected`; `cierre_revision`
  = `reevaluacion_aceptada EVA-…FRFEB`; el detalle muestra la revisión `cerrada` y la
  evaluación inicial como «la usada»; `pnpm --filter @del-campo/risk run ciclos` cuenta
  ese ciclo (`ORG-…HDAR: 1 (accion_ejecutada 1)`).
- Qué falla: el dossier 15a §5 y el contrato dicen que «si la reevaluación queda
  `rejected` o `needs_revision`, la revisión sigue abierta». Acá la revisión queda
  cerrada por una evaluación rechazada, el historial dice «reevaluación aceptada» y A7
  suma un ciclo cuya reevaluación ya no vale. Para A7 no hay forma de distinguirlo en la
  salida del script.
- Arreglo posible, en orden de costo: (a) rechazar `needs_revision`/`rejected` sobre una
  evaluación que cerró una revisión (en la aplicación y con un trigger, sigue siendo sólo
  inserción); o (b) tratarla como reapertura: la revisión vuelve a contar como abierta y
  `contarCiclos` la excluye. (b) cambia la semántica del cierre y es del owner; (a) es
  conservadora. En los dos casos, un test que lo pruebe.

**A2. El orden previo del revisor acepta posiciones repetidas y no tiene corrección.**
*(comprobado con sonda)*

- Dónde: `registrarOrdenPrevio` (`actualizacion.ts:714-721`) comprueba que cada riesgo
  esté una vez y que la posición esté en `1..n`, pero no que las posiciones sean
  distintas. El registro es uno por revisor y empresa (`orden_previo_uno_por_revisor_y_empresa`)
  y de sólo inserción, y la pantalla ya no ofrece el formulario una vez registrado.
- Sonda: `POST /api/o/ORG-…NDTEX/orden-previo` con las 8 `pos_*` en `1` → 303
  `?ok=Orden previo registrado.`; en la base, `8 items, 1 posición distinta`. El segundo
  intento, ya con posiciones 1..8, → `?error=ya registraste tu orden previo de esta empresa`.
- Qué falla: A8a es evidencia de una sola vez, antes del primer acceso a resultados; un
  error de tipeo (o un formulario enviado a medias con el mismo número) la deja inservible
  para siempre: no se puede rehacer, y después de ver resultados ya no sería previa. El
  propio código trata el orden profesional como «sin empates: es un orden de una persona»
  (`domain/reordenamiento.ts:101-102`), y el acta de A8 compara pares ordenados contra el
  ranking (dossier Fase 13 §5, disparador 1): con empates no hay par que comparar.
- Arreglo: exigir una permutación de `1..n` (o, si el owner quiere admitir empates,
  decidirlo explícito y que el acta lo sepa), con test. Que la pantalla diga que el
  registro no se puede corregir.

### Consider

**C1. El script de ciclos no entrega lo que A7 pide de cada ciclo, y su veredicto depende
de una lista de empresas escrita a mano.** *(comprobado leyendo; lo segundo, inferido del
código)*

- El contrato pide contar las revisiones «con disparador, apertura, cierre, quién,
  resultado y evaluación», y A7 (`RO01.md:156`) exige que cada una tenga disparador (tipo
  y referencia), apertura, cierre, quién la cerró, resultado y la evaluación. El script
  lee esas columnas (`persistence/actualizacion.ts:92-111`) pero `informeCiclos`
  (`domain/ciclos.ts:93-104`) sólo imprime totales por disparador y por empresa y la
  primera y última fecha de cierre; ni siquiera separa `reevaluacion_aceptada` de
  `sin_cambio`. El test lo fija así (`ciclos.integration.test.ts:72` prohíbe `REV-`,
  `EVA-`). El contrato también dice «salida con sólo códigos de empresa, conteos y
  fechas»: hay tensión dentro del contrato y la implementación eligió una lectura en
  silencio (AGENTS.md: no elegir en silencio). Ids opacos de revisión y evaluación, fechas
  de apertura y cierre y resultado no son datos de cliente; una línea por ciclo con eso
  cumpliría las dos frases. Que lo decida el owner y quede escrito.
- `--empresas` es libre (`cli-ciclos.ts:133-135`) y `contarCiclos` sólo exige ciclos en
  las empresas que se le pasan (`ciclos.ts:61,69`). Con `--empresas ORG-X` y diez ciclos
  de tres tipos en `ORG-X`, imprime «A7: cumplido» aunque A7 pida las cinco históricas.
  Exigir exactamente cinco códigos, o derivarlos de los lotes importados.

**C2. El formulario de reevaluación precarga el vector vigente, y enviarlo sin tocar crea
una reevaluación idéntica que cierra como «reevaluación aceptada».** *(comprobado con
sonda)*

- `camposFactor` y `formReevaluacion` (`apps/risk/src/vistas/formularios.ts:113-148`)
  usan los valores de la evaluación usada como `defaultValue`. La sonda envió el
  formulario tal como viene (sólo motivo, acción, fecha y evidencia): `EVA-…FRFEB` quedó
  con `p 5, i_econ 2, v_cont 4…`, igual a la inicial, y cerró `REV-…QTD0`.
- El dossier 15a §5 separa los dos cierres: «Sin cambio … no se crea evaluación nueva: el
  riesgo no cambió», y ese cierre exige fundamento. Una reevaluación copiada es un «sin
  cambio» sin fundamento que A7 y el historial registran como reevaluación. El Non-scope
  excluye «sugerir valores»; precargar es lo más cercano a eso que tiene la UI. Opciones:
  no precargar, o rechazar (o al menos exigir `justificacion`) cuando el vector no cambia
  y ofrecer el «sin cambio».

**C3. Las fallas inyectadas sólo recorren el camino `savepoint`.** *(comprobado leyendo)*
`enTransaccion` (`actualizacion.ts:59-62`) usa `savepoint` si recibe una transacción y
`begin` si recibe la conexión. Todos los tests de A5
(`actualizacion.integration.test.ts:239-313`) pasan la `tx` de `conEscenario`, así que
nunca ejercitan `db.begin`, que es lo que corre la app. La semántica es la misma en
Postgres y el riesgo es bajo, pero «falla inyectada en cada operación compuesta» queda
probado sobre un camino que producción no usa. Un caso con `sql` (sin `tx` externa) y
limpieza por diferencia alcanzaría; si no, la comprobación humana del contrato es la que
cubre `begin`.

**C4. `formRevisar` llega con `accepted` preseleccionado** (`formularios.ts:57`). Aceptar
es un clic sobre cada evaluación, acción y cobertura, en una pantalla donde A8b mide la
revisión del profesional. Un default vacío obliga a elegir. Bajo costo.

**C5. `volverA` sale del prefijo `/r|/o` con `%2e%2e`, y los avisos se leen de la URL.**
*(comprobado con sonda)* La regex de `apps/risk/src/lib/actualizar.ts:39-40` rechaza `..`
literal pero no `%2e%2e`: `volver=/r/%2e%2e/%2e%2e/api/logout` resuelve a
`http://localhost:3217/api/logout`, `/r/.%2e/.%2e/login` a `/login`. No es una redirección
abierta (siempre mismo origen, y `volver` llega por un POST que exige `Origin` propio),
pero el comentario promete «una ruta propia de la app». Aparte, `?ok=` y `?error=` se
muestran tal como vienen (`vistas/comun.ts:206-214`): un enlace
`…/plan?ok=Reevaluación aceptada y revisión cerrada.` muestra ese aviso sin que haya
pasado nada (React lo escapa; es sólo texto engañoso). Validar `volver` después de
decodificar, y mostrar avisos por código y no por texto libre.

### Noted

- **Sesión y mismo origen en los tres POST:** la sonda dio `403` sin `Origin` y con
  `Origin` ajeno aun con cookie válida, y `401` sin cookie; `deny.test.ts` lo cubre para
  las tres rutas.
- **Autoría desde la sesión:** ningún formulario tiene campo de autor, actor o revisor;
  todo caso de uso escribe `sesion.personaId`, y `0004` agrega
  `*_sesion_humana` (origen `sesion` ⇒ `actor = human`), con tests negativos en
  `esquema.integration.test.ts:255-285`.
- **Pantalla ciega:** el HTML de `/o/…NDTEX/orden-previo` no tiene `data-c-raw`,
  `data-banda`, `data-posicion` ni «C_raw»; el conteo de `registro_acceso` de
  `vista_resultados` quedó en 11 antes y después de abrirla. Ordena por `id_origen`, no
  por ranking. El rechazo para quien ya vio resultados está en la aplicación y en el
  trigger `orden_previo_antes_de_resultados`, probado.
- **`C_raw` fuera del detalle:** ninguna salida nueva lo trae; la foto del
  reordenamiento guarda posición y banda, no `C_raw`; el test de regla 1 recorre las
  páginas de las 8 sintéticas.
- **Sólo inserción y transacciones:** `insertar` es el único escritor y sólo hace
  `INSERT` sobre una lista blanca de tablas; `risk.solo_insercion()` lo hace cumplir en la
  base. Cada caso de uso toma un `pg_advisory_xact_lock` por organización y relee
  después del bloqueo. Los errores de la base llegan al usuario sólo como nombre de
  restricción; el resto, como mensaje fijo y `console.error` con el nombre del error.
  El test estático de `UPDATE`/`DELETE` (`historial.integration.test.ts:139-152`) no
  atraparía un `update ${tx(...)}`, pero la base sí.
- **«Lo mismo que `ciclo.ts`»:** el test del ciclo de S07-R06 compara con la fila de
  15B-R01 de los CSV y con `REGRESION_EMI41` (`C 60 · pos 2 · Alta …`), no ejecuta
  `ciclo.ts` (importarlo desde el contexto chocaría con R-25). Lo doy por equivalente.
- **15B-A10:** ya viene `cancelada`; el test prueba que no se puede mover y que cancelar
  una acción nueva no abre nada. Cubre la frase del contrato.
- **Orden previo y acceso concurrentes:** el trigger compara `ocurrido_en` con
  `registrado_en` de la transacción; un acceso de otra transacción no confirmada no se ve.
  Como la vista registra el acceso antes de responder, la persona no puede haber visto
  resultados antes de que ese registro exista. Inferido, sin sonda.
- **Eficacia** acepta una reevaluación `needs_revision` o `pending`
  (`actualizacion.ts:322`); si esa reevaluación se rechaza después, la eficacia queda. Es
  el mismo patrón que A1, menor.

## Conclusión

La tarea cumple lo mecánico: Verification pasa para Risk (705/705) y el build compila;
las fallas de `pnpm check` y `pnpm test` son las conocidas del entorno, fuera de Risk.
Las reglas de presentación, la pantalla ciega, la autoría y la seguridad de los POST
aguantaron las sondas. Antes de cerrar pediría A1 y A2, que afectan directamente la
evidencia de A7 y A8a, y una decisión escrita del owner sobre C1 y C2.
