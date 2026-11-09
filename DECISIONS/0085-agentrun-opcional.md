# ADR-0085 — La captura de AgentRun deja de ser obligatoria

- **Id en `decisions.yaml`:** D-0085
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-09
- **Supersede:** en parte D-0015 (criterio de promoción por conteo) y D-0082 (condición
  de captura para Codex y Gemini).
- **Aprobación:** el owner, el 2026-11-09, en el hilo «Revisar las reglas de gobierno del repo».

## Contexto

El ledger `ops/runs/` se escribe con un hook en cada inicio y cierre de sesión desde
`T-0001`, y desde `T-0039` también para Codex y Gemini. Al 09/11/2026 tenía 87 eventos:
77 con `settingSources: unknown`, 32 sin tarea asociada y 4 de corridas con un modelo
simulado. Ningún script lo consulta y ninguna decisión se tomó con sus datos. La auditoría
de octubre ya lo había clasificado como abstracción prematura (POS-3). Su costo es
concreto: cerrar una sesión deja archivos modificados después del último commit.

Las dependencias que tenía eran de reglas, no de uso: `check-agent-run.mjs` en
`pnpm check`, la aceptación de `T-0039` y la condición de `D-0082`. Eso muestra que el
mecanismo estaba integrado, no que mejorara una decisión.

## Referencia canónica

`decisions.yaml`, D-0085.

## Cómo se aplica

- Se quitan los hooks `SessionStart` y `SessionEnd` de `.claude/settings.json`,
  `.codex/hooks.json` y `.gemini/settings.json`, y se borra `scripts/record-agent-run.mjs`
  con sus pruebas de lifecycle.
- `ops/runs/` se conserva. `check-agent-run.mjs` queda como validación liviana de su
  esquema.
- R-09 y R-09b dejan de exigir AgentRun o `runId` en la evidencia.
- Project OS se promueve a aplicación sólo por decisión explícita del owner con un caso
  de uso concreto.
- `D-0082`: un proveedor usa una capacidad protegida cuando sus protecciones locales
  están configuradas y comprobadas en el PR que las incorpora. Se mantienen `D-0074`,
  R-19 y la exclusión de credenciales de producción. Haber trabajado con una cuenta real
  no autoriza información confidencial.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Mantener la captura y agregar un consumidor | Nadie formuló una pregunta que el ledger responda |
| Borrar también el histórico | No se borra historia (R-23); cuesta nada conservarlo |
| Capturar sólo en experimentos de `D-0043` | Es lo que queda: opcional y deliberado |

## Consecuencias

**Más fácil:** cerrar una sesión no deja cambios; menos configuración por proveedor.
**Más difícil:** si se quiere comparar proveedores, el registro hay que activarlo a
propósito para ese experimento.

## Criterio de falsación

Se revisa si aparece una pregunta concreta que sólo un registro de sesiones responde, o
si una auditoría necesita reconstruir qué agente hizo un cambio y el PR no alcanza.
