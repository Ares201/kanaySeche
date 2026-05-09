<template>
  <section class="clientes-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Documentos</p>
        <h1>Clientes</h1>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        Nuevo cliente
      </button>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de clientes</h2>
          <span>{{ filteredClientes.length }} registros</span>
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
              <v-list-item @click="exportClientes">
                <v-list-item-title>Exportar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="openImportClientes">
                <v-list-item-title>Importar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <input
            ref="clientesExcelInput"
            class="excel-input"
            type="file"
            accept=".xlsx"
            @change="importClientes"
          >

          <label class="search-field">
            <span>Buscar por cliente o RUC</span>
            <input v-model.trim="search" type="search" placeholder="Ej. 20600000000">
          </label>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>RUC</th>
              <th>Direccion</th>
              <!-- <th>Contacto</th> -->
              <!-- <th>Numero contacto</th> -->
              <!-- <th>Telefono contacto</th> -->
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cliente in filteredClientes" :key="cliente.id">
              <td>{{ cliente.nombre }}</td>
              <td>{{ cliente.ruc }}</td>
              <td>{{ cliente.direccion }}</td>
              <!-- <td>{{ cliente.contacto }}</td> -->
              <!-- <td>{{ cliente.numeroContacto }}</td> -->
              <!-- <td>{{ cliente.telefonoContacto }}</td> -->
              <td>
                <div class="actions">
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar cliente" @click="openEditModal(cliente)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar" aria-label="Eliminar cliente" @click="deleteCliente(cliente.id)">
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
                Cargando clientes...
              </td>
            </tr>
            <tr v-else-if="filteredClientes.length === 0">
              <td class="empty-state" colspan="7">
                No se encontraron clientes.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveCliente">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar cliente' : 'Nuevo cliente' }}</h2>
          <button type="button" class="modal-close" aria-label="Cerrar modal" @click="closeModal">
            x
          </button>
        </div>

        <div class="form-grid">
          <v-row dense>
            <v-col cols="12" md="8">
              <label>
                Cliente
                <input v-model.trim="form.nombre" type="text" required placeholder="Razon social del cliente">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                RUC
                <input v-model.trim="form.ruc" type="text" inputmode="numeric" placeholder="20600000000">
              </label>
            </v-col>

            <v-col cols="12">
              <label>
                Direccion
                <input v-model.trim="form.direccion" type="text" placeholder="Av. Principal 123">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Contacto
                <input v-model.trim="form.contacto" type="text" placeholder="Nombre del contacto">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Numero de contacto
                <input v-model.trim="form.numeroContacto" type="text" placeholder="Anexo, DNI o codigo">
              </label>
            </v-col>

            <v-col cols="12" md="4">
              <label>
                Telefono de contacto
                <input v-model.trim="form.telefonoContacto" type="text" placeholder="999 999 999">
              </label>
            </v-col>

            <v-col cols="12">
              <label class="checkbox-field">
                <input v-model="form.estado" type="checkbox">
                Cliente activo
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
import {
  createEmptyClienteForm,
  normalizeCliente,
  toClientePayload
} from '~/models/cliente'
import {
  exportRowsToExcel,
  parseActiveValue,
  readRowsFromExcelFile
} from '~/utils/exportExcel'

const CLIENTE_EXCEL_COLUMNS = [
  'Cliente',
  'RUC',
  'Direccion',
  'Contacto',
  'Numero contacto',
  'Telefono contacto',
  'Estado'
]

