# E2-02 — Consultas de la semana de prueba

La semana sin Zoho CRM (E2-03) se mide contra esta lista, fijada antes de observar. Una
consulta que no está acá y aparece durante la semana se anota igual, como «no prevista».

**Estado: confirmada por el owner el 2026-11-12.** La lista sale de lo que Broker OS ya
resuelve y de los recorridos R1 a R6.

## Corte de los datos

Cada pantalla con datos muestra la fecha del lote importado (VS01 §2): ése es el corte
conocido. El refresco desde Zoho es DAT-01 y C3-06 (`T-0037`), que el owner postergó al
01/01/2027, y la semana de prueba (E2-03) quedó postergada a esa misma fecha. Arranca con el lote que esté cargado ese día, y la fecha
del lote se anota en el registro.

## Lista

| # | Consulta | Dónde se resuelve en Broker OS | Listo |
|---|---|---|---|
| 1 | Encontrar a un cliente por nombre, apellido, DNI, CUIT o empresa | Buscar | sí |
| 2 | Encontrar una póliza por número o por aseguradora | Buscar | sí |
| 3 | Ver las pólizas de un cliente y cuáles están vigentes | Ficha del cliente | sí |
| 4 | Ver los datos de una póliza: compañía, vigencia, versiones | Ficha de la póliza | sí |
| 5 | Abrir el documento de una póliza | Ficha de la póliza, acceso documental | sí |
| 6 | Ver el teléfono o el correo de un cliente | Ficha del cliente, contactos | sí |
| 7 | Ver los contactos y las notas internas de una empresa | Ficha de la empresa | sí |
| 8 | Saber qué pólizas vencen en los próximos 30, 60 o 90 días | Renovaciones | sí |
| 9 | Ver qué gestiones tiene abiertas un cliente y quién las lleva | Ficha del cliente, Gestiones | sí |
| 10 | Saber en qué etapa está un siniestro, qué falta y con quién se habló | Gestión del siniestro | sí |
| 11 | Ver cómo va una cotización y qué cotizó cada compañía | Gestión de la cotización | sí |
| 12 | Saber qué tengo pendiente hoy: tareas, vencidas y trabadas | Inicio, Tareas | sí |
| 13 | Ver los riesgos de una empresa | Ficha de la empresa, sección Riesgos (Risk OS) | sí, con la organización vinculada |

## Registro de la semana (E2-03)

Una línea por consulta real, sin datos del cliente: alcanza con el número de la lista.

| Fecha | # | Se resolvió sin Zoho | Si no, qué faltó |
|---|---|---|---|
| | | | |

Una consulta resuelta con datos viejos cuenta como no resuelta, con la fecha del lote en
«qué faltó».
