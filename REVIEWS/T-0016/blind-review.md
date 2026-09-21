# Revisión ciega de T-0016

**Workstream:** BOS  
**PR:** #23, `task/T-0016-busqueda-y-consulta-vs01` contra `origin/main`  
**Procedimiento:** R-33 / D-0052  
**Verdict preliminar:** **STOP**

## Alcance y orden de revisión

El contrato se leyó primero desde `origin/main` con
`git show origin/main:TASKS/T-0016-busqueda-y-consulta-vs01.md`. Después se leyeron
R-33, `DOMAIN.md`, `decisions.yaml` y `SLICES/VS01.md`, y se inspeccionó el diff contra
`origin/main`, excluyendo temporalmente `ops/evidence/T-0016.md`. No se recibió ni se
consultó transcript o resumen del implementador.

Estas conclusiones preliminares quedaron cerradas antes de abrir el archivo de
evidencia. La auditoría de evidencia se agrega luego en una sección separada, sin
reescribir esta parte.

## Verificación independiente previa a la evidencia

Comando contractual:

```bash
DATABASE_URL=postgres://localhost:5432/delcampo_dev pnpm check
```

La primera ejecución llegó correctamente a PostgreSQL y los 15 tests nuevos de
T-0016 pasaron, pero el comando terminó con exit 1 por el test preexistente
`schema.integration.test.ts:1019`: sin advisory lock una de las dos transacciones
detectó el ciclo, mientras el test esperaba que ambas confirmaran. El archivo no fue
modificado por T-0016 y la aserción depende de una intersección temporal que el
`pg_sleep(0.3)` no convierte en barrera.

Una reproducción aislada de los tests de schema y consultas, con acceso autorizado a
localhost, pasó 48/48. Una segunda ejecución completa del comando contractual pasó:
58/58 tests de paquetes, además de documentación, AgentRun, typecheck y lint. Por lo
tanto, el primer rojo es una carrera no determinista preexistente y no evidencia un
fallo funcional de las consultas de T-0016; sí reduce la reproducibilidad del check.

## Conclusiones preliminares

### Act on

#### A1 · La consulta no resuelve la identidad canónica de Parties mergeadas

`searchPolicies` une directamente la versión efectiva con el `party` tomador y sus
profiles (`packages/db/src/policy-query.ts:306-326`); `policiesForParty` exige
`pv.holder_party_id = partyId` (`:529-541`); y `getPartyOverview` devuelve `null` para
cualquier Party `MERGED` mediante `p.status = 'ACTIVE'` (`:560-577`). Las membresías
también devuelven los IDs directos, sin resolver la cadena (`:581-610`).

Esto contradice D-0004, `DOMAIN.md` §8 e INV-002: las referencias históricas pueden
seguir apuntando al ID perdedor y los consumidores que necesitan identidad deben
resolver `mergedIntoPartyId` hasta la Party canónica. En un estado válido de la base,
una Policy puede seguir referenciando al tomador perdedor; entonces la ficha de la
Party canónica omite la Policy, la ficha del perdedor desaparece y una búsqueda por
los datos de la canónica tampoco recupera esa Policy. No es un borde hipotético: la
preservación de referencias es la razón expresa de D-0004.

Antes de mergear se debe definir e implementar resolución canónica consistente en
búsqueda, detalle de tomador y navegación de membresías, y agregar pruebas con merge
de uno y varios saltos que demuestren que no se pierden Policies ni se presentan dos
identidades como distintas.

#### A2 · El detalle no puede mostrar el motivo de un vínculo documental ausente

`PolicyDetail` sólo expone Policy, insurer, holder, versiones y `DocumentLink`
(`packages/db/src/policy-query.ts:83-92`). `getPolicyDetail` consulta exclusivamente
versiones y filas existentes de `document_link` (`:400-493`); no consulta ni expone
`ExternalReference` o `unresolvedReason`. El test de forma incluso fija esa omisión
como resultado esperado (`policy-query.integration.test.ts:310-335`).

