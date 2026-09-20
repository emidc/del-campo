# ADR-0034 — ExternalReference representa lo que existe en el origen y no en el dominio

- **Id en `decisions.yaml`:** D-0034
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** —

## Contexto

`INV-019` exige que una identidad no resuelta permanezca explícitamente sin resolver, pero
no existía mecanismo para sostenerlo. La medición M2 sobre el lote de septiembre de 2026
cuantifica el caso principal: de las 1.965 Policies en scope, **876** tienen predecesor de
renovación dentro del scope, **615** lo tienen fuera, **9** referencian un destino que no
existe en el export, **7** son ambiguas y 458 no tienen referencia.

Sin mecanismo, esas 631 pólizas tendrían `renewedFromPolicyId = NULL`, indistinguible de
las 458 que genuinamente no se renovaron de nada. La distinción no es de migración: es
visible en producto, porque la pantalla debe poder decir que el predecesor existe y no
está en Broker OS.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0034`.

## Excepción deliberada a R-01

`R-01` exige dos casos concretos antes de introducir una abstracción. **Esta decisión
introduce una abstracción con un solo consumidor de dominio en el momento de escribir el
schema**, y lo hace a conciencia.

Cuando se eligió el mecanismo, los casos eran cinco: 907 Claims sin Policy migrada, los
predecesores de renovación, 1.309 referencias a `Emision`, 38 Tasks apuntando a Policies
fuera de scope y las referencias documentales no accesibles. `D-0033` movió Claims, Tasks
y Emisión a staging, y `DocumentLink.reconciliationStatus` ya cubre el caso documental.
Queda un consumidor: la cadena de renovación.

Se acepta la excepción por tres razones. Primera, el caso restante no es marginal: son 631
de 1.965 pólizas, el 32 % del scope. Segunda, la promoción de `Claim` al dominio es
cuestión de cuándo y no de si, y en ese momento el segundo consumidor aparece con 907
filas. Tercera, el costo de retrofitear es asimétrico: agregar la entidad después obliga a
migrar datos ya importados y a reescribir el importador, mientras que tenerla de más
cuesta una tabla que se usa poco.

La alternativa —`Policy.legacyPredecessorRef` más `unresolvedReason`— resolvía el caso
concreto respetando `R-01` al pie, y se descartó por el costo de migración posterior, no
porque fuera incorrecta.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Par de columnas nullable por relación, con motivo tipificado | Respeta `R-01`, pero repite la misma estructura en cada relación que la necesite y obliga a migrar los datos cuando aparezca la tercera |
| Dejar la referencia solo en staging | El usuario no puede ver por qué falta el dato, y la conciliación asistida no tiene sobre qué apoyarse |
| Reusar `BusinessAuditEvent` | Es auditoría append-only, no estado del dominio. Mezclarlos rompería `R-22` |

## Consecuencias

**Más fácil:** un único mecanismo, una única cola de excepciones y un único reporte de
clases de fallo, que es lo que `T-0013` ya exige. Resolver una referencia más tarde no
destruye el dato original.

**Más difícil:** hay que resistir la tentación de usarlo como relación polimórfica
genérica. La decisión lo prohíbe explícitamente: una FK rota del origen sin valor
operativo se trata con una regla de descarte, no con un `ExternalReference`.

**Costo de revertir:** medio. Si el segundo consumidor nunca llega, la entidad se colapsa
en columnas de `Policy` con una migración simple.
