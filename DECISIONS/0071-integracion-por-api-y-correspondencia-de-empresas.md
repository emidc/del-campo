# ADR-0071 — Los contextos se integran por API de aplicación y la organización evaluada se vincula a mano con una empresa

- **Id en `decisions.yaml`:** D-0071
- **Estado:** ACCEPTED
- **Fecha:** 2026-11-02
- **Supersede:** en parte D-0063 (vigencia limitada a Q4 y prohibición de que Broker OS
  importe un contexto) y D-0067 (sin copia de identificadores de Broker OS ni flujos
  entre contextos). Las dos pasan de PROVISIONAL a ACCEPTED.
- **Aprobación:** el owner, el 2026-11-02, en «Decisiones de cierre Q4 — Del Campo OS»,
  punto 0, en el hilo de T-0034. No espera a diciembre.

## Contexto

D-0063 y D-0067 dejaban para el cierre de Q4 la pregunta de integrar, mantener separados
o descartar Risk OS y Communication OS. La north star v25 (`docs/north-star/`), aceptada
el 2026-11-02, necesita una respuesta antes de la etapa 1 del plan de paso a producción:

1. **DA-9: convergencia de experiencia, no fusión técnica.** La v25 muestra Riesgos dentro
   de la ficha de empresa de Broker OS y las conversaciones dentro de la ficha de persona,
   pero cada sistema conserva su base.
2. **El corte C4 proyecta Risk OS en Broker OS.** D-0063 prohibía que `apps/web` importara
   un contexto, así que esa proyección no se podía construir sin cambiar la regla.
3. **El corte C2 necesita una correspondencia empresa ↔ organización evaluada.** D-0067
   prohibía copiar identificadores internos de Broker OS en Q4 y dejaba la
   correspondencia para una integración posterior.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0071. Acá está cómo se aplica.

## Cómo se aplica

**Fronteras.** Siguen las de D-0063: cada contexto con su esquema y sus migraciones, sin
leer ni escribir tablas de otro. La única puerta entre contextos es lo que cada uno exporta
desde `src/application`.

**Dirección de las dependencias.**

| Quién | Puede importar | No puede importar |
|---|---|---|
| `packages/*` y `apps/web` (Broker OS) | Operaciones de lectura de la API de aplicación de `@del-campo/risk` y `@del-campo/communication` | Su `src/domain`, su `src/persistence` y cualquier escritura |
| `contexts/risk` | Nada de otro contexto | `@del-campo/domain`, `db`, `api`, `@del-campo/communication` |
| `contexts/communication` | Nada de otro contexto | `@del-campo/domain`, `db`, `api`, `@del-campo/risk` |

Las reglas de lint de R-25 se ajustan en la primera tarea que necesite la lectura (C4),
no antes (R-01). Separar en la API de cada contexto las operaciones de lectura de las de
escritura es parte de esa tarea.

**Correspondencia empresa ↔ organización evaluada.**

- Es un dato de Risk OS: vive en su esquema, junto a la organización evaluada.
- Guarda el id de la `Party` de Broker OS como texto opaco, sin clave foránea, con quién la
  registró y la verificó y cuándo.
- Cada organización evaluada tiene como mucho una empresa. Mientras nadie la confirme,
  queda pendiente, y Risk OS funciona igual.
- La registra y verifica a mano una persona autorizada (los roles son de D-0072). No hay
  emparejamiento automático por nombre ni por CUIT.
- `organizacion_id` (`ORG-<ULID>`) sigue siendo la identidad propia de Risk OS (D-0067).
- Una empresa puede tener varios establecimientos, actividades y evaluaciones; en Risk OS
  los establecimientos son las unidades o zonas de la organización evaluada.

**Infraestructura.** La separación es lógica. Compartir base o despliegue es posible
cuando conviene, con los controles de D-0076.

## Pendiente de verificación

- **¿Una empresa puede tener más de una organización evaluada?** El owner fijó que cada
  organización evaluada se vincula con una sola empresa, y que una empresa puede tener
  varios establecimientos y evaluaciones. No dijo si dos organizaciones evaluadas pueden
  apuntar a la misma empresa. La recomendación es que no: los establecimientos se modelan
  como unidades de la misma organización. Se confirma en `T-0036`, antes de su esquema.
- **Desde qué pantalla se registra la vinculación.** Elegir la empresa exige ver empresas
  de Broker OS, y registrar la vinculación es una escritura en Risk OS. Lo resuelve
  `T-0036` sin romper esta decisión, por ejemplo con una pantalla de Broker OS que llame a
  una operación de escritura de Risk OS autorizada por su propia decisión, o con el id
  ingresado en Risk OS.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Esperar a diciembre | El owner prefirió no postergar: la etapa 1 empieza en diciembre y C2 depende de esto. En diciembre se revisa el uso, no la decisión. |
| Fusionar Risk OS y Communication OS dentro de `packages/*` | Mezcla dominios en paquetes separados por capa, que es lo que D-0063 evitó, y contradice DA-9. |
| Proyecciones copiadas (Broker OS guarda una copia de los riesgos) | Duplica datos con su sincronización, y D-0067 ya fija que la copia no es el registro canónico. Leer por la API alcanza. |
| Vinculación automática por nombre o CUIT | Una correspondencia equivocada muestra los riesgos de una empresa en la ficha de otra. La regla de D-0003 vale también acá: nunca se asigna arbitrariamente. |
| Clave foránea entre esquemas | Acopla las migraciones de dos contextos y rompe la propiedad de D-0067. |

## Consecuencias

**Más fácil:** C2 y C4 se pueden construir; descartar o separar un contexto sigue siendo
barato porque solo se cruza la API.

**Más difícil:** R-25 pasa a tener una excepción dirigida (Broker OS lee contextos), que el
lint tiene que distinguir entre lectura y escritura. Una vinculación pendiente deja a la
empresa sin Riesgos visibles en Broker OS, y eso tiene que verse en la pantalla.

**Costo de revertir:** bajo mientras la lectura sea de pocas operaciones.

## Criterio de falsación

Es ACCEPTED, así que se revisa con un ADR nuevo. Señales para hacerlo: que C4 no pueda
cumplir su aceptación solo con lectura, que la API de lectura termine exponiendo la forma
de las tablas de otro contexto, o que la revisión de diciembre muestre retrabajo medible
por mantener las fronteras.
