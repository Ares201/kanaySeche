export const camposObservacion = ['generador', 'transportista', 'producto_cliente']

export function fechaObservacionValida(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const fecha = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === value
}

export function formatearFechaObservacion(value) {
  if (!fechaObservacionValida(value)) return 'Sin fecha registrada'
  return value.split('-').reverse().join('/')
}

export const estadosObservacion = [
  { value: 'conforme', text: 'Recepción conforme', fondo: '#DCFCE7', color: '#166534' },
  { value: 'pendiente_caracterizacion', text: 'Pendiente de tratamiento', fondo: '#FEF3C7', color: '#92400E' },
  { value: 'excepcion_comercial', text: 'Recepción por excepción comercial', fondo: '#FEE2E2', color: '#991B1B' }
]

export function obtenerEstadoObservacion(value) {
  return estadosObservacion.find(estado => estado.value === value) ||
    { value: '', text: 'Sin estado asignado', fondo: '#F1F5F9', color: '#475569' }
}

export function normalizarCoincidencia(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function coincideObservacion(record, filters) {
  return camposObservacion.every(field => normalizarCoincidencia(filters[field]) &&
    normalizarCoincidencia(record[field]) === normalizarCoincidencia(filters[field]))
}
