# T-0035: revisión ciega del PR de negativas uniformes (R-33, D-0052)

- **Base revisada:** worktree aislado en HEAD `db43ce9` («T-0035: las negativas de acceso no
  revelan el motivo»), rama `task/T-0035-negativas-uniformes`, contra `origin/main` en
  `0a71c02`. 8 archivos, +509/−17: el arreglo en `packages/api/src/acceso/login.ts` y
  `apps/communication/src/lib/acceso.ts`; pruebas nuevas en
  `packages/api/src/acceso/login.integration.test.ts` y en los `acceso.integration.test.ts` de
  `apps/communication` y `apps/risk`; el detector `packages/identidad/src/pruebas/bancarios.ts`
  con su prueba; y `ops/evidence/T-0035.md`.
- **Contrato:** el de `main` (`contrato-desde-main.md`).
- **Objetivo del owner:** con `AUTH_MODE=oidc`, en Broker OS, Communication OS y Risk OS, una
  cuenta no invitada, una con credencial vinculada y dada de baja, una sin rol vigente y una sin
  credencial reciben la misma respuesta externa, en el login y con sesión abierta; el motivo,
  sólo en la auditoría (`acceso.consultar` o `acceso.ingresar`), `denied`, sin payload. Arreglo
  mínimo, sin cambiar qué se admite.
- **Leído por mi cuenta, en este orden:** `ENGINEERING_RULES.md` R-33 y
  `REVIEWS/T-0035-registro-jti-blind-review.md` como modelo; el contrato. Después de correr la
  verificación: el diff sin el hunk de la evidencia;
  `packages/api/src/acceso/{login,datos,base}.ts`, `packages/api/src/http.ts` (`guarded`,
  `deniedResponse`); `apps/web/src/app/api/auth/google/callback/route.ts`,
  `apps/web/src/app/login/page.tsx`, `apps/web/src/lib/sesion.ts` y el uso de `consultar` en
  las páginas; `apps/communication/src/lib/{acceso,guard,page-guard,entrada}.ts`;
  `apps/risk/src/lib/{acceso,entrada,pagina}.ts`; `contexts/risk/src/persistence/identidad.ts`
  y las funciones `admision_credencial`, `authz_persona` y `authz_rol` de las migraciones 0006
  y 0009 de Risk OS; la auditoría de `ingresar` en `contexts/communication/src/persistence/acceso.ts`.
  No hizo falta abrir `DOMAIN.md` ni `decisions.yaml`: el diff no toca entidades ni decisiones.
  `ops/evidence/T-0035.md` (el hunk del diff), **al final**, después de cerrar las sondas.
- **Orden:** `pnpm check` completo antes de leer el diff; después el diff contra el contrato y
  el objetivo, sondas propias y recién entonces la evidencia.
- **Reviewer:** subagente aislado, sin el transcript ni la justificación de quien implementó.
- **Efectos en el entorno:** datos sintéticos. La sonda de Broker OS corrió en una transacción
  revertida. Las corridas de `apps/communication` suman filas a su base de prueba, que por
  diseño no se revierte. Para la sonda P2 agregué una guarda temporal de dos líneas en los dos
  archivos del arreglo y la saqué después; `git status` muestra los archivos versionados sin
  cambios. **Queda un archivo sin versionar:**
  `packages/api/src/acceso/zz-sonda-revision.integration.test.ts` (sonda B1/B2). El hook de
  R-15 me bloqueó el `rm` porque el worktree está bajo `.claude/`, así que lo tiene que borrar
  quien integre; si queda, `pnpm test` lo levanta (pasa y revierte). Sin commits, push ni
  publicaciones. El informe lo escribió el subagente en su worktree; lo versionó quien
  implementó, con el texto sin cambios de contenido. La sonda quedó sólo en ese worktree, que
  no es parte de la rama del PR.

## Verificación ejecutada antes de leer el diff

Node v22.23.4, Postgres 16.15 local (CI usa Node 24 y Postgres 17),
`DATABASE_URL=postgres://postgres:postgres@localhost:5432/delcampo_test`.

