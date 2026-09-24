import ExcelJS from 'exceljs'

const NAVY = 'FF1F4E79'

export async function exportCisternaExcel({ columns, rows }) {
  if (!process.client) return
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Kanay'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Ingresos', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  })
  sheet.columns = [16, 23, 23, 32, 15, 24, 16, 16, 16, 28, 22, 45, 45].map(width => ({ width }))
  sheet.mergeCells('A1:B1')
  sheet.mergeCells('C1:M1')
  sheet.getCell('C1').value = 'REPORTE DE RECEPCI\u00d3N DE CISTERNAS'
  sheet.getCell('C1').font = { name: 'Arial', size: 16, bold: true, color: { argb: NAVY } }
  sheet.getCell('C1').alignment = { horizontal: 'left', vertical: 'middle' }
  sheet.mergeCells('A2:M2')
  sheet.getCell('A2').value = `Fecha de generaci\u00f3n: ${new Date().toLocaleDateString('es-PE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })} | Registros: ${rows.length}`
  sheet.getCell('A2').font = { name: 'Arial', size: 10, color: { argb: 'FF666666' } }
  sheet.getCell('A2').alignment = { vertical: 'middle' }
  try {
    const response = await fetch('/kanay.jpeg')
    if (!response.ok) throw new Error('No se pudo cargar el logo')
    const blob = await response.blob()
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    const imageId = workbook.addImage({ base64, extension: 'jpeg' })
    sheet.addImage(imageId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 120, height: 40 } })
  } catch (error) {
    console.warn('No se pudo incluir el logo en el Excel:', error)
  }
  const border = color => Object.fromEntries(['top', 'bottom', 'left', 'right'].map(side => [side, { style: 'thin', color: { argb: color } }]))
  columns.forEach((column, index) => {
    const cell = sheet.getRow(3).getCell(index + 1)
    cell.value = column.label
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = border('FFFFFFFF')
  })
  rows.forEach((record, index) => {
    const row = sheet.getRow(index + 4)
    columns.forEach((column, colIndex) => {
      const cell = row.getCell(colIndex + 1)
      cell.value = column.value(record) ?? ''
      cell.font = { name: 'Arial', size: 11 }
      cell.alignment = { horizontal: typeof cell.value === 'number' ? 'right' : 'left', vertical: 'middle', wrapText: true }
      cell.border = border('FFE0E0E0')
      if (colIndex >= 6 && colIndex <= 8) cell.numFmt = '#,##0.00'
    })
    row.height = 45
  })
  sheet.getRow(1).height = 50
  sheet.getRow(2).height = 25
  sheet.getRow(3).height = 30
  sheet.views = [{ state: 'frozen', ySplit: 3 }]
  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: rows.length + 3, column: columns.length } }
  sheet.pageSetup.printTitlesRow = '1:3'
  const buffer = await workbook.xlsx.writeBuffer()
  const url = window.URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'ingresos-cisterna.xlsx'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}