El contrato referenciado por la tarea exige el recorrido de `SLICES/VS01.md` §2, que
debe distinguir el problema documental, y `DOMAIN.md` §63 establece que
`ExternalReference` aparece en VS01 precisamente como motivo visible de un vínculo
ausente. Una Policy sin `DocumentLink` hoy produce solamente `documents: []`; no se
puede distinguir `NOT_REFERENCED`, una referencia no resuelta ni otra causa conocida.

Antes de mergear hay que cerrar la brecha de contrato. Si el schema actual de
`external_reference` no permite asociar inequívocamente el motivo a la Policy, eso es
una dependencia faltante que debe resolverse mediante la tarea/decisión apropiada, no
silenciarse marcando T-0016 como `DONE`. La prueba necesaria debe insertar una causa
no resuelta sintética y verificar que el detalle la conserva y la distingue de ausencia
sin referencia.

#### A3 · La navegación temporal de membresías trunca timestamps con una semántica inconsistente

La API acepta sólo `YYYY-MM-DD`, pero `organization_membership.valid_from/valid_to`
son `timestamptz`. Las consultas convierten ambas columnas a `date`
(`packages/db/src/policy-query.ts:591-593` y `:606-608`). Una membresía que empieza a
las 23:59 queda presentada como activa durante todo ese día; una que termina a las
23:59 desaparece durante todo ese mismo día. El resultado también depende de la zona
horaria de la sesión al hacer el cast.

La fixture sólo prueba una membresía abierta creada con el default `now()` y no mide
ninguno de los dos límites. Esta elección temporal no está en `decisions.yaml` ni en el
contrato. Antes de mergear se debe fijar qué instante representa la fecha de consulta
y comparar intervalos sin truncar las columnas, o declarar y probar una semántica
diaria coherente. No corresponde resolver esa ambigüedad incidentalmente en SQL.

### Consider

#### C1 · `documents.state = LINKED` no distingue enlaces utilizables de problemas documentales

El resumen marca `LINKED` cuando existe cualquier fila y cuenta todas por igual
(`packages/db/src/policy-query.ts:246-255`, `:302-303`, `:525-526`). Por tanto, una
Policy cuyo único `DocumentLink` está `MISSING`, `PERMISSION_ERROR` o `UNKNOWN` se
presenta igual que una con un enlace `SYNCED`. El detalle conserva
`reconciliationStatus`, de modo que la información no se pierde por completo, pero el
estado resumido invita a interpretarlo como acceso disponible. Conviene que el
contrato del resumen haga visible el problema o use un nombre que sólo afirme
"existe referencia". No hay prueba para esos estados.

#### C2 · La consulta no aporta la fecha del lote

`SLICES/VS01.md` §2 exige informar la fecha del lote para no aparentar datos en vivo.
`asOf` selecciona la PolicyVersion efectiva y no es metadata de snapshot; el resultado
no devuelve batch o fecha de lote. T-0013 todavía debe concretar esa procedencia, pero
T-0016 no registra la dependencia ni deja un contrato de salida preparado para que la
superficie posterior cumpla este punto. Debe quedar explícitamente asignado antes de
usar estas consultas en la app.

#### C3 · El check contractual contiene una carrera no determinista preexistente

El primer `pnpm check` falló y la repetición pasó sin cambios. El fallo está en la
demostración causal de BR-001 de T-0012, no en el diff de T-0016, por lo que no se
atribuye como regresión funcional. Aun así, un check que puede alternar rojo/verde
debilita R-07 y debería reemplazar el `sleep` por sincronización determinista en una
tarea separada.

#### C4 · La ausencia de límite evita truncar ambigüedades, pero deja riesgo de escala

