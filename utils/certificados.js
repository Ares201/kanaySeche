export const DEFAULT_MAX_TOTAL_BYTES = 4000000

export function maxTotalBytes(value) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : DEFAULT_MAX_TOTAL_BYTES
}

export function validarArchivos(files, limit) {
  if (!files.length) return 'Selecciona al menos un PDF.'
  for (const file of files) {
    if (!/\.pdf$/i.test(file.name)) return `El archivo "${file.name}" debe tener extensión .pdf.`
    if (!file.size) return `El archivo "${file.name}" está vacío.`
  }
  if (files.reduce((total, file) => total + file.size, 0) > limit) {
    return `El lote supera el límite preventivo de ${(limit / 1000000).toFixed(2)} MB. Quita archivos antes de enviarlo.`
  }
  return ''
}

export function cantidadProcesada(header) {
  if (typeof header !== 'string' || !/^\d+$/.test(header.trim())) return null
  const count = Number(header)
  return Number.isSafeInteger(count) && count >= 0 ? count : null
}

export async function errorRespuesta(response) {
  const messages = {
    400: 'El lote contiene un archivo inválido o vacío.',
    413: 'La solicitud o el ZIP excede el tamaño permitido. Prueba con menos archivos.',
    422: 'No se pudo validar el lote: algún PDF puede ser ilegible.',
    500: 'El servidor no pudo procesar el lote.',
    504: 'El servidor agotó el tiempo de espera. El procesamiento podría seguir en curso.'
  }
  const message = messages[response.status] || `Error del servidor (${response.status}).`
  try {
    const { detail } = await response.json()
    const details = typeof detail === 'string' ? detail : Array.isArray(detail)
      ? detail.map(item => typeof item === 'string' ? item : item && typeof item.msg === 'string' ? item.msg : '').filter(Boolean).join('; ')
      : ''
    return details ? `${message} ${details}` : message
  } catch (_) {
    return message
  }
}

export async function solicitarCertificados(files, baseURL, { fetchImpl = fetch, timeoutMs = 60000 } = {}) {
  const body = new FormData()
  files.forEach(file => body.append('files', file))
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response
    let blob
    try {
      response = await fetchImpl(`${baseURL.replace(/\/+$/, '')}/api/procesar-certificados`, {
        method: 'POST', body, signal: controller.signal
      })
      if (!response.ok) throw new Error(await errorRespuesta(response))
      const type = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase()
      if (type !== 'application/zip') throw new Error('El servidor no devolvió un ZIP válido. No se descargó ningún archivo.')
      blob = await response.blob()
    } catch (error) {
      if (controller.signal.aborted) throw new Error('Se agotó el tiempo de espera. Cancelar la espera no cancela necesariamente el procesamiento en el servidor.')
      if (error instanceof TypeError) throw new Error('No se pudo completar la conexión. Revisa la red, la disponibilidad de la API y su configuración CORS; el navegador no permite identificar la causa exacta.')
      throw error
    }
    if (!blob.size) throw new Error('El servidor devolvió un ZIP vacío.')
    return { blob, cantidad: cantidadProcesada(response.headers.get('X-Archivos-Procesados')) }
  } finally {
    clearTimeout(timer)
  }
}

export function descargarZip(blob) {
  if (typeof window === 'undefined') throw new Error('La descarga requiere un navegador.')
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  try {
    link.href = url
    link.download = 'certificados_procesados.zip'
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    // Da tiempo al navegador para iniciar la descarga antes de liberar el blob.
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  }
}
