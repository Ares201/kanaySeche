<template>
  <section class="home-page">
    <!-- Encabezado -->
    <div class="dashboard-header">
      <div>
        <p class="eyebrow">Resumen</p>
        <h1>Dashboard de Ingresos</h1>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <div class="filter-group">
        <label>Desde</label>
        <input v-model="fechaInicio" type="date" @change="actualizarDashboard" />
      </div>
      <div class="filter-group">
        <label>Hasta</label>
        <input v-model="fechaFin" type="date" @change="actualizarDashboard" />
      </div>
      <button class="secondary-button" @click="resetFiltros">Resetear</button>
      <button class="secondary-button" @click="mostrarTodo">Mostrar todo</button>
    </div>

    <!-- Tarjetas de estadísticas -->
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

    <!-- Gráfico -->
    <div class="chart-container">
      <h3>Ingresos por día</h3>
      <div v-if="loading" class="chart-placeholder">Cargando datos...</div>
      <canvas v-else ref="chartCanvas" height="250"></canvas>
    </div>
  </section>
</template>

<script>
import Chart from 'chart.js/auto'
import { formatDateOnly } from '~/utils/formatters'
import { normalizeIngresoCisterna } from '~/models/ingresoCisterna'

export default {
  name: 'IndexPage',
  data() {
    return {
      loading: false,
      ingresos: [],
      fechaInicio: '',
      fechaFin: '',
      chartInstance: null
    }
  },
  computed: {
    // Convierte fechAIngreso a Date de forma robusta
    parseDate(dateInput) {
      if (!dateInput) return null
      if (dateInput instanceof Date) return dateInput
      if (typeof dateInput === 'string') {
        // Si es ISO (YYYY-MM-DD o YYYY-MM-DDTHH:mm)
        if (/^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
          return new Date(dateInput)
        }
        // Si es "DD/MM/YYYY" (formato que devuelve formatDateOnly)
        const partes = dateInput.split('/')
        if (partes.length === 3) {
          const dia = parseInt(partes[0], 10)
          const mes = parseInt(partes[1], 10) - 1
          const anio = parseInt(partes[2], 10)
          return new Date(anio, mes, dia)
        }
        return new Date(dateInput)
      }
      if (typeof dateInput === 'object' && dateInput.seconds !== undefined) {
        // Firestore timestamp
        return new Date(dateInput.seconds * 1000 + (dateInput.nanoseconds || 0) / 1e6)
      }
      return new Date(dateInput)
    },

    ingresosFiltrados() {
      // Si no hay filtros, devolver todos
      if (!this.fechaInicio && !this.fechaFin) return this.ingresos

      const inicio = this.fechaInicio ? new Date(this.fechaInicio) : null
      const fin = this.fechaFin ? new Date(this.fechaFin) : null
      if (fin) fin.setHours(23, 59, 59, 999)

      return this.ingresos.filter(i => {
        const fecha = this.parseDate(i.fechaIngreso)
        if (!fecha) return false
        if (inicio && fecha < inicio) return false
        if (fin && fecha > fin) return false
        return true
      })
    },

    datosGrafico() {
      const grupos = {}
      this.ingresosFiltrados.forEach(i => {
        const dia = formatDateOnly(i.fechaIngreso)
        grupos[dia] = (grupos[dia] || 0) + 1
      })
      const fechas = Object.keys(grupos).sort((a, b) => {
        // Ordenar por fecha real (DD/MM/YYYY)
        const [d1, m1, y1] = a.split('/').map(Number)
        const [d2, m2, y2] = b.split('/').map(Number)
        return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2)
      })
      return {
        labels: fechas,
        counts: fechas.map(f => grupos[f])
      }
    },

    totalIngresos() {
      return this.ingresosFiltrados.length
    },

    promedioDiario() {
      const dias = this.diasConDatos
      return dias > 0 ? (this.totalIngresos / dias).toFixed(1) : '0'
    },

    diasConDatos() {
      return this.datosGrafico.labels.length
    }
  },
  watch: {
    ingresosFiltrados: {
      deep: true,
      handler() {
        this.renderizarGrafico()
      }
    }
  },
  mounted() {
    this.cargarDatos()
  },
  beforeUnmount() {
    if (this.chartInstance) {
      this.chartInstance.destroy()
      this.chartInstance = null
    }
  },
  methods: {
    async cargarDatos() {
      this.loading = true
      try {
        const docs = await this.$firebaseApi.list('ingresosCisterna')
        this.ingresos = docs.map(normalizeIngresoCisterna).filter(i => i.estado !== false)
        console.log('Ingresos cargados:', this.ingresos.length)
        // Por defecto, mostrar todos (sin filtros)
        this.mostrarTodo()
      } catch (error) {
        console.error('Error cargando ingresos:', error)
        alert('No se pudieron cargar los datos')
      } finally {
        this.loading = false
      }
    },

    mostrarTodo() {
      this.fechaInicio = ''
      this.fechaFin = ''
      this.renderizarGrafico()
    },

    resetFiltros() {
      // Puedes definir un rango por defecto (ej. último mes) o simplemente mostrar todo
      this.mostrarTodo()
    },

    actualizarDashboard() {
      // El watch se encarga
    },

    renderizarGrafico() {
      this.$nextTick(() => {
        const canvas = this.$refs.chartCanvas
        if (!canvas) return

        const ctx = canvas.getContext('2d')

        if (this.chartInstance) {
          this.chartInstance.destroy()
          this.chartInstance = null
        }

        const { labels, counts } = this.datosGrafico
        console.log('Datos para gráfico:', { labels, counts })

        if (labels.length === 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = '#94a3b8'
          ctx.font = '14px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('No hay datos en el período seleccionado', canvas.width / 2, canvas.height / 2)
          return
        }

        // Crear gráfico
        this.chartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Ingresos',
                data: counts,
                backgroundColor: '#0f766e',
                borderRadius: 4,
                barPercentage: 0.6
              }
            ]
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
    }
  }
}
</script>

<style scoped>
/* Estilos iguales que antes... */
.home-page {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  padding: 16px;
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
  margin-top: 6px;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.chart-container {
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
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