<template>
  <section class="dashboard">
    <header class="header">
      <div>
        <span>Control y Aceptación</span>
        <h1>Movimientos por fecha y ubicación</h1>
      </div>
      <button type="button" :disabled="loading" @click="limpiarFiltros">
        <v-icon small>mdi-filter-remove-outline</v-icon>Limpiar filtros
      </button>
    </header>

    <!-- Filtros de búsqueda -->
    <section class="filters-card">
      <v-row dense>
        <v-col v-for="filter in filterDefinitions" :key="filter.key" cols="12" sm="6" lg="4">
          <v-autocomplete v-model="filters[filter.key]" :items="options[filter.key]" :label="filter.label"
            :loading="optionLoading[filter.key]" clearable outlined dense hide-no-data
            :search-input.sync="searches[filter.key]" @change="onFilterChange"
            @update:search-input="onSearch(filter.key, $event)" />
        </v-col>
      </v-row>
    </section>

    <!-- Estado de Error -->
    <div v-if="error" class="error">
      <v-icon color="error">mdi-alert-circle-outline</v-icon>
      <div><strong>No se pudo consultar BigQuery.</strong><small>{{ error }}</small></div>
    </div>

    <!-- Indicadores -->
    <section class="summary">
      <article>
        <small>Total de movimientos</small>
        <strong>{{ total.toLocaleString('es-PE') }}</strong>
        <v-icon>mdi-chart-bar</v-icon>
      </article>
      <article>
        <small>Ubicaciones / Fechas</small>
        <strong>{{ resultados.length }}</strong>
        <v-icon>mdi-map-marker-multiple-outline</v-icon>
      </article>
      <article>
        <small>Filtros activos</small>
        <strong>{{ filtrosActivos }}</strong>
        <v-icon>mdi-filter-outline</v-icon>
      </article>
    </section>

    <!-- Gráfico -->
    <article class="chart-card">
      <div class="chart-title">
        <div>
          <h2>Movimientos por Fecha y Ubicación</h2>
          <p>Cantidad de movimientos agrupados por fecha de ingreso y ubicación física.</p>
        </div>
        <v-progress-circular v-if="loading" indeterminate size="26" color="primary" />
      </div>
      <div v-show="resultados.length" class="chart"><canvas ref="ubicacionesChart" /></div>
      <div v-if="!loading && !resultados.length" class="empty">
        <v-icon large>mdi-chart-box-outline</v-icon>No existen resultados para los filtros seleccionados.
      </div>
    </article>

    <!-- Tabla Detalle de Registros -->
    <article class="table-card mt-6">
      <div class="table-header">
        <div>
          <h2>Detalle de Registros</h2>
          <p>Mostrando los últimos {{ listaRegistros.length }} registros filtrados.</p>
        </div>
        <v-text-field v-model="tablaBusqueda" append-icon="mdi-magnify" label="Buscar en tabla..." single-line
          hide-details dense outlined style="max-width: 300px;" />
      </div>

      <v-data-table :headers="headersTabla" :items="listaRegistros" :search="tablaBusqueda" :loading="loadingTabla"
        :items-per-page="10" dense class="elevation-0">
        <template #[`item.pedido_venta`]="{ item }">
          <span class="font-weight-bold primary--text">{{ item.pedido_venta || '-' }}</span>
        </template>

        <template #[`item.tipo`]="{ item }">
          <v-chip v-if="item.tipo" small label color="teal" text-color="white">
            {{ item.tipo }}
          </v-chip>
          <span v-else>-</span>
        </template>
      </v-data-table>
    </article>
  </section>
</template>

<script>
import Chart from 'chart.js/auto'

const emptyFilters = () => ({
  fecha_ingreso: null,
  generador: null,
  producto_cliente: null,
  transportista: null,
  tratamiento: null,
  ubicacion: null
})

const CHART_COLORS = ['#087f8c', '#2e93a0', '#46a7b4', '#68bbc8', '#8ecfdb', '#1d6f8a', '#104e61', '#3b82f6', '#8b5cf6']

