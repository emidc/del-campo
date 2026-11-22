---
id: T-0067
title: Acercar la interfaz de Broker OS al prototipo
status: ACTIVE
created: 2026-11-13
linear: EMI-135
---

## Para qué

El prototipo es simple, intuitivo y lindo a la vista; el Broker OS actual está lejos. El
equipo va a usar lo que se parezca al prototipo.

## Listo cuando

- La navegación, la ficha de empresa y la sección Riesgos se ven y se usan como en `docs/north-star/prototipo`.
- Emiliano lo revisa en pantalla y dice qué falta.
- `pnpm check` en verde.

## Fuera de alcance

Pantallas del prototipo que todavía no tienen datos reales detrás.

## Avance

- 15/11/2026: marco del prototipo en todas las pantallas (barra superior, menú lateral con la sección marcada, colores, tipografías, botones, tarjetas y tablas), ficha de cliente con encabezado y pestañas (Resumen, Pólizas, Riesgos, Gestiones, Tareas) y login con la marca.
- 15/11/2026: pantalla Clientes (empresas y personas, con filtro por nombre, CUIT o DNI), buscador de la barra superior apuntando a Clientes, la búsqueda de siete campos queda en Pólizas, y fechas en día/mes/año en todas las pantallas.
- 15/11/2026: Inicio con saludo y fecha, «Mis tareas» y «A atender» en dos tarjetas con el motivo de cada renglón (vencida, vence hoy, trabada), y los indicadores debajo.
- 15/11/2026: ficha de póliza con encabezado, datos y documentos en tarjetas, y estados de póliza y documentales en español (lo que no se conoce se muestra como viene del origen).
- 15/11/2026: listas de Gestiones y Tareas con los filtros en pestañas, antetítulo y cantidad en el título.
- 15/11/2026: fichas de gestión y de tarea con migas, encabezado con estado y vencimiento, y los datos en una tarjeta; fechas y horas en día/mes/año.
- 16/11/2026: Renovaciones con los tramos en pestañas y los filtros de modo y estado en chips; Equipo en tabla con el formulario de invitación en tarjeta.
- 21/11/2026: fichas y listas editables, Tareas con tablero semanal, Equipo y responsables con nombre y foto (PRs 184 a 191, ver T-0069 y T-0070).
- 22/11/2026: sección Riesgos en la ficha de empresa (PR 193).
