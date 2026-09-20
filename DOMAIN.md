# Del Campo — DOMAIN.md v0.1

**Estado:** BASELINE  
**Programa:** Del Campo  
**Producto:** Del Campo Broker OS  
**Propósito:** definir el lenguaje canónico, identidades, relaciones, invariantes y fronteras del dominio antes del diseño del schema físico.

---

# 1. Autoridad del documento

`DOMAIN.md` es la fuente canónica del lenguaje, las identidades, las relaciones y
las invariantes del dominio de Broker OS.

`decisions.yaml` es la fuente canónica de qué se decidió y de su estado. Los ADR
conservan el porqué, la evidencia, las alternativas y las consecuencias.

Cuando exista una contradicción entre este documento y una descripción más general del Project Charter, prevalece `DOMAIN.md` para cuestiones de:

- identidad;
- semántica de entidades;
- relaciones;
- cardinalidades;
- invariantes;
- historia temporal.

Las contradicciones detectadas deberán posteriormente corregirse en el documento general correspondiente.

Este documento no define todavía:

- tablas SQL definitivas;
- índices;
- RLS;
- endpoints;
- componentes UI;
- detalles de Drizzle;
- schemas completos de API.

El schema implementará el dominio.

El schema no debe definirlo accidentalmente.

Una decisión de migración registra evidencia, alcance y reglas de migración. Cuando
contenga una conclusión sobre el dominio, debe referenciar el ADR que la motiva, y este
documento la absorbe. Ninguna decisión de migración es fuente canónica de semántica de
dominio.

---

# 2. Principios de modelado

## 2.1 Identidad ≠ rol

Una persona u organización existe independientemente del rol que tenga frente al broker.

Una misma persona no se duplica porque sea:

- prospecto;
- cliente;
- contacto de una empresa;
- contacto de una aseguradora.

---

## 2.2 Rol explícito ≠ condición derivable

Se almacenan como roles solamente aquellas relaciones que necesitan ser declaradas explícitamente.

No se persiste como rol aquello que puede derivarse confiablemente de otros hechos del dominio.

Ejemplo:

```text id="ss50mi"
PROSPECT
```

es una aserción explícita.

```text id="thdgmf"
CLIENT
```

es inicialmente un concepto derivado de la existencia de negocio asegurado.

---

## 2.3 Canal de contacto ≠ identidad

Email, teléfono y WhatsApp cambian.

No son identificadores permanentes de una persona.

---

## 2.4 Historia antes que sobrescritura

Cuando un cambio puede tener relevancia:

- contractual;
- comercial;
- operacional;
- probatoria;

la información anterior debe poder reconstruirse.

Especialmente:

- pólizas;
- canales de contacto;
- relaciones organizacionales;
- asignaciones;
- permisos;
- acciones críticas.

---

## 2.5 No todo sustantivo es una entidad

Un concepto se transforma en entidad cuando necesita suficiente:

- identidad;
- lifecycle;
- relaciones;
- comportamiento;
- historia independiente.

---

## 2.6 Internal IDs como identidad técnica

Broker OS utilizará IDs internos estables.

Valores como:

- DNI;
- CUIT/CUIL;
- email;
- WhatsApp;
- patente;
- número de póliza;

son identificadores naturales, referencias externas o señales de matching.

No reemplazan automáticamente la identidad interna.

---

## 2.7 Modelado temporal inicial

Broker OS utilizará inicialmente **effective-dated history** donde corresponda.

No se adopta un modelo bitemporal formal como baseline.

En particular, `PolicyVersion` expresa:

> durante qué intervalo una determinada versión contractual era efectiva.

La necesidad futura de modelar separadamente:

- effective time;
- transaction/system time;

deberá justificarse mediante un caso real.

---

# 3. Estados de modelado

## MODELED NOW

Debe tener representación estructurada durante las primeras rebanadas.

## NAMED, NOT MODELED

Forma parte del lenguaje del dominio, pero todavía no se fija su estructura.

## DEFERRED

Existe como necesidad futura, pero todavía no existe evidencia suficiente para estabilizar su significado.

## STAGING ONLY

Se preserva con fidelidad al origen porque no se borra historia, pero no tiene
representación en el dominio y no se expone en producto. Promoverlo requiere ADR. → `D-0033`

---

# 4. Glosario canónico

| Canónico | UI / negocio | Definición |
|---|---|---|
| `Party` | — | Identidad estable de persona u organización |
| `PersonProfile` | Persona | Datos propios de una Party humana |
| `OrganizationProfile` | Empresa / Organización | Datos propios de una Party organización |
| `PartyRole` | Prospecto / otros roles explícitos | Relación declarada que una Party mantiene frente al broker |
| `Client` | Cliente | Concepto derivado de una relación comercial aseguradora |
| `Account` | Empresa | Término de negocio/UI para una Party ORGANIZATION |
| `OrganizationMembership` | Contacto | Relación entre una persona y una organización |
| `ContactPoint` | Email / Teléfono / WhatsApp | Canal de contacto de una Party |
| `Insurer` | Compañía / Aseguradora | Organización perteneciente al catálogo curado de aseguradoras |
| `Policy` | Póliza | Identidad de un período contractual |
| `PolicyVersion` | Estado de póliza | Estado efectivo-fechado dentro de una Policy |
| `Endorsement` | Endoso | Evento del origen asociado a una Policy; puede o no producir una nueva PolicyVersion |
| `Renewal` | Renovación | Inicialmente workflow/vista derivada |
| `Quote` | Cotización | Contexto compartido de una solicitud de cotización |
| `QuoteOption` | Propuesta | Respuesta de una aseguradora dentro de una Quote |
| `Issuance` | Emisión | Proceso para originar una Policy |
| `Claim` | Siniestro | Proceso de gestión de un evento asegurado |
| `InsuranceProduct` | Producto / Ramo | Producto asegurador que una Policy instancia |
| `RiskObject` | Objeto asegurado | Aquello que se asegura: vehículo, inmueble, maquinaria |
| `EnterpriseRisk` | Riesgo de empresa | Riesgo identificado mediante el proceso de gestión de riesgos |
| `ExternalReference` | Referencia externa | Referencia conocida hacia algo que existe en el origen y no en Broker OS |
| `DocumentLink` | Documento | Vínculo con archivo/carpeta de Google Drive |
| `Communication` | Comunicación | Referencia a una comunicación externa |
| `User` | Usuario | Principal autenticable |
| `BusinessAuditEvent` | Auditoría | Registro append-only de negocio |
| `AgentRun` | Ejecución de agente | Telemetría de Project OS, fuera del dominio Broker OS |

