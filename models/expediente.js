// models/expediente.js

const ESTADOS_EXPEDIENTE = ['Pendiente', 'Notificado', 'Regularizado', 'Cerrado']

export function createEmptyExpedienteForm() {
  return {
    correlativo: '',
    sede: '',
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
    estado: 'Pendiente'
  }
}

export function normalizeExpediente(data) {
  const cliente = data.cliente || {}
  return {
    id: data.id || '',
    correlativo: data.correlativo || '',
    sede: data.sede || '',
    fecha: normalizeDate(data.fecha),   // ← convertimos a Date local
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
    fechaCreacion: normalizeDate(data.fechaCreacion),
    cartaId: data.cartaId || null
  }
}

export function toExpedientePayload(formulario) {
  const payload = {
    correlativo: formulario.correlativo || '',
    sede: formulario.sede || '',
    fecha: formulario.fecha ? (() => {
      const [year, month, day] = formulario.fecha.split('-').map(Number)
      return new Date(year, month - 1, day) // ← medianoche en hora local
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
    estado: ESTADOS_EXPEDIENTE.includes(formulario.estado) ? formulario.estado : 'Pendiente'
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
  // Si es string ISO, construir con partes locales
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value)
}

export { ESTADOS_EXPEDIENTE }