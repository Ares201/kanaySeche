import ExcelJS from 'exceljs'

const NAVY = 'FF1F4E79'
const WHITE = 'FFFFFFFF'
const LIGHT_BLUE = 'FFEAF3F8'
const BORDER = 'FFE0E0E0'

function asDate(value) {
  if (value && typeof value.toDate === 'function') return value.toDate()
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value) {
  const date = asDate(value)
  return date ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : 'Sin fecha'
}

async function addLogo(workbook, worksheet) {
  const response = await fetch('/kanay.jpeg')
  if (!response.ok) throw new Error('No se pudo cargar el logo.')
  const blob = await response.blob()
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
  const imageId = workbook.addImage({ base64, extension: 'jpeg' })
  worksheet.addImage(imageId, { tl: { col: 0.15, row: 0.35 }, ext: { width: 120, height: 48 } })
}

function downloadWorkbook(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

export async function exportRequerimientoExcel(requerimiento) {
  if (!process.client) return
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Kanay - Seché'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Requerimiento', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
  })
  sheet.views = [{ state: 'frozen', ySplit: 4 }]
  sheet.columns = [{ width: 8 }, { width: 19 }, { width: 45 }, { width: 20 }]
  sheet.properties.defaultRowHeight = 22
  sheet.getRow(1).height = 35
  sheet.getRow(2).height = 31
  sheet.mergeCells('C1:D1')
  sheet.mergeCells('C2:D2')
  const title = sheet.getCell('C1')
  title.value = 'REQUERIMIENTO DE ÚTILES DE OFICINA'
  title.font = { name: 'Arial', size: 14, bold: true, color: { argb: NAVY } }
  title.alignment = { vertical: 'middle' }
  const subtitle = sheet.getCell('C2')
  subtitle.value = 'Kanay - Seché'
  subtitle.font = { name: 'Arial', size: 11, color: { argb: NAVY } }
  subtitle.alignment = { vertical: 'middle' }

  try {
    await addLogo(workbook, sheet)
  } catch (error) {
    // El archivo se puede generar aunque la imagen no esté disponible.
    console.warn('No se pudo cargar el logo del requerimiento:', error)
  }

  const headers = ['N°', 'Código', 'Producto', 'Solicitado']
  const headerRow = sheet.getRow(4)
  headerRow.height = 30
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = header
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { bottom: { style: 'thin', color: { argb: WHITE } } }
  })

  const lines = requerimiento.items || []
  lines.forEach((line, index) => {
    const row = sheet.getRow(index + 5)
    row.values = [index + 1, line.codigo || '', line.nombre || '', Number(line.cantidad) || 0]
    row.height = 28
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } }
      cell.alignment = { vertical: 'middle', horizontal: column === 3 ? 'left' : 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: BORDER } },
        bottom: { style: 'thin', color: { argb: BORDER } },
        left: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } }
      }
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } }
    })
  })

  const totalRow = sheet.getRow(lines.length + 5)
  totalRow.getCell(3).value = 'TOTAL'
  totalRow.getCell(4).value = lines.reduce((sum, line) => sum + (Number(line.cantidad) || 0), 0)
  totalRow.eachCell({ includeEmpty: true }, cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.font = { name: 'Arial', bold: true, color: { argb: WHITE } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  totalRow.height = 28

  const footerRow = lines.length + 7
  sheet.mergeCells(`A${footerRow}:D${footerRow}`)
  const footer = sheet.getCell(`A${footerRow}`)
  footer.value = `Generado el ${formatDate(new Date())}`
  footer.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } }
  sheet.pageSetup.printArea = `A1:D${footerRow}`

  const date = asDate(requerimiento.fechaCreacion)
  const datePart = date ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  const idPart = String(requerimiento.id || 'nuevo').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12)
  const buffer = await workbook.xlsx.writeBuffer()
  downloadWorkbook(buffer, `Requerimiento_${datePart}_${idPart}.xlsx`)
}
