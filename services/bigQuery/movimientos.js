import { BigQuery } from '@google-cloud/bigquery'
import path from 'path'

const TABLE = '`light-height-446600-i4.lab_historico.control_cisternas`'
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './configGoogle/credentialsPath.json'
const bigquery = new BigQuery({ 
  projectId: process.env.GCP_PROJECT_ID || 'light-height-446600-i4', 
  keyFilename: path.resolve(process.cwd(), credentialsPath) 
})

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
  const [rows] = await bigquery.query({ query, params })
  cache.set(key, { createdAt: Date.now(), data: rows })
  return rows
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
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (req.method !== 'GET') {
    res.statusCode = 405
    return res.end(JSON.stringify({ success: false, error: 'Método no permitido' }))
  }
  try {
    const url = new URL(req.url, 'http://localhost')
    const query = Object.fromEntries(url.searchParams.entries())
    const filters = filtrosDesdeQuery(query)
    let data
    if (query.action === 'opciones') data = await buscarOpciones(query.field, filters, query.search || '', query.limit)
    else if (query.action === 'registros') data = await obtenerRegistros(filters, query.limit)
    else if (!query.action || query.action === 'estadisticas') data = await obtenerEstadisticas(filters)
    else {
      res.statusCode = 400
      return res.end(JSON.stringify({ success: false, error: 'Acción no válida' }))
    }
    res.statusCode = 200
    return res.end(JSON.stringify({ success: true, data }))
  } catch (error) {
    console.error('Error al consultar BigQuery:', error)
    res.statusCode = 500
    return res.end(JSON.stringify({ success: false, error: error.message }))
  }
}