export function createEmptyGeneradorForm() {
  return {
    codigo: '',
    autogenerar: true,
    nombre: '',
    estado: true
  }
}

export function normalizeGenerador(data) {
  return {
    id: data.id,
    codigo: data.codigo || '',
    nombre: data.nombre || '',
    estado: data.estado !== false,
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toGeneradorPayload(form) {
  return {
    codigo: form.codigo,
    nombre: form.nombre,
    estado: Boolean(form.estado)
  }
}

export function getNextGeneradorCodigo(generadores) {
  if (generadores.length === 0) {
    return 'GEN-001'
  }

  const maxCodigo = generadores
    .map(generador => {
      const match = String(generador.codigo || '').match(/^GEN-(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .reduce((max, current) => Math.max(max, current), 0)

  return `GEN-${String(maxCodigo + 1).padStart(3, '0')}`
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
