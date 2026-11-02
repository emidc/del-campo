// AM-03 / K: recuento independiente de K-01 a K-16 desde el estado y comparación con lo mostrado en el inicio de cada perfil, antes y después de acciones.
const { iniciar, ok, informe } = require('./lib');
// v5: el inicio suma K-17 a K-20 (riesgos v4) y deja K-03 en el panel de tareas.
const PERF = { man: ['K-01', 'K-09', 'K-11', 'K-20', 'K-18', 'K-19', 'K-17', 'K-07'], eva: ['K-11', 'K-20', 'K-18', 'K-19', 'K-17', 'K-09', 'K-07'], vic: ['K-15', 'K-04', 'K-05', 'K-06'], luc: ['K-14', 'K-20', 'K-04', 'K-06'], jim: ['K-13', 'K-04', 'K-06'], pil: ['K-12', 'K-04', 'K-06'], mat: ['K-20', 'K-04', 'K-06'], emi: ['K-08', 'K-15'] };
const min = t => { const [D, H] = t.split('T'); const [y, m, d] = D.split('-').map(Number); const [hh, mm] = (H || '00:00').split(':').map(Number); return Date.UTC(y, m - 1, d, hh, mm) / 60000; };
const RANK = { critica: 4, alta: 3, media: 2, baja: 1 };
const lo = v => typeof v === 'object' ? v.min : v;
function bandaR(d, r) {
  if (!r.evaluable) return null;
  if (r.tipo === 'padre') { const s = d.riesgos.filter(x => x.padre === r.id).map(x => bandaR(d, x)).filter(Boolean); return s.sort((a, b) => b.c - a.c)[0] || null; }
  const e = r.evals.filter(x => x.estado === 'aceptada').slice(-1)[0]; if (!e) return null;
  const c = Math.max(...['eco', 'per', 'con', 'leg'].map(k => e.P * lo(e.I[k]) * e.V[k])); return { c, b: c >= 75 ? 'critica' : c >= 50 ? 'alta' : c >= 20 ? 'media' : 'baja' };
}
// Vulnerabilidad del tipo de daño que define la banda (primer máximo en orden eco, per, con, leg; padre: el sub-riesgo de mayor C).
function vulnR(d, r) {
  if (!r.evaluable) return null;
  if (r.tipo === 'padre') return d.riesgos.filter(x => x.padre === r.id).map(x => vulnR(d, x)).filter(Boolean).sort((a, b) => b.c - a.c)[0] || null;
  const e = r.evals.filter(x => x.estado === 'aceptada').slice(-1)[0]; if (!e) return null;
  let c = 0, V = null; ['eco', 'per', 'con', 'leg'].forEach(k => { const x = e.P * lo(e.I[k]) * e.V[k]; if (x > c) { c = x; V = e.V[k]; } }); return { c, V };
}
function esperado(d, k, yo) {
  const now = new Date((min('2026-11-02T09:00') + (d.contador || 0)) * 60000).toISOString().slice(0, 16); const hoy = now.slice(0, 10);
  const atiendo = d.atenciones.filter(a => !a.hasta && a.integrante === yo).map(a => a.persona);
  const esperando = canal => d.conversaciones.filter(c => c.canal === canal && atiendo.includes(c.persona) && c.mensajes[c.mensajes.length - 1].dir === 'in');
  switch (k) {
    case 'K-01': return String(d.tareas.filter(t => t.estado === 'trabada').length);
    case 'K-02': { const c = { pendiente: 0, en_curso: 0, trabada: 0, en_revision: 0, hecha: 0 }; d.tareas.forEach(t => { if (t.estado !== 'hecha') c[t.estado]++; else if (t.hechaEl && t.hechaEl.slice(0, 10) >= '2026-11-02' && t.hechaEl.slice(0, 10) <= hoy) c.hecha++; }); return `pendiente ${c.pendiente} · en curso ${c.en_curso} · trabada ${c.trabada} · en revisión ${c.en_revision} · hecha ${c.hecha}`; }
    case 'K-03': return String(d.tareas.filter(t => t.resp === yo && t.estado !== 'hecha' && t.vence < hoy).length);
    case 'K-04': return String(esperando('whatsapp').length);
    case 'K-05': return String(esperando('whatsapp').filter(c => { const l = [...c.mensajes].reverse().find(m => m.dir === 'in'); const r = min(l.t) + 1440 - min(now); return r > 0 && r < 120; }).length);
    case 'K-06': return String(esperando('correo').length);
    case 'K-07': { // total y desglose: renovación completa (con o sin intervención) o sin completar, mirando los pasos de la ejecución
      const ps = d.polizas.filter(p => p.fin.slice(0, 7) === '2026-11');
      const hecha = p => d.ejecuciones.filter(e => e.tipo === 'renovaciones').some(e => e.items.some(i => i.poliza === p.id && i.pasos[0].estado !== 'error' && i.pasos.every(x => x.estado !== 'error' || x.resuelto)));
      const c = ps.filter(hecha).length; return `renovación completa ${c} · sin completar ${ps.length - c}`; }
    case 'K-08': return String(d.ejecuciones.filter(e => e.tipo === 'renovaciones' && e.items.some(i => i.pasos.some(p => p.estado === 'error' && !p.resuelto))).length);
    case 'K-09': return String(d.solicitudes.filter(s => s.estado === 'abierta' || s.estado === 'en_revision').length);
    case 'K-10': { const orgs = d.vinculosOrg.map(v => v.org); const por = orgs.map(o => d.riesgos.filter(r => r.org === o && r.tipo !== 'sub').map(r => bandaR(d, r)).filter(x => x && x.b === 'critica').length); return String(por.reduce((a, b) => a + b, 0)); } // v6: el mosaico muestra solo el total; el detalle por empresa está en el modal
    case 'K-11': return String(d.riesgos.filter(r => r.safety && r.tipo !== 'sub' && !d.decisionesDireccion.some(x => x.riesgo === r.id) && !d.acciones.some(a => a.riesgo === r.id && a.estado === 'en_curso')).length);
    case 'K-12': return String(d.siniestros.filter(s => s.etapas.find(e => e.id === s.etapa).requisitos.some(r => !r.ok)).length);
    case 'K-13': { const c = { borrador: 0, emitida: 0, guardada: 0, enviada: 0 }; d.facturas.forEach(f => { if (f.periodo === '2026-10' && f.estado in c) c[f.estado]++; }); return Object.entries(c).map(([a, b]) => `${a} ${b}`).join(' · '); }
    case 'K-14': { const c = { pedida: 0, obtenida: 0, guardada: 0 }; d.cotizaciones.forEach(x => { if (x.estado in c) c[x.estado]++; }); return Object.entries(c).map(([a, b]) => `${a} ${b}`).join(' · '); }
    case 'K-15': return String(d.propuestasAgente.filter(p => p.tipo === 'alta_persona' && p.estado === 'a_confirmar').length);
    case 'K-16': return String(d.sinAsignar.filter(x => !x.tomadoPor).length);
    case 'K-17': {
      const orgs = d.vinculosOrg.map(v => v.org), visto = clave => ((d.lecturas || {})[yo] || {})[clave] || '2026-10-31T00:00';
      const cuenta = (clave, xs) => xs.filter(x => x.autorTipo === 'empresa' && x.autorPerfil !== yo && x.t > visto(clave)).length;
      let n = 0;
      d.riesgos.filter(r => orgs.includes(r.org) && r.tipo !== 'sub').forEach(r => { n += cuenta('rsk:' + r.id, d.comentariosObj.filter(c => c.obj.tipo === 'riesgo' && c.obj.id === r.id)); });
      d.transferencias.filter(t => orgs.includes(t.org)).forEach(t => { n += cuenta('trf:' + t.id, d.comentariosObj.filter(c => c.obj.tipo === 'transferencia' && c.obj.id === t.id)); });
      d.acciones.filter(a => orgs.includes(a.org)).forEach(a => { n += cuenta('acc:' + a.id, [...d.avances, ...d.comentarios].filter(c => c.accion === a.id)); });
      return String(n);
    }
    case 'K-18': { const orgs = d.vinculosOrg.map(v => v.org), as = d.acciones.filter(a => orgs.includes(a.org)); return `pendiente ${as.filter(a => a.estado === 'pendiente').length} · en curso ${as.filter(a => a.estado === 'en_curso').length}`; }
    case 'K-19': { const orgs = d.vinculosOrg.map(v => v.org), ts = d.transferencias.filter(t => orgs.includes(t.org)); return `en póliza sin verificar ${ts.filter(t => t.estado === 'en_poliza_sin_verificar').length} · referencia sin póliza ${ts.filter(t => t.estado === 'referencia_sin_poliza').length}`; }
    case 'K-20': { const orgs = d.vinculosOrg.map(v => v.org); return String(d.riesgos.filter(r => orgs.includes(r.org) && r.tipo !== 'sub').filter(r => { const v = vulnR(d, r); return v && v.V >= 4; }).length); }
  }
}
async function comparar(T, etapa, sfx) {
  for (const [p, ks] of Object.entries(PERF)) {
    await T.perfil(p); await T.ir('#/inicio'); const d = await T.estado();
    for (const k of ks) {
      // Los KPIs con desglose muestran el total como número y el desglose aparte: se comparan los dos.
      const des = await T.page.locator(`[data-kpi="${k}"] [data-desglose]`).count() ? (await T.page.locator(`[data-kpi="${k}"] [data-desglose]`).innerText()).replace(/\s+/g, ' ').trim() : null;
      const num = (await T.page.locator(`[data-kpi="${k}"] .v`).innerText()).replace(/\s+/g, ' ').trim();
      const v = des == null ? num : (+num.split(' ')[0] === des.split(' · ').reduce((a, x) => a + +x.split(' ').pop(), 0) ? des : `${num} ≠ suma de «${des}»`);
      const e = esperado(d, k, p);
      ok(`K.${etapa}.${p}.${k}${sfx}`, `${k} de ${p} (${etapa}) = recuento`, v.toLowerCase() === e.toLowerCase(), `mostrado «${v}» · esperado «${e}»`);
    }
  }
}
(async () => {
  for (const movil of [false, true]) {
    const sfx = movil ? '-movil' : '';
    const T = await iniciar({ movil });
    await comparar(T, 'semilla', sfx);
    // acciones que mueven indicadores
    await T.perfil('man'); await T.act('tareaReasignar', { id: 't01', a: 'man', comentario: 'Lo pido yo', destrabar: '1' });
    await T.act('entrante', { canal: 'whatsapp', persona: 'p03', texto: 'Hola' });
    await T.perfil('eva'); await T.act('resolverPaso', { ej: 'EJ-REN-0102', poliza: 'pol06', paso: 3, modo: 'plantilla' });
    await T.act('responderSolicitud', { sol: 'SOL-CL-2', texto: 'Lo revisamos', pasarA: 'en_revision' });
    await T.perfil('vic'); await T.act('paConfirmar', { id: 'PA-0' });
    await T.perfil('luc'); await T.act('r4Ejecutar');
    await T.perfil('jim'); await T.act('r5Ejecutar');
    await T.perfil('pil'); await T.act('simularPresupuesto', { sin: 'sin1' }); await T.act('tareaEstado', { id: (await T.estado()).tareas.find(t => t.resp === 'pil' && t.estado !== 'hecha').id, estado: 'hecha' });
    await T.perfil('man'); await T.act('decisionDireccion', { riesgo: 'RSK-CL-03', texto: 'La dirección decide instalar línea de vida en diciembre.' });
    await comparar(T, 'despues', sfx);
    // panel de definición de cada KPI
    await T.perfil('man'); await T.ir('#/inicio');
    for (const k of PERF.man) { await T.page.locator(`[data-kpi="${k}"]`).click(); const t = await T.texto('[data-modal="kpi"]'); ok(`AM-03.def.${k}${sfx}`, `${k}: definición, período, origen y acción`, /Definición/i.test(t) && /Período/i.test(t) && /Origen/i.test(t) && (await T.page.locator('[data-modal="kpi"] a.btn').count()) === 1); await T.page.keyboard.press('Escape'); }
    ok('K.err' + sfx, 'Sin errores de JavaScript', T.errores.length === 0, T.errores.join(' | '));
    await T.cerrar();
  }
  informe('kpis');
})();
