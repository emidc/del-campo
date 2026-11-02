---
id: T-0037
title: Refrescar los datos de clientes y pólizas y salir de los planes gratuitos (C3)
kind: MIGRATION
status: DRAFT
workstream: MIG
riskClass: HIGH
size: M
created: 2026-11-02
blockedBy: [T-0034]
contextRefs: [PROJECT.md, docs/migration/zoho, DECISIONS/0064-enlaces-de-zoho-sin-comprobar.md,
              docs/despliegue/vercel-vs01.md]
decisionRefs: [D-0062, D-0064]
---

## Why

VS01 muestra una foto de Zoho del 16/09/2026 y corre sobre planes gratuitos con datos
reales (D-0062, EMI-34). La etapa 2 de la north star pide que el equipo trabaje una
semana sin abrir Zoho CRM para consultar, lo que exige datos actuales y una
infraestructura acorde.

## Outcome

Clientes, pólizas y enlaces documentales se refrescan desde Zoho (o su reemplazo) con
un procedimiento repetible, y la fecha de corte se ve en la interfaz. Producción corre
sobre planes pagos. Se conoce la proporción de pólizas con documento comprobado, sin
comprobar o pendiente (U8).

## Non-scope

- Reemplazar Zoho CRM o Zoho Mail.
- Importar datos a Risk OS.
- Cambiar el modelo de `policy` (D-0025 sigue OPEN).

## Verification

```bash
pnpm check
```

- [ ] El owner ejecuta un refresco en producción y verifica una muestra de 20 pólizas contra Zoho.
- [ ] La medición de cobertura documental (U8) queda en `ops/evidence/T-0037.md`.

## Data effects

Escribe datos reales en la base de producción de VS01. Requiere aprobación humana antes
de cada ejecución contra producción.
