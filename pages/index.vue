<template>
  <section class="home-page">
    <!-- Estrellas/Partículas flotando -->
    <div class="particles-container" aria-hidden="true">
      <div v-for="n in 40" :key="n" class="particle" :style="{
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animationDuration: (8 + Math.random() * 18) + 's',
        animationDelay: (Math.random() * -15) + 's',
        width: (2 + Math.random() * 5) + 'px',
        height: (2 + Math.random() * 5) + 'px',
        opacity: 0.3 + Math.random() * 0.6
      }"></div>
    </div>

    <!-- Estrellas más grandes (destellos) -->
    <div class="particles-container" aria-hidden="true">
      <div v-for="n in 8" :key="'big-' + n" class="particle star-big" :style="{
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animationDuration: (12 + Math.random() * 15) + 's',
        animationDelay: (Math.random() * -10) + 's',
        width: (6 + Math.random() * 10) + 'px',
        height: (6 + Math.random() * 10) + 'px',
        opacity: 0.2 + Math.random() * 0.4
      }"></div>
    </div>

    <!-- Header superior -->
    <header class="page-header">
      <div class="header-left">
        <span class="brand">🌿 Ecocentro Chilca</span>
      </div>
      <div class="header-right">
        <span class="date-badge">{{ currentDate }}</span>
      </div>
    </header>

    <!-- Bienvenida -->
    <div class="welcome-section">
      <h1>👋 Bienvenido, {{ userName }}</h1>
      <p class="welcome-sub">Panel de control · {{ userRole }}</p>
    </div>

    <!-- ===== SECCIÓN 1: PEDIDO DE VENTA ===== -->
    <section class="section-control">
      <div class="section-header">
        <h2>📊 Estado de Pedido de Venta</h2>
        <span class="section-subtitle">Total: {{ expedientes.length }}</span>
      </div>

      <div class="control-cards">
        <!-- Tarjeta: Vencidos > 10 días (DESTACADA) -->
        <div class="control-card vencidos">
          <div class="control-card-header">
            <span class="status-dot danger"></span>
            <span class="badge danger">⚠️ Urgente</span>
          </div>
          <span class="control-number">{{ expedientesVencidos.length }}</span>
          <span class="control-label">Vencidos > 10 días</span>
          <span class="control-detail">Sin actualizar</span>
          <div class="card-actions">
            <span class="control-action" @click="goToVencidos">Revisar ahora →</span>
            <button class="btn-excel" @click="exportVencidosExcel" title="Exportar a Excel">
              📥 Excel
            </button>
          </div>
        </div>

        <!-- Tarjeta: Pendiente -->
        <div class="control-card emitido" @click="goToFilter('Pendiente')">
          <div class="control-card-header">
            <span class="status-dot warning"></span>
            <span class="badge">Pendiente</span>
          </div>
          <span class="control-number">{{ expedientesPorEstado.Pendiente || 0 }}</span>
          <span class="control-label">Pedidos de venta pendientes</span>
          <span class="control-action">Ver todos →</span>
        </div>

        <!-- Tarjeta: Notificado -->
        <div class="control-card enviado" @click="goToFilter('Notificado')">
          <div class="control-card-header">
            <span class="status-dot info"></span>
            <span class="badge">Notificado</span>
          </div>
          <span class="control-number">{{ expedientesPorEstado.Notificado || 0 }}</span>
          <span class="control-label">Pedidos de venta notificados</span>
          <span class="control-action">Ver todos →</span>
        </div>

        <!-- Tarjeta: Regularizado -->
        <div class="control-card entregado" @click="goToFilter('Regularizado')">
          <div class="control-card-header">
            <span class="status-dot success"></span>
            <span class="badge">Regularizado</span>
          </div>
          <span class="control-number">{{ expedientesPorEstado.Regularizado || 0 }}</span>
          <span class="control-label">Pedidos de venta regularizados</span>
          <span class="control-action">Ver todos →</span>
        </div>

      </div>
    </section>

    <!-- ===== SECCIÓN 2: CARTAS ===== -->
    <section class="section-control section-cartas">
      <div class="section-header">
        <h2>📋 Estado de Cartas</h2>
        <span class="section-subtitle">Total: {{ cartas.length }}</span>
      </div>

      <div class="control-cards">
        <!-- Tarjeta: Vencidos > 10 días (DESTACADA) -->
        <div class="control-card vencidos">
          <div class="control-card-header">
            <span class="status-dot danger"></span>
            <span class="badge danger">⚠️ Urgente</span>
          </div>
          <span class="control-number">{{ cartasVencidas.length }}</span>
          <span class="control-label">Vencidas > 10 días</span>
          <span class="control-detail">Sin actualizar</span>
          <div class="card-actions">
            <span class="control-action" @click="goToCartasVencidas">Revisar ahora →</span>
            <button class="btn-excel" @click="exportCartasVencidasExcel" title="Exportar a Excel">
              📥 Excel
            </button>
          </div>
        </div>

        <!-- Tarjeta: Emitido -->
        <div class="control-card emitido" @click="goToCartasFilter('Emitido')">
          <div class="control-card-header">
            <span class="status-dot warning"></span>
            <span class="badge">Emitido</span>
          </div>
          <span class="control-number">{{ cartasPorEstado.Emitido || 0 }}</span>
          <span class="control-label">Cartas emitidas</span>
          <span class="control-action">Ver todos →</span>
        </div>

        <!-- Tarjeta: Enviado -->
        <div class="control-card enviado" @click="goToCartasFilter('Enviado')">
          <div class="control-card-header">
            <span class="status-dot info"></span>
            <span class="badge">Enviado</span>
          </div>
          <span class="control-number">{{ cartasPorEstado.Enviado || 0 }}</span>
          <span class="control-label">Cartas enviadas</span>
          <span class="control-action">Ver todos →</span>
        </div>

        <!-- Tarjeta: Entregado -->
        <div class="control-card entregado" @click="goToCartasFilter('Entregado')">
          <div class="control-card-header">
            <span class="status-dot success"></span>
            <span class="badge">Entregado</span>
          </div>
          <span class="control-number">{{ cartasPorEstado.Entregado || 0 }}</span>
          <span class="control-label">Cartas entregadas</span>
          <span class="control-action">Ver todos →</span>
        </div>
      </div>
    </section>

  </section>
