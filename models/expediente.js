// models/expediente.js

const ESTADOS_EXPEDIENTE = ['Pendiente', 'Notificado', 'Regularizado', 'Cerrado']
const ESTADOS_PV = ['Abierto', 'Cerrado']
const TIPOS_SERVICIO = ['Notarial', 'Recurrente']

export function createEmptyExpedienteForm() {
  return {
    correlativo: '',
    sede: 'Chilca',                     // ← valor por defecto
    fecha: '',
    cliente: {
      nombre: '',
      ruc: '',
      direccion: '',
      contactoNombre: '',
      contactoTelefono: ''
    },
    transportista: '',
    generadorPv: '',
    observaciones: '',
    accionInmediata: '',
    planner: '',
    estado: 'Pendiente',
    estadoPV: 'Abierto',               // ← nuevo campo, por defecto Abierto
    tipoServicio: 'Recurrente'
  }
}

export function normalizeExpediente(data) {
  const cliente = data.cliente || {}
  return {
    id: data.id || '',
    correlativo: data.correlativo || '',
    sede: data.sede || 'Chilca',
    fecha: normalizeDate(data.fecha),
    cliente: {
      nombre: cliente.nombre || '',
      ruc: cliente.ruc || '',
      direccion: cliente.direccion || '',
      contactoNombre: cliente.contactoNombre || '',
      contactoTelefono: cliente.contactoTelefono || ''
    },
    transportista: data.transportista || '',
    generadorPv: data.generadorPv || '',
    observaciones: data.observaciones || '',
    accionInmediata: data.accionInmediata || '',
    planner: data.planner || '',
    estado: ESTADOS_EXPEDIENTE.includes(data.estado) ? data.estado : 'Pendiente',
    estadoPV: ESTADOS_PV.includes(data.estadoPV) ? data.estadoPV : 'Abierto',
    tipoServicio: TIPOS_SERVICIO.includes(data.tipoServicio) ? data.tipoServicio : 'Recurrente',
    fechaCreacion: normalizeDate(data.fechaCreacion),
    cartaId: data.cartaId || null
  }
}

export function toExpedientePayload(formulario) {
  const payload = {
    correlativo: formulario.correlativo || '',
    sede: formulario.sede || 'Chilca',
    fecha: formulario.fecha ? (() => {
      const [year, month, day] = formulario.fecha.split('-').map(Number)
      return new Date(year, month - 1, day)
    })() : null,
    cliente: {
      nombre: formulario.cliente.nombre || '',
      ruc: formulario.cliente.ruc || '',
      direccion: formulario.cliente.direccion || '',
      contactoNombre: formulario.cliente.contactoNombre || '',
      contactoTelefono: formulario.cliente.contactoTelefono || ''
    },
    transportista: formulario.transportista || '',
    generadorPv: formulario.generadorPv || '',
    observaciones: formulario.observaciones || '',
    accionInmediata: formulario.accionInmediata || '',
    planner: formulario.planner || '',
    estado: ESTADOS_EXPEDIENTE.includes(formulario.estado) ? formulario.estado : 'Pendiente',
    estadoPV: ESTADOS_PV.includes(formulario.estadoPV) ? formulario.estadoPV : 'Abierto',
    tipoServicio: TIPOS_SERVICIO.includes(formulario.tipoServicio) ? formulario.tipoServicio : 'Recurrente'
  }
  if (formulario.cartaId) payload.cartaId = formulario.cartaId
  return payload
}

function normalizeDate(value) {
  if (!value) return new Date()
  if (typeof value.toDate === 'function') return value.toDate()
  if (value && value.seconds !== undefined) {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000)
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value)
}

export { ESTADOS_EXPEDIENTE, ESTADOS_PV, TIPOS_SERVICIO }
