# Spike T-0002 — Dónde se hace cumplir la autorización

- **Tarea:** `TASKS/T-0002-spike-authorization-enforcement.md`, con el contrato
  actualizado en el PR #99 (persona con empresas asignadas, contacto de empresa en el
  portal, regla de autor, cruce entre contextos).
- **Fecha:** 2026-11-03
- **Estado:** borrador para revisión del owner. `D-0022` no se resuelve hasta su
  aprobación.
- **Decisión que alimenta:** `D-0022`; habilita `D-0027` y los permisos de `T-0035`.
- **Prueba de concepto:** [`T-0002/`](T-0002/README.md). Postgres 16.15 local, datos
  sintéticos, sin red ni servicios externos.

## 1. Resumen y recomendación

**Recomendación: híbrido, con una división explícita.**

- **RLS decide las filas.** Qué empresas, qué contenido del portal y qué evaluaciones
  ve cada principal se hace cumplir en Postgres, en cada contexto, sobre un rol de la
  app sin `BYPASSRLS`. Una consulta que olvida el filtro devuelve lo mismo que una que
  lo tiene (prueba 4).
- **La aplicación decide la acción.** Rol × acción, la explicación de quién puede (la v25
  la muestra en cada acción denegada) y la regla de autor se evalúan en una función
  pura de la app, que es donde se prueban barato.
- **Las reglas de acción que protegen una decisión humana se repiten en la base.** Que
  quien escribe no apruebe ni acepte cuesta una línea de `WITH CHECK` y un grant por
  columna. La contraprueba muestra por qué: la app con ese defecto aprueba su propio
  informe si no hay RLS, y la política la frena si la hay (prueba 3, mutación M3).
- **La identidad se resuelve en la base en cada request.** El principal sólo existe si
  está declarado y sigue activo: la baja corta el acceso en el request siguiente, sin
  esperar a que venza un token (prueba 2, mutación M4).
- **Cada contexto hace cumplir lo suyo.** Broker OS lee a Risk OS con la identidad de la
  persona, y Risk OS resuelve admisión y alcance con sus propias tablas (prueba 9).

Se descarta **sólo aplicación** porque deja sin red la clase de defecto más probable en
un sistema escrito con agentes: la consulta nueva que no lleva el filtro. Se descarta
**sólo RLS** porque no produce explicaciones, no expresa bien reglas que dependen de
varias filas y del flujo, y obliga a leer errores de Postgres para saber qué se negó.

La matriz, los tres mecanismos y la contraprueba corren en `node --run test` (63 en
verde) y `node --run mutaciones` (8 de 8 detectadas). Salida literal en
`ops/evidence/T-0002.md`.

## 2. Matriz de autorización

Fuente ejecutable: [`T-0002/matriz.ts`](T-0002/matriz.ts), 25 casos de lectura y 12 de
escritura. Cada caso nombra su origen.

### Principales

| Id | Qué es | De dónde sale |
|---|---|---|
| ADM | Administrador | D-0072 |
| OP1 | Operador Del Campo con E1 desde T0 | D-0072 |
| OP2 | Operador con E1 en [T0, T1) y E2 desde T1: reasignación | D-0072, semántica de D-0027 |
| OP3 | Operador con E1 en [T0, T2): expiración | D-0072, D-0027 |
| OP4 | Operador sin asignaciones | deny-by-default |
| REV | Revisor profesional externo con E1 | D-0072; `aislamiento.js` (R1) |
| BAJ | Operador con E1 que se da de baja durante la prueba | D-0072, revocación inmediata |
| CT1, CT2 | Contacto de E1 y de E2 en el portal, vigentes | C12; `permisos.js` AM-18.portal |
| CT3 | Contacto de E1 con acceso en [T0, T2) | C12; semántica de `PortalGrant` |
| ANON | Sin principal | deny-by-default |

### Recursos y acciones

