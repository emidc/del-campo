import { partirEnlaces } from './enlaces'

/** Texto libre con las URL pegadas convertidas en links que abren en otra pestaña. */
export function TextoConEnlaces({ texto }: { readonly texto: string }) {
  return (
    <>
      {partirEnlaces(texto).map((t, i) =>
        t.tipo === 'texto' ? (
          t.texto
        ) : (
          <a key={i} href={t.href} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: 'anywhere' }}>
            {t.texto}
          </a>
        ),
      )}
    </>
  )
}
