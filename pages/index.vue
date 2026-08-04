<template>
  <section class="home-page">
    <!-- Encabezado -->
    <div class="dashboard-header">
      <div class="header-content">
        <p class="eyebrow">Dashboard</p>
      </div>
    </div>

    <!-- Filtros más compactos -->
    <v-row class="filters-row" align="center">
      <v-col cols="12" md="6">
        <div class="filters-wrapper">
          <div class="filter-group">
            <label><v-icon small>mdi-calendar-start</v-icon> Desde</label>
            <input v-model="fechaInicio" type="date" class="filter-input" />
          </div>
          <div class="filter-group">
            <label><v-icon small>mdi-calendar-end</v-icon> Hasta</label>
            <input v-model="fechaFin" type="date" class="filter-input" />
          </div>
          <div class="filter-actions">
            <button class="secondary-button" @click="resetFiltros">
              <v-icon small>mdi-refresh</v-icon> Resetear
            </button>
            <button class="secondary-button" @click="mostrarTodo">
              <v-icon small>mdi-eye</v-icon> Mostrar todo
            </button>
          </div>
        </div>
      </v-col>
      <v-col cols="12" md="6" class="text-md-right">
        <span class="filter-hint">
          <v-icon small>mdi-filter-variant</v-icon> Filtrar por rango de fechas
        </span>
      </v-col>
    </v-row>

    <!-- Tarjeta: Generaciones de PDF -->
    <v-row class="mt-4">
      <v-col cols="12">
        <div class="card-modern">
          <div class="card-header">
            <h3 class="card-title">
              <v-icon class="icon-title">mdi-file-pdf-box</v-icon>
              Generaciones de PDF
            </h3>
          </div>
          <div class="stats-grid-2">
            <div class="stat-card-modern stat-pdf">
              <span class="stat-label">Total de PDFs generados</span>
              <span class="stat-value">{{ contadorPDF }}</span>
              <v-icon class="stat-icon" color="#0f766e">mdi-file-pdf</v-icon>
            </div>
            <div class="stat-card-modern stat-pdf">
              <span class="stat-label">Última generación</span>
              <span class="stat-value" style="font-size: 16px;">
                {{ ultimaFechaPDF ? formatDate(ultimaFechaPDF) : 'Sin datos' }}
              </span>
              <v-icon class="stat-icon" color="#0f766e">mdi-clock-outline</v-icon>
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Gráficos principales -->
    <v-row dense>
      <!-- Ingresos Cisterna -->
      <v-col cols="12" md="6">
        <div class="card-modern">
          <div class="card-header">
            <h3 class="card-title">
              <v-icon class="icon-title">mdi-truck</v-icon>
              Ingresos Cisterna
            </h3>
          </div>
          <div class="stats-grid-3">
            <div class="stat-card-modern stat-ingreso">
              <span class="stat-label">Total</span>
              <span class="stat-value">{{ totalIngresos }}</span>
              <v-icon class="stat-icon" color="#0f766e">mdi-counter</v-icon>
            </div>
            <div class="stat-card-modern stat-ingreso">
              <span class="stat-label">Promedio diario</span>
              <span class="stat-value">{{ promedioDiario }}</span>
              <v-icon class="stat-icon" color="#0f766e">mdi-chart-line</v-icon>
            </div>
            <div class="stat-card-modern stat-ingreso">
              <span class="stat-label">Días con datos</span>
              <span class="stat-value">{{ diasConDatos }}</span>
              <v-icon class="stat-icon" color="#0f766e">mdi-calendar-range</v-icon>
            </div>
          </div>
          <div class="chart-wrapper">
            <div v-if="loading" class="chart-placeholder">Cargando datos...</div>
            <canvas v-else ref="chartCanvas" class="chart-canvas"></canvas>
          </div>
        </div>
      </v-col>

      <!-- Estado de Cartas -->
      <v-col cols="12" md="6">
        <div class="card-modern">
          <div class="card-header">
            <h3 class="card-title">
              <v-icon class="icon-title">mdi-email</v-icon>
              Estado de Cartas
            </h3>
          </div>
          <div class="stats-grid-4">
            <div class="stat-card-modern stat-emitido">
              <span class="stat-label">Emitidos</span>
              <span class="stat-value">{{ totalEmitidos }}</span>
              <v-icon class="stat-icon" color="#3b82f6">mdi-send</v-icon>
            </div>
            <div class="stat-card-modern stat-enviado">
              <span class="stat-label">Enviados</span>
              <span class="stat-value">{{ totalEnviados }}</span>
              <v-icon class="stat-icon" color="#f59e0b">mdi-email-send</v-icon>
            </div>
            <div class="stat-card-modern stat-entregado">
              <span class="stat-label">Entregados</span>
              <span class="stat-value">{{ totalEntregados }}</span>
              <v-icon class="stat-icon" color="#10b981">mdi-check-circle</v-icon>
            </div>
            <div class="stat-card-modern stat-anulado">
              <span class="stat-label">Anulados</span>
              <span class="stat-value">{{ totalAnulados }}</span>
              <v-icon class="stat-icon" color="#ef4444">mdi-close-circle</v-icon>
            </div>
          </div>
          <div class="chart-wrapper">
            <div v-if="loading" class="chart-placeholder">Cargando datos...</div>
            <canvas v-else ref="chartCanvas2" class="chart-canvas"></canvas>
          </div>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script>
