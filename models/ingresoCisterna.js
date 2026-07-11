export const INGRESO_CISTERNA_CODIGO_PREFIX = 'CIS-'

export function createEmptyIngresoCisternaForm() {
  return {
    correlativo: '',
    fechaIngreso: '',
    placa: '',
    transportista: '',
    comprobante: '',
    pesoBruto: 0,
    pesoTara: 0,
    pesoNeto: 0,
    pruebaLaboratorio: '',
    destino: '',
    fechaSalida: ''
  }
}

export function buildIngresoCisternaCodigo(numero) {
  return `${INGRESO_CISTERNA_CODIGO_PREFIX}${numero}`
}

export function normalizeIngresoCisterna(data) {
  return {
    id: data.id,
    correlativo: data.correlativo || '',
    fechaIngreso: data.fechaIngreso || '',
    placa: data.placa || '',
    transportista: data.transportista || '',
    comprobante: data.comprobante || '',
    pesoBruto: Number(data.pesoBruto || 0),
    pesoTara: Number(data.pesoTara || 0),
    pesoNeto: Number(data.pesoNeto || 0),
    pruebaLaboratorio: data.pruebaLaboratorio || '',
    destino: data.destino || '',
    fechaSalida: data.fechaSalida || '',
    fechaCreacion: normalizeDate(data.fechaCreacion)
  }
}

export function toIngresoCisternaPayload(formularioIngreso) {

  return {

    correlativo: formularioIngreso.correlativo,

    fechaIngreso: formularioIngreso.fechaIngreso
      ? new Date(formularioIngreso.fechaIngreso)
      : null,

    placa: formularioIngreso.placa,

    transportista: formularioIngreso.transportista,

    comprobante: formularioIngreso.comprobante,

    pesoBruto: Number(formularioIngreso.pesoBruto),

    pesoTara: Number(formularioIngreso.pesoTara),

    pesoNeto: Number(formularioIngreso.pesoNeto),

    pruebaLaboratorio:
      formularioIngreso.pruebaLaboratorio,

    destino:
      formularioIngreso.destino,

    fechaSalida: formularioIngreso.fechaSalida
      ? new Date(formularioIngreso.fechaSalida)
      : null

  }

}

/**
 * Genera el siguiente correlativo:

 */

export function getNextIngresoCisternaNumero(
  ingresosCisternas,
  idIngresoEditando = null
) {
  const correlativos = ingresosCisternas
    .filter(
      ingresoCisterna => ingresoCisterna.id !== idIngresoEditando
    )
    .map(ingresoCisterna => {
      const coincidencia = ingresoCisterna.correlativo?.match(
        /^CIS-(\d+)$/
      )

      return coincidencia
        ? {
          numero: parseInt(coincidencia[1], 10),
          longitud: coincidencia[1].length
        }
        : null
    })
    .filter(Boolean)

  const mayorCorrelativo = correlativos.reduce(
    (mayor, actual) =>
      actual.numero > mayor.numero ? actual : mayor,
    {
      numero: 0,
      longitud: 3
    }
  )

  return `${mayorCorrelativo.numero + 1}`.padStart(
    Math.max(mayorCorrelativo.longitud, 3),
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