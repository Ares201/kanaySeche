export const PERSONAL_CODIGO_PREFIX = 'PER-'

export function createEmptyPersonalForm() {
  return {
    nombres: '',
    telefono: '',
    correo: '',
    estado: true
  }
}

export function buildPersonalCodigo(form) {
  return `${PERSONAL_CODIGO_PREFIX}${form.numero}`
}

export function normalizePersonal(data) {
  return {
    id: data.id,
    nombres: data.nombres || '',
    telefono: data.telefono || '',
    correo: data.correo || '',
    estado: data.estado !== false,
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toPersonalPayload(form) {
  return {
    nombres: form.nombres,
    telefono: form.telefono,
    correo: form.correo,
    estado: Boolean(form.estado)
  }
}

/**
 * Si luego quieres autogenerar correlativo tipo PER-001
 * (opcional, lo dejamos listo igual que envases)
 */
export function getNextPersonalNumero(personalList, editingId = null) {
  const codes = personalList
    .filter(item => item.id !== editingId)
    .map(item => {
      const match = item.codigo?.match(/^PER-(\d+)$/)

      return match
        ? {
            number: parseInt(match[1], 10),
            length: match[1].length
          }
        : null
    })
    .filter(Boolean)

  const maxCode = codes.reduce(
    (currentMax, code) =>
      code.number > currentMax.number ? code : currentMax,
    { number: 0, length: 3 }
  )

  return `${maxCode.number + 1}`.padStart(
    Math.max(maxCode.length, 3),
    '0'
  )
}

function normalizeDate(value) {
  if (!value) return new Date()

  if (typeof value.toDate === 'function') {
    return value.toDate()
  }

  return new Date(value)
}