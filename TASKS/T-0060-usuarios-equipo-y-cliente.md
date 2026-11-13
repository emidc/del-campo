---
id: T-0060
title: Simplificar los usuarios a equipo y cliente
status: ACTIVE
created: 2026-11-13
linear:
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

## Avance

- 2026-11-13: primera parte. Desde la migración `0020`, cualquier integrante del equipo ve y edita todos los clientes; las asignaciones por cliente dejan de limitar. Pantalla "Equipo" para invitar y dar de baja.
- Falta: el usuario cliente asociado a una empresa, que se hace junto con el portal (`T-0064`) para probarlo contra pantallas reales; y renombrar los roles en la base (hoy Administrador y Operador son los dos "equipo"; Administrador sólo agrega poder invitar y dar de baja).
