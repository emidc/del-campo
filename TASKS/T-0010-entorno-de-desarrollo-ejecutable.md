---
id: T-0010
title: Levantar el entorno de desarrollo ejecutable, sin dominio
kind: CHORE
status: READY
workstream: POS
riskClass: LOW
size: M
created: 2026-09-08
blockedBy: [T-0008]
contextRefs: [ENGINEERING_RULES.md, decisions.yaml, .github/workflows/project-os-check.yml]
decisionRefs: [D-0012, D-0013]
---

## Why

R-24, R-25 y R-26 están escritas y latentes. Sin esta tarea, el primer PR que escriba
código de dominio tendría que elegir en el mismo diff dónde vive el schema, qué runner
de tests se usa, cómo se levanta Postgres y cómo se hacen cumplir los límites de módulo:
cuatro decisiones de arnés mezcladas con la primera decisión de modelado. Separarlas
cuesta menos que revisarlas juntas.

## Outcome

Existe un workspace pnpm con TypeScript en modo estricto, un runner de tests y una regla
de lint que hace cumplir los límites de módulo de R-25.

**El schema vive en migraciones SQL.** Las migraciones son la fuente de verdad; los tipos
de TypeScript se derivan de la base, no al revés. La capa de consulta es tipada y delgada,
sin un DSL que describa tablas en paralelo al SQL. La razón es que las invariantes que
`DOMAIN.md` define —intervalos de `PolicyVersion` no solapados vía `EXCLUDE USING gist`
con `btree_gist`, a lo sumo una versión abierta vía índice único parcial— no son
expresables en los DSL de schema disponibles, de modo que un modelo en TypeScript dejaría
las invariantes centrales fuera de la vista del archivo que dice ser el schema.

**Postgres corre nativo en la máquina de desarrollo**, con la versión mayor fijada a la
misma que usa CI, y con comandos de creación y reseteo de la base documentados y
reproducibles. CI sigue usando un contenedor: la diferencia se acepta a conciencia y la
cubre R-17, porque el veredicto lo da CI y no la máquina local.

Las decisiones materiales de esta tarea quedan registradas en `decisions.yaml` con su
ADR, no como premisas implícitas del código —R-03—, y las reglas R-24, R-25 y R-26 dejan
de estar marcadas LATENTE en `ENGINEERING_RULES.md` porque pasan a ser cumplibles.

`pnpm check` **no cambia** en esta tarea: typecheck, lint y tests quedan configurados y
ejecutables por comando propio, y su incorporación al check la hace T-0012, que es la
primera tarea con código real que chequear.

Cero entidades, cero tablas, cero lógica de dominio.

## Non-scope

- No se modela ninguna entidad ni se crea ninguna tabla: la primera migración es la de
  T-0012.
- No se adopta ORM ni DSL de schema, ni se deja abierta la puerta con una capa de
  compatibilidad "por si acaso".
- No se agrega Docker ni el stack local de Supabase: `D-0013` mantiene los demás
  productos de Supabase como decisiones separadas.
- No se modifica `pnpm check` ni el workflow de CI.
- No se elige proveedor de despliegue: `D-0014` sigue provisional.
- No se instala ninguna herramienta que no tenga un uso en T-0012.

## Verification

```bash
# Cada verificación corre por su propio comando: todavía no están en pnpm check.
pnpm typecheck
pnpm lint
pnpm test

# El check documental sigue pasando sin cambios.
pnpm check

# La base local se crea y se resetea de forma reproducible.
pnpm db:create && pnpm db:reset
```

Comprobaciones humanas:

- [ ] Un archivo que viola un límite de módulo hace fallar `pnpm lint`, y se elimina
      después de comprobarlo.
- [ ] Un archivo con un error de tipo deliberado hace fallar `pnpm typecheck`, y se
      elimina después de comprobarlo.
- [ ] Un test que falla a propósito hace fallar `pnpm test`, y se elimina después de
      comprobarlo.
- [ ] La versión mayor de Postgres local coincide con la declarada para CI, y el
      procedimiento de instalación está documentado para una máquina limpia.
- [ ] `CREATE EXTENSION btree_gist` funciona en la base local: es precondición de las
      constraints de T-0012.
- [ ] Cada dependencia nueva tiene su ADR, según los siete disparadores que T-0008 dejó
      vigentes.

## Data effects

Crea una base local vacía en un Postgres instalado en la máquina de desarrollo. Ningún
dato real de clientes, R-19. Reversible con el comando de reseteo y revirtiendo el PR.

## Notes

Q-5, Q-6 y Q-7 respondidas. Sin inputs pendientes.

**Decisiones a registrar en `decisions.yaml`** —R-03: una elección material que solo vive
en el código es una premisa silenciosa. Los ids son tentativos porque T-0008 toma el
siguiente libre.

- *El schema vive en migraciones SQL, no en un modelo de aplicación.* Propuesta como
  `PROVISIONAL`, con `falsified_by`: que la superficie de escritura crezca hasta que el
  costo por consulta supere lo que hoy se gana en expresividad de constraints y en costo
  de salida de `D-0013`. Si preferís `ACCEPTED`, decilo: cambia el criterio con el que se
  revisita, no la implementación.
- *Postgres local nativo, CI en contenedor.* Propuesta como `PROVISIONAL`, con
  `falsified_by`: que aparezca un fallo por deriva de versión o de configuración que la
  máquina local no reproduzca, o que el setup manual termine costando más que instalar
  Docker.

**ADR por decisión, no por paquete** —R-05 conserva sus siete disparadores tras T-0008.
La elección de toolchain es una decisión y lleva un ADR; el schema en SQL es otra y lleva
el suyo. Si preferís un ADR por dependencia, decilo antes de empezar: cambia el
`## Outcome`.

**Consecuencia de Q-7.** Entre esta tarea y T-0012 nada obliga a que typecheck, lint y
tests sigan pasando, así que la configuración puede pudrirse en silencio. Por eso las tres
comprobaciones de canario son obligatorias acá y se repiten en T-0012 cuando se cablean al
check. El cableado es parte del `## Outcome` de T-0012, no una nota al pie: una obligación
diferida sin dueño es una obligación perdida.