| Recurso | Leer | Escribir |
|---|---|---|
| Empresa | ADM todas; OP y REV las asignadas en el instante; contacto, la suya mientras su acceso esté vigente | — |
| Póliza | ADM; OP asignado. Ni REV ni el portal | — |
| Nota interna | ADM; OP asignado. Nunca REV ni el portal | Insertar: ADM u OP asignado, con autor igual a la persona de la sesión |
| Informe a la empresa | ADM y OP asignado, todos los estados; contacto, sólo `COMPARTIDO` de su empresa | Aprobar un `BORRADOR`: ADM u OP asignado que **no** sea el autor (V25-11, AD-16) |
| Evaluación (Risk OS) | Admin de Risk OS; persona con la empresa asignada **en Risk OS** | Aceptar una `PENDIENTE`: persona asignada que no sea el autor |

Nadie borra ni actualiza otra cosa: sin política ni grant, se niega.

### Reglas temporales

- Toda asignación y todo acceso de portal es un intervalo semiabierto `[desde, hasta)`
  en `timestamptz`: en el instante `hasta` ya no vale. Es la convención del schema de
  VS01 para `party_role` y la que fija la mutación M5.
- La baja de una persona no es temporal: vale desde el request siguiente.
- El instante es `now()`. El reloj de prueba sólo existe si el owner de la base lo
  habilita (prueba 6): sin ese candado, cualquier rol podría consultar «como si fuera»
  otra fecha.

### Supuestos para confirmar en `T-0035`

- El Revisor profesional no ve pólizas ni notas internas; sólo evaluaciones y lo que
  D-0072 le permite registrar.
- El portal no muestra pólizas (la v25 muestra resumen, riesgos, preguntas, solicitudes
  e informe compartido).
- Varias personas pueden tener la misma empresa asignada al mismo tiempo; una persona no
  tiene dos asignaciones superpuestas a la misma empresa.
- El predicado de aseguradora del contrato original se sacó (PR #99, a confirmar por el
  owner): la v25 no tiene portal de aseguradoras.

## 3. Respuestas a `## Verification`

### Persona del equipo con empresas asignadas

Demostrado con los casos `L-OP*`, `L-REV-*` y `W-OP*` en los tres mecanismos:

- OP1 ve E1 y su póliza; OP4, sin asignación, cero filas.
- **Reasignación:** OP2 ve E1 hasta el último milisegundo antes de T1 y, en T1, sólo E2;
  pierde la póliza de E1 y gana la de E2, y ya no aprueba informes de E1.
- **Expiración:** OP3 ve E1 un milisegundo antes de T2 y nada en T2.
- **Baja:** BAJ ve E1; el owner lo da de baja y el request siguiente devuelve cero filas
  en los tres mecanismos, sin reemitir ni invalidar nada (prueba 2). También con un
  token válido de esa persona (prueba 8).

### Contacto de empresa en el portal

- CT1 ve su empresa y sólo el informe compartido; no ve el borrador, ni pólizas, ni
  notas internas. CT2 ve sólo E2.
- Con una consulta **sin WHERE** sobre la conexión con RLS, CT1 sigue viendo sólo el
  informe compartido y ninguna nota (prueba 4).
- **Revocación en el límite:** CT3 ve E1 un milisegundo antes de T2 y nada en T2, ni la
  empresa ni el informe.

### Regla de autor

- Los tres mecanismos niegan que OP1 apruebe el informe que escribió y que el
  Administrador apruebe el suyo, y permiten aprobar el de otra persona.
- **Si falla la capa de aplicación:** la app con la regla olvidada aprueba su propio
  informe con la conexión sin RLS; la misma app sobre la conexión con RLS es frenada por
  `WITH CHECK (aprobado_por <> autor_id)` (prueba 3).
- **Si se intenta esquivar en la base:** reescribir `autor_id` falla con
  `permission denied` porque el grant de UPDATE es sólo sobre `(estado, aprobado_por)`.
- **Si falla la capa de RLS:** la mutación M3 quita la regla de la política y la suite lo
  detecta en los casos de los mecanismos que dependen de ella. En el híbrido la app
  sigue negando y además explica por qué; ese texto es el que muestra la v25.

### Worker y agente con service role

- **El service role se bypassea, siempre.** Con `BYPASSRLS` ve todas las notas internas
  sin principal (prueba 5). En Supabase, `service_role` y `postgres` tienen ese atributo;
  ninguna política lo frena.
