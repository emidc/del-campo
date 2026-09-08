# Del Campo

Repositorio del programa Del Campo: Broker OS, Project OS y la migración.

En esta etapa (**Project OS Zero**) el repositorio contiene documentos, decisiones y tareas.
Todavía no hay código de aplicación: se crea cuando arranque el Vertical Slice 01.

## Por dónde empezar

1. `PROJECT.md` — qué es esto, en qué fase estamos, dónde está cada cosa.
2. `AGENTS.md` — contrato operativo para cualquier modelo o persona que trabaje acá.
3. `docs/history/SOURCES.md` — procedencia y fuentes canónicas todavía faltantes.

`DOMAIN.md` debe leerse antes de discutir entidades, pero no estaba incluido en los
adjuntos recibidos. No ejecutar tareas de dominio hasta incorporar el original.

## Comandos

```bash
pnpm install --frozen-lockfile
pnpm check     # valida decisions.yaml y las tareas de TASKS/
```

La versión de pnpm está fijada en `package.json`; el lockfile conserva la versión del
parser YAML estándar.
