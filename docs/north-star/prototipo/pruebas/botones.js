// AM-27: «sin botones decorativos». En cada pantalla de los recorridos pulsa cada botón habilitado (sobre la semilla recién
// reiniciada) y exige un efecto observable: cambia la ruta, el estado (eventos), el contenido de la página, o el formulario
// muestra su validación. Con un modal abierto solo cuentan los botones del modal (lo demás queda tapado por el velo).
// Un botón que ya está en su estado actual (aria-current, aria-pressed) cuenta como pulsado sin exigir cambio. Los botones deshabilitados (aria-disabled) deben explicar el motivo (title o texto cercano).
const { iniciar, ok, informe } = require('./lib');
const PANTALLAS = [
  ['man', '#/inicio'], ['man', '#/inicio/equipo'], ['luc', '#/tarea/t01'], ['man', '#/clientes/personas'], ['vic', '#/clientes/nueva'],
  ['man', '#/persona/p01/resumen'], ['man', '#/persona/p01/comunicacion'], ['man', '#/empresa/e1/resumen'], ['man', '#/empresa/e1/riesgos/matriz'],
  ['man', '#/empresa/e1/riesgos/plan'], ['man', '#/empresa/e1/riesgos/transferencia'], ['man', '#/empresa/e1/riesgos/layout'], ['man', '#/empresa/e1/riesgos/solicitudes'],
  ['eva', '#/empresa/e1/riesgos/solicitudes'], ['eva', '#/polizas?f=vence_mes'], ['man', '#/poliza/pol01'], ['man', '#/comunicacion/sinasignar'], ['pil', '#/comunicacion/sinidentificar'],
  ['pil', '#/siniestro/sin1'], ['luc', '#/gestiones/cotizaciones'], ['jim', '#/gestiones/facturacion'], ['eva', '#/automatizaciones'], ['eva', '#/automatizaciones/EJ-REN-0102'],
  ['vic', '#/automatizaciones?f=confirmar'], ['emi', '#/importacion/expediente/EXP-LB-1'], ['emi', '#/importacion/lote/LOTE-CL-2'], ['r1', '#/orden-previo/ORG-01HPD3K8'],
  ['man', '#/demo/registro'], ['man', '#/demo/acerca'], ['pcl', '#/portal/e1/resumen'], ['pcl', '#/portal/e1/riesgos/plan'], ['pcl', '#/portal/e1/solicitudes'], ['pcl', '#/portal/e1/evidencias'],
  ['vic', '#/inicio|gemini'], ['man', '#/inicio|telefono'], ['eva', '#/inicio|correo'], ['man', '#/persona/p01/comunicacion|extraer'],
];
(async () => {
  const T = await iniciar({}); const P = T.page;
  let total = 0, sinEfecto = [], deshSinMotivo = [];
  const preparar = async (p, r) => {
    const [ruta, extra] = r.split('|');
    await P.evaluate(() => { window.__brokeros.reiniciar(); }); await T.perfil(p); await T.ir(ruta);
    if (extra === 'extraer') await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Extraer contexto/.test(x.textContent)); b && b.click(); });
    else if (extra) await P.evaluate(pn => { UI_HANDLERS.panel({ p: pn }); render(); }, extra);
    await P.waitForTimeout(30);
  };
  const candidatos = () => P.evaluate(() => [...(document.querySelector('[aria-modal="true"]') || document.getElementById('root')).querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => ({ txt: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 60), desh: b.disabled || b.getAttribute('aria-disabled') === 'true', actual: b.getAttribute('aria-current') === 'page' || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true', motivo: !!(b.title || b.getAttribute('aria-describedby') || (b.parentElement && /no se puede|falta|primero|bloquead|decid|motivo|hasta/i.test(b.parentElement.textContent))) })));
  for (const [p, r] of PANTALLAS) {
    await preparar(p, r);
    const lista = await candidatos();
    for (let i = 0; i < lista.length; i++) {
      const c = lista[i];
      if (c.desh) { if (!c.motivo) deshSinMotivo.push(`${p} ${r} «${c.txt}»`); continue; }
      await preparar(p, r);
      const antes = await P.evaluate(() => ({ h: location.hash, n: window.__brokeros.estado().eventos.length, html: document.getElementById('root').innerHTML, foco: document.activeElement && document.activeElement.outerHTML.slice(0, 80) }));
      const info = await P.evaluate(i => { const bs = [...(document.querySelector('[aria-modal="true"]') || document.getElementById('root')).querySelectorAll('button')].filter(b => b.offsetParent !== null); const b = bs[i]; if (!b) return { falta: true }; const f = b.form || b.closest('form'); const invalido = !!(f && (b.type === 'submit' || !b.type) && !f.checkValidity()); b.click(); return { invalido }; }, i);
      await P.waitForTimeout(60); total++;
      const despues = await P.evaluate(() => ({ h: location.hash, n: window.__brokeros.estado().eventos.length, html: document.getElementById('root').innerHTML }));
      const efecto = info.invalido || c.actual || despues.h !== antes.h || despues.n !== antes.n || despues.html !== antes.html;
      if (info.falta || !efecto) sinEfecto.push(`${p} ${r} «${c.txt}»`);
    }
  }
  ok('AM-27.efecto', `Cada botón habilitado de ${PANTALLAS.length} pantallas produce un efecto (${total} pulsados)`, total > 200 && !sinEfecto.length, sinEfecto.join(' ; ').slice(0, 1500));
  ok('AM-27.deshabilitados', 'Los botones deshabilitados dicen por qué', !deshSinMotivo.length, deshSinMotivo.join(' ; ').slice(0, 800));
  ok('AM-27.err', 'Sin errores de JavaScript', !T.errores.length, T.errores.slice(0, 5).join(' | '));
  await T.cerrar(); informe('botones');
})();
