# T-0035: revisión ciega del PR de la migración 0009 de Risk OS, el camino `oidc` sin `legado_risk_app` (R-33, D-0048, D-0052)

- **Base revisada:** worktree aislado `/home/claude/review-0009` en HEAD `d168235` («T-0035:
  camino oidc de Risk OS sin legado_risk_app (migración 0009)»), rama
  `task/T-0035-oidc-sin-legado-risk`, sobre `main` `c82a7da`. El paquete `diff.patch` (1533
  líneas) es idéntico a `git diff c82a7da..d168235 -- . ':!ops/evidence'`: lo comprobé con
  `diff -q`. Cambian 24 archivos sin contar la evidencia. Los principales son la migración
  `contexts/risk/migrations/0009_camino_oidc.sql` y su reversa, `deploy/rol-oidc.sql` (nuevo),
  `deploy/rol-app.sql`, `persistence/identidad.ts`, `persistence/verificacion-oidc.ts` (nuevo),
  `apps/risk/src/lib/{acceso,identidad,server}.ts`, cuatro pruebas existentes modificadas y una
  nueva (`camino-oidc.integration.test.ts`), y los documentos
  `docs/migration/T-0035-retiro-legado-risk.md` (nuevo), `T-0035-identidad-comun.md` y
  `docs/despliegue/vercel-risk.md`.
- **Contrato:** el de `main` (`contrato-desde-main.md`). Para juzgar el cumplimiento usé
  además lo que pidió el owner el 2026-11-04, tal como me lo trasladaron: (1) una conexión `oidc`
  que no dependa de `legado_risk_app`; (2) pruebas de que ninguna ruta `oidc` lee datos por
  privilegios heredados; (3) un procedimiento de retiro con período de observación y vuelta
  atrás. La política no se borra todavía y no se toca producción.
- **Leído por mi cuenta, en este orden:**
  1. El contrato.
  2. `ENGINEERING_RULES.md`: R-33 (§9), R-22, y las referencias a R-13 y R-14.
  3. En `decisions.yaml`: D-0048, D-0052, D-0022, D-0063, D-0069, D-0072 y D-0077.
  4. `REVIEWS/T-0035-0011-blind-review.md`, como modelo de formato.
  5. Después de la verificación: el diff entero.
  6. Para entender el diff: `0006_identidad_y_autorizacion.sql` (roles, `authz_*`, tablas de
     identidad y auditoría, `legado_risk_app`), `apps/risk/src/lib/{guard,pagina,entrada,
     entre-contextos,modo,sesion}.ts`, `persistence/migrations.ts`, `testing.ts`, `cli.ts`,
     `database.ts`, `rol-app.integration.test.ts` y la prueba de las `authz_*` en
     `autorizacion.integration.test.ts`.
  7. `ops/evidence/T-0035.md` (sólo su diff), **al final**: a las 11:52 UTC del 2026-11-04,
     con todas las sondas cerradas.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien implementó.
- **Efectos en el entorno:**
  - **Worktree.** Las mutaciones de código se hicieron en el worktree y se revirtieron con
    `git checkout -- <archivo>`. Dos scripts de sonda pasaron por `contexts/risk/` (`zz-*.mjs`)
    para poder importar los `.ts`. Copié los dos a `sondas/` y los borré del worktree. `git
    status --short` queda vacío.
  - **Bases descartables.** Creé y borré `revision_0009_risk_test` (todas las migraciones) y
    `revision_0009_restore_test` (restauración con `pg_restore`). No queda ninguna `revision%`.
  - **Base compartida.** Sobre `delcampo_risk_test` sólo corrieron las suites y las pruebas
    mutadas, que revierten su transacción.
  - **Roles del clúster.** Los roles son de todo el clúster, así que algunas sondas los tocaron:
    - El `down` de la 0009 en mi base volvió a hacer a `risk_app` miembro de `risk_persona`.
      Lo deshice enseguida reaplicando la 0009.
    - `rol-app.sql` y `rol-oidc.sql` corridos sobre la base restaurada dejaron `LOGIN` en
      `risk_app` y `risk_oidc`. Volví los dos a `NOLOGIN` con `alter role`. Que `risk_app`
      estuviera en `NOLOGIN` antes es una inferencia mía: 0006 lo crea así, los tests corren
      `rol-app.sql` en transacciones que se revierten, y no tenía contraseña.
    - Estado final, comprobado: `risk_app` no es miembro de `risk_persona`; `risk_oidc`,
      `risk_app` y `risk_persona` en `NOLOGIN`; `risk_oidc` sigue siendo miembro de
      `risk_persona`.
  - **Sin efectos en el resto.** No toqué `/home/claude/del-campo`, no hice commits, push ni
    publicaciones. Todos los datos son sintéticos (`*@ejemplo.invalid`, `PER-01M50T…`).
