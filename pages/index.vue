<template>
  <v-container fluid class="home-page pa-4 pa-md-8">
    <!-- ===== HERO HEADER ===== -->
    <v-card class="hero-card mb-6" rounded="xl" flat>
      <div class="hero-gradient"></div>
      <div class="hero-blob hero-blob--1"></div>
      <div class="hero-blob hero-blob--2"></div>
      <v-card-text class="hero-content pa-6 pa-md-8">
        <v-row align="center" no-gutters>
          <v-col cols="12" md="8">
            <div class="d-flex align-center mb-3">
              <div class="brand-dot mr-3"></div>
              <p class="text-overline home-brand mb-0">Ecocentro Chilca</p>
            </div>
            <h1 class="hero-title mb-2">
              Bienvenido, <span class="hero-name">{{ userName }}</span>
              <span class="wave">👋</span>
            </h1>
            <p class="hero-subtitle mb-0">
              Panel de control
              <span class="dot-sep">·</span>
              <span class="role-badge">{{ userRole }}</span>
            </p>
          </v-col>
          <v-col cols="12" md="4" class="text-md-right mt-3 mt-md-0">
            <v-chip class="date-chip" label rounded="lg">
              <v-icon small left>mdi-calendar-blank-outline</v-icon>
              {{ currentDate }}
            </v-chip>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- ===== ALERTA TAREAS VENCIDAS ===== -->
    <v-alert v-if="canTasks && tasksError" type="error" dense text class="rounded-xl mb-4">
      {{ tasksError }}
    </v-alert>

    <v-card
      v-if="canTasks && tareasVencidas.length"
      rounded="xl"
      class="overdue-card mb-6"
      flat
    >
      <div class="overdue-accent"></div>
      <v-card-title class="d-flex align-center pa-5 pb-2">
        <div class="overdue-icon-wrap mr-3">
          <v-icon color="#fff">mdi-calendar-alert</v-icon>
        </div>
        <div class="flex-grow-1">
          <div class="d-flex align-center">
            <span class="overdue-title">Tareas vencidas</span>
            <v-chip small class="overdue-chip ml-3">{{ tareasVencidas.length }}</v-chip>
          </div>
          <p class="overdue-subtitle mb-0">
            Requieren tu atención: tareas propias y compartidas sin completar
          </p>
        </div>
      </v-card-title>
      <v-list class="overdue-tasks-list" color="transparent">
        <v-list-item
          v-for="tarea in tareasVencidas"
          :key="tarea.id"
          :to="{ path: '/inicio/tareas', query: { tarea: tarea.id } }"
          class="overdue-item"
        >
          <v-list-item-content>
            <v-list-item-title class="font-weight-medium">
              {{ tarea.titulo }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ tarea.creadorId === currentUser.id ? 'Creada por mí' : `Compartida por ${tarea.creadorNombre}` }}
              <span class="dot-sep">·</span> {{ tarea.estado }}
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <v-chip small outlined class="overdue-date-chip">
              {{ tarea.fechaLimite.split('-').reverse().join('/') }}
            </v-chip>
          </v-list-item-action>
          <v-list-item-action>
            <v-icon small class="overdue-arrow">mdi-chevron-right</v-icon>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- ===== SECCIONES ===== -->
    <div class="attention-grid">
      <section
        v-for="section in dashboardSections"
        :key="section.id"
        :aria-labelledby="section.id + '-title'"
        class="mb-2"
      >
        <!-- Section header -->
        <div class="section-header d-flex align-center mb-4">
          <div class="section-icon mr-3" :class="'section-icon--' + section.id">
            <v-icon color="#fff">{{ section.icon }}</v-icon>
          </div>
          <div class="flex-grow-1">
            <h2 :id="section.id + '-title'" class="section-title mb-0">
              {{ section.title }}
            </h2>
            <p class="section-subtitle mb-0">
              {{ section.total }} registros en total
            </p>
          </div>
          <div class="section-total-badge">
            <span class="section-total-number">{{ section.total }}</span>
          </div>
        </div>

        <!-- Card: Requieren atención -->
        <v-card rounded="xl" class="kpi-card kpi-card--alert d-flex flex-column" flat>
          <div class="kpi-glow"></div>
          <v-card-text class="flex-grow-1 pa-5 position-relative">
            <div class="kpi-icon-wrap kpi-icon-wrap--alert mb-4">
              <v-icon color="#fff" large>mdi-alert-circle-outline</v-icon>
            </div>
            <p class="kpi-label mb-1">Requieren atención</p>
            <div class="d-flex align-end mb-2">
              <p class="kpi-number mb-0">{{ section.overdue }}</p>
              <span class="kpi-unit ml-2">registros</span>
            </div>
            <p class="kpi-sublabel mb-1">{{ section.overdueLabel }}</p>
            <div class="kpi-hint-wrap">
              <v-icon small color="#E65100">mdi-clock-outline</v-icon>
              <span class="kpi-hint">Sin actualizar</span>
            </div>
          </v-card-text>

          <v-divider class="kpi-divider" />

          <v-card-actions class="px-3 py-2 kpi-actions">
            <v-btn
              text
              small
              class="text-none font-weight-medium kpi-btn-primary"
              @click="section.review()"
            >
              <v-icon left small>mdi-eye-outline</v-icon>
              Revisar ahora
            </v-btn>
            <v-spacer />
            <v-btn
              icon
              small
              class="kpi-btn-icon kpi-btn-icon--excel"
              :aria-label="'Exportar ' + section.title.toLowerCase() + ' vencidos a Excel'"
              @click="section.exportExcel()"
            >
              <v-icon small>mdi-microsoft-excel</v-icon>
            </v-btn>
            <v-btn
              icon
              small
              class="kpi-btn-icon kpi-btn-icon--pdf"
              :aria-label="'Exportar ' + section.title.toLowerCase() + ' vencidos a PDF'"
              @click="section.exportPdf()"
            >
              <v-icon small>mdi-file-pdf-box</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </section>
    </div>
  </v-container>
