---
id: T-0006
title: Exigir evidencia de ejecución para declarar una tarea DONE
kind: CHORE
status: READY
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

T-0001 y T-0003 tienen el suyo, construido desde sus secciones `## Evidence` actuales.
Cada uno declara en su encabezado que fue escrito después del hecho y qué parte de su
contenido se produjo durante la ejecución original y cuál no. Un archivo retrofiteado
que no diga que lo es sería peor que su ausencia.

La observación externa es la sección que cierra el agujero de fondo: los checks verdes
prueban que el código hace lo que el test dice, no que el test diga lo correcto.

## Non-scope

- No se construye herramienta de consulta ni reporte sobre `ops/evidence/` ni sobre el
  ledger: la tercera dispararía el criterio de promoción de `D-0015` sin decidirlo.
- No se cambia el esquema de AgentRun ni el hook.
- No se exige evidencia a `DROPPED` ni a ningún estado que no sea `DONE`.
- No se reejecuta la verificación de T-0001 ni la de T-0003 para producir salida nueva:
  el retrofit usa lo que quedó registrado, y lo que no quedó registrado se declara
  faltante en vez de reconstruirse.
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
- [ ] Los archivos de T-0001 y T-0003 declaran que fueron escritos después del hecho.
- [ ] La sección "qué NO se verificó" de cada uno nombra al menos una limitación real.

## Data effects

Crea `ops/evidence/` como artefacto versionado. Sin PII: la evidencia de tareas que
toquen datos de clientes contiene métricas agregadas y referencias internas — R-19.
Reversible revirtiendo el PR.

## Notes

Sin inputs pendientes. Q-2 respondida: retrofit de T-0001 y T-0003, marcado
explícitamente como escrito después del hecho.