- **Sondas guardadas:** en `REVIEWS/T-0035-0009/`: `s1` a `s5` son las sondas, y
  `migrar.mjs.txt` y `s4-verificar-oidc.mjs.txt` los scripts. Las salidas completas de la
  verificación (`v-*.txt`) no se versionan; sus resúmenes están abajo.

## Verificación ejecutada antes de leer el diff

Entorno: Node 22.23.4 (el repo pide ≥ 24, `pnpm` avisa «Unsupported engine») y
PostgreSQL 16.15 (el repo fija 17 y CI corre 17). `.env` con
`DATABASE_URL=…/delcampo_test`. Dependencias ya instaladas.

```text
$ node scripts/check-docs.mjs
✓ 77 decisiones, 42 ADRs, 37 tareas, 0 aviso(s)
docs=0
$ node --test scripts/tests/*.test.mjs
# tests 177  # pass 177  # fail 0
$ pnpm typecheck
tc=0
$ pnpm lint
$ eslint .
lint=0
$ DATABASE_URL=…/delcampo_test node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 \
    --test-force-exit "apps/risk/src/**/*.test.ts" "contexts/risk/src/**/*.test.ts"
1..98
# tests 819  # suites 97  # pass 819  # fail 0  # cancelled 0  # skipped 0
risk=0
$ … --test-force-exit "packages/**/*.test.ts" "apps/web/src/**/*.test.ts"
1..67
# tests 323  # suites 67  # pass 323  # fail 0
broker=0
$ … --test apps/risk/src/lib/deny.test.ts        # sin --test-force-exit
# tests 142  # suites 10  # pass 142  # fail 0
deny=0
```

## Sondas propias

### s1. Qué alcanza `risk_oidc` según el catálogo (base descartable con 0001–0009)

```text
== funciones ejecutables por risk_oidc (fuera de pg_catalog/information_schema)
risk.solo_insercion() … risk.orden_previo_item_en_su_registro()   prosecdef=f  (11 de invocador, vía PUBLIC)
risk.admision_credencial(text,text)|t|f    risk.admision_invitacion(text)|t|f    risk.admision_registrar(…)|t|f
== secdef en risk ejecutables por PUBLIC                    (0 filas)
== relaciones no-tabla en risk con algún privilegio para risk_oidc   (0 filas; en risk no hay vistas: r 27, i 69, S 11)
== column privileges risk_oidc: evento_auditoria, INSERT en las 9 columnas, incluidas id y ocurrido_en
== default privileges                                        (0 filas)
== políticas para PUBLIC                                     (0 filas)
== tablas de risk sin RLS                                    (0 filas)
== risk_persona miembro de                                   (0 filas)
```

### s2. Sesión real de `risk_oidc` (`set session authorization`, así que `session_user = risk_oidc`)

```text
session_user | current_user  →  risk_oidc | risk_oidc
-- 1. lectura directa:             ERROR:  permission denied for table persona
-- 2. admision_invitacion('operadora@ejemplo.invalid') → 2 | PER-…012 | operadora@ejemplo.invalid | … | OPERADOR | f
-- 3. admision_registrar(<esa persona>, 'google', 'sub-de-un-tercero', <ese email>, <esa invitación>) → ok
      admision_credencial('google','sub-de-un-tercero') → 2 | PER-…012 | OPERADOR
-- 4b. set role risk_persona; set_config('authz.persona_id', '<la admin>', false)
      authz_persona=PER-…011  authz_rol=ADMINISTRADOR  personas_visibles=2
-- 5b. insert … (id, ocurrido_en, …) overriding system value values (5, '2020-01-01', …, 'denied', 'NO_INVITADO') → INSERT 0 1
      insert … (ocurrido_en, …) values ('2099-01-01', …, 'acceso.token', 'denied', 'FALSO_X') → INSERT 0 1
-- 5c. después, tres inserts normales en la auditoría:
      INSERT 0 1 / INSERT 0 1 / ERROR:  duplicate key value violates unique constraint "evento_auditoria_pkey"  Key (id)=(5)
```

