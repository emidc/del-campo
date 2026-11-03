// Semilla sintética. Nombres inventados; ningún dato real (R-19).
import type { Sql } from './db.ts'

const u = (n: number): string => `00000000-0000-4000-8000-${n.toString().padStart(12, '0')}`

export const U = {
  ADM: u(1), // Administrador
  OP1: u(2), // Operador con E1 desde T0
  OP2: u(3), // Operador: E1 en [T0, T1), reasignado a E2 desde T1
  OP3: u(4), // Operador: E1 en [T0, T2), vence
  OP4: u(5), // Operador sin ninguna asignación
  REV: u(6), // Revisor profesional externo, con E1
  BAJ: u(7), // Operador con E1 que se da de baja en la prueba
  CT1: u(8), // Contacto de E1, vigente
  CT2: u(9), // Contacto de E2, vigente
  CT3: u(10), // Contacto de E1 en [T0, T2), vence
} as const

export const E = { E1: u(101), E2: u(102) } as const
export const P = { P1: u(201), P2: u(202) } as const
export const I = { I1C: u(301), I1B: u(302), I2C: u(303), I1B_OP1: u(304) } as const
export const V = { V1: u(401), V2: u(402) } as const

export const T0 = '2026-01-01T00:00:00-03:00'
export const T1 = '2026-06-01T00:00:00-03:00'
export const T2 = '2026-09-01T00:00:00-03:00'
export const AHORA = '2026-10-01T12:00:00-03:00'

export async function sembrar(sql: Sql): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`insert into broker.usuario (id, nombre, tipo, rol) values
      (${U.ADM}, 'Admin Sintética', 'INTERNO', 'ADMINISTRADOR'),
      (${U.OP1}, 'Operador Uno', 'INTERNO', 'OPERADOR'),
      (${U.OP2}, 'Operador Dos', 'INTERNO', 'OPERADOR'),
      (${U.OP3}, 'Operador Tres', 'INTERNO', 'OPERADOR'),
      (${U.OP4}, 'Operador Cuatro', 'INTERNO', 'OPERADOR'),
      (${U.REV}, 'Revisora Externa', 'INTERNO', 'REVISOR'),
      (${U.BAJ}, 'Operador Baja', 'INTERNO', 'OPERADOR')`
    await tx`insert into broker.usuario (id, nombre, tipo) values
      (${U.CT1}, 'Contacto Uno', 'CONTACTO'), (${U.CT2}, 'Contacto Dos', 'CONTACTO'),
      (${U.CT3}, 'Contacto Tres', 'CONTACTO')`
    await tx`insert into broker.empresa (id, nombre) values
      (${E.E1}, 'Empresa Sintética Uno'), (${E.E2}, 'Empresa Sintética Dos')`
    await tx`insert into broker.asignacion (usuario_id, empresa_id, desde, hasta) values
      (${U.OP1}, ${E.E1}, ${T0}, null),
      (${U.OP2}, ${E.E1}, ${T0}, ${T1}),
      (${U.OP2}, ${E.E2}, ${T1}, null),
      (${U.OP3}, ${E.E1}, ${T0}, ${T2}),
      (${U.REV}, ${E.E1}, ${T0}, null),
      (${U.BAJ}, ${E.E1}, ${T0}, null)`
    await tx`insert into broker.acceso_portal (usuario_id, empresa_id, desde, hasta, otorgado_por) values
      (${U.CT1}, ${E.E1}, ${T0}, null, ${U.ADM}),
      (${U.CT2}, ${E.E2}, ${T0}, null, ${U.ADM}),
      (${U.CT3}, ${E.E1}, ${T0}, ${T2}, ${U.ADM})`
    await tx`insert into broker.poliza (id, empresa_id, numero, vence) values
      (${P.P1}, ${E.E1}, 'SINT-0001', '2026-12-01'), (${P.P2}, ${E.E2}, 'SINT-0002', '2026-11-15')`
    await tx`insert into broker.nota_interna (empresa_id, autor_id, texto) values
      (${E.E1}, ${U.OP1}, 'nota interna E1'), (${E.E2}, ${U.OP2}, 'nota interna E2')`
    await tx`insert into broker.informe (id, empresa_id, autor_id, estado, aprobado_por, titulo) values
      (${I.I1C}, ${E.E1}, ${U.OP1}, 'COMPARTIDO', ${U.ADM}, 'Informe E1 compartido'),
      (${I.I1B}, ${E.E1}, ${U.ADM}, 'BORRADOR', null, 'Informe E1 en borrador (autor admin)'),
      (${I.I2C}, ${E.E2}, ${U.OP2}, 'COMPARTIDO', ${U.ADM}, 'Informe E2 compartido'),
      (${I.I1B_OP1}, ${E.E1}, ${U.OP1}, 'BORRADOR', null, 'Informe E1 en borrador (autor OP1)')`
    // Risk OS: su propia admisión. OP2 existe en Broker OS pero no está admitido en Risk OS.
    await tx`insert into risk.usuario (id, rol) values
      (${U.ADM}, 'ADMINISTRADOR'), (${U.OP1}, 'OPERADOR'), (${U.REV}, 'REVISOR')`
    await tx`insert into risk.asignacion (usuario_id, empresa_ref, desde, hasta) values
      (${U.OP1}, ${E.E1}, ${T0}, null), (${U.REV}, ${E.E1}, ${T0}, null)`
    await tx`insert into risk.evaluacion (id, empresa_ref, autor_id, estado, riesgo) values
      (${V.V1}, ${E.E1}, ${U.REV}, 'PENDIENTE', 'riesgo sintético E1'),
      (${V.V2}, ${E.E2}, ${U.ADM}, 'PENDIENTE', 'riesgo sintético E2')`
  })
}
