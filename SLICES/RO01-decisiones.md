# RO01 · Decisiones del owner

> 2026-10-15 · Respuesta de Emiliano al "Para decidir" de `SLICES/RO01-dossier.md`,
> escrita en el hilo del proyecto el **2026-10-15 a las 00:43:48 UTC**. Abajo va copiada
> sin cambios, después una tabla con lo que quedó decidido y al final lo que se aplicó.

## Texto de Emiliano (copia literal)

> 1. Datos reales: opción b. Las cinco empresas reales se alojan en infraestructura hosteada, paga y dedicada a Risk OS. La base y el despliegue no se comparten con Broker OS ni Communication OS. Los sintéticos y previews no requieren datos reales.
> 2. Acceso a la UI: opción b. Cada persona tiene su propia credencial. La identidad de quien evalúa, revisa o acepta deriva de la sesión y no de un nombre escrito libremente. Para v1 alcanza una autenticación mínima propia; no se incorpora OIDC todavía.
> 3. Unidad de despliegue: opción a. Risk OS tiene proyecto de aplicación y base propios. No comparte credenciales, esquema ni ciclo de despliegue con Communication OS.
> 4. Vistas: opción a. Entran en v1 las cuatro vistas adicionales en forma mínima: seguridad y no evaluables como secciones/filtros de la lista, escenarios agregados como listado de escenarios y miembros, y detalle de riesgo con historial y movimiento por dimensión.
> 5. Reordenamiento profesional: opción a. Se implementa como registro propio de Risk OS, conservando orden calculado, evaluaciones vigentes, autor, fecha, causa, fundamento y los campos necesarios para los disparadores de reapertura de la metodología.
> 6. Revisión profesional: opción b. La revisión de las cinco empresas la realiza un profesional distinto del evaluador original. Antes de acceder al ranking, bandas o `C_raw` de Risk OS registra para cada empresa, usando material ciego, su orden profesional y las bandas que considere correspondientes. Después accede a Risk OS y realiza la revisión, aceptación y eventuales reordenamientos. De esta forma la revisión de producto también puede producir evidencia independiente utilizable por EMI-44 y D14.
> 7. Diez ciclos: opción b. La aceptación requiere al menos diez revisiones pendientes cerradas después de la importación, al menos una en cada una de las cinco empresas históricas y al menos tres tipos de disparador entre `accion_ejecutada`, `informacion_nueva` y `cambio_contexto`. Las revisiones abiertas y los ciclos ya contenidos en los CSV no cuentan.
> 8. `no-cupo.csv`: opción a. No se inventan suficiencia ni exposición retenida para los casos sintéticos que no las contienen. La UI representa explícitamente `no evaluada` y `sin estimar`; las funciones se verifican mediante fixtures y las históricas que tengan esos datos.
> 9. RO01: aprobado, con las siguientes resoluciones de hallazgos:
>
> * H1: opción a; las acciones históricas se completan profesionalmente con factor objetivo, mecanismo, estado, evidencia y demás campos requeridos, con procedencia explícita, y se selecciona una sola cadena de evaluación por riesgo.
> * H2: agregar un registro append-only de novedades con destino riesgo/acción/transferencia, tipo `comentario | informacion_nueva | cambio_contexto`, texto, evidencia, autor y fecha. `informacion_nueva` y `cambio_contexto` abren revisión pendiente; `comentario` no.
> * H3: un lote cuya huella de los tres archivos sea idéntica a uno ya importado responde `ya importado` sin escribir ni ejecutar una segunda importación. Un lote diferente que reutilice ids sigue fallando por RV-ID-02.
> * H6: `C_raw` puede verse en el detalle del riesgo, siempre acompañado por el vector y las banderas; no se muestra como número principal de la lista.
> * H7: portar al contexto Risk el lector de CSV ya probado en el spike, manteniendo su comportamiento y regresión.
> * H8: queda resuelto por la decisión 7.
>
> 10. T-0028 a T-0032: sí. Crear las cinco tareas en estado `DRAFT`, ajustadas a estas decisiones antes del merge.
> 11. T-0021: sí, cerrar. Incorporar su evidencia, cambiar `status: DONE` y actualizar `PROJECT.md` §3 como está preparado. RO01 pasa a ser el contrato de construcción de Risk OS v1.

