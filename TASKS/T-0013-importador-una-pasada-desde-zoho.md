---
id: T-0013
title: Importar las pólizas y las partes desde el export de Zoho
kind: MIGRATION
status: DRAFT
workstream: MIG
riskClass: HIGH
size: L
created: 2026-09-08
blockedBy: [T-0012]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, REVIEWS/T-0004-insumos-vs01.md]
decisionRefs: [D-0006, D-0008, D-0020, D-0021, D-0023]
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

## Non-scope

- No se escribe en Zoho ni en Drive: la lectura es de solo lectura y por vía humana
  autorizada.
- No se limpian ni se corrigen los datos de origen.
- No entra PII al repositorio, a los prompts ni a los logs — R-19. El repositorio recibe
  código, conteos agregados y clases de fallo.
- No se resuelve identidad desde `ContactPoint` — `D-0020`, write-only.
- No se fusionan Parties automáticamente: el matching no es merge, `DOMAIN.md` §61.
- No se importa ningún campo cuya semántica T-0004 haya dejado como desconocida.

## Verification

```bash
pnpm check
```

Comprobaciones humanas:

- [ ] El import corrido dos veces sobre la misma muestra deja la base en el mismo estado.
- [ ] Los conteos de clasificación —vigentes, históricas, duplicadas, no clasificables—
      coinciden con los denominadores declarados por T-0004.
- [ ] Los strings de aseguradora no resueltos aparecen en el reporte y ninguno creó una
      `Insurer`.
- [ ] Las cadenas de renovación reconstruidas se verifican a mano sobre una muestra, y
      las no reconstruibles quedan contadas, no inventadas.
- [ ] Un diff del PR confirma que no ingresaron datos de clientes al repositorio.

## Data effects

Lee un export de datos reales de clientes y escribe en base local. No modifica Zoho ni
Drive. El repositorio recibe únicamente código y métricas agregadas. Si no puede
garantizarse esa separación, la tarea se detiene y registra la limitación en vez de
continuar con datos mezclados. Reversible recreando la base desde cero.

## Notes

**Inputs requeridos — bloquean el pase a `READY`.** Esta es la tarea con más
dependencia humana de las diez.

Q-13 respondida: el catálogo curado de aseguradoras y su tabla de alias los produce
T-0004, cuyo `## Outcome` se amplió para incluirlos. Esta tarea los consume; no los
inventa.

- **Q-14 · ¿Por qué vía llega el export y quién lo produce?** El agente no tiene acceso a
  Zoho, y por R-19 probablemente no deba tenerlo. Hace falta saber qué formato tiene el
  export, quién lo genera, dónde vive mientras se usa y si el agente ve datos reales en
  algún momento o trabaja siempre contra una muestra sanitizada. La respuesta cambia el
  `## Outcome` y toda la sección `## Data effects`.