### s3. Reversa de la 0009 en la base descartable (`down` y vuelta a aplicar)

Comparé el catálogo con la 0009, después del `down` y con la 0009 reaplicada:

```text
NOTICE risk_oidc sigue en uso en otra base; queda sin permisos sobre risk
--- con 0009 vs tras down
> miembro|risk_persona|risk_app|f|t
< acl|evento_auditoria|{…,risk_oidc=a/postgres}       < pol|evento_auditoria_rechazo
< fn|risk.admision_* (3)                                < nsp|{…,risk_oidc=U/postgres}
(sin cambio, en las dos: miembro|risk_persona|risk_oidc|f|t)
--- con vs reaplicada
identicas
```

### s4. Puntos ciegos de `verificarOidc` (base descartable, `set local session authorization risk_oidc`, todo revertido)

```text
== base                 conexión de oidc: cumple
== set_false            conexión de oidc: cumple        set role: 42501 permission denied to set role "risk_persona"
== pg_monitor           ✗ miembro sólo de risk_persona…: pg_read_all_data, risk_persona   → no cumple
== select_vista_public  conexión de oidc: cumple        filas leídas por la vista, como risk_oidc: 2
```

### s5. Restauración según `vercel-risk.md` §8 (`pg_restore --no-owner --no-privileges`, después `rol-app.sql` y `rol-oidc.sql`)

```text
rol-app.sql y rol-oidc.sql: ok
PUBLIC ejecuta: admision_credencial=true admision_invitacion=true admision_registrar=true
(y además, en la misma base: «secdef de risk ejecutables por PUBLIC: 27», «tablas con algún privilegio de risk_persona: 0»)
✓ … (los nueve puntos)
conexión de oidc: cumple
lectura como persona: 42501 permission denied for schema risk
```

### s6. Mutaciones de código (en el worktree, revertidas una por una)

```text
M1 sin afirmarConexionOidc ni el chequeo de conPrincipal → camino-oidc: not ok «…con la conexión de risk_app», «…del dueño»  # fail 2
M2 buscarCredencial lee credencial_externa y rol_persona directo → acceso.integration y autorizacion: varios not ok (entrada con Google, alcance, escrituras, baja, legacy)
M3 variableDeConexion devuelve siempre RISK_DATABASE_URL → deny.test: # fail 1
M3b configEntrada vuelve a exigir RISK_DATABASE_URL       → deny.test: # fail 1
M4 rol-oidc.sql sin el bucle que saca membresías          → camino-oidc: not ok «es idempotente, le da LOGIN y le quita lo que…»
M5 SinPermiso auditado con la conexión, como antes         → acceso.integration: 2 not ok (orden previo ciego; token entre contextos)
```

## Hallazgos

Uso las mismas severidades que el modelo:
- **Bloqueante:** no mergear sin corregirlo.
- **Importante:** corregirlo antes de la fase que lo activa, o antes de ejecutar el documento.
- **Menor.**

Bloqueante e importante son *Act on*; menor es *Consider*.

### Act on

**1. [importante] Si se restaura la base como dice `vercel-risk.md` §8, que este PR amplía, las
tres `admision_*` quedan ejecutables por PUBLIC, el camino `oidc` no funciona, y
`db:verificar-oidc` igual dice «cumple».** *(comprobado con sonda: s5)*

- **Dónde:**
  - `docs/despliegue/vercel-risk.md:235-243`: el PR agrega `rol-oidc.sql` y
    `db:verificar-oidc` después del `pg_restore … --no-privileges` y dice que los permisos «los
    vuelven a dar `rol-app.sql` y `rol-oidc.sql`, después».
  - `contexts/risk/deploy/rol-oidc.sql:232-234`: sólo hace `grant execute … to risk_oidc` y
    nunca `revoke … from public`.
  - `contexts/risk/src/persistence/verificacion-oidc.ts:51-53,75`: comprueba que la conexión
    *puede* ejecutar las tres funciones. No comprueba que *nadie más* pueda, ni que
    `risk_persona` sea usable.
