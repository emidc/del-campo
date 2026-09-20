# ADR-0039 — Agentes de desarrollo y agentes de producto tienen reglas distintas de datos

- **Id en `decisions.yaml`:** D-0039
- **Estado:** ACCEPTED
- **Fecha:** 2026-09-19
- **Supersede:** —

## Contexto

`R-19` es una regla ACTIVA y prohíbe PII de clientes en prompts de agentes. Las capacidades
de producto previstas —`/ingresar` y los comandos de gestión de riesgos— consisten
exactamente en enviar texto, imágenes y documentos de un cliente a un modelo para extraer
información estructurada.

La contradicción no es de criterio sino de alcance: `R-19` fue escrita pensando en los
agentes de desarrollo que leen este repositorio, y el producto introduce una segunda clase
de actor que opera sobre datos reales con autorización explícita del usuario. Son dos
situaciones con riesgos distintos y merecen reglas distintas.

Mantener una sola regla obligaba a elegir entre dos malas salidas: prohibir la capacidad
central del producto, o relajar para los agentes de desarrollo una protección que hoy se
cumple y no cuesta nada.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo `D-0039`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Mantener `R-19` sin cambios | `/ingresar`, `/riesgo` y `/feed` no se pueden especificar |
| Redacción o seudonimización antes de todo prompt | Inviable para documentos escaneados, que es el insumo principal de `/ingresar` |
| Autorizar por clase de dato sin autorizar por proveedor | Deja que un proveedor nuevo herede el permiso de la categoría. Por eso la decisión exige aprobación explícita por proveedor y modelo |

## Consecuencias

**Más fácil:** el producto puede construirse; el límite queda escrito antes de que exista
el código, no después; y los agentes de desarrollo conservan la protección actual.

**Más difícil:** cada proveedor y cada modelo necesita aprobación explícita previa —ninguno
queda autorizado por efecto de esta decisión—, y toda operación sobre datos reales debe
quedar auditable por función, usuario, recurso, proveedor y modelo, categoría de dato y
timestamp, sin guardar prompts completos.

**Límite que no se mueve:** las categorías especialmente sensibles de `DOMAIN.md` §68
—salud, accidentes, vida e información financiera— quedan prohibidas para modelos externos
en v1. Un documento que las contenga se rechaza, se redacta o se deriva a revisión humana.
Nunca se envían credenciales, secretos ni tokens: eso ya lo exige `R-16`.

**Costo de revertir:** bajo en el papel y alto en la práctica. Una vez que un proveedor
procesó datos reales, la divulgación ya ocurrió: la reversión protege hacia adelante, no
hacia atrás. Por eso la aprobación por proveedor es previa y explícita.
