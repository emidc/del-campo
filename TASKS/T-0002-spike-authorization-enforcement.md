---
id: T-0002
title: Decidir dónde se hace cumplir la autorización
kind: SPIKE
status: READY
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-07
blockedBy: []
contextRefs: [DOMAIN.md, DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0071-integracion-por-api-y-correspondencia-de-empresas.md,
              DECISIONS/0072-acceso-individual-y-roles.md,
              DECISIONS/0075-servidor-mcp-y-skills.md,
              docs/north-star/09-plan-de-produccion.md,
              docs/north-star/10-pruebas-como-criterios.md]
decisionRefs: [D-0013, D-0019, D-0022, D-0027, D-0063, D-0071, D-0072, D-0075]
---

## Why

Esta decisión determina cómo consulta cada endpoint sujeto a permisos, cómo accede el
worker, cómo accede un agente y si el portal de empresas puede construirse sobre el
mismo modelo que la aplicación interna. Bloquea C1 (`T-0035`), C12 (portal de empresas)
y C13 (servidor MCP), según el plan de producción de la north star v25.

Cuando se escribió este spike (07/09/2026) los principales difíciles eran una
aseguradora y un productor con cartera. Desde entonces cambiaron los hechos que lo
restringen:

- `D-0072` fija tres roles internos (Administrador, Operador Del Campo y Revisor
  profesional), permisos limitados por empresa y evaluación, cuentas de Google externas
  invitadas y revocación inmediata comprobada en el servidor.
- El primer principal externo de la north star es el **contacto de una empresa** en el
  portal (C12), no una aseguradora. La v25 no tiene portal de aseguradoras.
- `D-0063` y `D-0071` separan Broker OS, Risk OS y Communication OS en contextos con
  base propia, integrados sólo por API de aplicación: la autorización se hace cumplir
  en más de una base y tiene que cruzar ese borde.
- `D-0072` prioriza Supabase Auth, que vuelve natural escribir políticas RLS sobre los
  claims del token; `D-0013` exige que la base siga siendo un Postgres plano.
- `D-0075` dirige un servidor MCP propio, primero de lectura, que es el agente concreto.

También bloquea `D-0027`. El spike usa una representación sintética mínima de
asignación con historia para producir evidencia, pero no decide la estructura física
productiva de la asignación de empresas a personas.

## Outcome

Existe un ADR que decide entre RLS de Postgres, capa de aplicación o híbrido, apoyado
por una matriz explícita de principal, recurso, acción y tiempo construida sobre los
roles de `D-0072` y los perfiles de la v25 (`permisos.js`, `aislamiento.js`), y por una
prueba de concepto mínima que demuestra permisos, denegaciones y revocaciones para los
tres predicados difíciles de la north star: una persona del equipo con empresas
asignadas, un contacto de empresa en el portal y una regla de acción que depende del
autor (quien escribe una evaluación no la acepta). El ADR dice además cómo viaja la
identidad cuando Broker OS lee a Risk OS o a Communication OS por API.

## Non-scope

- No se implementa autenticación ni se elige su biblioteca o servicio: es el ADR de
  `T-0035` frente a `D-0013` y `D-0060`.
- No se construye el portal de empresas, ni una UI, ni endpoints de producción, ni el
  servidor MCP.
- No se modela para producción `PortalGrant` ni la asignación de empresas (`D-0027`);
  el schema sintético de la prueba solo fija la semántica necesaria para comparar
  mecanismos.
- No se reescribe la matriz completa de `permisos.js`: se eligen los casos que
  distinguen mecanismos, y la matriz fina por rol es de `T-0035`.
- El código de la prueba de concepto es descartable y no entra en el producto.
- No se toca ninguna base hosteada ni ningún despliegue.

## Verification

```bash
pnpm check
```

Comprobaciones humanas — el spike no está terminado hasta que estén respondidas por
escrito en `SPIKES/`:

- [ ] La matriz de autorización identifica sin ambigüedad los principales, recursos,
      acciones y reglas temporales usados por las pruebas, incluidos los casos que
      deben denegarse, y nombra los roles de `D-0072` y los perfiles de la v25 de los
      que sale cada caso.
- [ ] Está demostrado, con un Postgres local real y datos sintéticos, que una persona
      del equipo accede solo a las empresas que tiene asignadas en el instante
      consultado, incluidas reasignación, expiración, ausencia de asignación y baja de
      la persona, y que la baja corta el acceso en el request siguiente.
- [ ] Está demostrado que un contacto de empresa accede solo a lo que su empresa
      comparte mientras su acceso esté vigente, que no ve otra empresa ni contenido no
      compartido, y que el acceso se revoca en el límite temporal establecido.
- [ ] Está demostrado dónde se hace cumplir que quien escribe una evaluación no la
      acepta, y qué pasa si la regla falla en la capa que no la hace cumplir.
- [ ] Está respondido qué ocurre cuando el worker o un agente (el servidor MCP de
      lectura de `D-0075`) se conecta con service role. Si el mecanismo se bypassea en
      ese caso, está escrito qué lo compensa.
- [ ] Cada perfil de conexión probado —aplicación, worker y agente— tiene una regla de
      mínimo privilegio y una prueba negativa de deny-by-default.
- [ ] Está escrito cómo se identifica a la persona cuando Broker OS lee a Risk OS o a
      Communication OS por API (`D-0071`), y qué contexto hace cumplir qué.
- [ ] Está identificado qué parte depende de Supabase (incluidos los claims de Supabase
      Auth en políticas RLS) y qué parte funciona en PostgreSQL estándar, y está
      estimado el costo de abandonar el mecanismo elegido dentro de un año.

## Decision unlocked

`D-0022`. Después de este spike podemos decidir el punto de enforcement de
autorización y, con eso, desbloquear `D-0027`, implementar los permisos de C1
(`T-0035`) y habilitar el diseño del portal de empresas (C12) y del servidor MCP (C13).
No desbloquea ni condiciona VS01.

Antes del spike, cualquier respuesta es opinión: ninguno de los predicados de la north
star se parece a los ejemplos de la documentación de RLS.

## Data effects

Solo base local con datos sintéticos. Ningún dato real de clientes. → `ENGINEERING_RULES.md` R-19.

## Risks

- Riesgo de que el spike se convierta en un proyecto de implementación. Timebox: **una semana**. Si al terminar no hay una recomendación, se registra "sin conclusión" y se escala, no se extiende.
- Riesgo de decidir por elegancia y no por evidencia: por eso las comprobaciones
  exigen demostración sobre una base real, no solo razonamiento.
- Riesgo de demostrar una política técnicamente correcta pero semánticamente
  equivocada: la matriz de autorización es precondición de la prueba, no una
  conclusión implícita del SQL.
- Riesgo de que el spike decida la autenticación por implicación: si una opción solo
  funciona con Supabase Auth, se dice como condición para el ADR de `T-0035`, no se
  decide acá.

## Historial

- 2026-11-03: actualizado a los hechos de `D-0071`, `D-0072` y `D-0075` y del plan de
  producción de la north star v25. Los predicados de aseguradora con vínculo de póliza
  vigente y de productor con cartera se reemplazan por el de persona con empresas
  asignadas y el de contacto de empresa en el portal; se agregan la regla de autor, el
  cruce entre contextos y los claims de Supabase Auth.
