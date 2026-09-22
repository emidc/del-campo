# ADR-0054 — La pertenencia documental se separa del destino resuelto

- **Id en `decisions.yaml`:** D-0054
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-21
- **Supersede:** —

## Contexto

`DOMAIN.md` §63 exige mostrar `ExternalReference` como motivo visible de un vínculo
documental ausente. Sin embargo, el schema de T-0012 sólo expresa el origen y el
destino intentado de la referencia: no permite saber a qué Policy pertenece una
referencia documental todavía no resuelta. La revisión ciega de T-0016 confirmó la
consecuencia: `documents: []` no puede distinguir ausencia sin referencia de una
referencia conocida con motivo de no resolución.

Esto expone una tensión con el razonamiento histórico de ADR-0034, que consideraba que
`DocumentLink.reconciliationStatus` cubría el caso documental. Ese mecanismo sólo
existe cuando hay una fila `DocumentLink`; no puede explicar por qué no existe ningún
vínculo. La nueva evidencia no invalida D-0034: incorpora el caso documental como un
consumidor específico de `ExternalReference` y mantiene su prohibición de convertirlo
en una relación polimórfica genérica.

El owner confirmó dos ejes distintos: la Policy de pertenencia, que siempre debe tener
integridad referencial, y el destino externo que la referencia intenta resolver, que
permanece en `resolvedTargetType/resolvedTargetId`.

## Referencia canónica

La decisión y su estado viven únicamente en `decisions.yaml`, bajo `D-0054`.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Reusar `resolvedTargetId` para la Policy | Confunde la pertenencia conocida con el destino externo todavía no resuelto y vuelve imposible representar ambos a la vez. |
| Agregar `ownerType/ownerId` a `ExternalReference` | Introduce precisamente la relación polimórfica genérica que D-0034 prohíbe y deja la FK sin integridad física. |
| Agregar `policyId` nullable a `ExternalReference` | Mezcla un consumidor específico con la entidad general y hace menos visible qué referencias son documentales. |
| Crear un `DocumentLink` con destino ficticio | Fabrica un vínculo a Drive que no existe y contradice la autoridad documental de D-0009. |

## Consecuencias

Se crea `policy_document_reference`, una asociación específica: su PK sobre
`external_reference_id` hace que una referencia documental pertenezca a una sola
Policy; dos FKs `RESTRICT` garantizan que ambos extremos existan y no desaparezcan
mientras la asociación esté presente. Un índice por `policy_id` soporta la lectura de
motivos documentales desde el detalle de Policy.

`relationType = POLICY_DOCUMENT` es el discriminador físico de este subconjunto. Un
constraint trigger diferible exige que toda referencia con ese tipo participe en una
asociación al cerrar la transacción, y la asociación rechaza cualquier otro tipo. Es
diferible porque referencia y pertenencia se crean en sentencias distintas dentro de
la misma transacción; el estado incompleto nunca puede confirmarse.

La migración no intenta inferir pertenencia para referencias `POLICY_DOCUMENT`
preexistentes: no contiene la evidencia necesaria para elegir una Policy. Si encuentra
alguna, falla atómicamente y exige resolver ese dato antes de reintentar; instalar el
constraint sólo para eventos futuros dejaría una violación invisible.

Origen, valor original, estado, `unresolvedReason` y destino resuelto permanecen en
`ExternalReference`; la asociación no los duplica ni los interpreta. La tabla es un
concepto de infraestructura del modelo, no una entidad de negocio nueva ni una puerta
para asociar cualquier referencia con cualquier recurso.

El costo es una tabla, un join y validación diferible adicionales. Revertir es barato
mientras no existan asociaciones; con datos, la migración inversa falla explícitamente
para impedir que se borre su pertenencia en silencio. La decisión no define todavía un
workflow de corrección o auditoría para reasignar la Policy; antes de importar datos,
esa operación debe quedar gobernada explícitamente.