export default {
  name: 'GraficosControlAceptacionPage',
  data() {
    return {
      filters: emptyFilters(),
      searches: emptyFilters(),
      options: emptyFilters(),
      optionLoading: {
        fecha_ingreso: false, generador: false, producto_cliente: false,
        transportista: false, tratamiento: false, ubicacion: false
      },
      resultados: [],
      listaRegistros: [],
      tablaBusqueda: '',
      loadingTabla: false,
      total: 0,
      loading: false,
      error: '',
      chart: null,
      debounceTimers: {},
      requestVersion: 0,
      headersTabla: [
        { text: 'Fecha Ingreso Cisterna', value: 'fecha_ingreso' },
        { text: 'Pedido de Venta', value: 'pedido_venta' },
        { text: 'Ubicación', value: 'ubicacion' },
        { text: 'Tratamiento Propuesto', value: 'tratamiento' },
        { text: 'Tipo', value: 'tipo' },
        { text: 'Fecha Ingreso Muestra', value: 'fecha_muestra' },
        { text: 'Generador', value: 'generador' },
        { text: 'Producto Cliente', value: 'producto_cliente' },
        { text: 'Transportista', value: 'transportista' }
      ]
    }
  },
  computed: {
    filterDefinitions() {
      return [
        { key: 'fecha_ingreso', label: 'Fecha de Ingreso' },
        { key: 'ubicacion', label: 'Ubicación' },
        { key: 'tratamiento', label: 'Tratamiento Propuesto' },
        { key: 'generador', label: 'Generador' },
        { key: 'producto_cliente', label: 'Nombre Producto Cliente' },
        { key: 'transportista', label: 'Transportista' }
      ]
    },
    filtrosActivos() {
      return Object.values(this.filters).filter(Boolean).length
    }
  },
  mounted() {
    this.actualizarDashboard()
  },
  beforeDestroy() {
    this.destruirGrafico()
    Object.values(this.debounceTimers).forEach(clearTimeout)
  },
  methods: {
    parametros(extra = {}) {
      const params = new URLSearchParams(extra)
      Object.entries(this.filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      return params
    },
    async solicitar(params) {
      // Usamos $axios.$get para apuntar directamente a tu API en Render
      const response = await this.$axios.$get(`/api/bigquery/movimientos?${params.toString()}`)

      // Axios parsea automáticamente el JSON y extrae la propiedad data/success
      if (!response || !response.success) {
        throw new Error(response?.error || 'Error al obtener datos desde la API')
      }
      return response.data
    },
    async cargarOpciones(field, search = '') {
      this.$set(this.optionLoading, field, true)
      try {
        const data = await this.solicitar(this.parametros({ action: 'opciones', field, search, limit: '30' }))
        this.$set(this.options, field, data)
      } catch (error) {
        this.error = error.message
      } finally {
        this.$set(this.optionLoading, field, false)
      }
    },
    cargarTodasOpciones() {
      return Promise.all(this.filterDefinitions.map(item => this.cargarOpciones(item.key)))
    },
    async cargarEstadisticas() {
      const version = ++this.requestVersion
      this.loading = true
      this.error = ''
      try {
        const data = await this.solicitar(this.parametros({ action: 'estadisticas' }))
        if (version !== this.requestVersion) return
        this.total = Number(data.total) || 0
        this.resultados = Array.isArray(data.resultados) ? data.resultados : []
        this.$nextTick(this.renderizarGrafico)
      } catch (error) {
        if (version === this.requestVersion) this.error = error.message
      } finally {
        if (version === this.requestVersion) this.loading = false
      }
    },
    async cargarTablaRegistros() {
      this.loadingTabla = true
      try {
        const data = await this.solicitar(this.parametros({ action: 'registros', limit: '200' }))
        this.listaRegistros = Array.isArray(data) ? data : []
      } catch (error) {
        console.error('Error cargando registros:', error)
      } finally {
        this.loadingTabla = false
      }
    },
    actualizarDashboard() {
      return Promise.all([
        this.cargarTodasOpciones(),
        this.cargarEstadisticas(),
        this.cargarTablaRegistros()
      ])
    },
    onFilterChange() {
      this.actualizarDashboard()
    },
    onSearch(field, value) {
      clearTimeout(this.debounceTimers[field])
      this.debounceTimers[field] = setTimeout(() => {
        if (value !== this.filters[field]) this.cargarOpciones(field, value || '')
      }, 400)
    },
    limpiarFiltros() {
      this.filters = emptyFilters()
      this.searches = emptyFilters()
      this.actualizarDashboard()
    },
    renderizarGrafico() {
      this.destruirGrafico()
      if (!this.$refs.ubicacionesChart || !this.resultados.length) return

      const fechas = [...new Set(this.resultados.map(x => x.fecha_ingreso || 'Sin Fecha'))].sort()
      const ubicaciones = [...new Set(this.resultados.map(x => x.ubicacion || 'Sin Ubicación'))]

      const datasets = ubicaciones.map((ubicacion, index) => {
        const color = CHART_COLORS[index % CHART_COLORS.length]
        const data = fechas.map(fecha => {
          const item = this.resultados.find(r => r.fecha_ingreso === fecha && r.ubicacion === ubicacion)
          return item ? Number(item.cantidad) : 0
        })

        return {
          label: ubicacion,
          data,
          backgroundColor: color,
          borderRadius: 4,
          maxBarThickness: 50
        }
      })

      this.chart = new Chart(this.$refs.ubicacionesChart, {
        type: 'bar',
        data: { labels: fechas, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top' },
            tooltip: {
              callbacks: {
                label: c => `${c.dataset.label}: ${Number(c.raw).toLocaleString('es-PE')} mov.`
              }
            }
          },
          scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      })
    },
    destruirGrafico() {
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  padding: 28px 24px;
  color: #172033;
  background: #f3f6f8
}

.header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px
}

.header span {
  color: #087f8c;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase
}

h1,
h2,
p {
  margin: 0
}

h1 {
  margin-top: 3px;
  font-size: 30px
}

.header p,
.chart-card p,
.table-card p {
  margin-top: 5px;
  color: #64748b
}

.header button {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 40px;
  padding: 0 15px;
  border: 0;
  border-radius: 7px;
  color: #fff;
  background: #087f8c;
  font-weight: 700;
  cursor: pointer
}

.header button .v-icon {
  color: #fff
}

.filters-card,
.chart-card,
.table-card,
.summary article {
  border: 1px solid #e1e7ec;
  border-radius: 9px;
  background: #fff
}

.filters-card {
  padding: 18px 18px 0;
  margin-bottom: 18px
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 18px
}

.summary article {
  position: relative;
  padding: 17px
}

.summary small,
.summary strong {
  display: block
}

.summary small {
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase
}

.summary strong {
  margin-top: 4px;
  font-size: 27px
}

.summary .v-icon {
  position: absolute;
  right: 15px;
  top: 16px;
  color: #087f8c;
  opacity: .3
}

.chart-card,
.table-card {
  padding: 20px
}

.chart-title,
.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.chart-title h2,
.table-header h2 {
  font-size: 18px
}

.chart {
  height: 420px;
  margin-top: 18px
}

.empty {
  display: grid;
  min-height: 300px;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: #64748b
}

.error {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  background: #fef2f2
}

.error small {
  display: block;
  margin-top: 3px
}

@media(max-width:800px) {
  .summary {
    grid-template-columns: 1fr
  }

  .header {
    align-items: stretch;
    flex-direction: column
  }

  .header button {
    justify-content: center
  }

  .table-header {
    flex-direction: column;
    align-items: stretch;
  }
}

@media(max-width:600px) {
  .dashboard {
    padding: 18px 12px
  }

  h1 {
    font-size: 25px
  }

  .chart {
    height: 320px
  }
}
</style>