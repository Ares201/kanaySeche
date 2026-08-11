export function getEmptyAgendamiento() {
  return {
    id: '',

    correlativo: '',

    cliente: {
      id: '',
      nombre: '',
      ruc: '',
      direccion: '',
      contacto: '',
      telefono: ''
    },

    fecha: '',

    horaInicio: '',

    horaFin: '',

    estado: 'Pendiente',

    residuos: [],

    observacion: '',

    fechaCreacion: new Date()
  }
}


export function normalizeAgendamiento(agendamiento) {

  const source = agendamiento || {}

  const cliente = source.cliente || {}


  return {

    id: source.id || '',


    correlativo:
      source.correlativo || '',


    cliente: {

      id: cliente.id || '',

      nombre:
        cliente.nombre || '',

      ruc:
        cliente.ruc || '',

      direccion:
        cliente.direccion || '',

      contacto:
        cliente.contacto || '',

      telefono:
        cliente.telefono || ''

    },


    fecha:
      source.fecha || '',


    horaInicio:
      source.horaInicio || '',


    horaFin:
      source.horaFin || '',


    estado:
      source.estado || 'Pendiente',


    residuos:
      Array.isArray(source.residuos)
        ? source.residuos
        : [],


    observacion:
      source.observacion || '',


    fechaCreacion:
      source.fechaCreacion || new Date()

  }

}