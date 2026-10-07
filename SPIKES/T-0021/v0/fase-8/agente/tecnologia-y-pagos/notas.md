# Notas de corrida · agente-8b-tecnologia-y-pagos

- Corrida: F8-AG-01 · fase 8 · familia Tecnología y pagos (S04, S29, S30) · metodologia v0.2 · protocolo v0.2.
- Inicio: 2026-10-07T02:11:09Z
- SHA-256 al empezar:
  - `v0/metodologia-v0.md`: 51de7a1fad089ab6f61c22ce948339d4fef76b83df28a75b6760483795575904
  - `v0/protocolo.md`: 1067d355d7690f4a35c3de45361456a9923f284f2d6f65fdb049320897ba0c84
- Cierre: 2026-10-07T06:57:09Z (hashes verificados de nuevo al cierre: sin cambios).
- Fuentes leídas: sólo `metodologia-v0.md`, `protocolo.md` (§1–§5, §10 y encabezados), las dos plantillas, `emi41/lista-riesgos-tecnologia-y-pagos.csv` y `emi41/fichas/S04`, `S29`, `S30` (empresa, transferencia y una ficha por `risk_id`).
- Orden de trabajo: empresa por empresa (S04 → S29 → S30); el orden D10 de cada una se fijó en `ranking.md` al terminarla y no se tocó después.
- Resultado: 24 fichas (16 riesgos, 2 padres, 6 sub-riesgos; sin escenarios por causa común, porque la lista no trae ninguno y es fija), 0 no evaluables, 27 anomalías (`AN-8-tecnologia-y-pagos-0001` a `0027`).
- Convenciones: `evaluacion_id` con formato `EV-8-tecnologia-y-pagos-NNNN` para no chocar con otras familias; `prioridad_provisional` del padre escrito en `justificacion` porque la plantilla no tiene esa columna (anomalía A12); `banda` vacía en todas.
- Nada impidió evaluar. Puntos de juicio con más peso: el corte P/V cuando el texto del evento es posterior al iniciador (S30-P01-S01, S30-P01-S02, S29-P01-S01) y la regla de §3.2 que obliga a tomar la fuente de jerarquía 1 aunque la historia propia indique un nivel más alto (S04-R02, S29-P01-S02, S29-R04, S30-R05, S30-R06, S30-R08), registradas como anomalías.