- **Qué pasa:** `--no-privileges` no restaura los `REVOKE … FROM PUBLIC` de la 0009, así que las
  funciones vuelven al default de Postgres (EXECUTE para PUBLIC).
  - Cualquier rol con conexión puede ejecutarlas. En la hosteada, eso incluye `risk_app` y
    `risk_persona`. Las tres son SECURITY DEFINER. Alcanza con conocer un email para leer la
    invitación pendiente y su persona, y para vincular un `sub` cualquiera a esa invitación (es
    lo que hace s2 paso 3, con `risk_oidc`).
  - Al mismo tiempo, `risk_persona` queda sin ningún privilegio: «permission denied for schema
    risk». El modo `oidc` falla en cada request. Eso viene de la 0006, que tampoco vuelve a dar
    nadie después de una restauración.
  - Aun así, los nueve puntos de `verificar-oidc` salen en verde. El documento la presenta como
    la comprobación de la restauración.
- **Por qué *Act on*:** el PR introduce las funciones, el script y la verificación, y edita
  el paso de restauración para que los use. La comprobación que el procedimiento de retiro
  pide «el último día» de la observación (`T-0035-retiro-legado-risk.md:102`) tampoco lo vería.
  No afecta hoy a producción, porque la 0009 no está aplicada. Hay que corregirlo antes de la
  preparación de la fase 4.
- **Arreglo posible:**
  - En `rol-oidc.sql`, `revoke all on function risk.admision_*(…) from public` antes de los
    `grant`.
  - En `verificar-oidc`, un punto con `has_function_privilege('public', …) = false` para cada
    `admision_*` (y para toda SECURITY DEFINER de `risk`), y una prueba de humo de que
    `risk_persona` se puede asumir y tiene USAGE sobre `risk`.
  - En §8, una de dos: decir que `--no-privileges` obliga a volver a correr las migraciones de
    permisos, o restaurar con privilegios después de crear los roles.

### Consider

**2. [menor] `risk_oidc` puede elegir `id` y `ocurrido_en` en la auditoría. Con eso fecha
rechazos falsos y, ocupando ids futuros, hace fallar la auditoría legítima.** *(comprobado: s2,
pasos 5b y 5c)*

- **Dónde:** `0009_camino_oidc.sql:129-133`. El `grant insert` es sobre la tabla entera, y la
  política `evento_auditoria_rechazo` restringe `origen`, `actor`, `resultado`, `tipo_objeto`,
  `id_objeto` y `accion`, pero no las dos columnas generadas.
- **Efecto:** con `overriding system value`, `risk_oidc` insertó `id = 5` con fecha 2020. Al
  tercer insert legítimo la secuencia llegó a 5: `duplicate key … evento_auditoria_pkey`. Cada
  escritura de `oidc` audita en su transacción y `admision_registrar` también, así que un id
  ocupado tumba ingresos y acciones.
- **Matiz:** quien tiene esa credencial ya puede declararse cualquier principal (s2, 4b: con
  `set role risk_persona` y `set_config` se vuelve la Administradora). Es la confianza que D-0022
  deposita en la app. Por eso lo dejo en *Consider*.
- **Arreglo:** cuesta una línea, `grant insert (actor_persona_id, origen, accion, tipo_objeto,
  id_objeto, resultado, motivo)`. Así el doc y la cabecera pasan a ser ciertos al pie de la
  letra («sólo rechazos»).

**3. [menor] La base no comprueba el email al vincular: compara el de la invitación contra sí
mismo.**

- **Dónde:** `persistence/identidad.ts:155-156` pasa `invitacion?.email`, que es el email que
  devolvió `admision_invitacion`, no el de la identidad verificada. Así, la condición
  `i.email = p_email` de `0009_camino_oidc.sql:102` siempre se cumple cuando la llama la app.
- **Por qué importa:** la cabecera de la 0009 (`:19-20`) y el procedimiento (§1) dicen que «la
  que escribe vuelve a comprobar en la base lo que la app ya decidió». En el email no es así.
  La prueba de `camino-oidc.integration.test.ts:191` llama a la función con otro email a mano,
  así que prueba la función y no el cableado de la app.
