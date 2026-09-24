---
id: T-0018
title: Entregar la app interna y medir la aceptación de VS01
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-09-20
blockedBy: [T-0013, T-0016, T-0017]
contextRefs: [DOMAIN.md, decisions.yaml, SLICES/VS01.md, ENGINEERING_RULES.md]
decisionRefs: [D-0013, D-0014, D-0019, D-0040, D-0057, D-0058, D-0059, D-0060]
---

## Why

Las consultas y referencias documentales solo entregan valor cuando una persona de la
correduría puede usarlas con su cuenta interna y se mide el ahorro frente a Zoho + Drive.

## Outcome

La app web interna (Next.js y TypeScript en Vercel, D-0058) integra las consultas de
T-0016 y la vinculación de T-0017 con la superficie de `SLICES/VS01.md` §2, la
autenticación de §5 según D-0059 y el despliegue de §6. Antes de incorporar cada
dependencia existe su ADR (R-05), incluidas las de Next.js y la biblioteca OIDC.

- **Sesión y admisión (D-0059).** Login OIDC con Google, cliente web Internal con scopes
  de identidad únicamente. Se admiten solo cuentas de una lista explícita provista por el
  owner, con token válido, email verificado y pertenencia al Workspace; la identidad se
  asocia por `sub`. Páginas y consultas de datos exigen sesión válida y admisión vigente
  en servidor. La lista vive en configuración, no en Git.
- **Documentos (D-0057).** El detalle ofrece "Abrir documento" o "Abrir carpeta del
  cliente" según la referencia sustentada, o muestra la ausencia; la app no llama a Drive.
- **Entorno.** Configuración reproducible de Vercel y Supabase sin secretos versionados,
  con procedimiento verificado de volver a la versión anterior. La carga de datos reales
  en Supabase y el despliegue se ejecutan con aprobación del owner (R-13).
- **Aceptación.** Casos congelados antes de medir con `scripts/vs01/freeze-cases.mjs`
  (evidencia en `ops/evidence/T-0018-casos-congelados.md`). La medición final de los 20
  casos, según §4, se hace en el entorno hosteado; un ensayo local es válido para
  practicar pero no reemplaza esa medición ni permite declarar la entrega. VS01 se
  declara entregado solo si se cumplen los cuatro umbrales, y entonces su contrato se
  marca histórico sin borrarlo.

## Non-scope

- Sin nuevos roles de dominio, permisos por cartera, portal ni agentes de producto.
- Sin escrituras de negocio en Zoho o Drive, scopes de Drive ni editor de conciliación.
- Sin Supabase Auth ni otros productos de Supabase fuera de Postgres (D-0013).
- Sin ampliar alcance ni reemplazar casos para compensar un criterio incumplido.
- Sin decidir hosting de worker, RLS u otros mecanismos de D-0022 por implicación. La
  app es interna, de solo lectura y de un único tipo de principal; T-0002 no la bloquea.

## Verification

```bash
pnpm check
```

- [ ] ADRs de Next.js y de la biblioteca OIDC existen antes de sus dependencias, con
      entrada en `decisions.yaml`.
- [ ] Tests de acceso prueban sesión ausente, inválida o expirada, email no verificado,
      cuenta fuera del Workspace y cuenta del Workspace fuera de la lista, en páginas y
      en consultas directas de datos; ninguno expone información.
- [ ] El recorrido completo incluye búsqueda, selección, detalle y apertura documental,
      con estados sin resultados, ambiguos, "Abrir carpeta del cliente" con pendiente y
      ausencia de referencia visibles; nunca se rotula una carpeta como documento.
- [ ] `node scripts/vs01/freeze-cases.mjs --verify` confirma que los casos no cambiaron
      desde su congelamiento anterior a la primera medición.
- [ ] El informe de aceptación, medido en el entorno hosteado, permite recalcular los
      cuatro resultados de §4 y conserva los fallos, sin reemplazar casos ni exponer PII.
- [ ] La medición acredita utilidad sin consultar Zoho durante el recorrido de VS01.
- [ ] Configuración, regreso a la versión anterior y autorizaciones de despliegue y carga
      de datos quedan documentados sin secretos. El contrato se marca histórico solo al
      entregar.

## Data effects

Lee la base preparada; la app no lee ni escribe Drive. La carga de datos reales en
Supabase y el despliegue en Vercel se planifican y los autoriza el owner antes de
ejecutarse (R-13), sin tratar la base local de T-0013 como si ya estuviera desplegada.
Los agentes de desarrollo trabajan con fixtures sintéticas (R-19). La medición real la
ejecuta una persona autorizada; el repositorio recibe evidencia redactada.

## Notes

Parte de la descomposición de T-0014 en T-0011. Q-8–Q-11 se consumen desde el contrato;
no se vuelven a pedir. Decisiones del 2026-09-23: D-0058 (stack) y D-0059 (sesión y
admisión).

**Precondiciones humanas para READY/ACTIVE:**

- [x] Stack, mecanismo de sesión, regla de admisión y entorno de aceptación decididos.
      La biblioteca que D-0059 dejó abierta se eligió en D-0060 (2026-09-24).
- [ ] 20 casos elegidos por el owner y congelados (`freeze-cases.mjs --freeze`).
- [ ] Cliente OAuth web Internal creado por Manuel, con URIs de redirección de local y
      Vercel; credenciales entregadas al owner fuera de Git y de prompts (R-16).
- [ ] Lista de cuentas admitidas provista por el owner antes del piloto.
- [ ] Proyecto Supabase y Vercel disponibles; autorización de carga de datos reales.

La implementación puede comenzar con fixtures sintéticas mientras avanzan las
precondiciones de piloto; la medición no comienza sin todas ellas.
