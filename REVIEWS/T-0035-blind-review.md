# T-0035: revisión ciega retrospectiva de la fase 0 (R-33, D-0048, D-0052)

- **Base revisada:** worktree aislado en HEAD `9451e67` («T-0035: material ciego y personas en
  la base de Risk OS (revisión del owner)», rama `task/T-0035-pr10-correcciones-risk`, PR #112
  sin mergear), sobre `df6f57b` (merge de #111). El diff del paquete (`diff.patch`, 13,4k
  líneas, 154 archivos) va de `d256838` (antes del primer PR de código de T-0035) a `9451e67`,
  tests incluidos y sin evidencias ni tareas: migraciones `0007`–`0010` de Broker OS, `0005` de
  Communication OS, `0006`–`0007` de Risk OS (con sus reversas), el paquete nuevo
  `packages/identidad`, los guards y helpers de acceso de `apps/web`, `apps/communication` y
  `apps/risk`, la administración de accesos por CLI de los tres contextos, `ADR-0078`,
  `DOMAIN.md`, `decisions.yaml`, la matriz `docs/migration/T-0035-matriz-de-permisos.md` y el
  plan de migración.
- **Contexto de la revisión:** retrospectiva. #103 a #111 ya están en `main` sin la revisión
  previa al merge que exige D-0052; #112 no. Los hallazgos valen para la fase 0 entera y, en lo
  que toca a Risk OS, para decidir el merge de #112.
- **Contrato:** el de `main` (`contrato-desde-main.md`).
- **Leído por mi cuenta, en este orden:** el contrato; `ENGINEERING_RULES.md` R-33 (§9);
  `REVIEWS/T-0032-blind-review.md` como modelo de formato; después de correr la verificación:
  las migraciones de Risk OS (`0001` columnas, `0004` funciones de trigger, `0006`, `0007` y
  su reversa), `contexts/risk/src/persistence/identidad.ts`, `domain/permisos.ts`,
  `application/accesos.ts`, los diffs de `application/actualizacion.ts` y `vistas.ts`,
  `apps/risk/src/lib/{acceso,pagina,guard,modo,entre-contextos}.ts`,
  `packages/identidad/src/{sesion,token}.ts`, `apps/communication/src/lib/{acceso,guard,
  entre-contextos}.ts` y el diff de `reply.ts`/`handlers.ts`, la migración `0005` de
  Communication OS, las `0007`–`0010` de Broker OS, `packages/api/src/acceso/datos.ts` y los
  diffs de `apps/web` y `packages/api/src/session`; en `decisions.yaml`, D-0022, D-0027,
  D-0052, D-0069, D-0072 y D-0077; `DECISIONS/0078-asignacion-de-clientes.md`; la matriz de
  permisos y la fase 4 del plan de migración. `ops/evidence/T-0035.md` lo leí **al final**
  (23:13 UTC), después de cerrar las sondas.
- **Orden:** corrí `pnpm check` (dos veces: sin y con `DATABASE_URL`) y las tres suites con
  base antes de leer el diff; después leí el diff contra el contrato y probé hipótesis contra
  Postgres; recién entonces leí la evidencia.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien implementó.
- **Efectos en el entorno:** ninguno persistente. Las sondas corrieron en `delcampo_risk_test`
  con el helper `conEscenario` del propio repositorio, dentro de una transacción revertida.
  El archivo de sondas se creó en el worktree para poder importar los helpers, se corrió y se
  movió fuera (`REVIEWS/T-0035/sonda-revision.integration.test.ts.txt`);
  `git status` del worktree queda limpio. No toqué el repositorio principal, ni hice commits,
  push ni publicaciones. A mitad de la revisión el Postgres local se detuvo (ECONNREFUSED) y lo
  levanté con `service postgresql start`.

## Verificación ejecutada antes de leer el diff

Entorno: Node 22.23.4 (el repo pide ≥ 24: `pnpm` avisa «Unsupported engine»), Postgres
16.15 en `localhost:5432` (el repo fija 17 en `.postgres-version`), `pnpm install
--frozen-lockfile --offline` sin cambios.

