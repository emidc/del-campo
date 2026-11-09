# Crónica del programa, septiembre a noviembre de 2026

Texto que `PROJECT.md` §3 acumuló entre el 07/09 y el 03/10/2026 y retiró `T-0042` el
09/11/2026 para que ese archivo diga sólo el estado vigente. Se conserva sin cambios; lo
que acá aparece como pendiente puede haberse resuelto después. El estado actual está en
`PROJECT.md`.

## Fase actual: Project OS Zero, con Broker OS ya en código

Hay **dos cosas distintas** y desde el 21/09/2026 están en fases distintas. Confundirlas
haría leer mal el resto de este documento.

**Project OS sigue siendo Project OS Zero.** No es una aplicación. Es este repositorio:

- `TASKS/` — las tareas, como archivos versionados.
- `DECISIONS/` + `decisions.yaml` — las decisiones, con índice legible por máquina.
- `ops/runs/` — el ledger de ejecuciones de agentes, escrito automáticamente por un hook.

Para Project OS no hay base de datos, no hay servicio, no hay adapters, no hay UI, y su
criterio de promoción sigue sin cumplirse.

**Broker OS ya tiene código.** T-0010 levantó el workspace ejecutable y T-0012 creó el
primer schema, con las invariantes de `DOMAIN.md` §67 como constraints de Postgres,
migraciones SQL, tests de integración contra un Postgres real y CI corriéndolos. O sea
que la frase "no hay código de aplicación todavía", que este documento sostuvo hasta el
merge de T-0012, dejó de ser cierta. Lo que no cambió es el alcance: cero importación,
cero UI, cero endpoints, cero autorización.

**Criterio de promoción a aplicación:** haber registrado al menos 30 AgentRuns reales **y** haber escrito el tercer script ad-hoc para consultarlos. Hasta que las dos condiciones se cumplan, Project OS sigue siendo archivos. → `D-0015`

### Próximo incremento

`T-0004` cerró discovery el 19/09/2026 y `T-0015` alineó el dominio con su evidencia:
frontera entre staging y dominio, referencias externas no resueltas, identidad fiscal,
tomador único, `Endorsement`, unicidad de número de póliza, clases de agente y ejes de
autoridad documental. El objetivo de `T-0007` quedó absorbido: el estado de las decisiones
ya no se escribe a mano en ningún documento canónico y se genera con `pnpm decisions`.

`T-0011` cerró el 20/09/2026 con revisión humana: `SLICES/VS01.md` contiene el contrato
aprobado de software y aceptación, y descompuso T-0014 en T-0016, T-0017 y T-0018.

Entre el 20 y el 21/09/2026 cerraron, en este orden, las cuatro tareas que hacían falta
para que el arnés pudiera sostener código de aplicación:

- `T-0010` — workspace ejecutable, TypeScript estricto, límites de módulo por lint,
  runner de tests y Postgres local con la versión mayor fijada.
- `T-0005` — el contrato de tarea congelado contra el merge-base por un job de CI: las
  cuatro secciones obligatorias de una tarea ya no se pueden aflojar desde la rama que
  la implementa.
- `T-0009` — el procedimiento de revisión ciega por subagente aislado, y después su
  alcance: obligatoria en `FEATURE` y `MIGRATION`. → `D-0052`
- `T-0012` — el schema de VS01. Su revisión ciega devolvió STOP con once hallazgos sobre
  un diff cuyo check local estaba en verde; se corrigieron y un revisor en frío los
  cerró uno por uno.

Entre el 21 y el 28/09/2026 se completó VS01: `T-0013` (importador del lote de Zoho),
`T-0016` (búsqueda y consulta), `T-0017` (vinculación documental con comprobación humana,
D-0057) y `T-0018` (app interna en Vercel con login corporativo de Google, D-0058 y D-0059).
Los datos reales se cargaron en Supabase bajo D-0062 y VS01 se aceptó el 28/09/2026 con
20 de 20 casos y una reducción de la mediana de tiempo del 56,8 %, con la incertidumbre
declarada en `ops/evidence/T-0018-aceptacion.md`. `SLICES/VS01.md` es histórico.

### Qué sigue después de esta fase

1. Retrospectiva de VS01 y decisión sobre una medición confirmatoria. Los links de Zoho
   ya se muestran como nivel sin comprobar (D-0064, `T-0022`, cerrada el 02/10/2026), y
   producción queda como foto del 16/09 sin refresco periódico hasta que Broker OS esté
   operativo: la pista del botón de la aceptación dejó de ser comparable.
2. ~~Deuda: funciones de las migraciones sin `search_path` propio~~. Saldada por
   `T-0023` el 02/10/2026, también en producción.
3. Laboratorios de Q4 (Risk OS, Communication OS) según el Q4 Operating Plan, como
   contextos aislados dentro del monolito modular (D-0063). El spike de integración de
   WhatsApp (`T-0020`) cerró el 03/10/2026: WhatsApp entra por Cloud API oficial, con
   copia del contenido (D-0065), y el contrato de Communication OS es `SLICES/CO01.md`,
   aprobado el 03/10/2026. El spike de formatos y modelo de Risk OS (`T-0021`) cerró
   el 14/10/2026, y la propiedad de datos con Broker OS quedó en D-0067 (`T-0027`). El
   contrato de Risk OS v1 es `SLICES/RO01.md`, con su aceptación para el hito del
   25/11/2026; lo implementan `T-0028` a `T-0032`, en ese orden, con `T-0030` y
   `T-0031` en paralelo (§5).

   Pendientes del owner para Communication OS, sin fecha:
   - alta del número dedicado en la WABA y repetición de la prueba de `T-0020` con él;
   - verificación del negocio en Meta, necesaria para el número corporativo;
   - credencial compartida de la UI (D-0066), token de usuario del sistema,
     subdominio y consentimiento de los participantes (`SLICES/CO01.md` §7).

El spike de enforcement de autorización (`T-0002`, `D-0022`) no bloquea VS01. Se
activa antes del primer acceso multi-principal, del portal externo o de un worker o
agente con acceso privilegiado a Broker OS. El spike de hosting del worker se activa
cuando un incremento requiera ese proceso.

---

