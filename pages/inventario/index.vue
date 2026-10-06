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
      <v-progress-linear v-if="loading" indeterminate color="teal" />
      <div class="dispatch-layout">
        <div class="product-grid">
          <article v-for="item in filteredWarehouseProducts" :key="item.id" class="product-tile">
            <button type="button" class="product-select" :disabled="busy || loading || remainingStock(item) <= 0" :aria-label="'Agregar ' + item.nombre + ' a la entrega'" @click="addToCart(item)">
              <div class="product-picture"><v-img v-if="item.imagenUrl" :src="item.imagenUrl" contain height="100"><template #placeholder><v-icon size="44">mdi-package-variant</v-icon></template></v-img><v-icon v-else size="52" color="teal">{{ productIcon(item) }}</v-icon></div>
              <span class="product-code">{{ item.codigo }}</span><strong>{{ item.nombre }}</strong>
              <span :class="{ 'low-stock': item.stock <= threshold }">{{ item.stock <= threshold ? 'Stock bajo' : 'Disponible' }}: {{ item.stock }}</span>
              <span class="add-label">{{ remainingStock(item) > 0 ? '+ Agregar a entrega' : 'Sin unidades disponibles' }}</span>
            </button>
            <v-btn v-if="isAdmin" small icon class="remove-product" :disabled="busy" :aria-label="'Retirar del almac?n: ' + item.nombre" @click="deleteWarehouseRecord(item)"><v-icon small>mdi-trash-can-outline</v-icon></v-btn>
          </article>
          <p v-if="!loading && !filteredWarehouseProducts.length" class="cart-empty">No se encontraron productos en el almac&#233;n.</p>
        </div>
        <aside class="dispatch-cart">
          <div class="cart-heading"><h2>Entrega de salida</h2><v-icon color="teal">mdi-cart-outline</v-icon></div>
          <p v-if="!cart.length" class="cart-empty">Selecciona productos del cat&#225;logo para preparar la entrega.</p>
          <div v-for="line in cart" :key="line.id" class="cart-line">
            <strong>{{ line.nombre }}</strong>
            <div class="cart-controls">
              <v-btn icon small :disabled="busy || line.cantidad <= 1" :aria-label="'Restar ' + line.nombre" @click="line.cantidad--"><v-icon small>mdi-minus</v-icon></v-btn>
              <input v-model.number="line.cantidad" :disabled="busy" type="number" min="1" step="1" :max="stockFor(line.id)" :aria-label="'Cantidad de ' + line.nombre">
              <v-btn icon small :disabled="busy || line.cantidad >= stockFor(line.id)" :aria-label="'Sumar ' + line.nombre" @click="line.cantidad++"><v-icon small>mdi-plus</v-icon></v-btn>
              <span>de {{ stockFor(line.id) }}</span>
              <v-btn icon small :disabled="busy" :aria-label="'Quitar ' + line.nombre" @click="cart = cart.filter(item => item.id !== line.id)"><v-icon small>mdi-close</v-icon></v-btn>
            </div>
          </div>
          <div class="cart-total">{{ cart.length }} productos ? {{ cartUnits }} unidades</div>
          <v-autocomplete v-model="cartDestino" :items="personalOptions" :disabled="busy" :loading="loading"
            label="Entregado a" placeholder="Busca una persona" outlined dense hide-details clearable
            no-data-text="No se encontró personal disponible" />
          <v-btn block color="teal" dark class="mt-4" :loading="busy" :disabled="!cart.length || !cartDestino || loading || busy" @click="saveCart">Registrar entrega</v-btn>
          <v-btn block text small :disabled="busy || !cart.length" @click="cart = []">Vaciar carrito</v-btn>
        </aside>
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
            <div class="actions">
              <button class="icon-button" type="button" title="Copiar nota de entrega"
                :aria-label="'Copiar nota de entrega de ' + item.nombre" @click="copyDeliveryNote(item)">
                <v-icon small>mdi-message-text-outline</v-icon>
              </button>
              <button v-if="isAdmin" class="icon-button icon-button--danger" type="button" title="Eliminar entrega"
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
  </section>
</template>

