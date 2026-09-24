export const ESTADOS_TAREA = ['Pendiente', 'En progreso', 'Completada']
export const PRIORIDADES_TAREA = ['Baja', 'Media', 'Alta']

export function createEmptyTareaForm() {
  return { titulo: '', descripcion: '', prioridad: 'Media', fechaLimite: '', estado: 'Pendiente', compartidos: [], compartidoConId: '', compartidoConNombre: '', compartidoConCorreo: '' }
}

export function normalizeTarea(data = {}) {
  return {
    compartidos: getTareaRecipients(data),
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
  const compartidos = getTareaRecipients(form).filter(person => person.id !== user.id)
  return {
    compartidos,
    titulo: String(form.titulo || '').trim(), descripcion: String(form.descripcion || '').trim(),
    prioridad: PRIORIDADES_TAREA.includes(form.prioridad) ? form.prioridad : 'Media',
    fechaLimite: form.fechaLimite ? parseLocalDate(form.fechaLimite) : null,
    estado: ESTADOS_TAREA.includes(form.estado) ? form.estado : 'Pendiente',
    creadorId: user.id, creadorNombre: user.nombres || '', creadorCorreo: user.correo || '',
    compartidoConId: compartidos[0]?.id || '', compartidoConNombre: compartidos.map(person => person.nombres).join(', '), compartidoConCorreo: compartidos[0]?.correo || ''
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

export function getTareaRecipients(task) {
  const people = Object.prototype.hasOwnProperty.call(task, 'compartidos')
    ? (Array.isArray(task.compartidos) ? task.compartidos : []) : task.compartidoConId || task.compartidoConCorreo
    ? [{ id: task.compartidoConId || '', nombres: task.compartidoConNombre || '', correo: task.compartidoConCorreo || '' }] : []
  return Array.from(new Map(people.filter(person => person && (person.id || person.correo)).map(person => {
    const normalized = { id: person.id || '', nombres: person.nombres || '', correo: String(person.correo || '').trim().toLowerCase() }
    return [normalized.id || normalized.correo, normalized]
  })).values())
}

export function isTareaSharedWith(task, user = {}) {
  const email = String(user.correo || '').trim().toLowerCase()
  return getTareaRecipients(task).some(person => (user.id && person.id === user.id) || (email && person.correo === email))
}

export function canViewTarea(task, user = {}) {
  return Boolean((user.id && task.creadorId === user.id) || isTareaSharedWith(task, user))
}
