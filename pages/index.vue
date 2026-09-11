<template>
  <v-container fluid class="home-page pa-4 pa-md-8">
    <!-- ===== HERO HEADER ===== -->
    <v-card class="hero-card mb-6" rounded="xl" flat>
      <div class="hero-gradient"></div>
      <v-card-text class="hero-content pa-6 pa-md-8">
        <v-row align="center" no-gutters>
          <v-col cols="12" md="8">
            <p class="text-overline home-brand mb-2">Ecocentro Chilca</p>
            <h1 class="text-h5 text-md-h4 font-weight-bold mb-1">
              Bienvenido, {{ userName }} 👋
            </h1>
            <p class="text-body-2 text--secondary mb-0">
              Panel de control · <span class="font-weight-medium">{{ userRole }}</span>
            </p>
          </v-col>
          <v-col cols="12" md="4" class="text-md-right mt-3 mt-md-0">
            <v-chip small class="date-chip" label rounded="lg">
              <v-icon small left>mdi-calendar-blank-outline</v-icon>
              {{ currentDate }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- ===== SECCIONES ===== -->
    <section
      v-for="section in dashboardSections"
      :key="section.id"
      :aria-labelledby="section.id + '-title'"
      class="mb-8"
    >
      <!-- Section header -->
      <div class="section-header d-flex align-center mb-4">
        <div class="section-icon mr-3">
          <v-icon color="var(--color-primary)">{{ section.icon }}</v-icon>
        </div>
        <div class="flex-grow-1">
          <h2 :id="section.id + '-title'" class="text-h6 font-weight-bold mb-0">
            {{ section.title }}
          </h2>
          <p class="text-caption text--secondary mb-0">
            {{ section.total }} registros en total
          </p>
        </div>
        <v-chip small outlined rounded="lg" class="section-total">
          Total: {{ section.total }}
        </v-chip>
      </div>

      <!-- Cards grid -->
      <v-row dense>
        <!-- Card: Requieren atención -->
        <v-col cols="12" sm="6" lg="3">
          <v-card
            rounded="xl"
            class="kpi-card kpi-card--alert d-flex flex-column fill-height"
          >
            <v-card-text class="flex-grow-1 pa-5">
              <div class="kpi-icon-wrap kpi-icon-wrap--alert mb-3">
                <v-icon color="#E65100">mdi-alert-circle-outline</v-icon>
              </div>
              <p class="text-caption font-weight-medium kpi-label mb-1">
                Requieren atención
              </p>
              <p class="text-h3 font-weight-bold kpi-number mb-1">
                {{ section.overdue }}
              </p>
              <p class="text-subtitle-2 font-weight-medium kpi-sublabel mb-0">
                {{ section.overdueLabel }}
              </p>
              <p class="text-caption kpi-hint mb-0">Sin actualizar</p>
            </v-card-text>
            <v-divider class="kpi-divider" />
            <v-card-actions class="px-3 py-2">
              <v-btn
                text
                small
                color="#E65100"
                class="text-none font-weight-medium"
                @click="section.review()"
              >
                <v-icon left small>mdi-eye-outline</v-icon>
                Revisar ahora
              </v-btn>
              <v-spacer />
              <v-btn
                text
                small
                color="green darken-2"
                class="text-none"
                :aria-label="'Exportar ' + section.title.toLowerCase() + ' vencidos a Excel'"
                @click="section.exportExcel()"
              >
                <v-icon left small>mdi-microsoft-excel</v-icon>
                Excel
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>

        <!-- Cards: Estados -->
        <v-col
          v-for="status in section.statuses"
          :key="status.name"
          cols="12"
          sm="6"
          lg="3"
        >
          <v-card
            rounded="xl"
            class="kpi-card kpi-card--info d-flex flex-column fill-height"
          >
            <v-card-text class="flex-grow-1 pa-5">
              <div class="kpi-icon-wrap kpi-icon-wrap--info mb-3">
                <v-icon color="#1565C0">{{ status.icon }}</v-icon>
              </div>
              <p class="text-caption font-weight-medium kpi-label mb-1">
                {{ status.name }}
              </p>
              <p class="text-h3 font-weight-bold kpi-number mb-1">
                {{ status.count }}
              </p>
              <p class="text-subtitle-2 font-weight-medium kpi-sublabel mb-0">
                {{ status.label }}
              </p>
            </v-card-text>
            <v-divider class="kpi-divider" />
            <v-card-actions class="px-3 py-2">
              <v-btn
                text
                small
                color="#1565C0"
                class="text-none font-weight-medium"
                :aria-label="'Ver ' + status.label.toLowerCase()"
                @click="section.filter(status.name)"
              >
                Ver todos
                <v-icon right small>mdi-arrow-right</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </section>
  </v-container>
</template>

<script>
import {
  normalizeExpediente,
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
    expedientes: [],
    cartas: [],
    loading: false
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
    dashboardSections() {
      return [
        {
          id: 'pedidos',
          title: 'Pedidos de venta',
          icon: 'mdi-clipboard-text-outline',
          total: this.expedientes.length,
          overdue: this.expedientesVencidos.length,
          overdueLabel: 'Vencidos > 10 días',
          review: this.goToVencidos,
          exportExcel: this.exportVencidosExcel,
          filter: this.goToFilter,
          statuses: [
            { name: 'Pendiente', label: 'Pedidos pendientes', icon: 'mdi-clock-outline' },
            { name: 'Notificado', label: 'Pedidos notificados', icon: 'mdi-email-outline' },
            { name: 'Regularizado', label: 'Pedidos regularizados', icon: 'mdi-check-circle-outline' }
          ].map(status => ({ ...status, count: this.expedientesPorEstado[status.name] || 0 }))
        },
        {
          id: 'cartas',
          title: 'Cartas',
          icon: 'mdi-file-document-outline',
          total: this.cartas.length,
          overdue: this.cartasVencidas.length,
          overdueLabel: 'Vencidas > 10 días',
          review: this.goToCartasVencidas,
          exportExcel: this.exportCartasVencidasExcel,
          filter: this.goToCartasFilter,
          statuses: [
            { name: 'Emitido', label: 'Cartas emitidas', icon: 'mdi-file-outline' },
            { name: 'Enviado', label: 'Cartas enviadas', icon: 'mdi-email-outline' },
            { name: 'Entregado', label: 'Cartas entregadas', icon: 'mdi-check-circle-outline' }
          ].map(status => ({ ...status, count: this.cartasPorEstado[status.name] || 0 }))
        }
      ]
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
.home-page {
  min-height: calc(100vh - 64px);
  background: var(--color-background);
}

/* ===== HERO ===== */
.hero-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(31, 78, 121, 0.12);
  border-radius: 24px !important;
  background: linear-gradient(
    135deg,
    rgba(31, 78, 121, 0.10) 0%,
    rgba(31, 78, 121, 0.04) 45%,
    rgba(255, 255, 255, 0) 100%
  );
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at top right,
    rgba(31, 78, 121, 0.15),
    transparent 60%
  );
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.home-brand {
  color: var(--color-primary);
  letter-spacing: 1.5px;
}

.date-chip {
  background: rgba(255, 255, 255, 0.7) !important;
  border: 1px solid rgba(31, 78, 121, 0.18);
  backdrop-filter: blur(6px);
  font-weight: 500;
}

/* ===== SECTION HEADER ===== */
.section-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    rgba(31, 78, 121, 0.14),
    rgba(31, 78, 121, 0.06)
  );
}

