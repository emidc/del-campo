# Notas de corrida · familia Energía y agua

- Evaluador: agente-8b-energia-y-agua · actor ai · fase 8 · corrida F8-AG-01 · metodologia v0.2 · protocolo v0.2.
- Inicio: 2026-10-07T02:11:01Z · Cierre: 2026-10-07T06:54:07Z.
- SHA-256 al empezar:
  - `v0/metodologia-v0.md`: 51de7a1fad089ab6f61c22ce948339d4fef76b83df28a75b6760483795575904
  - `v0/protocolo.md`: 1067d355d7690f4a35c3de45361456a9923f284f2d6f65fdb049320897ba0c84
  - Al cerrar se recalcularon y coinciden (la metodología no cambió durante la corrida).
- Fuentes leídas: metodología v0.2 completa; protocolo v0.2 completo; encabezados de `plantillas/ficha-evaluacion.csv` y `plantillas/registro-anomalias.csv`; `emi41/lista-riesgos-energia-y-agua.csv`; `emi41/fichas/S31` a `S34` (`empresa.md`, `transferencia.md` y una ficha por risk_id). Nada más.
- Orden de trabajo: empresa por empresa (S31, S32, S33, S34); cada orden D10 se fijó en `ranking.md` al cerrar la empresa y no se tocó después.
- Resultado: 24 fichas (24 riesgos simples; la lista no trae padres, sub-riesgos ni escenarios y no se crearon objetos nuevos, por ser lista fija de evaluación ciega). 2 no evaluables (S32-R06 por P unknown; S34-R01 por I-económico unknown con cota mayor que el C_raw conocido). 20 anomalías: A6 7, A2 4, A12 3, A8 3, A11 3. Banda vacía en todas las fichas (sin umbrales hasta la Fase 9).
- Convenciones propias, para la comparación: `evaluacion_id` con el formato `EV-8-energia-y-agua-NNNN` (análogo al de anomalías, para no chocar con otras familias en la carpeta compartida); la plantilla no tiene columna `prioridad_provisional` y no hizo falta (no hay padres). Magnitud de referencia económica en todas las empresas: RO 2025 (último ejercicio cerrado, positivo, sin partidas extraordinarias).
- Impedimentos: ninguno impidió evaluar. Dos fichas quedaron no evaluables por falta de información de la propia ficha (contrato con el cliente B; registro de robos), no por un problema de la corrida.
