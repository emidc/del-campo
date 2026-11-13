---
id: T-0037
title: Refrescar los datos de clientes y pólizas y ajustar la infraestructura al presupuesto (C3)
kind: MIGRATION
status: BLOCKED
workstream: MIG
riskClass: HIGH
size: M
created: 2026-11-02
blockedBy: [T-0034]
contextRefs: [PROJECT.md, docs/migration/zoho, DECISIONS/0064-enlaces-de-zoho-sin-comprobar.md,
              docs/despliegue/vercel-vs01.md, DECISIONS/0076-presupuesto-de-infraestructura.md,
              docs/migration/zoho/T-0037-infraestructura.md,
              docs/migration/zoho/T-0037-refresco.md]
decisionRefs: [D-0062, D-0064, D-0068, D-0076, D-0079, D-0081]
---

## Why

VS01 muestra una foto de Zoho del 16/09/2026 y corre sobre planes gratuitos con datos
reales (D-0062, EMI-34). La etapa 2 de la north star pide que el equipo trabaje una
semana sin abrir Zoho CRM para consultar, lo que exige datos actuales y una
infraestructura acorde.

## Outcome

Clientes, pólizas y enlaces documentales se refrescan desde Zoho (o su reemplazo) con
un procedimiento repetible, y la fecha de corte se ve en la interfaz. Producción corre
sobre la configuración de infraestructura que el owner aprobó (D-0079), dentro del
presupuesto de D-0081 (objetivo USD 55, techo USD 66), con impuestos y consumos incluidos. Se conoce la proporción de pólizas con documento comprobado, sin
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

## Nota (2026-11-13)

En espera: el owner postergó el refresco de datos de Zoho al 01/01/2027. La parte de
infraestructura (proyectos y planes de Supabase y Vercel por contexto) queda sin efecto por
`D-0090`: hay una sola base y un solo proyecto de Vercel.
