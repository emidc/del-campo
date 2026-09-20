# ADR-0036 — Una Policy tiene un único tomador; el Contacto asociado no es parte contractual

- **Id en `decisions.yaml`:** D-0036
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** — (precisa la cláusula de tomador de `D-0031`)

## Contexto

De las 1.965 Policies en scope, 1.291 traen solo Contacto, 338 solo Cuenta, **331 traen
ambos** y 5 no traen ninguno. `D-0031` estableció que con ambos la Cuenta es el tomador y
el Contacto "queda relacionado", sin definir qué significa esa relación ni dónde vive.

La regla de negocio confirmada es más precisa: ese Contacto es una persona de referencia de
la empresa y **no adquiere por ese hecho ningún rol contractual** sobre la Policy.

La medición M5 cuantifica el costo de no promover ese vínculo: de las 331, solo **190
(57,4 %)** tienen ya la relación organizacional en el origen vía `Nombre de Cuenta.id`. En
las **141 restantes no existe ninguna relación organizacional**, de modo que esas personas
de referencia quedan únicamente en staging y no son visibles desde el dominio.

Esa pérdida se acepta a conciencia. La alternativa —derivar una `OrganizationMembership` de
la coincidencia en una póliza— inventaría una relación a partir de evidencia débil, que es
justamente lo que `D-0031` prohíbe al exigir que no se creen relaciones por similitud.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0036`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| `PolicyParty` con rol (`HOLDER`, `INSURED`, `CONTACT`) | Resolvería las 331 y las 5 sin tomador, pero exige una taxonomía de roles que el negocio no necesita hoy: el Contacto asociado no tiene rol contractual |
| Derivar `OrganizationMembership` de la coevidencia en la póliza | Inventa una relación por similitud; contradice `D-0031` |
| Descartar el `contact_id` del origen | Import lossy contra `R-23`. Se preserva en staging |

## Consecuencias

**Más fácil:** el tomador es inequívoco, el modelo no gana una entidad y la relación
persona-organización tiene un solo lugar, que es `OrganizationMembership`.

**Más difícil:** 141 personas de referencia no aparecen en la ficha de la empresa. Y las 5
Policies sin tomador no pueden promoverse al dominio: quedan en staging como excepción,
sin tomador ficticio.

**Costo de revertir:** bajo. El `contact_id` del origen sigue en staging, así que promover
un vínculo Policy-Contact más adelante es posible sin volver a leer Zoho.
