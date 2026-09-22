export const ESTADOS_TAREA = ['Pendiente', 'En progreso', 'Completada']
export const PRIORIDADES_TAREA = ['Baja', 'Media', 'Alta']

export function createEmptyTareaForm() {
  return { titulo: '', descripcion: '', prioridad: 'Media', fechaLimite: '', estado: 'Pendiente', compartidoConId: '', compartidoConNombre: '', compartidoConCorreo: '' }
}

export function normalizeTarea(data = {}) {
  return {
    id: data.id || '', titulo: data.titulo || '', descripcion: data.descripcion || '',
    prioridad: PRIORIDADES_TAREA.includes(data.prioridad) ? data.prioridad : 'Media',
    fechaLimite: normalizeDateInput(data.fechaLimite),
    estado: ESTADOS_TAREA.includes(data.estado) ? data.estado : 'Pendiente',
    creadorId: data.creadorId || '', creadorNombre: data.creadorNombre || '', creadorCorreo: data.creadorCorreo || '',
    compartidoConId: data.compartidoConId || '', compartidoConNombre: data.compartidoConNombre || '', compartidoConCorreo: data.compartidoConCorreo || '',
    fechaCreacion: normalizeDate(data.fechaCreacion), fechaActualizacion: normalizeDate(data.fechaActualizacion)
  }
}

export function toTareaPayload(form, user) {
  return {
    titulo: String(form.titulo || '').trim(), descripcion: String(form.descripcion || '').trim(),
    prioridad: PRIORIDADES_TAREA.includes(form.prioridad) ? form.prioridad : 'Media',
    fechaLimite: form.fechaLimite ? parseLocalDate(form.fechaLimite) : null,
    estado: ESTADOS_TAREA.includes(form.estado) ? form.estado : 'Pendiente',
    creadorId: user.id, creadorNombre: user.nombres || '', creadorCorreo: user.correo || '',
    compartidoConId: form.compartidoConId || '', compartidoConNombre: form.compartidoConNombre || '', compartidoConCorreo: form.compartidoConCorreo || ''
  }
}

function parseLocalDate(value) {
  const [year, month, day] = String(value).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function normalizeDateInput(value) {
  if (!value) return ''
  const date = normalizeDate(value)
  if (!date || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function normalizeDate(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()
  if (value.seconds !== undefined) return new Date(value.seconds * 1000)
  return new Date(value)
}
