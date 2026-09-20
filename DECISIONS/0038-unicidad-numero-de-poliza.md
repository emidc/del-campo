# ADR-0038 — El número de póliza es único por aseguradora

- **Id en `decisions.yaml`:** D-0038
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** —

## Contexto

`DOMAIN.md` §27 advertía que la combinación aseguradora + número "no debe asumirse
globalmente única sin analizar los datos reales", y enumeraba como escenario de renovación
la posibilidad de mantener el número. La regla de negocio confirmada es la contraria: cada
renovación produce una Policy nueva con número nuevo y vigencia nueva, y dos registros con
la misma combinación son una anomalía.

La medición M1 muestra que la regla se sostiene y cuantifica las excepciones. En el scope
de 1.965 Policies hay **1.957 pares distintos**, **7 pares en colisión** que involucran
**15 filas** —seis grupos de dos y uno de tres— y **2 Policies sin `Compañía.id`**. En el
universo de 13.281 hay 32 pares en colisión sobre 65 filas y 17 sin compañía.

El dato relevante para el diseño es que el 99,6 % del scope ya cumple la regla, de modo que
la constraint es viable y las excepciones son una lista corta y resoluble a mano.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0038`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Índice de búsqueda sin constraint | Deja entrar duplicados contractuales que el negocio considera errores, y el problema se descubre tarde |
| Constraint con resolución automática de colisiones | Un importador que descarta o fusiona filas para satisfacer una constraint destruye datos reales bajo presión de tiempo |
| Unicidad global del número, sin aseguradora | No la sostiene ningún hecho: 41 pares del universo colisionan al ignorar la compañía frente a 32 considerándola |

## Consecuencias

**Más fácil:** el par aseguradora + número identifica una póliza sin ambigüedad, que es lo
que el buscador de VS01 necesita, y las anomalías del origen se vuelven visibles en el
import en lugar de propagarse.

**Más difícil:** 15 filas del scope deben resolverse a mano antes del primer import, y las
2 Policies sin aseguradora no pueden formar el par y necesitan tratamiento propio. El
importador no puede avanzar sobre ellas: van a la cola durable de excepciones de `R-21`.

**Costo de revertir:** bajo. Quitar la constraint es una migración trivial; lo caro sería
haber importado duplicados y tener que separarlos después.
