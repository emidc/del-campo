---
id: T-0057
title: Mostrar los riesgos de Risk OS en la ficha de empresa (C4-03b)
kind: FEATURE
status: DONE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-11-11
blockedBy: [T-0056]
contextRefs: [docs/desarrollo/riesgos-en-la-ficha.md, DECISIONS/0071-integracion-por-api-y-correspondencia-de-empresas.md]
decisionRefs: [D-0071, D-0077]
---

## Why

La north star muestra Riesgos sólo dentro de la ficha de empresa de Broker OS (DA-9). Con la
lectura de Risk OS por token (T-0056), la ficha puede mostrarlos sin copiar datos entre
contextos.

## Outcome

La ficha de una organización en Broker OS tiene una sección «Riesgos» que lee de Risk OS en
cada request, como la persona, con un token de 60 s. Muestra la tabla con posición, riesgo,
unidad y banda, las cantidades y la hora de la consulta, o un texto claro si la vinculación
está pendiente, si no hay vínculo, si la persona no tiene acceso, si Risk OS no responde o si
no está configurado. Broker OS no guarda riesgos: si Risk OS cae, no muestra nada anterior.
Diseño: `docs/desarrollo/riesgos-en-la-ficha.md` §3.

## Non-scope

- Configurar las variables en producción (`RISK_API_URL`, `RISK_BASE_URL`,
  `BROKER_TOKEN_CLAVE_PRIVADA` en Broker OS y `RISK_JWKS_BROKER` en Risk OS).
- Pantalla de vinculación y escrituras desde Broker OS.

## Verification

```bash
pnpm check
node --test packages/api/src/riesgos/cliente.test.ts apps/web/src/app/_componentes/riesgos.test.ts
```

- [ ] En local, con las dos apps levantadas y datos sintéticos, la ficha de una empresa vinculada muestra los mismos riesgos que la lista de Risk OS.
