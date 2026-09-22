// Encabezados exactos de cada CSV de Zoho, tal cual el manifiesto de T-0004 los observó.
// Un solo lugar documenta el mapeo header→campo: cualquier otro módulo que necesite leer
// una columna del `raw` de staging pasa por acá, nunca por un string repetido a mano.

export const CAMPOS_POLIZA = {
  idDeRegistro: 'ID de registro',
  numeroDePoliza: 'Número de póliza',
  contactoId: 'Contacto.id',
  cuentaId: 'Cuenta.id',
  vigenciaInicio: 'Vigencia Inicio',
  vigenciaFin: 'Vigencia Fin',
  companiaId: 'Compañía.id',
  compania: 'Compañía',
  estado: 'Estado',
  riesgoId: 'Riesgo.id',
  riesgo: 'Riesgo',
  renovadaAPolizaN: 'Renovada a póliza n°',
  renovadaDePolizaN: 'Renovada de póliza n°',
  tipoDeRenovacion: 'Tipo de renovación',
  prima: 'Prima',
  premio: 'Premio',
  moneda: 'Moneda',
} as const

export const CAMPOS_ENDOSO = {
  idDeRegistro: 'ID de registro',
  numeroDeEndoso: 'Número de endoso',
  perteneceAPolizaNId: 'Pertenece a póliza N°.id',
  inicioVigencia: 'Inicio vigencia',
  finVigencia: 'Fin vigencia',
  tipoEndoso: 'Tipo Endoso',
  companiasId: 'Compañías.id',
} as const

export const CAMPOS_CONTACTO = {
  idDeRegistro: 'ID de registro',
  nombre: 'Nombre',
  apellidos: 'Apellidos',
  nombreDeCuentaId: 'Nombre de Cuenta.id',
  dni: 'DNI',
  cuil: 'CUIL',
  correoElectronico: 'Correo electrónico',
  correoElectronicoSecundario: 'Correo electrónico secundario',
  telefono: 'Teléfono',
  otroTelefono: 'Otro teléfono',
  movil: 'Móvil',
  fechaDeNacimiento: 'Fecha de nacimiento',
} as const

export const CAMPOS_CUENTA = {
  idDeRegistro: 'ID de registro',
  nombreDeCuenta: 'Nombre de Cuenta',
  cuit: 'CUIT',
  telefono: 'Teléfono',
} as const
