/**
 * Formatea una fecha ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm) a DD/MM/YYYY HH:mm (si tiene hora)
 * @param {string|Date|object} dateInput - Fecha en cualquier formato soportado
 * @returns {string} Fecha formateada (ej. "02/07/2026 14:28" o "02/07/2026")
 */
export function formatDate(dateInput) {
  if (!dateInput) return ''

  let dateObj

  if (typeof dateInput === 'string') {
    dateObj = new Date(dateInput)
  } else if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
    dateObj = dateInput.toDate()
  } else if (dateInput instanceof Date) {
    dateObj = dateInput
  } else if (typeof dateInput === 'object' && dateInput.seconds !== undefined) {
    dateObj = new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1e6)
  } else {
    dateObj = new Date(dateInput)
  }

  if (isNaN(dateObj.getTime())) return ''

  const pad = n => String(n).padStart(2, '0')
  const dateStr = `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`

  // Si tiene hora (distinta de 00:00), la añadimos
  const hours = dateObj.getHours()
  const minutes = dateObj.getMinutes()
  if (hours !== 0 || minutes !== 0) {
    return `${dateStr} - ${pad(hours)}:${pad(minutes)}`
  }
  return dateStr
}

/**
 * Formatea solo la fecha (sin hora) a DD/MM/YYYY
 * @param {string|Date|object} dateInput
 * @returns {string} Fecha formateada
 */
export function formatDateOnly(dateInput) {
  if (!dateInput) return ''

  let dateObj

  if (typeof dateInput === 'string') {
    dateObj = new Date(dateInput)
  } else if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
    dateObj = dateInput.toDate()
  } else if (dateInput instanceof Date) {
    dateObj = dateInput
  } else if (typeof dateInput === 'object' && dateInput.seconds !== undefined) {
    dateObj = new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1e6)
  } else {
    dateObj = new Date(dateInput)
  }

  if (isNaN(dateObj.getTime())) return ''

  const pad = n => String(n).padStart(2, '0')
  return `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`
}

/**
 * Formatea un número como peso con 2 decimales
 * @param {number|string} value
 * @returns {string} Peso formateado (ej. "1234.56")
 */
export function formatWeight(value) {
  return Number(value || 0).toFixed(2)
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (para inputs type="date")
 * @returns {string} Fecha actual
 */
export function getTodayDateInput() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * Obtiene la hora actual en formato HH:mm (para inputs type="time")
 * @returns {string} Hora actual
 */
export function getNowTimeInput() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/**
 * Obtiene la fecha y hora actual en formato YYYY-MM-DDTHH:mm (para datetime-local)
 * @returns {string} Fecha y hora actual
 */
export function getNowDateTimeInput() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/**
 * Escapa caracteres especiales HTML para evitar inyección
 * @param {string} value
 * @returns {string} Texto escapado
 */
export function escapeHtml(value) {
  if (!value) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Normaliza una fecha desde Excel (puede ser número serial o string)
 * @param {any} excelDate - Valor de fecha desde Excel
 * @returns {string} Fecha en formato YYYY-MM-DD o cadena vacía
 */
export function normalizeExcelDate(excelDate) {
  if (!excelDate) return ''
  // Si ya es string ISO
  if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(excelDate)) {
    return excelDate.split('T')[0]
  }
  // Si es número serial de Excel (días desde 1900-01-01)
  if (typeof excelDate === 'number') {
    const epoch = new Date(1899, 11, 30)
    const d = new Date(epoch.getTime() + excelDate * 86400000)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  // Intentar parsear string en formato dd/mm/yyyy o mm/dd/yyyy
  const match = String(excelDate).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
  }
  return ''
}