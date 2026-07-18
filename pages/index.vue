<template>
  <section class="home-page">
    <!-- Encabezado -->
    <div class="dashboard-header">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>Gráficos</h1>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <label>Desde</label>
        <input v-model="fechaInicio" type="date" />
      </div>
      <div class="filter-group">
        <label>Hasta</label>
        <input v-model="fechaFin" type="date" />
      </div>
      <button class="secondary-button" @click="resetFiltros">Resetear</button>
      <button class="secondary-button" @click="mostrarTodo">Mostrar todo</button>
    </div>

    <v-row>
      <!-- Columna izquierda: Ingresos Cisterna -->
      <v-col cols="12" md="6">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Total ingresos</span>
            <span class="stat-value">{{ totalIngresos }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Promedio diario</span>
            <span class="stat-value">{{ promedioDiario }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Días con datos</span>
            <span class="stat-value">{{ diasConDatos }}</span>
          </div>
        </div>
        <div class="chart-container">
          <h3>Ingresos Cisterna</h3>
          <div v-if="loading" class="chart-placeholder">Cargando datos...</div>
          <canvas v-else ref="chartCanvas" height="250"></canvas>
        </div>
      </v-col>

      <!-- Columna derecha: Estado de Cartas -->
      <v-col cols="12" md="6">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Emitidos</span>
            <span class="stat-value">{{ totalEmitidos }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Enviados</span>
            <span class="stat-value">{{ totalEnviados }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Entregados</span>
            <span class="stat-value">{{ totalEntregados }}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Anulados</span>
            <span class="stat-value">{{ totalAnulados }}</span>
          </div>
        </div>
        <div class="chart-container">
          <h3>Estado de Cartas</h3>
          <div v-if="loading" class="chart-placeholder">Cargando datos...</div>
          <canvas v-else ref="chartCanvas2" height="250"></canvas>
        </div>
      </v-col>
    </v-row>
  </section>
</template>

<script>
import Chart from 'chart.js/auto'
import { normalizeIngresoCisterna } from '~/models/ingresoCisterna'
// IMPORTANTE: Asegúrate de tener un normalizeCarta o usa normalizeCliente si es el mismo

export default {
  name: 'IndexPage',
  data() {
    return {
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

    // ------------------------------------------------------------
    // CARTAS FILTRADAS
    // ------------------------------------------------------------
    cartasFiltradas() {
      if (!this.cartas.length) return []
      if (!this.fechaInicio && !this.fechaFin) return this.cartas

      return this.cartas.filter(item => {
        // Usamos fechaCreacion (timestamp) o fecha (string) - priorizamos fechaCreacion
        const fechaItem = this.obtenerFechaString(item.fecha || item.fechaCreacion)
        if (!fechaItem) return false
        if (this.fechaInicio && fechaItem < this.fechaInicio) return false
        if (this.fechaFin && fechaItem > this.fechaFin) return false
        return true
      })
    },

    // Totales por estadoProceso
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
    // ------------------------------------------------------------
    // UTILIDADES DE FECHAS
    // ------------------------------------------------------------
    obtenerFechaString(fecha) {
      if (!fecha) return null
      let dateObj
      if (fecha instanceof Date) {
        dateObj = fecha
      } else if (typeof fecha === 'object' && typeof fecha.toDate === 'function') {
        dateObj = fecha.toDate()
      } else if (typeof fecha === 'object' && fecha.seconds !== undefined) {
        // Firestore timestamp
        dateObj = new Date(fecha.seconds * 1000 + (fecha.nanoseconds || 0) / 1000000)
      } else if (typeof fecha === 'string') {
        // Si es string en formato YYYY-MM-DD o ISO
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

    // ------------------------------------------------------------
    // CARGA DE DATOS
    // ------------------------------------------------------------
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

        // Normaliza las cartas. Si no tienes normalizeCarta, usa el mapper directo
        this.cartas = cartasDocs.map(doc => {
          // Si normalizeCliente funciona, úsalo; sino, haz un mapeo manual
          return this.normalizeCarta(doc)
        })

        // Opcional: filtrar cartas inactivas si tienen campo estado
        // this.cartas = this.cartas.filter(c => c.estado !== false)

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

    // ------------------------------------------------------------
    // RENDERIZADO DE GRÁFICOS
    // ------------------------------------------------------------
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
.home-page {
  padding: 30px;
}

.dashboard-header {
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 28px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.filter-group input {
  height: 40px;
  padding: 0 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  outline: none;
}

.filter-group input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
}

.secondary-button {
  height: 40px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
  font-weight: 600;
  cursor: pointer;
}

.secondary-button:hover {
  background: #f1f5f9;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.stat-card {
  padding: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.5px;
}

.stat-value {
  display: block;
  margin-top: 4px;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}

.chart-container {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-top: 8px;
}

.chart-container h3 {
  margin: 0 0 16px;
  font-size: 16px;
  color: #1e293b;
}

.chart-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 250px;
  color: #94a3b8;
  font-size: 14px;
}

canvas {
  width: 100% !important;
  max-height: 250px;
}
</style>
