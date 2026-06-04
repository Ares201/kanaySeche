export function createEmptyProductoForm() {
  return {
    codigo: '',
    autogenerar: true,
    nombre: '',
    zonaRecepcion: '',
    estado: true
  }
}

export function normalizeProducto(data) {
  return {
    id: data.id,
    codigo: data.codigo || '',
    nombre: data.nombre || '',
    zonaRecepcion: data.zonaRecepcion || '',
    estado: data.estado !== false,
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toProductoPayload(form) {
  return {
    codigo: form.codigo,
    nombre: form.nombre,
    zonaRecepcion: form.zonaRecepcion,
    estado: Boolean(form.estado)
  }
}

export function getNextProductoCodigo(productos) {
  if (productos.length === 0) {
    return 'PROD-001'
  }

  const maxCodigo = productos
    .map(producto => {
      const match = String(producto.codigo || '').match(/^PROD-(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .reduce((max, current) => Math.max(max, current), 0)

  return `PROD-${String(maxCodigo + 1).padStart(3, '0')}`
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