</template>

<script>
import {
  normalizeExpediente,
  toExpedientePayload,
  ESTADOS_EXPEDIENTE,
} from '~/models/expediente'
import ExcelJS from 'exceljs'

// ===== FUNCIONES DE CARTA (COPIADAS DIRECTAMENTE DE TU PÁGINA DE CARTAS) =====
// NO MODIFICAR NADA, SOLO COPIAR Y PEGAR

function normalizeCarta(carta) {
  const source = carta || {}
  const cliente = source.cliente || {}

  return {
    id: source.id || '',
    correlativo: source.correlativo || '',
    fecha: source.fecha || '',
    fechaServicio: source.fechaServicio || '',
    fechaCulmino: source.fechaCulmino || '',
    cliente: {
      nombre: cliente.nombre || '',
      ruc: cliente.ruc || '',
      direccion: cliente.direccion || '',
      contactoNombre: cliente.contactoNombre || '',
      contactoTelefono: cliente.contactoTelefono || ''
    },
    asunto: source.asunto || '',
    contexto: source.contexto || '',
    detalles: source.detalles || [],
    despedida: source.despedida || '',
    estadoProceso: source.estadoProceso || 'Emitido',
    estado: source.estado || source.estadoProceso || 'Emitido',
    tokenConfirmacion: source.tokenConfirmacion || '',
    confirmacion: source.confirmacion || {},
    cargo: source.cargo || {},
    fechaCreacion: source.fechaCreacion || new Date()
  }
}
// ===== FIN FUNCIONES DE CARTA =====

