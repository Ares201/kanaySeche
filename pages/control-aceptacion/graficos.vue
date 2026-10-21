<template>
  <section class="dashboard">
    <header class="header">
      <div>
        <span>Control y Aceptación</span>
        <h1>Control de Ingresos</h1>
      </div>
      <div class="header-actions">
        <v-chip-group v-model="vista" mandatory active-class="primary--text" class="view-selector"
          aria-label="Vista de resultados">
          <v-chip value="grafico" outlined><v-icon left small>mdi-chart-bar</v-icon>Gráfico</v-chip>
          <v-chip value="tabla" outlined><v-icon left small>mdi-table</v-icon>Tabla</v-chip>
        </v-chip-group>
        <button class="clear-filters" type="button" :disabled="loading" @click="limpiarFiltros">
          <v-icon small>mdi-filter-remove-outline</v-icon>Limpiar filtros
        </button>
      </div>
    </header>

    <!-- Filtros de búsqueda -->
    <section class="filters-card">
      <v-row dense>
        <v-col v-for="filter in filterDefinitions" :key="filter.key" cols="12" sm="6" lg="3">
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
      <article class="observation-card" :style="observacionCoincidente && !observacionError && !loadingObservaciones
        ? { backgroundColor: estadoObservacion.fondo, color: estadoObservacion.color, borderColor: estadoObservacion.color } : {}">
        <small>Observación</small>
        <v-chip v-if="observacionCoincidente && !observacionError && !loadingObservaciones" small class="mt-2"
          :color="estadoObservacion.fondo" :text-color="estadoObservacion.color">
          {{ estadoObservacion.text }}
        </v-chip>
        <p v-if="observacionError" role="alert">{{ observacionError }}</p>
        <p v-else-if="loadingObservaciones">Cargando observaciones...</p>
        <div v-else-if="observacionCoincidente">
          <p><b>Fecha de observación:</b> {{ fechaObservacionTexto(observacionCoincidente.fecha_observacion) }}</p>
          <p>{{ observacionCoincidente.observacion }}</p>
        </div>
        <p v-else-if="filtrosObservacionCompletos">No hay observación registrada para esta combinación.</p>
        <p v-else>Selecciona generador, transportista y producto cliente para consultar la observación.</p>
      </article>
      <article>
        <small>Filtros activos</small>
        <strong>{{ filtrosActivos }}</strong>
        <v-icon>mdi-filter-outline</v-icon>
      </article>
    </section>

    <!-- Gráfico -->
    <article v-show="vista === 'grafico'" class="chart-card">
      <div class="chart-title">
        <div>
          <h2>Movimientos por Fecha y Ubicación</h2>
          <p>Cantidad de movimientos agrupados por fecha y zona de recepción.</p>
        </div>
        <v-progress-circular v-if="loading" indeterminate size="26" color="primary" />
      </div>
      <div v-show="resultados.length" class="chart"><canvas ref="ubicacionesChart" /></div>
      <div v-if="!loading && !resultados.length" class="empty">
        <v-icon large>mdi-chart-box-outline</v-icon>No existen resultados para los filtros seleccionados.
      </div>
    </article>

    <!-- Tabla Detalle de Registros -->
    <article v-show="vista === 'tabla'" class="table-card">
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

        <template #[`item.clasificacion_sigersol`]="{ item }">
          <v-chip v-if="item.clasificacion_sigersol" small label color="teal" text-color="white">
            {{ item.clasificacion_sigersol }}
          </v-chip>
          <span v-else>-</span>
        </template>
      </v-data-table>
    </article>

  </section>
</template>

<script>
import Chart from '~/utils/theme-chart'
import { camposObservacion, coincideObservacion, obtenerEstadoObservacion, formatearFechaObservacion } from '~/utils/observaciones-control'

const emptyFilters = () => ({
  generador: null,
  producto_cliente: null,
  transportista: null,
  tipo_contenedor: null
})

const CHART_COLORS = ['#087f8c', '#2e93a0', '#46a7b4', '#68bbc8', '#8ecfdb', '#1d6f8a', '#104e61', '#3b82f6', '#8b5cf6']

