# Matriz de permisos consolidada (T-0035)

**Qué es.** La matriz rol × acción × alcance de los tres contextos, traducida de
`docs/north-star/prototipo/pruebas/permisos.js` y `aislamiento.js` (prototipo v25). Lo que
está implementado se nombra con su acción en el código y sus pruebas. Lo que el prototipo
tiene y la producción todavía no, figura como **pendiente**: no existe ni endpoint ni acción
que lo haga, así que nadie puede hacerlo, con ningún rol.

**Qué la mantiene honesta.** `scripts/tests/t0035-matriz.test.mjs` falla si:

- aparece una acción en el código que no está en la tabla de acciones implementadas, o la
  tabla nombra una que el código no tiene;
- aparece una página o un endpoint que no está en la lista de rutas de abajo;
- un caso de `permisos.js` no está en la correspondencia.

Así, una funcionalidad pendiente no puede volverse accesible sin pasar por este documento.

**Qué decidió quién.** Las matrices de Communication OS y de Risk OS las aprobó el owner el
2026-11-03 (hilos de #109 y #110). Broker OS sigue lo de D-0022 y la migración 0009: el
Administrador ve todo, el Operador sólo sus clientes asignados y el Revisor profesional no
ve clientes. La columna «Corresponde a» de la sección 2 es una lectura del agente, no una
decisión: dice qué acción de producción cubre cada caso del prototipo.

Los roles son tres en los tres contextos: **Administrador**, **Operador Del Campo** y
**Revisor profesional** (`ADMINISTRADOR`, `OPERADOR`, `REVISOR`). La matriz rige con
`AUTH_MODE=oidc`, el único modo de Broker OS y Communication OS desde la fase 5. En Risk OS,
con `legacy`, se comporta como antes de T-0035.

## 1. Acciones implementadas

| Contexto | Acción | Administrador | Operador | Revisor | Alcance | Pruebas |
|---|---|---|---|---|---|---|
| Broker OS | `usuario.invitar` | Sí | No | No | — | `packages/api/src/acceso/acceso.integration.test.ts` |
| Broker OS | `usuario.cambiar_rol` | Sí | No | No | — | ídem |
| Broker OS | `usuario.dar_de_baja` | Sí | No | No | — | ídem |
| Broker OS | `cliente.asignar` | Sí | No | No | — | ídem |
| Broker OS | `cliente.desasignar` | Sí | No | No | — | ídem |
| Communication OS | `conversacion.consultar` | Sí | Sí | No | todas las conversaciones | `apps/communication/src/lib/acceso.integration.test.ts`, `permisos.test.ts` |
| Communication OS | `conversacion.responder` | Sí | Sí | No | todas las conversaciones | ídem |
| Risk OS | `riesgo.consultar` | Sí | Sí | Sí | Administrador: todas; Operador y Revisor: organizaciones asignadas. El Revisor, antes de su orden previo, sólo el material ciego | `apps/risk/src/lib/acceso.integration.test.ts`, `contexts/risk/src/application/autorizacion.integration.test.ts` |
| Risk OS | `riesgo.ver_resultados` | Sí | Sí | Sí, después de su orden previo ciego | ídem | ídem |
| Risk OS | `riesgo.cargar` | Sí | Sí | No | ídem | ídem |
| Risk OS | `riesgo.revisar` | Sí | Sí | Sí | ídem; nunca lo propio, tampoco un Administrador | ídem |
| Risk OS | `riesgo.reordenar` | Sí | Sí | Sí | ídem | ídem |
| Risk OS | `riesgo.orden_previo` | No | No | Sí | ídem | ídem |

Lecturas de Broker OS (búsqueda y ficha de VS01): no tienen acción propia, las decide RLS.
Administrador: todos los clientes. Operador: sus clientes asignados y los miembros de las
empresas asignadas. Revisor: ninguno. Pruebas: `packages/api/src/acceso/datos.integration.test.ts`,
`packages/db/src/autorizacion.integration.test.ts`.

Nadie tiene acceso universal por fuera del Administrador: toda lectura de un Operador o de
un Revisor pasa por una asignación explícita (`client_assignment` en Broker OS,
`risk.asignacion` en Risk OS). Communication OS no tiene clientes por persona todavía: lo
ven el Administrador y el Operador, como aprobó el owner.

## 2. Correspondencia con `permisos.js`

| Caso del prototipo | Acción del prototipo | Estado | Corresponde a |
|---|---|---|---|
| Reasignar tareas de otros | `tareaReasignar` | pendiente | — (no hay tareas en producción) |
| Editar tareas (propias o Manuel) | `tareaEstado` | pendiente | — |
| Responder comunicación | `responder` | implementada | Communication OS `conversacion.responder` |
| Tomar una atención | `tomarAtencion` | pendiente | — |
| Asignar un mensaje de «Sin asignar» | `asignarSinAsignar` | pendiente | — |
| Responder solicitudes | `responderSolicitud` | pendiente | — (no hay portal ni solicitudes) |
| Escribir una reevaluación | `escribirReeval` | implementada | Risk OS `riesgo.cargar` |
| Aceptar una reevaluación (no la propia) | `aceptarReeval` | implementada | Risk OS `riesgo.revisar` |
| Registrar reordenamiento profesional | `reordenar` | implementada | Risk OS `riesgo.reordenar` |
| Registrar avances | `registrarAvance` | parcial | Risk OS `riesgo.cargar` (novedad sobre una acción) para el equipo; el usuario del portal, pendiente |
| Comentar en el plan | `comentarAccion` | parcial | ídem |
| Registrar orden previo | `ordenPrevio` | implementada | Risk OS `riesgo.orden_previo` |
| Importar y reimportar | `loteResolverConflicto` | pendiente en la UI | Risk OS importa por la CLI del contexto (`pnpm --filter @del-campo/risk import`), fuera de la matriz web |
| Confirmar altas propuestas por skills | `paConfirmar` | pendiente | — |
| Confirmar cotizaciones | `r4Guardar` | pendiente | — (aprobación comercial) |
| Confirmar facturas (emitir) | `r5Emitir` | pendiente | — |
| Gestionar siniestros | `avanzarEtapa` | pendiente | — |
| Resolver excepciones de automatización | `resolverPaso` | pendiente | — |
| Decisión de la dirección | `decisionDireccion` | pendiente | — |
| Verificar transferencia | `verificarTransferencia` | pendiente | — (Risk OS sólo muestra la vista de transferencia, en lectura) |
| Vincular empresa con Risk OS | `vincularOrg` | pendiente | — |
| Crear solicitud (portal) | `crearSolicitud` | pendiente | — (no hay portal) |

**Tres aprobaciones distintas.** La aceptación profesional de una evaluación es
`riesgo.revisar` y está implementada, con la regla de que nadie acepta lo propio en la
aplicación y en Postgres. La aprobación comercial (cotizaciones) y la aprobación de informes
son acciones separadas y **pendientes**: no hay endpoint que las haga, así que no hay forma
de confundirlas con la aceptación profesional. Sus pruebas quedan para cuando se
implementen y no se dan por verificadas acá.

**Material ciego (Risk OS).** Es lo único que el Revisor profesional ve de una organización
antes de registrar su orden previo: los riesgos con su identidad y su estructura (`riesgo`,
`miembro_escenario`) y su propio orden previo. Nada evaluado ni calculado. Plan de acción y
su estado (`efecto`), coberturas (`suficiencia`, `exposicion_retenida_monto`) y sus eventos,
novedades, revisiones pendientes, evaluaciones, revisiones humanas y reordenamientos quedan
detrás de `authz_ve_resultados`, en la base (migración 0007). Desde 0008, la base exige además
que el orden previo cubra cada riesgo y cada padre de la organización, como ya lo exigía la
aplicación: al confirmarlo, un trigger diferido lo rechaza si falta alguno ya confirmado, y
uno vacío no abre nada ni dentro de su propia transacción.

**Personas (Risk OS).** Cada persona ve su propia fila de `risk.persona` y la de quienes
escribieron algo que ella puede leer; el Administrador ve todas. Antes de 0007 se veían
todas.

**Aislamiento (`aislamiento.js`).** El Revisor profesional sólo ve las organizaciones que
tiene asignadas en Risk OS, no ve clientes en Broker OS ni conversaciones en Communication
OS; las pruebas están en las mismas suites de la sección 1. Los perfiles del portal
(`pcl`, `pqa`) son pendientes: no hay portal externo, y T-0002 se activa antes del primero.

## 3. Rutas que existen

Toda página y todo endpoint de las tres aplicaciones. Uno nuevo exige actualizar esta lista,
y con ella decidir en qué fila de la matriz cae.

```text
apps/communication/src/app/api/auth/google/callback/route.ts
apps/communication/src/app/api/auth/google/start/route.ts
apps/communication/src/app/api/conversations/[id]/reply/route.ts
apps/communication/src/app/api/conversations/[id]/route.ts
apps/communication/src/app/api/conversations/route.ts
apps/communication/src/app/api/jobs/reprocess/route.ts
apps/communication/src/app/api/jobs/retention/route.ts
apps/communication/src/app/api/logout/route.ts
apps/communication/src/app/c/[id]/page.tsx
apps/communication/src/app/login/page.tsx
apps/communication/src/app/page.tsx
apps/communication/src/app/webhook/route.ts
apps/risk/src/app/api/auth/google/callback/route.ts
apps/risk/src/app/api/auth/google/start/route.ts
apps/risk/src/app/api/login/route.ts
apps/risk/src/app/api/logout/route.ts
apps/risk/src/app/api/o/[org]/actividad/route.ts
apps/risk/src/app/api/o/[org]/escenarios/route.ts
apps/risk/src/app/api/o/[org]/lista/route.ts
apps/risk/src/app/api/o/[org]/orden-previo/route.ts
apps/risk/src/app/api/o/[org]/plan/route.ts
apps/risk/src/app/api/o/[org]/reordenar/route.ts
apps/risk/src/app/api/o/[org]/transferencia/route.ts
apps/risk/src/app/api/organizaciones/route.ts
apps/risk/src/app/api/r/[id]/actualizar/route.ts
apps/risk/src/app/api/r/[id]/route.ts
apps/risk/src/app/login/page.tsx
apps/risk/src/app/o/[org]/escenarios/page.tsx
apps/risk/src/app/o/[org]/orden-previo/page.tsx
apps/risk/src/app/o/[org]/page.tsx
apps/risk/src/app/o/[org]/plan/page.tsx
apps/risk/src/app/o/[org]/transferencia/page.tsx
apps/risk/src/app/page.tsx
apps/risk/src/app/r/[id]/page.tsx
apps/web/src/app/api/auth/google/callback/route.ts
apps/web/src/app/api/auth/google/start/route.ts
apps/web/src/app/api/auth/logout/route.ts
apps/web/src/app/api/vs01/policy/[id]/route.ts
apps/web/src/app/api/vs01/search/route.ts
apps/web/src/app/buscar/page.tsx
apps/web/src/app/gestiones/[id]/page.tsx
apps/web/src/app/gestiones/equipo/page.tsx
apps/web/src/app/gestiones/nueva/page.tsx
apps/web/src/app/gestiones/page.tsx
apps/web/src/app/inicio/page.tsx
apps/web/src/app/login/page.tsx
apps/web/src/app/page.tsx
apps/web/src/app/parte/[id]/page.tsx
apps/web/src/app/poliza/[id]/page.tsx
apps/web/src/app/renovaciones/page.tsx
```

## 4. Token entre contextos

Ninguna ruta de la lista acepta todavía un token de otro contexto. Risk OS y Communication
OS tienen el verificador del destino (`apps/*/src/lib/entre-contextos.ts`), probado contra
Postgres, y un test de estructura en cada `deny.test.ts` que falla si una página, un
endpoint o un handler lo usa. El token prueba quién es la persona; qué puede hacer lo decide
la fila del destino en la sección 1.
