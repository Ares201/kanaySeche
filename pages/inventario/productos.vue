<template>
  <section class="inventory-module unified-list-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Inventario</p>
        <h1>Productos de oficina</h1>
        <span class="registros-count">{{ filteredProducts.length }} registros</span>
      </div>
      <div class="header-actions"><button class="primary-button" type="button" @click="openProduct()">Nuevo
          producto</button></div>
    </div>

    <v-alert v-if="error" type="error" dismissible @input="error = ''">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" dismissible @input="message = ''">{{ message }}</v-alert>

    <div class="content">
      <div class="table-header">
        <div>
          <h2>Listado de productos</h2><span>{{ filteredProducts.length }} registros</span>
        </div>
        <label class="search-field"><span>Buscar por código o nombre</span><input v-model.trim="search" type="search"
            list="utiles-sugeridos" placeholder="Ej. Papel"></label>
        <datalist id="utiles-sugeridos">
          <option v-for="item in products" :key="item.id" :value="item.nombre">{{ item.codigo }}</option>
        </datalist>
      </div>
      <div class="table-wrapper">
        <v-data-table :headers="headers" :items="filteredProducts" :loading="loading" item-key="id"
          no-data-text="Aún no hay productos.">
          <template #[`item.actions`]="{ item }">
            <div class="actions">
              <button class="icon-button" type="button" title="Editar" :aria-label="'Editar ' + item.nombre"
                @click="openProduct(item)">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h4l10.5-10.5-4-4L4 16v4z" />
                  <path d="M13.5 6.5l4 4" />
                </svg>
              </button>
              <button v-if="isAdmin" class="icon-button icon-button--danger" type="button" title="Eliminar"
                :aria-label="'Eliminar ' + item.nombre" :disabled="busy" @click="deleteProduct(item)">
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

    <v-dialog v-model="dialog" max-width="480">
      <v-card>
        <v-card-title>{{ form.id ? 'Editar producto' : 'Nuevo producto' }}</v-card-title>
        <v-card-text>
          <v-form ref="productForm" @submit.prevent="saveProduct">
            <v-text-field v-model.trim="form.codigo" label="Código" required :rules="[required]" maxlength="40" />
            <v-text-field v-model.trim="form.nombre" label="Nombre" required :rules="[required]" maxlength="120" />
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="dialog = false">Cancelar</v-btn><v-btn color="teal" dark
            :loading="busy" @click="saveProduct">Guardar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
export default {
  name: 'ProductosInventarioPage',
  data() {
    return {
      loading: false, busy: false, dialog: false, error: '', message: '', products: [], search: '',
      form: { id: '', codigo: '', nombre: '' },
      required: value => Boolean(String(value == null ? '' : value).trim()) || 'Obligatorio',
      headers: [{ text: 'Código', value: 'codigo' }, { text: 'Nombre', value: 'nombre' }, { text: '', value: 'actions', sortable: false }]
    }
  },
  computed: {
    isAdmin() { return Boolean(this.$auth?.isAdmin) },
    filteredProducts() {
      const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const term = normalize(this.search)
      return term ? this.products.filter(item => normalize(item.codigo).includes(term) || normalize(item.nombre).includes(term)) : this.products
    }
  },
  mounted() { this.loadProducts() },
  methods: {
    async loadProducts() {
      this.loading = true
      try {
        this.products = await this.$firebaseApi.list('utilesOficina')
        this.error = ''
      } catch (error) { this.error = 'No se pudieron cargar los productos.'; console.error(error) }
      finally { this.loading = false }
    },
    openProduct(item) {
      this.form = item ? { id: item.id, codigo: item.codigo, nombre: item.nombre } : { id: '', codigo: '', nombre: '' }
      this.dialog = true
    },
    async saveProduct() {
      if (!this.$refs.productForm.validate()) return
      const { id, codigo, nombre } = this.form
      if (this.products.some(item => item.codigo.toLowerCase() === codigo.toLowerCase() && item.id !== id)) {
        this.error = 'Ya existe un producto con ese código.'
        return
      }
      this.busy = true
      try {
        if (id) await this.$firebaseApi.update('utilesOficina', id, { codigo, nombre })
        else await this.$firebaseApi.create('utilesOficina', { codigo, nombre, stock: 0, enAlmacen: false })
        this.dialog = false
        this.message = 'Producto guardado.'
        await this.loadProducts()
      } catch (error) { this.error = 'No se pudo guardar el producto.'; console.error(error) }
      finally { this.busy = false }
    },
    async deleteProduct(item) {
      if (!this.isAdmin || this.busy) return
      if (Number(item.stock) !== 0) { this.error = 'Solo puedes eliminar productos sin existencias.'; return }
      if (!confirm(`¿Eliminar el producto ${item.nombre}?`)) return
      this.busy = true
      try {
        const [requests, movements] = await Promise.all([
          this.$firebaseApi.list('requerimientosUtiles'),
          this.$firebaseApi.list('movimientosUtiles')
        ])
        if (requests.some(request => ['Pendiente', 'Aceptado'].includes(request.estado) && (request.items || []).some(line => line.productoId === item.id))) {
          throw new Error('El producto figura en un requerimiento pendiente o aceptado.')
        }
        if (movements.some(movement => movement.productoId === item.id && movement.tipo === 'salida')) {
          throw new Error('El producto tiene entregas registradas. Elimina esas entregas primero.')
        }
        const ref = this.$db.collection('utilesOficina').doc(item.id)
        await this.$db.runTransaction(async transaction => {
          const snapshot = await transaction.get(ref)
          if (!snapshot.exists || snapshot.data().anulado) throw new Error('El producto ya no existe.')
          if (Number(snapshot.data().stock) !== 0) throw new Error('El producto aún tiene existencias.')
          const now = new Date()
          transaction.update(ref, { anulado: true, estado: 'Anulado', fechaAnulacion: now, fechaActualizacion: now })
          transaction.set(this.$db.collection('historial').doc(), {
            fecha: now, usuarioId: this.$auth.user?.id || '', usuario: this.$auth.user?.nombres || '',
            modulo: 'Inventario', pagina: 'Productos', ruta: '/inventario/productos',
            accion: 'Eliminar', coleccion: 'utilesOficina', registroId: item.id, detalle: item.nombre
          })
        })
        this.message = 'Producto eliminado.'
        await this.loadProducts()
      } catch (error) { this.error = 'No se pudo eliminar el producto: ' + error.message; console.error(error) }
      finally { this.busy = false }
    }
  }
}
</script>
