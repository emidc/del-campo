---
id: T-0002
title: Decidir dónde se hace cumplir la autorización
kind: SPIKE
status: BLOCKED
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-07
blockedBy: []
contextRefs: [DOMAIN.md, docs/history/SOURCES.md]
decisionRefs: [D-0022, D-0027, D-0013]
---

## Why

Es la decisión abierta que más condiciona el resto del sistema: determina cómo consulta cada endpoint, cómo accede el worker, cómo accede un agente, y si el portal externo se puede construir sobre el mismo modelo que la aplicación interna. Se toma antes de escribir el primer endpoint, o se toma sola y queda embebida en el código.

También bloquea `D-0027`, porque la asignación de cartera a un productor solo se puede estructurar sabiendo dónde se evalúa el permiso.

El bundle recibido no contenía el `DOMAIN.md` canónico completo. Por eso esta tarea
permanece `BLOCKED` hasta incorporar ese snapshot sin reconstruirlo ni resumirlo.

## Outcome

Existe un ADR que decide entre RLS de Postgres, capa de aplicación o híbrido, con una prueba de concepto mínima que demuestra que el mecanismo elegido puede expresar los dos predicados difíciles del dominio.

## Non-scope

- No se implementa autenticación.
- No se construye el portal externo, ni una UI, ni endpoints de producción.
- No se decide el proveedor de identidad para usuarios externos.
- No se modela `PortalGrant` ni `PortfolioAssignment`; esta tarea solo determina dónde vivirá su evaluación.
- El código de la prueba de concepto es descartable y no entra en el producto.

## Verification

```bash
pnpm check
```

Comprobaciones humanas — el spike no está terminado hasta que las cuatro estén respondidas por escrito en `SPIKES/`:

- [ ] Está demostrado, con una base de datos real y datos de prueba, que el mecanismo elegido puede expresar el acceso de una aseguradora **solo mientras existan pólizas vigentes suyas**, y que el acceso se revoca solo cuando la última vence.
- [ ] Está demostrado que puede expresar el acceso de un productor **a su cartera asignada**, respetando la historia de la asignación.
- [ ] Está respondido qué ocurre cuando el worker o un agente se conecta con service role. Si el mecanismo se bypassea en ese caso, está escrito qué lo compensa.
- [ ] Está estimado el costo de abandonar el mecanismo elegido dentro de un año.

## Decision unlocked

`D-0022`. Después de este spike podemos decidir el punto de enforcement de autorización y, con eso, desbloquear `D-0027` y habilitar el diseño del portal externo.

Antes del spike, cualquier respuesta es opinión: ninguno de los dos predicados del dominio se parece a los ejemplos de la documentación de RLS.

## Data effects

Solo base local con datos sintéticos. Ningún dato real de clientes. → `ENGINEERING_RULES.md` R-19.

## Risks

- Riesgo de que el spike se convierta en un proyecto de implementación. Timebox: **una semana**. Si al terminar no hay una recomendación, se registra "sin conclusión" y se escala, no se extiende.
- Riesgo de decidir por elegancia y no por evidencia: por eso las cuatro comprobaciones exigen demostración sobre una base real, no razonamiento.