export default {
  name: 'IndexPage',
  data: () => ({
    selectedBackground: 0,
    expedientes: [],
    cartas: [],
    loading: false,
    backgrounds: [
      {
        url: 'https://s1.significados.com/foto/medio-ambiente-og.jpg',
        alt: 'Ecocentro Chilca'
      }
    ]
  }),
  computed: {
    userName() {
      return this.$auth?.state?.session?.nombres || 'Usuario'
    },
    userRole() {
      return this.$auth?.state?.session?.rolNombre || 'Administrador'
    },
    currentDate() {
      return new Date().toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    },
    backgroundStyle() {
      const background = this.backgrounds[0]
      return { backgroundImage: `url("${background.url}")` }
    },

    // ===== COMPUTED DE EXPEDIENTES =====
    expedientesVencidos() {
      const today = new Date()
      const tenDaysAgo = new Date(today)
      tenDaysAgo.setDate(today.getDate() - 10)
      const estadosExcluidos = ['Cerrado', 'Regularizado']
      return this.expedientes.filter(exp => {
        if (estadosExcluidos.includes(exp.estado)) return false
        if (!exp.fecha) return true
        const fecha = new Date(exp.fecha)
        return fecha <= tenDaysAgo
      })
    },
    expedientesPorEstado() {
      const grouped = {}
      ESTADOS_EXPEDIENTE.forEach(estado => {
        grouped[estado] = 0
      })
      this.expedientes.forEach(exp => {
        const estado = exp.estado || 'Pendiente'
        if (grouped[estado] !== undefined) {
          grouped[estado]++
        }
      })
      return grouped
    },

    // ===== COMPUTED DE CARTAS =====
    cartasVencidas() {
      const today = new Date()
      const tenDaysAgo = new Date(today)
      tenDaysAgo.setDate(today.getDate() - 10)

      const estadosActivos = ['Emitido', 'Enviado', 'Pendiente de Confirmación']

      return this.cartas.filter(carta => {
        if (carta.estadoProceso === 'Entregado') return false
        if (carta.estado === 'Entregado') return false
        if (!estadosActivos.includes(carta.estadoProceso)) return false

        const fecha = this.extraerFecha(carta.fechaServicio)
        if (!fecha) return true
        if (isNaN(fecha.getTime())) return true

        return fecha <= tenDaysAgo
      })
    },
    cartasPorEstado() {
      const grouped = {
        Emitido: 0,
        Enviado: 0,
        Entregado: 0,
        'Pendiente de Confirmación': 0,
        Anulado: 0
      }

      this.cartas.forEach(carta => {
        const estado = carta.estadoProceso || 'Emitido'
        if (grouped[estado] !== undefined) {
          grouped[estado]++
        }
      })

      return grouped
    }
  },
  mounted() {
    this.getAllExpedientes()
    this.getAllCartas()
  },
  methods: {
    extraerFecha(timestamp) {
      if (!timestamp) return null

      // Si es un timestamp de Firestore con seconds
      if (timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000)
      }

      // Si tiene método toDate (Timestamp de Firestore)
      if (timestamp.toDate) {
        return timestamp.toDate()
      }

      // Si es string o Date normal
      return new Date(timestamp)
    },
    // ===== CARGAR EXPEDIENTES =====
    async getAllExpedientes() {
      this.loading = true
      try {
        const data = await this.$firebaseApi.list('expedientes')
        const allExpedientes = data.map(normalizeExpediente)
        this.expedientes = allExpedientes
        console.log('Expedientes cargados:', this.expedientes.length)
      } catch (error) {
        alert('No se pudieron cargar los expedientes')
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    // ===== CARGAR CARTAS =====
    async getAllCartas() {
      try {
        const data = await this.$firebaseApi.list('cartas')
        const allCartas = data.map(normalizeCarta)
        this.cartas = allCartas
        console.log('Cartas cargadas:', this.cartas.length)
        console.log('Cartas vencidas:', this.cartasVencidas.length)
      } catch (error) {
        console.error('No se pudieron cargar las cartas:', error)
      }
    },

    // ===== EXPORTAR EXCEL DE EXPEDIENTES VENCIDOS =====
    async exportVencidosExcel() {
      if (this.expedientesVencidos.length === 0) {
        alert('No hay expedientes vencidos para exportar')
        return
      }

      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Vencidos')

        worksheet.columns = [
          { width: 15 }, { width: 12 }, { width: 14 }, { width: 25 },
          { width: 20 }, { width: 20 }, { width: 30 }, { width: 20 },
          { width: 15 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 14 }
        ]

        try {
          const response = await fetch('/kanay.jpeg')
          const blob = await response.blob()
          const reader = new FileReader()
          const imageBase64 = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result)
            reader.readAsDataURL(blob)
          })
          const imageId = workbook.addImage({
            base64: imageBase64.split(',')[1],
            extension: 'jpeg',
          })
          worksheet.addImage(imageId, {
            tl: { col: 0.1, row: 0.1 },
            ext: { width: 120, height: 40 }
          })
          worksheet.mergeCells('A1:B1')
          const titleCell = worksheet.getCell('C1')
          titleCell.value = '📋 REPORTE DE EXPEDIENTES VENCIDOS'
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F4E79' } }
          titleCell.alignment = { horizontal: 'left', vertical: 'middle' }
          worksheet.mergeCells('C1:M1')
        } catch (error) {
          console.warn('No se pudo cargar el logo:', error)
          const titleCell = worksheet.getCell('A1')
          titleCell.value = '📋 REPORTE DE EXPEDIENTES VENCIDOS'
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F4E79' } }
          worksheet.mergeCells('A1:M1')
        }

        const fechaSubtitle = worksheet.getCell('A2')
        fechaSubtitle.value = `Fecha de generación: ${new Date().toLocaleDateString('es-PE', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}`
        fechaSubtitle.font = { name: 'Arial', size: 10, color: { argb: 'FF666666' } }
        fechaSubtitle.alignment = { horizontal: 'left', vertical: 'middle' }
        worksheet.mergeCells('A2:M2')

        const headers = [
          'Correlativo', 'Sede', 'Fecha', 'Cliente', 'Transportista',
          'Generador PV', 'Observaciones', 'Acción Inmediata', 'Planner',
          'Estado', 'Estado PV', 'Tipo Servicio', 'Días Vencidos'
        ]
        const headerRow = worksheet.getRow(3)
        headers.forEach((text, index) => {
          const cell = headerRow.getCell(index + 1)
          cell.value = text
        })

        this.expedientesVencidos.forEach((exp, index) => {
          const rowNumber = index + 4
          const row = worksheet.getRow(rowNumber)
          row.getCell(1).value = exp.correlativo || ''
          row.getCell(2).value = exp.sede || 'Chilca'
          row.getCell(3).value = exp.fecha ? this.formatDateExcel(exp.fecha) : ''
          row.getCell(4).value = exp.cliente?.nombre || ''
          row.getCell(5).value = exp.transportista || ''
          row.getCell(6).value = exp.generadorPv || ''
          row.getCell(7).value = exp.observaciones || ''
          row.getCell(8).value = exp.accionInmediata || ''
          row.getCell(9).value = exp.planner || ''
          row.getCell(10).value = exp.estado || ''
          row.getCell(11).value = exp.estadoPV || ''
          row.getCell(12).value = exp.tipoServicio || ''
          row.getCell(13).value = this.calcularDias(exp.fecha)
        })

        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
          }
        })

        for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber++) {
          const row = worksheet.getRow(rowNumber)
          row.eachCell((cell) => {
            cell.alignment = { horizontal: 'left', vertical: 'middle' }
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            }
          })
        }

        worksheet.getRow(1).height = 50
        worksheet.getRow(2).height = 25
        worksheet.getRow(3).height = 30

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const fecha = new Date().toISOString().slice(0, 10)
        link.download = `Expedientes_Vencidos_${fecha}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        this.$toast?.success('📥 Excel exportado correctamente')
      } catch (error) {
        console.error('Error al exportar Excel:', error)
        alert('Error al exportar Excel: ' + error.message)
      }
    },

    // ===== EXPORTAR EXCEL DE CARTAS VENCIDAS =====
    // ===== EXPORTAR EXCEL DE CARTAS VENCIDAS =====
    async exportCartasVencidasExcel() {
      if (this.cartasVencidas.length === 0) {
        alert('No hay cartas vencidas para exportar')
        return
      }

      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Cartas Vencidas')

        worksheet.columns = [
          { width: 15 }, // Correlativo
          { width: 25 }, // Cliente
          { width: 14 }, // Fecha
          { width: 20 }, // Asunto
          { width: 15 }, // Estado
          { width: 14 }  // Días Vencidos
        ]

        // Insertar logo...
        try {
          const response = await fetch('/kanay.jpeg')
          const blob = await response.blob()
          const reader = new FileReader()
          const imageBase64 = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result)
            reader.readAsDataURL(blob)
          })
          const imageId = workbook.addImage({
            base64: imageBase64.split(',')[1],
            extension: 'jpeg',
          })
          worksheet.addImage(imageId, {
            tl: { col: 0.1, row: 0.1 },
            ext: { width: 120, height: 40 }
          })
          worksheet.mergeCells('A1:B1')
          const titleCell = worksheet.getCell('C1')
          titleCell.value = '📋 REPORTE DE CARTAS VENCIDAS'
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F4E79' } }
          titleCell.alignment = { horizontal: 'left', vertical: 'middle' }
          worksheet.mergeCells('C1:F1')
        } catch (error) {
          console.warn('No se pudo cargar el logo:', error)
          const titleCell = worksheet.getCell('A1')
          titleCell.value = '📋 REPORTE DE CARTAS VENCIDAS'
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1F4E79' } }
          worksheet.mergeCells('A1:F1')
        }

        const fechaSubtitle = worksheet.getCell('A2')
        fechaSubtitle.value = `Fecha de generación: ${new Date().toLocaleDateString('es-PE', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}`
        fechaSubtitle.font = { name: 'Arial', size: 10, color: { argb: 'FF666666' } }
        fechaSubtitle.alignment = { horizontal: 'left', vertical: 'middle' }
        worksheet.mergeCells('A2:F2')

        const headers = [
          'Correlativo', 'Cliente', 'Fecha', 'Asunto', 'Estado', 'Días Vencidos'
        ]
        const headerRow = worksheet.getRow(3)
        headers.forEach((text, index) => {
          const cell = headerRow.getCell(index + 1)
          cell.value = text
        })

        // ===== DATOS: EXTRAER FECHA CORRECTAMENTE =====
        this.cartasVencidas.forEach((carta, index) => {
          const rowNumber = index + 4
          const row = worksheet.getRow(rowNumber)

          // 🔥 Extraer fecha del timestamp de Firestore
          let fechaServicio = carta.fechaServicio
          let fechaObj = null

          if (fechaServicio) {
            if (fechaServicio.seconds !== undefined) {
              fechaObj = new Date(fechaServicio.seconds * 1000)
            } else if (fechaServicio.toDate) {
              fechaObj = fechaServicio.toDate()
            } else {
              fechaObj = new Date(fechaServicio)
            }
          }

          row.getCell(1).value = carta.correlativo || ''
          row.getCell(2).value = carta.cliente?.nombre || ''
          row.getCell(3).value = fechaObj && !isNaN(fechaObj.getTime())
            ? this.formatDateExcel(fechaObj)
            : ''
          row.getCell(4).value = carta.asunto || ''
          row.getCell(5).value = carta.estadoProceso || ''
          row.getCell(6).value = fechaObj && !isNaN(fechaObj.getTime())
            ? this.calcularDias(fechaObj)
            : 'N/A'
        })

        // Estilos de cabecera...
        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } }
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
          }
        })

        // Estilos de datos...
        for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber++) {
          const row = worksheet.getRow(rowNumber)
          row.eachCell((cell) => {
            cell.alignment = { horizontal: 'left', vertical: 'middle' }
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            }
          })
        }

        worksheet.getRow(1).height = 50
        worksheet.getRow(2).height = 25
        worksheet.getRow(3).height = 30

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        const fecha = new Date().toISOString().slice(0, 10)
        link.download = `Cartas_Vencidas_${fecha}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        this.$toast?.success('📥 Excel exportado correctamente')
      } catch (error) {
        console.error('Error al exportar Excel:', error)
        alert('Error al exportar Excel: ' + error.message)
      }
    },

    // ===== FORMATO DE FECHA =====
    // ===== FORMATO DE FECHA =====
    formatDateExcel(fecha) {
      if (!fecha) return ''

      // 🔥 Si es timestamp de Firestore, extraer fecha
      let fechaObj = fecha
      if (fecha.seconds !== undefined) {
        fechaObj = new Date(fecha.seconds * 1000)
      } else if (fecha.toDate) {
        fechaObj = fecha.toDate()
      } else {
        fechaObj = new Date(fecha)
      }

      if (isNaN(fechaObj.getTime())) return ''

      const day = String(fechaObj.getDate()).padStart(2, '0')
      const month = String(fechaObj.getMonth() + 1).padStart(2, '0')
      const year = fechaObj.getFullYear()
      return `${day}/${month}/${year}`
    },

    // ===== CALCULAR DÍAS VENCIDOS =====
    calcularDias(fecha) {
      if (!fecha) return 'N/A'

      // 🔥 Si es timestamp de Firestore, extraer fecha
      let fechaObj = fecha
      if (fecha.seconds !== undefined) {
        fechaObj = new Date(fecha.seconds * 1000)
      } else if (fecha.toDate) {
        fechaObj = fecha.toDate()
      } else {
        fechaObj = new Date(fecha)
      }

      if (isNaN(fechaObj.getTime())) return 'N/A'

      const today = new Date()
      const diffTime = Math.abs(today - fechaObj)
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    },

    // ===== NAVEGACIÓN EXPEDIENTES =====
    goToVencidos() {
      this.$router.push({
        path: '/documentos/controlDeIngresos',
        query: { filter: 'vencidos' }
      })
    },
    goToFilter(estado) {
      this.$router.push({
        path: '/documentos/controlDeIngresos',
        query: { estado }
      })
    },

    // ===== NAVEGACIÓN CARTAS =====
    goToCartasVencidas() {
      this.$router.push({
        path: '/documentos/cartas',
        query: { filter: 'vencidos' }
      })
    },
    goToCartasFilter(estado) {
      this.$router.push({
        path: '/documentos/cartas',
        query: { estado }
      })
    }
  }
}
</script>