.section-total {
  font-weight: 500;
  border-radius: 12px !important;
}

/* ===== KPI CARDS ===== */
.kpi-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px !important;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
}

/* Card con alerta (ámbar/rojo suave) */
.kpi-card--alert {
  background: linear-gradient(
    160deg,
    rgba(255, 152, 0, 0.10) 0%,
    rgba(255, 255, 255, 0) 55%
  );
  border-color: rgba(230, 81, 0, 0.25);
  border-top: 4px solid #E65100;
}

.kpi-card--alert:hover {
  border-color: rgba(230, 81, 0, 0.45);
  box-shadow: 0 10px 24px rgba(230, 81, 0, 0.18);
}

/* Card info (azul suave) */
.kpi-card--info {
  background: linear-gradient(
    160deg,
    rgba(21, 101, 192, 0.08) 0%,
    rgba(255, 255, 255, 0) 55%
  );
  border-color: rgba(21, 101, 192, 0.20);
  border-top: 4px solid #1565C0;
}

.kpi-card--info:hover {
  border-color: rgba(21, 101, 192, 0.40);
  box-shadow: 0 10px 24px rgba(21, 101, 192, 0.15);
}

/* Icon wrap */
.kpi-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon-wrap--alert {
  background: rgba(230, 81, 0, 0.14);
}

.kpi-icon-wrap--info {
  background: rgba(21, 101, 192, 0.14);
}

/* Tipografía */
.kpi-label {
  color: #616161;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  font-size: 11px !important;
}

.kpi-number {
  line-height: 1.1;
  letter-spacing: -0.5px;
  color: #212121 !important;
}

.kpi-sublabel {
  color: #424242 !important;
}

.kpi-hint {
  color: #9E9E9E;
}

.kpi-divider {
  border-color: rgba(0, 0, 0, 0.06) !important;
}

/* ===== DARK MODE ===== */
.theme--dark .home-page {
  background: inherit;
}

.theme--dark .hero-card {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.06) 0%,
    rgba(255, 255, 255, 0.02) 45%,
    transparent 100%
  );
  border-color: rgba(255, 255, 255, 0.08);
}

.theme--dark .date-chip {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.15);
}

.theme--dark .section-icon {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.12),
    rgba(255, 255, 255, 0.04)
  );
}

.theme--dark .kpi-card--alert {
  background: linear-gradient(
    160deg,
    rgba(230, 81, 0, 0.18) 0%,
    rgba(255, 255, 255, 0.02) 55%
  );
}

.theme--dark .kpi-card--info {
  background: linear-gradient(
    160deg,
    rgba(21, 101, 192, 0.20) 0%,
    rgba(255, 255, 255, 0.02) 55%
  );
}

.theme--dark .kpi-number {
  color: #FFFFFF !important;
}

.theme--dark .kpi-sublabel {
  color: #E0E0E0 !important;
}

.theme--dark .kpi-label {
  color: #BDBDBD;
}

.theme--dark .kpi-divider {
  border-color: rgba(255, 255, 255, 0.08) !important;
}

/* ===== FOCUS VISIBLE ===== */
.kpi-card:focus-within {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>