- **Qué lo compensa:** que no lo use ningún proceso en ejecución. El worker y el servidor
  MCP tienen rol propio, sin `BYPASSRLS` ni superusuario, y una prueba comprueba ese
  atributo en `pg_roles` y que no pueden hacer `SET ROLE` al de servicio. El service role
  queda para migraciones y operación del owner (R-13, R-16); la cadena de conexión con
  ese usuario no va a ninguna variable de una app.
- **Worker:** sus políticas son `to spike_t0002_worker` y dicen lo que su trabajo
  necesita (todas las pólizas, para vencimientos), sin depender de un principal
  declarado: declarar el de un contacto no le cambia nada. No puede leer notas,
  informes ni usuarios, ni actualizar pólizas. La mutación M6 le da SELECT sobre notas y
  la suite lo detecta.
- **Agente (MCP de lectura, D-0075):** actúa en nombre de una persona. Sin principal ve
  cero filas; con OP1 ve exactamente lo de OP1 y con CT1 lo de CT1. No escribe aunque
  declare un administrador: no tiene grant de INSERT ni UPDATE (mutación M7).

### Perfiles de conexión: mínimo privilegio y deny-by-default

| Perfil | Regla de mínimo privilegio | Prueba negativa |
|---|---|---|
| App (`_app`) | SELECT sobre datos; INSERT de notas y UPDATE de aprobación por columna; nada sobre usuarios ni permisos, que leen funciones `SECURITY DEFINER` | Sin principal, cero filas en las cuatro tablas; `permission denied` en usuarios, asignaciones y accesos; no borra |
| Worker (`_worker`) | SELECT sobre pólizas, nada más | `permission denied` en empresa, notas, informes y usuarios; no actualiza |
| MCP (`_mcp`) | SELECT sobre datos, con las mismas políticas que la app | Sin principal, cero filas; no inserta ni actualiza |
| Risk OS (`_riskapp`) | SELECT y UPDATE por columna sobre evaluaciones, nada de `broker` | Sin principal reenviado, cero filas |

### Identidad entre contextos

Broker OS lee a Risk OS por su API (D-0071). La prueba 9 lo simula con dos esquemas y
dos roles: la «API» de Risk OS usa su conexión y sus permisos, y Broker OS no tiene
ningún grant sobre `risk`.

- La persona viaja **en el request**: Broker OS reenvía su identidad, no una identidad
  de servicio. Sin principal reenviado, Risk OS devuelve cero filas.
- **Risk OS decide con sus tablas.** OP2 está activo en Broker OS pero no admitido en
  Risk OS, y no ve nada. Una baja en Risk OS corta Risk OS aunque la persona siga activa
  en Broker OS. La mutación M8, que hace que Risk OS confíe en la admisión de Broker OS,
  la detecta esta última prueba.
- La identidad es común (D-0072) y la admisión y el alcance son de cada contexto. Que un
  administrador dé de baja a una persona en los tres con una sola acción es una pantalla
  de administración que llama a la API de cada contexto, no una lectura cruzada de
  tablas. Su diseño es de `T-0035`.

### Dependencia de Supabase y costo de salida

- **Todo lo probado es PostgreSQL estándar:** RLS (desde 9.5), `SECURITY DEFINER` con
  `search_path` fijo, GUC locales a la transacción, `btree_gist` para la exclusión de
  intervalos y grants por columna. No usa ningún esquema ni función de Supabase.
- **La única pieza con forma de Supabase** es `authz.usuario_declarado()`: acepta el
  principal de `authz.usuario_id` o el `sub` de `request.jwt.claims`, que es como
  PostgREST y Supabase exponen el token. Las mismas políticas funcionan con cualquiera
  de las dos fuentes (prueba 8). Si `T-0035` adopta Supabase Auth, las políticas no
  llaman a `auth.uid()` directamente sino a esa función, y salir de Supabase es
  reescribir una función.
