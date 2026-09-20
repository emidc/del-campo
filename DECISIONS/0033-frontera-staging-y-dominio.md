# ADR-0033 — La migración persiste en staging; el dominio recibe solo lo modelado

- **Id en `decisions.yaml`:** D-0033
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** —

## Contexto

`D-0031` aprobó migrar 9.636 filas core más 1.585 notas: 1.965 Policies, 1.930
Endorsements, 676 Opportunities, 2.218 Tasks, 1.061 Claims, 1.406 Contactos y 380
Cuentas. De esas familias, `Opportunity`, `Task` y `Note` no existen en `DOMAIN.md` ni
como `DEFERRED`, y `Claim` está `NAMED, NOT MODELED`.

Había que elegir entre modelar cinco entidades sin POC para poder guardarlas, no
guardarlas, o separar el lugar donde se preserva el origen del lugar donde vive el
dominio. `R-23` ya distingue "no migrar" de "no preservar" y declara tomada solo la
primera; `R-01` exige dos casos antes de una abstracción; `R-32` exige que el dominio
crezca por evidencia.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0033`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Modelar `Claim`, `Endorsement`, `Task`, `Note` y `Opportunity` en el dominio ahora | Cinco entidades sin POC ni uso real. Contradice `R-01` y `DOMAIN.md` §70; desmodelar después es caro |
| Migrar solo el subconjunto de VS01 y traer el resto en una segunda pasada | Depende de que Zoho siga re-exportable. Ninguna decisión debe depender de eso, y la segunda pasada es la que nunca ocurre |
| Guardar todo en el dominio con campos opcionales | Produce entidades cuya forma la dicta el origen, que es exactamente lo que `DOMAIN.md` §1 busca evitar |

## Consecuencias

**Más fácil:** una sola lectura del export; nada se pierde; el dominio crece cuando hay
evidencia; la superficie de VS01 no queda presionada por el volumen migrado.

**Más difícil:** conviven dos representaciones, y hay que decidir explícitamente qué se
consulta desde staging y qué desde el dominio. Promover un concepto de staging al dominio
exige ADR, no una migración silenciosa.

**Costo de revertir:** bajo. Promover de staging al dominio es aditivo. El costo real
sería el inverso —desmodelar— y esta decisión lo evita.
