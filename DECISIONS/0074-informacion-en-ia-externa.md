# ADR-0074 — Qué información de clientes puede enviarse a interfaces externas de IA en la gestión de riesgos

- **Id en `decisions.yaml`:** D-0074
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-02
- **Supersede:** — (refina R-19 para el uso de interfaces externas de IA por el equipo;
  no cambia D-0039 ni D-0070)
- **Aprobación:** el owner, el 2026-11-02, «Decisiones de cierre Q4 — Del Campo OS», punto
  3 (política de información), en el hilo de T-0034.

## Contexto

En la north star, los pasos 1 (identificación preliminar) y 3 (refinamiento) del
relevamiento, el análisis de brechas, la comparación de pólizas y el informe anual
ocurren en un LLM externo (DA-2). R-19 decía que ningún proveedor ni modelo queda
autorizado sin aprobación previa, y la única aprobación registrada era la de D-0070,
acotada a la preparación de datasets de Risk OS. El riesgo del plan era concreto: pegar
datos de clientes en ChatGPT o Gemini sin autorización.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0074.

## Cómo se aplica

| Nivel | Qué incluye | Dónde se puede usar |
|---|---|---|
| 1 · Permitido | Datos empresariales generales (rubro, actividad, tamaño, procesos típicos) y conocimiento sectorial | En las interfaces de IA que use el equipo, sin datos personales |
| 2 · Sólo cuentas registradas | Fotografías, planos, información interna, vulnerabilidades específicas de una empresa y cualquier otra información confidencial de clientes | Sólo por cuentas registradas antes en `decisions.yaml` |
| 3 · Excluido | Datos personales innecesarios, salud, datos bancarios, secretos y credenciales | En ninguna |

**Registro de una cuenta para el nivel 2.** Es una decisión nueva en `decisions.yaml`,
antes del primer uso, con: proveedor, cuenta (de quién y de qué organización), tipo de
plan, condiciones de tratamiento de datos (entrenamiento, retención, región si se
conoce), modelos que se usan y personas que la usan. El modelo se nombra, no la familia,
igual que en D-0070. No hay proveedor ni modelo permanente.

**Estado al 2026-11-02.** No hay ninguna cuenta registrada para el nivel 2. El equipo
puede usar el nivel 1 desde ya; el nivel 2 espera al primer registro.

**Cuando interviene el sistema.** Si la información sale por el servidor MCP (D-0075), la
auditoría de R-19 (función, usuario, recurso, proveedor, modelo, categoría y timestamp,
sin prompts completos) la registra el servidor. Lo que una persona pega a mano en una
interfaz no lo ve el sistema: ahí el control es esta regla y el registro de cuentas.

## Pendiente de verificación

- Qué cuentas usa hoy el equipo (proveedor, plan, condiciones y modelos), para
  registrarlas antes de usar información de nivel 2.
- Si el nivel 1 incluye el nombre de la empresa. La decisión no lo dice. La recomendación
  es que el nombre sólo vaya cuando haga falta para buscar información pública.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Una lista cerrada de proveedores (recomendación original del plan) | El owner prefiere no fijar un proveedor permanente; el registro por cuenta cumple la misma función sin cerrar la lista. |
| Autorizar todo lo empresarial en cualquier cuenta | Fotos, planos y vulnerabilidades de una empresa en una cuenta personal que entrena con lo que recibe es una divulgación. |
| Prohibir el uso hasta tener MCP | Frena el proceso manual que las skills tienen que validar primero (D-0075). |

## Consecuencias

**Más fácil:** el equipo sabe qué puede pegar hoy en una interfaz de IA y qué no.

**Más difícil:** el control del nivel 2 depende de que cada persona respete el registro
mientras no haya MCP. Una cuenta nueva necesita una decisión antes de usarse.

## Criterio de falsación

Es ACCEPTED, así que se revisa con un ADR nuevo. Señales para hacerlo: información de
nivel 2 o 3 en una cuenta no registrada, o un proveedor registrado que cambie sus
condiciones de tratamiento de datos.
