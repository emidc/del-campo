---
id: T-0006
title: Exigir evidencia de ejecución para declarar una tarea DONE
kind: CHORE
status: ACTIVE
workstream: POS
riskClass: LOW
size: M
created: 2026-09-08
blockedBy: []
contextRefs: [ENGINEERING_RULES.md, ops/AGENTRUN.md, TASKS/_TEMPLATE.md]
decisionRefs: [D-0015, D-0017]
---

## Why

El ledger registra que un run ocurrió y el ADR registra qué se decidió, pero nada
registra la prueba de que el trabajo hace lo que dice. Hoy no hay forma de distinguir
una tarea terminada de una tarea declarada terminada, y esa distinción es todo el punto
del arnés.

## Outcome

`ENGINEERING_RULES.md` define el formato de `ops/evidence/T-xxxx.md`: comandos
ejecutados, **salida literal** y no resumida, SHA de `main` y de la rama, los `runId`
de los AgentRuns involucrados, una **observación externa** en el borde del sistema, y
una sección explícita **"qué NO se verificó"**.

El checker exige el archivo para toda tarea con `status: DONE` y falla sin él.

Las cinco tareas hoy en `DONE` —T-0001, T-0003, T-0004, T-0011 y T-0015— tienen el
suyo, construido desde sus secciones `## Evidence` actuales. Cada uno declara en su
encabezado que fue escrito después del hecho y qué parte de su contenido se produjo
durante la ejecución original y cuál no. Un archivo retrofiteado que no diga que lo es
sería peor que su ausencia.

La observación externa es la sección que cierra el agujero de fondo: los checks verdes
prueban que el código hace lo que el test dice, no que el test diga lo correcto.

## Non-scope

- No se construye herramienta de consulta ni reporte sobre `ops/evidence/` ni sobre el
  ledger: la tercera dispararía el criterio de promoción de `D-0015` sin decidirlo.
- No se cambia el esquema de AgentRun ni el hook.
- No se exige evidencia a `DROPPED` ni a ningún estado que no sea `DONE`.
- No se reejecuta la verificación de ninguna de las cinco tareas retrofiteadas para
  producir salida nueva: el retrofit usa lo que quedó registrado, y lo que no quedó
  registrado se declara faltante en vez de reconstruirse.
- No se elimina la sección `## Evidence` de los archivos de tarea existentes.

## Verification

```bash
# El checker falla al marcar DONE una tarea sin archivo de evidencia,
# y pasa al agregarlo.
pnpm check
```

Comprobaciones humanas:

- [ ] Una copia de una tarea `DONE` sin `ops/evidence/T-xxxx.md` hace fallar
      `pnpm check` con un mensaje que nombra el archivo faltante.
- [ ] El archivo de evidencia de T-0001 contiene salida literal, no una descripción de
      la salida.
- [ ] Los cinco archivos retrofiteados declaran que fueron escritos después del hecho.
- [ ] La sección "qué NO se verificó" de cada uno nombra al menos una limitación real.

## Data effects

Crea `ops/evidence/` como artefacto versionado. Sin PII: la evidencia de tareas que
toquen datos de clientes contiene métricas agregadas y referencias internas — R-19.
Reversible revirtiendo el PR.

## Notes

Sin inputs pendientes. Q-2 respondida: retrofit de T-0001 y T-0003, marcado
explícitamente como escrito después del hecho.

**Corrección del contrato el 2026-09-20.** La tarea se escribió el 2026-09-08, cuando
había dos tareas en `DONE`. Al ejecutarla hay cinco: se sumaron T-0004, T-0011 y T-0015.
Retrofitear solo las dos nombradas dejaba `pnpm check` en rojo, y eximir a las otras tres
habría instalado una lista de excepciones en el guardrail el mismo día que nace —
exactamente el modo de falla que T-0008 está corrigiendo. El owner eligió explícitamente
retrofitear las cinco y corregir `## Outcome` y `## Non-scope` para que el contrato diga
lo que efectivamente se hizo. Con T-0005 integrada, esta edición ya no sería posible sin
un PR previo a `main`.

**Alcance del checker.** `## Outcome` pide que el checker exija el archivo. Exige además
que contenga las tres secciones que R-09b define: un archivo vacío satisface la
existencia y no demuestra nada. El control valida estructura, nunca veracidad, y la
regla lo dice explícitamente.

**Hallazgo, no corregido.** `scripts/tests/check-docs-slices.test.mjs`, que entró con
T-0011, nunca se incorporó a `pnpm check`: hoy no corre ni localmente ni en CI. No se
arregla acá porque `package.json` está siendo modificado por T-0008. Al resolver ese
conflicto conviene evaluar reemplazar las tres invocaciones explícitas por
`node --test scripts/tests/*.test.mjs`, que es lo que habría evitado el olvido.
