---
id: T-0060
title: Simplificar los usuarios a equipo y cliente
status: READY
created: 2026-11-13
linear: EMI-130
---

## Para qué

Hoy hay roles y permisos por función que nadie necesita en un equipo de ocho. Con dos tipos
de usuario el sistema es más fácil de entender y de mantener, y el portal de empresas
(T-0064) tiene sobre qué apoyarse.

## Listo cuando

- Una persona del equipo entra con Google y ve y edita todo.
- Un usuario cliente está asociado a una empresa y sólo puede leer datos de esa empresa; hay tests que prueban que no ve otra.
- Emiliano puede dar de alta y de baja usuarios desde la app.
- Se retiraron los roles internos y los permisos por función que ya no se usan.
- `pnpm check` en verde.

## Fuera de alcance

Las pantallas del portal (T-0064). Aplicarlo en producción, que requiere la aprobación de Emiliano.
