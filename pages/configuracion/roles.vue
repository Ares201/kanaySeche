<template>
  <section class="admin-page unified-list-page">
    <div class="page-header">
      <div><p class="eyebrow">Administración</p><h1>Roles y permisos</h1></div>
      <v-btn color="primary" @click="openRole()">Nuevo rol</v-btn>
    </div>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab>Roles</v-tab><v-tab>Páginas y módulos</v-tab>
    </v-tabs>

    <v-tabs-items v-model="tab">
      <v-tab-item>
        <v-data-table :headers="roleHeaders" :items="roles" :loading="loading" item-key="id"
          no-data-text="No hay roles" :footer-props="{ itemsPerPageText: 'Filas por página' }">
          <template #[`item.estado`]="{ item }"><v-chip small :color="item.estado !== false ? 'success' : 'error'" dark>{{ item.estado !== false ? 'Activo' : 'Inactivo' }}</v-chip></template>
          <template #[`item.actions`]="{ item }">
            <v-btn icon title="Editar" @click="openRole(item)"><v-icon>mdi-pencil</v-icon></v-btn>
            <v-btn icon title="Configurar permisos" @click="openPermissions(item)"><v-icon>mdi-shield-key</v-icon></v-btn>
            <v-btn icon :title="item.estado !== false ? 'Desactivar' : 'Activar'" @click="toggleRole(item)"><v-icon>{{ item.estado !== false ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off' }}</v-icon></v-btn>
          </template>
        </v-data-table>
      </v-tab-item>

      <v-tab-item>
        <div class="page-actions"><v-btn outlined color="primary" @click="openPage()">Registrar página</v-btn><v-btn text @click="seedPages">Sincronizar páginas del sistema</v-btn></div>
        <v-data-table :headers="pageHeaders" :items="pages" :loading="loading" item-key="id"
          no-data-text="No hay páginas registradas" :footer-props="{ itemsPerPageText: 'Filas por página' }">
          <template #[`item.estado`]="{ item }"><v-chip small :color="item.estado !== false ? 'success' : 'error'" dark>{{ item.estado !== false ? 'Activa' : 'Inactiva' }}</v-chip></template>
          <template #[`item.actions`]="{ item }"><v-btn icon @click="openPage(item)"><v-icon>mdi-pencil</v-icon></v-btn></template>
        </v-data-table>
      </v-tab-item>
    </v-tabs-items>

    <v-dialog v-model="roleDialog" max-width="520">
      <v-card><v-card-title>{{ roleForm.id ? 'Editar rol' : 'Nuevo rol' }}</v-card-title><v-card-text>
        <v-text-field v-model.trim="roleForm.nombre" label="Nombre" outlined required />
        <v-switch v-model="roleForm.estado" label="Rol activo" />
      </v-card-text><v-card-actions><v-spacer/><v-btn text @click="roleDialog=false">Cancelar</v-btn><v-btn color="primary" @click="saveRole">Guardar</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-dialog v-model="permissionDialog" max-width="680">
      <v-card><v-card-title>Permisos: {{ selectedRole?.nombre }}</v-card-title><v-card-text>
        <v-alert v-if="selectedRole?.nombre === adminRole" type="info" dense>El Administrador siempre tiene acceso completo.</v-alert>
        <div v-else class="permission-list">
          <v-checkbox v-for="page in activePages" :key="page.id" v-model="selectedPageIds" :value="page.id"
            :label="`${page.modulo || 'General'} · ${page.nombre} (${page.ruta})`" hide-details />
        </div>
      </v-card-text><v-card-actions><v-spacer/><v-btn text @click="permissionDialog=false">Cancelar</v-btn><v-btn v-if="selectedRole?.nombre !== adminRole" color="primary" @click="savePermissions">Guardar permisos</v-btn></v-card-actions></v-card>
    </v-dialog>

    <v-dialog v-model="pageDialog" max-width="560">
      <v-card><v-card-title>{{ pageForm.id ? 'Editar página' : 'Registrar página' }}</v-card-title><v-card-text>
        <v-text-field v-model.trim="pageForm.nombre" label="Nombre" outlined />
        <v-text-field v-model.trim="pageForm.ruta" label="Ruta/URL" placeholder="/modulo/pagina" outlined />
        <v-text-field v-model.trim="pageForm.modulo" label="Módulo" outlined />
        <v-textarea v-model.trim="pageForm.descripcion" label="Descripción" outlined rows="2" />
        <v-switch v-model="pageForm.estado" label="Página activa" />
      </v-card-text><v-card-actions><v-spacer/><v-btn text @click="pageDialog=false">Cancelar</v-btn><v-btn color="primary" @click="savePage">Guardar</v-btn></v-card-actions></v-card>
    </v-dialog>
  </section>
</template>

<script>
import { ADMIN_ROLE, SYSTEM_PAGES } from '~/utils/access-control'

export default {
  data: () => ({
    adminRole: ADMIN_ROLE, tab: 0, loading: false, roles: [], pages: [], relations: [],
    roleDialog: false, permissionDialog: false, pageDialog: false, selectedRole: null, selectedPageIds: [],
    roleForm: { id: null, nombre: '', estado: true },
    pageForm: { id: null, nombre: '', ruta: '', modulo: '', descripcion: '', estado: true },
    roleHeaders: [
      { text: 'Nombre', value: 'nombre' }, { text: 'Estado', value: 'estado' },
      { text: 'Fecha de creación', value: 'fechaCreacion' }, { text: 'Acciones', value: 'actions', sortable: false }
    ],
    pageHeaders: [
      { text: 'Nombre', value: 'nombre' }, { text: 'Módulo', value: 'modulo' }, { text: 'Ruta', value: 'ruta' },
      { text: 'Estado', value: 'estado' }, { text: 'Acciones', value: 'actions', sortable: false }
    ]
  }),
  computed: { activePages() { return this.pages.filter(page => page.estado !== false) } },
  mounted() { this.loadData() },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [roles, pages, relations] = await Promise.all([
          this.$firebaseApi.list('roles'), this.$firebaseApi.list('paginas'), this.$firebaseApi.list('rolPaginas')
        ])
        this.roles = roles; this.pages = pages; this.relations = relations
      } finally { this.loading = false }
    },
    openRole(role) { this.roleForm = role ? { id: role.id, nombre: role.nombre, estado: role.estado !== false } : { id: null, nombre: '', estado: true }; this.roleDialog = true },
    async saveRole() {
      if (!this.roleForm.nombre) return alert('Ingresa el nombre del rol.')
      const payload = { nombre: this.roleForm.nombre, estado: this.roleForm.estado }
      if (this.roleForm.id) await this.$firebaseApi.update('roles', this.roleForm.id, payload)
      else await this.$firebaseApi.create('roles', payload)
      this.roleDialog = false; await this.loadData()
    },
    async toggleRole(role) {
      if (role.nombre === ADMIN_ROLE && role.estado !== false) return alert('No se puede desactivar el rol Administrador.')
      await this.$firebaseApi.update('roles', role.id, { estado: role.estado === false }); await this.loadData()
    },
    openPermissions(role) {
      this.selectedRole = role
      this.selectedPageIds = this.relations.filter(item => item.rolId === role.id).map(item => item.paginaId)
      this.permissionDialog = true
    },
    async savePermissions() {
      const current = this.relations.filter(item => item.rolId === this.selectedRole.id)
      await Promise.all(current.filter(item => !this.selectedPageIds.includes(item.paginaId)).map(item => this.$firebaseApi.remove('rolPaginas', item.id)))
      const currentIds = current.map(item => item.paginaId)
      await Promise.all(this.selectedPageIds.filter(id => !currentIds.includes(id)).map(paginaId => this.$firebaseApi.create('rolPaginas', { rolId: this.selectedRole.id, paginaId })))
      this.permissionDialog = false; await this.loadData()
    },
    openPage(page) { this.pageForm = page ? { ...page } : { id: null, nombre: '', ruta: '', modulo: '', descripcion: '', estado: true }; this.pageDialog = true },
    async savePage() {
      if (!this.pageForm.nombre || !this.pageForm.ruta.startsWith('/')) return alert('Completa el nombre y una ruta válida.')
      const { id, ...payload } = this.pageForm
      if (id) await this.$firebaseApi.update('paginas', id, payload); else await this.$firebaseApi.create('paginas', payload)
      this.pageDialog = false; await this.loadData()
    },
    async seedPages() {
      for (const page of SYSTEM_PAGES) if (!this.pages.some(item => item.ruta === page.ruta)) await this.$firebaseApi.create('paginas', { ...page, estado: true })
      await this.loadData()
    }
  }
}
</script>

<style scoped>
.admin-page{width:92%;margin:0 auto;padding:32px 0}.page-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.eyebrow{margin:0;color:#0f766e;font-weight:700;text-transform:uppercase;font-size:13px}h1{margin:4px 0 0}.page-actions{display:flex;gap:10px;padding:16px;background:white}.permission-list{max-height:430px;overflow:auto}
</style>
