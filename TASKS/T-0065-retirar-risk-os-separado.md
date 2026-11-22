---
id: T-0065
title: Retirar Risk OS como aplicación separada
status: READY
created: 2026-11-13
linear: EMI-136
---

## Para qué

Con la sección Riesgos dentro de Broker OS (T-0061), la aplicación, la base y el login
propios de Risk OS son código y costo sin uso.

T-0061 ya está.

## Listo cuando

- Se eliminaron `apps/risk`, `contexts/risk`, el cliente de riesgos de `packages/api` y las reglas de aislamiento entre contextos que sólo existían para Risk OS.
- Emiliano decidió qué hacer con los datos que haya en el proyecto de Risk OS y, con su aprobación, se dieron de baja sus proyectos de Vercel y Supabase.
- `pnpm check` en verde.

## Fuera de alcance

Communication OS (T-0066).

## Avance
- 22/11/2026: desbloqueada, T-0061 está hecha. Decisión de Emiliano: los 46 relevamientos de Risk OS no se migran en bloque; se rescatan de a poco, con inspecciones nuevas cargadas en la sección Riesgos.
