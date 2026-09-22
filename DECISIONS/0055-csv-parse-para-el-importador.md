# ADR-0055 — `csv-parse` como dependencia del importador de T-0013

- **Id en `decisions.yaml`:** D-0055
- **Fecha:** 2026-09-22
- **Supersede:** —

## Contexto

`packages/db/src/import/` (T-0013) necesita leer los CSV extraídos del lote de Zoho:
Polizas (13.281 filas, 88 columnas), Endosos, Contactos, Cuentas. R-05 dispara ADR ante
una dependencia nueva; `csv-parse@^7.0.2` se agregó a `packages/db/package.json` sin
registrarla primero, exactamente el hueco que D-0042 tuvo que regularizar para `yaml`
después del hecho. Este ADR lo hace antes de que la revisión ciega de R-33 lo encuentre.

El contenido real tiene domicilios, descripciones y otros campos de texto libre con
comas, comillas y —potencialmente— saltos de línea embebidos, propios de un CRM
exportado a CSV. Un `split(',')` a mano corrompe esos valores en silencio: no lanza
error, sólo corta la fila en el lugar equivocado y desplaza todas las columnas
siguientes. Sobre datos reales de clientes (`D-0053`), ese modo de falla silencioso es
inaceptable — la clasificación de fallos de la tarea perdería sentido si el propio
parseo ya corrompió la fila antes de clasificarla.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0055.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Parser propio por expresiones regulares o `split(',')` | Reproducir RFC 4180 completo (comillas, comas y saltos de línea embebidos, comillas escapadas) es reimplementar la dependencia sin sus tests; el modo de falla no es un error visible, es una fila corrida en silencio. |
| Leer con el driver de Postgres (`COPY FROM`) | Delegaría la interpretación de comillas/encabezados a `psql` sin control fino sobre columnas o filas malformadas, y acopla el parseo al mecanismo de carga en vez de dejarlo testeable por separado con fixtures sintéticas. |
| Otra librería de CSV (`papaparse`, `fast-csv`) | Sin evidencia de que resuelvan algo que `csv-parse` no resuelve; `csv-parse` es parte de la familia `node-csv`, ampliamente usada, sin dependencias transitivas propias más allá de Node. |

## Consecuencias

**Más fácil.** El importador no reimplementa RFC 4180; `columns: true` da filas como
objeto header→valor, que es exactamente lo que `staging.ts` necesita para poblar
`raw jsonb`.

**Más difícil.** Una dependencia más en `packages/db`, con su propio ciclo de
actualizaciones bajo R-05. `packages/db` ya no importa exclusivamente `postgres`.

**Costo de revertir:** acotado a `packages/db/src/import/csv.ts`, el único consumidor.
Sustituirlo no exige migrar datos ni tocar el schema de staging — el contrato hacia
`staging.ts` es `AsyncGenerator<Record<string, string>>`, no un tipo de la librería.
