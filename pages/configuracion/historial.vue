<template>
  <v-container fluid class="pa-4 pa-md-8">
    <v-row align="center" class="mb-4">
      <v-col cols="12" sm="8">
        <p class="text-overline mb-1">Configuración</p>
        <h1 class="text-h5 font-weight-bold mb-2">Historial de actividad</h1>
      </v-col>
      <v-col cols="12" sm="4" class="text-sm-right">
        <v-btn outlined color="var(--color-primary)" :loading="loading" @click="loadHistory(true)">
          <v-icon left>mdi-refresh</v-icon>Actualizar
        </v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" text role="alert">{{ error }}</v-alert>

    <v-card outlined rounded="lg">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="search" label="Buscar usuario, acción, módulo o página" prepend-inner-icon="mdi-magnify" outlined dense hide-details clearable />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select v-model="action" :items="actions" label="Acción" outlined dense hide-details clearable />
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-select v-model="module" :items="modules" label="Módulo" outlined dense hide-details clearable />
          </v-col>
        </v-row>
      </v-card-text>
      <v-data-table
        :headers="headers" :items="filteredRecords" :search="search" :loading="loading"
        item-key="id" :items-per-page="15" :sort-by="['timestamp']" :sort-desc="[true]"
        loading-text="Cargando historial…" no-data-text="Todavía no hay acciones registradas."
        no-results-text="No hay coincidencias entre los registros cargados."
        :footer-props="{ itemsPerPageText: 'Filas por página', itemsPerPageOptions: [15, 30, 50] }"
      >
        <template #[`item.timestamp`]="{ item }">{{ item.fechaTexto }}</template>
        <template #[`item.accion`]="{ item }">
          <v-chip small outlined>{{ item.accion }}</v-chip>
          <span v-if="item.detalle" class="d-block text-caption text--secondary mt-1">{{ item.detalle }}</span>
        </template>
      </v-data-table>
      <v-divider />
      <v-card-actions class="flex-wrap pa-4">
        <span class="text-caption text--secondary">{{ records.length }} registros cargados. Los filtros se aplican a estos registros.</span>
        <v-spacer />
        <v-btn v-if="hasMore" text color="var(--color-primary)" :loading="loading" @click="loadHistory(false)">Cargar anteriores</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
export default {
  name: 'HistorialPage',
  data: () => ({
    records: [], loading: false, error: '', search: '', action: null, module: null,
    cursor: null, hasMore: false,
    headers: [
      { text: 'Fecha', value: 'timestamp' },
      { text: 'Hora', value: 'hora', sortable: false },
      { text: 'Usuario', value: 'usuario' },
      { text: 'Acción', value: 'accion' },
      { text: 'Módulo', value: 'modulo' },
      { text: 'Página', value: 'pagina' }
    ]
  }),
  computed: {
    actions() { return [...new Set(this.records.map(item => item.accion))].sort() },
    modules() { return [...new Set(this.records.map(item => item.modulo))].sort() },
    filteredRecords() {
      return this.records.filter(item => (!this.action || item.accion === this.action) && (!this.module || item.modulo === this.module))
    }
  },
  mounted() { this.loadHistory(true) },
  methods: {
    async loadHistory(reset) {
      if (this.loading) return
      this.loading = true
      this.error = ''
      try {
        const result = await this.$firebaseApi.listHistory({ cursor: reset ? null : this.cursor })
        const records = result.records.map(item => {
          const date = item.fecha?.toDate ? item.fecha.toDate() : new Date(item.fecha?.seconds != null ? item.fecha.seconds * 1000 : item.fecha)
          const valid = !isNaN(date.getTime())
          return {
            ...item,
            timestamp: valid ? date.getTime() : 0,
            fechaTexto: valid ? date.toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) : 'Sin fecha',
            hora: valid ? date.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour12: false }) : '—'
          }
        })
        this.records = reset ? records : [...this.records, ...records]
        this.cursor = result.cursor
        this.hasMore = result.hasMore
      } catch (error) {
        this.error = 'No se pudo cargar el historial. Verifica los permisos de lectura de Firebase e intenta nuevamente.'
        console.error('Error al cargar el historial:', error)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
