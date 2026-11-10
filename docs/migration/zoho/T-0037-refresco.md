# T-0037 · Diseño del refresco de clientes y pólizas

**Estado: propuesta, sin código.** Escrita el 2026-11-06 en la rama
`task/T-0037-infra-y-diseno-del-refresco`, sobre `main` en `19e6c96`. Describe qué pasa
hoy si se carga un export nuevo de Zoho, qué hay que cambiar para que el refresco sea
repetible sin perder historia y en qué orden. El código se escribe en los incrementos
del §5, cada uno con revisión ciega (R-33).

## 1. Qué pasa hoy con un export nuevo

El procedimiento actual (`docs/despliegue/vercel-vs01.md` §9 y §10) es: el owner importa
el lote en su base local con T-0013, y producción se reemplaza entera con un `pg_dump` de
las tablas de VS01. Leído contra el código de `main`, un segundo lote tendría cinco
problemas.

| # | Hallazgo | Dónde | Efecto con un lote nuevo |
|---|---|---|---|
| H1 | El dominio sólo inserta. `policy`, `policy_version` (versión 1), `party` y sus perfiles usan `on conflict … do nothing` | `packages/db/src/import/policies.ts:207`, `:258`; `parties.ts:34`, `:79`, `:112` | Las pólizas nuevas entran. Las que **cambiaron** en Zoho (prima, vigencia, tomador, renovación) siguen mostrando los datos del 16/09, sin ningún aviso. Es el peor modo de falla: datos viejos que parecen actuales |
| H2 | Staging se pisa. `staging_policy` y los demás módulos hacen upsert por `source_record_id` | `staging.ts:50`, `0003_zoho_staging.sql` | El crudo del lote anterior se pierde. Contradice `DOMAIN.md` §73 (staging conserva el lote) y §2.4 (historia antes que sobrescritura). Sin el crudo anterior tampoco se puede calcular qué cambió |
| H3 | El refresco de producción borra las tablas de VS01 y las recarga (`vercel-vs01.md` §10.5) | `delete from party` en `vaciar-vs01.sql` | Desde T-0035, `client_assignment.client_party_id` referencia `party` (`0007_identidad_y_autorizacion.sql:87`). En cuanto haya una asignación, el `delete` falla y el refresco aborta. Producción dejó de ser una réplica de la base local: tiene usuarios, invitaciones, asignaciones y auditoría que sólo existen ahí |
| H4 | La cabecera muestra la fecha de **importación**, no la del export | `packages/api/src/vs01/batch.ts` (`started_at`) | Un lote viejo importado hoy se rotularía con la fecha de hoy. Además, T-0013 registró que los módulos se exportan en fechas distintas |
| H5 | El lote está fijado en el código | `packages/db/src/import/lote.ts` (`DIRECTORIO_LOTE_VS01` y los hashes de `DIRECTORIOS_MODULO`) | Importar otro lote exige editar código |

Hay un sexto punto a verificar con un lote real: si Zoho cambia el número de una póliza ya
importada, el par (aseguradora, número) es nuevo y T-0013 crearía una segunda Policy con
el mismo `source_record_id`. No se encontró una restricción que lo impida.

## 2. Qué significa «refrescar»

Propuesta, alineada con `DOMAIN.md` §2.4 y §73 y con D-0033:

- **Cada export es un lote nuevo** con su manifiesto, como el del 16/09 (T-0004). El lote
  declara la fecha de export de cada módulo. Nada se edita en el código para importarlo.
- **Staging conserva cada lote.** El crudo se guarda por `(lote, registro)`; el último lote
  no borra al anterior. Así se puede responder qué existía en Zoho en cada fecha.
- **El dominio se actualiza por diferencias**, clasificando cada registro de origen:

| Clase | Qué es | Qué hace el refresco |
|---|---|---|
| NUEVO | Está en el lote nuevo y no en el anterior | Lo importa como hoy |
| IGUAL | Mismos valores en los campos que el dominio usa | Nada |
| CAMBIADO | Cambió algún campo que el dominio usa | Ver §3 |
| AUSENTE | Estaba en el lote anterior y no está en el nuevo | Nunca se borra. Se cuenta y se informa; puede ser un filtro distinto en el export |

- **Producción se actualiza en el lugar, no se reemplaza.** Se agregan las filas nuevas y se
  aplican los cambios por id, en una transacción, sin tocar usuarios, invitaciones,
  asignaciones, auditoría ni vínculos comprobados por una persona. Resuelve H3.
