// El paquete de dominio existe, y está vacío a propósito.
//
// T-0010 levanta el arnés; las entidades las crea T-0012 a partir de `DOMAIN.md`.
// Lo único que este archivo aporta hoy es la frontera: `packages/domain` no importa
// nada, y eso lo hace cumplir `eslint.config.js` sobre este directorio, no un
// comentario. Un paquete que nace con una entidad de ejemplo nace con una decisión de
// modelado tomada de costado. → R-25, R-32
export {}