export default {
  name: 'GraficosControlAceptacionPage',
  data() {
    return {
      vista: 'grafico',
      observaciones: [],
      observacionError: '',
      loadingObservaciones: false,
      filters: emptyFilters(),
      searches: emptyFilters(),
      options: emptyFilters(),
      optionLoading: {
        generador: false, producto_cliente: false, transportista: false, tipo_contenedor: false
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
        { text: 'Fecha', value: 'fecha_ingreso' },
        { text: 'No. Pedido de Venta', value: 'pedido_venta' },
        { text: 'Nombre Producto Cliente', value: 'producto_cliente' },
        { text: 'Clasificación Sigersol', value: 'clasificacion_sigersol' },
        { text: 'Cliente', value: 'cliente' },
        { text: 'Transportista', value: 'transportista' },
        { text: 'Generador', value: 'generador' },
        { text: 'Zona de recepción', value: 'ubicacion' },
        { text: 'Coordenadas', value: 'coordenadas' },
        { text: 'Tipo Contenedor', value: 'tipo_contenedor' }
      ]
    }
  },
  computed: {
    estadoObservacion() {
      return obtenerEstadoObservacion(this.observacionCoincidente?.estado)
    },
    filtrosObservacionCompletos() {
      return camposObservacion.every(field => this.filters[field])
    },
    observacionCoincidente() {
      return this.observaciones.find(record => coincideObservacion(record, this.filters))
    },
    filterDefinitions() {
      return [
        { key: 'generador', label: 'Generador' },
        { key: 'producto_cliente', label: 'Nombre Producto Cliente' },
        { key: 'transportista', label: 'Transportista' },
        { key: 'tipo_contenedor', label: 'Tipo Contenedor' }
      ]
    },
    filtrosActivos() {
      return Object.values(this.filters).filter(Boolean).length
    }
  },
  watch: {
    vista(value) {
      if (value === 'grafico') this.$nextTick(this.renderizarGrafico)
    }
  },
  mounted() {
    this.actualizarDashboard()
    this.cargarObservaciones()
  },
  beforeDestroy() {
    this.destruirGrafico()
    Object.values(this.debounceTimers).forEach(clearTimeout)
  },
  methods: {
    fechaObservacionTexto: formatearFechaObservacion,
    async cargarObservaciones() {
      this.loadingObservaciones = true
      this.observacionError = ''
      try {
        this.observaciones = await this.$firebaseApi.list('observacionesControl')
      } catch (error) {
        this.observacionError = `No se pudieron cargar las observaciones: ${error.message}`
      } finally {
        this.loadingObservaciones = false
      }
    },
    parametros(extra = {}) {
      const params = new URLSearchParams(extra)
      Object.entries(this.filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })
      return params
    },
    async solicitar(params) {
      // Consulta el middleware de BigQuery en el mismo dominio de la aplicación.
      const response = await this.$axios.$get(`/api/reporteLab?${params.toString()}`)

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
  color: var(--ui-text-172033, #172033);
  background: var(--ui-surface-f3f6f8, #f3f6f8)
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px
}

.header span {
  color: var(--ui-text-087f8c, #087f8c);
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
  color: var(--ui-text-64748b, #64748b)
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px
}

.view-selector {
  flex: 0 0 auto
}

.clear-filters:disabled {
  opacity: .6;
  cursor: default
}

.clear-filters {
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

.clear-filters .v-icon {
  color: #fff
}

.filters-card,
.chart-card,
.table-card,
.summary article {
  border: 1px solid var(--ui-border-e1e7ec, #e1e7ec);
  border-radius: 9px;
  background: var(--ui-surface-ffffff, #fff)
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

.observation-card p {
  margin-top: 8px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 180px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.5
}

.observation-card small {
  color: inherit
}

.observation-card .v-chip {
  max-width: 100%;
  height: auto;
  min-height: 24px;
  white-space: normal
}

.summary small {
  color: var(--ui-text-64748b, #64748b);
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
  color: var(--ui-text-087f8c, #087f8c);
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
  color: var(--ui-text-64748b, #64748b)
}

.error {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  padding: 14px;
  border: 1px solid var(--ui-border-fecaca, #fecaca);
  border-radius: 8px;
  color: var(--ui-text-991b1b, #991b1b);
  background: var(--ui-surface-fef2f2, #fef2f2)
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

  .header-actions {
    justify-content: space-between
  }

  .clear-filters {
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
