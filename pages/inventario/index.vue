<template>
  <section class="inventory-module unified-list-page">
    <div class="page-header">
      <div>
        <p class="eyebrow">Inventario</p>
        <h1>Almacén</h1>
        <span class="registros-count">{{ filteredWarehouseProducts.length }} registros</span>
      </div>
      <div class="header-actions">
        <button class="primary-button" type="button" :disabled="loading" @click="loadAll">Actualizar</button>
      </div>
    </div>
    <v-alert v-if="error" type="error" dismissible @input="error = ''">{{ error }}</v-alert>
    <v-alert v-if="message" type="success" dismissible @input="message = ''">{{ message }}</v-alert>
    <div class="inventory-tabs" role="tablist" aria-label="Secciones de almacén">
      <button type="button" role="tab" :aria-selected="activeTab === 'stock'"
        :class="{ 'inventory-tab--active': activeTab === 'stock' }" @click="activeTab = 'stock'">Almacén</button>
      <button type="button" role="tab" :aria-selected="activeTab === 'deliveries'"
        :class="{ 'inventory-tab--active': activeTab === 'deliveries' }" @click="activeTab = 'deliveries'">Historial de
        entregas</button>
    </div>
    <div v-if="activeTab === 'stock'" class="content">
      <div class="table-header">
        <div>
          <h2>Existencias</h2><span>{{ filteredWarehouseProducts.length }} registros</span>
        </div>
        <label class="search-field"><span>Buscar por código o nombre</span><input v-model.trim="search" type="search"
            placeholder="Ej. Papel"></label>
        <button style="margin-top: 17px;" class="icon-button" type="button" title="Configurar stock bajo"
          aria-label="Configurar límite de stock bajo" @click="openSettings">
          <v-icon small>mdi-cog-outline</v-icon>
        </button>
      </div>
      <div class="table-wrapper">
        <v-data-table :headers="stockHeaders" :items="filteredWarehouseProducts" :loading="loading" item-key="id"
          no-data-text="No se encontraron productos en el almacén.">
          <template #[`item.stock`]="{ item }">
            <v-chip small :color="item.stock <= threshold ? 'red' : 'green'" dark>
              {{ item.stock <= threshold ? `Stock bajo · ${item.stock}` : item.stock }} </v-chip>
          </template>
          <template #[`item.actions`]="{ item }">
            <div class="actions">
              <button class="icon-button" type="button" title="Registrar entrega"
                :aria-label="'Registrar entrega de ' + item.nombre" :disabled="item.stock <= 0 || busy"
                @click="openExit(item)">
                <v-icon small>mdi-package-variant-closed</v-icon>
              </button>
              <button v-if="isAdmin" class="icon-button icon-button--danger" type="button"
                title="Eliminar registro de almacén" :aria-label="'Eliminar registro de almacén de ' + item.nombre"
                :disabled="busy" @click="deleteWarehouseRecord(item)">
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
    <div v-else class="content">
      <div class="table-header">
        <div>
          <h2>Historial de entregas</h2><span>{{ filteredDeliveries.length }} registros</span>
        </div>
        <label class="search-field"><span>Buscar entrega</span><input v-model.trim="search" type="search"
            placeholder="Producto o destinatario"></label>
      </div>
      <div class="table-wrapper">
        <v-data-table :headers="movementHeaders" :items="filteredDeliveries" :loading="loading" item-key="id"
          no-data-text="No se encontraron entregas.">
          <template #[`item.fechaCreacion`]="{ item }">{{ formatDate(item.fechaCreacion) }}</template>
          <template #[`item.actions`]="{ item }">
            <div v-if="isAdmin" class="actions">
              <button class="icon-button icon-button--danger" type="button" title="Eliminar entrega"
                :aria-label="'Eliminar entrega de ' + item.nombre" :disabled="busy" @click="deleteDelivery(item)">
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
    <v-dialog v-model="settingsDialog" max-width="440">
      <v-card>
        <v-card-title>Configurar stock bajo</v-card-title>
        <v-card-text>
          <p>Se mostrará “Stock bajo” cuando queden esta cantidad de unidades o menos.</p>
          <v-form ref="settingsForm" @submit.prevent="saveSettings">
            <v-text-field v-model.number="thresholdInput" label="Cantidad límite" type="number" min="0" step="1"
              :rules="[nonNegative]" />
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="settingsDialog = false">Cancelar</v-btn><v-btn color="teal" dark
            :loading="busy" @click="saveSettings">Guardar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="exitDialog" max-width="480">
      <v-card>
        <v-card-title>Registrar salida</v-card-title>
        <v-card-text>
          <p>{{ exitForm.nombre }} · Disponible: {{ exitForm.stock }}</p>
          <v-form ref="exitForm">
            <v-text-field v-model.number="exitForm.cantidad" label="Cantidad entregada" type="number" min="1" step="1"
              :rules="[positive]" />
            <v-text-field v-model.trim="exitForm.destino" label="Entregado a / motivo" maxlength="120"
              :rules="[required]" />
          </v-form>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn text @click="exitDialog = false">Cancelar</v-btn><v-btn color="teal" dark
            :loading="busy" @click="saveExit">Descontar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<script>