---

# 5. Vista conceptual

```text id="prlwz3"
                         Party
                    ┌──────┴──────┐
                  PERSON       ORGANIZATION
                    │               │
             PersonProfile   OrganizationProfile
                    │               │
                    │        ┌──────┴─────────┐
                    │        │                │
                    │     Insurer          Account
                    │    (derived/ref)    (derived)
                    │
                    ├──────── OrganizationMembership ────────┐
                    │                                        │
                    └────────────────────────────────────────┘

Party
 ├── PartyRole[]
 ├── ContactPoint[]
 ├── Policies as holder/related party
 └── future Communications

Policy
 ├── PolicyVersion[]
 ├── DocumentLink[]
 ├── renewedFromPolicy?
 └── future processes
```

---

# 6. Party

**Estado: MODELED NOW**

`Party` es la raíz de identidad.

Tipos:

```text id="f8hdo5"
PERSON
ORGANIZATION
```

Campos conceptuales mínimos:

```text id="m8i7if"
Party

id
kind

status
mergedIntoPartyId?

displayNameCache?

createdAt
updatedAt
```

---

# 7. Party lifecycle

Estados conceptuales iniciales:

```text id="fztyhk"
ACTIVE
MERGED
```

Otros estados sólo se incorporarán si aparece necesidad real.

Las condiciones de calidad de datos no son estados de Party. En particular, la ausencia,
invalidez o duplicación de un identificador fiscal no altera `Party.status`. → `D-0035`

Una Party con:

```text id="nrbuf4"
status = MERGED
```

debe apuntar mediante:

```text id="690sdv"
mergedIntoPartyId
```

a la Party que pasa a ser su identidad canónica.

---

# 8. Party merge

**Estado: DECIDED**

La migración y operación futura pueden detectar que dos Parties representan la misma identidad real.

No se eliminará la Party perdedora.

Ejemplo:

```text id="n2bqxi"
Party A
   ↓ mergedIntoPartyId
Party B
```

Reglas:

1. el ID perdedor nunca se reutiliza;
2. la Party perdedora nunca se elimina por el proceso normal de merge;
3. la resolución canónica sigue `mergedIntoPartyId`;
4. no puede existir un ciclo de merges;
5. una Party no puede mergearse consigo misma;
6. el resultado final debe resolver a una Party canónica no `MERGED`.

Las referencias históricas, particularmente auditoría, pueden continuar apuntando al ID original.

Los consumidores que necesiten identidad canónica deberán resolver la cadena.

Las referencias operativas mutables podrán ser redireccionadas durante el proceso de merge cuando hacerlo sea seguro.

---

# 9. Display name

`Party.displayNameCache` no es fuente de verdad.

Su autoridad reside en:

- `PersonProfile`, para PERSON;
- `OrganizationProfile`, para ORGANIZATION.

Puede existir como:

- proyección;
- cache;
- campo de búsqueda;

si aporta utilidad operacional.

Nunca debe requerir lógica manual de sincronización.

---

# 10. PersonProfile

**Estado: MODELED NOW**

Datos específicos de una Party `PERSON`.

Ejemplos conceptuales:

```text id="sr4alr"
partyId
firstName
lastName
dni?
cuil?
birthDate?
```

No todos los campos serán obligatorios inicialmente.

DNI/CUIL pueden colaborar en:

- búsqueda;
- matching;
- deduplicación;
- migración.

No son IDs técnicos.

Su ausencia no impide crear, migrar ni mantener activa una Party. El valor original del
origen se conserva en staging aunque sea inválido; el dominio conserva el valor
normalizado válido. `missing`, `invalid` y `conflict` son condiciones derivadas de calidad
de datos. → `D-0035`

---

# 11. OrganizationProfile

**Estado: MODELED NOW**

Datos específicos de una Party `ORGANIZATION`.

Conceptualmente:

```text id="ebmbgj"
partyId
legalName
tradeName?
cuit?
activity?
```

Una organización puede ser:

- prospecto;
- cliente;
- aseguradora;
- contraparte futura de otro tipo.

Su identidad no cambia por esas relaciones.

`cuit` sigue el mismo tratamiento que `dni`/`cuil` en PersonProfile. → `D-0035`

---

# 12. PartyRole

**Estado: MODELED NOW**

`PartyRole` almacena solamente relaciones **no derivables** que requieren una aserción explícita.

Inicialmente:

```text id="n3m71v"
PROSPECT
```

Conceptualmente:

```text id="rxm1px"
PartyRole

id
partyId
role
status
validFrom
validTo?
```

Posibles roles futuros sólo se agregarán cuando exista un caso real.

Ejemplo:

```text id="g1vybz"
REFERRER
```

podría algún día justificar un rol.

---

# 13. PartyRole invariants

Para una combinación:

```text id="y5jzng"
partyId + role
```

debe existir como máximo **un intervalo activo al mismo tiempo**.

Los roles temporales utilizarán intervalos no solapados.

Un rol puede finalizar y posteriormente volver a existir.

---

# 14. Prospect

**Estado: EXPLICIT PARTY ROLE**

Una Party es Prospect cuando existe una aserción activa:

```text id="s3hsmr"
PartyRole.role = PROSPECT
```

Cuando se concrete el primer negocio correspondiente, el rol puede cerrarse.

