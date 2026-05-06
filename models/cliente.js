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
  return {
    id: data.id,
    nombre: data.nombre || data.cliente || '',
    ruc: data.ruc || '',
    direccion: data.direccion || '',
    contacto: data.contacto || '',
    numeroContacto: data.numeroContacto || '',
    telefonoContacto: data.telefonoContacto || data.telefono || '',
    estado: data.estado !== false,
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toClientePayload(form) {
  return {
    nombre: form.nombre,
    ruc: form.ruc,
    direccion: form.direccion,
    contacto: form.contacto,
    numeroContacto: form.numeroContacto,
    telefonoContacto: form.telefonoContacto,
    estado: Boolean(form.estado)
  }
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