- **Arreglo:** pasar `normalizarEmail(identidad.email)`. Si no, quitar la frase.

**4. [menor] Si `drop role` falla, la reversa deja a `risk_oidc` miembro de `risk_persona` y el
aviso dice lo contrario.** *(comprobado: s3)*

- **Dónde:** `down/0009_camino_oidc.sql:22-29`. Cuando `drop role` falla, el aviso dice
  «queda sin permisos sobre risk». Pero la membresía en `risk_persona` (con SET) sigue (s3: la
  fila `miembro|risk_persona|risk_oidc|f|t` está antes y después del `down`), y el `LOGIN` que
  le haya dado `rol-oidc.sql` también.
- **Por qué es un problema:** con esa membresía, desde la sesión puede asumir `risk_persona`,
  que conserva USAGE sobre `risk` y sus grants, y declararse cualquier principal.
- **Matiz:** en local pasa siempre, porque `delcampo_risk_test` comparte el rol. En la hosteada
  sería raro.
- **Arreglo:** antes del `drop`, `revoke risk_persona from risk_oidc` y `alter role risk_oidc
  nologin`.
- **Detalle menor:** la reversa vuelve a dar `risk_persona` a `risk_app` sin condición. En una
  base local a la que nunca se le corrió el `rol-app.sql` viejo, eso agrega una membresía que
  antes no estaba (s3: `> miembro|risk_persona|risk_app`). En la hosteada coincide con el
  estado previo esperado.

**5. [menor] `verificar-oidc` y la prueba nueva sólo miran tablas (`relkind = 'r'`) y las
`admision_*`.** *(comprobado: s4)*

- **Lo que pasa hoy sin que lo vean:**
  - Una vista en `risk` con `grant select … to public`, que lee como su dueño y sin RLS: s4,
    `cumple` con 2 filas leídas.
  - Una SECURITY DEFINER nueva sin `revoke … from public`.
  - Un grant de columna. `has_table_privilege` no lo ve, pero RLS sin política lo deja en cero
    filas.
  - Una membresía en `risk_persona` sin SET. Falla cerrado: s4, `cumple` pero `set role: 42501`.
- **Matiz:** hoy no hay vistas ni funciones así (s1), y la prueba de las `authz_*` cubre las
  suyas.
- **Arreglo:** la verificación es la que el procedimiento usa como compuerta. Conviene que
  cubra `relkind in ('r','v','m','f','p')` y toda SECURITY DEFINER de `risk` ejecutable por
  PUBLIC o por `risk_oidc` fuera de las tres, y que el punto de membresía exija `set_option`.

**6. [menor] La etapa C, que es retirar de verdad el permiso legacy, queda sin procedimiento
ejecutable.**

- **Dónde:** `T-0035-retiro-legado-risk.md:121-146`. El owner pidió no borrar la política
  todavía, y el documento lo respeta. Pero el punto (3) pedía «un procedimiento explícito para
  retirar los permisos legacy».
- **Lo que hay y lo que falta:** las etapas A y B sacan la política del alcance de la app, con
  observación y vuelta atrás claras. La C depende de una decisión todavía no tomada (rol de la
  CLI) y no tiene pasos, comprobaciones ni observación propia. Mientras tanto, `risk_app` sigue
  con LOGIN y SELECT/INSERT sobre todo `risk` para la CLI, que es justamente la «vía permanente»
  que la decisión quería evitar.
- **Arreglo:** registrar la decisión de la CLI como pendiente con fecha (en la tabla de la
  evidencia aparece sólo de pasada) y darle a la etapa C los mismos elementos que a la A: qué
  observar y cuánto tiempo.
- **Detalle menor:** el criterio «ninguna conexión de la app como `risk_app`» se comprueba con
  una foto de `pg_stat_activity` una vez por semana (`:79-83`, `:97-98`), y eso no prueba
  ausencia durante el período. Los logs del pooler o `log_connections` lo harían.

### Noted

- **La admisión no protege contra la credencial de `risk_oidc` comprometida, sólo contra
  errores de la app.**
  - Lo que puede hacer quien la tiene: enumerar invitaciones por email (persona, rol,
    vencimiento) y vincular un `sub` propio a una invitación pendiente (s2, pasos 2 y 3). Pero
    también puede declararse cualquier principal (4b).
  - Es el modelo de D-0022: la app fija el principal. Igual mejora mucho respecto de antes,
    cuando `risk_app` leía todo. Lo dejo anotado para que nadie lea «vuelve a comprobar» como
    una defensa contra una credencial filtrada.
  - La enumeración es una a una: `'%'` y `''` devuelven 0 filas, porque las funciones usan `=`.
