---
id: T-0009
title: Definir y ejercitar la revisión ciega por subagente aislado
kind: CHORE
status: READY
workstream: POS
riskClass: LOW
size: M
created: 2026-09-08
blockedBy: [T-0005, T-0006]
contextRefs: [ENGINEERING_RULES.md, AGENTS.md]
decisionRefs: [D-0016, D-0017]
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
