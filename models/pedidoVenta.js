export const PEDIDO_VENTA_PREFIX = 'PV-'

export function createEmptyPedidoVentaForm() {
  return {
    codigo: '',
    clienteId: '',
    cliente: {
      nombre: '',
      ruc: '',
      direccion: ''
    },
    placa: '',
    fecha: getTodayDateInput(),
    horaIngreso: getNowTimeInput(),
    pesoIngreso: '',
    pesoSalida: '',
    detalle: [createEmptyDetalleItem(1)]
  }
}

export function createEmptyDetalleItem(item = 1) {
  return {
    item,
    tipo: 'Producto',
    codigoResiduo: '',
    nombreResiduo: '',
    codigoGenerador: '',
    nombreGenerador: '',
    producto: '',
    eje: '',
    pesoDeclaradoCliente: '',
    zonaRecepcion: ''
  }
}

export function normalizePedidoVenta(data) {
  const detalle = Array.isArray(data.detalle) ? data.detalle : []

  return {
    id: data.id,
    codigo: data.codigo || '',
    clienteId: data.clienteId || '',
    cliente: {
      nombre: (data.cliente || {}).nombre || data.clienteNombre || '',
      ruc: (data.cliente || {}).ruc || data.clienteRuc || '',
      direccion: (data.cliente || {}).direccion || ''
    },
    placa: data.placa || '',
    fecha: data.fecha || getTodayDateInput(),
    horaIngreso: data.horaIngreso || '',
    pesoIngreso: normalizeNumber(data.pesoIngreso),
    pesoSalida: normalizeNumber(data.pesoSalida),
    pesoNeto: normalizeNumber(data.pesoNeto),
    detalle: detalle.map((row, index) => ({
      item: row.item || index + 1,
      tipo: row.tipo || 'Producto',
      codigoResiduo: row.codigoResiduo || row.residuoCodigo || '',
      nombreResiduo: row.nombreResiduo || row.residuoNombre || row.residuo || '',
      codigoGenerador: row.codigoGenerador || row.generadorCodigo || '',
      nombreGenerador: row.nombreGenerador || row.generadorNombre || row.generador || '',
      producto: row.producto || '',
      eje: row.eje || row.ejeNorte || '',
      pesoDeclaradoCliente: normalizeNumber(row.pesoDeclaradoCliente),
      zonaRecepcion: row.zonaRecepcion || ''
    })),
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toPedidoVentaPayload(form) {
  const pesoIngreso = normalizeNumber(form.pesoIngreso)
  const pesoSalida = normalizeNumber(form.pesoSalida)

  return {
    codigo: form.codigo,
    clienteId: form.clienteId,
    cliente: {
      nombre: form.cliente.nombre,
      ruc: form.cliente.ruc,
      direccion: form.cliente.direccion
    },
    placa: form.placa,
    fecha: form.fecha,
    horaIngreso: form.horaIngreso,
    pesoIngreso,
    pesoSalida,
    pesoNeto: calculatePesoNeto(pesoIngreso, pesoSalida),
    detalle: form.detalle.map((row, index) => ({
      item: index + 1,
      tipo: 'Producto',
      codigoResiduo: row.codigoResiduo,
      nombreResiduo: row.nombreResiduo,
      codigoGenerador: row.codigoGenerador,
      nombreGenerador: row.nombreGenerador,
      producto: row.producto,
      eje: row.eje,
      pesoDeclaradoCliente: normalizeNumber(row.pesoDeclaradoCliente),
      zonaRecepcion: row.zonaRecepcion
    }))
  }
}

export function calculatePesoNeto(pesoIngreso, pesoSalida) {
  return Math.max(normalizeNumber(pesoIngreso) - normalizeNumber(pesoSalida), 0)
}

export function getNextPedidoVentaCodigo(pedidos, editingId = null) {
  const maxNumber = pedidos
    .filter(pedido => pedido.id !== editingId)
    .map(pedido => {
      const match = String(pedido.codigo || '').match(/^PV-(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .reduce((max, current) => Math.max(max, current), 0)

  return `${PEDIDO_VENTA_PREFIX}${maxNumber + 1}`
}

export function getTodayDateInput() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

export function getNowTimeInput() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

function normalizeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
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
