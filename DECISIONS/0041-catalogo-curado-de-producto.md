# ADR-0041 — InsuranceProduct proviene de un catálogo curado

- **Id en `decisions.yaml`:** D-0041
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** —

## Contexto

`INV-015` y `D-0021` impiden que el importador cree aseguradoras a partir de strings
desconocidos. Nada equivalente protegía a los productos, y el problema tiene el mismo
tamaño: en el scope de 1.965 Policies hay **1.372 referencias de producto resueltas, 591
huérfanas y 2 vacías**; en los 1.061 Claims, 940 resueltas y 103 huérfanas.

`D-0031` ya aprobó curación humana para los 15 IDs huérfanos de Productos en scope —14
`NEW_ENTITY` y 1 `SAME_ENTITY`— con sus source IDs preservados. Esta decisión generaliza ese
tratamiento en lugar de dejarlo como un hecho puntual del lote de septiembre.

El campo del origen que referencia este catálogo se llama `Riesgo`, lo que agrava la
necesidad de fijar la procedencia: sin una regla explícita, un importador podría crear un
ramo nuevo por cada variante de texto.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0041`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Dejar que el importador cree productos desde el catálogo del origen | Los 37 Proveedores muestran el riesgo: 14 no tienen evidencia estructural de ser compañía. Un catálogo de origen no es un catálogo de destino |
| Estructurar `InsuranceProduct` ahora | Es `D-0026`, que sigue sin resolverse. Fijar la procedencia no exige fijar la estructura |
| No decidir hasta el POC de cotización | Deja 591 referencias huérfanas sin política justo cuando se escribe el importador |

## Consecuencias

**Más fácil:** el importador tiene una regla sobre productos equivalente a la que ya tiene
sobre aseguradoras, y las huérfanas se reportan en lugar de crear ramos inventados.

**Más difícil:** alguien debe curar el catálogo de destino antes del primer import, del
mismo modo que se curó el de aseguradoras.

**Lo que esta decisión no hace:** no resuelve `D-0026` ni estructura `InsuranceProduct`.
Fija de dónde vienen sus filas, no qué atributos tienen.

**Costo de revertir:** bajo. Es una regla de importación, no una estructura.