<style scoped>
/* ===== ESTILOS: UNIVERSO (PÚRPURA + AZUL + NEGRO) ===== */
.home-page {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: 28px clamp(24px, 5vw, 60px);
  background:
    radial-gradient(ellipse at 20% 50%,
      rgba(120, 50, 180, 0.3) 0%,
      transparent 50%),
    radial-gradient(ellipse at 80% 30%,
      rgba(60, 30, 150, 0.25) 0%,
      transparent 45%),
    radial-gradient(ellipse at 50% 80%,
      rgba(200, 50, 150, 0.2) 0%,
      transparent 40%),
    linear-gradient(180deg,
      #050510 0%,
      #0a0a2a 20%,
      #150830 40%,
      #0d0d3a 60%,
      #080825 80%,
      #050510 100%);
  overflow-y: auto;
}

.home-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 35%,
      rgba(180, 80, 220, 0.08) 0%,
      rgba(100, 50, 200, 0.05) 25%,
      rgba(60, 30, 150, 0.03) 50%,
      transparent 70%);
  z-index: 0;
}

.particles-container {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle,
      rgba(255, 255, 255, 0.9),
      rgba(200, 150, 255, 0.4));
  animation: float-star 10s infinite alternate ease-in-out;
  box-shadow: 0 0 10px rgba(180, 80, 220, 0.2);
  will-change: transform, opacity;
}

