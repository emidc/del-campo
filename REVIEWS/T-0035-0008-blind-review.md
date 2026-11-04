# T-0035: revisión ciega del PR de la migración 0008 de Risk OS (R-33, D-0048, D-0052)

- **Base revisada:** worktree aislado en HEAD `5ea8aa5` («T-0035: la base de Risk OS cierra los
  tres caminos de SQL directo (0008)»), rama `task/T-0035-pr11-sql-directo-risk`. El diff del
  paquete (`diff.patch`, 263 líneas) va de `5152d88` a `5ea8aa5`, tests incluidos y sin
  evidencias, revisiones ni docs: `contexts/risk/migrations/0008_sql_directo.sql`, su reversa
  `migrations/down/0008_sql_directo.sql`, tres pruebas nuevas y una ampliada en
  `contexts/risk/src/application/autorizacion.integration.test.ts` y la lista de archivos de
  `persistence/migrations.integration.test.ts`.
- **Contrato:** el de `main` (`contrato-desde-main.md`).
- **Leído por mi cuenta, en este orden:** el contrato; `ENGINEERING_RULES.md` R-33 (§9);
  D-0048 en `decisions.yaml`; `REVIEWS/T-0035-blind-review.md` como modelo de formato y
  para el detalle de los puntos 2, 3 y 6. Después de correr la verificación: el diff; las
  migraciones `0004` (triggers del orden previo), `0006` y `0007` de Risk OS;
  `persistence/identidad.ts` (`auditar`, `conPrincipal`), `persistence/actualizacion.ts`
  (`ahora`, `ordenPrevioDe`, candado de `operar`), `persistence/importacion.ts` (candado),
  `application/actualizacion.ts` (`exigirResultados`, `registrarOrdenPrevio`,
  `objetosCiegos`), `application/vistas.ts`, `domain/permisos.ts`,
  `apps/risk/src/lib/{actualizar,acceso,entre-contextos}.ts`, la cabecera de
  `apps/risk/src/lib/acceso.integration.test.ts`; D-0022 en `decisions.yaml`; las menciones
  del orden previo en `SLICES/RO01.md` y `DOMAIN.md`. `ops/evidence/T-0035.md` lo leí **al
  final** (00:03 UTC del 2026-11-04), después de cerrar todas las sondas.
- **Orden:** suites con base, `typecheck`, `lint` y `pnpm check` antes de leer el diff;
  después el diff contra el contrato y sondas propias contra Postgres; recién entonces la
  evidencia.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien implementó.
- **Efectos en el entorno:** ninguno persistente. Borré `delcampo_risk_test` al empezar (tenía
  las ocho migraciones aplicadas a las 23:42, antes de esta revisión, y no hay checksum para
  saber si eran las de esta rama) y se recreó sola; la volví a borrar y recrear al comprobar
  la causalidad. Las sondas de la app corrieron en un archivo de prueba creado en el
  worktree con los helpers del repositorio, en transacciones revertidas, y se movió fuera
  (`sonda-0008.integration.test.ts.txt`). Las sondas de carrera y de la reversa corrieron en
  una base descartable `revision_0008_down`, que borré al terminar
  (`sondas-carrera-y-reversa.txt`). `git status` del worktree queda limpio. No toqué el
  repositorio principal ni hice commits, push ni publicaciones. Todos los datos de las
  sondas son sintéticos.

## Verificación ejecutada antes de leer el diff

Entorno: Node 22.23.4 (el repo pide ≥ 24: `pnpm` avisa «Unsupported engine»), Postgres 16.15
(el repo fija 17), `pnpm install --frozen-lockfile --offline` en el worktree.

### 1. Suites de Risk OS con base

```text
$ psql …/postgres -c "drop database delcampo_risk_test"
DROP DATABASE
$ DATABASE_URL=postgres://root:local-dev-only@localhost:5432/delcampo_test node --import ./scripts/guard-db-tests.mjs \
    --test --test-concurrency=1 --test-force-exit "contexts/risk/src/**/*.test.ts" "apps/risk/src/**/*.test.ts"
1..96
# tests 840
# suites 96
# pass 840
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 72314.435063
exit=0
```

### 2. `pnpm typecheck` y `pnpm lint`

```text
$ pnpm typecheck
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication && tsc --noEmit -p apps/risk
tc=0
$ pnpm lint
$ eslint .
lint=0
```

### 3. `DATABASE_URL=… pnpm check` (lo que pide `## Verification`)

