export async function exportRowsToExcel({ filename, sheetName, columns, rows }) {
  if (!process.client) return

  const XLSX = await import('xlsx')
  const data = [
    columns.map(column => column.label),
    ...rows.map(row => columns.map(column => column.value(row)))
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  const workbook = XLSX.utils.book_new()

  const headerStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '0F3D7A' } },
    font: { color: { rgb: 'FFFFFF' }, bold: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  }

  columns.forEach((_column, index) => {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: index })]
    if (cell) cell.s = headerStyle
  })
  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length - 1, c: columns.length - 1 } })
  }
  worksheet['!cols'] = columns.map((column, index) => ({
    wch: Math.max(String(column.label).length + 2, ...data.slice(1).map(row => String(row[index] || '').length + 2), 12)
  }))

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Registros')
  XLSX.writeFile(workbook, `${filename || sheetName || 'registros'}.xlsx`, { cellStyles: true })
}

export function readRowsFromExcelFile(file, expectedHeaders) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async event => {
      try {
        const rows = isXlsxFile(file)
          ? await parseXlsxContent(event.target.result)
          : parseTableContent(event.target.result)
        const headers = rows.shift() || []

        if (!headersMatch(headers, expectedHeaders)) {
          resolve({ matched: false, rows: [], headers })
          return
        }

        resolve({
          matched: true,
          rows: rows
            .filter(row => row.some(cell => cell))
            .map(row => {
              return expectedHeaders.reduce((record, header, index) => {
                record[header] = row[index] || ''
                return record
              }, {})
            })
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)

    if (isXlsxFile(file)) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file, 'utf-8')
    }
  })
}

export function parseActiveValue(value) {
  return String(value || '').trim().toLowerCase() !== 'inactivo'
}

function parseTableContent(content) {
  const parser = new DOMParser()
  const document = parser.parseFromString(content, 'text/html')
  const tableRows = Array.from(document.querySelectorAll('tr'))

  if (tableRows.length) {
    return tableRows.map(row => {
      return Array.from(row.children).map(cell => cell.textContent.trim())
    })
  }

  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')))
}

async function parseXlsxContent(content) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(content, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const firstSheet = workbook.Sheets[firstSheetName]

  return XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: '',
    raw: false
  }).map(row => row.map(cell => String(cell).trim()))
}

function isXlsxFile(file) {
  return /\.xlsx$/i.test(file.name || '')
}

function headersMatch(headers, expectedHeaders) {
  if (headers.length !== expectedHeaders.length) return false

  return expectedHeaders.every((header, index) => {
    return normalizeHeader(headers[index]) === normalizeHeader(header)
  })
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}
