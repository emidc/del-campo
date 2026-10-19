# T-0032 — Acta de aceptación de RO01 (Risk OS v1)

**Estado: borrador, sin medir.** Lo preparó el agente el 2026-10-17 con la estructura de
RO01 §6; los valores los completa el owner con las salidas de los scripts. Hasta que el owner
lo firme, RO01 no está aceptado.

Reglas del acta (RO01 §6, protocolo 8; CO01 §4): un fallo no se reemplaza ni se borra; los
umbrales no bajan después de medir; una aceptación con alcance reducido sólo puede ser una
excepción explícita del owner, escrita como tal acá. Nada de este archivo lleva valores de
las históricas, URLs ni credenciales (R-18, R-19): sólo códigos (H1 a H5, R1), conteos,
fechas, `regla_id`, prefijos de huella e ids opacos de riesgo y de revisión.

## Decisiones del owner (2026-10-17)

Tomadas antes de medir; rigen la medición y no se cambian después (CO01 §4):

1. Los disparadores de reapertura comparan el orden previo con el ranking que Risk OS daba
   cuando R1 lo registró, con lo cargado hasta ese momento.
2. A8a exige el orden previo completo (todos los riesgos y padres de la empresa) y una banda
   en cada posición.
3. A11 se recorre en local con las 8 sintéticas. Preview no es requisito y queda sin
   variables.
4. `login_fallido` queda insert-only, sin tope ni purga, durante Q4 de 2026: el owner acepta
   ese riesgo (cierre de la revisión ciega, hallazgo 11).

## Resumen

| # | Medida | Cómo se mide | Valor medido | Cumple |
|---|---|---|---|---|
| A1 | Sintéticas | Tests en CI (abajo) | | |
| A2 | Inválidos | Tests en CI | | |
| A3 | Reimportación | Tests en CI | | |
| A4 | Escritura incompleta | Tests en CI | | |
| A5 | Actualización interrumpida | Tests en CI | | |
| A6 | Históricas | Informes sin valores del importador + `aceptacion` | | |
| A7 | Ciclos | `aceptacion` | | |
| A8 | Revisión profesional | `aceptacion` (a, b, c) + disparadores | | |
| A9 | `C_raw` nunca solo | Tests en CI + `aceptacion` sobre las históricas + recorrido del owner | | |
| A10 | Reglas de presentación | Tests en CI + recorrido del owner | | |
| A11 | Vistas | Recorrido local del owner con las 8 sintéticas y la lista de `apps/risk/README.md` | | |
| A12 | Historial | `aceptacion` | | |
| A13 | Sin datos reales fuera de su lugar | Revisión del owner | | |

**Resultado:** pendiente.

## Despliegue (protocolo 1)

- SHA del deployment de Production: pendiente.
- Salida de `db:verificar --hosteada` con `risk_app`: pendiente.
- `curl` sin credencial y con credencial inválida (`docs/despliegue/vercel-risk.md` §4):
  pendiente.
- Preview sin variables (§3, decisión 3): pendiente.

## A1 a A5, A9 y A10: lo mecánico (protocolo 2)

La salida literal de CI del commit de `main` que queda desplegado, de estos tests:

| Criterio | Test |
|---|---|
| A1 | `contexts/risk/src/application/importar.integration.test.ts` («entran con 0 rechazos, 84, 10 y 33 filas, y los mismos 103 avisos…», «los derivados calculados desde la base coinciden con regresion-emi41.csv en los 59 objetos»); `src/domain/regresion.test.ts` |
| A2 | `importar.integration.test.ts` («A2: cada caso inválido da exactamente su error y no escribe nada») |
| A3 | `importar.integration.test.ts` y `importar-confirmado.integration.test.ts` («A3: reimportación…», RV-ID-02) |
| A4 | `importar-confirmado.integration.test.ts` («A4: una falla a mitad de la escritura no deja nada») |
| A5 | `actualizacion.integration.test.ts` («una falla a mitad de cada operación deja la base como estaba (RO01 A5)») |
| A9, A10 | `vistas.integration.test.ts` y `apps/risk/src/vistas/paginas.integration.test.ts` (reglas 1 a 7), `src/domain/lectura.test.ts`, `src/application/index.test.ts` |

Pendiente: la salida de CI.

## A11: vistas con las sintéticas (protocolo 3)

En local, como en T-0030 (decisión 3). Por vista, si muestra lo de la lista: pendiente.

## A6: históricas (protocolo 4)

Preparación según `docs/despliegue/preparacion-datasets-risk.md`: revisión y aprobación
del dataset por el owner, validación local y backup antes de importar: pendiente.
La trazabilidad y aprobación de cada lote se conservan privadamente, sin valores aquí.

El informe sin valores de **cada** intento de cada empresa, rechazados incluidos, tal como lo
imprime `import … --hosteada`:

- H1: pendiente.
- H2: pendiente.
- H3: pendiente.
- H4: pendiente.
- H5: pendiente.

## A8a: orden previo (protocolo 5)

Material ciego preparado por el owner fuera del repositorio. Por empresa, la fecha del orden
previo de R1 y la de su primer acceso a resultados salen del script. Que R1 es distinto del
evaluador original lo confirma el owner: pendiente.

## Medición (protocolo 7)

La salida entera de `pnpm --filter @del-campo/risk run aceptacion <manifiesto> --hosteada`,
con la fecha y el SHA de `main` con que se corrió:

```
pendiente
```

Disparadores de reapertura (dossier de la Fase 13, §5), para EMI-44 y D14: la adjudicación
de cada par invertido (si es tercer caso o no) la hace el owner y va acá: pendiente.

## A13

Criterio actualizado por D-0070 el 2026-10-19; no es evidencia retroactiva.
Confirmaciones del owner, todavía sin medir:

- Secretos y credenciales sólo en su almacenamiento autorizado: pendiente.
- Repositorio, acta, informes y evidencias públicas sin documentos, CSV ni valores
  reales; outputs versionados sin valores de las históricas: pendiente.
- Procesamiento IA dentro de la función y categorías autorizadas por D-0070, con
  proveedor y modelo aprobados previamente y auditoría privada de R-19: pendiente.
- Sin PII personal innecesaria ni datos personales especialmente sensibles prohibidos
  en lo enviado al modelo; incidentes tratados como hechos operacionales: pendiente.

La autorización exacta de proveedor/modelo sigue bloqueante según D-0070. La firma
no se deduce de haber agregado este criterio ni de haber pasado los checks.

## Firma

Owner: pendiente. Fecha: pendiente.
