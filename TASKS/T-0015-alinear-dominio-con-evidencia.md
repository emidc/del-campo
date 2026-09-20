---
id: T-0015
title: Alinear el dominio con la evidencia de T-0004 y las reglas de negocio confirmadas
kind: REVIEW
status: DONE
workstream: BOS
riskClass: HIGH
size: L
created: 2026-09-19
blockedBy: []
contextRefs: [PROJECT.md, DOMAIN.md, ENGINEERING_RULES.md, decisions.yaml,
              REVIEWS/T-0004-insumos-vs01.md, REVIEWS/T-0004-drive-validation.md,
              TASKS/T-0007-eliminar-seccion-73-y-generar-decisiones.md]
decisionRefs: [D-0002, D-0005, D-0006, D-0007, D-0009, D-0016, D-0019, D-0021,
               D-0031, D-0032, D-0033, D-0034, D-0035, D-0036, D-0037, D-0038,
               D-0039, D-0040, D-0041]
---

## Why

`DOMAIN.md` §1 se declara canónico sobre identidad, semántica, relaciones e invariantes, y
`D-0031` decidió tres cosas que son exactamente eso: obligatoriedad fiscal, precedencia de
Cuenta como tomador y admisión de Claim sin FK. El repositorio tenía dos fuentes canónicas
contradictorias, y quien leyera una sola implementaría algo distinto. Además, el alcance de
migración aprobado contiene cinco familias de entidades de las que tres no existían en
`DOMAIN.md` ni como `DEFERRED`, y cuatro problemas aparentemente independientes —siniestros
sin póliza migrada, predecesores de renovación fuera de alcance, referencias a un módulo no
migrado y referencias documentales inaccesibles— resultaron ser el mismo problema sin
mecanismo. Esta tarea cierra esa alineación para que `T-0011` escriba el contrato de VS01
sin tomar decisiones de dominio por implicación, y `T-0012` escriba el schema sin que el
schema defina el dominio accidentalmente.

## Outcome

`DOMAIN.md`, `decisions.yaml` y `ENGINEERING_RULES.md` no se contradicen entre sí ni con
las reglas de negocio confirmadas. Cada regla confirmada que es semántica de dominio vive
en `DOMAIN.md` con su ADR, y no dentro del `statement` de una decisión de migración.

El dominio distingue **staging** —qué existía en el sistema de origen— de **dominio** —cómo
entiende Broker OS el negocio—, declara qué concepto vive en cada lado y establece que
persistir no implica exponer.

`ExternalReference` existe como concepto de dominio para las referencias conocidas hacia
entidades externas, históricas o todavía no migradas que necesitan sobrevivir en producto;
resolver una referencia nunca borra la original. `Endorsement` es `MODELED NOW` como evento
asociado a una Policy, no necesariamente contractual, con `policyId` no nullable y con la
decisión de si produce versión desacoplada del hecho de existir. `InsuranceProduct`,
`RiskObject` y `EnterpriseRisk` son tres nombres con definición propia. `Account` ya no
requiere cumplir la condición de `Client`. La identidad fiscal es una condición derivada de
calidad de datos. El número de póliza es único por aseguradora y sus colisiones son
anomalías con tratamiento explícito. Las reglas de datos distinguen agentes de desarrollo
de agentes de producto, sin autorizar por sí mismas a ningún proveedor ni modelo. La
autoridad documental se descompone en ejes y VS01 no escribe en Drive.

`D-0031` conserva autoridad sobre evidencia, alcance, curación y reglas de migración, y
declara qué cláusulas fueron reemplazadas y por quién. Ninguna decisión `OPEN` queda
resuelta.

El objetivo de `T-0007` está cumplido: ningún documento canónico afirma el estado de una
decisión, `pnpm decisions` genera ese resumen desde `decisions.yaml`, el checker falla si
alguien vuelve a escribirlo a mano, y `T-0007` queda `DROPPED` con su nota de absorción.

## Non-scope

- No hay schema, migraciones, código, importador, UI ni índices.
- No se resuelven `D-0022` … `D-0030`, ni se resuelven por implicación. Nombrar
  `InsuranceProduct` no resuelve `D-0026`; nombrar `RiskObject` no resuelve `D-0029`.
- No se modela la estructura de gestión de riesgos empresariales, `RiskAssessment`,
  controles, mitigaciones, plan de acción ni mapa de transferencia.
- No se modela `RiskObject` ni `coverageData`: solo se los nombra y se los distingue.
- No se decide la superficie, el criterio de éxito, la autenticación ni el despliegue de
  VS01: eso es `T-0011`.
- No se amplía la superficie de VS01 ni el alcance de migración aprobado por `D-0031`.
- No se revisa la restricción de execution provider único de `D-0016` más allá de aclarar
  que no alcanza al producto: esa revisión es `POS` y no pertenece a esta tarea.