## Qué quedó decidido

| # | Punto | Opción | ¿Igual a la recomendada? |
|---:|---|---|---|
| 1 | Datos reales | b: hosteado, pago y dedicado a Risk OS | No: recomendaba a (plan gratuito) |
| 2 | Acceso | b: credencial por persona; la identidad sale de la sesión; sin OIDC | Sí |
| 3 | Despliegue | a: proyecto y base propios | Sí |
| 4 | Vistas | a: las cuatro, en forma mínima | Sí |
| 5 | Reordenamiento | a: registro propio, con los campos de los disparadores | Sí |
| 6 | Revisión profesional | b, **con un agregado**: el revisor registra antes, con material ciego, su orden y sus bandas por empresa | Sí, más el registro previo ciego |
| 7 | Ciclos | b: 10 cerrados después de la importación, al menos uno por histórica y al menos tres tipos de disparador | Sí |
| 8 | `no-cupo.csv` | a | Sí |
| 9 | RO01 | aprobado, con H1 a, H2, H3, H6, H7 y H8 resueltos | — |
| 10 | Tareas | sí, en `DRAFT` y ajustadas antes del merge | — |
| 11 | T-0021 | sí, cerrar; `PROJECT.md` §3 como está | — |

## Qué se aplicó

- **RO01** pasa a "aprobado por el owner" el 2026-10-15. Sus marcas de pendiente se
  reemplazan por lo decidido. Lo nuevo es el punto 6: un registro del orden y las bandas
  previos del revisor, con fecha anterior a su primer acceso a resultados, y las sesiones
  de cada persona registradas para poder comprobarlo (RO01 §2, §6 y §7).
- **D-0068** queda con la opción b escrita y, con lo de abajo, decidida.
- **T-0028 a T-0032** quedan ajustadas: novedades y reordenamiento en el esquema
  (T-0028), lector portado y "ya importado" (T-0029), credencial por persona con su
  registro de sesiones y `C_raw` sólo en el detalle (T-0030), orden previo del revisor y
  conteo de ciclos con los tres tipos de disparador (T-0031), y despliegue pago con el
  protocolo de la revisión ciega (T-0032).
- **T-0021** queda en `DONE`, con su evidencia, y `PROJECT.md` §3 con el cambio
  preparado.

## Proveedor, región y estado de D-0068

La respuesta de arriba no nombraba proveedor, plan, región ni estado de D-0068. Se le
preguntó en el hilo con una tarjeta de decisión: "¿Con qué proveedor y región cierro
D-0068, y en qué estado queda?". El **2026-10-15 a las 01:29:18 UTC** el owner eligió
la opción "Supabase + Vercel, firme", cuyo texto en la tarjeta era: "El mismo proveedor
y la misma región, pero D-0068 queda aceptada sin criterio de revisión", sobre la
opción anterior "Supabase Pro en sa-east-1 y Vercel Pro".

Se aplicó a `decisions.yaml`, al ADR 0068, a RO01 §5, §7, §9 y §10, y a T-0032.

## Corrección del plan de D-0068

El **2026-10-15 a las 12:19:22 UTC** el owner escribió en el hilo (copia literal):

> una corrección vamos a usar supabase gratuito y Vercel Hoby, hasta que Broker OS quede operativo.

Reemplaza los planes pagos de arriba: Supabase Free y Vercel Hobby, en proyectos
nuevos y dedicados a Risk OS, hasta que Broker OS quede operativo. La región sigue en
sa-east-1 y el estado de D-0068 no cambia. Se aplicó a `decisions.yaml`, al ADR 0068,
a RO01 §5, §7 y §8, y a T-0032.

## Preparación asistida — 2026-10-19

La decisión posterior del owner se registra en D-0070 y refina D-0068. El flujo
vigente está en `docs/despliegue/preparacion-datasets-risk.md`. Las citas y tablas
anteriores conservan su fecha y no acreditan preparación ni aceptación realizada.
