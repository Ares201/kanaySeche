export function createEmptyResiduoForm() {
  return {
    codigo: '',
    autogenerar: true,
    nombre: '',
    descripcion: '',
    estado: true
  }
}

export function normalizeResiduo(data) {
  return {
    id: data.id,
    codigo: data.codigo || '',
    nombre: data.nombre || '',
    descripcion: data.descripcion || '',
    estado: data.estado !== false,
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toResiduoPayload(form) {
  return {
    codigo: form.codigo,
    nombre: form.nombre,
    descripcion: form.descripcion,
    estado: Boolean(form.estado)
  }
}

export function getNextResiduoCodigo(residuos) {
  if (residuos.length === 0) {
    return '7000000'
  }

  const maxCodigo = Math.max(
    ...residuos.map(residuo => Number(residuo.codigo) || 0)
  )

  return String(maxCodigo + 1).padStart(7, '0')
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
