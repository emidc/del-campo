# ADR-0073 — Communication OS atiende clientes reales como piloto supervisado, después de C1

- **Id en `decisions.yaml`:** D-0073
- **Estado:** PROVISIONAL
- **Fecha:** 2026-11-02
- **Supersede:** — (amplía el alcance de CO01, `SLICES/CO01.md` §3)
- **Aprobación:** el owner, el 2026-11-02, «Decisiones de cierre Q4 — Del Campo OS», punto
  2 (U1), en el hilo de T-0034. Sin fecha de inicio.

## Contexto

CO01 se aceptó para una prueba con dos personas del equipo, contenido inventado y ningún
cliente (`SLICES/CO01.md` §3). `PROJECT.md` §4 excluye conversaciones con clientes sin una
autorización propia (R-19), y D-0066 protege la UI con una credencial compartida pensada
para esa prueba.

En el relevamiento de la north star (fase 1, pregunta U1) el owner respondió que el número
«ya recibe los mensajes en Communication OS», es decir, de clientes. Volumen y fecha de
inicio no se verificaron. Ese uso no tenía decisión registrada.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, D-0073.

## Cómo se aplica

**Condiciones de entrada, en este orden.**

1. C1 en servicio para Communication OS: acceso individual con roles (D-0072). La
   credencial compartida deja de existir.
2. Verificar cuánto tiempo se conserva hoy el texto de los mensajes. D-0065 obliga a
   guardar una copia porque la Cloud API no permite releer, y no fija su plazo.
3. Definir y documentar la política de retención y eliminación de esa copia, separando
   los mensajes operativos de lo que se incorpora formalmente al expediente comercial.
4. Verificar los controles de acceso y seguridad del despliegue.
5. Confirmar la fecha efectiva de incorporación de los primeros clientes.

**Durante el piloto.**

- Los operadores reciben, identifican al cliente, vinculan la conversación cuando
  corresponde (C11, por `ContactPoint`, nunca de forma arbitraria: D-0003) y registran lo
  relevante.
- La IA puede preparar y clasificar respuestas, con la información que permite D-0074, y
  una persona decide qué se envía. Toda comunicación con un cliente es una acción de
  negocio con efecto externo (R-13, R-14).
- Ninguna decisión automática sobre coberturas, aceptación de riesgos, siniestros ni
  compromisos contractuales.
- El payload crudo se sigue borrando a los 30 días (D-0065).

## Pendiente de verificación

- **Qué pasa hoy con los clientes que ya escriben.** La autorización rige después de C1.
  Mientras tanto, según la respuesta U1, el número ya recibe mensajes de clientes sobre la
  credencial compartida de D-0066, que se decidió para otra cosa. Esta decisión no dice si
  ese uso sigue en la transición o se pausa hasta C1. Lo decide el owner aparte, y la
  respuesta se agrega acá.
- Los cuatro pendientes de la lista de entrada (2 a 5).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Autorizar ya, sobre la credencial compartida | Sin identidad individual no hay trazabilidad de quién respondió a cada cliente; D-0066 lo acepta sólo para dos personas y contenido inventado. |
| Volver al alcance aceptado de CO01 para siempre | El owner quiere atender clientes por este canal; C11 de la north star lo necesita. |
| Respuestas automáticas con IA | Fuera de alcance: la IA prepara, una persona decide (DA-5). |

## Consecuencias

**Más fácil:** C11 tiene un alcance autorizado y un orden de entrada claro.

**Más difícil:** el piloto depende de C1, que depende del spike `T-0002`. La política de
retención es trabajo nuevo antes de sumar clientes.

## Criterio de falsación

Ver `falsified_by` en `decisions.yaml`.
