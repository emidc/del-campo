// Capturas rápidas de pantallas clave para inspección visual.
const { iniciar } = require('./lib');
const L = (process.env.RUTAS || 'man:#/inicio').split(';;');
(async () => { for (const movil of [false, true]) { const T = await iniciar({ movil }); for (const x of L) { const [p, r, extra] = x.split('|'); await T.perfil(p); await T.ir(r); if (extra) await T.page.evaluate(extra); await T.page.waitForTimeout(400); await T.foto('vistazo-' + p + r.replace(/[#/?=&]/g, '_'), !movil); } await T.cerrar(); } })();