### 1. `pnpm check` (sin `DATABASE_URL`)

```text
✓ 77 decisiones, 42 ADRs, 37 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
...
# tests 1277
# suites 189
# pass 693
# fail 39
# cancelled 545
[ELIFECYCLE] Command failed with exit code 1.
```

Todas las fallas son de entorno: `error: 'password authentication failed for user "root"'`
(la URL por defecto no lleva la contraseña local). No dicen nada del código.

### 2. `DATABASE_URL=postgres://root:local-dev-only@localhost:5432/delcampo_test pnpm check`

```text
✓ 77 decisiones, 42 ADRs, 37 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
# tests 177 · pass 177 · fail 0 · cancelled 0          (scripts/tests)
$ tsc --noEmit && tsc --noEmit -p apps/web && tsc --noEmit -p apps/communication && tsc --noEmit -p apps/risk
$ eslint .
# tests 1427
# pass 1423
# fail 0
# cancelled 4
not ok 81 - cliente de envío de Cloud API
exit=1
```

`typecheck` y `lint` pasan sin salida. Los 4 cancelados son
`contexts/communication/src/integration/cloud-api.contract.test.ts:31` con
`'Promise resolution is still pending but the event loop has already resolved'`: el mismo
caso que ya aparecía en la revisión de T-0032, ajeno a este diff y atribuible a Node 22.

### 3. Suites con base, por contexto

`R="node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 --test-force-exit"`,
`DATABASE_URL=postgres://root:local-dev-only@localhost:5432/delcampo_test`.

```text
$ $R "packages/**/*.test.ts" "apps/web/src/**/*.test.ts"
# tests 319 · suites 66 · pass 319 · fail 0 · cancelled 0
exit=0

$ $R "apps/risk/src/**/*.test.ts" "contexts/risk/src/**/*.test.ts"
# tests 813 · suites 94 · pass 813 · fail 0 · cancelled 0
exit=0

$ $R "apps/communication/src/**/*.test.ts" "contexts/communication/src/**/*.test.ts"
# tests 272 · suites 65 · pass 268 · fail 0 · cancelled 4
not ok 62 - cliente de envío de Cloud API
exit=1
```

### Comprobaciones humanas del contrato

Las de la fase 2 en adelante (ensayo real de vuelta atrás, invitaciones reales, retiro de la
credencial compartida) dependen del owner y la rama no dice lo contrario. La «revisión ciega
del diff (D-0052)» es este reporte.

## Hallazgos

Severidad: **bloqueante** (no activar `oidc` en el contexto afectado sin corregirlo),
**importante** (corregir antes de la fase que lo activa), **menor**. En términos de R-33,
bloqueante e importante son *Act on*; menor es *Consider*.

### Act on

**1. [importante] En Risk OS, quien abrió una revisión pendiente la cierra «sin cambio»: la
regla de que nadie aprueba su propio trabajo no cubre `cerrarSinCambio`, ni en la aplicación
ni en la base.** *(comprobado con sonda)*

- Dónde: `contexts/risk/src/application/actualizacion.ts:548-560` (`cerrarSinCambio` llama a
  `exigirPermiso('riesgo.revisar')` y a `exigirResultados`, pero no a `exigirAjeno`) y
  `contexts/risk/migrations/0006_identidad_y_autorizacion.sql:395-398`
  (`cierre_revision_cerrar` sólo compara autor cuando `evaluacion_id` no es nulo, y un cierre
  sin cambio no lleva evaluación).
- Qué dice la regla: la cabecera de la propia `0006` (líneas 36-37: «Revisar y aceptar
  evaluaciones, acciones y coberturas, y cerrar revisiones: los tres roles, nunca sobre lo que
  la misma persona escribió (tampoco un Administrador)»), `domain/permisos.ts:41` («y cerrar
  revisiones pendientes: lo ajeno») y el contrato («nadie aprueba su propio trabajo, tampoco
  un Administrador, probado en las dos capas»).
