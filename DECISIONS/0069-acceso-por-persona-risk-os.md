# ADR-0069 — La UI de Risk OS v1 usa una credencial por persona, con autenticación propia

- **Id en `decisions.yaml`:** D-0069
- **Estado:** PROVISIONAL
- **Fecha:** 2026-10-15
- **Supersede:** —

## Contexto

`SLICES/RO01.md` (§2, Acceso; §7) pide que nada de Risk OS se vea ni se escriba sin
autenticarse, que cada persona tenga su propia credencial y que la identidad de quien
evalúa, revisa o acepta salga de la sesión. La decisión 2 del owner
(`SLICES/RO01-decisiones.md`) fija "autenticación mínima propia; no se incorpora OIDC
todavía". Es un cambio en autenticación, así que R-05 exige un ADR antes de
implementarlo; RO01 §7 deja este ADR a T-0030.

Hechos que restringen la elección:

1. **Identidad individual, no compartida.** A diferencia de CO01 (D-0066), cada
   revisión humana, cierre de revisión, reordenamiento y orden previo de Risk OS tiene
   un autor que es una persona de `risk.persona` (T-0028, decisión 2 del owner). Una
   credencial compartida no lo permite.
2. **El registro de accesos es evidencia de aceptación.** A8a compara la fecha del orden
   previo del revisor con su primer acceso a ranking, bandas o `C_raw` de cada empresa
   (decisión 6 del owner). La sesión tiene que decir quién es la persona en cada
   request, y el registro (`risk.registro_acceso`, T-0028) se escribe con esa persona.
3. **D-0063.** Risk OS no importa código de `apps/web` (login de VS01, D-0059) ni de
   `apps/communication` (D-0066), ni comparte credenciales con ellos.
4. **Usuarios:** el owner y un revisor profesional (RO01 §6). Sin clientes, sin usuarios
   externos, sin roles: todas las personas con acceso pueden todo (RO01 §8).
5. **Sin dependencias nuevas** (T-0030, `## Outcome`): sólo `node:crypto`.
6. **El esquema `risk` es sólo de inserción** (R-22, R-23): una credencial no se
   actualiza ni se borra; se reemplaza con una fila nueva.

## Decisión

**Dónde vive la credencial.** En el esquema `risk`, no en variables del despliegue: con
más de una persona, una variable por persona obligaría a redeplegar para dar o quitar
un acceso, y la identidad tiene que ser la misma `risk.persona` que firma lo que se
escribe. Dos tablas nuevas (migración `0003`):

- `risk.usuario`: el nombre con que una persona entra, uno por persona y único.
- `risk.credencial`: una fila por alta, rotación o baja de la contraseña de una
  persona. La vigente es la última; una baja es una fila sin hash. Rotar o dar de baja
  invalida las sesiones abiertas con la credencial anterior.

La contraseña se guarda sólo como hash `scrypt:N:r:p:<sal>:<hash>` (el formato de
D-0066, con `N = 2^15`, `r = 8`, `p = 1`, sal de 16 bytes y clave de 32), y se
rechaza si tiene menos de 20 caracteres. Nunca está en el repositorio (R-18): la genera
y la carga el owner con la línea de comandos del contexto
(`pnpm --filter @del-campo/risk run persona …`), que la lee de la entrada estándar y no
de un argumento. Contra la base hosteada, la carga la ejecuta el owner en T-0032
(R-13, R-16).

**Cómo se entra.** Un formulario (`usuario`, `contraseña`) que se valida en el servidor.
La comparación es en tiempo constante: si el usuario no existe o está dado de baja, se
calcula igual el scrypt contra un hash fijo, para que la demora no diga cuál de los dos
estaba mal. Si es válida, se registra un `inicio_sesion` de esa persona y se emite una
cookie de sesión firmada con HMAC-SHA256:
`v1.<persona_id>.<credencial>.<vence>.<firma>`, `HttpOnly`, `SameSite=Strict`, `Secure`
salvo en `localhost`, por ocho horas. El secreto de la firma es una variable del
despliegue (`RISK_UI_SESSION_SECRET`, al menos 32 caracteres).

**Cada request.** Se verifica la firma y el vencimiento, y después, en la base, que esa
credencial siga siendo la vigente de la persona. La persona de la sesión es la única
identidad que el código de la app pasa al contexto: ninguna pantalla pide un nombre de
autor. Un POST, además, tiene que venir del mismo origen.

**Sin configuración, nada.** Sin el secreto de sesión o sin la base, cada página y cada
endpoint niegan, sin datos. No hay modo abierto.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Credencial compartida, como D-0066 | No da identidad individual: el autor de una revisión o de un orden previo sería un nombre escrito a mano, que es lo que la decisión 2 del owner descarta. |
| Una variable de entorno por persona | Dar o quitar un acceso exigiría redeplegar, y la identidad viviría en dos lugares (la variable y `risk.persona`). |
| Login de VS01 (Google, D-0059) u OIDC | La decisión 2 del owner lo deja fuera de v1, y D-0063 prohíbe importar `apps/web`. |
| Sesiones guardadas en la base | Una fila por request en un esquema sólo de inserción, sin ganar nada sobre la cookie firmada más la comprobación de la credencial vigente. |
| Basic Auth | Calcularía scrypt en cada request y no tiene forma de cerrar sesión. |

## Consecuencias

**Más fácil:** cero dependencias y cero proveedores; el autor de cada escritura y de
cada acceso es una persona de la base, y el registro de accesos de A8 sale solo.

**Más difícil:**

- **No hay límite de intentos.** El costo de scrypt frena un ataque por fuerza bruta,
  pero no lo impide; con dos usuarios y contraseñas de 20 caracteres o más generadas al
  azar se acepta. Si el despliegue muestra intentos repetidos, se agrega un límite.
- **Cerrar sesión borra la cookie, no la invalida.** Una cookie robada vale hasta que
  vence o hasta que se rota la credencial de esa persona.
- **Cada request consulta la base** para comprobar la credencial vigente.
- **El rol con que corre la app escribe en `risk`.** Ya lo necesitaba T-0031; T-0032
  decide el rol (`contexts/risk/README.md`, "Pendiente para otras tareas").

**Costo de revertir:** bajo. Si Risk OS se integra en Broker OS, se reemplaza por el
login de VS01 y las personas de `risk.persona` se enlazan a sus cuentas.

## Criterio de falsación

Ver `falsified_by` en `decisions.yaml`.
