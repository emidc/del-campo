---
id: T-0030
title: Entregar las vistas de Risk OS v1 con su acceso
kind: FEATURE
status: DRAFT
workstream: BOS
riskClass: MEDIUM
size: M
created: 2026-10-14
blockedBy: [T-0029]
contextRefs: [SLICES/RO01.md, SLICES/RO01-dossier.md,
              DECISIONS/0063-aislamiento-por-contexto-q4.md,
              DECISIONS/0067-propiedad-de-datos-broker-risk.md,
              DECISIONS/0058-nextjs-en-vercel.md,
              DECISIONS/0066-credencial-compartida-co01.md,
              SPIKES/T-0021/v1/metodologia-v1.md,
              SPIKES/T-0021/v0/fase-15/dossier-fase-15a.md,
              contexts/risk/README.md, apps/communication/README.md,
              ENGINEERING_RULES.md]
decisionRefs: [D-0058, D-0063, D-0066, D-0067]
---

## Why

Después de T-0029 los riesgos de una organización están en Risk OS, pero nadie los
puede ver. EMI-24 pide la lista o matriz, el plan de acción y la transferencia o
actividad, priorizando comportamiento y explicabilidad sobre acabado. La metodología
pide además una vista de seguridad, la de no evaluables con su cola, los escenarios y el
detalle con historial (§18), y fija cómo se lee `C_raw`. Esta tarea entrega esas
vistas en local, con el acceso que decidió el owner, y habilita la aceptación de
`SLICES/RO01.md` (A9 a A11) y la UI de T-0031.

## Outcome

- **Risk OS tiene su propia app web en el workspace**, separada de `apps/web` y de
  `apps/communication`, con el mismo stack (D-0058) y sin dependencias nuevas. Importa
  sólo lo que exporta `@del-campo/risk`. `pnpm lint` falla si la app importa
  `packages/*`, otra app, otro contexto o un archivo interno del contexto. `pnpm
  typecheck` y `pnpm lint` la cubren.
- **Acceso:** credencial por persona, validada en el servidor, con la contraseña como
  hash en variables del despliegue y comparación en tiempo constante. Sin la
  configuración, la app niega todo. Cada escritura de T-0031 toma el autor de la
  credencial. El mecanismo se registra en un ADR nuevo antes de implementarlo (R-05).
- **Lista por organización:** riesgos evaluables en el orden de D10, con posición
  (empate y provisional marcados), banda, vector de factores con estado y valor,
  banderas y dimensión determinante. El padre en la posición de su hijo prioritario,
  con sus hijos a la vista. Sub-riesgos y escenarios fuera del ranking principal. Si
  hay `unidad_id`, se puede filtrar por unidad sin reordenar (RO01 §3, regla 4). Dice
  qué evaluación usa cada riesgo y rotula "pendiente de revisión" la vigente que no
  está aceptada (regla 6).
- **Plan de acción:** por riesgo y por organización, acciones y decisiones de
  tratamiento con factor objetivo, mecanismo, estado, cambio esperado (rotulado como
  esperado, nunca como valor del factor), evidencia de ejecución y eficacia.
- **Transferencia y actividad:** coberturas por riesgo con póliza, vigencia, límite,
  sublímite, deducible, exclusiones, suficiencia ("no evaluada" cuando lo está) y
  exposición retenida ("sin estimar" cuando falta); eventos de póliza rotulados como
  observación local con su procedencia (D-0067); límite disponible calculado. El feed
  une por fecha evaluaciones, cambios de estado de acciones, eventos, revisiones
  pendientes y novedades.
- **Vistas de la metodología** (RO01 §2, recomendación del punto 4): seguridad, con
  cada `safety_critical` y su acción o decisión, o la alerta; no evaluables con la cola
  de validación en el orden de §9.5; escenarios con sus miembros; detalle del riesgo
  con su historial, el movimiento por dimensión contra la evaluación anterior aceptada
  y el techo plausible rotulado aparte.
- **`C_raw`:** la lista muestra banda, vector y banderas; `C_raw` aparece en el detalle,
  siempre con el vector y las banderas (hallazgo H6). Ninguna vista lo suma, promedia,
  resta, divide, agrega ni compara entre organizaciones (RO01 §3, reglas 1 y 2).
- **Lista de recorrido** en el README de la app: qué tiene que mostrar cada vista con
  las 8 sintéticas, para A11.
- **Tests (R-26):**
  - el test de RO01 §3, regla 1: recorre cada página y cada endpoint de datos con las 8
    sintéticas cargadas y falla si encuentra un `C_raw` sin el vector y las banderas;
  - reglas 2 a 6 de RO01 §3 sobre lo que entregan las vistas;
  - denegación (R-28): sin credencial y con credencial inválida, en cada página y cada
    endpoint, sin exponer datos;
  - integración contra el Postgres local con las sintéticas importadas.

  `pnpm test` los incluye.

## Non-scope

- Escribir desde la UI: reevaluaciones, acciones, novedades, revisiones y
  reordenamientos son de T-0031. Esta tarea sólo lee, salvo el acceso.
- Despliegue, proyecto de Vercel, base hosteada y credenciales reales. Son de T-0032.
- Datos reales (R-19).
- Login con proveedor de identidad, roles y permisos por persona.
- Gráficos, acabado visual y exportaciones, salvo lo que una vista necesite para
  explicarse.
- El export ciego (sigue en el spike).
- Integración con Broker OS (D-0063, D-0067).
- Cambios en `apps/web`, `apps/communication`, `packages/*` o `DOMAIN.md`, salvo lo
  mínimo de configuración del workspace, del lint, del typecheck y del script de tests.

## Verification

```bash
pnpm check
RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test pnpm test
pnpm --filter "./apps/risk" build
```

Comprobaciones humanas, registradas en `ops/evidence/T-0030.md`:

- [ ] Imports de prueba hacen fallar `pnpm lint`, y se revierten: desde la app hacia
      `@del-campo/db`, `@del-campo/communication`, `apps/web` y un archivo interno de
      `contexts/risk`. Un import de la app hacia `@del-campo/risk` pasa.
- [ ] Con la app levantada en local, sin credencial y con credencial inválida, cada
      página y cada endpoint responden sin datos (`curl`).
- [ ] El owner recorre las vistas con las 8 sintéticas en `delcampo_risk_dev`, con la
      lista del README, y anota lo que no coincide.
- [ ] El repositorio no contiene credenciales ni hashes.
- [ ] Revisión ciega por subagente aislado (R-33), registrada en `REVIEWS/T-0030-*.md`.

## Data effects

- **Bases de datos:** sólo `delcampo_risk_dev` y `delcampo_risk_test`, locales, con
  sintéticos.
- **Sistemas externos:** ninguno.

## Risks

- **Una vista que agrega sin querer.** Un total, un promedio o un gráfico por
  organización es la forma más fácil de violar RO01 §3. El test de la regla 2 mira
  las salidas, no la intención.
- **El acceso decide el autor de T-0031.** Si el owner elige una credencial compartida
  en lugar de una por persona, el autor de cada cambio pasa a ser declarado y A8 lo
  tiene que decir.

## Notes

RO01 §10. Linear: EMI-24.

Depende de tres puntos de "Para decidir" de `SLICES/RO01-dossier.md`: acceso (punto 2,
escrita con b, credencial por persona), vistas (punto 4, escrita con a, las cuatro) y
`C_raw` en pantalla (punto 9, hallazgo H6). Se ajusta antes de pasar a `READY` si el
owner decide otra cosa. Con el punto 1 en c (todo local) el acceso puede no hacer falta.
