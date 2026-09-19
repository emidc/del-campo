---
id: T-0004
title: Medir los insumos reales de VS01
kind: REVIEW
status: DONE
workstream: MIG
riskClass: MEDIUM
size: M
created: 2026-09-08
closed: 2026-09-19
blockedBy: []
contextRefs: [PROJECT.md, DOMAIN.md, ENGINEERING_RULES.md, decisions.yaml, REVIEWS/T-0004-insumos-vs01.md, REVIEWS/T-0004-drive-validation.md]
decisionRefs: [D-0005, D-0009, D-0019, D-0020, D-0021, D-0031, D-0032]
---

## Why

VS01 depende de identificar las pólizas que deben conservarse y de conocer las
limitaciones de sus referencias documentales. Este discovery transforma los exports
reales de Zoho y una muestra declarada de Drive en insumos revisables, sin convertir
supuestos de automatización en requisitos de implementación. El cierre documental
aprobado se registra en D-0031 y D-0032.

## Outcome

Existe el informe agregado y reproducible `REVIEWS/T-0004-insumos-vs01.md` que:

- identifica el origen de Policy, los campos de inclusión y el scope final aprobado,
  con entidades, cantidades, reglas y excepciones verificables;
- distingue significado confirmado por el usuario, hechos observados y dudas
  técnicas que deberán verificarse antes de implementar el importador;
- registra la curación humana de los 15 IDs huérfanos de Productos y 13 de
  Proveedores en scope, con trazabilidad y mapeos exactos de importación en artefactos
  locales; conserva la clasificación derivada o pendiente de los 37 Proveedores;
- define la estrategia de migración documental con limitaciones observadas mediante
  muestra y tratamiento explícito de conciliación asistida, según D-0032;
- clasifica las excepciones y distingue limitaciones de discovery de bloqueos
  operativos para una futura migración; y
- registra el trabajo diferido y la evidencia que permite cerrar discovery.

El informe versionable contiene únicamente métricas agregadas, códigos de revisión y
referencias internas sin PII. Labels e IDs de catálogos, clientes y referencias Drive
permanecen en artefactos locales ignorados por Git.

## Non-scope

- No se ejecuta migración ni se implementa importador, staging, exception queue,
  schema, búsqueda, UI o cambios de arquitectura/producto.
- No se crean Productos/Proveedores ni se ejecutan merges. La curación aprueba
  disposiciones y mapeos para trabajo posterior, sin matching por similitud.
- No se modifican Zoho ni Drive; no se crean carpetas ni se alteran permisos.
  El cierre usa únicamente la muestra existente, sin nuevas consultas externas.
- No se exige demostrar vinculación automática general Policy-documento histórico,
  conformidad general de naming ni acceso operativo a todas las carpetas: D-0032.
- No se resuelven las contradicciones de dominio identificadas para Architecture
  Alignment Review / T-0015 ni decisiones OPEN.
- No se incorporan ZIP, CSV, PII ni referencias a clientes al contenido versionado,
  prompts o logs. Se preservan los exports locales y su evidencia anterior.

## Verification

```bash
pnpm check
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/tests -p 'test_*zoho*.py'
git diff --check
git check-ignore data/zoho-export-2026-09-16/original-zips/
git check-ignore REVIEWS/T-0004-catalog-reconciliation.md
git check-ignore data/zoho-export-2026-09-16/profile/catalog-curation-approved-20260919.local.json
git check-ignore data/zoho-export-2026-09-16/profile/drive-validation-observed-20260919.local.json
test -z "$(git ls-files -- data/)"
```

Comprobaciones de cierre, respaldadas por el informe y la aprobación humana explícita:

- [x] Universo, fecha de observación, denominadores y método de selección de la
      muestra están declarados; no se presenta la muestra como censo de Drive.
- [x] El inventario separa hechos, reglas confirmadas y dudas de implementación;
      scope, identidad fiscal y excepciones conservan las decisiones aprobadas.