- Escenario: una Operadora carga una novedad `informacion_nueva` que abre una revisión
  pendiente sobre un riesgo; acto seguido la cierra ella misma «sin cambio» con un fundamento
  cualquiera. La revisión, que existe para que otra persona juzgue si la novedad cambia la
  evaluación, queda cerrada sin que nadie más la haya visto. Un Administrador puede hacer lo
  mismo.
- Sonda (`REVIEWS/T-0035/sonda-revision.integration.test.ts.txt`, S1 y S1b), como `risk_persona` con el
  principal de la Operadora:

  ```text
  # SONDA S1 app (operador cierra sin cambio su propia revisión): "ok"
  # SONDA S1 fila: {"mismaPersona":true}
  # SONDA S1b sqlstate: "sin error"
  ```

  S1 usa el caso de uso; S1b, el `insert` directo en `risk.cierre_revision` con
  `resultado = 'sin_cambio'`. Las dos capas lo aceptan.
- Por qué los tests no lo ven: «nadie aprueba su propio trabajo» en
  `autorizacion.integration.test.ts:296-339` cubre `revisar` y `cerrarConReevaluacion`, y en
  la base sólo el cierre **con** la reevaluación propia.
- Arreglo: en la aplicación, rechazar con `TRABAJO_PROPIO` cuando `revision_pendiente.
  autor_persona_id` es quien cierra; en la base, agregar a `cierre_revision_cerrar` la misma
  condición sobre el autor de la revisión (una `authz_autor_revision(rev)` SECURITY DEFINER
  como las otras, o un `exists` con el RLS de quien cierra). Falta además una decisión del
  owner sobre un caso vecino: quien abrió la revisión, ¿puede cerrarla con la reevaluación
  **de otra persona** (`cerrarConReevaluacion`)? Hoy puede. No lo clasifico como defecto
  porque la reevaluación sí es ajena, pero conviene que la matriz lo diga.

### Consider

**2. [menor] Un Revisor abre los resultados de una organización con un orden previo vacío
escrito por SQL: la base exige que exista un `orden_previo`, no que cubra el material ciego.**
*(comprobado con sonda)*

- Dónde: `0006_identidad_y_autorizacion.sql:220-226` (`authz_ve_resultados` mira sólo
  `exists (select 1 from risk.orden_previo …)`) y `:411-413` (`orden_previo_registrar` no
  exige ítems). La aplicación sí lo exige
  (`application/actualizacion.ts:783`, «el orden previo cubre todos los de la empresa»).
- Sonda S3, como el Revisor asignado y sin orden previo:

  ```text
  # SONDA S3 evaluaciones visibles tras orden previo sin items: 10
  ```

- Por qué es *Consider* y no *Act on*: hace falta ejecutar SQL como `risk_persona`, y la app
  no tiene ese camino. Pero la `0006` (línea 219) dice que el orden previo «lo exige la base,
  no sólo la interfaz (decisión del owner, A8a)», y D-0022 pone las restricciones críticas en
  las dos capas. Arreglo posible: que `authz_ve_resultados` exija que el orden previo tenga
  tantos ítems como riesgos tenía la organización al registrarlo, o un trigger diferido que
  rechace un `orden_previo` sin sus ítems al cerrar la transacción.

**3. [menor] Las funciones `authz_*` de Risk OS son SECURITY DEFINER, aceptan argumentos
arbitrarios y `risk_persona` las puede llamar directamente: devuelven datos que RLS le
oculta.** *(comprobado con sonda)*

- Dónde: `0006_identidad_y_autorizacion.sql:164-167` (`authz_rol_de`), `:234-249`
  (`authz_riesgo_de`, `authz_autor_de`), `:280-288` (`authz_autor_reordenamiento`,
  `authz_revisor_orden_previo`), con `grant execute … to risk_persona` en `:301-302`.
