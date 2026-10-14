# Decisiones de Emiliano · Fase 14 (cierre de EMI-41)

> Respuesta de Emiliano al "Para aprobar" de `dossier-cierre-emi41.md`, copiada tal cual. Recibida el **2026-10-14 a las 15:04:55 UTC** en el thread del proyecto "Fase 14 cierre EMI-41".
>
> EV-11-0063 y EV-11-0064 no se tocan: ya estaban aceptadas desde el 2026-10-13 (`v0/fase-11/aceptacion-fichas-emiliano-2026-10-13.md`). Las filas que la respuesta llama CH-111 y CH-112 quedan aprobadas en `anexo-changelog-fase-14.md`, renumeradas CH-113 y CH-114 porque la PR #73 de la Fase 13 ya usa CH-111 y CH-112 (mismo contenido), y no entran ahora al changelog, que está congelado con la v1 (punto 6).

---

1. Inventario: sí. Apruebo `inventario.md` con la repetición de `evaluacion_id` registrada como limitación y destinada a la Fase 15. No se renombran ni reescriben las evaluaciones históricas. El contrato futuro deberá definir explícitamente si `evaluacion_id` es globalmente único o si existe una clave compuesta; para Risk OS prefiero ids globalmente únicos.
2. Matriz de criterios: sí. Apruebo `criterios-cierre-emi41.csv` con 9 criterios cumplidos y 5 cumplidos con limitación. En particular, P5/L4 permanecen con limitación porque las 15 ocurrencias de `base = —` no corresponden al enum formal de EMI-17 y deberán normalizarse o interpretarse explícitamente en la Fase 15.
3. Cobertura efectiva: sí. Apruebo `cobertura-efectiva.csv` y su regla de atribución. El resultado 30/35 se interpreta como una métrica retrospectiva y descriptiva de capacidad de tensionar la metodología, no como una tasa de validación ni como un objetivo preregistrado. C34 queda registrado como cobertura insuficiente y no requiere crear nuevos casos para cerrar EMI-41.
4. Manifiesto del dataset: sí. Apruebo `dataset/manifiesto.md` y sus tres modos de uso. El dataset queda considerado reutilizable para el estado actual del experimento, mientras que EMI-16/Fase 15 definirá los contratos definitivos. Para futuras evaluaciones ciegas conviene además generar mediante script una vista o export físicamente libre de resultados y metadatos posteriores, para evitar contaminación accidental.
5. S01, S25 y S30: sí. Se registran como empresas que no aportaron evidencia incremental distinta después de la Fase 8 y se conservan íntegramente en el dataset. No se eliminan retrospectivamente.
6. CH-111 y CH-112: sí. Apruebo registrar las dos limitaciones en el anexo y trasladarlas al changelog cuando se abra la siguiente versión. No se modifica ahora `v0/changelog-metodologia.md` porque forma parte del congelamiento de v1.
7. Cierre de EMI-41: sí. Doy EMI-41 por cerrada con este dossier. Su estado en Linear permanece Done.

EMI-41 queda cerrada porque produjo un conjunto amplio, diverso, íntegro y reutilizable de casos sintéticos que permitió aplicar y tensionar la metodología de Risk OS. Las limitaciones restantes son de cobertura, identificación y contrato de datos; están registradas y tienen destino posterior, pero no invalidan el objetivo del issue ni justifican reabrirlo.

---

## Pendientes que deja esta respuesta (destino: Fase 15 / EMI-16)

- Definir si `evaluacion_id` es globalmente único o clave compuesta; preferencia de Emiliano: ids globalmente únicos (punto 1).
- Normalizar o interpretar explícitamente las 15 `base = —` frente al enum de EMI-17 (punto 2).
- Para evaluaciones ciegas futuras, generar por script una vista o export físicamente libre de resultados y metadatos posteriores (punto 4). No se construye en esta fase.
