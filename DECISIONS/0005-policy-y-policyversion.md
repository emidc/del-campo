# ADR-0005 — Policy guarda identidad; PolicyVersion guarda estado y vigencia

- **Id en `decisions.yaml`:** D-0005
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-07
- **Supersede:** —

## Contexto

El Charter exige que los endosos conserven historial y no sobrescriban información anterior. `DOMAIN.md` v0.1 introdujo `PolicyVersion` correctamente, pero mantuvo vigencia (`termStartDate` / `termEndDate`) y estado (`lifecycleStatus`) también en `Policy`.

Dos lugares para el mismo hecho divergen. El primer consumidor del campo divergido es la vista de renovaciones, que es el segundo POC del programa y lee la fecha de vencimiento.

La pregunta que motiva todo esto —"¿qué cobertura tenía esta póliza el día del siniestro?"— tiene consecuencias legales y no se puede responder con un estado actual más una lista de eventos sin snapshot.

## Referencia canónica

El qué y el estado de esta decisión viven en `decisions.yaml`, bajo `D-0005`.
Este ADR conserva su contexto, alternativas y consecuencias.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Estado en `Policy`, eventos en `Endorsement` | No permite reconstruir el estado a una fecha: es exactamente el defecto que se quería evitar |
| Vigencia en ambos niveles | Divergen. La vista de renovaciones lee uno y la realidad está en el otro |
| Versionado genérico de todas las entidades | Generalización sin segundo caso. Aplica la regla de dos |

## Consecuencias

**Más fácil:** responder preguntas a fecha; auditar cambios contractuales; hacer cumplir la invariante de no solapamiento con una exclusion constraint de Postgres.

**Más difícil:** toda consulta de "estado actual" necesita resolver la versión efectiva. Se mitiga con una vista, y más adelante con una proyección si el rendimiento lo justifica.

**Costo de revertir:** alto una vez importadas las 800 pólizas y empezados los endosos. Por eso entra ahora y no después.