No se destruye la Party.

No se crea una nueva identidad Client.

Las:

- comunicaciones;
- documentos;
- cotizaciones;
- relaciones;

continúan apuntando a la misma Party.

Si en el futuro se necesita representar:

> cliente actual que simultáneamente es prospecto para otro producto

se reconsiderará si `PROSPECT` debe moverse desde Party hacia un concepto de oportunidad comercial.

No se introduce esa abstracción ahora.

---

# 15. Client

**Estado: DERIVED CONCEPT**

`CLIENT` no se almacena inicialmente como `PartyRole`.

Una Party se considera Client cuando existe evidencia comercial suficiente.

Regla inicial:

> una Party es Client si es o ha sido tomador/cliente de al menos una Policy registrada por Del Campo.

Pueden existir posteriormente conceptos derivados adicionales:

```text id="lpu0pf"
ACTIVE_CLIENT
FORMER_CLIENT
```

según vigencia de negocio.

No requieren automáticamente entidades o roles persistidos.

`Client` y `Prospect` describen **la relación** de una Party con el broker. No son
identidades distintas y no condicionan la existencia de la Party ni de su ficha.

---

# 16. Account

**Estado: UI TERM**

`Account` —Empresa en la UI— es el término de negocio para una:

```text id="yz1tto"
Party.kind = ORGANIZATION
```

No requiere cumplir previamente la condición de Client.

Una empresa puede tener contactos, riesgos, notas, documentos y actividad comercial antes
de poseer ninguna Policy. Al adquirir la primera no se crea ni se convierte ninguna otra
entidad: conserva su identidad y su historia.

La UI debe poder distinguir PROSPECTO de CLIENTE sobre la misma Party.

No existe necesariamente una tabla independiente `Account`.

---

# 17. OrganizationMembership

**Estado: MODELED NOW**

Representa una relación entre una persona y una organización.

Sustituye al nombre previo `AccountContact`.

Conceptualmente:

```text id="yjmz1s"
OrganizationMembership

id

organizationPartyId
personPartyId

kind?
roleOrPosition?

isPrimary?

validFrom
validTo?
```

Permite representar con la misma estructura:

- contacto de una empresa cliente;
- contacto de una empresa prospecto;
- ejecutivo de cuenta en una aseguradora;
- otras relaciones persona-organización.

No implica que la organización sea Account.

---

# 18. ContactPoint

**Estado: MODELED NOW**

Canales iniciales:

```text id="21cmyp"
EMAIL
PHONE
WHATSAPP
```

Conceptualmente:

```text id="r9c1mo"
ContactPoint

id
partyId

channel

value
normalizedValue

status
isPrimary
verifiedAt?

validFrom
validTo?

source?
```

---

# 19. ContactPoint e identidad

Un ContactPoint:

- puede cambiar;
- puede expirar;
- puede ser reemplazado;
- puede estar mal cargado;
- puede presentar uso compartido;
- puede ser reciclado por un proveedor telefónico.

Por lo tanto:

> ContactPoint ayuda a resolver identidad, pero no es identidad.

La modificación del canal no reasigna retroactivamente comunicaciones históricas.

---

# 20. ContactPoint uniqueness

**Estado: PROVISIONAL**

Objetivo operacional:

> un ContactPoint activo debería resolver inequívocamente a una Party siempre que la realidad lo permita.

No se decide todavía una constraint física global estricta.

Casos a validar:

- teléfonos compartidos;
- líneas empresariales;
- parejas/familias;
- números reciclados;
- inconsistencias de Zoho.

Un conflicto debe ser visible.

No debe resolverse arbitrariamente.

---

# 21. Identity resolution

Flujo conceptual:

```text id="6dpjrl"
External contact value
        ↓
normalize
        ↓
active ContactPoint?
     ┌──────┴──────┐
    YES            NO
     ↓              ↓
   Party        UNRESOLVED
```

`UNRESOLVED` es un estado válido del proceso de resolución.

Nunca se crea o selecciona una Party silenciosamente sólo para evitar un estado desconocido.

---

# 22. Insurer

**Estado: MODELED NOW AS CURATED REFERENCE**

Las aseguradoras forman un conjunto pequeño y administrado.

No deben crearse automáticamente a partir de texto recibido durante importaciones.

Para Vertical Slice 01, conceptualmente se necesita:

```text id="vyo28x"
Insurer

id
organizationPartyId
canonicalName
active
```

La Party asociada debe ser:

```text id="go4k8h"
Party.kind = ORGANIZATION
```

---

# 23. Insurer aliases

Los nombres de aseguradora provenientes de sistemas externos deben normalizarse contra un catálogo curado.

Ejemplos potenciales:

```text id="f3mdlx"
"La Segunda"
"LA SEGUNDA SEGUROS"
"La Segunda Coop. Ltda."
```

deben poder resolver a la misma aseguradora.

Conceptualmente:

```text id="tu30se"
InsurerAlias
alias
insurerId
sourceSystem?
```

La implementación física exacta puede ser:

- tabla;
- configuración versionada;
- staging mapping.

La invariante es:

> el importador no crea una nueva Insurer simplemente porque encuentre un string desconocido.

Los valores desconocidos se reportan para resolución.

---

# 24. InsurerProfile

**Estado: NAMED, NOT MODELED**

Cuando el POC de cotización requiera atributos propios de una aseguradora se evaluará:

```text id="d9d352"
InsurerProfile
```

ligado a la Organization Party.

Puede contener posteriormente:

- códigos de productor;
- capacidades;
- URLs;
- referencias de integración;
- metadata comercial.

`INSURER` no se modelará como `PartyRole`.

---

# 25. Policy

**Estado: MODELED NOW**

`Policy` representa la identidad interna estable de **un período contractual de seguro**.

No representa toda la relación histórica del cliente con un riesgo.

Cada renovación puede originar una nueva Policy.

Conceptualmente:

```text id="n2bh3r"
Policy

id

insurerId
policyNumber

renewedFromPolicyId?

createdAt
```

Puede incluir metadata técnica/source-lineage cuando corresponda.

---

# 26. Policy: qué NO pertenece aquí

Los siguientes conceptos no son autoridad de `Policy`:

- vigencia contractual;
- fecha de vencimiento;
- estado;
- prima;
- moneda;
- cobertura;
- renewalMode;
- tomador;
- producto vigente.

Esos hechos pertenecen a `PolicyVersion`.

No deben existir dos fuentes de verdad sobre ellos.

---

# 27. Policy external identity

`policyNumber` es una referencia externa fuerte, pero no el ID canónico.

La combinación:

```text id="ob0854"
insurer + policyNumber
```

puede utilizarse para matching.

No debe asumirse globalmente única sin analizar los datos reales.

Cada renovación produce una Policy nueva, con número nuevo y vigencia nueva. Puede además
cambiar de aseguradora.

El par:

```text id="uq9p1c"
insurerId + policyNumber
```

es único. Dos registros del origen con la misma combinación son una anomalía, no un caso
válido del dominio, y se resuelven explícitamente antes de importar. Una Policy del origen
sin aseguradora no puede formar el par y recibe el mismo tratamiento. → `D-0038`

El `Policy.id` interno permanece como identidad técnica del período contractual que Broker OS decidió representar.

---

# 28. PolicyVersion

**Estado: MODELED NOW**

Representa el estado contractual efectivo durante un intervalo.

Conceptualmente:

```text id="et8ypv"
PolicyVersion

id
policyId
versionNumber

effectiveFrom
effectiveTo?

holderPartyId

productReference?

termStartDate
termEndDate

renewalMode

premium?
currency?

coverageData

status

endorsementId?
sourceEventType?
sourceEventId?

createdAt
```

`coverageData` no tiene todavía estructura definitiva.

`holderPartyId` es único y obligatorio: una PolicyVersion tiene exactamente un tomador.
Cuando el origen presenta Cuenta y Contacto, la Cuenta es el tomador y el Contacto es una
persona de referencia de esa empresa que no adquiere por ese hecho ningún rol contractual.
Esa relación persona-organización pertenece a `OrganizationMembership`, no a la Policy.
→ `D-0036`

`endorsementId` referencia el Endorsement que originó la versión, cuando lo hubo. → `D-0037`

---

# 29. Semántica temporal de PolicyVersion

Los intervalos efectivos utilizan semántica:

```text id="n5i8k0"
[effectiveFrom, effectiveTo)
```

es decir:

- `effectiveFrom` inclusive;
- `effectiveTo` exclusive.

Una Policy no puede tener dos PolicyVersions cuyos intervalos efectivos se solapen.

Puede existir como máximo una versión con:

```text id="j40s8t"
effectiveTo = null
```

---

# 30. PolicyVersion invariants

## INV-PV-001

Cada PolicyVersion pertenece a exactamente una Policy.

## INV-PV-002

`versionNumber` tiene orden inequívoco dentro de una Policy.

## INV-PV-003

No existen intervalos efectivos solapados para la misma Policy.

## INV-PV-004

Existe como máximo una versión abierta por Policy.

## INV-PV-005

Una versión histórica no se sobrescribe para representar un nuevo estado contractual.

## INV-PV-006

Para una fecha determinada debe poder resolverse de forma inequívoca la versión efectiva, si existe una.

---

# 31. Current Policy Version

Es un concepto derivado.

Conceptualmente:

> la PolicyVersion efectiva para la fecha relevante o la versión abierta actual.

No constituye otra fuente de verdad.

Si por performance se introduce posteriormente:

```text id="j5j8xk"
currentPolicyVersionId
currentTermEndDate
```

u otra proyección, deberá declararse explícitamente como:

> cache/projection derivada.

Nunca como autoridad independiente.

---

# 32. Policy chain

Cada nueva Policy producto de una renovación puede referenciar su predecesora:

```text id="85jdk5"
renewedFromPolicyId
```

Ejemplo:

```text id="18l0te"
Policy 2026
    ↓
Policy 2027
    ↓
Policy 2028
```

La cadena representa continuidad comercial entre períodos contractuales.

`renewedFromPolicyId` se usa únicamente cuando la Policy predecesora existe dentro de
Broker OS. Cuando se conoce la referencia pero la predecesora no está migrada, la
continuidad se registra como `ExternalReference` y no como ausencia. → `D-0034`

---

# 33. Migration requirement: renewal chain

La migración de Zoho deberá intentar reconstruir esta cadena cuando los datos disponibles lo permitan.

No alcanza con importar las Policies como registros aislados.

Posibles señales:

- Party;
- aseguradora;
- número;
- fechas;
- producto;
- objeto asegurado futuro;
- relaciones históricas;
- información manual.

Cuando la relación no pueda determinarse con suficiente confianza, deberá permanecer:

```text id="k0nukg"
UNRESOLVED
```

o equivalente dentro del proceso de migración.

No se inventarán cadenas.

Un `renewedFromPolicyId` nulo significa que no se conoce ninguna predecesora, y nunca que
la predecesora existe fuera del alcance migrado: ese caso es explícito. → `INV-014`

---

# 34. Renewal

**Estado: PROVISIONAL / DERIVED VIEW**

Inicialmente se deriva de la versión relevante de Policy.

```text id="6ikhog"
Current PolicyVersion.termEndDate
+
Current PolicyVersion.renewalMode
```

con:

```text id="5cx4tw"
AUTOMATIC
MANUAL
```

Vistas iniciales:

```text id="49tgza"
Renewals this month
├── Automatic
└── Manual
```

---

# 35. Renewal promotion criterion

`Renewal` se reconsiderará como entidad cuando aparezca estado propio no derivable.

Ejemplos:

- resultado LOST;
- motivo de pérdida;
- responsable;
- intentos de contacto;
- SLA;
- workflow independiente;
- varias recotizaciones;
- negociación.

