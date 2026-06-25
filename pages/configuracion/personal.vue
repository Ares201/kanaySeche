<template>
  <section class="personal-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Configuración</p>
        <h1>Personal</h1>
      </div>

      <button class="primary-button" type="button" @click="openCreateModal">
        Nuevo personal
      </button>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de personal</h2>
          <span>{{ filteredPersonal.length }} registros</span>
        </div>

        <label class="search-field">
          <span>Buscar</span>
          <input v-model.trim="search" type="search" placeholder="Ej. Juan Perez">
        </label>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nombres completos</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in filteredPersonal" :key="item.id">
              <td>{{ item.nombres }}</td>
              <td>{{ item.telefono }}</td>
              <td>{{ item.correo }}</td>
              <td>
                <span class="status" :class="{ 'status--inactive': !item.estado }">
                  {{ item.estado ? 'Activo' : 'Inactivo' }}
                </span>
              </td>

              <td>
                <div class="actions">
                  <button class="icon-button" @click="openEditModal(item)">✏️</button>
                  <button class="icon-button icon-button--danger" @click="deletePersonal(item.id)">🗑️</button>
                </div>
              </td>
            </tr>

            <tr v-if="loading">
              <td colspan="5" class="empty-state">Cargando...</td>
            </tr>

            <tr v-else-if="filteredPersonal.length === 0">
              <td colspan="5" class="empty-state">Sin registros</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL -->
    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="savePersonal">

        <div class="modal-header">
          <h2>{{ editingId ? 'Editar personal' : 'Nuevo personal' }}</h2>
          <button type="button" class="modal-close" @click="closeModal">x</button>
        </div>

        <div class="form-grid">
          <label>
            Nombres completos
            <input v-model.trim="form.nombres" required />
          </label>

          <label>
            Teléfono
            <input v-model.trim="form.telefono" type="tel" />
          </label>

          <label>
            Correo
            <input v-model.trim="form.correo" type="email" />
          </label>

          <label class="checkbox-field">
            <input type="checkbox" v-model="form.estado">
            Activo
          </label>
        </div>

        <div class="modal-actions">
          <button type="button" class="secondary-button" @click="closeModal">
            Cancelar
          </button>
          <button type="submit" class="primary-button">
            Guardar
          </button>
        </div>

      </form>
    </div>
  </section>

</template>
<script>
import {
  createEmptyPersonalForm,
  normalizePersonal,
  toPersonalPayload
} from '~/models/personal'

export default {
  data() {
    return {
      search: '',
      loading: false,
      isModalOpen: false,
      editingId: null,

      form: createEmptyPersonalForm(),
      personal: []
    }
  },

  computed: {
    filteredPersonal() {
      const term = this.search.toLowerCase()

      if (!term) return this.personal

      return this.personal.filter(p =>
        p.nombres.toLowerCase().includes(term) ||
        p.telefono.toLowerCase().includes(term) ||
        p.correo.toLowerCase().includes(term)
      )
    }
  },

  mounted() {
    this.loadPersonal()
  },

  methods: {
    async loadPersonal() {
      this.loading = true
      try {
        const data = await this.$firebaseApi.list('personal')
        this.personal = data.map(normalizePersonal)
      } catch (e) {
        console.error(e)
      } finally {
        this.loading = false
      }
    },

    openCreateModal() {
      this.editingId = null
      this.form = createEmptyPersonalForm()
      this.isModalOpen = true
    },

    openEditModal(item) {
      this.editingId = item.id
      this.form = {
        nombres: item.nombres,
        telefono: item.telefono,
        correo: item.correo,
        estado: item.estado
      }
      this.isModalOpen = true
    },

    closeModal() {
      this.isModalOpen = false
    },

    async savePersonal() {
      try {
        const payload = toPersonalPayload(this.form)

        if (this.editingId) {
          await this.$firebaseApi.update(
            'personal',
            this.editingId,
            payload
          )
        } else {
          await this.$firebaseApi.create(
            'personal',
            payload
          )
        }

        this.closeModal()
        this.loadPersonal()
      } catch (e) {
        console.error(e)
      }
    },

    async deletePersonal(id) {
      try {
        await this.$firebaseApi.remove('personal', id)
        this.loadPersonal()
      } catch (e) {
        console.error(e)
      }
    }
  }
}
</script>

<style scoped>
.personal-page {
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

h1 {
  font-size: 32px;
  margin: 0;
}

h2 {
  font-size: 18px;
  margin: 0;
}

.primary-button {
  min-height: 42px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  color: #fff;
  font-weight: 700;
  background: #0f766e;
  cursor: pointer;
}

.content {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.table-header>div {
  display: flex;
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
  font-size: 13px;
  font-weight: 700;
  color: #475569;
}

.search-field input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  outline: none;
}

.search-field input:focus {
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
  border-bottom: 1px solid #edf2f7;
  white-space: nowrap;
}

th {
  font-size: 12px;
  text-transform: uppercase;
  color: #475569;
  background: #f8fafc;
}

td {
  color: #1e293b;
}

.status {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: #166534;
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
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.icon-button--danger {
  color: #dc2626;
}

.empty-state {
  text-align: center;
  color: #64748b;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}

.modal {
  width: min(520px, 100%);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-close {
  border: 0;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: #f1f5f9;
  cursor: pointer;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #334155;
}

.form-grid input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  outline: none;
}

.form-grid input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-direction: row !important;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 20px;
  border-top: 1px solid #e2e8f0;
}

.secondary-button {
  min-height: 42px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 16px;
  background: #fff;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 640px) {

  .page-header,
  .table-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }
}
</style>