```text
$ pnpm install --frozen-lockfile
Done in 950ms using pnpm v11.19.0
$ pnpm db:migrate
· 11 migración(es), ninguna pendiente
$ pnpm check   # check-docs && check-agent-run && scripts/tests && typecheck && lint && test
✓ 77 decisiones, 42 ADRs, 37 tareas, 0 aviso(s)
✓ AgentRun: 10 eventos; lifecycle, concurrencia y fallos verificados
# tests 177 · pass 177 · fail 0 · cancelled 0          (scripts/tests)
(typecheck y lint sin salida: pasaron, porque la suite siguiente corrió)
# tests 1488
# suites 237
# pass 1484
# fail 0
# cancelled 4
not ok 83 - cliente de envío de Cloud API     (4 subtests cancelledByParent:
  'Promise resolution is still pending but the event loop has already resolved')
[ELIFECYCLE] Command failed with exit code 1.
```

Los cuatro cancelados son de `contexts/communication/src/integration/cloud-api.contract.test.ts`.
El diff no toca `contexts/communication` (`git diff --quiet origin/main HEAD -- contexts/communication`
sale 0) y el archivo solo da lo mismo: `# pass 3`, `# cancelled 4`. Es el entorno (Node 22), no
el PR. Lo tomo como verde local, salvo ese archivo, y no puedo confirmar el CI con Node 24.

## Sondas

**P1: los cuatro casos a mano, en las tres apps, leyendo el código.** Cada callback arma la
respuesta sólo con lo que devuelve `admitirLogin` (`ResultadoLogin` en Broker OS, `boolean` en
Communication OS y Risk OS) y sale por el mismo `rechazo()` también ante cualquier excepción.
Con sesión abierta, `guarded` (Broker OS) y `withSession` / `withSesion` (Communication OS,
Risk OS) traducen cualquier `AccesoDenegado` o negativa de la base a una constante, sin leer el
motivo. Las páginas de Broker OS pasan todas por `consultar`, que redirige a la constante
`/login?motivo=NOT_ADMITTED`. Las de Communication OS no leen datos (`page-guard` mira sólo la
cookie, igual para los cuatro). Las de Risk OS devuelven `null` para todos. La página de login
de Broker OS elige el texto por `motivo`, y el motivo es siempre `NOT_ADMITTED`. En Risk OS,
`estadoDe` lleva «sin rol» a `BAJA` en el login, y `authz_persona` exige el mismo rol no nulo
en cada request: login y request coinciden, así que ahí no hacía falta código.

**P2: las pruebas nuevas detectan la fuga.** Con una guarda temporal que hacía que
`admitirLogin` devolviera «admitido» después de `ingresar`, es decir, el comportamiento de
`main`:

```text
$ SONDA_SIN_ARREGLO=1 node --import ./scripts/guard-db-tests.mjs --test --test-concurrency=1 \
    --test-name-pattern='negativas' packages/api/src/acceso/login.integration.test.ts \
    apps/communication/src/lib/acceso.integration.test.ts
    not ok 1 - al volver de Google, no invitada, de baja, sin rol y sin credencial reciben la misma redirección y ninguna sesión
    ok 2 - con la sesión ya abierta, sin credencial, de baja y sin rol reciben la misma respuesta que una cuenta no admitida
    not ok 1 - al volver de Google, no invitada, de baja, sin rol y sin credencial reciben el mismo NOT_ADMITTED y ninguna sesión
    ok 2 - con la sesión ya abierta, sin credencial, de baja y sin rol reciben la misma respuesta que una cuenta no admitida
# pass 2
# fail 2
```

Las pruebas del login fallan sin el arreglo. Las de sesión abierta pasan también sin él: la
uniformidad con sesión abierta ya estaba en `main`, y esas pruebas quedan como regresión.

**B1/B2: la auditoría completa de cada negativa en Broker OS** (sonda en una transacción
revertida, que mira todo lo auditado después de la siembra, sin filtrar por `outcome`):

```text
res: nadie, baja, sinRol, pend → { admitido: false, motivo: 'NOT_ADMITTED' } (los cuatro)
ev:
  acceso.ingresar  denied NO_INVITADO   sin actor, sin objeto
  acceso.ingresar  denied DADO_DE_BAJA  sin actor, sin objeto
  acceso.ingresar  ok     —             CON actor, object_type app_user, CON objeto   ← sinRol
  acceso.consultar denied SIN_ACCESO    sin actor, sin objeto                         ← sinRol
  acceso.vincular  ok     —             CON actor, object_type app_user, CON objeto   ← pend
  acceso.consultar denied SIN_ACCESO    sin actor, sin objeto                         ← pend
pend (invitación vigente, sin rol): status ACTIVE, 1 credencial, invitación consumida
columnas de audit_event: id, occurred_at, actor_user_id, origin, action, object_type,
  object_id, outcome, reason_code   (ninguna de payload)
```

