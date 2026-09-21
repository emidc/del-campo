# ADR-0047 — Toolchain de verificación: TypeScript, ESLint y el runner de Node

- **Id en `decisions.yaml`:** D-0047
- **Fecha:** 2026-09-20
- **Supersede:** —

## Contexto

R-25 exige que los límites de módulo se hagan cumplir **por herramienta**, no por
convención: un agente que no ve el límite lo cruza. R-26 exige capas de test. Ninguna de
las dos se puede cumplir sin elegir un type checker, un linter y un runner, y esa
elección es una dependencia nueva, que dispara ADR por R-05.

El ADR es por decisión y no por paquete: los tres paquetes de este toolchain resuelven un
mismo problema —hacer verificable el código antes de que exista— y separarlos produciría
tres documentos con el mismo contexto.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0047.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Vitest como runner | Mejor ergonomía para los tests de integración de T-0012, a cambio de una dependencia grande y de divergir del `node --test` que `pnpm check` ya corre sobre los scripts del arnés. Se revisita si el runner nativo estorba. |
| Transpilar TypeScript antes de testear | Node 24 ejecuta `.ts` con type stripping nativo. Un paso de build agregaría una etapa que hay que mantener y un artefacto que puede quedar viejo. |
| `eslint-plugin-boundaries` para los límites | Declara zonas de forma más expresiva, pero suma una dependencia para tres reglas que el core de ESLint expresa sin ambigüedad. R-01: cuando haya un tercer límite que no se pueda escribir así, se revisita. |
| Sólo `tsc`, sin linter | TypeScript no tiene forma de prohibir un import por paquete de origen. El límite de R-25 no es un problema de tipos. |
| Biome / oxlint | Más rápidos, con menos cobertura de las reglas con información de tipos que `typescript-eslint` aporta y que son la mitad del valor acá. |

## Consecuencias

**Más fácil.** `pnpm typecheck`, `pnpm lint` y `pnpm test` existen y fallan por su cuenta.
Los límites de R-25 están escritos como reglas ejecutables en `eslint.config.js`, incluidos
los de `api` y `web`, que todavía no existen. Los tests corren sobre `.ts` sin paso de
build.

**Más difícil.** El type stripping de Node sólo acepta sintaxis borrable: nada de `enum`,
parameter properties ni `namespace`. La restricción se hace explícita con
`erasableSyntaxOnly` en `tsconfig.json`, de modo que el error aparezca en el type check y
no en runtime. Las reglas con información de tipos de ESLint son más lentas que un linter
sintáctico, y eso se va a notar cuando el repositorio tenga código de verdad.

`pnpm check` **no cambia** en esta tarea. Los tres comandos quedan ejecutables pero
desconectados del check hasta T-0012, que es la primera tarea con código real que
chequear. La consecuencia conocida es que entre una y otra nada obliga a que sigan
pasando; por eso T-0010 exige las tres comprobaciones de canario y T-0012 las repite ya
cableadas.

**Costo de revertir:** cambiar de runner es reescribir los `describe`/`it`, que son
estándar en los tres candidatos. Cambiar de linter es traducir `eslint.config.js`, que
hoy tiene tres reglas. Bajo en ambos casos, y por eso el toolchain se registra como
`ACCEPTED` y no como provisional: no es una apuesta, es el default reversible de R-02.
