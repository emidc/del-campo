---
id: T-0032
title: Desplegar Risk OS y ejecutar la aceptación de RO01
kind: FEATURE
status: ACTIVE
workstream: BOS
riskClass: HIGH
size: L
created: 2026-10-14
blockedBy: [T-0030, T-0031]
contextRefs: [SLICES/RO01.md, SLICES/RO01-dossier.md, SLICES/RO01-decisiones.md,
              DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md,
              DECISIONS/0068-datos-reales-risk-os.md,
              DECISIONS/0058-nextjs-en-vercel.md,
              docs/despliegue/vercel-communication.md, docs/despliegue/vercel-vs01.md,
              ops/evidence/T-0026-aceptacion.md, contexts/risk/README.md,
              SPIKES/T-0021/v0/fase-13/dossier-cierre-emi15.md, ENGINEERING_RULES.md]
decisionRefs: [D-0013, D-0014, D-0058, D-0063, D-0067, D-0068]
---

## Why

T-0028 a T-0031 dejan a Risk OS importando, mostrando y actualizando riesgos, pero sólo
en local y con sintéticos. El hito "v1 accepted" (2026-11-25) se mide sobre las cinco
empresas históricas reales, con al menos diez ciclos y revisión profesional
(`SLICES/RO01.md` §6). Esta tarea pone Risk OS donde decidió D-0068, deja que el owner
cargue las históricas sin que un agente vea sus valores y ejecuta el protocolo de
aceptación. Su resultado decide si Risk OS v1 se acepta y alimenta la decisión de
cierre de Q4 sobre el laboratorio (D-0063).

## Outcome

- **Risk OS corre en su propio proyecto de aplicación y en su propia base Postgres
  hosteada para los datos reales, dedicados** (D-0068; decisiones 1 y 3 del owner), sin compartir credenciales, esquema ni ciclo de despliegue con VS01
  ni con Communication OS. Las previews sólo reciben la base sintética. No hay worker.
- **`docs/despliegue/vercel-risk.md`** documenta, como `vercel-communication.md`:
  - la configuración del proyecto y las variables de entorno, sin valores;
  - cómo crear la base y aplicar y revertir las migraciones del contexto. Las ejecuta
    el owner (R-13); ningún agente se conecta a la base con datos reales;
  - cómo importar un lote con el modo sin valores y dónde pegar su informe;
  - cómo hacer y guardar la copia manual de la base fuera del repositorio, cómo
    restaurarla, cómo reactivar el proyecto si se pausa por inactividad, cómo volver a
    la versión anterior y cómo apagar todo (pausar el proyecto, borrar la base);
  - cómo da de alta el owner la credencial de cada persona;
  - los planes (Supabase Free en sa-east-1 y Vercel Hobby, D-0068), sus límites y qué
    cambia al pasar a planes pagos cuando Broker OS quede operativo. Esta tarea no
    contrata nada (R-14).
- **Script de aceptación** del contexto: corre contra una base y devuelve los criterios
  A6, A7, A8 y A12 de RO01 §6 con códigos de empresa (H1 a H5 para las históricas),
  conteos y fechas, sin títulos, observaciones ni montos. Para A8 compara, por
  empresa, la fecha del orden previo del revisor con la de su primer acceso a
  resultados, y mide los disparadores de reapertura (dossier de la Fase 13, §5) entre
  ese orden y el de Risk OS, como evidencia para EMI-44 y D14. Lo corre el owner
  contra la base real.
- **La aceptación de RO01 está ejecutada según §6**, con su acta en
  `ops/evidence/T-0032-aceptacion.md`: cada criterio con su valor medido y si cumple,
  la salida literal de los tests de A1 a A5, A9 y A10, el informe sin valores de cada
  importación de las históricas y la salida del script de aceptación. Si un criterio no
  cumple, el acta lo dice y RO01 no se declara aceptado (§6, protocolo, punto 7).

## Non-scope

- Leer, copiar o recibir valores de las históricas (R-19). El agente ve sólo conteos,
  códigos de empresa y los informes sin valores que el owner pega.
- Conectarse a la base con datos reales, recibir sus credenciales o las de Vercel
  (R-13, R-16).
