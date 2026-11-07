# T-0037 · Propuesta de infraestructura dentro de USD 45 (D-0076)

**Estado: decidido el 2026-11-07 (D-0079).** El owner eligió la opción D, Supabase Pro para
VS01 más Vercel Pro, y subió el tope a USD 55 con impuestos. Los pasos para contratar están
en el §8. Las secciones 1 a 7 son la propuesta tal como se presentó. Escrita el
2026-11-06 en la rama `task/T-0037-infra-y-diseno-del-refresco`.

## 1. Qué hay hoy

Inventario armado con `docs/despliegue/` y `ops/evidence/T-0035.md`. Lo que no está en el
repositorio queda como **a confirmar por el owner** en el panel de cada servicio.

| Servicio | Proyecto | Plan | Estado | Fuente |
|---|---|---|---|---|
| Supabase | Producción de VS01 (Broker OS), sa-east-1 | Free | Activo | D-0062, `vercel-vs01.md` §9 |
| Supabase | Preview de VS01 con el lote sintético | Free | A confirmar | `vercel-vs01.md` §5 |
| Supabase | Communication OS | Free | Activo (fase 3 de T-0035 en `oidc` el 2026-11-06) | `vercel-communication.md` |
| Supabase | Risk OS, sa-east-1 | Free | **Pausado**: el plan admite dos proyectos activos | `ops/evidence/T-0035.md`, fase 4 |
| Vercel | VS01 (`apps/web`) | Hobby | Activo | D-0058 |
| Vercel | Communication OS (`apps/communication`) | Hobby | Activo | `vercel-communication.md` |
| Vercel | Risk OS (`apps/risk`) | Hobby | Activo, sin base | `vercel-risk.md` |

Costo actual: USD 0. Riesgos aceptados hoy (D-0062, D-0068): Supabase Free pausa un
proyecto tras una semana sin actividad y no hace backups; Vercel Hobby excluye el uso
comercial.

## 2. Precios vigentes

Consultados el 2026-11-06 en las páginas oficiales. Son precios de lista en USD, **sin
impuestos**.

| Concepto | Precio | Fuente |
|---|---|---|
| Supabase Free | USD 0; dos proyectos activos; pausa tras una semana sin actividad; sin backups; 500 MB por base | supabase.com/pricing |
| Supabase Pro | Desde USD 25 por organización y por mes; incluye USD 10 de cómputo, que cubren **una** instancia Micro | supabase.com/pricing |
| Supabase Pro, cada proyecto adicional Micro | USD 10 por mes (el crédito cubre sólo el primero) | supabase.com/pricing |
| Supabase Pro, qué suma | Backups diarios con 7 días de retención, sin pausa por inactividad, 8 GB de disco por proyecto, 250 GB de egress | supabase.com/pricing |
| Vercel Pro | USD 20 por mes de plataforma; incluye un asiento que despliega y USD 20 de crédito de uso; asientos de solo lectura gratis; cada asiento extra que despliega, USD 20 | vercel.com/docs/plans/pro-plan (actualizada el 2026-09-15) |

Dos detalles de Supabase que cambian las cuentas:

- En una organización Pro **todos** sus proyectos se pagan. Un proyecto gratuito tiene que
  vivir en otra organización con plan Free, que sigue limitada a dos activos.
- Supabase deja **transferir un proyecto entre organizaciones** de la misma cuenta
  (supabase.com/docs/guides/platform/project-transfer). Su guía no menciona migración de
  datos y sólo declara corte de servicio al pasar de un plan pago a Free; exige ser owner
  de la organización de origen y no tener integración de GitHub ni log drains activos. No
  dice si cambian las cadenas de conexión: se comprueba en el paso 3 del §6.

## 3. Impuestos (estimado)

No verificado contra una factura real. Para tarjetas argentinas, sobre servicios digitales
del exterior:

| Concepto | Alícuota | Cuándo aplica | ¿Se recupera? |
|---|---|---|---|
| IVA (RG 4240) | 21 % | Siempre que el proveedor esté en el listado de ARCA | Crédito fiscal si quien paga es responsable inscripto y la tarjeta es de la empresa; si no, es costo |
| Percepción de Ganancias (RG 5617) | 30 % | Sólo sobre lo que se paga en pesos | Se computa en la declaración jurada o se pide la devolución; no aplica si se paga con dólares propios |