- **Las pruebas corren con `session_user` superusuario y `set local role risk_oidc`.** Los
  permisos se evalúan contra `current_user`, así que la prueba es válida para «privilegios
  heredados». Pero el `set local role risk_persona` de `conPrincipal` pasaría aunque
  `risk_oidc` no fuera miembro: eso sólo lo cubre el chequeo de catálogo
  (`camino-oidc…:73`). En la sesión real (s2) el camino funciona.
- **El chequeo de conexión de `ingresar`/`conPrincipal` no se puede eludir de un modo que
  importe.** Compara `current_user`. Una cadena con `options=-c role=risk_oidc` lo pasaría,
  pero entonces corre con los privilegios de `risk_oidc`, y el código no hace `reset role` (lo
  revisé con `grep`: sólo hay los dos `set local role` de `identidad.ts:224,232`). M1 muestra
  que la prueba falla sin el chequeo.
- **`rol-oidc.sql` en Supabase no lo pude probar con un administrador no superusuario.** Por
  lectura:
  - `alter role`, `\password` y los `grant` necesitan ADMIN sobre `risk_oidc` y `risk_persona`.
    `postgres` lo tiene si fue quien corrió las migraciones, porque en PG16+ quien crea un rol
    recibe ADMIN.
  - En PG16+, `revoke %I from risk_oidc` sólo saca las membresías otorgadas por el rol actual.
    Una otorgada por otro (por ejemplo `supabase_admin`) queda con un WARNING, pero
    `verificar-oidc` la detecta (s4, `pg_monitor`).
  - Es idempotente en local (prueba del PR y M4).
- **`legacy` no cambia en lo que observé.** Sigue con `RISK_DATABASE_URL` y `risk_app`. La
  prueba «en legacy, con todo lo anterior cargado, Risk OS se comporta como antes» no se
  modificó y pasa. Hay una diferencia mínima: `cookiesDeSalida` (logout) ahora depende de
  `RISK_OIDC_DATABASE_URL`, así que en `legacy` con variables de Google sin esa ya no borra una
  cookie de Google que en `legacy` no existe.
- **Las pruebas existentes modificadas lo están por una razón visible.**
  `acceso.integration.test.ts` y `autorizacion.integration.test.ts` envuelven las llamadas en
  `set local role risk_oidc`, sin cambiar aserciones. La prueba de `rol-app.sql` invierte su
  aserción a propósito: antes «miembro de `risk_persona`», ahora «sin membresías». `deny.test.ts`
  agrega una prueba. Las mutaciones M1 a M5 fallan donde deben.
- **El chequeo de `verificacion.ts` ya no exime a `risk_persona`.** Si en producción se hubiera
  corrido el `rol-app.sql` viejo, `db:verificar` va a fallar hasta que se corra el nuevo. Es lo
  esperado, y §2 del procedimiento lo ordena así.
- **Entorno:** Postgres 16 y Node 22, frente a 17 y 24 del repo y de CI. No veo nada en el diff
  que dependa de la versión más allá de la semántica de membresías de PG16+, que vale igual en
  17.

### Dismissed

- **«Queda una ruta de la app en `oidc` que usa `risk_app` o lee sin `risk_persona`».**
  Descartado.
  - Los únicos llamadores de `ingresar`/`conPrincipal` son `apps/risk/src/lib/acceso.ts`
    (`grep`).
  - En `oidc`, `database()` abre sólo `RISK_OIDC_DATABASE_URL` (M3 cae sin eso).
  - `guard`, `pagina` y `entre-contextos` pasan por `correrComo`.
  - Lo único que se escribe fuera de `conPrincipal` son inserts de rechazo sin actor, y la
    política los acota.
  - Con `risk_oidc` real, leer cualquier tabla da 42501 (s2, paso 1, y la prueba con filas
    cargadas).
  - No hay políticas para PUBLIC, defaults de privilegios, vistas, secuencias ni SECURITY
    DEFINER de PUBLIC alcanzables (s1). `risk_persona` no es miembro de nada.