export default {
  name: 'ClientesPage',
  data() {
    return {
      search: '',
      loading: false,
      isModalOpen: false,
      editingId: null,
      form: this.getEmptyForm(),
      clientes: []
    }
  },
  computed: {
    filteredClientes() {
      const term = this.search.toLowerCase()

      if (!term) return this.clientes

      return this.clientes.filter(cliente =>
        cliente.nombre.toLowerCase().includes(term) ||
        cliente.ruc.toLowerCase().includes(term) ||
        cliente.contacto.toLowerCase().includes(term)
      )
    }
  },
  mounted() {
    this.loadClientes()
  },
  methods: {
    getEmptyForm() {
      return createEmptyClienteForm()
    },
    async loadClientes() {
      this.loading = true

      try {
        const clientes = await this.$firebaseApi.list('clientes')
        this.clientes = clientes.map(normalizeCliente)
      } catch (error) {
        alert('No se pudieron listar los clientes')
        // eslint-disable-next-line no-console
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    openCreateModal() {
      this.editingId = null
      this.form = this.getEmptyForm()
      this.isModalOpen = true
    },
    openEditModal(cliente) {
      this.editingId = cliente.id
      this.form = {
        nombre: cliente.nombre,
        ruc: cliente.ruc,
        direccion: cliente.direccion,
        contacto: cliente.contacto,
        numeroContacto: cliente.numeroContacto,
        telefonoContacto: cliente.telefonoContacto,
        estado: cliente.estado
      }
      this.isModalOpen = true
    },
    closeModal() {
      this.isModalOpen = false
    },
    async saveCliente() {
      const existe = this.clientes.some(cliente => {
        return cliente.ruc === this.form.ruc && cliente.id !== this.editingId
      })

      if (existe) {
        alert('El RUC ya existe')
        return
      }

      try {
        if (this.editingId) {
          const cliente = await this.$firebaseApi.update(
            'clientes',
            this.editingId,
            toClientePayload(this.form)
          )
          this.clientes = this.clientes.map(currentCliente => {
            return currentCliente.id === this.editingId
              ? normalizeCliente(cliente)
              : currentCliente
          })
        } else {
          const cliente = await this.$firebaseApi.create(
            'clientes',
            toClientePayload(this.form)
          )
          this.clientes.unshift(normalizeCliente(cliente))
        }

        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar el cliente')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    async deleteCliente(id) {
      if (!window.confirm('Deseas eliminar este cliente?')) return

      try {
        await this.$firebaseApi.remove('clientes', id)
        this.clientes = this.clientes.filter(cliente => cliente.id !== id)
      } catch (error) {
        alert('No se pudo eliminar el cliente')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    async exportClientes() {
      await exportRowsToExcel({
        filename: 'clientes',
        sheetName: 'Clientes',
        rows: this.filteredClientes,
        columns: [
          { label: 'Cliente', value: cliente => cliente.nombre },
          { label: 'RUC', value: cliente => cliente.ruc },
          { label: 'Direccion', value: cliente => cliente.direccion },
          { label: 'Contacto', value: cliente => cliente.contacto },
          { label: 'Numero contacto', value: cliente => cliente.numeroContacto },
          { label: 'Telefono contacto', value: cliente => cliente.telefonoContacto },
          { label: 'Estado', value: cliente => cliente.estado ? 'Activo' : 'Inactivo' }
        ]
      })
    },
    openImportClientes() {
      this.$refs.clientesExcelInput.click()
    },
    async importClientes(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      try {
        const result = await readRowsFromExcelFile(file, CLIENTE_EXCEL_COLUMNS)

        if (!result.matched) {
          alert('Este Excel no coincidio con las columnas esperadas.')
          return
        }

        if (result.rows.length === 0) {
          alert('El Excel no tiene filas para importar.')
          return
        }

        for (const row of result.rows) {
          const cliente = await this.$firebaseApi.create('clientes', {
            nombre: row.Cliente,
            ruc: row.RUC,
            direccion: row.Direccion,
            contacto: row.Contacto,
            numeroContacto: row['Numero contacto'],
            telefonoContacto: row['Telefono contacto'],
            estado: parseActiveValue(row.Estado)
          })
          this.clientes.unshift(normalizeCliente(cliente))
        }

        alert(`Se agregaron ${result.rows.length} filas.`)
      } catch (error) {
        alert('No se pudo importar el Excel')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    }
  }
}
</script>

<style scoped>
.clientes-page {
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

.primary-button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  color: #ffffff;
  font-weight: 700;
  background: #0f766e;
  cursor: pointer;
}

.content {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
}

.table-header,
.table-header>div {
  display: flex;
  gap: 12px;
}

.table-header {
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.table-header>div {
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

.search-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(320px, 100%);
  color: #475569;
  font-size: 13px;
  font-weight: 700;
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
.form-grid input,
.form-grid textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.search-field input:focus,
.form-grid input:focus,
.form-grid textarea:focus {
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

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
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

.secondary-button {
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 16px;
  color: #334155;
  font-weight: 700;
  background: #ffffff;
  cursor: pointer;
}

@media (max-width: 640px) {
  .page-header,
  .table-header,
  .table-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .primary-button,
  .excel-button {
    width: 100%;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .secondary-button,
  .modal-actions .primary-button {
    width: 100%;
  }
}
</style>