Para no depender de eso, cada opción se calcula en dos escenarios:

- **Probable:** 21 % de IVA como costo, resumen pagado en dólares (factor 1,21).
- **Peor caso:** 21 % de IVA más 30 % de percepción no recuperada (factor 1,51).

## 4. Opciones

| Opción | Qué cambia | Lista | Probable | Peor caso | ¿Entra en USD 45? |
|---|---|---|---|---|---|
| **A. Sólo la base de VS01 a Pro** | Se crea una organización Pro y se le transfiere el proyecto de producción de VS01. Communication OS y Risk OS quedan en la organización Free, que vuelve a tener lugar para los dos. La Preview sintética se pausa o se borra (§5) | 25 | 30,25 | 37,75 | Sí, con USD 7 a 15 de margen |
| B. VS01 y Risk OS a Pro | Como A, más Risk OS en la organización Pro | 35 | 42,35 | 52,85 | Sólo en el escenario probable y sin consumos extra |
| C. Vercel Pro, bases en Free | Los tres proyectos de Vercel pasan a un equipo Pro con un asiento. Las bases siguen en Free, con el límite de dos activas | 20 | 24,20 | 30,20 | Sí, pero Risk OS sigue sin lugar y no hay backups |
| D. Vercel Pro más Supabase Pro | A más C | 45 | 54,45 | 67,95 | No |
| E. Una sola base Pro para los tres contextos | Communication OS y Risk OS se migran al proyecto de VS01 como esquemas con roles propios (D-0063, D-0071) | 25 | 30,25 | 37,75 | Sí, pero exige dos migraciones de base, y D-0076 pide no mover Risk OS por defecto |

Qué resuelve y qué deja cada una:

| Opción | Resuelve | Deja |
|---|---|---|
| A | Backups diarios y sin pausa para la base con datos de clientes que el equipo va a usar a diario. Libera el lugar para reanudar Risk OS (fase 4 de T-0035, T-0032). Sin migrar datos | Vercel Hobby y su exclusión del uso comercial (riesgo ya aceptado en D-0062, PROVISIONAL). Communication OS y Risk OS sin backups automáticos |
| B | Lo de A, más backups para Risk OS | Margen nulo con impuestos: un consumo variable pasa el tope |
| C | Condiciones de uso comercial de Vercel | Sin backups; Risk OS sigue pausado salvo que se borre la Preview sintética |
| E | Lo de A para los tres contextos al mismo costo | Dos migraciones de producción y un ADR sobre la separación física; es trabajo de otra tarea |

## 5. Recomendación: opción A

1. Es la única que entra en el tope **aun en el peor caso** y deja margen para consumos.
2. Pone backups y continuidad donde más pesan: la base que la etapa 2 va a usar todos los
   días y que, desde T-0035, también guarda usuarios, invitaciones y auditoría que no
   existen en ningún otro lado.
3. No migra datos: el proyecto se transfiere de organización.
4. Destraba lo postergado: con VS01 fuera de la organización Free, Risk OS se puede
   reanudar sin pagar.

Lo que queda aceptado con A, y que el owner tiene que aceptar en forma explícita:

- **Vercel Hobby sigue excluyendo el uso comercial.** La salida es la opción C más A, que
  hoy no entra en el tope (opción D). Se revisa cuando el equipo use Broker OS a diario
  (compuerta de la etapa 2).
- **Communication OS y Risk OS siguen sin backups automáticos.** Mitigación sin costo: un
  `pg_dump` manual del owner antes de cada cambio de producción, como en
  `vercel-vs01.md` §9.1.
- **La Preview sintética pierde su base mientras esté pausada.** Las previews de VS01 se
  prueban en local con `pnpm vs01:seed`, o se reanuda la Preview pausando otro proyecto.

## 6. Pasos si el owner aprueba A

Todos los hace el owner, en los paneles; ningún agente tiene acceso (R-13, R-14).

1. `pg_dump` de la producción de VS01 a `~/del-campo-privado/`, como backup previo
   (`vercel-vs01.md` §9.1).