Communication OS audita `ingresar` igual (`contexts/communication/src/persistence/acceso.ts:175-181`).

**B3: el detector bancario contra el de `main`** (`sonda-bancarios.ts` en el scratchpad, cantidad
de hallazgos antes → después):

```text
uuid solo (JSON)                              1 → 0
TEXTO_CON_DATOS_BANCARIOS                    18 → 18
uuid + espacio + tarjeta con espacios         3 → 2   (la tarjeta sigue apareciendo)
uuid pegado a la tarjeta                      3 → 3
tarjeta escrita con forma de uuid            15 → 0
CBU en JSON                                   1 → 1
cada formato de FORMATOS_BANCARIOS, en un JSON junto a un uuid: detectado antes y después (8/8)
```

## Hallazgos

### Act on

Ninguno. Lo que pedía el objetivo está cumplido y lo comprobé, no sólo lo leí:

- los cuatro casos reciben respuestas idénticas byte a byte en el login y con sesión abierta,
  en las tres apps;
- las pruebas comparan la respuesta entera (status, todos los headers ordenados, incluido cada
  `set-cookie`, y el cuerpo) y fallan sin el arreglo (P2);
- lo que se admite a los datos no cambia: a la persona sin rol la base ya la rechazaba en cada
  request, y ahora tampoco recibe la cookie;
- el motivo queda en filas `denied` sin actor, sin objeto y sin columna de payload;
- `legacy` no pasa por el código nuevo: Broker OS sale antes con `!('modo' in config)`, los
  callbacks de Communication OS y Risk OS dan 404 en `legacy`, y Risk OS no tiene cambios de
  código;
- de las pruebas existentes sólo cambiaron dos líneas de import en la de Risk OS.

### Consider

**1. Un login sin rol, ahora rechazado, queda auditado también como `acceso.ingresar ok`.**
*(sonda B1/B2)* `packages/api/src/acceso/login.ts:47-55` y `apps/communication/src/lib/acceso.ts:127-136`.
`ingresar` ya escribió en su propia transacción el evento `ok`, con actor y objeto, cuando
`conDatos` / `conPrincipal` niegan. Desde el arreglo, la auditoría dice que la persona entró, y
la negativa queda en otra fila, sin actor, que sólo se asocia por cercanía. Con una invitación
vigente de alguien sin rol pasa lo mismo con `acceso.vincular ok`, y además la invitación se
consume (B2). Eso ya pasaba en `main`, que encima emitía la cookie. Las pruebas nuevas no lo
ven porque filtran `acceso.ingresar` por `outcome === 'denied'` (`packages/api/src/acceso/login.integration.test.ts:260`,
`apps/communication/src/lib/acceso.integration.test.ts:318`), y la evidencia lo omite. Hoy el
impacto es bajo: no encontré ningún camino del producto que deje a alguien sin rol; sólo un
`update` directo. Pero el contrato pide auditoría con «salida y efecto». Opciones: afirmar en
las pruebas la secuencia entera y dejarla documentada, o decidir el rol dentro de `ingresar`
para que la fila de login diga `denied`. La segunda ya no es el «cambio mínimo» que pidió el
owner, así que la decide él.

**2. A Risk OS le falta el caso «sin credencial» en el login.** El objetivo nombra cuatro
casos, y la prueba del callback de Risk OS prueba tres (no invitada, baja, sin rol). Por lectura,
una invitación vencida sale por `decidirLogin` como `NO_INVITADO` y por el mismo `rechazo()`,
así que es equivalente. Pero la frase de apertura de la evidencia («en cada app, … una sin
credencial reciben la misma respuesta») lo da por probado en el login de las tres. Sugerencia:
agregar el caso de la invitación vencida, como en las otras dos apps, o acotar la frase.

### Noted