- Sonda S2, como el Revisor antes de su orden previo:

  ```text
  # SONDA S2 como Revisor sin orden previo: {"ve_eval_ajena_por_rls":0,
    "riesgo_de_eval_ajena":"RSK-01M3QSRT00F065SXMVH9HHW58C",
    "autor_de_eval_ciega_no_nulo":false,
    "riesgo_de_cobertura_ciega":"RSK-01M3QSRT00NDS8K3ZZ1MQZ9A32",
    "rol_de_admin":"ADMINISTRADOR","rol_de_operadora2":"OPERADOR"}
  ```

  RLS no le entrega la evaluación de otra organización (0 filas), pero `authz_riesgo_de` le
  dice a qué riesgo pertenece; `authz_rol_de` revela el rol de cualquier persona; con un id de
  evaluación, `authz_autor_de` revelaría su autor. El daño concreto es bajo (ids opacos y
  roles, no contenido evaluativo), y explotarlo exige SQL arbitrario como `risk_persona`.
- Es una forma de la pregunta del encargo («funciones SECURITY DEFINER que filtren datos»):
  la corrección de `persona_leer` en `0007` cierra la tabla, pero estas funciones son otra
  puerta a la identidad y al rol de las personas. Arreglo: que las de argumento arbitrario
  devuelvan `null` cuando quien llama no ve el objeto (o el booleano final, sin exponer el
  dato intermedio), o separarlas en funciones sin `EXECUTE` para `risk_persona` y usadas sólo
  por las políticas a través de otra definer. Broker OS y Communication OS no tienen este
  patrón con argumentos que devuelvan datos (`authz.tomador_vigente(poliza)` devuelve un
  `party_id`: el mismo comentario aplica, en menor medida).

**4. [menor] En `oidc`, la base de Risk OS sigue dejando todo abierto a `risk_app`: la
política `legado_risk_app` no tiene un paso de retiro en el plan.**

- Dónde: `0006_identidad_y_autorizacion.sql:321` (`for all to risk_app using (true) with
  check (true)` en cada tabla) y `docs/migration/T-0035-identidad-comun.md:119-123` (fase 4:
  `risk_app` «sigue viendo lo mismo por la política `legado_risk_app`»), sin paso posterior
  que la quite.
- Escenario: activado `oidc`, cualquier consulta que un cambio futuro haga con la conexión de
  la app fuera de `conPrincipal` (o con `reset role` dentro de una) ve y escribe todo, y la
  base no lo impide. Hoy la defensa es `afirmarRestringida` y la estructura de `withSesion`/
  `datos`, que son de la aplicación. La condición 5 de D-0022 («toda tabla de datos con RLS
  habilitado y sus políticas») queda formalmente cumplida pero sin efecto para el rol que de
  verdad se conecta. Arreglo: un paso en la fase 5 que retire `legado_risk_app` (dejando a
  `risk_app` sólo con la auditoría de negativas sin actor) y una verificación en
  `db:verificar` que lo exija con `AUTH_MODE=oidc`.

**5. [menor] El destino acepta un token entre contextos sin registro de `jti`.**

- Dónde: `packages/identidad/src/token.ts:229-230,306` (`registroJti: RegistroJti | null`;
  con `null` no se comprueba la reutilización) y `apps/risk/src/lib/entre-contextos.ts:34-48`,
  `apps/communication/src/lib/entre-contextos.ts:86-115`, que no exigen que venga uno. La
  única implementación es en memoria, que en Vercel no se comparte entre instancias.
- Hoy no hay llamadas reales (lo comprueban los `deny.test.ts`) y la evidencia lo deja como
  pendiente. Lo anoto para que la primera llamada real no herede el `null` por omisión:
  `admitirLlamada` debería rechazar `registroJti === null` y el registro tendría que vivir en
  la base de cada destino.

**6. [menor] La auditoría acepta eventos arbitrarios a nombre de quien actúa.**
*(comprobado con sonda)*

