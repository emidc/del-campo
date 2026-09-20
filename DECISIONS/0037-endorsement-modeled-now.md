# ADR-0037 — Endorsement es un evento asociado a una Policy y exige Policy padre

- **Id en `decisions.yaml`:** D-0037
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** —

## Contexto

`DOMAIN.md` §36 dejaba `Endorsement` como `NAMED, NOT MODELED` y afirmaba que "puede
producir una nueva `PolicyVersion`". Mientras tanto `PolicyVersion` declara
`sourceEventType?` y `sourceEventId?`, campos cuyo referente no existía dentro de Broker OS.

Hay 1.930 endosos en scope, sobre **416 Policies distintas**: 1.549 de las 1.965 pólizas
del scope no tienen ninguno, y el máximo en una sola póliza es 17.

La medición M8 es la que obliga a separar dos cosas que estaban pegadas: **1.842 de los
1.930 endosos, el 95,4 %, son de tipo `Refacturacion`**, que es un evento de facturación y
no un cambio de condiciones contractuales. Los tipos que sí alteran condiciones suman unos
79 casos repartidos en doce categorías.

Si cada endoso produjera una `PolicyVersion`, se generarían 1.842 versiones idénticas en
todo lo contractual. Eso infla la historia, presiona `INV-011` e `INV-012` sin beneficio y
vuelve inútil la pregunta que motivó `D-0005`: qué cobertura tenía la póliza el día del
siniestro.

Por eso `Endorsement` se define como **evento asociado a una Policy, no necesariamente
contractual**, y la pregunta de si produce versión se decide por tipo.

La medición M3 acota el riesgo residual: solo **11 Policies tienen dos o más endosos que
comparten exactamente el mismo `Inicio vigencia`** —30 endosos en total— y 9 endosos tienen
fecha ausente o no parseable. Es una lista enumerable, no un problema sistémico.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0037`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Dejar `Endorsement` solo en staging | `sourceEventId` seguiría sin referente y la historia de la póliza no podría listar sus eventos |
| Que todo `Endorsement` produzca una `PolicyVersion` | 1.842 versiones sin diferencia contractual; degrada la pregunta que justifica el modelo entero |
| Que el importador infiera por tipo cuáles versionan | Inferencia sobre 13 valores de un campo de texto libre. El mismo error que `D-0021` evita para aseguradoras |
| `policyId` nullable para absorber los 58 endosos sin padre | Un endoso sin póliza no es representable ni útil: no se sabe qué modifica |

## Consecuencias

**Más fácil:** los eventos de una póliza son consultables; `sourceEventId` tiene referente;
la historia contractual queda limpia de refacturaciones.

**Más difícil:** hace falta una tabla curada de tipo → ¿versiona?, que es trabajo humano
sobre 13 valores y queda como insumo pendiente. Y `T-0012` suma una tabla al subconjunto de
`DOMAIN.md` §63.

**Regla de descarte.** Los 58 endosos del universo sin Policy padre no entran: ni al
dominio, ni a staging, ni como `ExternalReference`. Permanecen en el export crudo
preservado, que es lo que `R-23` exige. Es la única excepción a la fidelidad de staging
que establece `D-0033`.

**Costo de revertir:** medio. Desmodelar una entidad ya poblada exige migración.
