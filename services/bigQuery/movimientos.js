import { BigQuery } from '@google-cloud/bigquery'
import fs from 'fs'
import path from 'path'

const TABLE = '`light-height-446600-i4.lab_historico.control_cisternas`'

const projectId = process.env.GCP_PROJECT_ID || 'light-height-446600-i4'

function crearClienteBigQuery() {
  try {
    // Recomendado para despliegues: el JSON completo en una variable secreta.
    if (process.env.GCP_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GCP_CREDENTIALS)
      if (credentials.private_key) credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
      return new BigQuery({ projectId, credentials })
    }

    if (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
      return new BigQuery({
        projectId,
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n')
        }
      })
    }

    // Google Cloud y GOOGLE_APPLICATION_CREDENTIALS usan ADC automáticamente.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
      return new BigQuery({ projectId })
    }

    // Respaldo exclusivo para desarrollo; nunca debe estar dentro de static/.
    const localCredentialsPath = path.resolve(process.cwd(), 'configGoogle', 'credentialsPath.json')
    if (fs.existsSync(localCredentialsPath)) {
      return new BigQuery({ projectId, keyFilename: localCredentialsPath })
    }

    throw new Error(
      'Credenciales de BigQuery no configuradas. Define GCP_CREDENTIALS, ' +
      'GCP_CLIENT_EMAIL/GCP_PRIVATE_KEY o GOOGLE_APPLICATION_CREDENTIALS.'
    )
  } catch (error) {
    console.error('❌ Error configurando BigQuery:', error.message)
    throw error
  }
}

const bigquery = crearClienteBigQuery()

const FIELDS = {
  fecha_ingreso: '`Fecha de Ingreso de Cisterna`',
  generador: '`Generador`',
  producto_cliente: '`Nombre Producto Cliente`',
  transportista: '`Transportista`',
  tratamiento: '`Tratamiento Propuesto-_Nombre Tratamiento_`',
  ubicacion: '`Ubicación`',
  pedido_venta: '`Pedido de Venta`',
  tipo: '`Tipo`',
  fecha_muestra: '`Fecha de Ingreso de Muestra`'
}

const WRITABLE_FIELDS = Object.keys(FIELDS)

const cache = new Map()
const CACHE_TTL = 30000

function normalizarSql(expression) {
  return `REGEXP_REPLACE(LOWER(NORMALIZE(TRIM(CAST(${expression} AS STRING)), NFD)), r'\\pM', '')`
}

function filtrosDesdeQuery(query) {
  return Object.keys(FIELDS).reduce((result, field) => {
    const value = typeof query[field] === 'string' ? query[field].trim() : ''
    if (value) result[field] = value
    return result
  }, {})
}

function construirWhere(filters, excludedField = null) {
  const clauses = []
  const params = {}
  Object.entries(filters).forEach(([field, value]) => {
    if (field === excludedField || !FIELDS[field]) return
    clauses.push(`${normalizarSql(FIELDS[field])} = ${normalizarSql(`@${field}`)}`)
    params[field] = value
  })
  return { clauses, params }
}

async function consultar(query, params) {
  const key = JSON.stringify([query, params])
  const cached = cache.get(key)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) return cached.data

  try {
    const [rows] = await bigquery.query({ query, params })
    cache.set(key, { createdAt: Date.now(), data: rows })
    return rows
  } catch (error) {
    console.error('❌ Error en consulta BigQuery:', error)
    throw error
  }
}

function limpiarCache() {
  cache.clear()
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 1024 * 1024) reject(new Error('El cuerpo de la solicitud es demasiado grande'))
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (_) {
        reject(new Error('El cuerpo JSON no es válido'))
      }
    })
    req.on('error', reject)
  })
}

function normalizarRegistro(data) {
  return WRITABLE_FIELDS.reduce((record, field) => {
    record[field] = data && data[field] !== undefined && data[field] !== null
      ? String(data[field]).trim()
      : ''
    return record
  }, {})
}

