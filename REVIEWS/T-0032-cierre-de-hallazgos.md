# T-0032: cierre de los hallazgos de la revisión ciega

Respuesta de quien implementó a `REVIEWS/T-0032-blind-review.md`, que revisó `58b7f8d`. Los
arreglos están en el commit «T-0032: atender la revisión ciega». No es una segunda revisión
ciega: la escribe quien implementó.

## Act on

- **1. La app se conectaba sin TLS. Arreglado.** `connect` pide `ssl: 'require'` a toda base
  que no está en `localhost` (`tlsPara`, `persistence/database.ts`); en local sigue sin TLS.
  Test: `database.test.ts` («pide TLS a toda base que no está en este equipo…»). La guía (§3)
  lo dice y admite además `?sslmode=require`.
- **2. La restauración fallaba en un proyecto nuevo. Arreglado.** `pg_restore` lleva
  `--no-privileges` y la guía explica por qué: los permisos de `risk_app` los vuelve a dar
  `rol-app.sql`, que corre después (§8).
- **3. El límite de login se salteaba en paralelo. Arreglado.** `iniciarSesion` cuenta,
  compara y registra el fallido en una transacción con un lock por usuario
  (`pg_advisory_xact_lock` sobre la huella, `bloquearIntentos`): los intentos de un mismo
  usuario esperan su turno. Test: `acceso.integration.test.ts` («los intentos en paralelo…»),
  sobre una base propia (`conBaseTemporal`), 30 intentos simultáneos dejan exactamente 10
  fallidos. Sin el lock, el mismo test da 14.
- **4. `db:verificar` no veía la membresía al dueño. Arreglado.** El punto del dueño usa
  `pg_has_role(…, 'member')` y hay un punto nuevo, «no es miembro de ningún otro rol».
  `rol-app.sql` revoca toda membresía de `risk_app`. Test: `rol-app.integration.test.ts`
  («verificar marca un rol de la app miembro del dueño…»). `SET ROLE` no se puede probar
  desde los tests porque mira la membresía de quien abrió la sesión, que es el superusuario
  local; el test prueba lo que dice el catálogo, que es lo que lee `verificar`.
- **5. Los disparadores comparaban con el ranking de hoy. Arreglado.** Comparan el orden
  previo con el ranking calculado con lo registrado hasta ese orden (evaluaciones y sus
  revisiones de ese momento), y el informe lo dice. Test: `aceptacion.integration.test.ts`
  («los disparadores comparan con el ranking de cuando R1 registró su orden…»): una
  reevaluación aceptada después cambia el primero de H1 y los disparadores no cambian; A8b
  de H1 deja de cumplir, porque R1 no revisó la evaluación nueva. Con el ranking de hoy, el
  test falla.
- **6. A8a cumplía sin bandas. Arreglado.** Cumple sólo si cada posición del orden previo
  tiene su banda («su orden profesional y sus bandas»). El informe dice cuántas posiciones
  tienen banda y la guía (§9) le pide al revisor una en cada una. El ensayo da banda a todas.

## Consider

- **7. Los POST sin credencial. Arreglado.** La guía (§4) los prueba con el `Origin` del
  despliegue, para que el 401 sea por la sesión: `orden-previo`, `reordenar`, `actualizar` y
  `logout`.
- **8. El manifiesto repetía la clave. Arreglado.** Un código de persona que no tiene la
  forma se informa como `personas (un código que no es R1, O1, …)`, sin la clave. El test
  ahora comprueba que el nombre no sale.
- **9. `db:down --hosteada` sin confirmación. Arreglado.** Contra la hosteada pide además
  `--borra-datos`, y sin eso se niega y manda a hacer la copia (§8). `--borra-datos` en
  cualquier otro comando se rechaza.
- **10. Personas en la base sintética de Preview. Arreglado.** Una línea en §3.
- **11. `login_fallido` crece sin tope.** Queda como está: el owner decidió el 2026-10-17 que
  la tabla queda insert-only durante Q4, aceptando ese riesgo (acta, decisión 4). Con 10 filas por usuario y
  ventana, un barrido de usuarios inventados crece despacio frente al espacio del plan Free, y un tope global dejaría que cualquiera bloquee a todos. La huella sin sal de un
  texto tipeado en el campo de usuario no es explotable con contraseñas de 20 caracteres al
  azar.

## Después, por decisión del owner (2026-10-17)

- **A8a exige el orden previo completo.** Además de una banda en cada posición, no cumple si
  un riesgo o padre registrado hasta el orden previo quedó sin posición, y el informe dice
  cuántos. Test: `aceptacion.integration.test.ts` («lo que falta en el manifiesto o en la
  base no cumple…»): un orden sin un riesgo y otro con una posición sin banda no cumplen; sin
  la regla, el test falla.
