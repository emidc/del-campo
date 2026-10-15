# ADR-0068 — Dónde viven los datos reales de Risk OS v1 y quién los carga

- **Id en `decisions.yaml`:** D-0068
- **Fecha:** 2026-10-14
- **Supersede:** —

> **Decidido por el owner el 2026-10-15:** opción b (`SLICES/RO01-decisiones.md`,
> punto 1), con Supabase Pro en sa-east-1 y Vercel Pro. El estado está en
> `decisions.yaml`; el owner lo eligió sin criterio de revisión.

## Contexto

La aceptación de Risk OS v1 (`SLICES/RO01.md` §6, A6 a A8) se mide sobre cinco empresas
históricas reales, con ciclos posteriores y revisión profesional. Esos datos tienen que
vivir en algún lugar donde Risk OS los lea, y hoy no hay ninguno autorizado.

Hechos que restringen la elección:

1. **D-0062 no se extiende** (D-0063). Autoriza las tablas de VS01 en un proyecto de
   Supabase y nada más. Los datos de otro laboratorio necesitan su propia autorización.
2. **D-0067 no autoriza datos reales.** Dice de quién es cada dato entre Broker OS y
   Risk OS, y deja la autorización para una decisión aparte bajo R-19.
3. **Ningún agente de desarrollo lee ni recibe los valores** (R-19). Los prepara y los
   carga el owner, desde su máquina, con el importador de T-0029 y su informe sin
   valores.
4. **Qué clase de datos son**, según la lista de estructura que el owner respondió sin
   valores (`SPIKES/T-0021/v0/fase-15/lista-casos-historicos.md`): matrices de riesgo de
   cinco organizaciones reales, con montos en ARS y una magnitud económica de
   referencia (A13, A14), historia de siniestros con consumo de límite (D7), pólizas y
   coberturas (D1 a D9), valoraciones con quién las hizo y quién las revisó (B4, B6) y
   observaciones por factor. Puede haber hechos de accidentes y de personas en las
   observaciones de I-personas. Es información confidencial de terceros, con categorías
   que `DOMAIN.md` trata como especialmente sensibles (información financiera,
   accidentes).
5. **Quién la usa:** el owner y un revisor profesional distinto del evaluador original
   (decisión 6 del owner), cada uno con su credencial. No hay clientes ni usuarios
   externos.
6. **Plazo y capacidad:** el hito es el 2026-11-25, con 28 h semanales de programa
   técnico (`PROJECT.md` §5).

## Referencia canónica

La pregunta y su estado viven en `decisions.yaml`, bajo D-0068. Acá están las opciones
y lo que implica cada una.

## Opciones

Cualquier opción cumple estas condiciones, que no están en discusión:

- carga el owner, desde su máquina; ningún agente se conecta a la base ni recibe la
  cadena de conexión (R-13, R-16, R-19);
- los despliegues de preview y CI sólo ven datos sintéticos;
- el informe que vuelve al repositorio es el del modo sin valores, más los conteos de la
  aceptación;
- al cierre de Q4 se decide si los datos se conservan o se borran (D-0063).

| Opción | Qué es | Qué implica |
| --- | --- | --- |
| a | Postgres hosteado nuevo y dedicado a Risk OS, en plan gratuito y región sa-east-1 (São Paulo), servido por un proyecto de Vercel Hobby propio. Mismo esquema de autorización que D-0062. | Repite los riesgos que el owner aceptó para VS01: el proyecto se pausa tras una semana sin actividad, no hay backups automáticos (copia manual del owner fuera del repositorio), logs cortos, uso comercial fuera de las condiciones de Vercel Hobby y transferencia internacional de datos de terceros. El revisor trabaja por la UI. |
| b | Lo mismo que a, en planes pagos de la base y de Vercel. | Backups y sin pausa. Costo mensual que contrata el owner (R-14). Mismo tratamiento de transferencia internacional. |
| c | Sólo en la máquina del owner: Postgres local, con la app corriendo ahí. Nada hosteado con datos reales. | Ningún dato real sale del equipo del owner ni hay transferencia internacional. El revisor trabaja en ese equipo o junto al owner. El despliegue de RO01 §7 queda para las sintéticas, o no se hace. La copia de respaldo es manual. La base no puede llamarse `*_dev` ni `*_test`, para que los tests de integración nunca la toquen (`scripts/guard-db-tests.mjs`). |
| d | En el proyecto de Supabase de VS01, con el esquema `risk` y un rol propio. | Menos infraestructura. Mezcla con la producción de Broker OS datos de otra clase, que es lo que D-0063 evita, y una falla o una pausa del proyecto afecta a los dos sistemas. |

## Decisión

Opción b, en palabras del owner: "Las cinco empresas reales se alojan en
infraestructura hosteada, paga y dedicada a Risk OS. La base y el despliegue no se
comparten con Broker OS ni Communication OS. Los sintéticos y previews no requieren
datos reales." Con las condiciones comunes de arriba.

Proveedor, plan y región, elegidos por el owner el mismo día: un proyecto nuevo de
Supabase en plan Pro, región sa-east-1 (São Paulo), para la base, y un proyecto nuevo de
Vercel en plan Pro para la aplicación. Los dos son propios de Risk OS y no se comparten
con VS01 ni con Communication OS.

## Consecuencias

- T-0032 escribe `docs/despliegue/vercel-risk.md` para Supabase y Vercel, y el owner
  contrata y opera una base hosteada más, con su costo mensual (R-14).
- Los backups son los del plan Pro de Supabase; no hay pausa por inactividad.
- Los datos de terceros salen del país, a São Paulo, igual que en VS01.
- Borrar los datos al cierre de Q4 es borrar una base, porque Risk OS no comparte
  esquema con nadie (D-0063).

**Costo de revertir:** bajo mientras no haya datos cargados. Después, mover los datos
de lugar es una exportación y una importación que hace el owner.

## Criterio de falsación

No tiene. El owner eligió la decisión firme, sin criterio de revisión. Al cierre de Q4
se decide igual si los datos se conservan o se borran (D-0063), lo que no reabre dónde
viven mientras existan.
