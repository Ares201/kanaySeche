<template>
  <section class="productos-page unified-list-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Configuracion</p>
        <h1>Productos</h1>
        <span class="registros-count">{{ filteredProductos.length }} registros</span>
      </div>
      <div class="header-actions"><button class="primary-button" type="button" @click="openCreateModal">Nuevo producto</button></div>
    </div>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de productos</h2>
          <span>{{ filteredProductos.length }} registros</span>
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
              <v-list-item @click="exportProductos">
                <v-list-item-title>Exportar</v-list-item-title>
              </v-list-item>
              <v-list-item @click="openImportProductos">
                <v-list-item-title>Importar</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>

          <input
            ref="productosExcelInput"
            class="excel-input"
            type="file"
            accept=".xlsx"
            @change="importProductos"
          >

          <label class="search-field">
            <span>Buscar por codigo, nombre o zona</span>
            <input v-model.trim="search" type="search" placeholder="Ej. Zona A">
          </label>
        </div>
      </div>
      <div class="table-wrapper">
        <v-data-table :headers="tableHeaders" :items="filteredProductos" :loading="loading" item-key="id"
          loading-text="Cargando productos..." no-data-text="No se encontraron productos."
          :footer-props="{ itemsPerPageText: 'Filas por página' }">
          <template #[`item.estado`]="{ item: producto }">
                <span class="status" :class="{ 'status--inactive': !producto.estado }">
                  {{ producto.estado ? 'Activo' : 'Inactivo' }}
                </span>
          </template>
          <template #[`item.fechaCreacion`]="{ item: producto }">{{ formatDate(producto.fechaCreacion) }}</template>
          <template #[`item.actions`]="{ item: producto }">
                <div class="actions">
                  <button class="icon-button" type="button" title="Editar" aria-label="Editar producto"
                    @click="openEditModal(producto)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                      <path d="M13.5 6.5l4 4" />
                    </svg>
                  </button>
                  <button class="icon-button icon-button--danger" type="button" title="Eliminar"
                    aria-label="Eliminar producto" @click="deleteProducto(producto.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M8 7l1 13h6l1-13" />
                      <path d="M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
          </template>
        </v-data-table>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal" @submit.prevent="saveProducto">
        <div class="modal-header">
          <h2>{{ editingId ? 'Editar producto' : 'Nuevo producto' }}</h2>
          <button type="button" class="modal-close" aria-label="Cerrar modal" @click="closeModal">
            x
          </button>
        </div>

        <div class="form-grid">
          <v-row dense>
            <v-col cols="12" md="4">
              <label>
                Codigo
                <input
                  v-model.trim="form.codigo"
                  type="text"
                  required
                  placeholder="PROD-001"
                  :disabled="form.autogenerar"
                >
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
                <input v-model.trim="form.nombre" type="text" required placeholder="Nombre del producto">
              </label>
            </v-col>
            <v-col cols="12" md="4">
              <label>
                Codigo residuo
                <input
                  v-model.trim="form.codigoResiduo"
                  type="text"
                  list="residuos-codigo-list"
                  placeholder="7000018"
                  @input="syncResiduoByCodigo"
                  @change="syncResiduoByCodigo"
                >
              </label>
            </v-col>
            <v-col cols="12" md="4">
              <label>
                Nombre residuo
                <input
                  v-model.trim="form.nombreResiduo"
                  type="text"
                  list="residuos-nombre-list"
                  placeholder="Lodos"
                  @input="syncResiduoByNombre"
                  @change="syncResiduoByNombre"
                >
              </label>
            </v-col>
            <v-col cols="12" md="4">
              <label>
                Zona de recepcion
                <input v-model.trim="form.zonaRecepcion" type="text" placeholder="Zona A">
              </label>
            </v-col>
            <v-col cols="12">
              <label class="checkbox-field">
                <input v-model="form.estado" type="checkbox">
                Producto activo
              </label>
            </v-col>
          </v-row>
          <datalist id="residuos-codigo-list">
            <option v-for="residuo in residuos" :key="residuo.id" :value="residuo.codigo">
              {{ residuo.nombre }}
            </option>
          </datalist>
          <datalist id="residuos-nombre-list">
            <option v-for="residuo in residuos" :key="residuo.id" :value="residuo.nombre">
              {{ residuo.codigo }}
            </option>
          </datalist>
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
  createEmptyProductoForm,
  getNextProductoCodigo,
  normalizeProducto,
  toProductoPayload
} from '~/models/producto'
import { normalizeResiduo } from '~/models/residuo'
import {
  exportRowsToExcel,
  parseActiveValue,
  readRowsFromExcelFile
} from '~/utils/exportExcel'

