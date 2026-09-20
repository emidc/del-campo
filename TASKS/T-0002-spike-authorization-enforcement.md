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
contextRefs: [DOMAIN.md]
decisionRefs: [D-0013, D-0019, D-0022, D-0027]
---

## Why

Esta decisión determina cómo consulta cada endpoint sujeto a permisos, cómo accede el
worker, cómo accede un agente y si el portal externo puede construirse sobre el mismo
modelo que la aplicación interna. Debe tomarse antes del primer acceso
multi-principal, del portal externo o de un proceso privilegiado que opere sobre datos
de Broker OS; no bloquea VS01, que es interno, de solo lectura y no incluye agentes ni
portal (`D-0019`).

También bloquea `D-0027`. El spike usa una representación sintética mínima de
asignación con historia para producir evidencia, pero no decide la estructura física
productiva de `PortfolioAssignment`.

## Outcome

Existe un ADR que decide entre RLS de Postgres, capa de aplicación o híbrido, apoyado
por una matriz explícita de principal, recurso, acción y tiempo, y por una prueba de
concepto mínima que demuestra tanto permisos como denegaciones y revocaciones para
los dos predicados difíciles del dominio.

## Non-scope

- No se implementa autenticación.
- No se construye el portal externo, ni una UI, ni endpoints de producción.
- No se decide el proveedor de identidad para usuarios externos.
- No se modela para producción `PortalGrant` ni `PortfolioAssignment`; el schema
  sintético de la prueba solo fija la semántica necesaria para comparar mecanismos.
- El código de la prueba de concepto es descartable y no entra en el producto.
- No se cambia el alcance ni se implementa VS01.

## Verification

```bash
pnpm check
```

Comprobaciones humanas — el spike no está terminado hasta que estén respondidas por
escrito en `SPIKES/`:

- [ ] La matriz de autorización identifica sin ambigüedad los principales, recursos,
      acciones y reglas temporales usados por ambas pruebas, incluidos los casos que
      deben denegarse.
- [ ] Está demostrado, con un Postgres local real y datos sintéticos, que una
      aseguradora accede solo a los recursos definidos por la matriz mientras exista
      el vínculo de póliza vigente requerido, y que el acceso se revoca en el límite
      temporal establecido.
- [ ] Está demostrado que un productor accede solo a la cartera que le corresponde en
      el instante consultado, incluidas reasignación, expiración y ausencia de
      asignación.
- [ ] Está respondido qué ocurre cuando el worker o un agente se conecta con service role. Si el mecanismo se bypassea en ese caso, está escrito qué lo compensa.
- [ ] Cada perfil de conexión probado —aplicación, worker y agente— tiene una regla de
      mínimo privilegio y una prueba negativa de deny-by-default.
- [ ] Está identificado qué parte depende de Supabase y qué parte funciona en
      PostgreSQL estándar, y está estimado el costo de abandonar el mecanismo elegido
      dentro de un año.

## Decision unlocked

`D-0022`. Después de este spike podemos decidir el punto de enforcement de
autorización y, con eso, desbloquear `D-0027` y habilitar el diseño del portal externo.
No desbloquea ni condiciona VS01.

Antes del spike, cualquier respuesta es opinión: ninguno de los dos predicados del dominio se parece a los ejemplos de la documentación de RLS.

## Data effects

Solo base local con datos sintéticos. Ningún dato real de clientes. → `ENGINEERING_RULES.md` R-19.

## Risks

- Riesgo de que el spike se convierta en un proyecto de implementación. Timebox: **una semana**. Si al terminar no hay una recomendación, se registra "sin conclusión" y se escala, no se extiende.
- Riesgo de decidir por elegancia y no por evidencia: por eso las comprobaciones
  exigen demostración sobre una base real, no solo razonamiento.
- Riesgo de demostrar una política técnicamente correcta pero semánticamente
  equivocada: la matriz de autorización es precondición de la prueba, no una
  conclusión implícita del SQL.