- Dónde: `0006_identidad_y_autorizacion.sql:440-441` (y sus equivalentes en
  `communication/migrations/0005…:235-236` y `packages/db/migrations/0007…:271-272`): la
  política sólo exige `origen = 'app'` y que el actor sea el principal.
- Sonda S4: la Operadora inserta `persona.dar_de_baja / persona / <id del admin> / ok` a su
  nombre → `"sin error"`. Un evento falso con resultado `ok` sobre una acción administrativa
  que sólo hace la CLI ensucia el registro que el contrato quiere usar como traza. Necesita
  SQL como `risk_persona`; un `check` que restrinja `accion` a las de la app (y `persona.*`
  sólo a `origen = 'cli'`) lo cerraría barato.

### Noted

- **Conflicto de redacción entre el contrato y ADR-0078.** El contrato dice «Ningún rol tiene
  acceso universal a empresas»; ADR-0078 §6 (aprobado por el owner, D-0027) dice «El
  Administrador ve todo sin asignación», y así lo implementan `authz.es_admin()` en Broker OS
  y `authz_es_admin()` en Risk OS. La segunda mitad de la frase del contrato habla del
  Operador, y la matriz lo aclara en §1 («Nadie tiene acceso universal por fuera del
  Administrador»). No elijo: la fuente más reciente y específica es el ADR, pero conviene que
  el owner ajuste el texto del contrato para que la casilla no se tilde contra su letra.
- **Material ciego después de `0007`.** La cabecera de `0006` (líneas 30-33) decía que el
  Revisor ve antes de su orden previo «los riesgos, sus acciones y sus coberturas, sin
  evaluar»; `0007` lo reduce a `riesgo` y `miembro_escenario`. Comprobé que la corrección del
  owner es completa en lectura directa: sonda S5, como el Revisor sin orden previo, ve 0 filas
  en `orden_previo`, `orden_previo_item`, `reordenamiento`, `reordenamiento_vigente` y
  `cierre_revision`; sólo su propia `persona` y su propio `registro_acceso`. Las seis tablas
  que `0007` mueve a `authz_ve_resultados` dan 0 en el test del repositorio, que además exige
  filas sintéticas en cada una. No hay vistas ni vistas materializadas en el esquema `risk`
  (consulta a `pg_class`), y las funciones no `authz_*` del esquema son de trigger y SECURITY
  INVOKER. `riesgo` no tiene columnas evaluativas (`0001:100-129`).
- **`persona_leer` (0007).** Las subconsultas corren con el RLS de quien consulta, así que el
  nombre de una persona aparece sólo si quien consulta ve una fila suya. No encontré otra
  tabla legible que nombre personas fuera de la lista (las de identidad y `registro_acceso`
  sólo muestran las filas propias, salvo al Administrador). Las escrituras no permiten sondear
  ids ajenos: toda política `with check` que nombra una persona exige que sea el principal, y
  en PostgreSQL el `WITH CHECK` de RLS se evalúa antes que las FK. La vía lateral es la del
  hallazgo 3 (rol, no nombre).
- **Las funciones de trigger de Risk OS corren con el RLS de quien escribe.** Lo revisé porque
  una comprobación de ausencia que no ve filas pasaría en falso. Hoy no ocurre: quien escribe
  en una organización la ve entera (`authz_ve_resultados`), y `orden_previo_antes_de_
  resultados` mira el `registro_acceso` del propio Revisor, que es visible. Si alguna política
  de lectura se vuelve más estrecha que la de escritura, estos triggers dejan de valer.
- **Broker OS: membresías de ex miembros.** `organization_membership_leer` (0009:107-109)
  filtra por empresa asignada pero no por vigencia: el Operador ve las filas de pertenencia
  vencidas (sólo `person_party_id`, sin nombre: `party` y la vista sí filtran por vigencia).
  ADR-0078 dice «Un ex miembro deja de aparecer»; el dato expuesto es un uuid, por eso no es
  *Consider*.
