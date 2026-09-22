# Revisión ciega — T-0013 (importador una pasada desde Zoho)

**Procedencia: versionado después del merge**, el 2026-09-22, y se declara así. → R-09b

Este reporte lo produjo el subagente aislado durante T-0013, antes de las correcciones.
`D-0052` exige que el reporte quede versionado en `REVIEWS/`, y eso no ocurrió: T-0013
se mergeó a `main` en el PR #27 sin él. El texto de abajo es el que devolvió el reviewer,
relevado por el owner, incorporado acá **sin reconstruir nada**. Quien lo versiona es
otro agente, no el reviewer.

El estado de cada hallazgo está documentado en `ops/evidence/T-0013.md`, sección
"Corrección posterior a la revisión ciega". **No existe un cierre independiente en frío**
de esos hallazgos: los cerró el mismo agente que los corrigió. Se dice acá en vez de
dejarlo implícito.

---

## Procedimiento seguido

Contrato leído desde `main` (paso 1), diff completo `main...task/T-0013-...` (3 commits,
24 archivos), `DOMAIN.md` §36/§60-66, `decisions.yaml`
(D-0006/8/20/21/23/31/33/34/36/37/38/52/53/55) y sus ADRs, revisados por cuenta propia.
No recibí transcript de implementación. Corrí `## Verification` (`pnpm check`) antes de
abrir `ops/evidence/T-0013.md`: pasó, 86/86 tests en verde, incluidos
`staging.integration.test.ts` (contra Postgres real, fixture sintética) y
`verify-manifest.test.ts`. El comando que corre el import real sobre el lote no se
ejecutó — datos fuera de mi entorno, según las instrucciones — pero confirmé que el
código de `packages/db/src/import/` existe y compila/lintea/testea en verde. Recién
después leí la evidencia.

## Hallazgo central

