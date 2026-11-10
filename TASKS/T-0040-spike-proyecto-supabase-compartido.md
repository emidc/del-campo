---
id: T-0040
title: Probar en sintético si Broker OS y Risk OS pueden compartir un proyecto Supabase
kind: SPIKE
status: BLOCKED
workstream: BOS
riskClass: MEDIUM
size: S
created: 2026-11-07
blockedBy: []
contextRefs: [DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md,
              DECISIONS/0068-datos-reales-risk-os.md,
              DECISIONS/0079-tope-de-infraestructura-usd-55.md,
              DECISIONS/0081-presupuesto-con-contingencia.md,
              docs/migration/zoho/T-0037-infraestructura.md]
decisionRefs: [D-0063, D-0067, D-0068, D-0071, D-0079, D-0081]
---

> **BLOCKED desde el 2026-11-10** por decisión del owner: la consolidación de Broker OS y
> Risk OS en un proyecto queda postergada. Risk OS sigue en su proyecto Free dedicado
> (D-0068) y esta tarea ya no decide su destino (el `blockedBy` de `T-0032` se corrige en un
> PR propio, porque es FEATURE y exige revisión ciega). Se vuelve a evaluar antes de cargar las
> históricas de Risk, antes del uso habitual del equipo o cuando hagan falta las tres apps
> activas a la vez. Si se reactiva:
>
> - **El destino es Free, no Pro.** El proyecto conjunto sigue en Free hasta que el owner
>   decida el paso a Pro. Communication OS sigue aparte.
> - **El ensayo es local.** Con dos proyectos Free activos no hay lugar para un proyecto de
>   prueba hosteado sin pausar otro; eso lo decide el owner con su impacto a la vista.
> - **Hallazgos de la revisión del 2026-11-10** (hilo del proyecto, sin datos reales):
>   la app de Broker OS se conecta como el rol administrativo y asume `broker_app` por
>   transacción (`packages/api/src/acceso/base.ts`, migración 0008); antes de cualquier dato
>   real de Risk en un proyecto compartido necesita una conexión propia, sin propiedad de
>   tablas ni capacidad de asumir roles de Risk, y las pruebas comprueban `session_user`,
>   no sólo el rol asumido. `db:verificar` de Risk falla por diseño en una base que tenga
>   `party` o `policy`. El trigger `orden_previo_item_en_su_registro` rechaza una carga
>   sólo de datos sobre una estructura existente, pero no una restauración completa del
>   esquema (comprobado en PostgreSQL 17.11 con un rol sin superusuario); no se desactivan
>   triggers por defecto. En modo `oidc` la app de Risk usa `RISK_OIDC_DATABASE_URL`
>   (`apps/risk/src/lib/server.ts`): detener escritores exige la variable del modo efectivo.

## Why

Compartir el proyecto Supabase Pro de VS01 con Risk OS ahorraría el costo de un segundo
proyecto y simplificaría la operación (D-0081 pide minimizar). Pero D-0063 y D-0071 piden
aislamiento por contexto, y una restauración de un contexto no puede pisar al otro. Hay
que medirlo antes de cargar las evaluaciones históricas en el destino de Risk OS (T-0032).

## Outcome

Tres partes, cada una con su aceptación, todas sobre datos sintéticos:

- **INF-00a.** Listo cuando las pruebas negativas entre esquemas, el pool y los roles sin
  `BYPASSRLS` pasan, o muestran por qué compartir no conviene.
- **INF-00b.** Listo cuando una restauración de un contexto no pisa al otro y la salida a
  un proyecto separado queda medida en pasos y tiempo.
- **INF-00c.** Listo cuando un ADR elige compartir o separar con costo, aislamiento y
  restauración medidos. Separar es un resultado válido; si se separa, se verifica
  backup y restauración del destino antes de cargar las históricas.

## Non-scope

- Cargar datos reales en cualquiera de los dos destinos.
- Tocar el proyecto de producción de VS01.
- Cambiar D-0063 o D-0071 fuera del ADR que produce este spike.

## Verification

- [ ] `SPIKES/T-0040.md` registra las pruebas negativas, la restauración y la salida, con
      la salida literal de cada una.
- [ ] Un ADR enlazado en `decisions.yaml` elige compartir o separar.

```bash
pnpm check
```

## Data effects

Sólo un proyecto Supabase de prueba con datos sintéticos, que se borra al terminar.
Ningún dato real ni de producción.

## Decision unlocked

Dónde vive Risk OS: como esquema dentro del proyecto Pro de VS01 o en un proyecto
separado con backup probado. Desbloquea INF-03 (preparar el destino de T-0032).