La consulta no aplica `LIMIT`, ranking ni selección implícita, por lo que hoy conserva
todos los candidatos y satisface el contrato de ambigüedad. Con el lote real puede
crecer el costo de búsquedas parciales. Si se agrega paginación más adelante, el total
y la continuidad deben ser explícitos: un `LIMIT` silencioso reintroduciría el defecto
que el contrato prohíbe.

### Noted

- Los siete campos de §65 están implementados y probados, incluida la búsqueda por
  alias de aseguradora. Los criterios se combinan con `AND`.
- Cero resultados se representa como `NO_RESULTS` con lista vacía. Tanto una
  coincidencia como varias se devuelven bajo `CANDIDATES`; no existe
  `selectedPolicyId`, ranking ni truncamiento.
- La Policy sin `DocumentLink` permanece en resultados y en detalle; los joins hacia
  documentos no eliminan la fila de Policy.
- La selección de `PolicyVersion` usa correctamente el intervalo semiabierto
  `[effectiveFrom, effectiveTo)` mediante `<= asOf` y `effective_to > asOf`.
- El diff no agrega HTTP, servidor, rutas, listener ni otra superficie pública. Sólo
  exporta funciones de consulta desde `packages/db`, por lo que no adelanta T-0018.
- Las fixtures nuevas son sintéticas, usan valores rotulados como tales y URLs
  `example.invalid`; se ejecutan en transacciones revertidas. No se observó PII real.
- No se agregaron dependencias ni migraciones de schema. El cambio global de
  `--test-concurrency=1` serializa archivos para evitar interferencia sobre la misma
  base mutable; no oculta ningún test.

### Dismissed

#### D1 · `getPolicyDetail` devuelve toda la historia aunque `atDate` sea anterior

Descartado como defecto: `atDate` elige la versión efectiva derivada, mientras
`history` reconstruye todas las versiones conocidas, que es precisamente INV-013.
`DOMAIN.md` §2.7 rechaza adoptar bitemporalidad como baseline, de modo que no existe
un contrato de "estado del conocimiento a esa fecha" que obligue a ocultar versiones
registradas después.

#### D2 · Exponer `coverageData` resuelve D-0025 por la puerta de atrás

Descartado: el tipo de salida es `unknown`, no hay claves, interpretación ni default,
y D-0050 ya aceptó el contenedor físico `jsonb` opaco. La consulta transporta ese valor
sin convertirlo en una representación semántica de cobertura; D-0025 permanece OPEN.

#### D3 · Buscar por empresa debería expandir automáticamente las Policies de sus contactos

Descartado: §16 define Empresa como la Party `ORGANIZATION` y §65 fluye Party →
Policies. La navegación hacia contactos existe por separado mediante
`OrganizationMembership`; el contrato no afirma que las Policies personales de cada
contacto sean Policies de la empresa. Expandirlas automáticamente mezclaría la
relación organizacional con el tomador contractual que D-0036 mantiene separado.

## Verdict preliminar

**STOP.** El comportamiento feliz y las verificaciones nuevas son sólidos, pero A1
puede ocultar Policies en estados válidos del dominio, A2 deja incumplida una excepción
explícita del recorrido VS01 y A3 fija una semántica temporal no especificada. Los tres
requieren resolución antes del merge; un check verde no los cubre.

## Auditoría separada de Evidence

Esta sección se escribió después de cerrar todo el preliminar anterior. La lectura de
`ops/evidence/T-0016.md` no modificó ni recategorizó los hallazgos previos.

### Evidence · Act on

#### E-A1 · La evidencia no demuestra tres comportamientos materiales que el reporte marca STOP

El run literal prueba los casos que los tests declaran, pero ni los tests ni la
observación externa ejercitan:

1. una Policy cuyo holder directo es una Party `MERGED` y debe resolverse hacia su
   canónica (A1);
2. una ausencia documental con `ExternalReference.unresolved_reason`, o siquiera un
   `DocumentLink` con `MISSING`/`PERMISSION_ERROR` (A2/C1);
3. una `OrganizationMembership` que empieza o termina dentro del día consultado, bajo
   una zona horaria fijada (A3).

