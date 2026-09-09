---
id: T-0007
title: Eliminar el resumen de estados de DOMAIN.md y generarlo desde decisions.yaml
kind: CHORE
status: READY
workstream: POS
riskClass: LOW
size: S
created: 2026-09-08
blockedBy: []
contextRefs: [DOMAIN.md, decisions.yaml, ENGINEERING_RULES.md]
decisionRefs: [D-0023, D-0024, D-0025, D-0030]
---

## Why

`DOMAIN.md` §73 declara `PROVISIONAL` cuatro decisiones que `decisions.yaml` declara
`OPEN` —D-0023, D-0024, D-0025 y D-0030— y §69 del mismo archivo prohíbe exactamente
eso. Corregir el texto no alcanza: mientras exista prosa que pueda contradecir al
índice, la contradicción vuelve. El arreglo es que esa prosa deje de escribirse a mano.

No hay decisión pendiente detrás del desacuerdo: R-04 ya establece que `decisions.yaml`
es la fuente canónica del estado. Esta tarea aplica esa regla, no elige entre dos
fuentes.

## Outcome

`DOMAIN.md` §73 no existe. `pnpm decisions` genera el resumen por estado desde
`decisions.yaml` cuando alguien lo necesita, y su salida no se versiona como prosa en
ningún documento.

El checker falla si un archivo canónico distinto de `decisions.yaml` afirma el estado
de una decisión —la extensión natural del bucle que ya detecta ids `OPEN-xxx` y
referencias `D-xxxx` inexistentes.

## Non-scope

- No se reescribe el resto de `DOMAIN.md`, ni §72 ni §74.
- No se cambia el `status` de ninguna decisión. Si al eliminar §73 aparece un desacuerdo
  real sobre un estado, se registra y se resuelve por ADR, nunca en este PR.
- No se genera prosa a partir de YAML en ningún otro documento.
- No se crea un formato de reporte ni una vista HTML.

## Verification

```bash
pnpm check
pnpm decisions

# Los dos usos legítimos de la palabra sobreviven; la lista de estados no.
grep -n 'PROVISIONAL' DOMAIN.md
grep -c '^# 73' DOMAIN.md || true
```

Comprobaciones humanas:

- [ ] Reintroducir una lista de estados en `DOMAIN.md` hace fallar `pnpm check`.
- [ ] `pnpm decisions` produce el mismo conjunto de ids que `decisions.yaml`, sin
      reformular ningún `statement`.
- [ ] Ninguna sección de `DOMAIN.md` quedó huérfana por la eliminación de §73.

## Notes

Sin inputs pendientes. Es la única de las diez que un agente puede ejecutar entera con
lo que hay hoy en el repositorio, y por eso conviene que sea el primer PR real contra
el CI: ejercita el ciclo completo sobre un cambio cuyo criterio de corrección es
mecánico.
