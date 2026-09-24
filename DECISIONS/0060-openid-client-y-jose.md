# ADR-0060 — `openid-client` y `jose` para el OIDC y la sesión de VS01

- **Id en `decisions.yaml`:** D-0060
- **Fecha:** 2026-09-24
- **Supersede:** —

## Contexto

D-0059 exige *"una biblioteca mantenida para autenticación y sesiones, elegida con su
ADR según R-05"*, y no la nombra. Esta decisión la nombra.

Lo que la biblioteca tiene que permitir hacer, porque D-0059 lo exige y porque el
contrato de T-0018 lo lista como verificación:

- validar el ID token de Google —firma, `iss`, `aud`, `exp`, `nonce`— de forma que el
  resultado sea un objeto de claims inspeccionable;
- decidir la admisión **fuera** de la biblioteca, con una función propia y probada
  sobre `email_verified`, `hd` y la lista del owner;
- transportar la sesión de modo que una cookie adulterada o expirada falle de forma
  observable en un test;
- no arrastrar Supabase Auth ni ningún almacenamiento propio (D-0013).

Paquetes que adopta T-0018 bajo esta decisión:

| Paquete | Versión | Rol |
| --- | --- | --- |
| `openid-client` | `^6.8.8` | discovery, PKCE, canje del código y validación del ID token |
| `jose` | `^6.2.12` | cookie de sesión como JWE (`dir` + `A256GCM`) |

Son dos paquetes y un solo ADR porque son una sola decisión —cómo se obtiene y cómo se
transporta la identidad—, del mismo autor y del mismo ecosistema. Precedente en el
repositorio: D-0047 cubre TypeScript, ESLint y el runner de Node en una sola decisión.

## Referencia canónica

La decisión y su estado viven en `decisions.yaml`, bajo D-0060. La regla que implementa
es D-0059; el framework que la hospeda, D-0058.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| **Auth.js / NextAuth v5** | Es la opción por defecto en el ecosistema Next.js, y por eso hay que decir por qué no: su versión 5 sigue publicándose como beta, y su modelo de callbacks mete la decisión de admisión dentro de la biblioteca (`signIn`, `jwt`, `session`), que es justo lo que D-0059 manda mantener explícito y probado. Adoptarlo cambiaría el sujeto de las pruebas negativas: en vez de probar nuestra regla, probaríamos que configuramos bien la de otro. Mismo criterio con el que D-0049 eligió un driver delgado sobre un ORM. |
| Implementar OIDC a mano (`fetch` al endpoint de tokens + verificación de JWT) | R-05 no prohíbe dependencias, prohíbe adoptarlas sin registrarlas. Escribir a mano PKCE, discovery, validación de `nonce` y rotación de JWKS es reimplementar una especificación con modos de falla silenciosos en el camino de autenticación — el peor lugar del sistema para un bug propio. |
| `passport` con `passport-google-oauth20` | Diseñado para el middleware de Express; en el App Router habría que adaptarlo. Y `oauth20` trata el login como una autorización OAuth genérica en vez de como OIDC, dejando la validación del ID token del lado de quien lo usa. |
| Sólo `jose`, sin `openid-client` | Cubriría la verificación del ID token pero no discovery, PKCE ni el canje del código: quedaría media integración escrita a mano, que es la alternativa anterior con otro nombre. |
| Sólo `openid-client`, con cookie firmada a mano | La cookie llevaría `sub` y email en claro. Cifrarla con `jose` cuesta una dependencia sin dependencias transitivas, del mismo autor y ya presente en el árbol como dependencia de `openid-client`. |

`openid-client` está certificado por la OpenID Foundation como Relying Party y es el
cliente de referencia en Node; `jose` no tiene dependencias y es la implementación de
JOSE más usada del ecosistema. Ambos los mantiene el mismo autor (Filip Skokan), lo que
es a la vez su mejor y su peor propiedad: coherencia de API, y un único punto de
mantenimiento. Queda anotado como el riesgo conocido de esta elección.

## Consecuencias

**Más fácil.** La regla de admisión de D-0059 queda como código propio, en una función
pura, probada sin red ni base. La validación criptográfica queda en una biblioteca
certificada. Los dos lados quedan del lado correcto de la frontera.

**Más difícil.** Hay que escribir a mano lo que Auth.js daría hecho: las rutas de
`start`, `callback` y `logout`, la cookie de `state`/`nonce`/`verifier` y su limpieza.
Son unas cien líneas más que mantener, y son cien líneas en el camino de
autenticación.

**Costo de revertir:** acotado a `packages/api/src/session/`. Nada fuera de ese
directorio importa `openid-client` ni `jose`; el resto de la app depende del tipo
`Principal`. Migrar a Auth.js más adelante no tocaría ni las consultas ni las páginas.
