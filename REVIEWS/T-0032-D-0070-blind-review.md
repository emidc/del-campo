# T-0032 / D-0070 — revisión ciega independiente

Workstream: BOS. Fecha: 2026-10-19. Procedimiento: R-33.

- Base y contrato: `main`, `2a0db97f7aea67d5a07f0dfaa02c02db79ac5dbc`.
- Head revisado: `b9da1d32656f9657e325bcca3d21cc68973f44f9`.
- Revisor: subagente aislado de Codex; sin transcript ni narrativa de implementación.
- AgentRun propio: no registrado; no se inventa un runId.
- Alcance: los 13 archivos del diff completo. No hay cambios de código ni de tests.
  El reporte no acredita commits posteriores ni una aceptación de RO01.

## Orden de revisión

1. Leí `AGENTS.md`, `CLAUDE.md`, `ENGINEERING_RULES.md` y el contrato
   `TASKS/T-0032-risk-despliegue-y-aceptacion.md` desde `main`.
2. Localicé `DOMAIN.md` y `decisions.yaml` por cuenta propia; leí sus contenidos y
   los contextRefs no ubicados en `ops/evidence`. Dejé diferida la evidencia de T-0026.
3. Esperé a que terminara la corrida del coordinador para no compartir las bases
   con otra ejecución de tests. Ejecuté los tres comandos de Verification en orden,
   sobre el head revisado, antes de abrir evidencia o el diff.
4. Leí el diff completo, incluidos los cambios en evidencia, y completé la lectura
   de `ops/evidence/T-0026-aceptacion.md` desde main. Inspeccioné el acta de T-0032,
   la procedencia de su evidencia histórica y el CLI de validación citado.
5. Contrasté el refinamiento con R-04/R-19, la clasificación de DOMAIN §68,
   D-0039/D-0068 y la excepción documental `docs/` de T-0005. No abrí el paquete
   de revisión generado por el coordinador ni sus logs.

## Verificación independiente

Prefijo usado en los tres comandos:

```bash
env -i PATH="$PATH" \
  DATABASE_URL=postgres://localhost:5432/delcampo_test \
  COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test \
  RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test \
  NEXT_TELEMETRY_DISABLED=1
```

`pnpm check` y `pnpm test` se ejecutaron con permiso de sockets locales fuera del
sandbox, con ese entorno vacío salvo las variables enumeradas. Build dentro del
sandbox. No se usaron datos reales, Production, Supabase, Vercel, credenciales,
backups, `.env` ni configuraciones privadas.

| Comando | Resultado |
| --- | --- |
| `pnpm check` | Exit 1. Documentos: 70 decisiones, 33 ADRs, 32 tareas, 0 avisos; scripts: 174 pass; typecheck y lint completados. Tests: 1172, 1051 pass, 121 fail, 0 skipped/todo. |
| `pnpm test` | Exit 1. 1172 tests, 1051 pass, 121 fail, 0 cancelled/skipped/todo. |
| `pnpm --filter ./apps/risk run build` | Exit 0. Next.js 16.3.6 compiló, completó TypeScript y generó las rutas. |
| `git diff --check main b9da1d3` | Exit 0. |

Error observado en ambas corridas de tests:

```text
Error [PostgresError]: database "delcampo_test" does not exist
code: '3D000'
```

Logs propios locales: `/tmp/d0070-review-check.log`, `/tmp/d0070-review-test.log`
y `/tmp/d0070-review-build.log`. No representan evidencia de CI ni una suite verde.
La base sintética Broker ausente es una limitación ambiental; no se creó ni se
reconfiguró para esta revisión. La ausencia de cambios de código/tests no justifica
declarar passing lo que falló.

## Act on

### A1 — Registrar formalmente el reemplazo parcial de D-0068

`decisions.yaml`, entrada D-0068: sigue `ACCEPTED`, pero reemplaza la cláusula de
preparación exclusiva del owner por preparación asistida y mantenimiento de datasets.
Referencia D-0070 en el statement y source, pero omite `superseded_in_part_by`.
El encabezado canónico exige esa lista para identificar la cláusula reemplazada;
D-0039 sí la incorpora en este mismo diff.