const PRODUCTO_EXCEL_COLUMNS = [
  'Codigo',
  'Nombre',
  'Codigo residuo',
  'Nombre residuo',
  'Zona de recepcion',
  'Estado',
  'Fecha creacion'
]

export default {
  name: 'ProductosPage',
  data() {
    return {
      search: '',
      loading: false,
      tableHeaders: [
        { text: 'Código', value: 'codigo' },
        { text: 'Nombre', value: 'nombre' },
        { text: 'Código residuo', value: 'codigoResiduo' },
        { text: 'Nombre residuo', value: 'nombreResiduo' },
        { text: 'Zona de recepción', value: 'zonaRecepcion' },
        { text: 'Estado', value: 'estado' },
        { text: 'Fecha creación', value: 'fechaCreacion' },
        { text: 'Acciones', value: 'actions', sortable: false }
      ],
      isModalOpen: false,
      editingId: null,
      form: this.getEmptyForm(),
      productos: [],
      residuos: []
    }
  },
  computed: {
    filteredProductos() {
      const term = this.search.toLowerCase()

      if (!term) return this.productos

      return this.productos.filter(producto =>
        producto.codigo.toLowerCase().includes(term) ||
        producto.nombre.toLowerCase().includes(term) ||
        producto.codigoResiduo.toLowerCase().includes(term) ||
        producto.nombreResiduo.toLowerCase().includes(term) ||
        producto.zonaRecepcion.toLowerCase().includes(term)
      )
    }
  },
  mounted() {
    this.loadProductos()
  },
  methods: {
    getEmptyForm() {
      return createEmptyProductoForm()
    },
    async loadProductos() {
      this.loading = true

      try {
        const [productos, residuos] = await Promise.all([
          this.$firebaseApi.list('productos'),
          this.$firebaseApi.list('residuos')
        ])
        this.productos = productos.map(normalizeProducto)
        this.residuos = residuos.map(normalizeResiduo).filter(residuo => residuo.estado)
      } catch (error) {
        alert('No se pudieron listar los productos')
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
    openEditModal(producto) {
      this.editingId = producto.id
      this.form = {
        codigo: producto.codigo,
        autogenerar: false,
        nombre: producto.nombre,
        codigoResiduo: producto.codigoResiduo,
        nombreResiduo: producto.nombreResiduo,
        zonaRecepcion: producto.zonaRecepcion,
        estado: producto.estado
      }
      this.isModalOpen = true
    },
    closeModal() {
      this.isModalOpen = false
    },
    async saveProducto() {
      if (this.form.autogenerar) {
        this.setAutogeneratedCodigo()
      }

      const existe = this.productos.some(
        producto => producto.codigo === this.form.codigo && producto.id !== this.editingId
      )

      if (existe) {
        alert('El codigo ya existe')
        return
      }

      try {
        if (this.editingId) {
          const producto = await this.$firebaseApi.update(
            'productos',
            this.editingId,
            toProductoPayload(this.form)
          )
          this.productos = this.productos.map(currentProducto => {
            return currentProducto.id === this.editingId
              ? normalizeProducto(producto)
              : currentProducto
          })
        } else {
          const producto = await this.$firebaseApi.create(
            'productos',
            toProductoPayload(this.form)
          )
          this.productos.unshift(normalizeProducto(producto))
        }

        this.closeModal()
      } catch (error) {
        alert('No se pudo guardar el producto')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    setAutogeneratedCodigo() {
      this.form.codigo = getNextProductoCodigo(this.productos)
    },
    handleAutogenerarChange() {
      if (this.form.autogenerar) {
        this.setAutogeneratedCodigo()
      }
    },
    exportProductos() {
      exportRowsToExcel({
        filename: 'productos',
        sheetName: 'Productos',
        rows: this.filteredProductos,
        columns: [
          { label: 'Codigo', value: producto => producto.codigo },
          { label: 'Nombre', value: producto => producto.nombre },
          { label: 'Codigo residuo', value: producto => producto.codigoResiduo },
          { label: 'Nombre residuo', value: producto => producto.nombreResiduo },
          { label: 'Zona de recepcion', value: producto => producto.zonaRecepcion },
          { label: 'Estado', value: producto => producto.estado ? 'Activo' : 'Inactivo' },
          { label: 'Fecha creacion', value: producto => this.formatDate(producto.fechaCreacion) }
        ]
      })
    },
    openImportProductos() {
      this.$refs.productosExcelInput.click()
    },
    async importProductos(event) {
      const file = event.target.files[0]
      event.target.value = ''
      if (!file) return

      try {
        const result = await readRowsFromExcelFile(file, PRODUCTO_EXCEL_COLUMNS)

        if (!result.matched) {
          alert('Este Excel no coincidio con las columnas esperadas.')
          return
        }

        if (result.rows.length === 0) {
          alert('El Excel no tiene filas para importar.')
          return
        }

        let created = 0
        let skipped = 0

        for (const row of result.rows) {
          const codigo = String(row.Codigo || '').trim()
          const nombre = String(row.Nombre || '').trim()
          let codigoResiduo = String(row['Codigo residuo'] || '').trim()
          let nombreResiduo = String(row['Nombre residuo'] || '').trim()

          if (!codigo || !nombre) {
            skipped += 1
            continue
          }

          const exists = this.productos.some(producto => producto.codigo === codigo)
          if (exists) {
            skipped += 1
            continue
          }

          const residuo = this.findResiduoByCodigo(codigoResiduo) || this.findResiduoByNombre(nombreResiduo)
          if (residuo) {
            codigoResiduo = residuo.codigo
            nombreResiduo = residuo.nombre
          }

          const producto = await this.$firebaseApi.create('productos', {
            codigo,
            nombre,
            codigoResiduo,
            nombreResiduo,
            zonaRecepcion: row['Zona de recepcion'],
            estado: parseActiveValue(row.Estado)
          })
          this.productos.unshift(normalizeProducto(producto))
          created += 1
        }

        alert(`Se agregaron ${created} productos. Filas omitidas: ${skipped}.`)
      } catch (error) {
        alert('No se pudo importar el Excel')
        // eslint-disable-next-line no-console
        console.error(error)
      }
    },
    syncResiduoByCodigo() {
      const residuo = this.findResiduoByCodigo(this.form.codigoResiduo)

      if (residuo) {
        this.form.codigoResiduo = residuo.codigo
        this.form.nombreResiduo = residuo.nombre
      }
    },
    syncResiduoByNombre() {
      const residuo = this.findResiduoByNombre(this.form.nombreResiduo)

      if (residuo) {
        this.form.codigoResiduo = residuo.codigo
        this.form.nombreResiduo = residuo.nombre
      }
    },
    findResiduoByCodigo(codigo) {
      const cleanCodigo = String(codigo || '').trim().toLowerCase()

      return this.residuos.find(residuo => residuo.codigo.toLowerCase() === cleanCodigo)
    },
    findResiduoByNombre(nombre) {
      const cleanNombre = String(nombre || '').trim().toLowerCase()

      return this.residuos.find(residuo => residuo.nombre.toLowerCase() === cleanNombre)
    },
    async deleteProducto(id) {
      try {
        await this.$firebaseApi.remove('productos', id)
        this.productos = this.productos.filter(producto => producto.id !== id)
      } catch (error) {
        alert('No se pudo eliminar el producto')
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
.productos-page {
  width: 90%;
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
.form-grid input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 12px;
  color: #0f172a;
  font: inherit;
  outline: none;
}

.form-grid input:disabled {
  color: #475569;
  background: #f1f5f9;
  cursor: not-allowed;
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