- No se construye la tabla curada de tipos de Endorsement: queda como insumo pendiente.
- No se ejecutan consultas nuevas a Drive ni al sistema de origen.
- No entra PII al repositorio, a los prompts ni a los logs.

## Verification

```bash
pnpm check
pnpm decisions
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/tests -p 'test_*zoho*.py'
git diff --check
test -z "$(git ls-files -- data/)"
```

Comprobaciones humanas:

- [x] Ninguna afirmación de `DOMAIN.md` contradice una regla de negocio confirmada, y
      ninguna regla confirmada vive únicamente dentro del `statement` de una decisión de
      migración.
- [x] Cada decisión tocada declara explícitamente qué cláusula fue reemplazada y por quién;
      ninguna cambió en silencio.
- [x] Cada concepto del alcance aprobado tiene destino declarado —staging o dominio— y el
      destino está justificado por evidencia, no supuesto.
- [x] Las excepciones estructurales conocidas son representables sin inventar datos y sin
      violar una invariante declarada: pólizas sin tomador, colisiones de número,
      predecesores no resolubles, identidades fiscales incompletas, endosos sin padre y
      recursos sin referencia documental.
- [x] Ninguna decisión `OPEN` quedó resuelta de hecho por una redacción.
- [x] Reintroducir un resumen de estados en un documento canónico hace fallar `pnpm check`,
      comprobado agregándolo y quitándolo.
- [x] Un `superseded_in_part_by` cuyo `by` no aparece en el `statement` hace fallar
      `pnpm check`, comprobado del mismo modo.
- [x] `pnpm decisions` produce el mismo conjunto de ids que `decisions.yaml`, sin
      reformular ningún `statement`.

## Closure

Cierre: **2026-09-20**, por instrucción explícita del owner. Las ocho comprobaciones
humanas de `## Verification` fueron revisadas y aprobadas por el owner en esa fecha.
La revisión independiente detectó una contradicción puntual en `DOMAIN.md` §33; se
corrigió con autorización del owner para aclarar que `renewedFromPolicyId = NULL` no
prueba por sí solo ausencia de predecesora conocida, en concordancia con §32 y `D-0034`.

Verificación automática del cierre: `pnpm check`, `pnpm decisions`, los 10 tests de
Zoho y `git diff --check` pasan; `data/` no está versionado y no se detectó PII en el
diff. `pnpm` está disponible en este cierre y se utilizó la vía normal.

## Data effects

Ninguno. Esta tarea produce documentación y decisiones: no crea schema, no escribe en
ninguna base, no modifica el sistema de origen ni Drive, y no incorpora datos de clientes.
Los conteos que cita provienen de artefactos de `T-0004` y de mediciones agregadas de solo
lectura sobre el export local ya preservado. Reversible revirtiendo el PR.

## Risks

- Riesgo de convertirse en una reescritura completa de `DOMAIN.md`. El criterio es el
  inverso: se toca solo lo que la evidencia obliga a tocar.
- Riesgo de resolver una decisión `OPEN` por redacción, especialmente `D-0025`, `D-0026` y
  `D-0029`. Nombrar un concepto no es estructurarlo, y hay una comprobación humana por eso.
- Riesgo de que la promoción de `Endorsement` arrastre superficie a VS01. Su exposición
  inicial se limita al historial de una Policy.
- `ExternalReference` entra con un solo consumidor de dominio al momento del schema. La
  excepción a la regla de dos está documentada y justificada en su ADR, no asumida.

## Notes

**Inputs ya respondidos que esta tarea no consume y `T-0011` debe absorber.** Superficie:
app web interna, sin CLI ni portal. Criterio de éxito: 20 casos reales contra línea base,
al menos 19 encontradas, cero resultados incorrectos presentados como coincidencia
inequívoca, todos los vínculos documentales de la prueba abren, y mediana del tiempo desde
el inicio de la búsqueda hasta abrir el documento al menos 50 % menor. Autenticación
interna con cuentas corporativas de Google Workspace. Aplicación web hosteada, con Vercel
acotado al runtime web: `D-0014` sigue sin cerrarse en lo que respecta al worker.

**Delta de alcance para `T-0012`.** El subconjunto de `DOMAIN.md` §63 incorpora
`Endorsement`, `ExternalReference` y `OrganizationMembership`. Su `## Non-scope` sigue
siendo válido.

**Tarea POS identificada y no ejecutada.** Revisar la restricción de execution provider
único de `D-0016` para permitir que Codex y Antigravity operen desde el inicio sobre las
mismas TaskSpecs, ramas y `verification`, manteniendo neutral el trío TaskSpec + git +
verification y específico de cada proveedor lo demás, sin construir un workflow engine
multi-proveedor ni una abstracción de mínimo común denominador.

**Insumo pendiente que esta tarea deja abierto.** La tabla curada de tipo de Endorsement →
si produce `PolicyVersion`, sobre los trece valores distintos observados en el alcance.
Es trabajo humano y precede al importador.
