// AM-18 / AM-44 (AV-02): los perfiles externos (Revisor R1 y los dos usuarios del portal) recorren TODAS las rutas del equipo
// y del portal, con los paneles y el registro de eventos, y en ningún texto de la página (visible u oculto) aparece un nombre de
// persona, empresa, número de póliza o patente que su perfil no puede ver. La lista de prohibidos se arma desde la semilla,
// no desde la interfaz. Se excluye solo el selector «Simulación de roles», que es un control de la demo y nombra a los perfiles.
const { iniciar, ok, informe } = require('./lib');
const { RUTAS, PORTAL } = require('./rutas');
(async () => {
  const T = await iniciar({}); const P = T.page;
  // Eventos de varios clientes en el registro antes del barrido (ruteo, renovaciones, alta).
  await T.perfil('man'); await T.act('entrante', { de: 'p01', texto: 'Hola, consulta por mi póliza' });
  for (const p of ['r1', 'pcl', 'pqa']) {
    await T.perfil(p);
    const prohibidos = await P.evaluate(p => {
      const d = window.__brokeros.estado(); const out = [];
      d.personas.filter(x => !puedeVerPersona(d, p, x.id) && !(esPortal(p) && d.membresias.some(m => m.persona === x.id && m.empresa === perfilInfo(p).portal))).forEach(x => out.push(x.nombre));
      d.empresas.filter(x => !puedeVerEmpresa(d, p, x.id)).forEach(x => out.push(x.nombre));
      const vis = pol => esPortal(p) ? pol.tomador === perfilInfo(p).portal : puedeVerPoliza(d, p, pol);
      d.polizas.filter(x => !vis(x)).forEach(x => out.push(x.numero));
      d.vehiculos.filter(v => !(esPortal(p) ? v.titular === perfilInfo(p).portal : puedeVerEmpresa(d, p, v.titular) || puedeVerPersona(d, p, v.titular))).forEach(v => out.push(v.patente));
      return [...new Set(out)].filter(s => s && s.length > 4);
    }, p);
    const rutas = [...RUTAS, ...PORTAL, '#/portal/e3/riesgos', '#/portal/e2/resumen'];
    const fugas = [];
    for (const r of rutas) {
      await T.ir(r);
      await P.evaluate(() => { const det = document.querySelector('details.registro'); if (det) det.open = true; });
      const txt = await P.evaluate(() => (() => { const c = document.body.cloneNode(true); c.querySelectorAll("script, style, template, [data-perfil-sel]").forEach(x => x.remove()); return c.textContent; })());
      const f = prohibidos.filter(s => txt.includes(s)); if (f.length) fugas.push(`${r}: ${f.slice(0, 4).join(', ')}`);
    }
    // Notificaciones y búsqueda con términos amplios.
    await T.ir('#/inicio'); await P.evaluate(() => { UI_HANDLERS.modal({ tipo: 'notifs' }); render(); });
    let txt = await P.evaluate(() => (() => { const c = document.body.cloneNode(true); c.querySelectorAll("script, style, template, [data-perfil-sel]").forEach(x => x.remove()); return c.textContent; })()); let f = prohibidos.filter(s => txt.includes(s)); if (f.length) fugas.push(`notificaciones: ${f.slice(0, 4).join(', ')}`);
    await P.evaluate(() => { UI.modal = null; render(); });
    if (!esPortalNode(p)) for (const q of ['a', 'e', 'o', 'al', 'ar', 'Funes', 'Sosa', 'Quebrada', 'ALT', 'NEV', '261', '30']) {
      const res = await P.evaluate(q => JSON.stringify(resultadosBusqueda(q, '', '')), q);
      f = prohibidos.filter(s => res.includes(s)); if (f.length) fugas.push(`búsqueda «${q}»: ${f.slice(0, 4).join(', ')}`);
    }
    ok(`AISL.${p}`, `${p}: ${rutas.length} rutas, registro, notificaciones y búsqueda sin datos de clientes ajenos (${prohibidos.length} prohibidos)`, prohibidos.length > 10 && !fugas.length, fugas.slice(0, 12).join(' ; '));
  }
  // El revisor también queda aislado después de registrar su orden previo.
  await T.perfil('r1'); const org = await P.evaluate(() => window.__brokeros.estado().validacion.orgs[0]);
  await T.ir('#/orden-previo/' + org); await T.boton('Registrar orden previo').catch(() => {});
  await T.ir('#/automatizaciones'); let t = await T.texto('.contenido');
  ok('AISL.r1-automatizaciones', 'Revisor en Automatizaciones: «Sin acceso» con explicación', /Sin acceso/.test(t) && /externo/.test(t));
  await T.ir('#/automatizaciones/EJ-REN-0102'); t = await T.texto('.contenido');
  ok('AISL.r1-ejecucion', 'Revisor en una ejecución de renovaciones: «Sin acceso»', /Sin acceso/.test(t) && !/NEV-/.test(t));
  const nav = await P.evaluate(() => [...document.querySelectorAll('nav.sidebar a')].map(a => a.dataset.nav));
  ok('AISL.r1-nav', 'La navegación del revisor no ofrece pantallas de otros clientes', !nav.some(n => ['comunicacion', 'gestiones', 'automatizaciones', 'importacion'].includes(n)), nav.join(','));
  ok('AISL.err', 'Sin errores de JavaScript', !T.errores.length, T.errores.slice(0, 3).join(' | '));
  await T.cerrar(); informe('aislamiento');
})();
function esPortalNode(p) { return p === 'pcl' || p === 'pqa'; }
