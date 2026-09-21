---
id: T-0013
title: Importar las pólizas y las partes desde el export de Zoho
kind: MIGRATION
status: READY
workstream: MIG
riskClass: HIGH
size: L
created: 2026-09-08
blockedBy: [T-0012]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, REVIEWS/T-0004-insumos-vs01.md]
decisionRefs: [D-0006, D-0008, D-0020, D-0021, D-0023, D-0053]
---

## Why

Sin datos reales dentro del schema, VS01 no es útil para nadie y las invariantes no se
contrastaron contra la realidad. Es también donde `D-0020` deja de ser teórico: si el
import no puebla `ContactPoint`, los emails y teléfonos se descartan y hace falta una
segunda migración.

## Outcome

Un import repetible e idempotente desde el export declarado por T-0004 puebla `Party` y
sus perfiles, `ContactPoint` en modo write-only con su linaje de origen, `Insurer` desde
la lista curada con matching por alias, `Policy` y `PolicyVersion`, y reconstruye la
cadena de renovación con `renewedFromPolicyId` donde los datos lo permiten.

Las filas no importables se clasifican y se cuentan por clase de fallo. El reporte hace
visible cuántas pólizas quedan fuera de cada join hacia atrás, como exige `D-0008`. Los
strings de aseguradora desconocidos se reportan para resolución humana y **no** crean
`Insurer` nuevas, como exige `D-0021`.

Correr el import dos veces sobre la misma entrada produce el mismo estado.

**El circuito de datos es el que autoriza `D-0053`.** La entrada es el lote preservado e
identificado por T-0004, verificado contra su manifiesto antes de importar. El lote, sus
derivados, staging y la base local viven en la máquina del owner, bajo su custodia; los
originales se conservan sin modificaciones y los datos reales quedan fuera del versionado
y de CI. El agente lee el lote y escribe en staging y en la base local; no accede a Zoho
ni a Drive.

La reconciliación se hace contra ese lote y no contra el estado de Zoho en un instante:
las fechas de exportación difieren entre módulos, así que **no se afirma que exista un
snapshot transaccional común**, y ninguna conclusión de esta tarea puede apoyarse en que
lo haya.

## Non-scope

- No se escribe en Zoho ni en Drive: la lectura es de solo lectura y por vía humana
  autorizada.
- No se limpian ni se corrigen los datos de origen.
- No entra PII al repositorio ni a los logs, ni al texto de tareas, reportes o código.
  El repositorio recibe código, conteos agregados y clases de fallo. **Sí entra al
  contexto del agente**, que es la excepción acotada que `D-0053` autoriza y que R-19
  prevé: se limita a los datos mínimos necesarios, con preferencia por consultas acotadas
  y resultados agregados sobre la lectura de registros completos.
- No se tocan los cuatro límites de R-19 que la excepción no alcanza: ni credenciales ni
  secretos al contexto; las categorías especialmente sensibles siguen prohibidas para
  modelos externos y, si aparecen, se excluyen y se derivan a revisión humana; ninguna
  PII en logs, tareas, reportes ni código; y la trazabilidad se registra sin reproducir
  datos personales.
- La autorización no se extiende a otro modelo, a otro proveedor ni a otra tarea. Un
  cambio de cualquiera de los tres exige autorización nueva, no una lectura generosa de
  ésta.
- No se resuelve identidad desde `ContactPoint` — `D-0020`, write-only.
- No se fusionan Parties automáticamente: el matching no es merge, `DOMAIN.md` §61.
- No se importa ningún campo cuya semántica T-0004 haya dejado como desconocida.

## Verification

```bash
# En CI y sin el lote: el repositorio sigue siendo válido y el código, verificable.
pnpm check
```

`pnpm check` **no** ejecuta el import sobre el lote real y no puede: los datos reales no
entran al versionado ni al runner. La corrida real es local y llega al repositorio como
evidencia con conteos agregados, nunca como fixture. Un verde de CI en esta tarea prueba
menos de lo habitual, y por eso las comprobaciones de abajo no son un complemento sino el
grueso de la verificación.

Comprobaciones humanas:

- [ ] El lote se verificó contra su manifiesto de T-0004 antes de importar, y coincide.
- [ ] El import corrió de punta a punta sobre el lote real, no sobre una muestra.
- [ ] El import corrido dos veces sobre la misma entrada deja la base en el mismo estado.
- [ ] Los conteos de clasificación —vigentes, históricas, duplicadas, no clasificables—
      coinciden con los denominadores declarados por T-0004.
- [ ] Los strings de aseguradora no resueltos aparecen en el reporte y ninguno creó una
      `Insurer`.
- [ ] Las cadenas de renovación reconstruidas se verifican a mano sobre una muestra, y
      las no reconstruibles quedan contadas, no inventadas.
- [ ] Un diff del PR confirma que no ingresaron datos de clientes al repositorio: ni en
      código, ni en fixtures, ni en el texto de la evidencia, ni en un mensaje de commit.
- [ ] Los runs de esta tarea en `ops/runs/` declaran `provider` y `providerRaw.model`
      coincidentes con los que `D-0053` autoriza.

## Data effects

Lee el lote real de clientes preservado por T-0004 y escribe en staging y en la base
local, las dos en la máquina del owner y bajo su custodia. Los originales del export no
se modifican. No modifica Zoho ni Drive, y no accede a ninguno de los dos.

El contenido leído por el agente puede enviarse a Anthropic como contexto. Eso es una
divulgación aceptada a conciencia bajo `D-0053`, no un efecto colateral, y su mitigación
es el límite de datos mínimos necesarios, no una promesa de prudencia. Es además la única
parte de esta tarea que **no es reversible**: la base se recrea desde cero y el lote se
vuelve a extraer del original intacto, pero lo enviado como contexto no se puede
des-enviar.

El repositorio recibe únicamente código y métricas agregadas. Si no puede garantizarse esa
separación, la tarea se detiene y registra la limitación en vez de continuar con datos
mezclados.

## Notes

**Inputs requeridos — bloquean el pase a `READY`.** Esta es la tarea con más
dependencia humana de las diez.

Q-13 respondida: el catálogo curado de aseguradoras y su tabla de alias los produce
T-0004, cuyo `## Outcome` se amplió para incluirlos. Esta tarea los consume; no los
inventa.

**Q-14 respondida por el owner el 21/09/2026.** Ya no bloquea: la tarea pasa a `READY`.

El owner generó y descargó los ZIP/CSV de Zoho y confirma que el lote incluye todos los
registros. T-0013 usa el lote preservado e identificado por T-0004, verificado contra su
manifiesto. Export, derivados, staging y base local viven en su máquina, bajo su usuario
habitual y su custodia; los originales se conservan sin modificaciones; los datos reales
quedan fuera del versionado y de CI.

Autorizó explícitamente, como excepción justificada a R-19 y sólo para esta tarea, que un
agente de desarrollo acceda a los datos reales necesarios para implementar, ejecutar y
verificar la importación y diagnosticar sus fallos, con proveedor y modelo nombrados, y
entendiendo que el contenido leído puede enviarse a Anthropic como contexto. La
justificación es que el valor del importador está en cómo trata las anomalías del lote
real, que una muestra sanitizada no conserva. El alcance completo, sus límites y lo que
esta autorización **no** cubre están en `D-0053` y en su ADR; el `## Outcome`, el
`## Non-scope`, el `## Verification` y el `## Data effects` quedaron actualizados para
reflejarlo.

La limitación de T-0004 sobre las fechas de exportación distintas se conserva: no hay
snapshot transaccional común y ninguna conclusión de esta tarea puede apoyarse en que lo
haya.

**Es `MIGRATION` y `riskClass: HIGH`.** Su PR pasa por revisión ciega antes del merge, que
ya no es opcional —`D-0052`, `R-33`—, y el reviewer corre bajo las mismas condiciones de
proveedor y modelo que `D-0053` autoriza, porque un reviewer que no puede ejecutar
`## Verification` estaría revisando la documentación de la tarea y no la tarea.

**Estas cuatro secciones se modificaron en una rama con prefijo exento**, según el
procedimiento que T-0005 dejó: el contrato se cambia antes de implementar y desde fuera
de la rama que lo implementa. A partir del merge de este PR quedan congeladas contra el
merge-base y la rama `task/T-0013-…` no las va a poder tocar.