.star-big {
  background: radial-gradient(circle,
      rgba(255, 255, 255, 0.95),
      rgba(200, 100, 255, 0.3));
  box-shadow:
    0 0 15px rgba(180, 80, 220, 0.3),
    0 0 30px rgba(120, 50, 200, 0.1);
  animation: twinkle-star 6s infinite alternate ease-in-out;
}

@keyframes float-star {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.2;
  }

  33% {
    transform: translate(20px, -30px) scale(1.3);
    opacity: 0.7;
  }

  66% {
    transform: translate(-15px, -50px) scale(0.8);
    opacity: 0.4;
  }

  100% {
    transform: translate(15px, -20px) scale(1.1);
    opacity: 0.6;
  }
}

@keyframes twinkle-star {
  0% {
    transform: scale(1) rotate(0deg);
    opacity: 0.3;
    box-shadow: 0 0 15px rgba(180, 80, 220, 0.3);
  }

  50% {
    transform: scale(1.4) rotate(10deg);
    opacity: 0.9;
    box-shadow: 0 0 30px rgba(200, 100, 255, 0.5);
  }

  100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.3;
    box-shadow: 0 0 15px rgba(180, 80, 220, 0.3);
  }
}

.page-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand {
  color: #c084fc;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-shadow: 0 0 20px rgba(192, 132, 252, 0.2);
}

