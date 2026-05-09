<template>
  <section class="residuos-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Configuracion</p>
        <h1>Residuos</h1>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        Nuevo residuo
      </button>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de residuos</h2>
          <span>{{ filteredResiduos.length }} registros</span>
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
              <v-list-item @click="exportResiduos">
                <v-list-item-title>Exportar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="openImportResiduos">
                <v-list-item-title>Importar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <input
            ref="residuosExcelInput"
            class="excel-input"
            type="file"
            accept=".xlsx"
            @change="importResiduos"
          >

          <label class="search-field">
            <span>Buscar por nombre</span>
            <input v-model.trim="search" type="search" placeholder="Ej. Residuo organico">
          </label>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Descripcion</th>
              <th>Estado</th>
              <th>Fecha creacion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="residuo in filteredResiduos" :key="residuo.id">
              <td>{{ residuo.codigo }}</td>
              <td>{{ residuo.nombre }}</td>
              <td>{{ residuo.descripcion }}</td>
              <td>
                <span class="status" :class="{ 'status--inactive': !residuo.estado }">
                  {{ residuo.estado ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>{{ formatDate(residuo.fechaCreacion) }}</td>
              <td>
                <div class="actions">
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar residuo"
                    @click="openEditModal(residuo)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar"
                    aria-label="Eliminar residuo" @click="deleteResiduo(residuo.id)">
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
              <td class="empty-state" colspan="6">
                Cargando residuos...
              </td>
            </tr>
            <tr v-else-if="filteredResiduos.length === 0">
              <td class="empty-state" colspan="6">
                No se encontraron residuos.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveResiduo">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar residuo' : 'Nuevo residuo' }}</h2>
          <button type="button" class="modal-close" aria-label="Cerrar modal" @click="closeModal">
            x
          </button>
        </div>

        <div class="form-grid">
          <v-row dense>
            <v-col cols="12" md="4">
          <label>
            Código
            <div class="code-field">
              <input
                v-model.trim="form.codigo"
                type="text"
                inputmode="numeric"
                pattern="[0-9]+"
                required
                placeholder="7000001"
                :disabled="form.autogenerar"
              >
            </div>
          </label>
            </v-col>

            <v-col cols="12" md="3" class="checkbox-col">
          <label class="checkbox-field">
            <input v-model="form.autogenerar" type="checkbox" @change="handleAutogenerarChange">
            Autogenerar
          </label>
            </v-col>

            <v-col cols="12" md="5">
          <label>
            Nombre
            <input v-model.trim="form.nombre" type="text" required placeholder="Bolsas">
          </label>
            </v-col>

            <v-col cols="12">
          <label class="field-full">
            Descripcion
            <textarea v-model.trim="form.descripcion" rows="3" placeholder="Descripcion del residuo" />
          </label>
            </v-col>

            <v-col cols="12">
          <label class="checkbox-field">
            <input v-model="form.estado" type="checkbox">
            Residuo activo
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
  createEmptyResiduoForm,
  getNextResiduoCodigo,
  normalizeResiduo,
  toResiduoPayload
} from '~/models/residuo'
import {
  exportRowsToExcel,
  parseActiveValue,
  readRowsFromExcelFile
} from '~/utils/exportExcel'

const RESIDUO_EXCEL_COLUMNS = [
  'Codigo',
  'Nombre',
  'Descripcion',
  'Estado',
  'Fecha creacion'
]

export default {
  name: 'ResiduosPage',
  data() {
    return {
      search: '',
      loading: false,
      isModalOpen: false,
      editingId: null,
      form: this.getEmptyForm(),
      residuos: []
    }
  },
  computed: {
    filteredResiduos() {
      const term = this.search.toLowerCase()

      if (!term) return this.residuos

      return this.residuos.filter(r =>
        r.nombre.toLowerCase().includes(term) ||
        r.descripcion.toLowerCase().includes(term) ||
        r.codigo.includes(term)
      )
    }
  },
  mounted() {
    this.loadResiduos()
  },
  methods: {
    getEmptyForm() {
      return createEmptyResiduoForm()
    },

    async loadResiduos() {
      this.loading = true

      try {
        const residuos = await this.$firebaseApi.list('residuos')
        this.residuos = residuos.map(normalizeResiduo)
      } catch (error) {
        alert('No se pudieron listar los residuos')
        // eslint-disable-next-line no-console
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    openCreateModal() {
      this.editingId = null
      this.form = this.getEmptyForm()
      this.setAutogeneratedCodigo()
      this.isModalOpen = true
    },

    openEditModal(residuo) {
      this.editingId = residuo.id
      this.form = {
        codigo: residuo.codigo,
        autogenerar: false,
        nombre: residuo.nombre,
        descripcion: residuo.descripcion,
        estado: residuo.estado
      }
      this.isModalOpen = true
    },

    closeModal() {
      this.isModalOpen = false
    },

    async saveResiduo() {
      if (this.form.autogenerar) {
        this.setAutogeneratedCodigo()
      }

      const existe = this.residuos.some(
        r => r.codigo === this.form.codigo && r.id !== this.editingId
      )

      if (existe) {
        alert('El codigo ya existe')
        return
      }

      try {
        if (this.editingId) {
          const residuo = await this.$firebaseApi.update(
            'residuos',
            this.editingId,
            toResiduoPayload(this.form)
          )
          this.residuos = this.residuos.map(currentResiduo => {
            return currentResiduo.id === this.editingId
              ? normalizeResiduo(residuo)
              : currentResiduo
          })
        } else {
          const residuo = await this.$firebaseApi.create(
            'residuos',
            toResiduoPayload(this.form)
          )
          this.residuos.unshift(normalizeResiduo(residuo))
        }

        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar el residuo')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },

    setAutogeneratedCodigo() {
      this.form.codigo = getNextResiduoCodigo(this.residuos)
    },

    handleAutogenerarChange() {
      if (this.form.autogenerar) {
        this.setAutogeneratedCodigo()
      }
    },

    async exportResiduos() {
      await exportRowsToExcel({
        filename: 'residuos',
        sheetName: 'Residuos',
        rows: this.filteredResiduos,
        columns: [
          { label: 'Codigo', value: residuo => residuo.codigo },
          { label: 'Nombre', value: residuo => residuo.nombre },
          { label: 'Descripcion', value: residuo => residuo.descripcion },
          { label: 'Estado', value: residuo => residuo.estado ? 'Activo' : 'Inactivo' },
          { label: 'Fecha creacion', value: residuo => this.formatDate(residuo.fechaCreacion) }
        ]
      })
    },
    openImportResiduos() {
      this.$refs.residuosExcelInput.click()
    },
    async importResiduos(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      try {
        const result = await readRowsFromExcelFile(file, RESIDUO_EXCEL_COLUMNS)

        if (!result.matched) {
          alert('Este Excel no coincidio con las columnas esperadas.')
          return
        }

        if (result.rows.length === 0) {
          alert('El Excel no tiene filas para importar.')
          return
        }

        for (const row of result.rows) {
          const residuo = await this.$firebaseApi.create('residuos', {
            codigo: row.Codigo,
            nombre: row.Nombre,
            descripcion: row.Descripcion,
            estado: parseActiveValue(row.Estado)
          })
          this.residuos.unshift(normalizeResiduo(residuo))
        }

        alert(`Se agregaron ${result.rows.length} filas.`)
      } catch (error) {
        alert('No se pudo importar el Excel')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },

    async deleteResiduo(id) {
      try {
        await this.$firebaseApi.remove('residuos', id)
        this.residuos = this.residuos.filter(r => r.id !== id)
      } catch (error) {
        alert('No se pudo eliminar el residuo')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },

    formatDate(date) {
      return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date)
    }
  }
}
</script>

<style scoped>
.residuos-page {
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

.code-field {
  display: flex;
}

.code-field span {
  display: inline-flex;
  align-items: center;
  border: 1px solid #cbd5e1;
  border-right: 0;
  border-radius: 8px 0 0 8px;
  padding: 0 12px;
  color: #334155;
  background: #f8fafc;
}

.code-field input {
  border-radius: 0 8px 8px 0;
}

.code-field input:disabled {
  color: #475569;
  background: #f1f5f9;
  cursor: not-allowed;
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
  width: min(720px, 100%);
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

.field-full,
.checkbox-field {
  grid-column: 1 / -1;
}

.checkbox-col {
  display: flex;
  align-items: end;
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
