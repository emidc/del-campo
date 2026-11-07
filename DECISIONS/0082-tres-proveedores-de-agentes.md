# ADR-0082 — Claude Code, Codex y Gemini trabajan como agentes del repositorio

- **Id en `decisions.yaml`:** D-0082
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-07
- **Supersede:** en parte D-0016 (el arnés sólo soporta Claude Code). D-0043 sigue OPEN.
- **Aprobación:** el owner, el 2026-11-07, en el hilo del plan hacia la north star.

## Contexto

El owner tiene cuentas premium de Claude, Codex y Gemini, ninguna usada al máximo, y
quiere usarlas en paralelo de inmediato. `AGENTS.md` ya es neutral respecto del
proveedor (D-0018). Lo que no es neutral son los controles locales: el hook que protege
rutas y la captura de AgentRun existen sólo para Claude Code.

## Referencia canónica

`decisions.yaml`, D-0082.

## Cómo se aplica

- Mismo contrato para los tres: `AGENTS.md`, tarea en `TASKS/`, revisión ciega (R-33) y
  aprobación humana (R-13, R-14).
- Un solo agente implementador por tarea a la vez. Dos agentes no tocan la misma
  migración ni el mismo contrato en paralelo.
- Hasta que `T-0039` esté hecha, Codex y Gemini trabajan sólo con datos sintéticos y sin
  credenciales de producción.
- Nivel 2 de información sólo por cuentas registradas (D-0074).
- La revisión ciega puede hacerla un proveedor distinto del implementador. Eso no se
  presenta como evidencia para D-0043.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Correr primero el experimento de D-0043 | El owner prefirió usar los tres ya |
| Usar Codex y Gemini sólo para revisar | Desaprovecha capacidad que ya se paga |

## Consecuencias

**Más fácil:** más capacidad de implementación en paralelo.
**Más difícil:** tres configuraciones de herramienta que mantener, y la cola de revisión
del owner crece.

## Criterio de falsación

Se revisa si una corrida de Codex o Gemini escribe una ruta protegida, toca datos reales
o produce un cambio que la revisión ciega no detecta y llega a `main`.
