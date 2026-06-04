export function createEmptyVehiculoForm() {
  return {
    clienteId: '',
    cliente: {
      nombre: '',
      ruc: ''
    },
    placa: '',
    marca: '',
    modelo: '',
    descripcion: '',
    estado: true
  }
}

export function normalizeVehiculo(data) {
  return {
    id: data.id,
    clienteId: data.clienteId || '',
    cliente: {
      nombre: (data.cliente || {}).nombre || data.clienteNombre || '',
      ruc: (data.cliente || {}).ruc || data.clienteRuc || ''
    },
    placa: String(data.placa || '').toUpperCase(),
    marca: data.marca || '',
    modelo: data.modelo || '',
    descripcion: data.descripcion || '',
    estado: data.estado !== false,
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toVehiculoPayload(form) {
  return {
    clienteId: form.clienteId,
    cliente: {
      nombre: form.cliente.nombre,
      ruc: form.cliente.ruc
    },
    placa: String(form.placa || '').trim().toUpperCase(),
    marca: form.marca,
    modelo: form.modelo,
    descripcion: form.descripcion,
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
