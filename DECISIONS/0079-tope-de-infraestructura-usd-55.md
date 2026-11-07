# ADR-0079 — El tope de infraestructura sube a USD 55 y se aprueba Supabase Pro para VS01 con Vercel Pro

- **Id en `decisions.yaml`:** D-0079
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-07
- **Supersede:** en parte D-0076 (el tope de USD 45 y la cláusula que no autorizaba
  Vercel Pro más Supabase Pro). El resto de D-0076 sigue vigente.
- **Aprobación:** el owner, el 2026-11-07, en el hilo de T-0037.

## Contexto

`T-0037` presentó cinco configuraciones contra el tope de D-0076
(`docs/migration/zoho/T-0037-infraestructura.md` §4). La recomendada era sólo Supabase
Pro para VS01 (opción A). El owner eligió además Vercel Pro (opción D), que de lista suma
USD 45 y, con 21 % de IVA, unos USD 54,45: pasaba el tope. Entre subir el tope a USD 70,
a USD 55, excluir el IVA o volver a la opción A, eligió subirlo a USD 55 con impuestos.

## Referencia canónica

La decisión y su estado viven únicamente en `decisions.yaml`, D-0079.

## Cómo se aplica

- **El margen es de USD 0,55.** Con 21 % de IVA, USD 45 de lista son USD 54,45. Cualquier
  consumo por encima de lo que incluyen los planes pasa el tope, por eso los dos límites
  de gasto son condición de la configuración, no una recomendación:
  - Supabase: el *spend cap* de la organización Pro activado.
  - Vercel: en *Spend Management*, un monto igual al crédito incluido y la acción de
    pausar los proyectos al alcanzarlo. Vercel trae por defecto un aviso a USD 200.
- **El resumen se paga en dólares.** Pagado en pesos se suma la percepción del 30 % y la
  configuración llega a unos USD 68.
- **Communication OS y Risk OS siguen en Supabase Free.** Con VS01 fuera de la
  organización Free quedan los dos lugares activos para ellos, y Risk OS se puede
  reanudar sin costo cuando se retome `T-0032`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Opción A: sólo Supabase Pro para VS01, tope de USD 45 | El owner quiere también las condiciones de uso comercial de Vercel Pro |
| Tope de USD 70 | Cubre el peor caso, pero el owner prefirió un tope más ajustado pagando en dólares |
| Tope de USD 45 sin IVA, tomando el IVA como crédito fiscal | Depende de una verificación contable que no está hecha |

## Consecuencias

**Más fácil:** VS01 tiene backups diarios y no se pausa; las tres apps corren en un plan
que admite uso comercial; Risk OS recupera su lugar en Supabase Free.

**Más difícil:** el margen sobre el tope es casi nulo. Un aumento de precio, una
diferencia de cambio o un consumo extra obligan a volver a decidir. Revertir es bajar
los planes: en Vercel, al bajar a Hobby se quitan los miembros salvo el owner original;
en Supabase, volver a Free tiene un corte de uno a dos minutos.

## Criterio de falsación

Es ACCEPTED, así que se revisa con un ADR nuevo. Señales para hacerlo: un cargo mensual
real, con impuestos, por encima de USD 55, o la necesidad de un segundo asiento que
despliega en Vercel o de un segundo proyecto en Supabase Pro.
