import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aFicha,leerCsv} from '../../../../regresion-ejecutable/fichas.ts';
import {derivadosCalculados,rankingPrincipal,indicePosicion} from '../../../../regresion-ejecutable/verificacion.ts';
const directory=new URL('./',import.meta.url);
const summary=leerCsv(new URL('resumen-resultados.csv',directory));
const fields={evaluable:'evaluable',cRaw:'c_raw',cDimensionDeterminante:'c_dimension_determinante',iEfectivo:'i_efectivo',iEfectivoDimensiones:'i_efectivo_dimensiones',vAspectosAplicables:'v_aspectos_aplicables',consecuenciaExtrema:'consecuencia_extrema',consecuenciaExtremaDimensiones:'consecuencia_extrema_dimensiones',safetyCritical:'safety_critical',techoPlausible:'techo_plausible',banda:'banda'};
let count=0;
for (const [name,posCol] of [['fichas-emiliano-calculadas.csv','posicion_humana_B'],['referencia-historica-calculada.csv','posicion_historica']]){
 const raw=leerCsv(new URL(name,directory));const typed=raw.map(aFicha);const ranking=rankingPrincipal(typed,typed);
 for(let i=0;i<raw.length;i++){
  const calc=derivadosCalculados(typed[i]);
  for(const [key,col] of Object.entries(fields)){assert.equal(calc[key],raw[i][col],raw[i].risk_id+' '+col);count++;}
  const n=indicePosicion(ranking,raw[i].risk_id);
  const pos=1+ranking.posiciones.slice(0,n).reduce((sum,p)=>sum+p.ids.length,0);
  assert.equal(String(pos),summary.find(x=>x.risk_id===raw[i].risk_id)[posCol]);count++;
 }
}
console.log(`PASS: ${count} derivados y posiciones coinciden entre Python y TypeScript; 12 fichas, sin cambiar factores.`);