.date-badge {
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 14px;
  border-radius: 20px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.welcome-section {
  position: relative;
  z-index: 1;
  margin: 32px 0 28px;
}

.welcome-section h1 {
  color: white;
  font-size: clamp(28px, 3.5vw, 42px);
  margin: 0 0 4px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(192, 132, 252, 0.1);
}

.welcome-sub {
  color: rgba(255, 255, 255, 0.5);
  font-size: 15px;
  margin: 0;
}

.section-control {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 28px 30px;
  margin-bottom: 32px;
}

.section-cartas {
  border-color: rgba(192, 132, 252, 0.15);
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.section-header h2 {
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.section-subtitle {
  color: rgba(255, 255, 255, 0.45);
  font-size: 14px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 12px;
  border-radius: 20px;
}

.control-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.control-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 20px 22px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid transparent;
}

.control-card:hover {
  transform: translateY(-4px);
  border-color: rgba(192, 132, 252, 0.2);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 4px 25px rgba(120, 50, 200, 0.08);
}

.control-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.warning {
  background: #fbbf24;
}

.status-dot.info {
  background: #60a5fa;
}

.status-dot.success {
  background: #34d399;
}

.status-dot.muted {
  background: #6b7280;
}

.status-dot.danger {
  background: #ef4444;
  animation: pulse-danger 1.5s ease-in-out infinite;
}

@keyframes pulse-danger {

  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }

  50% {
    box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
  }
}

.badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.45);
}

