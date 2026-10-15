# ADR-0068 — Dónde viven los datos reales de Risk OS v1 y quién los carga

- **Id en `decisions.yaml`:** D-0068
- **Fecha:** 2026-10-14
- **Supersede:** —

> **Borrador para decidir.** Escrito en la Fase 0 del plan de Risk OS v1, con
> `SLICES/RO01.md`. Presenta las opciones y no elige ninguna: la elección es del owner,
> en el punto 1 de "Para decidir" de `SLICES/RO01-dossier.md`. Cuando decida, este ADR
> se completa con su respuesta, el `statement` de `decisions.yaml` pasa a decir lo
> decidido con el alcance de D-0062 (dónde, quién carga, qué se carga y qué no, qué
> riesgos se aceptan) y el estado pasa al que diga el owner.

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
5. **Quién la usa:** el owner y, según el punto 6 del dossier, un revisor profesional.
   No hay clientes ni usuarios externos.
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

## Consecuencias

Se completan con la opción elegida. Lo que ya se puede decir:

- Con a, b o d, T-0032 escribe `docs/despliegue/vercel-risk.md` y el owner opera una
  base hosteada más.
- Con c, el acceso a la UI del punto 2 del dossier puede no hacer falta, y la medición
  de la aceptación corre en el equipo del owner.
- En todas, borrar los datos al cierre de Q4 es borrar una base, porque Risk OS no
  comparte esquema con nadie (D-0063).

**Costo de revertir:** bajo mientras no haya datos cargados. Después, mover los datos
de lugar es una exportación y una importación que hace el owner.

## Criterio de falsación

Se escribe con la decisión, si queda con criterio de falsación.