Hasta entonces sigue siendo una vista/workflow.

Toda medición de renovación declara su denominador. Cuando el alcance migrado no contiene
todas las predecesoras, "vencida sin sucesora" sobrecuenta, y la métrica debe decir sobre
qué conjunto se calcula. → `D-0007`

---

# 36. Endorsement

**Estado: MODELED NOW**

Evento del origen asociado a una Policy. **No es necesariamente contractual**: puede
registrar una refacturación, una declaración administrativa o un cambio de condiciones.

Campos conceptuales mínimos:

```text id="e7k2ql"
Endorsement

id
policyId
number?
kind
effectiveFrom?
effectiveTo?
sourceReference
createdAt
```

`policyId` no es nullable. Un Endorsement existe en Broker OS solo si puede asociarse
inequívocamente a una Policy que también está en Broker OS. Los Endorsements sin Policy
padre se descartan del conjunto migrable: no entran al dominio, no entran a staging, no
generan `ExternalReference` y permanecen únicamente en el export crudo preservado.

Un Endorsement no sobrescribe el estado anterior.

**Qué tipos producen una nueva `PolicyVersion` se determina mediante una tabla curada
explícita; el importador no lo infiere.** La mayoría abrumadora de los endosos observados
no altera condiciones contractuales, y versionar por cada uno produciría una historia de
versiones idénticas que vuelve inútil la pregunta que justifica `PolicyVersion`.
→ `D-0037`

No se modela todavía workflow, SLA, responsable, approvals ni máquina de estados.

---

# 37. Cancellation

**Estado: NAMED AS EVENT**

Evento sobre una Policy que produce un cambio de estado contractual representado mediante PolicyVersion.

Debe registrar conceptualmente:

- fecha;
- causa;
- actor;
- consecuencia.

La taxonomía de motivos se validará contra procesos reales.

No se crea automáticamente una entidad Cancellation.

---

# 38. RiskObject

**Estado: NAMED, NOT MODELED**

Representa aquello que se asegura.

Ejemplos:

```text id="d7q9at"
Vehicle
Property
Machine
WineStock
Vineyard
Fleet
```

No se introduce todavía una abstracción genérica de schema.

El primer caso probablemente será Automotor.

La existencia de un segundo dominio con necesidades compartidas justificará reevaluar la abstracción.

**Advertencia de nomenclatura.** El campo del sistema de origen llamado `Riesgo` designa el
**producto o ramo**, no el objeto asegurado. `RiskObject`, `InsuranceProduct` y
`EnterpriseRisk` son tres conceptos distintos. → §75, §76

---

# 39. Quote

**Estado: NAMED, NOT MODELED**

Contexto compartido de una solicitud de cotización.

Conceptualmente:

```text id="24luam"
Quote
  party
  risk
  requestedCoverage
```

---

# 40. QuoteOption

**Estado: NAMED, NOT MODELED**

Cada respuesta de una aseguradora.

```text id="dvia3v"
Quote
├── QuoteOption — La Segunda
├── QuoteOption — Meridional
└── ...
```

Conceptos previsibles:

```text id="r55reu"
insurer
premium
coverage
validUntil
status
documents
```

Modelado pendiente del POC.

---

# 41. Issuance

**Estado: NAMED, NOT MODELED**

Proceso para generar una Policy.

Puede originarse desde QuoteOption.

No forma parte de la identidad de Policy.

Una Policy importada/manualmente cargada no necesita Issuance.

No existe todavía abstracción general `Case`.

---

# 42. Claim

**Estado: NAMED, NOT MODELED**

Proceso de gestión de siniestro.

Probablemente necesitará:

- lifecycle;
- comunicaciones;
- documentos;
- responsables;
- estados;
- fechas;
- resultado.

Se modelará mediante POC específico.

---

# 43. PolicyInstallment

**Estado: NAMED, NOT MODELED**

La unidad operativa de cobranza probablemente sea la cuota.

Conceptualmente:

```text id="ot8pph"
PolicyInstallment

policy
number
dueDate
amount
status
```

No se fija schema todavía.

---

# 44. Collection

**Estado: NAMED, NOT MODELED**

No confundir:

- cuota debida;
- pago;
- seguimiento de cobranza.

El POC correspondiente definirá la estructura.

---

# 45. Commission

**Estado: DEFERRED**

Se distinguen conceptualmente:

```text id="vaj5vm"
Expected Commission
Received Commission
```

La segunda puede requerir conciliación contra liquidaciones reales de aseguradoras.

No se crea una entidad genérica antes de comprender el flujo.

---

# 46. RiskAssessment

**Estado: NAMED, NOT MODELED**

Puede contener:

- riesgos;
- vulnerabilidades;
- criticidad;
- mitigaciones;
- plan de acción;
- transferencia aseguradora;
- documentación.

Esta sección mezcla hoy seis conceptos —riesgos, vulnerabilidades, criticidad,
mitigaciones, plan de acción y transferencia— que todavía no están separados.

Qué parte merece estructura lo determina el POC de gestión de riesgos empresariales,
posterior a VS01. → §76

---

# 47. DocumentLink

**Estado: MODELED NOW**

Google Drive es el document system of record.

Conceptualmente:

```text id="joj3sw"
DocumentLink

id

resourceType
resourceId

driveFileId
driveUrl?
driveItemType

documentKind?

reconciliationStatus
lastSeenAt?

createdAt
```

---

Un `DocumentLink` a un **archivo** es de primera clase y no una desviación: a nivel Policy
es la forma mayoritaria del vínculo en los datos reales. `driveItemType` distingue archivo
de carpeta y ambas son representaciones legítimas.

---

# 48. Autoridad documental

La autoridad se descompone en ejes. → `D-0040`