```text
✓ 77 decisiones, 42 ADRs, 37 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
# tests 177 · pass 177 · fail 0 · cancelled 0          (scripts/tests)
    not ok 4 - 5xx, 2xx sin id, red caída y timeout quedan sin confirmar: pudo haber salido
    not ok 5 - valida la configuración y solo deja cambiar la URL base hacia localhost
    not ok 6 - el error de configuración no cita el token
    not ok 7 - la redacción saca wamids y números largos
not ok 81 - cliente de envío de Cloud API
# tests 1431
# pass 1427
# fail 0
# cancelled 4
[ELIFECYCLE] Command failed with exit code 1.
```

Los 4 cancelados son `cloud-api.contract.test.ts` de Communication OS, los mismos que la
revisión anterior atribuyó a Node 22; ajenos a este diff.

### 4. Reversa (sonda propia, `sondas-carrera-y-reversa.txt`)

Base vacía, `0001`–`0007` con `psql -1`, `pg_dump -s -n risk` y ACL de cada función del
esquema; `0008`; `down/0008`; volcado y ACL de nuevo.

```text
diff antes/despues:   (sólo las líneas \restrict / \unrestrict, que llevan un token aleatorio)
ACL antes vs después de down: sin diferencias
ACL antes vs con 0008:
< risk.authz_rol_de(text)|{root=X/root,risk_persona=X/root}
> risk.authz_rol_de(text)|{root=X/root}
< risk.authz_organizaciones_asignadas()|{root=X/root,risk_persona=X/root}
> risk.authz_organizaciones_asignadas()|{root=X/root}
< risk.authz_autor_de(text,text,text)|{root=X/root,risk_persona=X/root}
> risk.authz_autor_de(text,text,text)|{root=X/root}
```

La reversa deja el esquema igual que antes de `0008`, grants incluidos.

## Hallazgos

Severidad como en la revisión anterior: **bloqueante** (no activar `oidc` en Risk OS sin
corregirlo), **importante** (corregir antes de la fase que lo activa), **menor**. Bloqueante
e importante son *Act on*; menor es *Consider*.

### Act on

**1. [importante] Una importación que corre a la vez que el registro de un orden previo deja
al Revisor sin resultados de esa organización para siempre, y la app no se entera: le arma
la vista sin evaluaciones.** *(comprobado con sonda, con dos conexiones reales)*

- Dónde: `0008_sql_directo.sql:36` (`r.registrado_en <= o.registrado_en`) junto con
  `:45` (`registrado_en = pg_catalog.now()`). Los dos `registrado_en` son `now()`, la hora de
  **inicio** de cada transacción, no la de confirmación. Lo agravan tres cosas que ya
  existían: `orden_previo_item_en_su_registro` (`0004:212-223`: los ítems sólo entran en la
  transacción del registro), `orden_previo_uno_por_revisor_y_empresa` (uno por revisor y
  empresa) y que `registrarOrdenPrevio` toma el candado `('risk.actualizacion', org)`
  (`persistence/actualizacion.ts:25`) y la importación otro, global
  (`persistence/importacion.ts:25`): no se excluyen.
- Escenario: el owner corre una importación que agrega un riesgo a la organización. Mientras
  esa transacción sigue abierta, el Revisor registra su orden previo desde la app: lee el
  material ciego (el riesgo nuevo todavía no se ve), escribe orden e ítems y confirma. La
  importación confirma después. El riesgo nuevo tiene `registrado_en` anterior al del orden
  previo y no está en sus ítems: `authz_ve_resultados` pasa a `false` para siempre. No hay
  arreglo desde la app ni desde SQL: no se pueden agregar ítems en otra transacción, no se
  puede registrar otro orden previo, y las tablas son de sólo inserción (ni el dueño lo
  arregla sin desactivar triggers). Mientras tanto `exigirResultados`
  (`application/actualizacion.ts:117-122`) sólo mira que exista un orden previo
  (`ordenPrevioDe`), así que la app deja pasar y arma la vista con lo que RLS le deja ver:
  ninguna evaluación. Es justo lo que el comentario de `application/vistas.ts:9-12` dice que
  no tiene que pasar («la vista se armaría incompleta en vez de explicar por qué no se
  muestra»), y contradice el reparto de D-0022 (la app decide y explica; RLS filtra).