.badge.danger {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.control-number {
  display: block;
  color: white;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
}

.control-label {
  display: block;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;
  margin: 2px 0 4px;
}

.control-detail {
  display: block;
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  margin-bottom: 10px;
}

.control-action {
  color: #c084fc;
  font-size: 13px;
  font-weight: 600;
  transition: 0.2s;
}

.control-card:hover .control-action {
  transform: translateX(6px);
  display: inline-block;
}

.control-card.vencidos {
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.05);
}

.control-card.vencidos:hover {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
  box-shadow: 0 4px 25px rgba(239, 68, 68, 0.1);
}

.control-card.vencidos .control-number {
  color: #ef4444;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.btn-excel {
  background: rgba(33, 150, 83, 0.2);
  border: 1px solid rgba(33, 150, 83, 0.3);
  color: #4caf50;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-excel:hover {
  background: rgba(33, 150, 83, 0.35);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 83, 0.2);
}

.control-card.emitido {
  border-left: 4px solid #fbbf24;
}

.control-card.enviado {
  border-left: 4px solid #60a5fa;
}

.control-card.entregado {
  border-left: 4px solid #34d399;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .control-cards {
    grid-template-columns: 1fr 1fr;
  }

  .section-control {
    padding: 20px;
  }

  .card-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .btn-excel {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .control-cards {
    grid-template-columns: 1fr;
  }

  .home-page {
    padding: 16px;
  }
}
</style>