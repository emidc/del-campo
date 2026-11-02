// AM-10b (AV-01, AV-12): datos de tarjeta y bancarios escritos por un cliente en cualquier formato, de punta a punta:
// teléfono del cliente → ficha → «Extraer contexto» → vista previa y portapapeles, salida MCP simulada, registro y resúmenes.
// También lo contrario: teléfonos, DNI, CUIT, fechas y números de póliza NO se toman como datos bancarios.
const { iniciar, ok, informe } = require('./lib');
const CASOS = [ // [texto, datos bancarios que contiene, cadenas que no deben salir]
  ['Les dejo la tarjeta nueva 4539.1488.0343.6467 vto 0829 para el débito', 2, ['4539.1488.0343.6467', '0829']],
  ['Otra: 4539/1488/0343/6467', 1, ['4539/1488/0343/6467']],
  ['La de mi señora 4539  1488  0343  6467', 1, ['4539  1488  0343  6467']],
  ['amex 3714 496353 98431, vto. 08/29 y cvv 123', 3, ['3714 496353 98431', '08/29', 'cvv 123']],
  ['Pago con 5555_5555_5555_4444 y CBU 0170 0999 2000 0012 3456 78', 2, ['5555_5555_5555_4444', '0170 0999 2000 0012 3456 78']],
  ['La otra vence 08/29, exp 07/28 y el codigo 123', 3, ['08/29', '07/28', 'codigo 123']],
];
const NO_BANCARIO = 'Mi cel es +54 9 261 555-0101, DNI 28.441.902, CUIT 20-28441902-3, póliza ALT-AU-551203 y 0001234567890123, vence 30/11/2026';
const digitos = s => s.replace(/\D/g, '');
(async () => {
  const T = await iniciar({ ctx: { permissions: ['clipboard-read', 'clipboard-write'] } }); const P = T.page;
  await T.perfil('man'); await T.ir('#/inicio');
  await P.evaluate(() => { UI_HANDLERS.panel({ p: 'telefono' }); render(); });
  for (const txt of [...CASOS.map(c => c[0]), NO_BANCARIO]) {
    await P.selectOption('#tel-de', 'p01'); await P.waitForTimeout(20);
    await P.fill('#tel-txt', txt); await P.locator('[data-telefono] button[type=submit]').click(); await P.waitForTimeout(60);
  }
  const d0 = await T.estado();
  ok('BANC.llegan', 'Los seis mensajes llegaron a la conversación de Martín Sosa', CASOS.every(c => d0.conversaciones.some(x => x.persona === 'p01' && x.mensajes.some(m => m.texto === c[0]))));
  await P.evaluate(() => { UI_HANDLERS.cerrarPanel(); render(); });
  await T.ir('#/persona/p01/comunicacion'); await T.boton('Extraer contexto');
  for (const cb of await P.locator('[data-ext-mensajes] input[data-uichange="extMsg"]').all()) { if (!(await cb.isChecked())) { await cb.check(); await P.waitForTimeout(10); } }
  const prev = await T.texto('[data-extraer-prev]');
  const lista = await T.texto('[data-ext-mensajes]');
  await T.boton('Copiar texto', '[data-modal]'); await P.waitForTimeout(150);
  const clip = await P.evaluate(() => navigator.clipboard.readText());
  const esperados = 3 + CASOS.reduce((a, c) => a + c[1], 0);
  CASOS.forEach((c, i) => ok(`AM-10b.formato-${i + 1}`, `Formato «${c[0].slice(0, 40)}…»: nada llega a la vista previa ni al portapapeles`, c[2].every(s => !prev.includes(s) && !clip.includes(s)) && !digitos(clip).includes(digitos(c[2][0])), c[2].filter(s => clip.includes(s)).join(', ')));
  // Independiente del prototipo: ninguna ventana de 13 a 19 dígitos consecutivos (ignorando separadores) que pase Luhn y empiece con 3–6.
  const luhn = n => { let s = 0; for (let i = 0; i < n.length; i++) { let x = +n[n.length - 1 - i]; if (i % 2) { x *= 2; if (x > 9) x -= 9; } s += x; } return s % 10 === 0; };
  const tarjetas = clip.split(/[^\d .\/_-]+/).map(digitos).flatMap(x => { const r = []; for (let a = 0; a < x.length; a++) for (let l = 13; l <= 19 && a + l <= x.length; l++) { const w = x.substr(a, l); if (/^[3-6]/.test(w) && luhn(w)) r.push(w); } return r; });
  ok('AM-10b.luhn', 'Ningún número con forma de tarjeta (Luhn) en el portapapeles', !tarjetas.length, tarjetas.slice(0, 3).join(', '));
  ok('AM-10b.conteo', `El aviso cuenta todos los omitidos (${esperados})`, new RegExp(`Se omitieron ${esperados} datos bancarios`).test(await T.texto('[data-modal]')), (await T.texto('[data-omitidos]').catch(() => '')));
  ok('AM-10b.no-bancario', 'Teléfono, DNI, CUIT, póliza y fecha de vencimiento de póliza se conservan', ['+54 9 261 555-0101', '28.441.902', '20-28441902-3', 'ALT-AU-551203', '0001234567890123', '30/11/2026'].every(s => clip.includes(s)), ['+54 9 261 555-0101', '28.441.902', '20-28441902-3', 'ALT-AU-551203', '0001234567890123', '30/11/2026'].filter(s => !clip.includes(s)).join(', '));
  ok('AV-12.lista', 'La lista de mensajes del modal no muestra los números de tarjeta', !/4539.?1488/.test(lista));
  await P.evaluate(() => { UI.modal = null; render(); });
  // Salida MCP simulada (Gemini) y registro de eventos.
  await T.perfil('vic'); await P.evaluate(() => { UI_HANDLERS.panel({ p: 'gemini', cmd: 'buscar' }); render(); });
  await P.fill('#mcp-q', 'Martín Sosa'); await P.locator('[data-mcp] button').click(); await P.waitForTimeout(40);
  const sal = await T.texto('[data-salida-mcp]');
  ok('AM-10b.mcp-formatos', 'La salida MCP simulada no contiene ninguno de los formatos', CASOS.every(c => c[2].every(s => !sal.includes(s))) && !/4539|3714 4963|5555.5555/.test(sal));
  const d1 = await T.estado(); const js = JSON.stringify(d1.eventos);
  ok('AM-10b.registro-formatos', 'El registro de eventos no guarda ninguno de los formatos', !/4539.?1488|3714 496353|5555.5555|0170 0999/.test(js));
  // Resúmenes dentro de Broker OS.
  for (const p of ['man', 'vic']) { await T.perfil(p); await T.ir('#/inicio'); const t = await T.texto('main');
    ok(`AV-12.hoy-${p}`, `«Hoy» de ${p} no muestra números de tarjeta en los resúmenes`, !/4539.?1488|4539 1488|3714 496353/.test(t)); }
  // AV2-03: los resúmenes no cortan la marca a la mitad.
  { const cortes = []; for (const [p, r] of [['vic', '#/inicio'], ['man', '#/inicio'], ['man', '#/comunicacion/whatsapp'], ['man', '#/tarea/t07']]) { await T.perfil(p); await T.ir(r); const t = await T.texto('main'); if (/\[dato bancario omiti?d?o?(?!\])|\[dato banc(?!ario)|\[dat(?!o)/.test(t.replace(/\[dato bancario omitido\]/g, ''))) cortes.push(r); }
    ok('AV2-03.marca', 'Ningún resumen corta «[dato bancario omitido]» a la mitad', !cortes.length, cortes.join(', ')); }
  await T.perfil('man'); await T.ir('#/comunicacion/whatsapp'); const bandeja = await T.texto('main');
  ok('AV-12.bandeja', 'La bandeja de WhatsApp no muestra números de tarjeta', !/4539.?1488|5555.5555/.test(bandeja));
  ok('BANC.err', 'Sin errores de JavaScript', !T.errores.length, T.errores.slice(0, 3).join(' | '));
  await T.cerrar(); informe('bancarios');
})();