2. Crear la organización Pro en Supabase, con el **límite de gasto activado** (spend cap).
   El spend cap no cubre cómputo (ver §8, paso 3).
3. Transferir el proyecto de producción de VS01 a esa organización. Comprobar en *Connect*
   que las cadenas de conexión no cambiaron y que VS01 sigue respondiendo; si cambiaron,
   actualizar `DATABASE_URL` en Vercel y redesplegar.
4. Pausar o borrar la Preview sintética, y reanudar Risk OS cuando se retome T-0032.
5. Registrar el primer cargo real, con impuestos, en `ops/evidence/T-0037.md`. Si supera
   USD 37,75, se vuelve a esta tabla antes del segundo mes.

## 7. Qué no se verificó

- Qué proyectos de Supabase están activos hoy: la tabla del §1 sale de los documentos del
  repositorio.
- Que Supabase y Vercel estén en el listado de IVA de ARCA, y si Del Campo puede tomar el
  IVA como crédito fiscal.
- El precio final en la pantalla de checkout de Supabase para esta cuenta.

## 8. Lo que decidió el owner y cómo se contrata

El 2026-11-07 el owner eligió la opción D y subió el tope a USD 55 con impuestos (D-0079).
Con 21 % de IVA y el resumen pagado en dólares, la opción D cuesta unos USD 54,45: el
margen es de USD 0,55. Después, D-0081 fijó USD 55 como objetivo y USD 66 como techo. Los
límites de gasto de los pasos 3 y 5 son obligatorios, pero **ninguno garantiza el total**:
cada uno cubre sólo una parte de los cargos, como se detalla abajo. El total se controla
con la previsión del checkout (INF-CHK) y la conciliación de la primera factura (INF-04).

Todos los pasos los hace el owner, en los paneles (R-13, R-14).

1. `pg_dump` de la producción de VS01 a `~/del-campo-privado/` como backup previo
   (`vercel-vs01.md` §9.1).
2. Crear en Supabase una organización nueva y pasarla a Pro.
3. En esa organización, dejar activado el **spend cap**. Frena los excesos de uso (disco,
   egress, usuarios activos, Realtime, Storage, logs), pero **no cubre cómputo**, réplicas,
   branching, IPv4, PITR ni dominio propio
   ([Supabase, *Spend cap*](https://supabase.com/docs/guides/platform/spend-cap),
   consultado el 2026-11-07). El cómputo de un segundo proyecto en la organización, o
   un tamaño de instancia mayor que el incluido, se cobra igual con el cap activo. Por
   eso, la organización Pro tiene un solo proyecto hasta que T-0040 decida otra cosa.
4. Transferir **sólo** el proyecto de producción de VS01 a la organización Pro. Comprobar
   en *Connect* que las cadenas de conexión no cambiaron y que VS01 sigue respondiendo. Si
   cambiaron, actualizar `DATABASE_URL` en Vercel y redesplegar.
5. En Vercel, pasar el equipo que tiene los tres proyectos a Pro, con un solo asiento que
   despliega. Activar *Spend Management* con la pausa de los despliegues de producción.
   El monto (*On-Demand Budget*) cuenta **sólo el uso que excede el crédito mensual del
   plan** y no incluye asientos ni adicionales, así que va bajo: USD 5, no los USD 20 del
   crédito, que permitirían hasta USD 20 más de consumo. Vercel revisa el gasto cada
   pocos minutos, así que la pausa llega tarde y no es un tope exacto
   ([Vercel, *Spend Management*](https://vercel.com/docs/spend-management), consultado el
   2026-11-07).
6. Pagar los dos cargos con la tarjeta en dólares. Pagados en pesos, se suma la
   percepción del 30 % y el total llega a unos USD 68.
7. Pausar o borrar la Preview sintética de VS01. Con eso, Communication OS y Risk OS
   tienen los dos lugares de la organización Free, y Risk OS se puede reanudar cuando se
   retome T-0032.
8. Registrar el primer cargo real de cada servicio, con impuestos, en
   `ops/evidence/T-0037.md`. Si la suma pasa USD 55, se vuelve a decidir antes del
   segundo mes (D-0079, criterio de falsación).