- Sonda C1 (`sondas-carrera-y-reversa.txt`), base descartable con `0008`:

  ```text
  importación:  begin; now() = 00:02:14.937; insert riesgo B; pg_sleep(3); commit
  Revisor (1 s después, como risk_persona): ve sólo A; inserta orden previo e ítem de A;
      ve_resultados_al_registrar = t; commit
  después:  B.registrado_en 00:02:14.937 < orden.registrado_en 00:02:15.937
      ve_resultados_despues = f
      ítem de B en otra transacción → ERROR: las posiciones de OPR-… van en la misma transacción que su registro
      otro orden previo → ERROR: duplicate key value violates unique constraint "orden_previo_uno_por_revisor_y_empresa"
  ```

  Y con la app (`sonda-0008.integration.test.ts.txt`, P1; la importación concurrente
  simulada con un `registrado_en` un segundo anterior):

  ```text
  # SONDA P1 evaluaciones del Revisor con orden previo completo: 10
  # SONDA P1 evaluaciones del Revisor después: 0
  # SONDA P1 authz_ve_resultados: false
  # SONDA P1 app exigirResultados: "pasa"
  # SONDA P1 app vistaLista: "vista armada"
  ```

- Por qué no lo ven los tests: la prueba nueva (`autorizacion.integration.test.ts:254`) corre
  todo en una transacción y simula «un riesgo que se carga después» con `now() + interval
  '1 hour'`; nunca prueba una importación que confirma después de empezar antes.
- Por qué *Act on* aunque sea raro: es un camino legítimo (no SQL directo), lo introduce este
  PR, el efecto es permanente y silencioso, y sólo aparece con `oidc` en Risk OS (fase 4),
  así que hoy no afecta producción.
- Arreglo posible, sin comparar instantes: sacar el corte por `registrado_en` de
  `authz_ve_resultados` (que vuelva a mirar sólo que exista el orden previo propio) y exigir
  la cobertura al **confirmar** el orden previo, con un constraint trigger
  `deferrable initially deferred` sobre `orden_previo` que, como dueño, rechace el registro
  si algún `riesgo`/`padre` de la organización ya confirmado no tiene ítem. Así la base exige
  lo mismo que la app, un riesgo confirmado después no cambia nada, y el hallazgo 2 también
  queda cerrado. Si se mantiene la forma actual, como mínimo `exigirResultados` tendría que
  usar el mismo predicado que la base (por ejemplo `select risk.authz_ve_resultados(org)`)
  para explicar en vez de armar una vista vacía, y hace falta un procedimiento del owner para
  destrabar a un Revisor.

### Consider

**2. [menor] Con una transacción abierta antes de una importación, el Revisor deja afuera
de su orden previo un riesgo que ya ve y abre igual los resultados.** *(comprobado con sonda)*

- Dónde: la misma comparación, `0008_sql_directo.sql:36`. El orden previo toma la hora de
  inicio de la transacción del Revisor, no la del registro.
- Sonda C2: el Revisor abre su transacción (`now()` 00:02:43.342), el owner importa D
  (00:02:44.353) y confirma; el Revisor ve C y D en `risk.riesgo`, registra el orden previo
  sólo con C y obtiene `ve_resultados_sin_ordenar_d = t`. La app lo habría rechazado
  («faltan 1 riesgos»), así que la cabecera exagera al decir que la base lo exige «como ya
  exige la aplicación».
- Necesita SQL directo como `risk_persona` y coincidir con una importación; por eso es
  *Consider*. El arreglo del hallazgo 1 (comprobar al confirmar) lo cierra también.

**3. [menor] `authz_riesgo_de` y los booleanos de visibilidad siguen diciéndole al Revisor,
antes de su orden previo, cosas del material que RLS le oculta; la prueba nueva sólo mira
otra organización.** *(comprobado con sonda)*

- Dónde: `0008_sql_directo.sql:53-62` filtra con `authz_ve_riesgo`, que es visibilidad de
  la organización y no de resultados. Desde `0007`, a un Revisor sin orden previo se le
  ocultan evaluaciones, acciones y coberturas, pero los riesgos no. Además siguen ejecutables
  por `risk_persona` `authz_ve_accion`, `authz_ve_resultados_accion` y
  `authz_ve_resultados_riesgo`, que sirven para saber si existe un id.
- Sonda P2, como el Revisor sin orden previo:

  ```text
  {"ve_trf_por_rls":0,"ve_acc_por_rls":0,
   "riesgo_de_trf_ciega":"RSK-01M3QSRT00NDS8K3ZZ1MQZ9A32","riesgo_de_acc_ciega":"RSK-01M3QSRT00G3735N1AS81YCQFC",
   "riesgo_de_eval_ciega":"RSK-01M3QSRT00NDS8K3ZZ1MQZ9A32","ve_res_acc":false,"ve_acc_existe":true,
   "ve_acc_inexistente":false,"no_es_propio":true}
  ```

  Es el mismo caso que la sonda S2 de la revisión anterior («riesgo_de_cobertura_ciega»): RLS
  no le muestra la cobertura, pero la función le dice a qué riesgo pertenece. El daño es bajo
  (hay que conocer un id opaco y lo que se aprende es un id de riesgo que ya ve) y requiere
  SQL directo.