- Contratar planes pagos o aceptar condiciones comerciales en nombre de Del Campo.
- Revisar, aceptar o cerrar algo en nombre del owner o del revisor.
- Cambios en el proyecto, la base o el despliegue de VS01 o de Communication OS.
- Monitoreo y alertas.
- IA, integración con Broker OS y las reglas de la v1.1.

## Verification

```bash
pnpm check
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test pnpm test
pnpm --filter "./apps/risk" run build
```

Comprobaciones humanas, registradas en `ops/evidence/T-0032.md`:

- [ ] El owner siguió `docs/despliegue/vercel-risk.md` de punta a punta, y lo que no
      coincidió quedó corregido en el documento.
- [ ] Las migraciones del contexto se aplicaron en la base hosteada, ejecutadas por el
      owner, y la reversa está probada en local.
- [ ] Contra el despliegue (`curl`), sin credencial y con credencial inválida, cada
      página y cada endpoint responden sin datos.
- [ ] Ninguna preview tiene la cadena de conexión de la base real.
- [ ] Las cinco históricas están importadas, y el informe sin valores de cada intento
      está en el acta.
- [ ] El revisor, distinto del evaluador original, registró su orden y sus bandas de
      cada empresa con material ciego que preparó el owner fuera del repositorio
      (R-19), antes de su primer acceso a resultados según el registro de sesiones.
- [ ] `ops/evidence/T-0032-aceptacion.md` tiene los trece criterios de RO01 §6 con su
      valor medido.
- [ ] El repositorio, el acta y la evidencia no contienen valores de las históricas ni
      credenciales, revisado por el owner.
- [ ] Revisión ciega por subagente aislado (R-33), registrada en `REVIEWS/T-0032-*.md`.

## Data effects

- **Sistemas externos:** un proyecto de aplicación nuevo y una base Postgres hosteada
  nueva: Vercel Hobby y Supabase Free en sa-east-1 (D-0068). Los
  crea y configura el owner (R-13, R-14).
- **Datos reales:** los de las cinco empresas históricas, cargados por el owner desde
  su máquina en la base que autorice D-0068. Ningún agente los ve (R-19).
- **Credenciales:** las del acceso a la UI y la cadena de conexión. Las genera y carga
  el owner como variables del despliegue (R-16).
- **Reversión:** pausar el proyecto de Vercel y borrar la base hosteada. Al cierre de Q4
  se decide si los datos se conservan (D-0063).

## Risks

- **Depende del tiempo del owner** más que del código: preparar y cargar cinco
  empresas, operar diez ciclos y coordinar la revisión profesional antes del
  2026-11-25. El acta dice lo que se midió, aunque no alcance.
- **Preparar las históricas puede pedir completar las acciones** (hallazgo H1 del
  dossier). Si un intento se rechaza, se corrige en el origen; los rechazos quedan
  contados.
- **Material ciego.** Si el material que recibe el revisor deja ver el ranking o las
  bandas de Risk OS, A8 deja de ser evidencia independiente. Lo prepara y lo controla
  el owner.
- **Plan gratuito** (D-0068): el proyecto de Supabase se pausa tras una semana sin
  actividad y no tiene backups automáticos. Una pausa en medio de los ciclos corta el
  acceso del revisor; la copia manual del owner es la única recuperación.
- **Un fallo de un criterio.** No se reemplaza ni se borra, y los umbrales no bajan
  después de medir (RO01 §6).

## Notes

`kind: FEATURE` y no `MIGRATION`: como T-0026, entrega despliegue, documentación y
scripts de aceptación. La carga de las históricas usa el importador de T-0029 y la
ejecuta el owner; esta tarea no escribe un programa de migración desde un sistema de
origen, que es lo que fue T-0013. R-33 rige igual en los dos kinds.

`riskClass: HIGH` porque deja datos reales de terceros en una base hosteada y configura
sistemas externos: plan mode y aprobación del owner en cada paso externo (R-13).

RO01 §10. Linear: el hito "v1 accepted"; cierra lo que quede de EMI-23 a EMI-26 según
el acta. Ajustada a las decisiones del owner del 2026-10-15
(`SLICES/RO01-decisiones.md`): 1b, 2b, 3a, 6b con el orden previo ciego y 7b, y a
D-0068 con Supabase Free en sa-east-1 y Vercel Hobby.
