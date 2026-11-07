# ADR-0084 — RO01 se acepta para uso interno sin revisor profesional, con A8 no verificado

- **Id en `decisions.yaml`:** D-0084
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-07
- **Supersede:** ninguna decisión. Cambia la verificación de `T-0032`.
- **Aprobación:** el owner, el 2026-11-07, en el hilo del plan hacia la north star.

## Contexto

`T-0032` pedía un revisor distinto del evaluador original que ordenara a ciegas antes de
ver resultados (A8 de RO01 §6). El owner decidió que no habrá revisor profesional.

## Referencia canónica

`decisions.yaml`, D-0084.

## Cómo se aplica

- El acta mide los trece criterios y la firma el owner.
- A8 queda «no verificado». No se reemplaza con un orden propio ni con una IA.
- La aceptación habilita el uso interno de Risk OS y destraba `T-0036`.
- No permite afirmar validación profesional independiente ni mostrar resultados de Risk
  OS a un cliente.
- Si más adelante aparece un revisor, A8 se mide sin repetir lo demás.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Esperar a un revisor | No habrá uno en el horizonte del plan |
| Dar A8 por cumplido con revisión de IA | Fabricaría una independencia que no existe |

## Consecuencias

**Más fácil:** RO01 cierra en diciembre.
**Más difícil:** la metodología sigue sin validación independiente (EMI-44); los
entregables a clientes declaran ese límite.

## Criterio de falsación

Se revisa si aparece un revisor idóneo o si un cliente pide resultados de Risk OS.
