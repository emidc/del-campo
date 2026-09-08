# ADR-0015 — Project OS empieza como repositorio, no como aplicación

- **Id en `decisions.yaml`:** D-0015
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-07
- **Supersede:** la secuencia de fases del Charter v0.1 §45, que ubicaba "Project OS MVP" antes de los spikes

## Contexto

El Charter v0.1 colocaba la construcción de Project OS antes de ejecutar cualquier spike. Eso implica diseñar un sistema de tareas y ejecución sin datos sobre cómo son las tareas reales, qué telemetría emite cada proveedor, ni si la abstracción de adapter sobrevive el contacto con un segundo proveedor.

El programa tiene un solo desarrollador, un negocio en operación que migrar, y una tendencia declarada a la sofisticación analítica. El modo de falla dominante identificado en la revisión externa es que el meta-trabajo desplace al producto: es el trabajo más interesante de ejecutar y el que menos valor entrega al broker.

## Referencia canónica

El qué y el estado de esta decisión viven en `decisions.yaml`, bajo `D-0015`.
Este ADR conserva su contexto, alternativas y consecuencias.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Construir Project OS como aplicación ahora | Diseñar contra requisitos imaginados; el costo hundido dificulta descartarlo cuando la evidencia lo contradiga |
| No registrar nada hasta tener la aplicación | El ledger no se puede reconstruir hacia atrás; cada semana sin registrar es información perdida para siempre |
| Usar una herramienta existente de gestión de proyectos | No captura AgentRuns, que es lo único que no se puede derivar de git y GitHub |

## Consecuencias

**Más fácil:** empezar hoy; cambiar de idea sobre el esquema del run sin migrar nada; que el contexto, el arnés y el ledger compartan un mismo SHA.

**Más difícil:** consultar el ledger, que requiere scripts ad-hoc — lo cual es intencional, porque el tercer script es la señal de promoción.

**Costo de revertir:** nulo. Los archivos se importan a cualquier esquema posterior.