export default {
  name: 'AlmacenInventarioPage',
  data() {
    return {
      threshold: 2, thresholdInput: 2, settingsDialog: false, search: '', activeTab: 'stock', loading: false, busy: false, error: '', message: '',
      products: [], requests: [], movements: [], exitDialog: false,
      exitForm: { id: '', nombre: '', stock: 0, cantidad: 1, destino: '' },
      required: value => Boolean(String(value == null ? '' : value).trim()) || 'Obligatorio',
      positive: value => String(value == null ? '' : value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) > 0 || 'Ingresa un entero mayor que 0',
      nonNegative: value => String(value == null ? '' : value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 || 'Ingresa un entero desde 0',
      stockHeaders: [{ text: 'Código', value: 'codigo' }, { text: 'Producto', value: 'nombre' }, { text: 'Disponible', value: 'stock' }, { text: 'Acciones', value: 'actions', sortable: false }],
      movementHeaders: [{ text: 'Fecha', value: 'fechaCreacion' }, { text: 'Producto', value: 'nombre' }, { text: 'Cantidad', value: 'cantidad' }, { text: 'Entregado a / motivo', value: 'detalle' }, { text: 'Acciones', value: 'actions', sortable: false }]
    }
  },
  computed: {
    warehouseProducts() {
      const requestedIds = new Set(this.requests
        .filter(request => ['Aceptado', 'Recibido'].includes(request.estado))
        .flatMap(request => (request.items || []).map(line => line.productoId)))
      return this.products.filter(item => item.enAlmacen !== false && (item.stock > 0 || requestedIds.has(item.id)))
    },
    filteredWarehouseProducts() { return this.warehouseProducts.filter(item => this.matchesSearch(item)) },
    deliveries() { return this.movements.filter(item => item.tipo === 'salida') },
    filteredDeliveries() { return this.deliveries.filter(item => this.matchesSearch(item)) },
    isAdmin() { return Boolean(this.$auth?.isAdmin) }
  },
  mounted() { this.loadAll() },
  methods: {
    async loadAll() {
      this.loading = true
      try {
        const [products, requests, movements, settings] = await Promise.all([
          this.$firebaseApi.list('utilesOficina'),
          this.$firebaseApi.list('requerimientosUtiles'),
          this.$firebaseApi.list('movimientosUtiles'),
          this.$db.collection('configuracionInventario').doc('stock').get()
        ])
        this.products = products.map(item => ({ ...item, stock: Number(item.stock) || 0 }))
        this.requests = requests
        this.movements = movements
        const configured = Number(settings.data()?.umbralStockBajo)
        this.threshold = settings.exists && Number.isInteger(configured) && configured >= 0 ? configured : 2
        this.error = ''
      } catch (error) { this.fail('No se pudo cargar el almacén.', error) }
      finally { this.loading = false }
    },
    fail(message, error) { this.error = message; console.error(error) },
    matchesSearch(item) {
      const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const term = normalize(this.search)
      return !term || [item.codigo, item.nombre, item.detalle].some(value => normalize(value).includes(term))
    },
    openSettings() { this.thresholdInput = this.threshold; this.settingsDialog = true },
    async saveSettings() {
      if (!this.$refs.settingsForm.validate() || this.busy) return
      const threshold = Number(this.thresholdInput)
      this.busy = true
      try {
        const ref = this.$db.collection('configuracionInventario').doc('stock')
        await this.$db.runTransaction(async transaction => {
          const current = await transaction.get(ref)
          const now = new Date()
          transaction.set(ref, { umbralStockBajo: threshold, fechaActualizacion: now }, { merge: true })
          transaction.set(this.$db.collection('historial').doc(), {
            fecha: now, usuarioId: this.$auth.user?.id || '', usuario: this.$auth.user?.nombres || '',
            modulo: 'Inventario', pagina: 'Almacén', ruta: '/inventario', accion: current.exists ? 'Editar' : 'Registrar',
            coleccion: 'configuracionInventario', registroId: 'stock', detalle: `Límite de stock bajo: ${threshold}`
          })
        })
        this.threshold = threshold
        this.settingsDialog = false
        this.message = 'Límite de stock bajo actualizado.'
      } catch (error) { this.fail('No se pudo guardar el límite de stock bajo.', error) }
      finally { this.busy = false }
    },
    formatDate(value) {
      const date = value && typeof value.toDate === 'function' ? value.toDate() : new Date(value || Date.now())
      return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
    },
    openExit(item) { this.exitForm = { id: item.id, nombre: item.nombre, stock: item.stock, cantidad: 1, destino: '' }; this.exitDialog = true },
    async saveExit() {
      if (!this.$refs.exitForm.validate()) return
      this.busy = true
      try {
        const productRef = this.$db.collection('utilesOficina').doc(this.exitForm.id)
        const cantidad = Number(this.exitForm.cantidad)
        const destino = this.exitForm.destino
        await this.$db.runTransaction(async transaction => {
          const snapshot = await transaction.get(productRef)
          if (!snapshot.exists || snapshot.data().anulado) throw new Error('El producto ya no existe.')
          const stock = Number(snapshot.data().stock) || 0
          if (cantidad > stock) throw new Error(`Solo quedan ${stock} unidades.`)
          const now = new Date()
          transaction.update(productRef, { stock: stock - cantidad, enAlmacen: true, fechaActualizacion: now })
          transaction.set(this.$db.collection('movimientosUtiles').doc(), { tipo: 'salida', productoId: productRef.id, codigo: snapshot.data().codigo, nombre: snapshot.data().nombre, cantidad, detalle: destino, fechaCreacion: now })
        })
        this.exitDialog = false; this.message = 'Salida registrada.'; await this.loadAll()
      } catch (error) { this.fail('No se pudo registrar la salida: ' + error.message, error) }
      finally { this.busy = false }
    },
    async deleteDelivery(item) {
      if (!this.isAdmin || this.busy) return
      if (!confirm(`¿Eliminar la entrega de ${item.cantidad} unidad(es) de ${item.nombre}? La cantidad volverá al almacén.`)) return
      this.busy = true
      try {
        const movementRef = this.$db.collection('movimientosUtiles').doc(item.id)
        const productRef = this.$db.collection('utilesOficina').doc(item.productoId)
        await this.$db.runTransaction(async transaction => {
          const movement = await transaction.get(movementRef)
          const product = await transaction.get(productRef)
          if (!movement.exists || movement.data().anulado || movement.data().tipo !== 'salida') throw new Error('La entrega ya no está disponible.')
          if (!product.exists || product.data().anulado) throw new Error('El producto ya no está disponible.')
          const cantidad = Number(movement.data().cantidad)
          if (!Number.isInteger(cantidad) || cantidad <= 0) throw new Error('La cantidad de la entrega no es válida.')
          const now = new Date()
          transaction.update(productRef, { stock: (Number(product.data().stock) || 0) + cantidad, enAlmacen: true, fechaActualizacion: now })
          transaction.update(movementRef, { anulado: true, fechaAnulacion: now, anuladoPor: this.$auth.user?.nombres || '', fechaActualizacion: now })
          transaction.set(this.$db.collection('historial').doc(), {
            fecha: now, usuarioId: this.$auth.user?.id || '', usuario: this.$auth.user?.nombres || '',
            modulo: 'Inventario', pagina: 'Historial de entregas', ruta: '/inventario',
            accion: 'Eliminar', coleccion: 'movimientosUtiles', registroId: item.id,
            detalle: `Entrega anulada; ${cantidad} unidad(es) devueltas al almacén`
          })
        })
        this.message = 'Entrega eliminada y cantidad devuelta al almacén.'
        await this.loadAll()
      } catch (error) { this.fail('No se pudo eliminar la entrega: ' + error.message, error) }
      finally { this.busy = false }
    },
    async deleteWarehouseRecord(item) {
      if (!this.isAdmin || this.busy) return
      if (!confirm(`¿Eliminar ${item.nombre} del almacén? Se retirarán ${item.stock} unidad(es). El producto seguirá en el catálogo.`)) return
      this.busy = true
      try {
        const ref = this.$db.collection('utilesOficina').doc(item.id)
        await this.$db.runTransaction(async transaction => {
          const snapshot = await transaction.get(ref)
          if (!snapshot.exists || snapshot.data().anulado) throw new Error('El producto ya no existe.')
          if (snapshot.data().enAlmacen === false) throw new Error('El registro ya fue retirado del almacén.')
          const stock = Number(snapshot.data().stock) || 0
          const now = new Date()
          transaction.update(ref, { stock: 0, enAlmacen: false, fechaSalidaAlmacen: now, fechaActualizacion: now })
          if (stock > 0) {
            transaction.set(this.$db.collection('movimientosUtiles').doc(), {
              tipo: 'baja', productoId: item.id, codigo: snapshot.data().codigo, nombre: snapshot.data().nombre,
              cantidad: stock, detalle: 'Registro retirado del almacén', fechaCreacion: now
            })
          }
          transaction.set(this.$db.collection('historial').doc(), {
            fecha: now, usuarioId: this.$auth.user?.id || '', usuario: this.$auth.user?.nombres || '',
            modulo: 'Inventario', pagina: 'Almacén', ruta: '/inventario',
            accion: 'Eliminar', coleccion: 'utilesOficina', registroId: item.id,
            detalle: `${item.nombre}; ${stock} unidad(es) retiradas del almacén`
          })
        })
        this.message = 'Registro retirado del almacén. El producto sigue en el catálogo.'
        await this.loadAll()
      } catch (error) { this.fail('No se pudo retirar el registro: ' + error.message, error) }
      finally { this.busy = false }
    }
  }
}
</script>
