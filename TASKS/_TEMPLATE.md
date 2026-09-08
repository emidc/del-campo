---
id: T-0000
title: Título corto en imperativo
kind: FEATURE            # FEATURE | SPIKE | POC | CHORE | MIGRATION | REVIEW
status: DRAFT            # DRAFT | READY | ACTIVE | BLOCKED | DONE | DROPPED
workstream: POS          # POS | BOS | MIG
riskClass: LOW           # LOW | MEDIUM | HIGH
size: S                  # S | M | L — opcional, pero se asigna ANTES de ejecutar
created: 2026-09-07
blockedBy: []            # ids de otras tareas
contextRefs: []          # obligatorio siempre; vacío solo si no hay contexto externo
decisionRefs: []         # ids de decisions.yaml que esta tarea aplica o toca
---

<!--
Siete campos de frontmatter obligatorios: id, kind, title, status, riskClass, workstream,
contextRefs.
Cuatro secciones obligatorias: Why, Outcome, Non-scope, Verification.
Todo lo demás es condicional o opcional. Una plantilla que se llena por obligación
produce relleno, y el relleno deja de discriminar tareas buenas de malas.

NO se escribe acá: nombre de rama (se deriva del id), perfil de permisos (se deriva
de riskClass), política de revisión, ni lista de archivos a tocar.
-->

## Why

Un párrafo. Termina en la decisión que habilita o en el resultado de usuario al que sirve.

Si no se puede escribir, la tarea no está lista. No es retórica: es el filtro más barato del sistema.

## Outcome

El estado final observable, escrito en presente como si ya fuera cierto.

No es una lista de pasos. Los pasos son del implementador.

## Non-scope

- Al menos una línea.
- Un `Non-scope` vacío es el mejor predictor de scope creep en trabajo agéntico.

## Verification

```bash
# Comandos ejecutables cuando el outcome sea mecánicamente verificable.
pnpm check
```

Afirmaciones concretas que un humano debe comprobar, cuando el outcome no sea mecánico:

- [ ] …

**Toda tarea exige evidencia verificable. SPIKE y REVIEW pueden depender de
comprobaciones humanas explícitas.**

---

<!-- Secciones condicionales. Borrar las que no apliquen. -->

## Data effects
<!-- OBLIGATORIO si toca base de datos o sistemas externos -->

Qué se escribe, si es reversible, y cómo se revierte.

## Decision unlocked
<!-- OBLIGATORIO en SPIKE y POC -->

Qué vamos a poder decidir después que no podemos decidir ahora.

## Hypothesis / Pilot users / Success criteria / Metrics / Duration
<!-- OBLIGATORIO en POC -->

## Risks
<!-- Opcional. Útil cuando existe; ruido cuando se completa por obligación. -->

## Notes
<!-- Opcional -->