// (Mismo script que proporcionaste, sin cambios)
import Chart from 'chart.js/auto'
import { normalizeIngresoCisterna } from '~/models/ingresoCisterna'

export default {
  name: 'IndexPage',
  data() {
    return {
      contadorPDF: 0,
      ultimaFechaPDF: null,
      loading: false,
      ingresos: [],
      cartas: [],
      fechaInicio: '',
      fechaFin: '',
      chartInstance: null,
      chartInstance2: null,
    }
  },

  computed: {
    ingresosFiltrados() {
      if (!this.ingresos.length) return []
      if (!this.fechaInicio && !this.fechaFin) return this.ingresos

      return this.ingresos.filter(item => {
        const fechaItem = this.obtenerFechaString(item.fechaIngreso)
        if (!fechaItem) return false
        if (this.fechaInicio && fechaItem < this.fechaInicio) return false
        if (this.fechaFin && fechaItem > this.fechaFin) return false
        return true
      })
    },

    datosGraficoIngresos() {
      const grupos = {}
      this.ingresosFiltrados.forEach(i => {
        const dia = this.formatearFechaDDMMYYYY(i.fechaIngreso)
        if (dia) grupos[dia] = (grupos[dia] || 0) + 1
      })
      const fechas = Object.keys(grupos).sort((a, b) => {
        const [d1, m1, y1] = a.split('/').map(Number)
        const [d2, m2, y2] = b.split('/').map(Number)
        return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2)
      })
      return { labels: fechas, counts: fechas.map(f => grupos[f]) }
    },

    totalIngresos() {
      return this.ingresosFiltrados.length
    },

    promedioDiario() {
      const dias = this.diasConDatos
      return dias > 0 ? (this.totalIngresos / dias).toFixed(1) : '0'
    },

    diasConDatos() {
      return this.datosGraficoIngresos.labels.length
    },

    cartasFiltradas() {
      if (!this.cartas.length) return []
      if (!this.fechaInicio && !this.fechaFin) return this.cartas

      return this.cartas.filter(item => {
        const fechaItem = this.obtenerFechaString(item.fecha || item.fechaCreacion)
        if (!fechaItem) return false
        if (this.fechaInicio && fechaItem < this.fechaInicio) return false
        if (this.fechaFin && fechaItem > this.fechaFin) return false
        return true
      })
    },

    totalEmitidos() {
      return this.cartasFiltradas.filter(c => c.estadoProceso === 'Emitido').length
    },
    totalEnviados() {
      return this.cartasFiltradas.filter(c => c.estadoProceso === 'Enviado').length
    },
    totalEntregados() {
      return this.cartasFiltradas.filter(c => c.estadoProceso === 'Entregado').length
    },
    totalAnulados() {
      return this.cartasFiltradas.filter(c => c.estadoProceso === 'Anulado').length
    },

    datosGraficoEstados() {
      const estados = ['Emitido', 'Enviado', 'Pendiente de Confirmación', 'Entregado', 'Anulado']
      const counts = estados.map(e => this.cartasFiltradas.filter(c => c.estadoProceso === e).length)
      return { labels: estados, counts }
    },
  },

  watch: {
    ingresosFiltrados() {
      this.renderizarGraficoIngresos()
    },
    cartasFiltradas() {
      this.renderizarGraficoEstados()
    },
  },

  mounted() {
    this.cargarDatos()
    this.cargarContadorPDF()
    console.log('Cartas', this.cartas)
  },

  beforeUnmount() {
    if (this.chartInstance) {
      this.chartInstance.destroy()
      this.chartInstance = null
    }
    if (this.chartInstance2) {
      this.chartInstance2.destroy()
      this.chartInstance2 = null
    }
  },

  methods: {
    async cargarContadorPDF() {
      try {
        const totalSnapshot = await this.$db.collection('firmarPdf').get()
        this.contadorPDF = totalSnapshot.size

        const lastSnapshot = await this.$db
          .collection('firmarPdf')
          .orderBy('fecha', 'desc')
          .limit(1)
          .get()

        if (!lastSnapshot.empty) {
          const data = lastSnapshot.docs[0].data()
          this.ultimaFechaPDF = data.fecha || null
        } else {
          this.ultimaFechaPDF = null
        }
      } catch (error) {
        console.error('Error cargando contador PDF:', error)
        if (error.code === 'failed-precondition') {
          console.warn('No hay índice. Obteniendo el último documento...')
          const fallbackSnapshot = await this.$db
            .collection('firmarPdf')
            .limit(1)
            .get()
          if (!fallbackSnapshot.empty) {
            const data = fallbackSnapshot.docs[0].data()
            this.ultimaFechaPDF = data.fecha || null
          }
        }
      }
    },
    formatDate(date) {
      if (!date) return 'Sin datos'
      const d = date.toDate ? date.toDate() : new Date(date)
      if (isNaN(d.getTime())) return 'Fecha inválida'
      return d.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    obtenerFechaString(fecha) {
      if (!fecha) return null
      let dateObj
      if (fecha instanceof Date) {
        dateObj = fecha
      } else if (typeof fecha === 'object' && typeof fecha.toDate === 'function') {
        dateObj = fecha.toDate()
      } else if (typeof fecha === 'object' && fecha.seconds !== undefined) {
        dateObj = new Date(fecha.seconds * 1000 + (fecha.nanoseconds || 0) / 1000000)
      } else if (typeof fecha === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha
        dateObj = new Date(fecha)
      } else {
        dateObj = new Date(fecha)
      }
      if (isNaN(dateObj.getTime())) return null
      const y = dateObj.getFullYear()
      const m = String(dateObj.getMonth() + 1).padStart(2, '0')
      const d = String(dateObj.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    formatearFechaDDMMYYYY(fecha) {
      const fechaStr = this.obtenerFechaString(fecha)
      if (!fechaStr) return null
      const [y, m, d] = fechaStr.split('-')
      return `${d}/${m}/${y}`
    },

    formatearInputDate(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    async cargarDatos() {
      this.loading = true
      const hoy = new Date()

      this.fechaInicio = this.formatearInputDate(
        new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      )
      this.fechaFin = this.formatearInputDate(hoy)

      try {
        const [ingresosDocs, cartasDocs] = await Promise.all([
          this.$firebaseApi.list('ingresosCisterna'),
          this.$firebaseApi.list('cartas')
        ])

        this.ingresos = ingresosDocs
          .map(normalizeIngresoCisterna)
          .filter(i => i.estado !== false)

        this.cartas = cartasDocs.map(doc => this.normalizeCarta(doc))

      } catch (error) {
        console.error('Error al cargar datos:', error)
        alert('No se pudieron cargar los datos')
      } finally {
        this.loading = false
      }
    },

    resetFiltros() {
      const hoy = new Date()
      this.fechaInicio = this.formatearInputDate(
        new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      )
      this.fechaFin = this.formatearInputDate(hoy)
    },

    mostrarTodo() {
      this.fechaInicio = ''
      this.fechaFin = ''
    },
    normalizeCarta(carta) {
      const source = carta || {}
      return {
        id: source.id || '',
        correlativo: source.correlativo || '',
        estadoProceso: source.estadoProceso || source.estado || 'Emitido',
        fecha: source.fecha || null,
        fechaServicio: source.fechaServicio || null,
        fechaCreacion: source.fechaCreacion || null
      }
    },

    renderizarGraficoIngresos() {
      this.$nextTick(() => {
        const canvas = this.$refs.chartCanvas
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        if (this.chartInstance) {
          this.chartInstance.destroy()
          this.chartInstance = null
        }

        const { labels, counts } = this.datosGraficoIngresos
        if (labels.length === 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#94a3b8'
          ctx.font = '14px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('No hay datos en el período seleccionado', canvas.width / 2, canvas.height / 2)
          return
        }

        this.chartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Ingresos',
              data: counts,
              backgroundColor: '#0f766e',
              borderRadius: 4,
              barPercentage: 0.6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.raw} ingreso(s)`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: Math.max(1, Math.ceil(Math.max(...counts) / 5))
                }
              },
              x: {
                grid: { display: false }
              }
            }
          }
        })
      })
    },

    renderizarGraficoEstados() {
      this.$nextTick(() => {
        const canvas = this.$refs.chartCanvas2
        if (!canvas) return
        const ctx = canvas.getContext('2d')

        if (this.chartInstance2) {
          this.chartInstance2.destroy()
          this.chartInstance2 = null
        }

        const { labels, counts } = this.datosGraficoEstados
        const total = counts.reduce((a, b) => a + b, 0)

        if (total === 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#94a3b8'
          ctx.font = '14px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('No hay datos', canvas.width / 2, canvas.height / 2)
          return
        }

        this.chartInstance2 = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Cantidad',
              data: counts,
              backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'],
              borderRadius: 4,
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => `${context.raw} carta(s)`
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { stepSize: 1 }
              },
              y: {
                grid: { display: false }
              }
            }
          }
        })
      })
    }
  }
}
</script>

<style scoped>
/* ========================================================= */
/* ESTILOS SIMPLIFICADOS - SIN HOVERS Y MÁS COMPACTOS        */
/* ========================================================= */

.home-page {
  padding: 24px 16px;
  background: #f1f5f9;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ---------- ENCABEZADO ---------- */
.dashboard-header {
  margin-bottom: 24px;
  background: #0f172a;
  border-radius: 16px;
  padding: 24px 32px;
  color: white;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.8;
}

h1 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.subtitle {
  margin: 0;
  font-size: 15px;
  font-weight: 400;
  opacity: 0.9;
}

/* ---------- FILTROS (más compactos) ---------- */
.filters-wrapper {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  background: white;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1 0 130px;
}

.filter-group label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-group label .v-icon {
  color: #0f766e;
  font-size: 16px;
}

.filter-input {
  height: 36px;
  padding: 0 10px;
  border: 1px solid #d1d9e6;
  border-radius: 8px;
  font-size: 13px;
  background: white;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
}

.filter-input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.secondary-button {
  height: 36px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: #f1f5f9;
  color: #1e293b;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.secondary-button:active {
  background: #e2e8f0;
}

.filter-hint {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ---------- TARJETAS (sin hover) ---------- */
.card-modern {
  background: white;
  border-radius: 16px;
  padding: 20px 24px 24px;
  border: 1px solid #e2e8f0;
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-title {
  color: #0f766e;
  font-size: 22px;
}

/* ---------- TARJETAS DE ESTADÍSTICAS ---------- */
.stats-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stats-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stats-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card-modern {
  padding: 14px 12px;
  background: #fafbfc;
  border-radius: 12px;
  border-left: 4px solid #0f766e;
  text-align: center;
  position: relative;
}

.stat-label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.stat-value {
  display: block;
  margin-top: 4px;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.stat-icon {
  position: absolute;
  right: 10px;
  top: 10px;
  opacity: 0.25;
  font-size: 18px;
}

/* Colores específicos para cada estado de carta */
.stat-emitido {
  border-left-color: #3b82f6;
}

.stat-enviado {
  border-left-color: #f59e0b;
}

.stat-entregado {
  border-left-color: #10b981;
}

.stat-anulado {
  border-left-color: #ef4444;
}

.stat-ingreso {
  border-left-color: #0f766e;
}

.stat-pdf {
  border-left-color: #0f766e;
}

/* ---------- GRÁFICOS ---------- */
.chart-wrapper {
  position: relative;
  height: 240px;
  width: 100%;
  margin-top: 4px;
  background: #fafbfc;
  border-radius: 12px;
  padding: 6px;
}

.chart-canvas {
  width: 100% !important;
  height: 100% !important;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
}

/* ---------- RESPONSIVE ---------- */
@media (max-width: 960px) {

  .stats-grid-2,
  .stats-grid-3,
  .stats-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .home-page {
    padding: 12px 10px;
  }

  .filters-wrapper {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
  }

  .filter-actions {
    justify-content: stretch;
  }

  .filter-actions button {
    flex: 1;
    justify-content: center;
  }

  .stats-grid-2,
  .stats-grid-3,
  .stats-grid-4 {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-card-modern {
    padding: 12px 8px;
  }

  .stat-value {
    font-size: 20px;
  }

  .card-modern {
    padding: 14px 12px 16px;
  }

  .chart-wrapper {
    height: 180px;
  }

  .dashboard-header {
    padding: 16px 20px;
    border-radius: 12px;
  }

  h1 {
    font-size: 22px;
  }

  .subtitle {
    font-size: 13px;
  }
}
</style>