# ADR-0059 — Cómo se implementa la sesión y la admisión de VS01

- **Id en `decisions.yaml`:** D-0059
- **Fecha:** 2026-09-23
- **Supersede:** —

## Contexto

D-0059 fijó la regla: token válido, email verificado, pertenencia al Workspace y
presencia en una lista explícita de cuentas, con la identidad asociada por el `sub` de
Google, verificado en servidor tanto en páginas como en consultas de datos. Este ADR
registra **cómo** T-0018 la implementa y, sobre todo, la única tensión de lectura que
la regla deja abierta, para no resolverla en silencio (R-03).

### La tensión: la lista es de cuentas, la identidad es el `sub`

D-0059 dice dos cosas que hay que conciliar:

- la admisión exige *"presencia en una lista explícita de cuentas corporativas que
  provee el owner antes del piloto"* — y lo que el owner puede escribir es una lista de
  direcciones de correo, no de identificadores opacos de Google;
- *"la identidad se asocia por el identificador estable de Google (`sub`), no por el
  email"* — porque un email puede reasignarse a otra persona y el `sub` no.

T-0018 las concilia así:

1. La **admisión** se evalúa contra el email verificado del ID token. Es el único dato
   que el owner puede administrar.
2. La **identidad** de la sesión es el `sub`. Es lo que la cookie transporta como
   principal y lo que se registraría en cualquier auditoría posterior.
3. La lista admite, opcionalmente, **fijar el `sub`** de una cuenta con la forma
   `persona@dominio=<sub>`. Cuando una entrada lo trae, la admisión exige además que el
   `sub` del token coincida: es la defensa contra la reasignación de una dirección.
   Mientras el owner no fije ninguno, la propiedad no está garantizada y eso queda
   declarado en `ops/evidence/T-0018.md`, bajo "Qué NO se verificó".
4. La admisión **se reevalúa en cada request** contra la lista vigente, no sólo en el
   login. Sacar una cuenta de la lista corta su acceso sin esperar a que expire la
   cookie.

### Pertenencia al Workspace

Se exige que el ID token traiga `hd` igual al dominio configurado. El `hd` lo emite
Google sólo para cuentas de un Workspace, y `SLICES/VS01.md` §5 advierte explícitamente
que *"un sufijo de email por sí solo"* no es prueba de identidad: por eso se compara el
claim `hd`, no el texto después de la arroba del email. Una cuenta `gmail.com` no trae
`hd` y queda fuera por esa vía, no por una heurística sobre el string.

### Dónde se hace cumplir

Deny-by-default estructural: todos los casos de uso de `packages/api/src/vs01/` reciben
un `Principal` como primer parámetro, y el `Principal` sólo se puede construir dentro de
`packages/api/src/session/guard.ts`, después de una admisión exitosa. Una consulta de
datos sin sesión no es un camino que el código deje abierto y el guard cierra: es un
programa que no tipa. Los route handlers y las páginas llaman al mismo guard, de modo
que la superficie de datos y la superficie de páginas no pueden divergir.

Las respuestas negativas son **indistinguibles entre sí en el cuerpo**: `401` sin
sesión válida, `403` con sesión válida pero no admitida, y cuerpo vacío en ambos casos.
Una respuesta que dijera "esa póliza no existe" frente a "no tenés acceso" filtraría la
existencia de la póliza a quien no está admitido.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0059. La biblioteca elegida
para implementarla se decide por separado en D-0060, como exige R-05.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Admitir por sufijo de dominio del email (`@dominio`) sin lista | `SLICES/VS01.md` §5 lo prohíbe de forma explícita, y D-0059 dice que los integrantes no se infieren. Sería dar acceso a toda alta futura del Workspace sin que nadie la autorice. |
| Consultar la Directory API de Google para verificar pertenencia | Exige delegación de dominio o cuenta de servicio, que D-0057 y D-0059 descartan para VS01, y ampliaría los scopes más allá de identidad. El claim `hd` alcanza para lo que se necesita. |
| Guardar la lista en Git | D-0059 la pone en configuración. Una lista de cuentas corporativas en el repositorio es un dato de personas que no necesita versionarse y que obligaría a un commit por cada alta o baja. |
| Sesión en base de datos en vez de cookie | Exigiría escrituras, y `## Data effects` de T-0018 dice que la app **lee** la base preparada. Una cookie cifrada y de vida corta no necesita estado del lado del servidor. Si más adelante hace falta revocar sesiones individuales, se reevalúa. |
| Persistir un `User` de dominio en el primer login | `DOMAIN.md` §53 define el User mínimo, pero crearlo sería una escritura de dominio que T-0018 declara fuera de alcance, y D-0022 (punto de enforcement de autorización) sigue abierta. Resolverlo acá sería decidir D-0022 por implicación. |

## Consecuencias

**Más fácil.** La regla de admisión es una función pura sobre claims: se prueba sin red,
sin base y sin navegador, que es lo que permite que las pruebas negativas de D-0059
sean baratas y por lo tanto existan. El owner administra el acceso cambiando una
variable de entorno, sin desplegar código.

**Más difícil.** La revocación no es inmediata para una cookie ya emitida si el cambio
de lista no llega al despliegue; el TTL corto de la cookie acota la ventana pero no la
elimina. Y la app queda con un segundo lugar donde vive información sensible —la lista
de cuentas— que no está en Git y por lo tanto no está versionada: si se pierde, hay que
volver a pedírsela al owner.

**Costo de revertir:** acotado a `packages/api/src/session/`. El resto de la app depende
del tipo `Principal`, no de cómo se obtuvo.