- [x] La evidencia distingue inclusión, exclusión, fechas no clasificables y
      duplicación técnica/contractual sin exponer datos identificatorios.
- [x] Los 28 huérfanos en scope tienen disposición humana explícita: Productos
      14 NEW_ENTITY / 1 SAME_ENTITY; Proveedores 10 NEW_ENTITY / 3 SAME_ENTITY;
      0 ALIAS_OF y 0 REVIEW en ambos grupos. Se preservan source IDs y mapeos exactos.
- [x] Las restantes entradas de los 37 Proveedores conservan clasificación derivada
      o pendiente explícita; no se transforman por inferencia en aseguradoras.
- [x] La estrategia documental está definida y aprobada: muestra de 24 entidades,
      9 carpetas accesibles, 15 no accesibles bajo la identidad utilizada;
      404 no prueba inexistencia. Conciliación asistida y limitaciones explícitas.
- [x] El trabajo diferido está registrado y no se exige para cerrar discovery.
- [x] Diff y artefactos agregados revisados: sin ZIP/CSV/PII ni referencias concretas
      de clientes; curación y muestra permanecen ignoradas.

## Data effects

Solo documentación y artefactos locales de curación aprobada. Los originales y la
muestra de Drive se conservan sin cambios. La aprobación documental NEW_ENTITY o
SAME_ENTITY no crea, fusiona ni modifica entidades en origen o destino. No hay
consultas nuevas a Drive ni cambios de permisos. Sin commit ni publicación en esta
pasada; el usuario revisa el resumen de cambios antes de cualquier commit posterior.

## Evidence

- Informe final: `REVIEWS/T-0004-insumos-vs01.md`, recomendación CLOSE.
- Muestra y limitaciones: `REVIEWS/T-0004-drive-validation.md`.
- Curación local: `REVIEWS/T-0004-catalog-reconciliation.md` y
  `data/zoho-export-2026-09-16/profile/catalog-curation-approved-20260919.local.json`.
- Scope medido: `data/zoho-export-2026-09-16/profile/migration-closure-analysis-20260919T154335353110Z.md`.
- Verificación ejecutada al cierre: `pnpm check`, 10 tests existentes de Zoho,
  checks de privacidad, ignorados, integridad y consistencia de curación.

## Closure

Cierre: **2026-09-19**, por instrucción humana explícita, según D-0031/D-0032.
Se reemplazó el exit criterion de automatización general Policy-documento por
estrategia documental definida, muestra con limitaciones y conciliación asistida.
No se declara que la automatización ni la validación operativa estén implementadas.

Limitaciones retenidas: exports operativos del 16/09 y catálogos del 18/09 sin
garantía transaccional común; completitud no certificada; semántica técnica de
lookups/Created_Time y zona horaria pendiente antes del importador. Son inputs
explícitos de trabajo posterior, no evidencia inventada ni bloqueo de este cierre.

## Follow-ups

- Automatización de Drive; permisos operativos y acceso; estructura canónica y
  normalización; navegación/creación/guardado desde `/ingresar`; navegación por LLM;
  vinculación automática Policy-documento: tarea específica posterior conforme D-0032.
- Importador, staging, exception queue y resolución operativa de identidad fiscal
  incompleta: trabajo posterior de migración; T-0013 es una tarea existente de importador.
- Architecture Alignment Review / **T-0015**: inputs y tensiones de dominio
  identificados en el informe; todavía no existe su archivo de tarea y no se crea
  ni se implementa en este cierre.

No se crean tareas adicionales por cada follow-up ni se activan las existentes.

## Risks

- La aprobación de discovery no elimina riesgos de datos ni autoriza migración.
- La muestra exploratoria no acredita acceso para otra identidad ni conformidad
  de todo Drive; los 404 no se convierten en referencias inválidas.
- Las disposiciones aprobadas exigen preservar la trazabilidad para que el
  importador futuro no vuelva a inferir identidad por parecido.