Verificado leyendo código, no evidencia: en `packages/db/src/import/policies.ts`, la
clasificación `DUPLICATE_INSURER_NUMBER` (líneas ~100-117) agrupa por
`(insurerId, numero)` sólo cuando `numero !== undefined && numero !== ''`; pero la línea
183, al construir la fila a insertar, usa
`fila.raw[CAMPOS_POLIZA.numeroDePoliza]?.trim() ?? fila.source_record_id` — que no cae al
fallback cuando el campo está presente pero vacío (`''.trim()` es `''`, no `undefined`,
así que `??` nunca dispara). Resultado: dos o más filas de origen con la misma
aseguradora resuelta y "Número de póliza" vacío (presente, no ausente) (a) nunca entran
al grupo de duplicados —ninguna excepción se registra— y (b) colisionan en el
`insert into policy ... on conflict (insurer_id, policy_number) do update set
policy_number = excluded.policy_number`, que las fusiona silenciosamente en una sola
Policy. Esto es exactamente lo que `D-0038` prohíbe explícitamente ("el importador no
descarta, no sobrescribe y no fusiona filas para satisfacer el constraint") y lo que
`D-0033` prohíbe en general.

Además, el contador `importadas` de `importarPolizas` se incrementa por cada fila
procesada sin verificar si el INSERT realmente creó una fila nueva, así que en este
escenario reportaría más "importadas" que Policy/PolicyVersion físicas — una discrepancia
silenciosa entre lo que el CLI imprime y lo que `report.ts` mide independientemente
contra la base.

En la corrida real documentada en `ops/evidence/T-0013.md`, `resultadoPolizas.importadas`
(1930, impreso por `load-policies`) coincide exactamente con `polizasImportadas` del
comando `report` (1930, calculado independientemente vía `count(policy_version)`), lo que
sugiere que en este lote específico no hubo filas con aseguradora resuelta y número de
póliza vacío-pero-presente. Pero esa coincidencia es una propiedad de este dataset, no
una garantía del código: nada en el importador ni en los tests impide que una recorrida
futura (dato corregido, nuevo export) dispare el bug sin que ningún test lo hubiera
atrapado, porque no existe ningún test de `policies.ts`.

## Hallazgo estructural, no de una fila

Ninguno de los tres archivos con la lógica de negocio central —`policies.ts`
(clasificación, duplicados, renovación), `catalog.ts` (matching de aseguradoras) ni
`parties.ts` (Party/ContactPoint/membresías)— tiene un test unitario o de integración con
fixtures sintéticas. Sólo existen tests para `failure-classes.ts` (que sólo valida que el
diccionario de motivos no esté vacío, no que la clasificación se aplique correctamente),
`verify-manifest.ts` y la carga de `staging.ts` (serialización jsonb). El escenario del
bug de arriba —y cualquier otro caso borde de
`importarPolizas`/`importarRenovaciones`/`importarCatalogoAseguradoras`— no tiene ninguna
red de regresión ejecutable en CI; sólo la corrida real (evidencia humana, sobre datos que
no se pueden versionar como fixture) la puede detectar, y sólo si el caso borde aparece en
ese lote particular. Éste es precisamente el patrón que motivó la obligatoriedad de R-33
sobre T-0012 (invariantes declaradas cubiertas sin estarlo).

## Act on

1. `packages/db/src/import/policies.ts:107-117` vs `183` — la detección de
   `DUPLICATE_INSURER_NUMBER` y la construcción real de `numero` usan expresiones
   distintas ante "Número de póliza" vacío-pero-presente: la primera excluye esas filas
   del grupo (nunca se marcan como duplicadas), la segunda inserta `numero = ''` y dos o
   más filas de origen se fusionan silenciosamente vía `on conflict ... do update` en una
   sola Policy. Viola `D-0038` y `D-0033` de forma directa. Corregir para que ambas rutas
   traten "vacío" y "ausente" igual (o para que el INSERT nunca ejecute
   `on conflict do update` cuando puede fusionar dos `source_record_id` distintos —
   debería ser un `do nothing` + excepción, no un update silencioso).
2. Falta de tests para `policies.ts`, `catalog.ts` y `parties.ts` — la lógica de
   clasificación, duplicados, matching de aseguradoras y resolución de renovación no tiene
   ningún test con fixture sintética. Dado `riskClass: HIGH` y que el hallazgo #1 es
   exactamente el tipo de caso borde que un test de clasificación con filas sintéticas
   (número vacío, número ausente, dos filas mismo número) habría atrapado sin tocar datos
   reales, agregar esa cobertura antes de mergear, no después.

## Consider

3. `report.ts`/`policies.ts` no reconcilian sus dos conteos de "importadas" entre sí de
   forma automática (uno es un contador de loop, el otro una query independiente a
   `policy_version`); dado el hallazgo #1, sería valioso que el CLI compare ambos y falle
   fuerte si divergen, en vez de que la evidencia humana sea la única red.
4. `verify-idempotency.ts` limita el fingerprint a 11 tablas de dominio y excluye
   deliberadamente `staging_import_exception` (comentario explícito: "por cada tabla de
   dominio", no de staging). Es una elección de diseño razonable dado que staging usa
   upsert por PK, pero significa que la prueba de idempotencia no certifica que el
   conteo/clasificación de excepciones sea estable entre corridas — sólo que el dominio lo
   es. Vale la pena que quede explícito en la evidencia versionada (hoy no lo está) que
   "idempotencia" en este reporte es idempotencia de dominio, no de todo lo que el
   importador escribe.

## Noted

5. `CAMPOS_POLIZA.premio` se declara en `zoho-fields.ts` pero nunca se usa (sólo `prima`);
   no es un bug, sólo mapeo sin consumidor.
6. La migración `0003` agrega unique constraints vía `ALTER TABLE` a `contact_point`,
   `insurer_alias`, `endorsement` y `external_reference`, tablas creadas en `0001`/`0002`.
   En un entorno con datos previos que violaran esas constraints, el `ALTER TABLE`
   fallaría — pero falla fuerte y visible en el momento de aplicar la migración, no en
   silencio; no hay riesgo de corrupción, sólo de una migración que no aplica hasta
   resolver el conflicto. Dado que hoy no existe ningún otro entorno con datos reales en
   esas tablas (T-0013 es la primera importación), el riesgo es hipotético para el futuro,
   no un problema de este PR.
7. El matching de renovación (`importarRenovaciones`) usa `(insurerId resuelto,
   policy_number)` para buscar la predecesora, no el string crudo de aseguradora — como
   `(insurerId, policyNumber)` es único por `D-0038` (constraint física en `policy`), no
   puede enlazar una Policy de una aseguradora real distinta con el mismo número; el peor
   caso de fallo de esta señal es `RENEWAL_UNRESOLVED` (fail-safe), no un enlace
   incorrecto. Dismissed como riesgo de "aseguradora equivocada": la unicidad del par ya lo
   descarta por construcción — excepto que esta garantía depende de que el bug del hallazgo
   #1 no haya fusionado dos Policies distintas bajo esa aseguradora; si el hallazgo #1 se
   dispara, esta garantía se debilita indirectamente. Se deja bajo Noted porque el arreglo
   del #1 ya lo cubre; no es un hallazgo independiente.
8. Ningún log, comentario, mensaje de excepción o campo `detail_code` observado reproduce
   PII (nombre, email, teléfono, domicilio); `detail_code` para `UNKNOWN_INSURER_STRING`
   usa el string de "Compañía" (dato de negocio sobre un proveedor, no de un cliente) y
   para `DUPLICATE_INSURER_NUMBER`/`RENEWAL_UNRESOLVED` usa la clave `insurerId::numero` o
   el número de póliza — no personal. No encontré violación de `D-0053`/R-19.

## Dismissed

- **Orden de iteración de `existing_suppliers_retained` produciendo un Insurer divergente
  entre corridas** (pregunta explícita del brief): el catálogo se lee del mismo archivo
  JSON local en cada corrida (`readFileSync` + `JSON.parse`), y `JSON.parse` preserva el
  orden de un array de forma determinística — no hay fuente de no-determinismo entre
  corridas mientras el archivo no cambie. Además, la idempotencia real no depende del
  orden: `obtenerOCrearPorAlias` busca primero por `(alias, source_system)` en
  `insurer_alias` antes de crear, así que aun con orden distinto el resultado converge al
  mismo Insurer por alias ya existente.
- **NOT NULL / constraints de `policy_version` violados por un caso borde no cubierto**:
  revisé cada columna NOT NULL de `policy_version` (`term_start_date`, `term_end_date` vía
  `UNPARSEABLE_TERM_DATES`; `holder_party_id` vía `MISSING_HOLDER`; `renewal_mode` con
  default explícito `MANUAL`) contra el código de `policies.ts` y todas están cubiertas por
  una clase de excepción o un default seguro antes del INSERT. No encontré una vía de
  escritura que llegue al INSERT con un NOT NULL sin resolver.
- **`OVERLAPPING_VERSION` como clase declarada pero nunca disparada por código**: es cierto
  que no hay lógica explícita de detección de solapamiento en `policies.ts` (sólo un
  `on conflict (policy_id, version_number) do nothing`), pero dado que esta pasada crea
  exactamente una `PolicyVersion` (`version_number = 1`) por Policy, no existe ningún camino
  en el código actual donde dos filas del import intenten crear una segunda versión
  superpuesta para la misma Policy — el EXCLUDE de INV-PV-003 sencillamente no tiene nada
  que rechazar en el alcance de esta tarea. La clase queda declarada para uso futuro (cuando
  exista lógica de versionado desde Endosos, aún no construida por diseño §36/`D-0037`), no
  es una promesa incumplida de esta tarea.

No encontré ningún otro `Act on` más allá del listado. El resto de la implementación
(staging fiel con raw jsonb, `party_source_link` para no re-fusionar Parties entre
corridas, ContactPoint write-only, catálogo cerrado sin creación libre de Insurer,
Endorsement sin derivar versión, `ExternalReference` UNRESOLVED para renovaciones no
resueltas) está alineada con los ADRs citados y pasa tanto la lectura de código como
`pnpm check`.
