---
id: T-0033
title: Versionar la north star v25 de Broker OS en el repositorio
kind: CHORE
status: DONE
workstream: BOS
riskClass: LOW
size: S
created: 2026-11-02
blockedBy: []
contextRefs: [PROJECT.md, DOMAIN.md, decisions.yaml]
decisionRefs: [D-0063, D-0067]
---

## Why

El prototipo v25 (etiqueta `broker-os-prototipo-v25-final`, sha256
`a97f6e91f3054ddcb550062b5ef91481259bf5e5979c1470083136dcd685cad2`) fue validado con
Manuel y con el equipo y aceptado por el owner el 2026-11-02 (EMI-45). Hoy vive solo en
la carpeta del proyecto de Claude. Las tareas T-0034 a T-0037 y los cortes C4 a C13 lo
citan como especificación de experiencia y como fuente de criterios de aceptación, así
que tiene que estar versionado donde el resto del programa lo pueda referenciar.

## Outcome

`docs/north-star/` contiene la referencia de la v25: un `README.md` con el sha256, la
etiqueta, el enlace al artifact publicado y el estado («datos ficticios, no es software
de producción»); las decisiones DA-1 a DA-9; los contratos CSV y MCP y los contratos de
datos; la tabla de implementado frente a simulado; el plan de paso a producción con sus
cinco etapas y trece cortes (C1 a C13); y la lista de scripts de prueba del prototipo que
sirven como criterios de aceptación de cada corte. El HTML del prototipo y sus pruebas
quedan en `docs/north-star/prototipo/` sin modificar, o el README explica dónde viven si
el owner prefiere no subirlos.

## Non-scope

- Modificar el prototipo congelado o sus pruebas.
- Portar código del prototipo a `apps/`, `packages/` o `contexts/`.
- Registrar decisiones nuevas en `decisions.yaml` (es T-0034).
- Escribir los slices de las etapas 2 a 4.

## Verification

```bash
pnpm check
sha256sum docs/north-star/prototipo/index.html   # si se sube: a97f6e91…cad2
```

- [ ] El README de `docs/north-star/` dice que es una referencia de experiencia con datos ficticios, no software de producción.
- [ ] Los documentos no contienen PII de clientes reales (R-19).
