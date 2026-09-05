<template>
  <section class="ingresos-page unified-list-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Control y Aceptación</p>
        <h1>Ingresos Cisterna</h1>
        <span class="registros-count">{{ filteredIngresos.length }} registros</span>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        Nuevo ingreso
      </button>
    </div>

    <div class="content">
      <div class="filter-bar">
        <v-text-field v-model.trim="search" dense hide-details outlined clearable prepend-inner-icon="mdi-magnify"
          label="Buscar en la documentación" />
        <v-text-field v-model="fechaFiltro" dense hide-details outlined clearable type="date"
          label="Fecha de ingreso" />
      </div>

      <v-alert v-if="error" type="error" text class="ma-4">{{ error }}</v-alert>

      <div class="table-wrapper">
        <v-data-table :headers="tableHeaders" :items="filteredIngresos" :loading="loading" item-key="rowKey"
          loading-text="Cargando documentación..." no-data-text="No se encontraron ingresos."
          :footer-props="{ itemsPerPageText: 'Filas por página' }">
          <template #[`item.pedido_venta`]="{ item }">
            <strong class="primary--text">{{ item.pedido_venta || '—' }}</strong>
          </template>
          <template #[`item.tipo`]="{ item }">
            <v-chip v-if="item.tipo" small label color="teal" text-color="white">{{ item.tipo }}</v-chip>
            <span v-else>—</span>
          </template>
          <template #[`item.actions`]="{ item }">
            <div class="actions">
              <button class="icon-button" type="button" title="Editar ingreso" aria-label="Editar ingreso"
                @click="openEditModal(item)">
                <v-icon small>mdi-pencil</v-icon>
              </button>
              <button class="icon-button icon-button--danger" type="button" title="Eliminar ingreso"
                aria-label="Eliminar ingreso" @click="deleteIngreso(item)">
                <v-icon small>mdi-delete</v-icon>
              </button>
            </div>
          </template>
        </v-data-table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveIngreso">
        <div class="modal-header">
          <div>
            <h2>{{ editingRow ? 'Editar ingreso' : 'Nuevo ingreso' }}</h2>
            <small>Completa la documentación de control y aceptación.</small>
          </div>
          <button type="button" class="modal-close" aria-label="Cerrar" @click="closeModal">×</button>
        </div>

        <div class="form-grid">
          <v-row dense>
            <v-col v-for="field in formFields" :key="field.key" cols="12" :md="field.cols || 6">
              <label>{{ field.label }}</label>
              <input v-model.trim="form[field.key]" :type="field.type || 'text'" :required="field.required"
                :disabled="Boolean(editingRow && field.editLocked)" :placeholder="field.placeholder || ''" />
            </v-col>
          </v-row>
        </div>

        <div class="modal-actions">
          <button class="secondary-button" type="button" @click="closeModal">Cancelar</button>
          <button class="primary-button" type="submit" :disabled="saving">
            {{ saving ? 'Guardando...' : (editingRow ? 'Actualizar' : 'Guardar') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script>
const FIELD_KEYS = [
  'fecha_ingreso', 'pedido_venta', 'ubicacion', 'tratamiento', 'tipo',
  'fecha_muestra', 'generador', 'producto_cliente', 'transportista'
]

const emptyForm = () => FIELD_KEYS.reduce((form, key) => ({ ...form, [key]: '' }), {})

export default {
  name: 'IngresosCisternaControlAceptacionPage',
  data() {
    return {
      loading: false,
      saving: false,
      error: '',
      search: '',
      fechaFiltro: '',
      ingresos: [],
      isModalOpen: false,
      editingRow: null,
      form: emptyForm(),
      tableHeaders: [
        { text: 'Fecha ingreso cisterna', value: 'fecha_ingreso' },
        { text: 'Pedido de venta', value: 'pedido_venta' },
        { text: 'Ubicación', value: 'ubicacion' },
        { text: 'Tratamiento propuesto', value: 'tratamiento' },
        { text: 'Tipo', value: 'tipo' },
        { text: 'Fecha ingreso muestra', value: 'fecha_muestra' },
        { text: 'Generador', value: 'generador' },
        { text: 'Producto cliente', value: 'producto_cliente' },
        { text: 'Transportista', value: 'transportista' },
        { text: 'Acciones', value: 'actions', sortable: false }
      ],
      formFields: [
        { key: 'fecha_ingreso', label: 'Fecha de ingreso de cisterna', type: 'date', required: true, editLocked: true },
        { key: 'pedido_venta', label: 'Pedido de venta', required: true, placeholder: 'Ej. PV-001', editLocked: true },
        { key: 'ubicacion', label: 'Ubicación', required: true },
        { key: 'tratamiento', label: 'Tratamiento propuesto' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'fecha_muestra', label: 'Fecha de ingreso de muestra', type: 'date', editLocked: true },
        { key: 'generador', label: 'Generador' },
        { key: 'producto_cliente', label: 'Producto del cliente' },
        { key: 'transportista', label: 'Transportista' }
      ]
    }
  },
  computed: {
    filteredIngresos() {
      const term = this.normalizeText(this.search)
      return this.ingresos.filter(item => {
        const matchesTerm = !term || FIELD_KEYS.some(key => this.normalizeText(item[key]).includes(term))
        const matchesDate = !this.fechaFiltro || String(item.fecha_ingreso || '').slice(0, 10) === this.fechaFiltro
        return matchesTerm && matchesDate
      })
    }
  },
  mounted() {
    this.loadIngresos()
  },
  methods: {
    normalizeText(value) {
      return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    },
    async fetchDashboardRows() {
      const response = await this.$axios.$get('/api/reporteLab?action=registros&limit=1000')
      if (!response?.success) throw new Error(response?.error || 'No se pudo consultar el dashboard')
      return Array.isArray(response.data) ? response.data : []
    },
    async loadIngresos() {
      this.loading = true
      this.error = ''
      try {
        const dashboardRows = await this.fetchDashboardRows()
        this.ingresos = dashboardRows.map((row, index) => ({ ...row, rowKey: `bq-${index}` }))
      } catch (error) {
        this.error = error.message || 'No se pudieron cargar los ingresos.'
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    openCreateModal() {
      this.editingRow = null
      this.form = emptyForm()
      this.isModalOpen = true
    },
    openEditModal(row) {
      this.editingRow = row
      this.form = FIELD_KEYS.reduce((form, key) => ({
        ...form,
        [key]: key.startsWith('fecha_')
          ? String(row[key] || '').slice(0, 10)
          : String(row[key] || '')
      }), {})
      this.isModalOpen = true
    },
    closeModal() {
      if (this.saving) return
      this.isModalOpen = false
      this.editingRow = null
    },
    async saveIngreso() {
      this.saving = true
      try {
        const payload = FIELD_KEYS.reduce((data, key) => ({ ...data, [key]: this.form[key] || '' }), {})
        const response = this.editingRow
          ? await this.$axios.$put('/api/reporteLab', payload, {
            params: { pedido_venta: this.editingRow.pedido_venta }
          })
          : await this.$axios.$post('/api/reporteLab', payload)

        if (!response?.success) throw new Error(response?.error || 'BigQuery rechazó la operación')

        this.isModalOpen = false
        this.editingRow = null
        await this.loadIngresos()
      } catch (error) {
        // Muestra el mensaje exacto que retorna la API si está disponible
        const errorMessage = error.response?.data?.error || error.message || 'No se pudo guardar el ingreso.'
        alert(`Error: ${errorMessage}`)
        console.error(error)
      } finally {
        this.saving = false
      }
    },
    async deleteIngreso(row) {
      if (!row.pedido_venta) {
        alert('El registro no tiene un pedido de venta válido.')
        return
      }
      if (!confirm(`¿Eliminar el ingreso ${row.pedido_venta}?`)) return
      try {
        const response = await this.$axios.$delete('/api/reporteLab', {
          params: { pedido_venta: row.pedido_venta }
        })
        if (!response?.success) throw new Error(response?.error || 'BigQuery rechazó la operación')
        await this.loadIngresos()
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || 'No se pudo eliminar el ingreso.'
        alert(`Error: ${errorMessage}`)
        console.error(error)
      }
    }
  }
}
</script>

<style scoped>
.ingresos-page {
  width: 94%;
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #087f8c;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: 32px;
}

.registros-count {
  color: #64748b;
  font-size: 14px;
}

.content {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, .08);
}

.filter-bar {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 220px;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.table-wrapper {
  overflow-x: auto;
}

.primary-button,
.secondary-button {
  min-height: 42px;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  border: 0;
  color: #fff;
  background: var(--color-primary);
}

.primary-button:disabled {
  opacity: .65;
  cursor: wait;
}

.secondary-button {
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  background: #fff;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-primary);
  background: #fff;
  cursor: pointer;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-button--danger {
  color: #dc2626;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, .48);
}

.modal {
  width: min(900px, 100%);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, .24);
}

.modal-header,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.modal-header {
  border-bottom: 1px solid var(--color-border);
}

.modal-header small {
  color: #64748b;
}

.modal-actions {
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
}

.modal-close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  font-size: 20px;
  background: #f1f5f9;
  cursor: pointer;
}

.form-grid {
  padding: 20px;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.form-grid input {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.form-grid input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 85, 138, .14);
}

.form-grid input:disabled {
  color: #64748b;
  background: #f1f5f9;
  cursor: not-allowed;
}

@media (max-width: 700px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-bar {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions button,
  .page-header .primary-button {
    width: 100%;
  }
}
</style>
