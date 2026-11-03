# ADR-0076 — La infraestructura de los tres contextos tiene un tope de USD 45 mensuales

- **Id en `decisions.yaml`:** D-0076
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-02
- **Supersede:** en parte D-0068 (paso de los proyectos de Risk OS a planes pagos cuando
  Broker OS quede operativo). Precisa D-0062, que sigue PROVISIONAL.
- **Aprobación:** el owner, el 2026-11-02, «Decisiones de cierre Q4 — Del Campo OS», punto
  4, en el hilo de T-0034.

## Contexto

VS01 (D-0062) y Risk OS (D-0068) corren en Supabase Free y Vercel Hobby con datos reales,
con riesgos aceptados: Vercel Hobby excluye el uso comercial, Supabase Free pausa un
proyecto tras una semana sin actividad y no hace backups automáticos. El plan proponía
pasar a planes pagos antes de sumar usuarios (C3). El owner fijó un tope en lugar de un
plan: el volumen esperado es bajo y no justifica infraestructura sobredimensionada.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0076.

## Cómo se aplica

- **El tope es el total.** USD 45 por mes para los tres contextos, con impuestos y consumos
  variables incluidos.
- **Nada se activa sin una configuración aprobada.** Antes de pagar algo se presenta al
  owner una configuración concreta con su costo mensual estimado, impuestos incluidos.
  Ningún agente contrata, migra ni cambia permisos de producción (R-13, R-14).
- **Vercel Pro más Supabase Pro no entra por sí sola.** Suman USD 45 antes de impuestos.
- **Risk OS no se mueve por defecto.** Su despliegue actual sigue como está. Antes de
  cambiarlo se evalúan aislamiento, seguridad, backups y continuidad.

## Pendiente de verificación

`T-0037` tiene que presentar la configuración. Datos que el owner no dio y que hay que
comprobar con las páginas de precios vigentes y la factura real, marcados acá como
**estimados**:

- **Impuestos.** Con impuestos sobre servicios digitales del exterior, USD 45 de lista
  superan el tope. Su porcentaje exacto no se verificó.
- **Supabase Pro.** USD 25 por organización incluye créditos de cómputo para un proyecto
  chico; cada proyecto adicional agrega cómputo. Con tres proyectos separados (VS01,
  Preview sintética y Risk OS) el costo sube; con un solo proyecto y un esquema por
  contexto (D-0063) no. Verificar.
- **Vercel Pro.** USD 20 por integrante que despliega. Hoy hay dos proyectos Hobby (VS01 y
  Risk OS) y Communication OS tiene su propio despliegue.

Configuraciones a evaluar en `T-0037`, sin decidir:

| Opción | Qué resuelve | Qué deja |
|---|---|---|
| Supabase Pro con un solo proyecto para los tres esquemas; apps en Vercel Hobby | Backups, sin pausa por inactividad, un solo costo de base | Vercel Hobby sigue excluyendo el uso comercial (riesgo de D-0062) |
| Vercel Pro; bases en Supabase Free | Condiciones de uso comercial de la app | Sin backups automáticos; la pausa por inactividad no aplica con uso diario |
| Supabase Pro más otro hosting de la app con plan gratuito que admita uso comercial | Las dos cosas, si existe ese hosting | Mover el despliegue de VS01 y revisar D-0058 |

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Pasar a Vercel Pro y Supabase Pro ya (recomendación original del plan) | Supera el tope con impuestos y anticipa una escala que no existe. |
| Infraestructura paga separada para Risk OS | El owner no la aprueba; la separación es lógica (D-0071). |

## Consecuencias

**Más fácil:** el costo tiene un techo explícito; cualquier gasto pasa por una propuesta.

**Más difícil:** con el tope, alguno de los riesgos de los planes gratuitos va a seguir
aceptado. Compartir un proyecto de Supabase entre contextos exige roles de base por
contexto para que la separación lógica sea real.

## Criterio de falsación

Es ACCEPTED, así que se revisa con un ADR nuevo. Señales para hacerlo: una pausa o pérdida
de datos que el tope no permite evitar, o un volumen de uso que haga inviable cualquier
configuración dentro de USD 45.