- La prueba «las authz_* no le dicen a quien consulta lo que RLS le oculta»
  (`autorizacion.integration.test.ts:485`) promete más de lo que comprueba: para
  `authz_riesgo_de` sólo prueba una evaluación de **otra organización** como Operador.
- Arreglo: filtrar `authz_riesgo_de` con `authz_ve_resultados_riesgo` (las dos políticas que
  la usan, `revision_humana_leer` y `revision_humana_revisar`, ya exigen resultados, así que
  no cambian), agregar a la prueba el Revisor sin orden previo, y decidir si los booleanos
  `authz_ve_*` sobre ids arbitrarios también pasan a internos.

**4. [menor] La auditoría sigue aceptando de `risk_persona` eventos `riesgo.*` arbitrarios,
fuera de la matriz y sobre objetos que no ve, y sin actor si el principal no vale.**
*(comprobado con sonda)*

- Dónde: `0008_sql_directo.sql:84-87`. `accion like 'riesgo.%'` no es «sólo las de la matriz»:
  la matriz (`domain/permisos.ts:22-30`) tiene seis acciones, y la app escribe además
  `riesgo.${op}` (`apps/risk/src/lib/actualizar.ts:120`). `actor_persona_id is not distinct
  from authz_persona()` admite `null` cuando `authz_persona()` es `null`.
- Sonda P3:

  ```text
  # SONDA P3a Revisor: riesgo.revisar ok sobre evaluacion de otra organizacion: "sin error"
  # SONDA P3b Revisor: riesgo.importar ok (no es accion de la matriz): "sin error"
  # SONDA P3c Operador: actor null: "42501"
  # SONDA P3d risk_persona con principal dado de baja, actor null: {"principal":null,"riesgo":"sin error","persona":"42501"}
  ```

  Una persona dada de baja que todavía pueda ejecutar SQL como `risk_persona` escribe
  `riesgo.aceptar ok` anónimo. Ningún camino de la app necesita escribir con actor `null`
  como `risk_persona`: las negativas sin actor (`acceso.consultar`, `acceso.token`) van por
  la conexión de la app (`apps/risk/src/lib/acceso.ts:58-60`, `entre-contextos.ts:43-45`) y
  las de `SinPermiso` llevan actor.
- Lo que sí cierra: `persona.*` y `acceso.*` dan 42501 como `risk_persona`. Comprobé que no
  rompe caminos legítimos: la app escribe como `risk_persona` sólo `riesgo.*`
  (`actualizar.ts:80-89`, `acceso.ts:35-37`), `acceso.*` va por la conexión de la app y
  `persona.*` por la CLI con `origen = 'cli'` (`application/accesos.ts:137,181,196`); la
  suite de la app (`apps/risk/src/lib/acceso.integration.test.ts`) pasa.
- Arreglo barato: `actor_persona_id = (select risk.authz_persona())` (sin `null`). Si se
  quiere que el registro no admita afirmaciones falsas sobre objetos ajenos, el `id_objeto`
  tendría que ser visible para quien escribe, o la lista de acciones explícita. La prueba
  «sólo acepta … acciones de la matriz» (`:519`) tampoco prueba una acción `riesgo.*` fuera
  de la matriz.

### Noted

- **Las correcciones de las políticas que usan las funciones filtradas deciden lo mismo que
  antes.** `authz_autor_reordenamiento`, `authz_revisor_orden_previo` y
  `authz_autor_revision` ahora devuelven el id sólo si es el de quien consulta; las cuatro
  políticas que las usan comparan con `= authz_persona()` o `is distinct from
  authz_persona()`, y con `null` dan lo mismo que con el id ajeno (`null = x` es nulo,
  rechaza; `null is distinct from x` es verdadero, como antes). `authz_riesgo_de` filtrada
  entra en `authz_ve_resultados_riesgo(…)`, que con `null` ya daba `false`. Ninguna política
  usa directamente las tres funciones a las que se les quitó `EXECUTE` (consulta a
  `pg_policies`), ni el código TypeScript (búsqueda de `authz_` en `contexts/risk/src` y
  `apps/risk/src`).
- **No hay otras puertas definer.** En el esquema `risk` las únicas SECURITY DEFINER son las
  `authz_*`; el resto son triggers o `estado_vigente_accion`/`motivo_cierra`, SECURITY
  INVOKER. No hay vistas, vistas materializadas ni tablas foráneas. `risk_persona` no tiene
  `UPDATE` ni `DELETE` sobre ninguna tabla ni políticas de ese tipo; todas son de sólo
  inserción.