La observación externa inserta una Policy sin `document_link` y repite el conteo
correlacionado de la implementación; demuestra `NO_LINK = 0`, pero no distingue por qué
falta el vínculo ni somete las ramas omitidas a una causa independiente. En
consecuencia, la evidencia no respalda el `DONE` frente a esos tres estados válidos del
dominio. Debe ampliarse junto con las correcciones, no sólo volver a capturar el mismo
run verde.

### Evidence · Consider

#### E-C1 · El SQL de la observación externa no quedó disponible para reproducción

La salida referencia `/private/tmp/t0016-observation.sql`, pero el archivo no forma
parte del artefacto y la evidencia sólo resume su contenido. La salida literal permite
ver qué declaró `psql`, no inspeccionar si el SQL fue realmente equivalente a la
consulta productiva ni repetir exactamente la observación. Para una comprobación de
borde futura conviene incluir el SQL literal en el bloque o usar un script versionado
sin datos sensibles.

### Evidence · Noted

- Cumple la estructura de R-09b: procedencia, SHA base, SHA verificado de rama,
  constancia explícita de ausencia de `runId`, comando con salida textual, observación
  externa y límites conocidos.
- La salida registrada termina en exit 0 con 58/58 tests de paquetes, typecheck y lint
  verdes. Mi segunda ejecución completa obtuvo el mismo conteo 58/58. El primer fallo
  no determinista de mi revisión no aparece en Evidence y no invalida que el run
  registrado haya sido verde.
- Evidence verificó `fe4487960370bf26c6650b75c349076c10363325`; el HEAD revisado es
  `b7a0b34abcd9d9b699d7a594b0cd3828b4a9ebc5` porque luego se agregaron la evidencia y
  un merge documental desde `main`. No cambiaron `package.json` ni los archivos de
  implementación/tests de T-0016 entre esos SHAs. El check local sobre HEAD pasó.
- La evidencia declara correctamente que no ejecutó CI en ese momento. Durante esta
  revisión, `gh pr checks 23` devolvió `check: pass` para el job
  `106514609089`; esto confirma el estado remoto actual, no reemplaza la verificación
  local ni amplía la cobertura semántica.
- Declara de manera honesta que no usó datos reales, el lote de T-0013, UI, auth,
  Drive, fecha visible del lote, variantes de collation ni performance. Esos límites
  no están maquillados como verificación.
- La inspección de superficie pública coincide con la independiente: no hay listener,
  framework HTTP o ruta nueva y D-0022 permanece OPEN.

### Evidence · Dismissed

#### E-D1 · El SHA de Evidence es inválido porque no coincide con el HEAD actual

Descartado como defecto de procedencia: R-09b pide el SHA sobre el que se ejecutó el
comando, no un SHA reescrito después. El commit de evidencia necesariamente es
posterior al run y el merge posterior sólo incorporó documentación/decisiones de
T-0013. La diferencia está identificada y la repetición independiente sobre HEAD fue
verde.

#### E-D2 · La ausencia de datos reales vuelve insuficiente la evidencia de T-0016

Descartado: el contrato de la tarea exige base de prueba con fixtures sintéticas y
prohíbe consultar datos externos. Los veinte casos reales pertenecen a T-0018 y la
autorización excepcional de D-0053 está limitada a T-0013. Usar datos reales aquí no
fortalecería la evidencia; violaría el alcance y R-19.

## Verdict final

**STOP — 3 Act on preliminares y 1 Act on de Evidence.** La evidencia es trazable y
los checks están verdes, pero confirma solamente los casos felices que los tests
codifican. Antes del merge deben resolverse la identidad canónica de Parties mergeadas
(A1), el motivo visible de ausencia documental mediante `ExternalReference` (A2) y la
semántica temporal de `OrganizationMembership` (A3), y luego ampliar la evidencia para
ejercitar causalmente esos estados (E-A1).
