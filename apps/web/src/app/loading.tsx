import { AccesoABuscar, Logo } from './_componentes/Cabecera'
import { Navegacion } from './_componentes/Navegacion'

/**
 * Lo que se ve mientras una pantalla espera a la base: el mismo marco, con el contenido en
 * bloques que brillan. Next lo muestra al instante al tocar un enlace o enviar una búsqueda.
 */
export default function Cargando() {
  return (
    <main className="envoltorio" aria-busy="true">
      <header className="superior">
        <Logo />
        <AccesoABuscar />
      </header>
      <Navegacion pie={null} />
      <p className="sr" role="status">
        Cargando…
      </p>
      <div className="esqueleto" aria-hidden="true">
        <span className="brillo brillo--antetitulo" />
        <span className="brillo brillo--titulo" />
        <span className="brillo brillo--linea" />
        <div className="esqueleto__tarjeta">
          <span className="brillo brillo--subtitulo" />
          <span className="brillo brillo--fila" />
          <span className="brillo brillo--fila" />
          <span className="brillo brillo--fila" />
          <span className="brillo brillo--fila brillo--corta" />
        </div>
        <div className="esqueleto__tarjeta">
          <span className="brillo brillo--subtitulo" />
          <span className="brillo brillo--fila" />
          <span className="brillo brillo--fila brillo--corta" />
        </div>
      </div>
    </main>
  )
}
