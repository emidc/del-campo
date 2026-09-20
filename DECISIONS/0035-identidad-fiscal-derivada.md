# ADR-0035 — La identidad fiscal es una condición derivada de calidad de datos

- **Id en `decisions.yaml`:** D-0035
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** — (supersede en parte la cláusula de identidad fiscal de `D-0031`)

## Contexto

`DOMAIN.md` §10 y §11 marcaban `dni?`, `cuil?` y `cuit?` opcionales. `D-0031` exigía
identidad fiscal para considerar validada una entidad y conservaba el legado con un estado
`NEEDS_IDENTITY_COMPLETION`. Las dos afirmaciones no pueden ser ciertas a la vez.

La evidencia decide el empate. De 1.786 filas del closure, **573** tienen fiscal
técnicamente válido, **1.198** no lo tienen y **15** lo tienen inválido: **1.213 filas, el
67,9 %, sin identidad fiscal válida**. Un estado de excepción que aplica a dos tercios de
la población no es una excepción: es la condición normal del legado. Modelarlo como estado
de `Party` dejaría al 67 % de las Parties fuera de `ACTIVE` y contaminaría toda consulta.

No existe hoy ni está previsto un requerimiento de verificación registral contra ARCA.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0035`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| `Party.status = NEEDS_IDENTITY_COMPLETION` | Rompe la semántica de `ACTIVE` para el 67 % de las Parties y propaga el estado a todas las consultas |
| Entidad `TaxIdentity` con valor, estado, fuente y vigencia | Correcta si hubiera verificación registral, múltiples identidades por Party o lifecycle propio. Hoy no hay ninguna de las tres: sería estructura sin caso |

## Consecuencias

**Más fácil:** el legado entra completo sin inventar estados; el identificador cumple su
función real, que es matching; `Party.status` conserva el significado que le da `D-0004`.

**Más difícil:** no hay dónde registrar la fuente, la vigencia ni el motivo de invalidez de
un identificador. Mientras el valor original viva en staging, esa información es
recuperable; cuando deje de serlo, hará falta promover.

**Costo de revertir:** bajo mientras staging conserve el valor original del origen.

## Criterio de promoción

Reconsiderar `TaxIdentity` mediante ADR si aparece una necesidad real de verificación
registral, de registrar fuente y vigencia del identificador, de sostener más de una
identidad fiscal por Party, o de un lifecycle propio del identificador.
