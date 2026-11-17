import ExcelJS from 'exceljs'

export function crearPracticaSi() {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Aprendizaje · Excel intermedio'
  libro.calcProperties.fullCalcOnLoad = true
  const guia = libro.addWorksheet('Guía')
  ;[
    ['EXCEL INTERMEDIO · TEMA 1: FUNCIÓN SI'],
    ['1. Revisa la hoja Ejemplo resuelto. Selecciona una celda de resultado para ver su fórmula.'],
    ['2. Cambia los datos del ejemplo y observa cómo cambia el resultado.'],
    ['3. En Ejercicios, escribe una fórmula SI en cada celda amarilla de la columna E.'],
    ['4. Resuelve la primera fila de cada ejercicio y arrastra la fórmula hasta la última fila del bloque.'],
    ['5. Compara tus resultados con la hoja Soluciones cuando termines.'],
    ['Sintaxis: =SI(prueba_lógica; valor_si_verdadero; valor_si_falso)'],
    ['Escribe los textos entre comillas. El separador puede ser punto y coma o coma según tu configuración.'],
    ['Las fórmulas del archivo se adaptan al idioma de Excel al abrirlo.'],
    ['Operadores: >= mayor o igual; > mayor; < menor; = igual; <> distinto.']
  ].forEach(fila => guia.addRow(fila))
  guia.getColumn(1).width = 110

  const ejemplo = libro.addWorksheet('Ejemplo resuelto')
  ejemplo.addRow(['EJEMPLO: APROBADO O DESAPROBADO'])
  ejemplo.addRow(['Regla: una nota mayor o igual a 11 significa Aprobado; de lo contrario, Desaprobado.'])
  ejemplo.addRow(['Cambia una nota en B y revisa la fórmula de C.'])
  ejemplo.addRow(['Alumno', 'Nota', 'Resultado', 'Fórmula de referencia (Excel en español)'])
  ;[['Ana', 15], ['Luis', 8], ['Rosa', 11], ['Juan', 10]].forEach(([nombre, nota], indice) => {
    const fila = indice + 5
    ejemplo.addRow([nombre, nota, { formula: `IF(B${fila}>=11,"Aprobado","Desaprobado")`, result: nota >= 11 ? 'Aprobado' : 'Desaprobado' },
      `=SI(B${fila}>=11; "Aprobado"; "Desaprobado")`])
    ejemplo.getCell(`B${fila}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
  })

  const ejercicios = libro.addWorksheet('Ejercicios')
  const soluciones = libro.addWorksheet('Soluciones')
  const bloques = [
    { titulo: '1. Evaluación de notas', regla: 'Nota >= 11: Aprobado; de lo contrario: Desaprobado.',
      campo: 'Nota', valores: [15, 8, 11, 10, 20], operador: '>=', limite: 11, si: 'Aprobado', no: 'Desaprobado' },
    { titulo: '2. Meta de ventas', regla: 'Venta >= 5000: Meta cumplida; de lo contrario: Pendiente.',
      campo: 'Venta (S/)', valores: [6500, 4999, 5000, 3200, 8000], operador: '>=', limite: 5000, si: 'Meta cumplida', no: 'Pendiente' },
    { titulo: '3. Reposición de stock', regla: 'Stock < 10: Reponer; de lo contrario: Suficiente.',
      campo: 'Stock', valores: [4, 10, 25, 0, 9], operador: '<', limite: 10, si: 'Reponer', no: 'Suficiente' },
    { titulo: '4. Control de vencimiento', regla: 'Días restantes < 0: Vencido; de lo contrario: Vigente.',
      campo: 'Días restantes', valores: [-5, 0, 12, -1, 30], operador: '<', limite: 0, si: 'Vencido', no: 'Vigente' },
    { titulo: '5. Descuento por compra', regla: 'Si la compra es >= 1000, calcula 10% de descuento; de lo contrario, devuelve 0.',
      campo: 'Compra (S/)', valores: [1000, 750, 2400, 999, 5000], operador: '>=', limite: 1000, descuento: true }
  ]
  for (const hoja of [ejercicios, soluciones]) {
    hoja.addRow([hoja === ejercicios ? 'PRÁCTICA · Completa las celdas amarillas con fórmulas SI' : 'SOLUCIONES · Consulta después de resolver la práctica'])
    hoja.addRow(['En cada bloque, escribe la fórmula en E y cópiala hacia abajo. Los casos incluyen los valores límite.'])
    bloques.forEach(bloque => {
      hoja.addRow([])
      hoja.addRow([bloque.titulo])
      hoja.addRow([bloque.regla])
      const encabezado = hoja.addRow(['Caso', bloque.campo, 'Operador', 'Límite', 'Tu fórmula / Resultado', 'Fórmula de referencia (Excel en español)'])
      encabezado.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B47' } }
      bloque.valores.forEach((valor, indice) => {
        const fila = hoja.rowCount + 1
        const condicion = `B${fila}${bloque.operador}D${fila}`
        const verdadero = bloque.descuento ? `B${fila}*10%` : `"${bloque.si}"`
        const falso = bloque.descuento ? '0' : `"${bloque.no}"`
        const cumple = bloque.operador === '>=' ? valor >= bloque.limite : valor < bloque.limite
        const resultado = bloque.descuento ? (cumple ? valor * 0.1 : 0) : (cumple ? bloque.si : bloque.no)
        hoja.addRow([`Caso ${indice + 1}`, valor, bloque.operador, bloque.limite,
          hoja === soluciones ? { formula: `IF(${condicion},${verdadero},${falso})`, result: resultado } : null,
          hoja === soluciones ? `=SI(${condicion}; ${verdadero}; ${falso})` : null])
        hoja.getCell(`E${fila}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
        if (bloque.descuento) hoja.getCell(`E${fila}`).numFmt = '#,##0.00'
      })
    })
  }
  for (const hoja of [ejemplo, ejercicios, soluciones]) {
    ;[26, 22, 22, 22, 30, 65].forEach((ancho, indice) => { hoja.getColumn(indice + 1).width = ancho })
    hoja.views = [{ state: 'frozen', ySplit: hoja === ejemplo ? 4 : 2 }]
    // Las instrucciones ocupan el ancho de la tabla sin ocultar columnas de datos.
    hoja.eachRow(fila => {
      if (fila.actualCellCount === 1) hoja.mergeCells(fila.number, 1, fila.number, 6)
    })
  }
  libro.eachSheet(hoja => {
    hoja.eachRow(fila => {
      fila.alignment = { vertical: 'middle', wrapText: true }
      fila.height = 32
    })
    hoja.getRow(1).font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } }
    hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B47' } }
    hoja.getRow(1).height = 40
  })
  return libro
}

export async function descargarPracticaSi() {
  const buffer = await crearPracticaSi().xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'Excel-intermedio-Tema-1-Funcion-SI.xlsx'
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