- **Orden previo por SQL: otras formas de abrir resultados.** Comprobé que no sirven los
  ítems de otro revisor (la cobertura se mide sobre los ítems del orden previo propio), ni
  ítems de otra organización (`orden_previo_item_riesgo_de_la_empresa`), ni agregar ítems
  después (trigger de `0004`). La base y la app coinciden en contar `riesgo` y `padre` y no
  `sub_riesgo` ni `escenario` (`objetosCiegos`, `application/actualizacion.ts:724-727`).
  `registrado_en = now()` rechaza también `statement_timestamp()` (sonda P5: 42501); la app
  usa el valor por defecto, así que no la afecta.
- **Costo.** `authz_ve_resultados` ahora recorre riesgos e ítems y se evalúa por fila en las
  políticas de lectura. Con las sintéticas (7 riesgos, 10 evaluaciones) no se nota: 66 ms
  Operador y 67 ms Revisor por `select count(*) from risk.evaluacion` (sonda P4). Con
  organizaciones grandes conviene medirlo; el arreglo del hallazgo 1 lo elimina.
- **Nombre de una prueba ampliada.** «cada authz_* es SECURITY DEFINER, con search_path vacío,
  y sólo risk_persona la ejecuta» (`:466`) ahora también comprueba que tres funciones **no**
  las ejecuta `risk_persona`. El cambio a una prueba existente está justificado por la
  migración, pero el nombre quedó viejo.
- **Datos de producción.** Si en producción hay órdenes previos registrados en `legacy`, la
  nueva `authz_ve_resultados` los juzga por cobertura al pasar a `oidc`. No lo pude verificar
  desde acá; es el mismo riesgo del hallazgo 1 aplicado a lo ya registrado, y conviene una
  consulta de control antes de la fase 4.

### Dismissed

- **«La reversa no deja el esquema como estaba».** Descartado con la sonda de la sección 4:
  `pg_dump -s` y las ACL de las funciones son idénticos antes de `0008` y después de
  `0008` + `down`.
- **«La nueva política de auditoría rompe la auditoría de negativas o la CLI».** Descartado:
  las negativas sin actor van por la conexión de la app (`risk_app`, política
  `legado_risk_app`, o el dueño en los tests), no por `risk_persona`; la CLI escribe como
  dueña con `origen = 'cli'`. Las suites de la app pasan (840/840).
- **«Exigir `registrado_en = now()` rompe el registro del orden previo por la app».**
  Descartado: `registrarOrdenPrevio` no escribe `registrado_en` y la columna tiene `now()`
  por defecto; las pruebas que registran por la app pasan.
- **«Los `pnpm check` en rojo».** Los 4 cancelados son de `cloud-api.contract.test.ts` de
  Communication OS, preexistentes y de Node 22; este diff no toca ese contexto.

## Contraste con `ops/evidence/T-0035.md` (leído al final)

- Coincide: 840/840 en las suites de Risk OS, la descripción de las tres pruebas nuevas y la
  ampliada, y la causalidad. La reproduje: con `0008` fuera del directorio y la base
  recreada, `autorizacion.integration.test.ts` da `# pass 17 # fail 4` con las mismas cuatro
  pruebas; con `0008`, `# pass 21 # fail 0`.
- La evidencia dice que un riesgo «cargado después no le quita lo que ya ve». Es cierto para
  un riesgo con `registrado_en` posterior; no para uno de una importación que empezó antes y
  confirmó después (hallazgo 1).
- La evidencia dice que `authz_riesgo_de` de una evaluación de otra organización da `null`.
  Es cierto, pero no cubre el caso de la revisión anterior, el del Revisor sin orden previo
  (hallazgo 3).
- No menciona que la política de auditoría sigue aceptando `riesgo.*` arbitrarios ni el actor
  `null` (hallazgo 4).

## Conclusión

Un *Act on*: la comparación por `registrado_en` de `authz_ve_resultados` puede dejar a un
Revisor sin resultados de forma permanente cuando una importación corre a la vez que su
orden previo, y la app no lo explica (hallazgo 1). No afecta `legacy` ni producción hoy;
hay que corregirlo antes de la fase 4. Una verificación de cobertura diferida al confirmar
lo cierra junto con el hallazgo 2. Los *Consider* 3 y 4 son restos de los puntos 3 y 6 que
sólo se aprovechan con SQL directo como `risk_persona`. La reversa es exacta y la nueva
política de auditoría no rompe caminos legítimos.