function valorSql(field) {
  if (field === 'fecha_ingreso' || field === 'fecha_muestra') {
    return `IF(@${field} = '', NULL, SAFE_CAST(@${field} AS DATE))`
  }
  return `NULLIF(@${field}, '')`
}

export async function crearRegistro(data) {
  const record = normalizarRegistro(data)
  if (!record.fecha_ingreso || !record.pedido_venta || !record.ubicacion) {
    throw new Error('Fecha de ingreso, pedido de venta y ubicación son obligatorios')
  }
  const columns = WRITABLE_FIELDS.map(field => FIELDS[field]).join(', ')
  const values = WRITABLE_FIELDS.map(valorSql).join(', ')
  const query = `INSERT INTO ${TABLE} (${columns}) VALUES (${values})`
  await bigquery.query({ query, params: record })
  limpiarCache()
  return record
}

export async function actualizarRegistro(pedidoVenta, data) {
  if (!pedidoVenta) throw new Error('Se requiere el "Pedido de Venta" para actualizar')
  const record = normalizarRegistro(data)
  const query = `
    UPDATE ${TABLE}
    SET
      ${FIELDS.generador} = @generador,
      ${FIELDS.producto_cliente} = @producto_cliente,
      ${FIELDS.transportista} = @transportista,
      ${FIELDS.tratamiento} = @tratamiento,
      ${FIELDS.ubicacion} = @ubicacion,
      ${FIELDS.tipo} = @tipo
    WHERE ${FIELDS.pedido_venta} = @pedido_venta
  `
  await bigquery.query({
    query,
    params: {
      pedido_venta: pedidoVenta,
      generador: record.generador,
      producto_cliente: record.producto_cliente,
      transportista: record.transportista,
      tratamiento: record.tratamiento,
      ubicacion: record.ubicacion,
      tipo: record.tipo
    }
  })
  limpiarCache()
  return { message: 'Registro actualizado exitosamente' }
}

export async function eliminarRegistro(pedidoVenta) {
  if (!pedidoVenta) throw new Error('Se requiere el "Pedido de Venta" para eliminar')
  const query = `DELETE FROM ${TABLE} WHERE ${FIELDS.pedido_venta} = @pedido_venta`
  await bigquery.query({ query, params: { pedido_venta: pedidoVenta } })
  limpiarCache()
  return { message: 'Registro eliminado exitosamente' }
}

export async function buscarOpciones(field, filters = {}, search = '', limit = 30) {
  if (!FIELDS[field]) throw new Error('Filtro no válido')
  const column = FIELDS[field]
  const where = construirWhere(filters, field)
  const clauses = [...where.clauses, `${column} IS NOT NULL`, `TRIM(CAST(${column} AS STRING)) != ''`]
  const params = { ...where.params }
  if (search.trim()) {
    clauses.push(`${normalizarSql(column)} LIKE CONCAT('%', ${normalizarSql('@search')}, '%')`)
    params.search = search.trim()
  }
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 50)
  const query = `
    SELECT ARRAY_AGG(TRIM(CAST(${column} AS STRING)) ORDER BY TRIM(CAST(${column} AS STRING)) LIMIT 1)[OFFSET(0)] AS valor
    FROM ${TABLE}
    WHERE ${clauses.join(' AND ')}
    GROUP BY ${normalizarSql(column)}
    ORDER BY valor
    LIMIT ${safeLimit}
  `
  return (await consultar(query, params)).map(row => row.valor).filter(Boolean)
}

