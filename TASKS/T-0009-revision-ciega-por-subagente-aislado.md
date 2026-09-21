---
id: T-0009
title: Definir y ejercitar la revisión ciega por subagente aislado
kind: CHORE
status: DONE
workstream: POS
riskClass: LOW
size: M
created: 2026-09-08
closed: 2026-09-21
blockedBy: [T-0005, T-0006]
contextRefs: [ENGINEERING_RULES.md, AGENTS.md]
decisionRefs: [D-0016, D-0017, D-0048, D-0052]
---

## Why

Los checks verdes prueban que el código hace lo que el test dice, no que el test diga lo
correcto. La independencia que hace falta para detectar la diferencia viene de **no
compartir contexto**, no de no compartir modelo: un subagente aislado arranca sin ver el
historial de conversación, los skills invocados ni los archivos que leyó el
implementador. Eso está disponible hoy y no toca `D-0016`.

Es lo que falta para que el ciclo del arnés se haya ejercitado una vez de punta a punta.

## Outcome

`ENGINEERING_RULES.md` define el procedimiento de revisión ciega:

- el reviewer lee el contrato de la tarea **desde `main`**, no desde la rama;
- busca `DOMAIN.md` y `decisions.yaml` por su cuenta, sin extracto curado;
- recibe el diff completo, incluidos los tests, porque un test existente modificado es
  la señal de mayor valor de cualquier diff agéntico — R-13;
- **corre la verificación antes de leer el archivo de evidencia**, porque la evidencia
  es lo que se revisa, no con lo que se revisa;
- no recibe el transcript ni la justificación narrativa del implementador;
- produce salida categorizada `Act on` / `Consider` / `Noted` / `Dismissed`, con
  justificación obligatoria en los `Dismissed`.

La revisión vive en `REVIEWS/`. Existe al menos una real, sobre un PR real.

## Non-scope

- No se agrega un segundo execution provider ni se resuelve `D-0016`.
- No se automatiza el disparo de la revisión desde CI.
- No se vuelve obligatoria para toda tarea todavía: eso se decide después de la primera,
  con la revisión misma como evidencia.
- No se define un formato de reporte agregado sobre las revisiones.

## Verification

```bash
pnpm check
```

Comprobaciones humanas:

- [ ] El archivo en `REVIEWS/` sigue el formato declarado y su contenido demuestra que
      la verificación se corrió antes de leer la evidencia.
- [ ] El reviewer citó al menos una decisión de `decisions.yaml` que el implementador no
      había nombrado, o quedó registrado que no había ninguna aplicable.
- [ ] Al menos una observación `Act on` produjo un cambio, o la ausencia de `Act on`
      está justificada por escrito.
- [ ] Ningún `Dismissed` quedó sin justificación.

## Notes

Sin inputs pendientes para escribir el contrato. Lo que sí requiere criterio humano es
posterior y no bloquea: si la revisión sirvió, y si pasa a ser obligatoria. Eso no lo
puede evaluar el mismo sistema que la produjo.

Se ejercita sobre el PR de T-0006 o el de T-0007, lo que esté primero. Depende de T-0005
y T-0006 porque necesita algo real que revisar: un contrato congelado y un formato de
evidencia.

**Actualización 2026-09-21 — cambio de sujeto.** T-0007 está `DROPPED`: no genera
evidencia según R-09b y no hay nada que revisar. Se usó el PR #9 de T-0010 (ya
mergeado) en vez de T-0006, por tres razones: (1) independencia real — lo escribió y
verificó otro agente en otra sesión (Claude en Cowork, no Claude Code), sin relación con
esta; (2) `ops/evidence/T-0010.md` declara siete límites explícitos en su `## Qué NO se
verificó`, lo que da algo concreto contra qué contrastar el hallazgo del subagente
aislado, en vez de tener que creerle; (3) su `## Verification` es ejecutable de punta a
punta en esta máquina — Postgres 17 ya está instalado localmente. Detalle completo en
`REVIEWS/T-0009-revision-ciega-por-subagente-aislado.md`.

El procedimiento quedó escrito como `R-33` en `ENGINEERING_RULES.md`, complementando a
`R-30` (que ya mencionaba "revisión independiente" como paso del flujo, sin definir el
procedimiento). Se registró como decisión material aparte, `D-0048` en
`decisions.yaml`, porque el procedimiento en sí es una elección — no una consecuencia
directa de `D-0016` ni de `D-0017` — y R-03 no permite que viva solo en el texto de la
regla.

La revisión ejercitada no encontró ningún `Act on`: el subagente aislado corrió toda la
`## Verification` de T-0010 antes de leer su evidencia, reprodujo el mismo veredicto en
verde, y documentó por qué no había nada que justificara un cambio (T-0010 es
`riskClass: LOW`, sin lógica de dominio, con cada pieza cubierta por test o
comprobación manual repetible). Encontró dos `Consider` reales sobre `packages/db/src/cli.ts`
(interpolación SQL sin escapar; `bin` sin shebang) que no ameritan tocar una tarea ya
`DONE` y mergeada, y citó `D-0048` — la única decisión de `decisions.yaml` con relación
directa a esta revisión que ni el contrato ni la evidencia de T-0010 podían nombrar,
porque no existía cuando T-0010 se cerró.

**Cierre 2026-09-21 — el criterio humano que la tarea difirió.** El `## Notes` original
dejó dos preguntas fuera del contrato, por no ser evaluables por el mismo sistema que
produce la revisión: si sirvió, y si pasa a ser obligatoria. El owner las respondió con
la evidencia de la segunda revisión real.

Sirvió, y el rendimiento no es parejo. Sobre T-0010 —`CHORE`, `riskClass: LOW`— el
subagente aislado no encontró ningún `Act on`. Sobre T-0012 —`FEATURE`,
`riskClass: MEDIUM`, el primer schema del programa— devolvió STOP con tres BLOCKER y
ocho MAJOR sobre un diff con el check local en verde, incluidas cuatro invariantes de
`DOMAIN.md` que el ADR y la evidencia declaraban cubiertas y que la base aceptaba violar.
Ese contraste es lo que fija el alcance: obligatoria en `FEATURE` y `MIGRATION`, opcional
en el resto. Registrado como `D-0052`.

Queda anotado que el contraste responde en parte al límite 3 del `## Qué NO se verificó`
de esta tarea —"no se ejercitó sobre una tarea con `riskClass: HIGH`"—. Sigue sin
ejercitarse sobre `HIGH`; lo que se agregó es un punto en `MEDIUM`, no la serie completa.
Dos puntos no son una curva.