- **Costo de abandonar RLS dentro de un año (estimado):** las políticas se borran con un
  `drop policy` por tabla. Lo caro es lo que hoy no hace falta escribir: el filtro en
  cada consulta de lectura de cada contexto, más una prueba de «consulta sin filtro» por
  cada una para recuperar la red. Estimado en días por contexto, no semanas, si las
  funciones `authz.*` se mantienen como única fuente de los predicados y la app ya las
  usa para decidir acciones, que es lo que propone el híbrido.
- **Costo de abandonar Supabase (estimado):** bajo para la autorización. El mecanismo
  depende de Postgres, no del proveedor.

## 4. Lo que RLS no protege, y otros hallazgos

- **RLS no autentica.** La app declara el principal y la base le cree: con la conexión
  de la app se puede declarar al Administrador y ver todo (prueba 6). RLS protege contra
  el filtro olvidado, no contra una autenticación rota ni contra una app comprometida.
  Lo que establece la identidad (verificar el token, comprobar que la persona sigue
  admitida) es responsabilidad de `T-0035`.
- **Con un pooler en modo transacción, el principal tiene que ser local a la
  transacción.** `set_config(…, true)` muere con la transacción; `set_config(…, false)`
  queda pegado a la conexión y el próximo request que la reciba hereda al Administrador
  (prueba 7). VS01 usa el Transaction pooler de Supabase (puerto 6543). Toda consulta con
  principal tiene que pasar por un único helper que abra la transacción y fije el
  principal; conviene una regla de lint que prohíba `set_config` y `SET` fuera de él.
- **Las funciones de predicado van envueltas en `(select …)`.** Así Postgres las
  evalúa una vez por consulta (InitPlan) y no por fila. Con 20 000 pólizas sintéticas, un
  operador con 40 empresas lee sus 400 pólizas en 3,7 a 3,9 ms con RLS y en 2,6 a
  2,7 ms con el filtro en la app, en dos corridas (`node --run bench`, sin índice sobre `empresa_id`). La diferencia
  existe y no decide nada a la escala de Del Campo.
- **Las tablas de permisos no las lee la app.** Las leen funciones `SECURITY DEFINER`
  del owner. Si la app pudiera leer `asignacion` o `acceso_portal`, la vería entera.
- **El autor sale de la sesión.** OP1 no puede insertar una nota con autor ADM: la
  política compara el autor con el principal (`W-OP1-nota-suplanta`).

## 5. Qué decide y qué deja

**Propone para `D-0022`:** híbrido como se describe en §1, con las reglas de §4 como
condiciones de implementación.

**Habilita `D-0027`:** la semántica mínima de la asignación de empresas es la de
`broker.asignacion` (persona, empresa, `[desde, hasta)`, sin superposición por persona y
empresa, varias personas por empresa). La estructura física se decide en `T-0035`.

**Condiciones que pasa a `T-0035`:**

1. El rol de cada app y del MCP sin `BYPASSRLS`, comprobado por una prueba de despliegue.
2. El principal resuelto en la base en cada request, contra la admisión vigente.
3. Un único helper de transacción con principal local; nada de `SET` de sesión.
4. Las reglas de autor en la app y en `WITH CHECK`, con grants por columna.
5. Los supuestos de §2 confirmados o corregidos con la matriz fina de `permisos.js`.
6. Si se adopta Supabase Auth, las políticas leen el principal sólo por
   `authz.usuario_declarado()` o su equivalente.

**No decide:** la autenticación ni su servicio (ADR de `T-0035`), la estructura física
de la asignación ni de `PortalGrant`, ni el diseño del portal o del MCP.

## 6. Qué no se probó

- Postgres 17, que fija `.postgres-version`: la prueba corrió en 16.15 porque el entorno
  no tenía 17. RLS, `SECURITY DEFINER` y GUC no cambiaron entre esas versiones en lo que
  se usa acá, pero no está comprobado.
- Un pooler real. La prueba 7 usa una conexión reservada del driver para mostrar el
  efecto; no se corrió contra Supavisor.
- Supabase hosteado, PostgREST y tokens reales de Supabase Auth: los claims se
  simularon con el GUC `request.jwt.claims`.
- Volumen y concurrencia reales; el bench es un orden de magnitud sintético.
- El registro de auditoría de C1: no es parte de este spike.