export async function obtenerEstadisticas(filters = {}) {
  const where = construirWhere(filters)
  const ubicacion = FIELDS.ubicacion
  const fecha = FIELDS.fecha_ingreso

  const clauses = [
    ...where.clauses,
    `${ubicacion} IS NOT NULL`,
    `TRIM(CAST(${ubicacion} AS STRING)) != ''`,
    `${fecha} IS NOT NULL`
  ]

  const query = `
    SELECT
      CAST(${fecha} AS STRING) AS fecha_ingreso,
      ARRAY_AGG(TRIM(CAST(${ubicacion} AS STRING)) ORDER BY TRIM(CAST(${ubicacion} AS STRING)) LIMIT 1)[OFFSET(0)] AS ubicacion,
      COUNT(*) AS cantidad
    FROM ${TABLE}
    WHERE ${clauses.join(' AND ')}
    GROUP BY ${fecha}, ${normalizarSql(ubicacion)}
    ORDER BY fecha_ingreso ASC, cantidad DESC
  `

  const resultados = (await consultar(query, where.params)).map(row => ({
    fecha_ingreso: row.fecha_ingreso,
    ubicacion: row.ubicacion,
    cantidad: Number(row.cantidad) || 0
  }))

  return { total: resultados.reduce((sum, row) => sum + row.cantidad, 0), resultados }
}

export async function obtenerRegistros(filters = {}, limit = 200) {
  const where = construirWhere(filters)
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000)

  const query = `
    SELECT
      CAST(${FIELDS.fecha_ingreso} AS STRING) AS fecha_ingreso,
      CAST(${FIELDS.pedido_venta} AS STRING) AS pedido_venta,
      CAST(${FIELDS.ubicacion} AS STRING) AS ubicacion,
      CAST(${FIELDS.tratamiento} AS STRING) AS tratamiento,
      CAST(${FIELDS.tipo} AS STRING) AS tipo,
      CAST(${FIELDS.fecha_muestra} AS STRING) AS fecha_muestra,
      CAST(${FIELDS.generador} AS STRING) AS generador,
      CAST(${FIELDS.producto_cliente} AS STRING) AS producto_cliente,
      CAST(${FIELDS.transportista} AS STRING) AS transportista
    FROM ${TABLE}
    ${where.clauses.length ? `WHERE ${where.clauses.join(' AND ')}` : ''}
    ORDER BY ${FIELDS.fecha_ingreso} DESC
    LIMIT ${safeLimit}
  `

  return await consultar(query, where.params)
}

export default async function (req, res) {
  // Configurar Encabezados CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  // Responder de inmediato a las peticiones de verificación previa del navegador (Preflight OPTIONS)
  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    return res.end()
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    res.statusCode = 405
    return res.end(JSON.stringify({ success: false, error: 'Método no permitido' }))
  }

  try {
    if (req.method === 'POST') {
      const body = await leerCuerpo(req)
      const data = await crearRegistro(body)
      res.statusCode = 201
      return res.end(JSON.stringify({ success: true, data }))
    }

    if (req.method === 'PUT') {
      const body = await leerCuerpo(req)
      const url = new URL(req.url, 'http://localhost')
      const data = await actualizarRegistro(url.searchParams.get('pedido_venta') || body.pedido_venta, body)
      res.statusCode = 200
      return res.end(JSON.stringify({ success: true, data }))
    }

    if (req.method === 'DELETE') {
      const body = await leerCuerpo(req)
      const url = new URL(req.url, 'http://localhost')
      const data = await eliminarRegistro(url.searchParams.get('pedido_venta') || body.pedido_venta)
      res.statusCode = 200
      return res.end(JSON.stringify({ success: true, data }))
    }

    const url = new URL(req.url, 'http://localhost')
    const query = Object.fromEntries(url.searchParams.entries())
    const filters = filtrosDesdeQuery(query)
    let data

    if (query.action === 'opciones') {
      data = await buscarOpciones(query.field, filters, query.search || '', query.limit)
    } else if (query.action === 'registros') {
      data = await obtenerRegistros(filters, query.limit)
    } else if (!query.action || query.action === 'estadisticas') {
      data = await obtenerEstadisticas(filters)
    } else {
      res.statusCode = 400
      return res.end(JSON.stringify({ success: false, error: 'Acción no válida' }))
    }

    res.statusCode = 200
    return res.end(JSON.stringify({ success: true, data }))
  } catch (error) {
    console.error('❌ Error al consultar BigQuery:', error)
    res.statusCode = 500
    return res.end(JSON.stringify({ success: false, error: error.message }))
  }
}
