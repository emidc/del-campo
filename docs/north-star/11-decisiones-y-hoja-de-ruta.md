# Decisiones de cierre de Q4 y hoja de ruta ajustada

Registro de `T-0034` (EMI-47). El owner tomó las decisiones el 02/11/2026 en «Decisiones
de cierre Q4 — Del Campo OS». La fuente de verdad es `decisions.yaml`; este documento
cruza esas decisiones con el [plan de paso a producción](09-plan-de-produccion.md). La
sección 3 es una **propuesta** de etapas: no autoriza implementar, contratar servicios,
migrar bases ni cambiar permisos de producción.

## 1. Qué quedó decidido y qué falta verificar

| Punto del plan | Decisión | Estado | Pendiente de verificación |
|---|---|---|---|
| Cierre de Q4: D-0063 y D-0067 | `D-0071`: contextos separados; Broker OS lee a Risk y Communication por su API de aplicación; organización evaluada ↔ empresa vinculada a mano, con el id de la empresa como referencia opaca. D-0063 y D-0067 pasan a ACCEPTED | ACCEPTED | Si una empresa puede tener más de una organización evaluada (se recomienda que no); desde qué pantalla se registra la vinculación (`T-0036`) |
| D-0066 y D-0069: acceso | `D-0072`: Google con cualquier cuenta, sólo por invitación; roles Administrador, Operador Del Campo y Revisor profesional; revocación inmediata; se prioriza Supabase Auth | ACCEPTED; reemplaza a D-0066, D-0069 y partes de D-0059 al entrar C1 | ADR de Supabase Auth frente a D-0013 y D-0060 (`T-0035`, R-05); dónde se hacen cumplir los permisos (D-0022, `T-0002`); asignación de empresas (D-0027) |
| U1: clientes en Communication OS | `D-0073`: piloto supervisado con clientes reales después de C1 y de los controles mínimos; IA prepara, una persona decide | PROVISIONAL, sin fecha de inicio; transición controlada hasta C1 | Rotación de la credencial compartida por el owner; retención actual del texto; política de retención; controles de acceso; fecha de inicio |
| R-19: LLM externos | `D-0074`: tres niveles de información; la confidencial sólo por cuentas registradas | ACCEPTED | Registrar las cuentas que usa el equipo (proveedor, plan, condiciones, modelos); ninguna registrada al 02/11 |
| MCP y skills | `D-0075`: servidor MCP propio, primero de lectura; tres skills de metodología primero | ACCEPTED como dirección | Dónde viven las skills; qué interfaces admiten skills y MCP propios |
| D-0062 y D-0068: planes pagos | `D-0076`: tope de USD 45 por mes para los tres contextos, impuestos incluidos; nada se contrata sin una configuración aprobada; Risk OS no se migra por defecto | ACCEPTED | Configuración concreta dentro del tope (`T-0037`); impuestos y costos por proyecto, no verificados |

Siguen abiertas, fuera de `T-0034`: D-0022 (spike `T-0002`), D-0025 (antes de C9), AD-11
a AD-17, el puntaje del panel, el correo y el resto de `PROJECT.md` §4.

## 2. Qué cambia en el plan

| Corte o tarea | Antes | Ahora |
|---|---|---|
| C1 · `T-0035` | Login con Google corporativo; revisar D-0066 y D-0069 | Google con cualquier cuenta invitada, tres roles, permisos por empresa, revocación inmediata; ADR de Supabase Auth antes de implementar (D-0072) |
| C2 · `T-0036` | Esperaba la decisión de cierre de Q4 | Regla fijada (D-0071); falta confirmar si una empresa admite varias organizaciones evaluadas |
| C3 · `T-0037` | Refresco de datos y paso a planes pagos | Refresco de datos y una configuración de infraestructura dentro de USD 45 que el owner aprueba antes de contratar (D-0076) |
| C4 | Dependía de la decisión de cierre de Q4 | Habilitado: Broker OS lee Risk OS por API (D-0071); el lint de R-25 se ajusta en el corte |
| C7 | Dependía de R-19 | Depende de las skills validadas y de las cuentas registradas para nivel 2 (D-0074, D-0075) |
| C11 | Dependía de U1 | Depende de C1 y de las condiciones de entrada de D-0073 |
| C13 | Servidor MCP en la etapa 4 | Dirección confirmada; sólo lectura primero, no obligatorio para la primera versión; puede adelantarse si aporta valor (D-0075) |
| Riesgo «CO01 opera con clientes sobre credencial compartida» | Mitigación: decisión U1 en la etapa 0 | Decidido (D-0073): transición controlada hasta C1, con la credencial rotada y sin clientes nuevos |

## 3. Propuesta de etapas, dependencias y prioridades

Respeta el límite de dos tareas ACTIVE y un spike de `PROJECT.md` §5. Las fechas son
estimadas.

**Etapa 0 · Cerrar y decidir (noviembre).**

1. Aceptar RO01 (`T-0032`, prevista el 25/11). Sigue primera.
2. Transición controlada de Communication OS (D-0073): el owner rota la credencial
   compartida y no se suman clientes nuevos al canal hasta C1.
3. Tarea nueva propuesta: verificar la retención actual de Communication OS y escribir la
   política de retención (pendientes 2 y 3 de D-0073). No toca producción hasta que el
   owner apruebe la política.
4. Registrar las cuentas de IA que usa el equipo (D-0074), para que la información de nivel
   2 tenga un camino autorizado.

**Etapa 1 · Fundación (diciembre).** Sin cambios en la compuerta.

1. Spike `T-0002` (D-0022). Bloquea C1.
2. C1 (`T-0035`): primero el ADR de autenticación, después Risk OS y Communication OS, y
   VS01 al final porque ya tiene identidad individual.
3. C2 (`T-0036`) y C3 (`T-0037`), en paralelo con C1 si el límite de WIP lo permite. C3
   presenta la configuración de infraestructura antes de contratar.

**En paralelo, sin código: skills (D-0075).** Definir la skill 1 y validarla contra el
proceso manual con una empresa. Es trabajo del owner y del equipo con su interfaz de IA;
no consume tareas ACTIVE del repositorio salvo que se escriba como tarea.

**Etapas 2 a 4.** Sin cambios de orden. C11 entra cuando se cumplan las condiciones de
D-0073; el MCP de lectura (C13) puede adelantarse después de C1 y C4 si las skills
muestran que el copiar y pegar es el cuello de botella.
