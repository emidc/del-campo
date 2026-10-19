# T-0032 / D-0070 — paquete de revisión ciega

Workstream BOS. Base `main`: `2a0db97f7aea67d5a07f0dfaa02c02db79ac5dbc`.
Cambio documental inicial: `b9da1d3` (el reporte identifica el SHA final revisado).
El owner solicita revisión independiente antes de cualquier merge. No se entrega
transcript, selección de decisiones ni justificación del implementador.

## Procedimiento R-33

1. Leer `AGENTS.md`, `CLAUDE.md`, `ENGINEERING_RULES.md` y el contrato
   `TASKS/T-0032-risk-despliegue-y-aceptacion.md` **desde la base main**:

   ```bash
   git show 2a0db97f7aea67d5a07f0dfaa02c02db79ac5dbc:TASKS/T-0032-risk-despliegue-y-aceptacion.md
   ```

   Leer sus contextRefs; posponer los archivos de evidencia hasta el paso 3.
   Buscar `DOMAIN.md` y `decisions.yaml` por cuenta propia.
2. Ejecutar primero los tres comandos de Verification de main sobre la rama:
   `pnpm check`, `RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test pnpm test`
   y `pnpm --filter ./apps/risk run build`.
   Usar un entorno limpio, sin heredar variables productivas ni cargar `.env`:

   ```bash
   env -i PATH="$PATH" DATABASE_URL=postgres://localhost:5432/delcampo_test \
     COMMUNICATION_DATABASE_URL=postgres://localhost:5432/delcampo_communication_test \
     RISK_DATABASE_URL=postgres://localhost:5432/delcampo_risk_test \
     NEXT_TELEMETRY_DISABLED=1 pnpm check
   ```

   Aplicar el mismo prefijo a `pnpm test` y al build. Sólo sintéticos y bases locales
   de test; sin acceder a Production, Supabase, Vercel, credenciales, secretos o
   backups. Si el entorno impide un comando, registrar el fallo y su limitación.
   No ejecutar dos suites con escritura sobre las mismas bases simultáneamente.
3. Leer **todo** el diff (incluidos tests si existieran) y después la evidencia:

   ```bash
   git diff 2a0db97f7aea67d5a07f0dfaa02c02db79ac5dbc HEAD
   ```

   Para reproducir la primera revisión, sustituir `HEAD` por `b9da1d3`. Para una
   revisión del PR usar su HEAD exacto y registrarlo. No excluir evidencia del diff.
4. Evaluar el resultado contra el contrato de main y el cambio explícito de política
   sometido a revisión, sin tratar las modificaciones del contrato como requisitos
   históricos ni la evidencia anterior como aceptación del cambio.
5. Publicar reporte con `Act on`, `Consider`, `Noted` y `Dismissed`; justificar cada
   descarte. Registrar comandos, resultados, límites, SHAs y orden de lectura.

La revisión técnica no sustituye aprobación humana ni autoriza un merge. El PR es
sólo documentación; T-0032 sigue ACTIVE y la aceptación real sigue pendiente.
