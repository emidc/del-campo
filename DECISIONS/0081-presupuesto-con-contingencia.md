# ADR-0081 — El presupuesto de infraestructura tiene objetivo USD 55 y techo USD 66

- **Id en `decisions.yaml`:** D-0081
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-07
- **Supersede:** en parte D-0079 (el tope de USD 55 pasa a ser objetivo). La configuración
  aprobada por D-0079 sigue vigente.
- **Aprobación:** el owner, el 2026-11-07, en el hilo del plan hacia la north star.

## Contexto

Con 21 % de IVA, la configuración de D-0079 cuesta unos USD 54,45: el margen sobre USD 55
era de USD 0,55. Además, el *spend cap* de Supabase excluye cómputo y algunos adicionales,
y el presupuesto de Vercel no corta en el acto, así que ninguno garantiza el total.

## Referencia canónica

`decisions.yaml`, D-0081.

## Cómo se aplica

- Objetivo USD 55, contingencia hasta 20 %, techo USD 66, todo con impuestos y consumos.
- Por encima de USD 55 se buscan ahorros antes de usar la contingencia.
- Una previsión por encima de USD 66 frena cualquier expansión hasta reducirla.
- Antes de contratar, el owner verifica en el checkout el total y qué cubren los límites
  de gasto (tarea INF-CHK del plan). La primera factura se concilia con este techo.
- Las suscripciones de IA del owner no cuentan en este total.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Mantener USD 55 como techo | Sin margen real para consumos o el tipo de cambio |
| Un techo más alto | El owner pidió minimizar siempre que se pueda |

## Consecuencias

**Más fácil:** absorber un consumo variable sin redecidir.
**Más difícil:** la contingencia no es presupuesto libre; usarla exige registrar por qué.

## Criterio de falsación

Un cargo mensual real por encima de USD 66, o la necesidad de un servicio nuevo, como
correo propio para el portal, obligan a un ADR nuevo.
