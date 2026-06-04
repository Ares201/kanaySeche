<template>
  <section class="vehiculos-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Configuracion</p>
        <h1>Vehiculos</h1>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        Nuevo vehiculo
      </button>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de vehiculos</h2>
          <span>{{ filteredVehiculos.length }} registros</span>
        </div>

        <div class="table-actions">
          <v-menu offset-y>
            <template #activator="{ on, attrs }">
              <v-btn class="excel-button" color="#107c41" dark type="button" v-bind="attrs" v-on="on">
                <v-icon left>
                  mdi-microsoft-excel
                </v-icon>
                Excel
              </v-btn>
            </template>

            <v-list dense>
              <v-list-item @click="exportVehiculos">
                <v-list-item-title>Exportar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="downloadTemplate">
                <v-list-item-title>Descargar plantilla</v-list-item-title>
              </v-list-item>
              <v-list-item @click="openImportVehiculos">
                <v-list-item-title>Importar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <input
            ref="vehiculosExcelInput"
            class="excel-input"
            type="file"
            accept=".xlsx"
            @change="importVehiculos"
          >

          <label class="search-field">
            <span>Buscar por placa o cliente</span>
            <input v-model.trim="search" type="search" placeholder="Ej. ABC-123">
          </label>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Placa</th>
              <th>Cliente</th>
              <th>RUC</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="vehiculo in filteredVehiculos" :key="vehiculo.id">
              <td>{{ vehiculo.placa }}</td>
              <td>{{ vehiculo.cliente.nombre }}</td>
              <td>{{ vehiculo.cliente.ruc }}</td>
              <td>{{ vehiculo.marca }}</td>
              <td>{{ vehiculo.modelo }}</td>
              <td>
                <span class="status" :class="{ 'status--inactive': !vehiculo.estado }">
                  {{ vehiculo.estado ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar vehiculo" @click="openEditModal(vehiculo)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar" aria-label="Eliminar vehiculo" @click="deleteVehiculo(vehiculo.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M8 7l1 13h6l1-13" />
                      <path d="M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="loading">
              <td class="empty-state" colspan="7">
                Cargando vehiculos...
              </td>
            </tr>
            <tr v-else-if="filteredVehiculos.length === 0">
              <td class="empty-state" colspan="7">
                No se encontraron vehiculos.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveVehiculo">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar vehiculo' : 'Nuevo vehiculo' }}</h2>
          <button type="button" class="modal-close" aria-label="Cerrar modal" @click="closeModal">
            x
          </button>
        </div>

        <div class="form-grid">
          <v-row dense>
            <v-col cols="12" md="7">
              <label class="autocomplete-field">
                Cliente
                <input
                  v-model.trim="clienteSearch"
                  type="search"
                  required
                  placeholder="Buscar cliente"
                  autocomplete="off"
                  @focus="clienteOptionsOpen = true"
                  @input="handleClienteInput"
                  @blur="closeClienteOptions"
                >
                <div v-if="clienteOptionsOpen" class="autocomplete-list">
                  <button
                    v-for="cliente in filteredClientesOptions"
                    :key="cliente.id"
                    type="button"
                    @mousedown.prevent="selectCliente(cliente)"
                  >
                    <strong>{{ cliente.nombre }}</strong>
                    <span>{{ cliente.ruc }}</span>
                  </button>
                  <div v-if="clientesLoading" class="autocomplete-empty">
                    Cargando clientes...
                  </div>
                  <div v-else-if="filteredClientesOptions.length === 0" class="autocomplete-empty">
                    No hay clientes disponibles.
                  </div>
                </div>
              </label>
            </v-col>

            <v-col cols="12" md="5">
              <label>
                Placa
                <input v-model.trim="form.placa" type="text" required placeholder="ABC-123">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Marca
                <input v-model.trim="form.marca" type="text" placeholder="Volvo">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Modelo
                <input v-model.trim="form.modelo" type="text" placeholder="FH">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Descripcion
                <input v-model.trim="form.descripcion" type="text" placeholder="Unidad principal">
              </label>
            </v-col>

            <v-col cols="12">
              <label class="checkbox-field">
                <input v-model="form.estado" type="checkbox">
                Vehiculo activo
              </label>
            </v-col>
          </v-row>
        </div>

        <div class="modal-actions">
          <button class="secondary-button" type="button" @click="closeModal">
            Cancelar
          </button>
          <button class="primary-button" type="submit">
            Guardar
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<script>
import { normalizeCliente } from '~/models/cliente'
import {
  createEmptyVehiculoForm,
  normalizeVehiculo,
  toVehiculoPayload
} from '~/models/vehiculo'
import {
  exportRowsToExcel,
  parseActiveValue,
  readRowsFromExcelFile
} from '~/utils/exportExcel'

const VEHICULO_EXCEL_COLUMNS = [
  'Cliente',
  'RUC',
  'Placa',
  'Marca',
  'Modelo',
  'Descripcion',
  'Estado'
]

export default {
  name: 'VehiculosPage',
  data() {
    return {
      search: '',
      loading: false,
      clientesLoading: false,
      isModalOpen: false,
      editingId: null,
      clienteSearch: '',
      clienteOptionsOpen: false,
      form: this.getEmptyForm(),
      vehiculos: [],
      clientes: []
    }
  },
  computed: {
    filteredVehiculos() {
      const term = this.search.toLowerCase()

      if (!term) return this.vehiculos

      return this.vehiculos.filter(vehiculo =>
        vehiculo.placa.toLowerCase().includes(term) ||
        vehiculo.cliente.nombre.toLowerCase().includes(term) ||
        vehiculo.cliente.ruc.toLowerCase().includes(term)
      )
    },
    filteredClientesOptions() {
      const term = this.clienteSearch.toLowerCase()
      const activos = this.clientes.filter(cliente => cliente.estado)

      if (!term) return activos.slice(0, 8)

      return activos
        .filter(cliente =>
          cliente.nombre.toLowerCase().includes(term) ||
          cliente.ruc.toLowerCase().includes(term)
        )
        .slice(0, 8)
    }
  },
  mounted() {
    this.loadPageData()
  },
  methods: {
    getEmptyForm() {
      return createEmptyVehiculoForm()
    },
    async loadPageData() {
      this.loading = true
      this.clientesLoading = true

      try {
        const [vehiculos, clientes] = await Promise.all([
          this.$firebaseApi.list('vehiculos'),
          this.$firebaseApi.list('clientes')
        ])

        this.vehiculos = vehiculos.map(normalizeVehiculo)
        this.clientes = clientes.map(normalizeCliente)
      } catch (error) {
        alert('No se pudieron listar los vehiculos')
        // eslint-disable-next-line no-console
        console.error(error)
      } finally {
        this.loading = false
        this.clientesLoading = false
      }
    },
    openCreateModal() {
      this.editingId = null
      this.form = this.getEmptyForm()
      this.clienteSearch = ''
      this.isModalOpen = true
    },
    openEditModal(vehiculo) {
      this.editingId = vehiculo.id
      this.form = {
        clienteId: vehiculo.clienteId,
        cliente: { ...vehiculo.cliente },
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        descripcion: vehiculo.descripcion,
        estado: vehiculo.estado
      }
      this.clienteSearch = vehiculo.cliente.nombre
      this.isModalOpen = true
    },
    closeModal() {
      this.isModalOpen = false
      this.clienteOptionsOpen = false
    },
    handleClienteInput() {
      this.clienteOptionsOpen = true
      this.form.clienteId = ''
      this.form.cliente = {
        nombre: this.clienteSearch,
        ruc: ''
      }
    },
    closeClienteOptions() {
      window.setTimeout(() => {
        this.clienteOptionsOpen = false
      }, 120)
    },
    selectCliente(cliente) {
      this.form.clienteId = cliente.id
      this.form.cliente = {
        nombre: cliente.nombre,
        ruc: cliente.ruc
      }
      this.clienteSearch = cliente.nombre
      this.clienteOptionsOpen = false
    },
    async saveVehiculo() {
      if (!this.form.clienteId) {
        alert('Selecciona un cliente de la lista')
        return
      }

      const placa = String(this.form.placa || '').trim().toUpperCase()
      const exists = this.vehiculos.some(vehiculo => {
        return vehiculo.placa === placa &&
          vehiculo.clienteId === this.form.clienteId &&
          vehiculo.id !== this.editingId
      })

      if (exists) {
        alert('La placa ya existe para este cliente')
        return
      }

      try {
        if (this.editingId) {
          const vehiculo = await this.$firebaseApi.update(
            'vehiculos',
            this.editingId,
            toVehiculoPayload(this.form)
          )
          this.vehiculos = this.vehiculos.map(currentVehiculo => {
            return currentVehiculo.id === this.editingId
              ? normalizeVehiculo(vehiculo)
              : currentVehiculo
          })
        } else {
          const vehiculo = await this.$firebaseApi.create(
            'vehiculos',
            toVehiculoPayload(this.form)
          )
          this.vehiculos.unshift(normalizeVehiculo(vehiculo))
        }

        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar el vehiculo')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    async deleteVehiculo(id) {
      if (!window.confirm('Deseas eliminar este vehiculo?')) return

      try {
        await this.$firebaseApi.remove('vehiculos', id)
        this.vehiculos = this.vehiculos.filter(vehiculo => vehiculo.id !== id)
      } catch (error) {
        alert('No se pudo eliminar el vehiculo')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    async exportVehiculos() {
      await exportRowsToExcel({
        filename: 'vehiculos',
        sheetName: 'Vehiculos',
        rows: this.filteredVehiculos,
        columns: [
          { label: 'Cliente', value: vehiculo => vehiculo.cliente.nombre },
          { label: 'RUC', value: vehiculo => vehiculo.cliente.ruc },
          { label: 'Placa', value: vehiculo => vehiculo.placa },
          { label: 'Marca', value: vehiculo => vehiculo.marca },
          { label: 'Modelo', value: vehiculo => vehiculo.modelo },
          { label: 'Descripcion', value: vehiculo => vehiculo.descripcion },
          { label: 'Estado', value: vehiculo => vehiculo.estado ? 'Activo' : 'Inactivo' }
        ]
      })
    },
    async downloadTemplate() {
      await exportRowsToExcel({
        filename: 'plantilla-vehiculos',
        sheetName: 'Vehiculos',
        rows: [
          {
            cliente: { nombre: 'Cliente ejemplo', ruc: '20600000000' },
            placa: 'ABC-123',
            marca: 'Volvo',
            modelo: 'FH',
            descripcion: 'Unidad principal',
            estado: true
          }
        ],
        columns: [
          { label: 'Cliente', value: vehiculo => vehiculo.cliente.nombre },
          { label: 'RUC', value: vehiculo => vehiculo.cliente.ruc },
          { label: 'Placa', value: vehiculo => vehiculo.placa },
          { label: 'Marca', value: vehiculo => vehiculo.marca },
          { label: 'Modelo', value: vehiculo => vehiculo.modelo },
          { label: 'Descripcion', value: vehiculo => vehiculo.descripcion },
          { label: 'Estado', value: vehiculo => vehiculo.estado ? 'Activo' : 'Inactivo' }
        ]
      })
    },
    openImportVehiculos() {
      this.$refs.vehiculosExcelInput.click()
    },
    async importVehiculos(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      try {
        const result = await readRowsFromExcelFile(file, VEHICULO_EXCEL_COLUMNS)

        if (!result.matched) {
          alert('Este Excel no coincidio con las columnas esperadas.')
          return
        }

        let created = 0

        for (const row of result.rows) {
          const cliente = this.findCliente(row.RUC, row.Cliente)
          if (!cliente || !row.Placa) continue

          const exists = this.vehiculos.some(vehiculo => {
            return vehiculo.clienteId === cliente.id &&
              vehiculo.placa === String(row.Placa).trim().toUpperCase()
          })

          if (exists) continue

          const vehiculo = await this.$firebaseApi.create('vehiculos', {
            clienteId: cliente.id,
            cliente: {
              nombre: cliente.nombre,
              ruc: cliente.ruc
            },
            placa: String(row.Placa).trim().toUpperCase(),
            marca: row.Marca,
            modelo: row.Modelo,
            descripcion: row.Descripcion,
            estado: parseActiveValue(row.Estado)
          })

          this.vehiculos.unshift(normalizeVehiculo(vehiculo))
          created += 1
        }

        alert(`Se agregaron ${created} vehiculos.`)
      } catch (error) {
        alert('No se pudo importar el Excel')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    findCliente(ruc, nombre) {
      const cleanRuc = String(ruc || '').trim()
      const cleanNombre = String(nombre || '').trim().toLowerCase()

      return this.clientes.find(cliente =>
        (cleanRuc && cliente.ruc === cleanRuc) ||
        (cleanNombre && cliente.nombre.toLowerCase() === cleanNombre)
      )
    }
  }
}
</script>

<style scoped>
.vehiculos-page {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: 32px;
}

h2 {
  font-size: 18px;
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
  color: #ffffff;
  background: #0f766e;
}

.secondary-button {
  border: 1px solid #cbd5e1;
  color: #334155;
  background: #ffffff;
}

.content {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.table-header,
.table-header > div {
  display: flex;
  gap: 12px;
}

.table-header {
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.table-header > div {
  flex-direction: column;
  gap: 4px;
}

.table-actions {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.table-header span {
  color: #64748b;
  font-size: 14px;
}

.search-field,
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.search-field {
  width: min(320px, 100%);
  font-size: 13px;
}

.excel-button {
  margin-bottom: 1px;
  font-weight: 700;
  text-transform: none;
}

.excel-input {
  display: none;
}

.search-field input,
.form-grid input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.search-field input:focus,
.form-grid input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 14px 20px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid #edf2f7;
}

th {
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  background: #f8fafc;
}

td {
  color: #1e293b;
}

.status {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  border-radius: 999px;
  padding: 0 10px;
  color: #166534;
  font-size: 13px;
  font-weight: 700;
  background: #dcfce7;
}

.status--inactive {
  color: #991b1b;
  background: #fee2e2;
}

.actions {
  display: flex;
  gap: 8px;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #0f766e;
  background: #ffffff;
  cursor: pointer;
}

.icon-button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.icon-button--danger {
  color: #dc2626;
}

.empty-state {
  color: #64748b;
  text-align: center;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.45);
}

.modal {
  width: min(820px, 100%);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
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
  border-bottom: 1px solid #e2e8f0;
}

.modal-close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  color: #475569;
  font-size: 18px;
  background: #f1f5f9;
  cursor: pointer;
}

.form-grid {
  padding: 20px;
}

.autocomplete-field {
  position: relative;
}

.autocomplete-list {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  z-index: 5;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.14);
}

.autocomplete-list button {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  border: 0;
  padding: 10px 12px;
  color: #0f172a;
  text-align: left;
  background: #ffffff;
  cursor: pointer;
}

.autocomplete-list button:hover {
  background: #ecfdf3;
}

.autocomplete-list span,
.autocomplete-empty {
  color: #64748b;
  font-size: 13px;
}

.autocomplete-empty {
  padding: 12px;
}

.checkbox-field {
  align-items: center;
  flex-direction: row !important;
  min-height: 41px;
}

.checkbox-field input {
  width: 18px;
  height: 18px;
}

.modal-actions {
  justify-content: flex-end;
  border-top: 1px solid #e2e8f0;
}

@media (max-width: 640px) {
  .page-header,
  .table-header,
  .table-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .primary-button,
  .secondary-button,
  .excel-button,
  .modal-actions .primary-button {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }
}
</style>
