<template>
  <section class="envases-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Configuracion</p>
        <h1>Envases</h1>
      </div>
      <button class="primary-button" type="button" @click="openCreateModal">
        Nuevo envase
      </button>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de envases</h2>
          <span>{{ filteredEnvases.length }} registros</span>
        </div>

        <label class="search-field">
          <span>Buscar por nombre</span>
          <input v-model.trim="search" type="search" placeholder="Ej. Bolsas">
        </label>
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
            <tr v-for="envase in filteredEnvases" :key="envase.id">
              <td>{{ envase.codigo }}</td>
              <td>{{ envase.nombre }}</td>
              <td>{{ envase.descripcion }}</td>
              <td>
                <span class="status" :class="{ 'status--inactive': !envase.estado }">
                  {{ envase.estado ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>{{ formatDate(envase.fechaCreacion) }}</td>
              <td>
                <div class="actions">
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar envase"
                    @click="openEditModal(envase)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar"
                    aria-label="Eliminar envase" @click="deleteEnvase(envase.id)">
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
                Cargando envases...
              </td>
            </tr>
            <tr v-else-if="filteredEnvases.length === 0">
              <td class="empty-state" colspan="6">
                No se encontraron envases.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveEnvase">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar envase' : 'Nuevo envase' }}</h2>
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
              <span>ENV-</span>
              <input
                v-model.trim="form.numero"
                type="text"
                inputmode="numeric"
                pattern="[0-9]+"
                required
                placeholder="001"
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
            <textarea v-model.trim="form.descripcion" rows="3" placeholder="Descripcion del envase" />
          </label>
            </v-col>

            <v-col cols="12">
          <label class="checkbox-field">
            <input v-model="form.estado" type="checkbox">
            Envase activo
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
  ENVASE_CODIGO_PREFIX,
  buildEnvaseCodigo,
  createEmptyEnvaseForm,
  getNextEnvaseNumero,
  normalizeEnvase,
  toEnvasePayload
} from '~/models/envase'

export default {
  name: 'EnvasesPage',
  data() {
    return {
      search: '',
      loading: false,
      isModalOpen: false,
      editingId: null,
      form: this.getEmptyForm(),
      envases: []
    }
  },
  computed: {
    filteredEnvases() {
      const term = this.search.toLowerCase()

      if (!term) {
        return this.envases
      }

      return this.envases.filter(envase =>
        envase.nombre.toLowerCase().includes(term) ||
        envase.descripcion.toLowerCase().includes(term) ||
        envase.codigo.toLowerCase().includes(term)
      )
    }
  },
  mounted() {
    this.loadEnvases()
  },
  methods: {
    getEmptyForm() {
      return createEmptyEnvaseForm()
    },
    async loadEnvases() {
      this.loading = true

      try {
        const envases = await this.$firebaseApi.list('envases')
        this.envases = envases.map(normalizeEnvase)
      } catch (error) {
        alert('No se pudieron listar los envases')
        // eslint-disable-next-line no-console
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    openCreateModal() {
      this.editingId = null
      this.form = this.getEmptyForm()
      this.setAutogeneratedNumber()
      this.isModalOpen = true
    },
    openEditModal(envase) {
      this.editingId = envase.id
      this.form = {
        numero: envase.codigo.replace(ENVASE_CODIGO_PREFIX, ''),
        autogenerar: false,
        nombre: envase.nombre,
        descripcion: envase.descripcion,
        estado: envase.estado
      }
      this.isModalOpen = true
    },
    closeModal() {
      this.isModalOpen = false
    },
    async saveEnvase() {
      if (this.form.autogenerar) {
        this.setAutogeneratedNumber()
      }

      const existe = this.envases.some(
        envase => envase.codigo === this.buildCodigo() && envase.id !== this.editingId
      )

      if (existe) {
        alert('El codigo ya existe')
        return
      }

      try {
        if (this.editingId) {
          const envase = await this.$firebaseApi.update(
            'envases',
            this.editingId,
            toEnvasePayload(this.form)
          )
          this.envases = this.envases.map(currentEnvase => {
            return currentEnvase.id === this.editingId
              ? normalizeEnvase(envase)
              : currentEnvase
          })
        } else {
          const envase = await this.$firebaseApi.create(
            'envases',
            toEnvasePayload(this.form)
          )
          this.envases.unshift(normalizeEnvase(envase))
        }

        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar el envase')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    buildCodigo() {
      return buildEnvaseCodigo(this.form)
    },
    handleAutogenerarChange() {
      if (this.form.autogenerar) {
        this.setAutogeneratedNumber()
      }
    },
    setAutogeneratedNumber() {
      this.form.numero = getNextEnvaseNumero(this.envases, this.editingId)
    },
    async deleteEnvase(id) {
      try {
        await this.$firebaseApi.remove('envases', id)
        this.envases = this.envases.filter(envase => envase.id !== id)
      } catch (error) {
        alert('No se pudo eliminar el envase')
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
.envases-page {
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
  .table-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .primary-button {
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