1. El callback y las páginas de Broker OS (Next.js) no tienen prueba de punta a punta: las
   pruebas llegan hasta `admitirLogin` y `guarded`. La evidencia lo dice y lo deja al owner.
   Por mi lectura (P1), la respuesta depende sólo del resultado.
2. Con sesión abierta, Broker OS responde 403 `NOT_ADMITTED` a las cuatro negativas y 401
   `INVALID_TOKEN` a una cookie adulterada; Communication OS y Risk OS responden lo mismo en
   los dos casos. No distingue entre los cuatro casos, que son los que pide el objetivo. Es el
   diseño de VS01, que ya estaba.
3. Un login rechazado no borra una cookie de sesión anterior en ninguna app. Lo hace igual para
   todos los casos, así que no distingue nada desde afuera.
4. El login hace ahora una transacción más. Si esa transacción falla, la respuesta es la de
   cualquier canje fallido (`INVALID_TOKEN` / `error=1`), igual para todos.
5. Detector bancario (B3): ahora saca cualquier subcadena con forma de UUID de cualquier
   columna, no sólo de las columnas `uuid` como dice el comentario. El único dato que se pierde
   es una tarjeta escrita a propósito con forma de UUID. Los ocho formatos del prototipo y
   `TEXTO_CON_DATOS_BANCARIOS` se siguen detectando, también junto a un UUID. Para AM-10b
   alcanza. La causa del falso positivo es que la base de prueba de Communication OS no se
   revierte, y las pruebas nuevas de este PR también escriben ahí sin revertir.
6. `pnpm check` local sale 1 por los cuatro cancelados de Node 22 (ver arriba). Todas las
   sondas corrieron en Postgres 16.15, no en 17.

### Dismissed

1. **«El arreglo cambia qué se admite».** Con sesión abierta, la persona sin rol recibía en
   `main` la misma negativa en cada request (P2: las pruebas de sesión abierta pasan sin el
   arreglo). Lo único que cambia es que el login no le emite una cookie que no servía. Eso es
   respuesta externa, no admisión a datos.
2. **Pruebas existentes debilitadas.** En las pruebas que ya estaban, el diff sólo agrega
   `sellarSesion` y `configEntrada` a dos imports de la de Risk OS. Ninguna aserción existente
   cambió.
3. **Payload en la auditoría.** `audit_event` no tiene columna de payload (B1). Las filas de
   negativa no llevan actor ni objeto, y las pruebas lo afirman en las tres apps.
4. **Texto visible distinto.** Broker OS muestra el texto de `NOT_ADMITTED` en los cuatro
   casos. Communication OS y Risk OS usan `error=1`, sin motivo.
5. **Risk OS necesitaba el mismo arreglo.** No lo necesitaba: «sin rol» es `BAJA` en `ingresar`,
   y `authz_persona` usa la misma condición (P1). La prueba lo confirma con `DADO_DE_BAJA` para
   los dos caminos.
6. **El 403 explicado de `SinPermiso` en Communication OS distingue algo.** Sólo lo recibe
   una persona admitida y con rol, que no es ninguno de los cuatro casos.

## Evidencia (leída al final) contra lo comprobado

- **Coincide con lo que comprobé:** la fuga y su arreglo; que no hacía falta código en Risk OS;
  que las pruebas fallan sin el arreglo (mi P2 da el mismo 2/2); los conteos de `pnpm check`
  (177; 1488/1484/4 cancelados) y la causa de los cancelados; el resto de Next.js que no se
  prueba en Broker OS; el falso positivo del detector.
- **Omite:** la fila `acceso.ingresar ok` (o `acceso.vincular ok`) con actor que precede a la
  negativa en el caso sin rol (Consider 1).
- **Exagera levemente:** «en cada app … una sin credencial», cuando el login de Risk OS no
  prueba ese caso (Consider 2).
- **No pude comprobar:** «se da por verificado con el CI verde del PR». No tengo el CI.

## Veredicto

Sin Act on. Por los argumentos de arriba, el PR cumple el objetivo del owner con un cambio
mínimo. Quedan dos Consider para el owner, sobre la fidelidad de la auditoría y una prueba
simétrica en Risk OS, que no bloquean el merge. Antes de integrar hay que borrar el archivo de
sonda `packages/api/src/acceso/zz-sonda-revision.integration.test.ts` de este worktree.
