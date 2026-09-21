# ADR-0044 — Protección local de rutas desde Bash

- **Id en `decisions.yaml`:** D-0044
- **Fecha:** 2026-09-20
- **Aplicación:** realizada al completar el pedido del owner; evidencia en `ops/evidence/T-0008.md`.

## Contexto

Las reglas existentes protegen Edit/Write, pero ejecutar una herramienta de escritura
desde Bash no equivale a invocar esas herramientas. T-0008 exige una prueba negativa
para ambas rutas y un control positivo de sed sobre TASKS.

Una expresión regular sobre el nombre de una carpeta no determina todos los efectos
de una shell. Hay variables, programas externos, links y cambios de directorio. Aprobar
un comando porque no contiene un nombre protegido sería una garantía falsa.

## Referencia canónica

La decisión y su criterio de falsación están en D-0044, en `decisions.yaml`.
La instalación y sus límites están documentados; no se reformulan R-13 o R-15.

## Alternativas consideradas

| Alternativa | Limitación |
| --- | --- |
| Buscar únicamente las dos rutas en el texto | Omite rutas indirectas y programas que calculan sus destinos. |
| Intentar interpretar Bash completo | Incorpora un parser y aun así no conoce los efectos de programas arbitrarios. |
| Bloquear todo Bash | Impide también lecturas y la prueba positiva exigida por la tarea. |
| Sandbox de filesystem | Ofrece otra frontera de enforcement, pero requiere diseño y validación propios; no se declara instalado aquí. |

## Consecuencias

El prototipo usa un subconjunto pequeño de comandos reconocibles y revisión humana
para el resto. No emite `allow`, no ejecuta comandos recibidos ni modifica sus argumentos.
Los destinos explícitos protegidos se deniegan. El propio hook propuesto reside en la
ruta ya protegida; no se añade otra ruta a los deny rules.

La contrapartida es pedir confirmación para scripts y comandos compuestos, incluso
para checks legítimos: sus efectos no se prueban leyendo su nombre. La revisión humana
debe comprobar que no escriban rutas protegidas; no basta aprobarlos por costumbre.
No se evalúa la calidad del contenido escrito ni se autoriza otra acción de negocio.

El host, Node y la carga del hook forman parte de la base de confianza. No cubre procesos
externos a Claude Code, herramientas de otro proveedor, cambios concurrentes del filesystem,
fallos del runtime al cargar/ejecutar el hook ni decisiones humanas incorrectas. Un hook
local no reemplaza CI (R-17), ni una prueba aislada demuestra su activación en sesión.

## Validación y fuentes

La guía de aplicación y pruebas está en `REVIEWS/T-0008-control-bash.md`.
Se consultó la [referencia oficial de hooks](https://code.claude.com/docs/en/hooks):
entrada JSON por stdin, decisión estructurada de PreToolUse, comandos en exec form y
semántica de ask. La versión local observada es Claude Code 2.1.236. La documentación
indica que ask fuerza revisión incluso en modo auto desde 2.1.211; se exige verificar
esa conducta en cada nueva validación del control. Timeouts o fallos de lanzamiento pueden dejar
el evento sin decisión: no se declara que el runtime falle cerrado en esos casos.

## Resultado de aceptación

Los rechazos de las dos rutas y el sed permitido se observaron en Claude Code 2.1.236,
con la configuración project y modo manual. El programa opaco produjo ask; el runtime
headless lo denegó al no poder obtener confirmación. No se observó una UI interactiva
ni se ensayó modo auto. La evidencia literal y las huellas del hook están en
`ops/evidence/T-0008.md`; el estado de D-0044 conserva su criterio de falsación.
