// Humo: cada perfil recorre todas las rutas; no debe haber errores de JavaScript.
const { iniciar, ok, informe } = require('./lib');
const { RUTAS, PORTAL } = require('./rutas');
(async () => {
  for (const movil of [false, true]) {
    const T = await iniciar({ movil });
    for (const p of ['man', 'eva', 'vic', 'luc', 'jim', 'pil', 'mat', 'emi', 'r1', 'pcl', 'pqa']) {
      await T.perfil(p);
      for (const r of (['pcl', 'pqa'].includes(p) ? PORTAL : RUTAS)) {
        const antes = T.errores.length; await T.ir(r);
        const txt = await T.texto();
        ok(`humo-${p}-${r}-${movil ? 'm' : 'e'}`, `${p} abre ${r}`, T.errores.length === antes && txt.length > 50, T.errores.slice(antes).join(' | ').slice(0, 300));
      }
      for (const pn of ['gemini', 'telefono', 'correo']) { if (['pcl', 'pqa', 'r1'].includes(p)) continue; const antes = T.errores.length; await T.page.evaluate(pn => { UI_HANDLERS.panel({ p: pn }); render(); }, pn); ok(`humo-${p}-panel-${pn}`, `${p} abre panel ${pn}`, T.errores.length === antes, T.errores.slice(antes).join(' | ')); }
      await T.page.evaluate(() => { UI_HANDLERS.cerrarPanel(); render(); });
    }
    await T.cerrar();
  }
  informe('humo');
})();