| Eje | Autoridad |
|---|---|
| Contenido | Google Drive, sin excepción |
| ACLs y permisos | Google Drive, sin excepción |
| Ubicación y estructura | Se lee y se respeta. Broker OS puede **proponer** una estructura canónica futura; proponerla no lo convierte en autoridad |
| Referencia, clasificación y metadata | Broker OS |

No existen dos sistemas autoritativos de permisos.

Vertical Slice 01 es estrictamente de solo lectura sobre Drive: no crea, no mueve, no
renombra, no modifica y no elimina archivos ni carpetas. Toda capacidad futura de escritura
requiere decisión y tarea específicas y aprobación humana. → `D-0009`, `D-0032`, `D-0040`

---

# 49. Drive reconciliation

Debe suponerse que humanos pueden:

- mover;
- renombrar;
- agregar;
- eliminar;
- cambiar permisos.

Estados candidatos:

```text id="vlzx4h"
NOT_REFERENCED
SYNCED
MISSING
MOVED
PERMISSION_ERROR
UNKNOWN
```

`NOT_REFERENCED` es el caso de un recurso que nunca tuvo referencia documental en el
origen. Es mayoritario y no es una excepción: tratarlo como `MISSING` o `UNKNOWN` llenaría
la cola de conciliación con miles de ítems que no requieren acción.

La taxonomía final se validará en VS01.

---

# 50. Communication

**Estado: NAMED, NOT MODELED**

Canales iniciales:

```text id="c90xtw"
EMAIL
WHATSAPP
```

No se asume que ambos canales deban persistirse de la misma manera.

---

# 51. Email Communication

Gmail es system of record.

Broker OS podrá indexar:

```text id="ei2cpv"
externalMessageId
threadId
timestamp
participants
partyResolution
snippet
```

Normalmente no conservará una segunda copia completa del cuerpo.

---

# 52. WhatsApp Communication

La persistencia dependerá del POC y capacidades de Meta.

Puede necesitar almacenar más información para:

- attachments;
- búsqueda;
- procesamiento;
- historial;
- auditoría.

Decisión abierta.

---

# 53. User

**Estado: MODELED NOW**

Principal autenticable.

Conceptualmente:

```text id="g8m0nm"
User

id
email
partyId?
status
authProvider
createdAt
```

No se modelan permisos mediante subtipos rígidos de User.

---

# 54. Internal roles

Conceptos iniciales:

```text id="xoo3xh"
ADMINISTRATOR
PRODUCER
RISK_ANALYST
READ_ONLY
```

**Estado: CONCEPT DECIDED / IMPLEMENTATION OPEN**

---

# 55. PortfolioAssignment

**Estado: NAMED, NOT MODELED**

El requisito:

> Producer accede a su cartera

implica una asignación con historia.

Conceptualmente:

```text id="0s47lk"
party/account
producerUser
validFrom
validTo
```

La semántica mínima —principal, cartera e intervalo de validez— debe estar explícita
antes de comparar mecanismos en `T-0002`. El schema sintético del spike no cierra la
decisión de estructura física. `D-0027` se resuelve después de `D-0022` y antes de
implementar enforcement productivo para productores.

---

# 56. PortalGrant

**Estado: NAMED, NOT MODELED**

Autorización externa.

Conceptualmente:

```text id="5msq7f"
userId
partyId?
resourceType
resourceId
scope
validFrom
validTo
grantedBy
```

No se implementa antes del Spike de autorización.

---

# 57. BusinessAuditEvent

**Estado: MODELED NOW**

Pertenece a Broker OS.

Conceptualmente:

```text id="f3e9if"
BusinessAuditEvent

id
occurredAt

actorType
actorId
onBehalfOfUserId?

operation

resourceType
resourceId

before?
after?

approvalId?
agentRunId?

metadata?
```

Actores:

```text id="63jxed"
USER
AGENT
SYSTEM
```

Es append-only.

No almacena telemetría de modelos.

Las referencias históricas a Parties mergeadas pueden conservar el ID original; la resolución de identidad canónica utiliza la cadena de merge.

---

# 58. AgentRun

No pertenece al dominio Broker OS.

Pertenece a Project OS.

Un BusinessAuditEvent puede opcionalmente referenciar:

```text id="3wdiph"
agentRunId
```

cuando una acción de negocio haya sido realizada por un agente.

---

# 59. Conceptos derivados

No deben transformarse automáticamente en tablas.

## Client

Party con negocio asegurado según definición vigente.

## ActiveClient

Puede derivarse de la existencia de cobertura/Policy vigente.

## Account

Organization Party que cumple condición de Client.

## CurrentPolicyVersion

Versión efectiva correspondiente.

## Renewal List

Derivada de PolicyVersion.

## Dashboard

Vista sobre datos existentes.

---

# 60. Identity matching

## PERSON

Señales posibles:

- DNI;
- CUIL;
- nombre;
- email;
- teléfono;
- fecha de nacimiento.

## ORGANIZATION

- CUIT;
- razón social;
- nombre comercial.

## POLICY

- aseguradora;
- número;
- vigencia;
- tomador.

## INSURER

- catálogo curado;
- aliases;
- source mappings.

## FUTURE VEHICLE

- patente;
- VIN/chasis.

Ninguna fuente se considera perfecta sin validación.

---

# 61. Matching ≠ merge

El proceso deberá distinguir estados como:

```text id="xr9l70"
MATCH_CONFIDENT
MATCH_POSSIBLE
CONFLICT
NO_MATCH
```

Un match probable no autoriza automáticamente un merge irreversible.

La operación de merge utiliza el mecanismo definido para Party y deja trazabilidad.

---

# 62. Source lineage

Durante migración debe poder conocerse:

```text id="dd1cqc"
sourceSystem
sourceRecordId
importBatchId
```

La implementación puede vivir en metadata de migración y no necesariamente en todas las entidades finales.

La trazabilidad es obligatoria.

El linaje completo vive en staging. `ExternalReference` es su parte visible desde el
dominio: existe cuando una referencia no resuelta tiene valor operativo en producto.
→ `D-0033`, `D-0034`

