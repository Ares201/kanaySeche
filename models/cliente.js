export function createEmptyClienteForm() {
  return {
    nombre: '',
    ruc: '',
    direccion: '',
    contacto: '',
    numeroContacto: '',
    telefonoContacto: '',
    estado: true
  }
}

export function normalizeCliente(data) {
  const vehiculos = normalizeVehiculos(data.vehiculos || data.vehiculo || data.placas || data.placa)

  return {
    id: data.id,
    nombre: data.nombre || data.cliente || '',
    ruc: data.ruc || '',
    direccion: data.direccion || '',
    contacto: data.contacto || '',
    numeroContacto: data.numeroContacto || '',
    telefonoContacto: data.telefonoContacto || data.telefono || '',
    vehiculos,
    estado: data.estado !== false,
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toClientePayload(form) {
  const payload = {
    nombre: form.nombre,
    ruc: form.ruc,
    direccion: form.direccion,
    contacto: form.contacto,
    numeroContacto: form.numeroContacto,
    telefonoContacto: form.telefonoContacto,
    estado: Boolean(form.estado)
  }

  if (Array.isArray(form.vehiculos)) {
    payload.vehiculos = form.vehiculos
  }

  return payload
}

function normalizeVehiculos(value) {
  if (!value) return []

  const values = Array.isArray(value) ? value : [value]

  return values
    .map(item => {
      if (typeof item === 'string') {
        return { placa: item, descripcion: '' }
      }

      return {
        placa: item.placa || item.numeroPlaca || item.codigo || '',
        descripcion: item.descripcion || item.modelo || item.marca || ''
      }
    })
    .filter(item => item.placa)
}

function normalizeDate(value) {
  if (!value) {
    return new Date()
  }

  if (typeof value.toDate === 'function') {
    return value.toDate()
  }

  return new Date(value)
}