</template>

<script>
import {
  normalizeExpediente,
} from '~/models/expediente'
import ExcelJS from 'exceljs'
import { normalizeTarea, canViewTarea } from '~/models/tarea'

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
    tasks: [],
    tasksError: '',
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
    canTasks() { return Boolean(this.$auth?.can('/inicio/tareas')) },
    currentUser() { return this.$auth?.user || {} },
    tareasVencidas() {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      return this.tasks.filter(task => canViewTarea(task, this.currentUser) && task.estado !== 'Completada' && task.fechaLimite && task.fechaLimite < today)
        .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))
    },
    dashboardSections() {
      return [
        {
          id: 'pedidos',
          title: 'Pedidos de venta',
          icon: 'mdi-clipboard-text-outline',
          total: this.expedientes.length,
          overdue: this.expedientesVencidos.length,
          overdueLabel: 'Vencidos desde la fecha del pedido (10 días o más)',
          review: this.goToVencidos,
          exportExcel: this.exportVencidosExcel,
          exportPdf: () => this.exportVencidosPdf(),
        },
        {
          id: 'cartas',
          title: 'Cartas',
          icon: 'mdi-file-document-outline',
          total: this.cartas.length,
          overdue: this.cartasVencidas.length,
          overdueLabel: 'Vencidas desde la fecha de servicio (10 días o más)',
          review: this.goToCartasVencidas,
          exportExcel: this.exportCartasVencidasExcel,
          exportPdf: () => this.exportCartasVencidasPdf(),
        }
      ]
    },

    // ===== COMPUTED DE EXPEDIENTES =====
    expedientesVencidos() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tenDaysAgo = new Date(today)
      tenDaysAgo.setDate(today.getDate() - 10)
      const estadosExcluidos = ['Cerrado', 'Regularizado']
      return this.expedientes.filter(exp => {
        if (estadosExcluidos.includes(exp.estado)) return false
        if (!exp.fecha) return false
        const fecha = new Date(exp.fecha)
        if (isNaN(fecha.getTime())) return false
        fecha.setHours(0, 0, 0, 0)
        return fecha <= tenDaysAgo
      })
    },
    // ===== COMPUTED DE CARTAS =====
    cartasVencidas() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tenDaysAgo = new Date(today)
      tenDaysAgo.setDate(today.getDate() - 10)

      const estadosActivos = ['Emitido', 'Enviado', 'Pendiente de Confirmación']

      return this.cartas.filter(carta => {
        if (carta.estadoProceso === 'Entregado') return false
        if (carta.estado === 'Entregado') return false
        if (!estadosActivos.includes(carta.estadoProceso)) return false

        const fecha = this.extraerFecha(carta.fechaServicio)
        if (!fecha) return false
        if (isNaN(fecha.getTime())) return false
        fecha.setHours(0, 0, 0, 0)

        return fecha <= tenDaysAgo
      })
    },

  },
  mounted() {
    this.getAllExpedientes()
    this.getAllCartas()
    if (this.canTasks) this.loadOverdueTasks()
  },
  methods: {
    async loadOverdueTasks() {
      this.tasksError = ''
      try {
        this.tasks = (await this.$firebaseApi.list('tareas')).map(normalizeTarea)
      } catch (error) {
        console.error(error)
        this.tasksError = 'No se pudieron cargar las tareas vencidas.'
      }
    },
    extraerFecha(timestamp) {
      if (!timestamp) return null

      if (typeof timestamp === 'string') {
        const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      }

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

    async exportVencidosPdf() {
      await this.exportReporteVencidosPdf('pedidos')
    },

    async exportCartasVencidasPdf() {
      await this.exportReporteVencidosPdf('cartas')
    },

    async exportReporteVencidosPdf(tipo) {
      const esCartas = tipo === 'cartas'
      const registros = esCartas ? this.cartasVencidas : this.expedientesVencidos
      if (!registros.length) {
        alert(`No hay ${esCartas ? 'cartas' : 'pedidos de venta'} vencidos para exportar`)
        return
      }

      const estados = registros.reduce((resultado, registro) => {
        const estado = esCartas ? registro.estadoProceso : registro.estado
        resultado[estado || 'Sin estado'] = (resultado[estado || 'Sin estado'] || 0) + 1
        return resultado
      }, {})
      const dias = registros.map(registro => {
        const fecha = esCartas ? this.extraerFecha(registro.fechaServicio) : registro.fecha
        return Number(this.calcularDias(fecha)) || 0
      })
      const promedio = Math.round(dias.reduce((total, valor) => total + valor, 0) / dias.length)
      const maximo = Math.max(...dias)
      const mayorEstado = Math.max(...Object.values(estados), 1)
      const escape = this.escapePdfHtml
      const fechaGeneracion = new Date().toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      })

      let logo = '/kanay.jpeg'
      try {
        logo = await this.getImageDataUrl('/kanay.jpeg')
      } catch (error) {
        console.warn('No se pudo incluir el logo en el PDF', error)
      }

      const barras = Object.entries(estados).map(([estado, cantidad]) => `
        <div class="chart-row">
          <span class="chart-label">${escape(estado)}</span>
          <div class="chart-track"><div class="chart-bar" style="width:${Math.max((cantidad / mayorEstado) * 100, 4)}%"></div></div>
          <strong>${cantidad}</strong>
        </div>
      `).join('')

      const filas = registros.map(registro => {
        const fechaBase = esCartas ? this.extraerFecha(registro.fechaServicio) : registro.fecha
        const valores = esCartas
          ? [
              registro.correlativo,
              registro.cliente?.nombre,
              this.formatDateExcel(fechaBase),
              registro.estadoProceso,
              registro.asunto,
              this.calcularDias(fechaBase)
            ]
          : [
              registro.correlativo,
              registro.cliente?.nombre,
              this.formatDateExcel(fechaBase),
              registro.estado,
              registro.planner,
              this.calcularDias(fechaBase)
            ]
        return `<tr>${valores.map(valor => `<td>${escape(valor)}</td>`).join('')}</tr>`
      }).join('')

      const titulo = esCartas ? 'Reporte ejecutivo de cartas vencidas' : 'Reporte ejecutivo de pedidos de venta vencidos'
      const referencia = esCartas ? 'Fecha de servicio' : 'Fecha del pedido'
      const encabezados = esCartas
        ? ['Carta', 'Cliente', 'Fecha de servicio', 'Estado', 'Asunto', 'Días transcurridos']
        : ['N.º PV', 'Cliente', 'Fecha del pedido', 'Estado', 'Planner', 'Días transcurridos']

      const container = document.createElement('div')
      container.style.position = 'fixed'
      container.style.left = '-10000px'
      container.style.top = '0'
      container.innerHTML = `
        <div class="executive-report">
          <style>
            .executive-report{width:277mm;padding:10mm 11mm;color:#1e293b;background:#fff;font-family:Arial,sans-serif;font-size:10px;box-sizing:border-box}
            .report-header{display:flex;align-items:center;gap:18px;border-bottom:3px solid #00558a;padding-bottom:12px}.report-logo{width:120px;max-height:48px;object-fit:contain}.report-title{flex:1}.report-title h1{margin:0;color:#00558a;font-size:22px}.report-title p{margin:5px 0 0;color:#64748b;font-size:10px}.report-date{text-align:right;color:#475569}
            .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.summary-card{border:1px solid #dbe5eb;border-left:5px solid #e65100;border-radius:6px;padding:10px;background:#f8fafc}.summary-card span{display:block;color:#64748b;font-size:9px;text-transform:uppercase}.summary-card strong{display:block;margin-top:4px;color:#0f172a;font-size:22px}
            .report-section{margin-top:14px}.report-section h2{margin:0 0 9px;color:#334155;font-size:13px}.chart{border:1px solid #e2e8f0;border-radius:6px;padding:10px}.chart-row{display:grid;grid-template-columns:135px 1fr 25px;align-items:center;gap:8px;margin:7px 0}.chart-label{font-weight:bold}.chart-track{height:14px;border-radius:7px;background:#e8eef2;overflow:hidden}.chart-bar{height:100%;border-radius:7px;background:#e65100}.chart-row strong{text-align:right;color:#00558a}
            table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5px}thead{display:table-header-group}tr{page-break-inside:avoid}th{padding:7px 6px;color:#fff;background:#00558a;text-align:left}td{padding:6px;border:1px solid #dbe5eb;vertical-align:top;word-break:break-word}tbody tr:nth-child(even){background:#f8fafc}th:last-child,td:last-child{text-align:center;width:72px}.report-note{margin-top:10px;color:#64748b;font-size:8.5px}.report-footer{margin-top:14px;border-top:1px solid #cbd5e1;padding-top:7px;color:#64748b;text-align:center;font-size:8px}
          </style>
          <header class="report-header">
            <img class="report-logo" src="${logo}" alt="Kanay">
            <div class="report-title"><h1>${titulo}</h1><p>Registros que requieren atención</p></div>
            <div class="report-date"><strong>Generado</strong><br>${fechaGeneracion}</div>
          </header>
          <section class="summary">
            <div class="summary-card"><span>Total vencidos</span><strong>${registros.length}</strong></div>
            <div class="summary-card"><span>Promedio de días transcurridos</span><strong>${promedio}</strong></div>
            <div class="summary-card"><span>Mayor antigüedad</span><strong>${maximo} días</strong></div>
          </section>
          <section class="report-section"><h2>Distribución por estado</h2><div class="chart">${barras}</div></section>
          <section class="report-section"><h2>Detalle de registros vencidos</h2><table><thead><tr>${encabezados.map(texto => `<th>${texto}</th>`).join('')}</tr></thead><tbody>${filas}</tbody></table></section>
          <p class="report-note">Criterio: estado activo y 10 días o más desde ${referencia.toLowerCase()}.</p>
          <footer class="report-footer">KANAY S.A.C. · Ecocentro Chilca · Reporte de gestión</footer>
        </div>
      `
      document.body.appendChild(container)

      try {
        const html2pdfModule = await import('html2pdf.js')
        const html2pdf = html2pdfModule.default || html2pdfModule
        await html2pdf().set({
          margin: 0,
          filename: `${esCartas ? 'Cartas' : 'Pedidos_Venta'}_Vencidos_${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.summary-card', '.chart-row'] }
        }).from(container.querySelector('.executive-report')).save()
      } catch (error) {
        console.error('Error al generar el reporte PDF:', error)
        alert('No se pudo generar el reporte PDF')
      } finally {
        document.body.removeChild(container)
      }
    },

    escapePdfHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    },

    async getImageDataUrl(url) {
      const response = await fetch(url)
      if (!response.ok) throw new Error('No se pudo cargar la imagen')
      const blob = await response.blob()
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
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
/* ===== RESET Y BASE ===== */
.home-page {
  min-height: calc(100vh - 64px);
  background: var(--color-background);
  position: relative;
}

/* ===== HERO ===== */
.hero-card {
  position: relative;
  overflow: hidden;
  border-radius: 28px !important;
  background: linear-gradient(135deg, #1F4E79 0%, #2E6BA8 50%, #1565C0 100%);
  border: none;
  box-shadow: 0 12px 40px -12px rgba(31, 78, 121, 0.45);
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.18), transparent 55%);
  pointer-events: none;
}

.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  pointer-events: none;
}

.hero-blob--1 {
  width: 320px;
  height: 320px;
  background: #4FC3F7;
  top: -120px;
  right: -80px;
  animation: float 8s ease-in-out infinite;
}

.hero-blob--2 {
  width: 240px;
  height: 240px;
  background: #FFB74D;
  bottom: -100px;
  left: -60px;
  opacity: 0.35;
  animation: float 10s ease-in-out infinite reverse;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.08); }
}

.hero-content {
  position: relative;
  z-index: 2;
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4FC3F7;
  box-shadow: 0 0 0 4px rgba(79, 195, 247, 0.25);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(79, 195, 247, 0.25); }
  50% { box-shadow: 0 0 0 8px rgba(79, 195, 247, 0.1); }
}

.home-brand {
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 2px;
  font-size: 11px !important;
  font-weight: 600;
}

.hero-title {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: -0.5px;
  line-height: 1.2;
}

.hero-name {
  background: linear-gradient(135deg, #4FC3F7, #81D4FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.wave {
  display: inline-block;
  animation: wave 2.5s ease-in-out infinite;
  transform-origin: 70% 70%;
}

@keyframes wave {
  0%, 60%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  40% { transform: rotate(-4deg); }
  50% { transform: rotate(10deg); }
}

.hero-subtitle {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.dot-sep {
  margin: 0 8px;
  opacity: 0.5;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  color: #FFFFFF;
  font-weight: 500;
  font-size: 0.78rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.date-chip {
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  backdrop-filter: blur(10px);
  color: #FFFFFF !important;
  font-weight: 500;
  padding: 0 14px;
  height: 36px !important;
}

.date-chip >>> .v-icon {
  color: #FFFFFF !important;
}

/* ===== ALERTA TAREAS VENCIDAS ===== */
.overdue-card {
  position: relative;
  overflow: hidden;
  border-radius: 20px !important;
  background: linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%);
  border: 1px solid rgba(230, 81, 0, 0.15);
  box-shadow: 0 4px 20px -8px rgba(230, 81, 0, 0.15);
}

.overdue-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, #E65100, #FF9800);
}

.overdue-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #E65100, #FF9800);
  box-shadow: 0 4px 12px rgba(230, 81, 0, 0.3);
  flex-shrink: 0;
}

.overdue-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #BF360C;
}

.overdue-chip {
  background: #E65100 !important;
  color: #fff !important;
  font-weight: 600;
  min-width: 26px;
  justify-content: center;
}

.overdue-subtitle {
  color: #8D6E63;
  font-size: 0.8rem;
  margin-top: 2px;
}

.overdue-tasks-list {
  max-height: 360px;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.overdue-item {
  border-radius: 12px !important;
  margin-bottom: 4px;
  transition: background 0.2s ease;
}

.overdue-item:hover {
  background: rgba(230, 81, 0, 0.06) !important;
}

.overdue-date-chip {
  border-color: #E65100 !important;
  color: #E65100 !important;
  font-weight: 600;
}

.overdue-arrow {
  color: #E65100;
  transition: transform 0.2s ease;
}

.overdue-item:hover .overdue-arrow {
  transform: translateX(3px);
}

/* ===== SECTION HEADER ===== */
.section-header {
  padding: 0 4px;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 6px 16px -4px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease;
}

.section-header:hover .section-icon {
  transform: rotate(-6deg) scale(1.05);
}

.section-icon--pedidos {
  background: linear-gradient(135deg, #1565C0, #42A5F5);
}

.section-icon--cartas {
  background: linear-gradient(135deg, #6A1B9A, #AB47BC);
}

.section-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ui-text-212121, #212121);
  letter-spacing: -0.3px;
}

.section-subtitle {
  color: var(--ui-text-757575, #757575);
  font-size: 0.8rem;
}

.section-total-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 44px;
  padding: 0 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(31, 78, 121, 0.08), rgba(31, 78, 121, 0.04));
  border: 1px solid rgba(31, 78, 121, 0.12);
}

.section-total-number {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: -0.5px;
}

/* ===== KPI CARDS ===== */
.attention-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

@media (max-width: 959px) {
  .attention-grid { grid-template-columns: 1fr; }
}

.kpi-card {
  position: relative;
  overflow: hidden;
  border-radius: 24px !important;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.kpi-card:hover {
  transform: translateY(-4px);
}

.kpi-card--alert {
  background: linear-gradient(160deg, #FFFFFF 0%, #FFF8F2 100%);
  border: 1px solid rgba(230, 81, 0, 0.15);
  box-shadow: 0 4px 20px -8px rgba(230, 81, 0, 0.12);
}

.kpi-card--alert:hover {
  box-shadow: 0 16px 40px -12px rgba(230, 81, 0, 0.3);
}

.kpi-glow {
  position: absolute;
  top: -60px;
  right: -60px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(230, 81, 0, 0.15), transparent 70%);
  pointer-events: none;
  transition: transform 0.5s ease;
}

.kpi-card:hover .kpi-glow {
  transform: scale(1.3);
}

.kpi-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.kpi-icon-wrap--alert {
  background: linear-gradient(135deg, #E65100, #FF9800);
  box-shadow: 0 8px 20px -6px rgba(230, 81, 0, 0.5);
}

.kpi-label {
  color: #8D6E63;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-size: 11px !important;
  font-weight: 700;
}

.kpi-number {
  font-size: 3.2rem !important;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -2px;
  background: linear-gradient(135deg, #E65100, #FF9800);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.kpi-unit {
  color: #A1887F;
  font-size: 0.85rem;
  font-weight: 500;
  padding-bottom: 8px;
}

.kpi-sublabel {
  color: #5D4037 !important;
  font-size: 0.82rem !important;
  font-weight: 500;
}

.kpi-hint-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(230, 81, 0, 0.08);
  margin-top: 8px;
}

.kpi-hint {
  color: #E65100;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.kpi-divider {
  border-color: rgba(0, 0, 0, 0.06) !important;
}

.kpi-actions {
  gap: 4px;
}

.kpi-btn-primary {
  color: #E65100 !important;
  font-weight: 600 !important;
  border-radius: 10px !important;
  transition: background 0.2s ease;
}

.kpi-btn-primary:hover {
  background: rgba(230, 81, 0, 0.08) !important;
}

.kpi-btn-icon {
  border-radius: 10px !important;
  transition: all 0.2s ease;
}

.kpi-btn-icon--excel {
  color: #2E7D32 !important;
}

.kpi-btn-icon--excel:hover {
  background: rgba(46, 125, 50, 0.1) !important;
}

.kpi-btn-icon--pdf {
  color: #C62828 !important;
}

.kpi-btn-icon--pdf:hover {
  background: rgba(198, 40, 40, 0.1) !important;
}

/* ===== FOCUS VISIBLE (Accesibilidad) ===== */
.kpi-card:focus-within,
.overdue-card:focus-within {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ===== DARK MODE ===== */
.theme--dark .hero-card {
  background: linear-gradient(135deg, #0D1B2A 0%, #1B3A5C 50%, #1F4E79 100%);
  box-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.6);
}

.theme--dark .overdue-card {
  background: linear-gradient(135deg, #2A1810 0%, #1E1410 100%);
  border-color: rgba(230, 81, 0, 0.3);
}

.theme--dark .overdue-title {
  color: #FFB74D;
}

.theme--dark .overdue-subtitle {
  color: #BCAAA4;
}

.theme--dark .section-title {
  color: #FFFFFF;
}

.theme--dark .section-subtitle {
  color: #B0BEC5;
}

.theme--dark .section-total-badge {
  background: linear-gradient(135deg, rgba(79, 195, 247, 0.12), rgba(79, 195, 247, 0.06));
  border-color: rgba(79, 195, 247, 0.2);
}

.theme--dark .section-total-number {
  color: #4FC3F7;
}

.theme--dark .kpi-card--alert {
  background: linear-gradient(160deg, #2A1810 0%, #1E1410 100%);
  border-color: rgba(230, 81, 0, 0.3);
}

.theme--dark .kpi-label {
  color: #BCAAA4;
}

.theme--dark .kpi-sublabel {
  color: #D7CCC8 !important;
}

.theme--dark .kpi-hint-wrap {
  background: rgba(230, 81, 0, 0.15);
}

.theme--dark .kpi-divider {
  border-color: rgba(255, 255, 255, 0.08) !important;
}

/* ===== SCROLLBAR PERSONALIZADA ===== */
.overdue-tasks-list::-webkit-scrollbar {
  width: 6px;
}

.overdue-tasks-list::-webkit-scrollbar-track {
  background: transparent;
}

.overdue-tasks-list::-webkit-scrollbar-thumb {
  background: rgba(230, 81, 0, 0.25);
  border-radius: 3px;
}

.overdue-tasks-list::-webkit-scrollbar-thumb:hover {
  background: rgba(230, 81, 0, 0.4);
}

/* ===== REDUCED MOTION ===== */
@media (prefers-reduced-motion: reduce) {
  .hero-blob,
  .wave,
  .brand-dot {
    animation: none;
  }
  .kpi-card,
  .overdue-arrow,
  .section-icon {
    transition: none;
  }
}
</style>