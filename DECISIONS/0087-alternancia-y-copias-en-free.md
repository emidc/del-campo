# ADR-0087 — Los proyectos Supabase Free se alternan por bloques y cada base con datos se copia fuera de Supabase

- **Id en `decisions.yaml`:** D-0087
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-10
- **Supersede:** — (precisa la copia manual de `docs/despliegue/vercel-risk.md` §8 y de
  `vercel-vs01.md` §9; no cambia D-0068, D-0079 ni D-0081)
- **Aprobación:** el owner, el 2026-11-10, en el hilo «Decidir cuándo consolidar Broker y
  Risk», con el merge de este cambio.

## Contexto

El 2026-11-10 el owner decidió postergar la consolidación de Broker OS y Risk OS en un
proyecto de Supabase (plan 12, INF-00a a INF-00c; `T-0040`). Los tres contextos siguen en
proyectos Free separados. Free admite dos proyectos activos, pausa un proyecto tras una
semana sin actividad y no ofrece copias que el owner pueda restaurar por su cuenta. Hoy
Broker OS (VS01) tiene datos reales, Communication OS está activo con su webhook de
WhatsApp y dos crons (`apps/communication/vercel.json`), y Risk OS está pausado por el
límite de dos activos (`docs/migration/zoho/T-0037-infraestructura.md` §1).

Faltaban dos reglas: cómo turnar el segundo lugar activo sin perder escrituras y cada
cuánto copiar. La copia de `vercel-risk.md` §8 es «al menos antes de cada carga [y] al
terminar cada semana de ciclos», y la de `vercel-vs01.md` §9 es una copia única, previa a
la primera carga. Ninguna cumple la tolerancia acordada en la revisión: recuperar hasta el
día anterior.

## Referencia canónica

`decisions.yaml`, D-0087.

## Cómo se aplica

**Alternancia.**

- Broker OS no entra en la alternancia. Communication OS y Risk OS se turnan el segundo
  lugar por bloques de trabajo de al menos un día. No se alterna varias veces en el mismo
  día ni durante una observación que exija disponibilidad continua, como los 14 días de
  OIDC de la fase 4 de `T-0035`.
- Antes de pausar un proyecto:
  1. se comprueba que no esté recibiendo escrituras externas (crons, webhooks, una app
     en uso) y, si las recibe, se detienen primero;
  2. se hace una copia y se verifica que el archivo se puede leer (`pg_restore --list`);
  3. si es Communication OS, el owner confirma la pausa en ese momento, porque los
     mensajes de WhatsApp que lleguen durante la pausa pueden perderse.
- Al reanudar un proyecto, se comprueba que la app responde antes de darlo por activo.
- Se pausa, no se borra. Borrar un proyecto, aunque sea la Preview sintética, exige una
  decisión explícita del owner y una copia previa.
- Un proyecto pausado se puede reanudar sólo durante un plazo que fija Supabase. El owner
  lo verifica en la documentación vigente y, antes de que venza, activa el proyecto y lo
  copia.

**Copias.**

- Las hace el owner con la cadena de administración y un `pg_dump` de la misma mayor que
  el servidor o más nuevo: `--format=custom --no-owner`, un archivo por esquema (`public` y
  `authz` en Broker OS, `risk`, `communication`). Cada copia va con un manifiesto sin
  valores: conteos por tabla, migraciones aplicadas y versión del servidor.
- Frecuencia:
  - una por día cuando hubo cambios relevantes, es decir, una importación, una carga, altas
    o bajas de personas, o uso real ese día;
  - siempre antes de una carga, una migración, un cambio material o una pausa;
  - sin cambios, no hace falta una copia nueva.
- Van cifradas a dos lugares privados del owner. Nunca al repositorio, a un Drive
  compartido ni a un mensaje (R-18).
- Una vez por mes se restaura cada esquema en PostgreSQL 17 local y se compara con su
  manifiesto. La restauración es completa, con estructura y datos. No se desactivan
  triggers por defecto: una carga sólo de datos sobre una estructura existente choca con
  `orden_previo_item_en_su_registro` de Risk OS.

**Ante una falla.** La respuesta depende de la causa:

| Causa | Respuesta |
|---|---|
| Proyecto pausado | Reanudar desde el panel; los datos se conservan |
| Credencial o configuración incorrecta | Corregir la variable o la configuración y redesplegar |
| Saturación (conexiones, tamaño, cómputo) | Detener la carga y diagnosticar |
| Datos dañados | Evaluar una restauración selectiva del esquema afectado |

Una restauración nunca se dispara sola por un error. Antes de reemplazar datos, se detienen
los escritores y se hace una copia del estado actual. Se restaura sobre un esquema nuevo o
vacío y se verifica antes de reemplazar el que está en uso, para que una restauración que
falle no deje el contexto sin datos.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Consolidar Broker OS y Risk OS ya, para tener las tres apps activas | Postergada el 2026-11-10: exige preparar y probar el aislamiento antes de que haga falta |
| Pasar a Pro para tener copias automáticas | Lo decide el owner y no es requisito de esta etapa |
| Copia semanal | No permite recuperar hasta el día anterior |
| Borrar la Preview sintética para liberar un lugar | Es irreversible; pausar alcanza |

## Consecuencias

**Más fácil:** trabajar en Risk OS sin pagar y sin consolidar; recuperar cualquier base
hasta el día anterior; saber qué hacer ante una pausa sin improvisar una restauración.

**Más difícil:** las copias diarias son trabajo manual del owner mientras haya cambios, y
mientras Risk OS esté activo, Communication OS no recibe mensajes.

## Criterio de falsación

Se revisa si alternar empieza a interrumpir el trabajo con frecuencia (más de una
alternancia por día o un recorrido que no se puede probar), si una restauración mensual
falla, si se pierden mensajes de WhatsApp en una pausa o si se reabre la consolidación.