- **Broker OS: `staging_import_batch_leer using (true)`** (0010:169-170) vale también para un
  `broker_app` sin principal admitido, a diferencia de `insurer_leer`. La evidencia ya lo
  deja pendiente («confirmar la política de lectura de `staging_import_batch.notes`»).
- **Communication OS: una baja durante un envío.** `outbound_attempt_cerrar` exige
  `created_by = authz_usuario()`; si la persona pierde el acceso entre la fase que inserta el
  intento y la que lo cierra, el envío a Cloud API pudo salir y el intento queda sin cerrar.
  Lo cubre el reproceso existente, si lo cubre; no lo probé.
- **La cabecera de la `0007` de Broker OS anticipa que Supabase `anon`/`authenticated`
  pierden acceso.** Es un cambio de comportamiento en producción, declarado como inocuo
  porque la app no usa el Data API. No lo pude verificar desde acá.

### Dismissed

- **«El principal se puede falsificar con `set_config('authz.persona_id', …)`».** Cierto
  para quien ejecuta SQL como `risk_persona`/`broker_app`/`communication_app`, pero es el
  modelo que D-0022 aprueba (principal local a la transacción, fijado por un único helper), y
  `authz_persona()` exige además credencial externa y rol vigente. No es un defecto de este
  diff.
- **«`afirmarRestringida` se puede eludir con `reset role` dentro del callback».** Mismo
  razonamiento: requiere código de la app que lo haga; la estructura de `withSesion`,
  `datos` y `conDatos` sólo entrega la transacción restringida. Queda como motivación del
  hallazgo 4.
- **«Las suites de `pnpm check` fallan».** La primera corrida falla por credenciales de la
  base local; con `DATABASE_URL` sólo quedan los 4 cancelados de `cloud-api.contract.test.ts`,
  preexistentes y de Node 22.
- **Recuento distinto de tests de Risk OS entre la evidencia (802) y mi corrida (813).** La
  evidencia es de la rama de #111 más la `0007` probada aparte; #112 agrega pruebas. Mi
  corrida es sobre `9451e67` y está toda en verde.

## Contraste con `ops/evidence/T-0035.md` (leído al final)

- Coincide con lo que comprobé: `check-docs` y `check-agent-run`, `scripts/tests` 177/177,
  Broker OS 319/319, los cancelados de Cloud API, la corrección de `persona_leer` y del
  material ciego, y que la tarea no está terminada.
- Communication OS: la evidencia anota `fail 1` además de los 4 cancelados; yo obtuve
  `fail 0, cancelled 4`. Probablemente el archivo padre contado como falla en su corrida.
  Irrelevante para el resultado.
- **No coincide**: «Nadie aprueba su propio trabajo, tampoco un Administrador, en las dos
  capas». Es cierto para aceptar evaluaciones, acciones y coberturas y para cerrar con la
  reevaluación propia; es falso para el cierre sin cambio de la revisión propia (hallazgo 1).
- «Token entre contextos… reutilización de `jti`» está probado con el registro en memoria; el
  destino acepta además operar sin registro (hallazgo 5). La evidencia lo deja como pendiente
  de la primera llamada real, que es correcto, pero no dice que hoy `null` pasa.
- La evidencia pide, «antes de la fase 4 (Risk OS): validar las correcciones de `0007` en la
  revisión retrospectiva». Resultado: las correcciones de `0007` son completas para las
  lecturas directas de tablas (Noted), con dos salvedades fuera de las tablas (hallazgos 2 y
  3) y el defecto nuevo del hallazgo 1, que no es de lectura.

## Conclusión

Un *Act on*: el cierre sin cambio de la revisión propia (hallazgo 1), en las dos capas de
Risk OS. Encaja en #112 o en un PR siguiente antes de la fase 4; no afecta a `legacy` ni a
producción hoy. Los *Consider* 2, 3 y 6 sólo se explotan con SQL arbitrario como el rol
restringido, y el 4 y el 5 son pasos que faltan en el plan antes de que `oidc` o la primera
llamada entre contextos entren en servicio.