<script>
export default {
  name: 'AlmacenInventarioPage',
  data() {
    return {
      threshold: 2, thresholdInput: 2, settingsDialog: false, search: '', activeTab: 'stock', loading: false, busy: false, error: '', message: '',
      products: [], requests: [], movements: [], personal: [], cart: [], cartDestino: '',
      required: value => Boolean(String(value == null ? '' : value).trim()) || 'Obligatorio',
      positive: value => String(value == null ? '' : value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) > 0 || 'Ingresa un entero mayor que 0',
      nonNegative: value => String(value == null ? '' : value).trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 || 'Ingresa un entero desde 0',
      movementHeaders: [{ text: 'Fecha', value: 'fechaCreacion' }, { text: 'Producto', value: 'nombre' }, { text: 'Cantidad', value: 'cantidad' }, { text: 'Entregado a / motivo', value: 'detalle' }, { text: 'Acciones', value: 'actions', sortable: false }]
    }
  },
  computed: {
    personalOptions() {
      return [...new Set(this.personal.filter(person => person.estado !== false && !person.anulado)
        .map(person => [person.nombres, person.apellidos].filter(Boolean).join(' ').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es'))
    },
    cartUnits() { return this.cart.reduce((total, item) => total + (Number(item.cantidad) || 0), 0) },
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
    buildDeliveryNote(item) {
      const lines = item.entregaId
        ? this.deliveries.filter(movement => movement.entregaId === item.entregaId && !movement.anulado)
        : [item]
      const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
      const rows = lines.map(line => ({ codigo: clean(line.codigo) || '-', nombre: clean(line.nombre) || 'Producto', cantidad: `${line.cantidad} ud.` }))
      const codeWidth = Math.max(6, ...rows.map(row => row.codigo.length))
      const nameWidth = Math.max(11, ...rows.map(row => row.nombre.length))
      const rowText = (codigo, nombre, cantidad) => `${codigo.padEnd(codeWidth)}  ${nombre.padEnd(nameWidth)}  ${cantidad}`
      const separator = '='.repeat(50)
      return [
        separator,
        '\u{1F4E6} NOTA DE ENTREGA',
        'Almac\u00e9n Kanay \u2013 S\u00e9ch\u00e9',
        separator,
        '',
        `\u{1F4C5} FECHA:        ${this.formatDate(item.fechaCreacion)}`,
        `\u{1F464} ENTREGADO A:  ${clean(item.detalle) || 'No indicado'}`,
        '',
        '-'.repeat(50),
        '```',
        rowText('C\u00d3DIGO', 'DESCRIPCI\u00d3N', 'CANT.'),
        ...rows.map(row => rowText(row.codigo, row.nombre, row.cantidad)),
        '',
        `TOTAL ENTREGADO: ${lines.reduce((total, line) => total + (Number(line.cantidad) || 0), 0)} unidad(es)`,
        '```',
        separator
      ].join('\n')
    },
    async copyDeliveryNote(item) {
      this.error = ''; this.message = ''
      try {
        await navigator.clipboard.writeText(this.buildDeliveryNote(item))
        this.message = 'Nota de entrega copiada. Ya puedes pegarla en un mensaje.'
      } catch (error) {
        this.fail('No se pudo copiar la nota. Permite el acceso al portapapeles e intenta nuevamente.', error)
      }
    },
    async loadAll() {
      this.loading = true
      try {
        const [products, requests, movements, settings, personal] = await Promise.all([
          this.$firebaseApi.list('utilesOficina'),
          this.$firebaseApi.list('requerimientosUtiles'),
          this.$firebaseApi.list('movimientosUtiles'),
          this.$db.collection('configuracionInventario').doc('stock').get(),
          this.$firebaseApi.list('personal')
        ])
        this.products = products.map(item => ({ ...item, stock: Number(item.stock) || 0 }))
        this.requests = requests
        this.movements = movements
        this.personal = personal
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
    stockFor(id) { return this.warehouseProducts.find(item => item.id === id)?.stock || 0 },
    remainingStock(item) { return item.stock - (Number(this.cart.find(line => line.id === item.id)?.cantidad) || 0) },
    productIcon(item) {
      const name = String(item.nombre || '').toLowerCase()
      if (/papel|hoja/.test(name)) return 'mdi-file-multiple-outline'
      if (/archiv|folder|carpeta/.test(name)) return 'mdi-folder-outline'
      if (/lapiz|lapic|plumon|marcador/.test(name)) return 'mdi-pencil-outline'
      if (/cinta/.test(name)) return 'mdi-tape-measure'
      return 'mdi-package-variant-closed'
    },
    addToCart(item) {
      if (this.busy || this.loading || this.remainingStock(item) <= 0) return
      const line = this.cart.find(line => line.id === item.id)
      if (line) line.cantidad = Number(line.cantidad) + 1
      else this.cart.push({ id: item.id, nombre: item.nombre, cantidad: 1 })
    },
    async saveCart() {
      if (this.busy) return
      const lines = this.cart.map(line => ({ ...line, cantidad: Number(line.cantidad) }))
      const destino = String(this.cartDestino || '').trim()
      if (!lines.length || !destino || destino.length > 120 || lines.some(line => !Number.isSafeInteger(line.cantidad) || line.cantidad <= 0)) {
        this.error = 'Indica el destinatario y cantidades enteras mayores que cero.'; return
      }
      if (lines.length > 200 || new Set(lines.map(line => line.id)).size !== lines.length) {
        this.error = 'La entrega admite hasta 200 productos diferentes.'; return
      }
      this.busy = true; this.error = ''; this.message = ''
      try {
        const refs = lines.map(line => this.$db.collection('utilesOficina').doc(line.id))
        const movementRefs = lines.map(() => this.$db.collection('movimientosUtiles').doc())
        const entregaId = this.$db.collection('movimientosUtiles').doc().id
        await this.$db.runTransaction(async transaction => {
          const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)))
          snapshots.forEach((snapshot, index) => {
            const product = snapshot.exists ? snapshot.data() : null
            if (!product || product.anulado || product.enAlmacen === false) throw new Error(`${lines[index].nombre} ya no esta disponible.`)
            if (lines[index].cantidad > (Number(product.stock) || 0)) throw new Error(`${product.nombre}: solo quedan ${Number(product.stock) || 0} unidades. Actualiza el almacen y ajusta la cantidad.`)
          })
          const now = new Date()
          lines.forEach((line, index) => {
            const product = snapshots[index].data()
            transaction.update(refs[index], { stock: Number(product.stock) - line.cantidad, enAlmacen: true, fechaActualizacion: now })
            transaction.set(movementRefs[index], { tipo: 'salida', productoId: line.id, codigo: product.codigo || '', nombre: product.nombre || '', cantidad: line.cantidad, detalle: destino, entregaId, fechaCreacion: now })
          })
        })
        this.cart = []; this.cartDestino = ''; this.message = 'Entrega registrada correctamente.'; await this.loadAll()
      } catch (error) { this.fail('No se pudo registrar la entrega: ' + error.message, error) }
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

<style scoped>
.dispatch-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; padding: 20px; align-items: start; }
.product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px; }
.product-tile { position: relative; border: 1px solid rgba(100,116,139,.2); border-radius: 12px; overflow: hidden; }
.product-select { width: 100%; padding: 16px; display: flex; flex-direction: column; gap: 7px; text-align: left; height: 100%; }
.product-select:hover:not(:disabled) { background: rgba(0,128,128,.05); }
.product-select:disabled { opacity: .55; cursor: default; }
.product-picture { width: 100%; height: 110px; display: grid; place-items: center; background: rgba(0,128,128,.06); border-radius: 8px; }
.product-picture .v-image { width: 100%; }
.product-select strong { font-size: 13px; min-height: 36px; }
.product-select span { font-size: 12px; }
.product-code { opacity: .6; }
.low-stock { color: #d65b16; }
.add-label { color: teal; font-weight: 600; margin-top: auto; }
.remove-product { position: absolute; top: 4px; right: 4px; }
.dispatch-cart { border: 1px solid rgba(100,116,139,.2); border-radius: 12px; padding: 18px; position: sticky; top: 80px; }
.cart-heading { display: flex; justify-content: space-between; align-items: center; }
.cart-heading h2 { font-size: 17px; }
.cart-empty { font-size: 13px; opacity: .65; padding: 20px 0; }
.cart-line { padding: 14px 0; border-bottom: 1px solid rgba(100,116,139,.15); }
.cart-line strong { font-size: 12px; }
.cart-controls { display: flex; align-items: center; gap: 5px; margin-top: 6px; }
.cart-controls input { width: 60px; border: 1px solid #cbd5e1; border-radius: 5px; padding: 4px; text-align: center; color: inherit; }
.cart-controls span { font-size: 11px; flex: 1; }
.cart-total { font-size: 13px; font-weight: 600; padding: 18px 0; }
@media(max-width: 900px) { .dispatch-layout { grid-template-columns: 1fr; padding: 12px; } .dispatch-cart { position: static; } }
</style>
