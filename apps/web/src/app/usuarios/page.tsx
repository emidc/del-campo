import { equipo, latestBatch } from '@del-campo/api'

import { BotonEnviar } from '@/app/_componentes/BotonEnviar'
import { Cabecera } from '@/app/_componentes/Cabecera'
import { consultar, requireAdmitted } from '@/lib/sesion'

import { darDeBaja, invitar } from './acciones'

export const dynamic = 'force-dynamic'

const ESTADOS = { INVITED: 'Invitada, todavía no entró', ACTIVE: 'Activa', INACTIVE: 'De baja' } as const

const ERRORES: Readonly<Record<string, string>> = {
  ACTOR_NO_AUTORIZADO: 'Sólo un administrador puede hacer esto.',
  EMAIL_INVALIDO: 'Ese correo no es válido.',
  YA_EXISTE: 'Ya hay un usuario con ese correo.',
  USUARIO_INEXISTENTE: 'Ese usuario no existe.',
  ULTIMO_ADMINISTRADOR: 'No se puede dar de baja al único administrador.',
}

const uno = (valor: string | string[] | undefined): string | undefined => (Array.isArray(valor) ? valor[0] : valor)

export default async function UsuariosPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const principal = await requireAdmitted()
  const parametros = await searchParams
  const [lote, datos] = await consultar(Promise.all([latestBatch(principal), equipo(principal)]))
  const error = uno(parametros.error)
  const ok = uno(parametros.ok)

  return (
    <main className="envoltorio">
      <Cabecera lote={lote} email={principal.email} />
      <p className="antetitulo">Equipo</p>
      <h1>Equipo ({datos.usuarios.length})</h1>
      <p className="meta">Todas las personas del equipo ven y editan todo. Entran con su cuenta de Google.</p>

      {error === undefined ? null : <p className="estado">{ERRORES[error] ?? 'No se pudo completar.'}</p>}
      {ok === 'invitada' ? (
        <p className="estado">Invitación creada. Avisale a la persona que entre con ese correo de Google; tiene 30 días.</p>
      ) : null}
      {ok === 'baja' ? <p className="estado">Usuario dado de baja. Ya no puede entrar.</p> : null}

      <div className="desborde">
        <table>
          <thead>
            <tr>
              <th>Persona</th>
              <th>Estado</th>
              <th>Permisos</th>
              {datos.administro ? <th>Acción</th> : null}
            </tr>
          </thead>
          <tbody>
            {datos.usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td className="nombre">
                  {usuario.email}
                  {usuario.id === datos.yo ? ' (vos)' : ''}
                </td>
                <td>{ESTADOS[usuario.estado]}</td>
                <td>{usuario.administra ? 'Administra usuarios' : '—'}</td>
                {datos.administro ? (
                  <td>
                    {usuario.estado !== 'INACTIVE' && usuario.id !== datos.yo ? (
                      <form action={darDeBaja}>
                        <input type="hidden" name="usuario" value={usuario.id} />
                        <BotonEnviar className="boton--secundario boton--chico">Dar de baja</BotonEnviar>
                      </form>
                    ) : (
                      '—'
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {datos.administro ? (
        <>
          <h2>Invitar a alguien del equipo</h2>
          <form action={invitar} className="buscador">
            <div className="campo" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="email">Correo de Google</label>
              <input id="email" type="email" name="email" required placeholder="nombre@delcampobroker.com" />
            </div>
            <div className="acciones">
              <BotonEnviar>Invitar</BotonEnviar>
            </div>
          </form>
        </>
      ) : null}
    </main>
  )
}