- **«Las `admision_*` permiten escribir eventos falsos de éxito o vincular sin invitación».**
  Descartado en la base: no se pueden vincular una invitación ajena, vencida, consumida o con
  otro email; tampoco se puede entrar sin credencial o con la de otro, ni con baja. La prueba
  `camino-oidc…:168-209` lo cubre, y la política impide que `risk_oidc` escriba un `ok` directo
  (`:127`). Lo que sí queda está en los hallazgos 2 y 3, y en el primer Noted.
- **«La reversa no vuelve al estado anterior».** Descartado salvo el hallazgo 4. Quita la
  política, el grant, las funciones y el USAGE, y la 0009 reaplicada deja un catálogo idéntico
  (s3).
- **«Las pruebas no fallarían ante la regresión que dicen cubrir».** Descartado con M1 a M5:
  cada mutación hace fallar la prueba correspondiente.
- **«`rol-app.sql` dejó de ser idempotente o cambió permisos de `legacy`».** Descartado. Sólo
  quita la excepción de `risk_persona`; su prueba la otorga antes y comprueba que se la saca.
  `rol-app.integration.test.ts` no cambió y pasa.
- **«El cambio toca producción o borra la política».** Descartado. No hay pasos ejecutados, y el
  documento dice que nada está autorizado (`:3-5`). `legado_risk_app` sigue en todas las tablas
  (`camino-oidc…:113-115`).

## Contraste con `ops/evidence/T-0035.md` (leído al final)

- **Coincide:**
  - 323/323 en Broker OS y 142/142 en `deny.test.ts`.
  - 13 pruebas en `camino-oidc` (las mías: 11 + 2 con M1).
  - Las mutaciones que reproduje dan el mismo resultado: chequeo de conexión, `buscarCredencial`
    leyendo tablas y `SinPermiso` con la conexión.
  - La desviación de entorno (Postgres 16) está declarada igual.
- **No coincide del todo:** la evidencia dice `# tests 820 / # pass 820` en Risk; yo obtuve
  **819/819** con el mismo comando y el mismo HEAD. No busqué la diferencia; puede ser una
  corrida anterior a un ajuste.
- **No reproduje:**
  - «Con la 0009 revertida fallan 42 de 47»: no bajé la 0009 en la base compartida.
  - Tres mutaciones de catálogo (grants y política para `risk_oidc`): son cambios de rol en el
    clúster compartido.
  - `check-agent-run` y `check-task-contract`: no estaban en mi lista.
- **La evidencia no menciona:**
  - La restauración de §8 con `--no-privileges` (hallazgo 1). La evidencia presenta
    `verificar-oidc` como suficiente.
  - Las columnas `id`/`ocurrido_en` (2).
  - Que el email que «vuelve a comprobar» la base es el de la propia invitación (3).
  - El estado que deja la reversa si `drop role` falla (4).
- **La tabla de pendientes** marca `legado_risk_app` como «hecho en código», con la ejecución
  sin autorizar. Es correcto para las etapas A y B. La C queda abierta y depende de una decisión
  sin fecha (hallazgo 6).

## Conclusión

Un *Act on*. El cambio cumple lo central de lo que pidió el owner:
- En `oidc`, la app se conecta con un rol que no lee ninguna tabla, no pasa por
  `legado_risk_app` y no lo puede alcanzar.
- Toda la suite `oidc` corre ahora con esa conexión.
- Las pruebas fallan ante las regresiones que dicen cubrir.
- `legacy` sigue igual y la política no se tocó.

El problema está en la operación. Después de una restauración hecha como dice §8, que este PR
amplía, las funciones de admisión quedan abiertas a PUBLIC y el camino `oidc` roto, mientras la
verificación que el procedimiento usa como compuerta dice «cumple» (hallazgo 1). Es corto de
arreglar (un `revoke … from public` y dos puntos más en `verificar-oidc`), y conviene hacerlo en
este PR, antes de que nadie prepare la fase 4.

Los *Consider* son endurecimiento:
- columnas de la auditoría;
- el email que la base no compara de verdad;
- la reversa cuando `drop role` falla;
- los puntos ciegos de la verificación;
- la etapa C sin procedimiento propio.