---

# 63. Vertical Slice 01

Objetivo:

> Pólizas + Documentos + Búsqueda.

Subconjunto esperado:

```text id="nb7sb4"
Party
PersonProfile
OrganizationProfile
PartyRole

ContactPoint

Insurer / insurer aliases

Policy
PolicyVersion

DocumentLink

Endorsement

ExternalReference

basic User
```

`OrganizationMembership` entra en el subconjunto: la evidencia de migración muestra que la
navegación empresa → contactos es necesaria, porque las Cuentas del alcance expanden a sus
Contactos por relación organizacional explícita del origen.

`Endorsement` entra por `D-0037` y `ExternalReference` por `D-0034`. Que estén en el
schema no amplía la superficie de UI de VS01: `Endorsement` aparece inicialmente solo en el
historial de una Policy, y `ExternalReference` solo como motivo visible de un vínculo
ausente. → §74

---

# 64. ContactPoint en VS01

`ContactPoint` forma parte del import inicial aunque todavía no se utilice para resolver identidad en funcionalidades de WhatsApp/email.

Su función inicial es **preservar**, no automatizar.

```text id="b5vqci"
Zoho email / phone / WhatsApp
        ↓
ContactPoint
        ↓
stored with source lineage
```

Esto evita un import lossy y una segunda migración posterior.

En VS01 puede considerarse funcionalmente:

> write-first / read-limited.

---

# 65. Búsqueda VS01

Candidatos:

- nombre;
- apellido;
- DNI;
- CUIT;
- empresa;
- número de póliza;
- aseguradora.

Flujo:

```text id="2hcd3d"
Party
  ↓
Policies
  ↓
Policy / current PolicyVersion
  ↓
Drive Documents
```

No requiere CRM completo.

---

# 66. VS01 non-scope

Fuera de alcance:

- Quotes;
- QuoteOptions;
- Issuance;
- Claims;
- commissions;
- collection;
- WhatsApp integration;
- Gmail integration;
- Tasks;
- Risk Panel;
- RAG;
- external portal;
- autonomous business actions.

Claims, Tasks, Notes y Opportunities quedan fuera de la **UI** de VS01 y se preservan en
**staging**: no migrar y no preservar son decisiones distintas. → `D-0033`, `R-23`

---

# 67. Domain invariants

## INV-001 — Stable Party Identity

Una Party no cambia de ID porque cambie su relación con el broker.

## INV-002 — Merge preserves identity history

Una Party mergeada no se elimina ni reutiliza; resuelve hacia su Party canónica.

## INV-003 — No merge cycles

La relación `mergedIntoPartyId` nunca forma ciclos.

## INV-004 — Non-destructive prospect evolution

Cerrar un Prospect no destruye Party ni historia.

## INV-005 — Explicit roles do not duplicate derived facts

`CLIENT` no se persiste simultáneamente como role y como condición derivable.

## INV-006 — One active explicit role

Existe como máximo un PartyRole activo por `(party, role)` en un mismo instante.

## INV-007 — ContactPoint history

Cambiar un canal no reasigna comunicaciones históricas.

## INV-008 — Organization relationship is independent of client status

Una relación persona-organización puede existir aunque la organización sea prospecto, cliente o aseguradora.

## INV-009 — Manual policies are first-class

Policy puede existir sin Quote ni Issuance.

## INV-010 — Policy state has one authority

Vigencia, estado, prima y cobertura pertenecen a PolicyVersion, no se duplican en Policy.

## INV-011 — Non-overlapping PolicyVersions

Los intervalos `[effectiveFrom,effectiveTo)` de una misma Policy no se solapan.

## INV-012 — Maximum one open PolicyVersion

Una Policy posee como máximo una versión con `effectiveTo = null`.

## INV-013 — Policy history is reconstructable

Un cambio contractual no destruye estados previos.

## INV-014 — Renewal continuity is explicit when known

Las Policies renovadas se encadenan mediante `renewedFromPolicyId` cuando la evidencia permite establecerlo. Cuando se conoce la predecesora y no está en Broker OS, la continuidad se registra como `ExternalReference`, nunca como ausencia.

## INV-015 — Insurers come from curated catalog

Un string desconocido de importación no crea automáticamente una nueva aseguradora.

## INV-016 — Drive owns document content

Broker OS no es autoridad sobre bytes ni ACLs de Drive.

## INV-017 — Audit is append-only

Los BusinessAuditEvents no se actualizan ni eliminan mediante operaciones normales.

## INV-018 — Internal IDs are canonical

La identidad técnica no depende de un identificador natural único. La completitud de un identificador natural no condiciona la existencia ni el estado de la identidad interna.

## INV-019 — Unknown identity is explicit

Una identidad no resuelta permanece explícitamente sin resolver.

## INV-020 — Policy number uniqueness

No existen dos Policies con el mismo par `insurerId + policyNumber`.

## INV-021 — Endorsement requires policy

Todo `Endorsement` pertenece a exactamente una Policy existente en Broker OS.

## INV-022 — Resolving preserves the original reference

Resolver un `ExternalReference` no borra ni sobrescribe el valor de origen.

## INV-023 — Single holder

Toda `PolicyVersion` tiene exactamente un `holderPartyId`.

---

# 68. Data classification inicial

Categorías previsibles:

## Personal identifiers

- nombre;
- DNI;
- CUIL;
- CUIT;
- domicilio;
- email;
- teléfono.

## Insurance information

- pólizas;
- coberturas;
- primas;
- siniestros;
- vehículos;
- bienes.

## Potentially sensitive future data

- salud;
- accidentes;
- vida;
- información financiera.

No toda información puede circular libremente por prompts o logs.

---

# 69. Decisiones que este documento referencia

El `statement` y el `status` canónicos viven en `decisions.yaml`; este documento no los
reproduce ni los afirma. Referencia sus IDs estables:

