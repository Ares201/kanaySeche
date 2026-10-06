<template>
  <v-container fluid class="home-page">
    <!-- HEADER EN TARJETA CON GRADIENTE AZUL -->
    <header class="home-header-card">
      <div class="header-content">
        <div class="header-left">
          <p class="eyebrow">Ecocentro Chilca</p>
          <h1>Panel de control</h1>
          <p class="user-context">
            <v-icon size="16" class="mr-2">mdi-account-circle-outline</v-icon>
            {{ userName }} <span class="dot">·</span> {{ userRole }}
          </p>
        </div>
        <div class="header-right">
          <v-chip large outlined class="date-chip">
            <v-icon left size="16">mdi-calendar-blank-outline</v-icon>
            {{ currentDate }}
          </v-chip>
        </div>
      </div>
    </header>

    <!-- TÍTULO DE SECCIÓN -->
    <div class="section-heading">
      <div>
        <h2>Requieren atención</h2>
        <span>Resumen de pendientes críticos</span>
      </div>
      <v-btn text class="refresh-btn" :loading="loading" @click="refreshAll">
        <v-icon left size="18">mdi-refresh</v-icon>
        Actualizar
      </v-btn>
    </div>

    <!-- SKELETON LOADER -->
    <div v-if="loading" class="summary-grid">
      <v-skeleton-loader v-for="n in 3" :key="n" type="article, actions" class="summary-card-skeleton" />
    </div>

    <!-- CARDS MEJORADAS (3 EN UNA FILA) -->
    <div v-else class="summary-grid">
      <v-card v-for="section in dashboardSections" :key="section.id" outlined class="summary-card"
        :class="[`accent-${section.id}`, { 'has-overdue': section.overdue > 0 }]"
        @click="section.review && section.review()">
        <div class="card-accent"></div>

        <div class="summary-top">
          <div class="title-group">
            <div class="icon-badge">
              <v-icon size="22" class="section-icon">{{ section.icon }}</v-icon>
            </div>
            <div class="title-text">
              <h3>{{ section.title }}</h3>
              <span class="title-sub">{{ section.total }} registros</span>
            </div>
          </div>
          <v-chip x-small :color="section.overdue > 0 ? 'deep-orange' : 'green'" text-color="white" class="status-chip">
            {{ section.overdue > 0 ? 'Crítico' : 'Al día' }}
          </v-chip>
        </div>

        <!-- Métrica principal -->
        <div class="summary-value">
          <strong :class="{ 'text-error': section.overdue > 0 }">
            {{ section.overdue }}
          </strong>
          <div class="value-context">
            <span class="value-label">{{ section.id === 'tareas' ? 'vencidas' : 'vencidos' }}</span>
            <span class="value-total">de {{ section.total }}</span>
          </div>
        </div>

        <p class="summary-description">{{ section.overdueLabel }}</p>

        <!-- Acciones -->
        <div class="summary-actions" @click.stop>
          <v-btn text small class="review-btn" @click="section.review && section.review()">
            Revisar
            <v-icon right size="16">mdi-arrow-right</v-icon>
          </v-btn>
          <div class="export-group">
            <v-tooltip top>
              <template #activator="{ on, attrs }">
                <v-btn icon small v-bind="attrs" v-on="on" :disabled="section.overdue === 0 || !section.exportExcel"
                  @click="section.exportExcel && section.exportExcel()">
                  <v-icon size="20" class="icon-excel">mdi-microsoft-excel</v-icon>
                </v-btn>
              </template>
              <span>Exportar a Excel</span>
            </v-tooltip>
            <v-tooltip top>
              <template #activator="{ on, attrs }">
                <v-btn icon small v-bind="attrs" v-on="on" :disabled="section.overdue === 0 || !section.exportPdf"
                  @click="section.exportPdf && section.exportPdf()">
                  <v-icon size="20" class="icon-pdf">mdi-file-pdf-box</v-icon>
                </v-btn>
              </template>
              <span>Exportar a PDF</span>
            </v-tooltip>
          </div>
        </div>
      </v-card>
    </div>

    <!-- ALERTA DE ERROR -->
    <v-alert v-if="canTasks && tasksError" type="error" dense text dismissible class="mt-8" @input="tasksError = ''">
      {{ tasksError }}
    </v-alert>
  </v-container>
</template>

<script>
import {
  normalizeExpediente,
} from '~/models/expediente'
import ExcelJS from 'exceljs'
import { normalizeTarea, canViewTarea } from '~/models/tarea'

