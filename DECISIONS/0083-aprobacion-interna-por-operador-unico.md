# ADR-0083 — Aprobación interna por operador único

- **Id en `decisions.yaml`:** D-0083
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-07
- **Supersede:** en parte D-0022 (quien redacta no aprueba), sólo para uso interno. DA-8
  sigue vigente para todo lo que llega al cliente.
- **Aprobación:** el owner, el 2026-11-07, en el hilo del plan hacia la north star
  (tarjeta «Operador único interno» y su mensaje con la excepción explícita).

## Contexto

D-0022 y DA-8 exigen que quien redacta una evaluación o un informe no lo apruebe, ni
siquiera un Administrador, y está probado en la base y en la aplicación. El owner decidió
que no habrá revisor profesional y que todo el trabajo cae en él. Sin una excepción, Risk
OS no le deja aceptar sus propias evaluaciones y RO01 no puede completar sus ciclos.

## Referencia canónica

`decisions.yaml`, D-0083.

## Cómo se aplica

- Sólo uso interno. El autor puede aprobar lo propio si:
  - hay una revisión de IA registrada, y
  - pasaron 24 horas desde el último cambio material. Un cambio material reinicia la espera.
- Quedan registrados la versión, los hallazgos, las correcciones y la aprobación humana.
- La aprobación se rotula «aprobación interna por operador único».
- No habilita publicar, exportar ni entregar al cliente. Para eso sigue haciendo falta
  otra persona humana habilitada, que puede ser interna; no exige contratar a nadie.
- Se hace cumplir en el servidor y en los permisos de la base (`T-0041`). Mientras
  `T-0041` no esté, la regla anterior sigue rigiendo en el código.
- Las 24 horas son una pausa para reconsiderar, no evidencia de independencia.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Mantener DA-8 y que alguien del equipo apruebe todo | El owner concentra el trabajo en él |
| Operador único también frente al cliente | Riesgo de presentar autoevaluación como revisión; queda como decisión aparte, no tomada |

## Consecuencias

**Más fácil:** RO01, C5 y el trabajo diario avanzan sin una segunda persona.
**Más difícil:** M3 y M4 siguen necesitando una persona que apruebe la entrega al cliente
(tarea PER-01 del plan).

## Criterio de falsación

Se revisa si se suma una segunda persona que opere Risk OS, o si una aprobación interna
llega a un cliente.