- `D-0022` — Punto de enforcement de autorización.
- `D-0023` — Detalle de InsurerProfile.
- `D-0024` — Unicidad física de ContactPoint.
- `D-0025` — Representación de la cobertura en PolicyVersion.
- `D-0026` — Representación de InsuranceProduct.
- `D-0027` — Estructura de PortfolioAssignment.
- `D-0028` — Persistencia de comunicaciones, Gmail vs WhatsApp.
- `D-0029` — Abstracción RiskObject.
- `D-0030` — Granularidad futura de Prospect.

---

# 70. Criterios para modificar el dominio

Un cambio estructural se justifica cuando:

1. un POC falsifica una hipótesis;
2. datos reales contradicen una cardinalidad;
3. aparece un segundo caso que justifica abstracción;
4. una integración requiere identidad propia;
5. un requisito regulatorio lo impone;
6. una decisión genera riesgo irreversible de migración;
7. aparece lógica de sincronización entre dos representaciones del mismo hecho.

Los cambios estructurales relevantes deben registrarse mediante ADR.

---

# 71. Lo que no debe ocurrir

El dominio no crece porque:

- una biblioteca ofrece una feature;
- Zoho tiene un módulo con cierto nombre;
- un modelo sugirió una entidad;
- una pantalla necesita temporalmente un campo;
- algo podría ser útil algún día.

Debe crecer a partir del negocio y de evidencia.

---

# 72. Próximas validaciones

## A. Zoho semantic analysis

**Cumplida por `T-0004`.** Su evidencia agregada vive en `REVIEWS/T-0004-insumos-vs01.md`
y las decisiones de cierre en `D-0031` y `D-0032`. Lo que sigue se conserva como el
enunciado original de la validación.

Contrastar contra:

- datos reales;
- módulos;
- campos;
- custom fields;
- notas;
- workflows;
- usuarios.

Especial atención a:

- duplicados de Party;
- aliases de aseguradoras;
- historial de pólizas;
- continuidad de renovaciones;
- teléfonos/emails;
- semántica real de vigencias y estados.

## B. Vertical Slice 01

Validar que este subconjunto permite entregar:

> Pólizas + Documentos + Búsqueda

sin arrastrar CRM completo.

---

# 73. Staging y dominio

**Estado: MODELED NOW**

Son dos lugares con preguntas distintas.

> **staging** responde: ¿qué existía en Zoho?
> **dominio** responde: ¿cómo entiende Broker OS el negocio?

Staging conserva, como mínimo:

```text id="stg001"
IDs originales
relaciones relevantes del origen
valores originales necesarios
batch / snapshot de importación
trazabilidad hacia el origen
```

El dominio recibe únicamente conceptos suficientemente validados para ser `MODELED NOW`.

**Persistir no implica exponer.** Un módulo del sistema de origen no se promueve a entidad
de dominio por el hecho de existir, y el alcance de lo que se preserva es más amplio que la
superficie de producto. → `D-0033`, `D-0019`, `R-23`

La única excepción a la fidelidad de staging son las reglas de descarte definidas
explícitamente; hoy existe una: los Endorsements sin Policy padre. → `D-0037`

---

# 74. ExternalReference

**Estado: MODELED NOW**

Referencia conocida hacia una entidad externa, histórica o todavía no migrada, cuando esa
referencia tiene valor operativo dentro de Broker OS.

Campos conceptuales mínimos:

```text id="extref1"
ExternalReference

id

sourceSystem
sourceEntityType
sourceExternalId?
sourceValue?

relationType

resolutionStatus
unresolvedReason?

resolvedTargetType?
resolvedTargetId?

createdAt
```

Reglas:

1. resolver una referencia **nunca** borra ni sobrescribe la referencia original;
2. no es una relación polimórfica genérica para cualquier cosa;
3. existe únicamente cuando la referencia no resuelta necesita sobrevivir en el dominio o
   en el producto;
4. staging sigue siendo la representación fiel del origen;
5. no toda FK rota del origen merece un `ExternalReference`: algunas se tratan con una
   regla explícita de descarte.

Es el mecanismo que hace cumplible `INV-019` y la forma en que `INV-014` distingue "no se
renovó de nada" de "se renovó de algo que no está acá". → `D-0034`

---

# 75. InsuranceProduct

**Estado: NAMED, NOT MODELED**

Producto asegurador —el ramo o tipo de seguro— que una Policy instancia.

No confundir con `RiskObject`, que es el objeto asegurado, ni con `EnterpriseRisk`, que es
un riesgo empresarial identificado. El campo del sistema de origen llamado `Riesgo`
designa este concepto, no los otros dos.

Su catálogo es curado: el importador no crea productos desde strings ni desde filas
desconocidas del origen, y las referencias huérfanas se reportan para resolución humana,
igual que las aseguradoras. → `D-0041`, `D-0021`

Su estructura interna sigue sin decidirse. → `D-0026`

---

# 76. EnterpriseRisk

**Estado: NAMED, NOT MODELED**

Riesgo empresarial identificado mediante el proceso de gestión de riesgos de una
organización cliente.

Es un concepto **distinto** de `InsuranceProduct` y de `RiskObject`, aunque el lenguaje
corriente use "riesgo" para los tres.

La matriz de riesgos, el plan de acción, el mapa de transferencia y el feed de actividad
pertenecen a este concepto y **no se modelan todavía**: su estructura la determina el POC
de gestión de riesgos empresariales, posterior a VS01. → §46

---

# 77. Principio final

> **Modelar temprano aquello cuya identidad, historia o reconciliación serían costosas de corregir después; postergar aquello cuyo detalle puede aprenderse mediante evidencia y POCs.**

Por eso entran temprano:

- Party;
- merge de Party;
- ContactPoint;
- Policy;
- PolicyVersion;
- renewal chain;
- insurer normalization.

Y esperan evidencia:

- RiskObject;
- Commission;
- RiskAssessment;
- Case;
- granularidad avanzada de Prospect;
- estructuras específicas de integración.