// ===== FUNCIONES DE CARTA =====
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

export default {
  name: 'IndexPage',
  data: () => ({
    expedientes: [],
    cartas: [],
    tasks: [],
    tasksError: '',
    loading: false,
    loadingCartas: false
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
      const base = [
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

      if (this.canTasks) {
        base.unshift({
          id: 'tareas',
          title: 'Tareas',
          icon: 'mdi-checkbox-marked-outline',
          total: this.tasks.length,
          overdue: this.tareasVencidas.length,
          overdueLabel: 'Tareas vencidas pendientes de completar',
          review: this.goToTareasVencidas,
          exportExcel: null,
          exportPdf: null,
        })
      }

      return base
    },

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
    async refreshAll() {
      this.loading = true
      try {
        await Promise.all([
          this.getAllExpedientes(),
          this.getAllCartas(),
          this.canTasks ? this.loadOverdueTasks() : Promise.resolve()
        ])
        this.$toast?.success('Datos actualizados')
      } finally {
        this.loading = false
      }
    },

    formatTaskDate(fechaLimite) {
      if (!fechaLimite) return ''
      const [y, m, d] = fechaLimite.split('-')
      const fecha = new Date(y, m - 1, d)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const diff = Math.ceil((hoy - fecha) / (1000 * 60 * 60 * 24))
      if (diff <= 1) return 'Hoy'
      if (diff <= 2) return 'Ayer'
      if (diff <= 7) return `Hace ${diff} días`
      return `${d}/${m}/${y}`
    },

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

      if (timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000)
      }

      if (timestamp.toDate) {
        return timestamp.toDate()
      }

      return new Date(timestamp)
    },
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
            .report-header{display:flex;align-items:center;gap:18px;border-bottom:3px solid #0d7a3e;padding-bottom:12px}.report-logo{width:120px;max-height:48px;object-fit:contain}.report-title{flex:1}.report-title h1{margin:0;color:#0d7a3e;font-size:22px}.report-title p{margin:5px 0 0;color:#64748b;font-size:10px}.report-date{text-align:right;color:#475569}
            .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.summary-card{border:1px solid #dbe5eb;border-left:5px solid #f57c00;border-radius:6px;padding:10px;background:#f8fafc}.summary-card span{display:block;color:#64748b;font-size:9px;text-transform:uppercase}.summary-card strong{display:block;margin-top:4px;color:#0f172a;font-size:22px}
            .report-section{margin-top:14px}.report-section h2{margin:0 0 9px;color:#334155;font-size:13px}.chart{border:1px solid #e2e8f0;border-radius:6px;padding:10px}.chart-row{display:grid;grid-template-columns:135px 1fr 25px;align-items:center;gap:8px;margin:7px 0}.chart-label{font-weight:bold}.chart-track{height:14px;border-radius:7px;background:#e8eef2;overflow:hidden}.chart-bar{height:100%;border-radius:7px;background:#f57c00}.chart-row strong{text-align:right;color:#0d7a3e}
            table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5px}thead{display:table-header-group}tr{page-break-inside:avoid}th{padding:7px 6px;color:#fff;background:#0d7a3e;text-align:left}td{padding:6px;border:1px solid #dbe5eb;vertical-align:top;word-break:break-word}tbody tr:nth-child(even){background:#f8fafc}th:last-child,td:last-child{text-align:center;width:72px}.report-note{margin-top:10px;color:#64748b;font-size:8.5px}.report-footer{margin-top:14px;border-top:1px solid #cbd5e1;padding-top:7px;color:#64748b;text-align:center;font-size:8px}
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
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0D7A3E' } }
          titleCell.alignment = { horizontal: 'left', vertical: 'middle' }
          worksheet.mergeCells('C1:M1')
        } catch (error) {
          console.warn('No se pudo cargar el logo:', error)
          const titleCell = worksheet.getCell('A1')
          titleCell.value = '📋 REPORTE DE EXPEDIENTES VENCIDOS'
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0D7A3E' } }
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
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D7A3E' } }
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

    async exportCartasVencidasExcel() {
      if (this.cartasVencidas.length === 0) {
        alert('No hay cartas vencidas para exportar')
        return
      }

      try {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet('Cartas Vencidas')

        worksheet.columns = [
          { width: 15 }, { width: 25 }, { width: 14 },
          { width: 20 }, { width: 15 }, { width: 14 }
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
          titleCell.value = '📋 REPORTE DE CARTAS VENCIDAS'
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0D7A3E' } }
          titleCell.alignment = { horizontal: 'left', vertical: 'middle' }
          worksheet.mergeCells('C1:F1')
        } catch (error) {
          console.warn('No se pudo cargar el logo:', error)
          const titleCell = worksheet.getCell('A1')
          titleCell.value = '📋 REPORTE DE CARTAS VENCIDAS'
          titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF0D7A3E' } }
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

        this.cartasVencidas.forEach((carta, index) => {
          const rowNumber = index + 4
          const row = worksheet.getRow(rowNumber)

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

        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D7A3E' } }
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

    formatDateExcel(fecha) {
      if (!fecha) return ''

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

    calcularDias(fecha) {
      if (!fecha) return 'N/A'

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
    },
    goToTareasVencidas() {
      this.$router.push({ path: '/inicio/tareas' })
    }
  }
}
</script>

<style scoped>
/* ====== PALETA MEDIOAMBIENTAL ======
   Verde    #0d7a3e  → naturaleza, éxito, "al día"
   Naranja  #f57c00  → alerta, advertencia, "vencido"
   Azul     #0277bd  → confianza, agua, información
   Rojo     #d32f2f  → PDF / crítico
====================================== */

.home-page {
  width: 100%;
  max-width: 100%;
  padding: 40px 56px 64px;
  color: #1f2937;
  box-sizing: border-box;
}

/* ===== HEADER EN TARJETA CON GRADIENTE AZUL ===== */
.home-header-card {
  position: relative;
  border-radius: 16px;
  padding: 32px 36px;
  margin-bottom: 40px;
  overflow: hidden;
  background: linear-gradient(135deg, #0277bd 0%, #01579b 45%, #0d7a3e 100%);
  box-shadow: 0 8px 24px rgba(2, 119, 189, 0.25);
  color: #fff;
}

.home-header-card::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -10%;
  width: 380px;
  height: 380px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.home-header-card::after {
  content: '';
  position: absolute;
  bottom: -60%;
  right: 15%;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  pointer-events: none;
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 700;
}

.home-header-card h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.25;
  color: #fff;
  letter-spacing: -0.5px;
}

.user-context {
  margin: 10px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
}

.user-context .dot {
  margin: 0 8px;
  opacity: 0.6;
}

.date-chip {
  font-size: 12px !important;
  font-weight: 600;
  height: 38px !important;
  padding: 0 18px !important;
  background: rgba(255, 255, 255, 0.18) !important;
  border: 1px solid rgba(255, 255, 255, 0.4) !important;
  color: #fff !important;
  backdrop-filter: blur(6px);
}

/* ===== SECTION HEADING ===== */
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.section-heading h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  letter-spacing: -0.3px;
}

.section-heading>div>span {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  display: block;
}

.refresh-btn {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-size: 13px !important;
  color: #0277bd !important;
  font-weight: 600 !important;
  padding: 0 16px !important;
  height: 40px !important;
}

.refresh-btn:hover {
  background: rgba(2, 119, 189, 0.08) !important;
}

/* ===== GRID ANCHO COMPLETO — 3 COLUMNAS ===== */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  width: 100%;
}

/* ===== CARD ===== */
.summary-card.v-card {
  position: relative;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
  background: #fff;
  color: inherit;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.summary-card.v-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
  border-color: #cbd5e1;
}

.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: #0277bd;
}

.accent-pedidos .card-accent {
  background: linear-gradient(90deg, #0277bd, #0d7a3e);
}

.accent-cartas .card-accent {
  background: linear-gradient(90deg, #0d7a3e, #0277bd);
}

.accent-tareas .card-accent {
  background: linear-gradient(90deg, #f57c00, #d32f2f);
}

.summary-card.has-overdue .card-accent {
  background: linear-gradient(90deg, #f57c00, #e65100);
}

/* ===== SUMMARY TOP ===== */
.summary-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 22px 0;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e3f2fd;
  transition: background 0.2s;
}

.accent-pedidos .icon-badge {
  background: #e3f2fd;
}

.accent-pedidos .section-icon {
  color: #0277bd;
}

.accent-cartas .icon-badge {
  background: #e8f5e9;
}

.accent-cartas .section-icon {
  color: #0d7a3e;
}

.accent-tareas .icon-badge {
  background: #fff3e0;
}

.accent-tareas .section-icon {
  color: #f57c00;
}

.summary-card.has-overdue .icon-badge {
  background: #fff3e0;
}

.summary-card.has-overdue .section-icon {
  color: #f57c00;
}

.title-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.summary-top h3 {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #0f172a;
  letter-spacing: -0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 3px;
}

.status-chip {
  font-weight: 700 !important;
  letter-spacing: 0.4px !important;
  text-transform: uppercase;
  font-size: 9px !important;
  height: 24px !important;
  padding: 0 9px !important;
  flex-shrink: 0;
}

/* ===== VALUE ===== */
.summary-value {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 18px 22px 0;
}

.summary-value strong {
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
  color: #0d7a3e;
  letter-spacing: -1.5px;
}

.summary-value strong.text-error {
  color: #f57c00;
}

.value-context {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  padding-bottom: 5px;
}

.value-label {
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.value-total {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 3px;
}

/* ===== DESCRIPTION ===== */
.summary-description {
  margin: 14px 22px 18px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.55;
  flex: 1;
}

/* ===== ACTIONS ===== */
.summary-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #edf0f3;
  background: #f8fafc;
}

.review-btn {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  color: #0277bd !important;
  height: 36px !important;
  padding: 0 14px !important;
}

.review-btn:hover {
  background: rgba(2, 119, 189, 0.08) !important;
}

.export-group {
  display: flex;
  gap: 2px;
}

.export-group .v-btn {
  width: 36px !important;
  height: 36px !important;
}

.icon-excel {
  color: #0d7a3e !important;
}

.icon-pdf {
  color: #d32f2f !important;
}

/* ===== SKELETON ===== */
.summary-card-skeleton {
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  padding: 20px !important;
}

/* ===== DARK THEME ===== */
.theme--dark .home-page {
  color: #e2e8f0;
}

.theme--dark .home-header-card {
  background: linear-gradient(135deg, #014f86 0%, #013a63 45%, #0a5d30 100%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.theme--dark .home-header-card h1 {
  color: #f1f5f9;
}

.theme--dark .eyebrow {
  color: rgba(255, 255, 255, 0.75);
}

.theme--dark .user-context {
  color: rgba(255, 255, 255, 0.85);
}

.theme--dark .date-chip {
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  color: #f1f5f9 !important;
}

.theme--dark .summary-card {
  background: #1e293b;
  border-color: #334155;
}

.theme--dark .summary-actions {
  background: #0f172a;
}

.theme--dark .summary-actions {
  border-color: #334155;
}

.theme--dark .section-heading h2,
.theme--dark .summary-top h3 {
  color: #f1f5f9;
}

.theme--dark .summary-value strong {
  color: #4ade80;
}

.theme--dark .summary-value strong.text-error {
  color: #fb923c;
}

.theme--dark .user-context,
.theme--dark .section-heading>div>span,
.theme--dark .value-label,
.theme--dark .value-total,
.theme--dark .summary-description,
.theme--dark .title-sub {
  color: #94a3b8;
}

.theme--dark .icon-badge {
  background: #1e3a5f;
}

.theme--dark .accent-cartas .icon-badge {
  background: #14532d;
}

.theme--dark .accent-tareas .icon-badge {
  background: #7c2d12;
}

.theme--dark .summary-card.has-overdue .icon-badge {
  background: #7c2d12;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1280px) {
  .home-page {
    padding: 32px 40px 56px;
  }

  .summary-value strong {
    font-size: 38px;
  }

  .summary-top {
    padding: 20px 18px 0;
  }

  .summary-value {
    padding: 16px 18px 0;
  }

  .summary-description {
    margin: 12px 18px 16px;
  }
}

@media (max-width: 1024px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .home-page {
    padding: 28px 24px 48px;
  }

  .home-header-card {
    padding: 26px 28px;
    margin-bottom: 32px;
  }

  .home-header-card h1 {
    font-size: 26px;
  }
}

@media (max-width: 700px) {
  .summary-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}

@media (max-width: 600px) {
  .home-page {
    padding: 24px 16px 40px;
  }

  .home-header-card {
    padding: 22px 20px;
    margin-bottom: 28px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  .home-header-card h1 {
    font-size: 22px;
  }

  .section-heading {
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 18px;
  }

  .section-heading h2 {
    font-size: 17px;
  }

  .summary-value strong {
    font-size: 36px;
  }
}
</style>