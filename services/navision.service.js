export const SALES_ORDER_URL = "https://10-navapp-p01.chene.env:7068/SECHE_PERU_PROD/ODataV4/Company('S%C3%A9ch%C3%A9%20Per%C3%BA%20-%20PROD')/SalesOrder"

export function rangoActualNavision(hoy = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(hoy)
  const parte = tipo => partes.find(item => item.type === tipo).value
  const mes = `${parte('year')}-${parte('month')}`
  return { fechaInicio: `${mes}-01`, fechaFin: `${mes}-${parte('day')}` }
}

export async function obtenerPedidosNavision(nextLink, centroResponsabilidad = '', fechaInicio = '', fechaFin = '') {
  const url = new URL(nextLink || SALES_ORDER_URL, SALES_ORDER_URL)
  const base = new URL(SALES_ORDER_URL)
  if (url.origin !== base.origin || url.pathname !== base.pathname) {
    throw new Error('Navision devolvió un enlace de paginación no permitido.')
  }
  if (!nextLink) {
    url.searchParams.set('$format', 'json')
    url.searchParams.set('$top', '100')
    const centro = String(centroResponsabilidad || '').trim()
    const filtros = []
    if (centro) filtros.push(`Responsibility_Center eq '${centro.replace(/'/g, "''")}'`)
    for (const fecha of [fechaInicio, fechaFin]) {
      if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0, 10) !== fecha)) {
        throw new Error('Introduce una fecha válida.')
      }
    }
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) throw new Error('La fecha de inicio debe ser anterior o igual a la fecha final.')
    if (fechaInicio) filtros.push(`Posting_Date ge ${fechaInicio}`)
    if (fechaFin) filtros.push(`Posting_Date le ${fechaFin}`)
    if (filtros.length) url.searchParams.set('$filter', filtros.join(' and '))
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(url.href, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    })
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Navision rechazó el acceso (${response.status}). Verifica tu sesión de Windows y tus permisos con TI.`)
    }
    if (!response.ok) throw new Error(`Navision respondió con el estado HTTP ${response.status}.`)
    const data = await response.json()
    if (!Array.isArray(data.value)) throw new Error('La respuesta de Navision no contiene una lista ODataV4 válida.')
    return { pedidos: data.value, nextLink: data['@odata.nextLink'] || data['odata.nextLink'] || null }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Navision no respondió en 30 segundos. Comprueba tu conexión a la intranet o VPN.')
    if (error instanceof TypeError) throw new Error('No se pudo conectar con Navision. Comprueba la intranet o VPN. Si puedes abrir la API directamente, solicita a TI revisar CORS con credenciales, el certificado y la autenticación integrada de Windows para esta web.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
