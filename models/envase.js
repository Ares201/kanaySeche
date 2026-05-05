export const ENVASE_CODIGO_PREFIX = 'ENV-'

export function createEmptyEnvaseForm() {
  return {
    numero: '',
    autogenerar: true,
    nombre: '',
    descripcion: '',
    estado: true
  }
}

export function buildEnvaseCodigo(form) {
  return `${ENVASE_CODIGO_PREFIX}${form.numero}`
}

export function normalizeEnvase(data) {
  return {
    id: data.id,
    codigo: data.codigo || '',
    nombre: data.nombre || '',
    descripcion: data.descripcion || '',
    estado: data.estado !== false,
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toEnvasePayload(form) {
  return {
    codigo: buildEnvaseCodigo(form),
    nombre: form.nombre,
    descripcion: form.descripcion,
    estado: Boolean(form.estado)
  }
}

export function getNextEnvaseNumero(envases, editingId = null) {
  const codes = envases
    .filter(envase => envase.id !== editingId)
    .map(envase => {
      const match = envase.codigo.match(/^ENV-(\d+)$/)

      return match
        ? {
            number: parseInt(match[1], 10),
            length: match[1].length
          }
        : null
    })
    .filter(Boolean)

  const maxCode = codes.reduce((currentMax, code) => {
    return code.number > currentMax.number ? code : currentMax
  }, { number: 0, length: 3 })

  return `${maxCode.number + 1}`.padStart(Math.max(maxCode.length, 3), '0')
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
