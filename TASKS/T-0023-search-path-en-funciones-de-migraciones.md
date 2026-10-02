---
id: T-0023
title: Fijar el search_path de las funciones de las migraciones
kind: MIGRATION
status: READY
workstream: BOS
riskClass: LOW
size: S
created: 2026-10-02
blockedBy: []
contextRefs: [packages/db/migrations/README.md, docs/despliegue/vercel-vs01.md,
              ops/evidence/T-0018.md, DECISIONS/0063-aislamiento-por-contexto-q4.md,
              ENGINEERING_RULES.md]
decisionRefs: [D-0045, D-0063]
---

## Why

Las funciones de validación de las migraciones 0001–0004 nombran tablas sin esquema y
resuelven contra el `search_path` de la sesión que las dispara. Un volcado de `pg_dump`
vacía ese `search_path`, y la carga de producción falló con
`relation "party" does not exist` hasta que se quitó la línea a mano
(`ops/evidence/T-0018.md`, cuarta vuelta). Hoy el refresco de §10 depende de ese `sed`.
D-0063 agrega esquemas propios por contexto (`risk`, `communication`): con más de un
esquema, una función que depende del `search_path` de quien la llama es un error
esperando ocurrir. Esta tarea salda la deuda antes de que exista el primer contexto.

## Outcome

Toda función definida por las migraciones en el esquema `public` resuelve sus tablas
sin depender del `search_path` de la sesión: una escritura que dispara cualquiera de sus
triggers se comporta igual con `search_path` vacío que con el de por defecto.

Una prueba recorre el catálogo y falla si alguna función de `public` creada por las
migraciones no tiene su `search_path` fijado, de modo que una migración futura que
olvide fijarlo no pasa `pnpm check`. El README de migraciones enuncia la convención.

Un volcado `--data-only` de `pg_dump` se carga tal cual, sin quitar la línea de
`set_config('search_path', …)`. La ficha de despliegue deja de pedir ese paso.

La lógica de cada función no cambia: mismas condiciones, mismos mensajes de error.

## Non-scope

- Cambiar qué valida cada función, sus mensajes o los triggers que la invocan.
- Tablas, columnas, índices o constraints.
- Funciones de extensiones (`btree_gist`, `pgcrypto`, etc.).
- Crear los esquemas `risk` o `communication`, o adelantar estructura de D-0063.
- Refrescar los datos de producción. La migración se aplica en producción con
  `pnpm db:migrate`, sin tocar datos.
- Calificar con esquema las consultas de la aplicación (`packages/api`, `apps/web`).

## Verification

```bash
pnpm check
```

- [ ] Una prueba dispara, con `search_path` vacío, al menos un trigger de cada migración
      que defina funciones (0001, 0002, 0004) y obtiene el mismo resultado que con el
      `search_path` por defecto: acepta lo válido y rechaza lo inválido con el mismo
      mensaje.
- [ ] Una prueba sobre `pg_proc` falla si una función de `public` no declarada por una
      extensión tiene `proconfig` sin `search_path`.
- [ ] La migración tiene su reversa en `migrations/down/` y aplicar, revertir y volver a
      aplicar deja la base igual.
- [ ] `docs/despliegue/vercel-vs01.md` §9 y §10 no piden quitar la línea del
      `search_path`, y el README de migraciones enuncia la convención.
- [ ] El owner aplica la migración en producción y lo registra en la evidencia; ningún
      agente se conecta a producción (R-13).

## Data effects

Agrega una migración que cambia sólo la configuración de funciones existentes; no
escribe ni lee datos de dominio. Reversible con su migración `down`. En producción la
aplica el owner con `pnpm db:migrate` por el Session pooler (R-13). Los agentes de
desarrollo trabajan sólo contra bases locales `_dev`/`_test` (R-19).

## Notes

Dos caminos válidos: fijar `search_path` con `ALTER FUNCTION … SET search_path` (o
`SET` en la definición), o calificar las tablas con `public.` dentro de cada cuerpo. El
primero no reescribe los cuerpos y cubre funciones que se agreguen con el mismo patrón;
el segundo no cambia el plan de ejecución. Decide el implementador y lo justifica en la
evidencia. Si se elige `SET search_path`, incluir `pg_temp` al final para no resolver
objetos temporales por delante de `public`.
