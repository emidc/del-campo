// Datos de tarjeta y bancarios, para probar que no llegan a la auditoría (T-0035, AM-10b).
//
// Los formatos son los de `docs/north-star/prototipo/pruebas/bancarios.js`: un cliente los
// escribe como quiere, y lo que se prueba es que ninguno quede en `audit_event` ni en
// `evento_auditoria`. Los números son de prueba (no son de nadie). Sólo lo usan los tests.

/** Lo que un cliente escribe, en cada formato del prototipo. */
export const FORMATOS_BANCARIOS: readonly string[] = [
  '4539.1488.0343.6467',
  '4539/1488/0343/6467',
  '4539  1488  0343  6467',
  '3714 496353 98431',
  '5555_5555_5555_4444',
  'CBU 0170 0999 2000 0012 3456 78',
  'cvv 123',
  'codigo 123',
]

/** Un texto libre que los contiene todos, como el que se carga en una novedad o una respuesta. */
export const TEXTO_CON_DATOS_BANCARIOS = `Les dejo la tarjeta ${FORMATOS_BANCARIOS.join(', ')} vto 08/29`

const luhn = (n: string): boolean => {
  let s = 0
  for (let i = 0; i < n.length; i++) {
    let x = Number(n[n.length - 1 - i])
    if (i % 2 === 1) {
      x *= 2
      if (x > 9) x -= 9
    }
    s += x
  }
  return s % 10 === 0
}

/**
 * Lo que tiene forma de dato bancario en `texto`, independiente del formato: los formatos
 * conocidos tal cual, toda ventana de 13 a 19 dígitos (ignorando separadores) que empiece
 * con 3–6 y pase Luhn, como el prototipo, y todo CBU (22 dígitos seguidos o separados).
 */
export const datosBancariosEn = (texto: string): string[] => {
  const literales = FORMATOS_BANCARIOS.filter((f) => texto.includes(f))
  const tramos = texto.split(/[^\d ./_-]+/).map((t) => t.replace(/\D/g, ''))
  const tarjetas = tramos.flatMap((x) => {
    const r: string[] = []
    for (let a = 0; a < x.length; a++) {
      for (let l = 13; l <= 19 && a + l <= x.length; l++) {
        const w = x.slice(a, a + l)
        if (/^[3-6]/.test(w) && luhn(w)) r.push(w)
      }
    }
    return r
  })
  const cbus = tramos.filter((x) => x.length >= 22)
  return [...literales, ...tarjetas, ...cbus]
}