Agregar a D-0068 la cláusula precisa y `by: D-0070`, conservando el resto de la
decisión aceptada. El ADR 0070 ya es el ADR nuevo requerido: no hace falta inventar
otro ni cambiar infraestructura. Es una corrección de trazabilidad canónica, no una
objeción a la autorización documental del owner.

## Consider

- El resumen del acta aún llama A13 «Sin datos reales fuera de su lugar», mientras
  RO01 y el cuerpo del acta ya explican procesamiento autorizado. Alinear el rótulo
  ayudaría al owner a identificar la comprobación nueva al completar la tabla; el
  cuerpo vigente evita que sea un bloqueo funcional.
- La última oración de D-0070 («Esta sesión sólo modifica documentación…») describe
  una ejecución fechada dentro de un statement permanente. Puede quedar en source,
  ADR o evidencia de esta actualización para que las futuras sesiones de preparación
  no tengan que interpretar esa oración como una limitación permanente de la función.

## Noted

- **No hay autorización efectiva para procesar datos reales todavía.** D-0070
  permite la categoría de preparación, pero condiciona el ejercicio a identificar y
  aprobar explícitamente proveedor/modelo. El protocolo exige comprobarlo antes de
  recibir evidencia y ante cambios de modelo. No infiere una identidad a partir de
  «Codex» ni extiende una autorización de desarrollo.
- El protocolo conserva procedencia, contradicciones y unknowns; evita convertir
  aprobación en evidencia documental y no fuerza DOCUMENTADO a `observed`. Usa el
  contrato vigente sin columnas nuevas. El CLI citado lee archivos y produce conteos;
  `--salida` puede contener valores y queda privado. No lo confunde con un dry-run de
  importación ni autoriza bases `_dev`/`_test` con reales.
- Backup/importación siguen siendo del owner; preparación no recibe acceso a
  Production ni credenciales. La revisión posterior A8, el material ciego y los
  límites entre contextos se conservan. A13 actualizado queda pendiente de medición,
  no se firma ni se reconstruye evidencia retrospectiva.
- En el SHA revisado, `ops/evidence/T-0032.md` apunta a
  `ops/evidence/T-0032-D-0070.md`, que todavía no existe en ese árbol. Completar ese
  artefacto de cierre antes de presentar el resultado como documentado; esta revisión
  no lo acredita por anticipado. T-0032 sigue ACTIVE y RO01 no se declara aceptado.

## Dismissed

- **Cambiar el contrato desde una rama docs como evasión de controles:** descartado.
  El mandato declara pedido explícito del owner para el cambio documental; T-0005
  admite `docs/`, y el diff no toca controles, hooks, CI ni tests. No equivale a
  permitir que una implementación se dé a sí misma criterios más fáciles.
- **D-0070 autoriza libremente datos sensibles o todos los agentes/modelos:**
  descartado. La excepción empresarial está acotada a preparación de Risk OS,
  excluye información personal innecesaria/sensible y secretos, exige minimización,
  aprobación específica y auditoría. La función de desarrollo conserva R-19.
- **Es necesario reescribir DOMAIN §68 para permitir el refinamiento:** descartado.
  DOMAIN clasifica categorías potencialmente sensibles; no es la autorización de
  tratamiento. R-19 y D-0039 ahora remiten al refinamiento empresarial D-0070, sin
  quitar esas categorías ni extenderlo a Broker/Product.
- **Los errores locales prueban una regresión introducida por este diff:**
  descartado. No cambia ejecutables ni tests y el error concreto es la base local
  inexistente. Sí impide afirmar verificación completa en verde.

## Límites y dictamen

Corregir A1 y completar la evidencia pendiente del head final. La revisión documental
no encontró una ampliación implícita de acceso productivo ni una preparación real
ya autorizada; encontró una política de preparación condicionada y un protocolo
operable sobre archivos privados. No acredita cumplimiento real de minimización,
auditoría, backup, aprobación humana, importación ni aceptación de H1–H5, que no se
ejecutaron. No valida la identidad del modelo de futuras sesiones ni condiciones
comerciales de proveedores. No ejecuta merge ni concede autorización de datos.