- **La fecha de corte es la del export**, la más antigua de los módulos del lote, y se ve en
  todas las pantallas: «Datos de Zoho al 16/09/2026». La fecha de importación pasa a
  segundo plano. Resuelve H4.

## 3. La pregunta abierta: qué hacer con una póliza que cambió

`PolicyVersion` es un estado contractual con fecha de vigencia (`DOMAIN.md` §28 y §29). Un
export de Zoho no dice **desde cuándo** rige un cambio. Hay tres caminos:

| Camino | Qué hace | Costo |
|---|---|---|
| a. Nueva versión | Cierra la versión vigente y abre otra con los valores nuevos, con fecha de vigencia igual a la fecha del export | Historia completa. La fecha de vigencia es una aproximación y hay que rotularla así |
| b. Corrección | Actualiza la versión vigente y guarda los valores anteriores en un historial | Más simple. Mezcla «Zoho corrigió un error» con «la póliza cambió» |
| c. Sólo informar | No toca el dominio; marca la póliza como «cambió en Zoho después del corte» | Seguro, pero no cumple el Outcome: los datos siguen viejos |

**Recomendación:** decidirlo con datos, no a ciegas. El primer incremento (§5, I1) sólo
**mide**: compara dos lotes y cuenta, por campo, cuántos registros cambiaron, sin escribir
en el dominio. Con esos conteos el owner elige entre a y b. Si la mayoría de los cambios
son de estado o de prima en la misma vigencia, conviene b. Si son vigencias nuevas,
conviene a. Las renovaciones de Zoho ya son registros nuevos, encadenados por T-0013.

## 4. Cobertura documental (U8)

Se mide con una consulta agregada sobre la base, sin datos de clientes en la salida.
Cuenta las pólizas del lote vigente según su mejor nivel documental:

| Nivel | Qué significa |
|---|---|
| Comprobado | Tiene un vínculo `HUMAN` verificado (D-0057) |
| Sin comprobar | Sólo tiene el enlace que informa Zoho (`ZOHO_UNVERIFIED`, D-0064) |
| Pendiente | Una persona lo registró como pendiente, con motivo |
| Sin documento | Ninguno de los anteriores |

La salida es una tabla de cuatro conteos con su proporción y va a `ops/evidence/T-0037.md`.

## 5. Incrementos

| # | Qué entrega | Toca producción | Revisión |
|---|---|---|---|
| I0 | Este diseño y la propuesta de infraestructura (`T-0037-infraestructura.md`) | No | Lectura del owner |
| I1 | Lote declarado por manifiesto (H5), staging por lote (H2), fecha de export registrada y comparación entre lotes que sólo cuenta (§3). Más la consulta de U8 (§4) | No. El owner la corre en local con un export nuevo | Ciega |
| I2 | Aplicación de cambios en el dominio, según lo que el owner elija en §3 (H1) | No | Ciega |
| I3 | Refresco de producción en el lugar (H3) y fecha de corte en la cabecera (H4). Reemplaza §10 de `vercel-vs01.md` | Sí, con aprobación del owner antes de cada corrida | Ciega |
| I4 | El owner refresca producción, compara 20 pólizas contra Zoho y registra U8 (Verification de la tarea) | Sí | Owner |

I1 se parte en tres entregas del plan (`docs/north-star/12-plan-hacia-la-north-star.md`):
I1a, lote por manifiesto y staging por lote (H5 y H2), formato en `lote-manifiesto.md`;
I1b, fecha de export por módulo y comparación que sólo cuenta; I1c, la consulta de U8. El
manifiesto de I1a ya declara y registra la fecha de export de cada módulo; I1b la usa.

La infraestructura (`T-0037-infraestructura.md`) corre en paralelo: el owner puede aprobarla
y aplicarla en cualquier momento antes de I4.

## 6. Qué necesita el owner

1. Elegir una opción de infraestructura (`T-0037-infraestructura.md` §4).
2. Para I1: un export nuevo de Zoho con los mismos cuatro módulos (Pólizas, Endosos,
   Contactos, Cuentas), preparado con el script de T-0004. Queda en su máquina, como el
   del 16/09 (D-0053).
3. Después de I1: elegir entre los caminos a y b del §3, mirando los conteos.

## 7. Qué no se verificó

- Ningún punto de este documento se probó con un segundo lote real: no existe todavía.
- Si producción ya tiene filas en `client_assignment`. Según `ops/evidence/T-0035.md`, en la
  fase 2 entró sólo el owner como Administrador, así que H3 puede no haber fallado todavía.
- El sexto punto del §1 (número de póliza cambiado) se dedujo leyendo el código, sin prueba.
