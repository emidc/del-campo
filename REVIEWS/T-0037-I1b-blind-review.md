# Revisión ciega R-33 · T-0037 I1b (C3-01b)

**Revisado:** rama `task/T-0037-comparar-lotes` en `e4db926` contra `main` en `35afe09`.
**Revisor:** subagente aislado de Claude Code, sin el transcript ni la justificación de la
sesión que implementó. Recibió el contrato de la tarea leído desde `main`, la fila C3-01b
del plan y el diff completo con tests; buscó `DOMAIN.md` y `decisions.yaml` por su cuenta
y corrió la verificación antes de leer `ops/evidence/T-0037.md`. El revisor no podía
escribir archivos: este reporte es su salida, copiada por la sesión que implementó. La
sección «Cierre» es de esa sesión.

**Veredicto del revisor: ningún Act on.** El criterio de C3-01b se cumple.

## 1. Qué corrió

- `pnpm check` con `DATABASE_URL=postgres://localhost:5432/delcampo_dev`: salida 1,
  `# tests 1483 · pass 1479 · fail 0 · cancelled 4`. Los 4 cancelados son de
  `contexts/communication/src/integration/cloud-api.contract.test.ts` y se reproducen con
  ese archivo solo (Node 22 contra el `>=24` que pide el repo). Docs, decisiones, tareas,
  `tsc` y `eslint` pasan.
- Seis pruebas propias con datos sintéticos, fuera del repo, contra una base propia
  `revision_i1b_demo` creada y borrada:
  - una columna ausente en el anterior y vacía en el nuevo da igual;
  - si el export nuevo deja de traer una columna comparada (`Moneda`) que antes tenía
    valores, todos los registros salen cambiados: `{"c":2,"moneda":2}`;
  - `"N1"` contra `"N1 "` da `cambiados: 1`;
  - un lote nuevo con Pólizas exportadas antes que las del anterior, pero corte global
    posterior, se acepta (`inversion parcial rechazada: false`);
  - un nombre de campo con comilla pasado como `$n` funciona: la consulta está
    parametrizada;
  - `compararLotes` dentro de `sql.begin('read only', …)` sobre datos confirmados da las
    clases y el conteo por campo correctos.
- No corrió el CLI `compare`: `conectar()` sólo acepta `delcampo_t0013_dev` y tenía
  prohibido usarla.

## 2. Hallazgos

### Act on

Ninguno. Clasificación: con `raw not null` y la PK `(batch_id, source_record_id)`, el
`full outer join` deja cada registro en una sola clase. Campos comparados: coinciden uno a
uno con lo que leen `policies.ts`, `parties.ts`, `staging.ts` y `zoho-links/load.ts`, sin
faltantes. No escritura: sólo `SELECT`, y el CLI usa `begin read only`. Sin inyección:
tablas desde una constante, campos y lotes como parámetros. Salida: sólo conteos, fechas y
nombres de columna.

### Consider

1. **Una columna que el export deja de traer cuenta como cambio de dato**
   (`comparar-lotes.ts:120-125`). Si el export nuevo omite `URL drive doc poliza`, todas
   las pólizas con enlace salen cambiadas. El comentario decía lo contrario. Sugerencia:
   informar los campos comparados que no aparecen en un lote, o rechazar.
2. **La inversión sólo se controla con el corte global** (`comparar-lotes.ts:177`). Un
   módulo que retrocede con corte global que avanza invierte nuevos y ausentes de ese
   módulo. Un control por módulo cuesta una línea.
3. **Diferencias sólo de espacios cuentan como cambiado** (`comparar-lotes.ts:125`). Los
   importadores hacen `trim()`; comparar con `btrim` alinearía la comparación con el
   dominio.

### Noted

- La prueba «no escribe» compara `count(*)`: un `UPDATE` pasaría. La garantía real es el
  `SELECT` y el `begin read only` del CLI, que ninguna prueba del repo ejercita.
- `Compañía` sólo llega al dominio como `detail_code` de una excepción; compararlo puede
  inflar cambiados por un renombre de aseguradora. Es inclusión de más.
- `lote-sintetico.ts` vive en `src/` sin sufijo `.test.ts`; lo declara y nada productivo
  lo importa.
- El refactor del helper de pruebas es mecánico; ninguna aserción existente cambió.
- La evidencia usó una base sintética llamada `delcampo_t0013_dev`, creada y borrada.

### Dismissed

- Inyección SQL en `sql.unsafe`: tabla desde constante, campos y lotes parametrizados;
  comprobado con una clave con comilla.
- Choque de claves en `cambiosPorCampo`: ningún módulo repite un campo.
- Fuga en mensajes de error: traen un UUID interno de staging y fechas, nunca crudo.
- Ambigüedad de `jsonb ->> $n`: Postgres resuelve el parámetro a `text`, igual que
  `policies.ts:350`.
- Los 4 cancelados de `pnpm check`: fuera del diff, por Node 22.

---

## Cierre (sesión que implementó, 2026-11-10)

| Hallazgo | Qué se hizo |
|---|---|
| C1 | Un campo comparado que algún lote no trae como columna (`raw ? campo` en ningún registro del lote) no se compara y se informa en `camposSinComparar` por módulo. Comentario corregido. Test: el export nuevo sin `Prima` da 0 cambiados y lista `Prima` |
| C2 | Control por módulo: si en un módulo el nuevo se exportó antes que el anterior, se niega. Test con Pólizas que retroceden y corte global que avanza |
| C3 | Se compara `nullif(btrim(…), '')`. Test: nombres con espacios en los extremos dan iguales |
| Noted | Sin cambio. `Compañía` queda comparado: es el texto que decide `UNKNOWN_INSURER_STRING` (`policies.ts:139`), y un cambio ahí puede cambiar la clasificación de la póliza |
