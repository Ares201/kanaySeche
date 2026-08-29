<template>
  <div class="app-shell">
    <header class="toolbar">
      <button class="menu-button" type="button" aria-label="Abrir menu de navegacion"
        :aria-expanded="isOpen ? 'true' : 'false'" @click="toggleMenu">
        <span />
        <span />
        <span />
      </button>
      <NuxtLink style="text-decoration: none;" to="/" @click.native="closeMenu">
        <div class="brand">
          Gestion Documentaria
        </div>
      </NuxtLink>
      <div class="user-area">
        <span class="company-name d-none d-sm-inline">{{ currentUserName }} · {{ currentRole }}</span>
        <v-menu v-model="userMenuOpen" bottom left offset-y origin="top right" transition="scale-transition">
          <template v-slot:activator="{ on, attrs }">
            <div class="avatar-container ripple" v-bind="attrs" v-on="on" role="button" aria-label="Menú de usuario">
              <img src="/icono2.jpeg" alt="Mascota de Kanay - Seche" class="avatar-image" />
            </div>
          </template>

          <!-- CONTENIDO DEL MENÚ -->
          <v-list class="user-menu-list">
            <v-subheader class="d-sm-none">Kanay - Seche</v-subheader>

            <!-- Acción: Modo Oscuro (Mover aquí) -->
            <v-list-item @click="toggleDarkMode">
              <v-list-item-icon>
                <v-icon>
                  {{
                    isDarkMode
                      ? 'mdi-white-balance-sunny'
                      : 'mdi-weather-night'
                  }}
                </v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>
                  {{ isDarkMode ? 'Activar Modo Claro' : 'Activar Modo Oscuro' }}
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>

            <v-divider></v-divider>

            <!-- Acción: Cerrar Sesión (Ejemplo) -->
            <v-list-item @click="logout">
              <v-list-item-icon>
                <v-icon>mdi-logout</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Cerrar Sesión</v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </header>

    <!-- =========================
          BACKDROP (Fondo oscuro al abrir sidebar)
         ========================= -->
    <div v-if="isOpen && !menuFijado" class="backdrop" @click="closeMenu" />

    <!-- =========================
          SIDEBAR (Menú de Navegación)
         ========================= -->
    <aside class="sidebar" :class="{
      'sidebar--open': isOpen,
      'sidebar--fixed': menuFijado
    }" aria-label="Menu principal">

      <!-- =========================
            HEADER SIDEBAR (Limpio)
            ========================= -->
      <div class="sidebar-header">
        <!-- Título para el sidebar cuando está abierto -->
        <strong>Navegación</strong>

        <div class="sidebar-actions">
          <!-- BOTON FIJAR -->
          <button type="button" class="pin-button" :class="{
            'pin-button--active': menuFijado
          }" :aria-label="menuFijado
            ? 'Desfijar menu'
            : 'Fijar menu'
            " :title="menuFijado
              ? 'Desfijar menu'
              : 'Fijar menu'
              " @click="toggleMenuFijado">
            <v-icon small>
              {{
                menuFijado
                  ? 'mdi-pin'
                  : 'mdi-pin-outline'
              }}
            </v-icon>
          </button>

          <!-- BOTON CERRAR -->
          <button v-if="!menuFijado" type="button" class="close-button" aria-label="Cerrar menu" @click="closeMenu">
            <v-icon small>mdi-close</v-icon>
          </button>
        </div>
      </div>

      <!-- =========================
            NAVEGACION (Contenido)
            ========================= -->
      <nav class="nav">
        <!-- ... (resto de tus enlaces de navegación sin cambios) ... -->

        <!-- INICIO -->
        <NuxtLink v-if="can('/')" class="nav-link" to="/" @click.native="closeMenu">
          <span>Inicio</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" class="nav-icon">
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5 9.5V21h14V9.5" />
            <path d="M9 21v-6h6v6" />
          </svg>
        </NuxtLink>

        <!-- PLANIFICACION -->
        <button v-if="hasAccess(['/planificacion/agendamientos'])" class="module-button module-button--spaced" type="button" @click="togglePlanificacion">
          <span>Planificacion</span>
          <span class="chevron" :class="{ 'chevron--open': planificacionOpen }">›</span>
        </button>
        <div v-if="hasAccess(['/planificacion/agendamientos'])" v-show="planificacionOpen" class="submenu">
          <NuxtLink v-if="can('/planificacion/agendamientos')" class="nav-link" to="/planificacion/agendamientos" @click.native="closeMenu">Agendamientos
          </NuxtLink>
        </div>

        <!-- OPERACIONES -->
        <button v-if="hasAccess(operacionesRoutes)" class="module-button" type="button" @click="toggleOperaciones">
          <span>Operaciones</span>
          <span class="chevron" :class="{ 'chevron--open': operacionesOpen }">›</span>
        </button>
        <div v-if="hasAccess(operacionesRoutes)" v-show="operacionesOpen" class="submenu">
          <NuxtLink v-if="can('/operaciones/graficos')" class="nav-link" to="/operaciones/graficos" @click.native="closeMenu">
            <i class="fas fa-chart-bar"></i>
            Gráficos
          </NuxtLink>
          <NuxtLink v-if="can('/operaciones/pedidos-venta')" class="nav-link" to="/operaciones/pedidos-venta" @click.native="closeMenu">Pedido de venta
          </NuxtLink>
          <NuxtLink v-if="can('/operaciones/recepcion-cisterna')" class="nav-link" to="/operaciones/recepcion-cisterna" @click.native="closeMenu">Recepcion de
            cisternas
          </NuxtLink>
        </div>

        <!-- CONTROL Y ACEPTACION -->
        <button v-if="hasAccess(controlAceptacionRoutes)" class="module-button" type="button" @click="toggleControlAceptacion">
          <span>Control y Aceptación</span>
          <span class="chevron" :class="{ 'chevron--open': controlAceptacionOpen }">›</span>
        </button>
        <div v-if="hasAccess(controlAceptacionRoutes)" v-show="controlAceptacionOpen" class="submenu">
          <NuxtLink v-if="can('/control-aceptacion/graficos')" class="nav-link" to="/control-aceptacion/graficos" @click.native="closeMenu">Gráficos</NuxtLink>
        </div>

        <!-- DOCUMENTOS -->
        <button v-if="hasAccess(documentosRoutes)" class="module-button" type="button" @click="toggleDocumentos">
          <span>Documentos</span>
          <span class="chevron" :class="{ 'chevron--open': documentosOpen }">›</span>
        </button>
        <div v-if="hasAccess(documentosRoutes)" v-show="documentosOpen" class="submenu">
          <NuxtLink v-if="can('/documentos/graficos')" class="nav-link" to="/documentos/graficos" @click.native="closeMenu">
            <i class="fas fa-chart-pie"></i>
            Gráficos
          </NuxtLink>
          <NuxtLink v-if="can('/documentos/expedientes')" class="nav-link" to="/documentos/expedientes" @click.native="closeMenu">Expedientes</NuxtLink>
          <NuxtLink v-if="can('/documentos/cartas')" class="nav-link" to="/documentos/cartas" @click.native="closeMenu">Cartas</NuxtLink>
          <NuxtLink v-if="can('/documentos/firmar-pdf')" class="nav-link" to="/documentos/firmar-pdf" @click.native="closeMenu">Firmar PDF</NuxtLink>
          <NuxtLink v-if="can('/documentos/boletas')" class="nav-link" to="/documentos/boletas" @click.native="closeMenu">Boletas</NuxtLink>
          <NuxtLink v-if="can('/documentos/validaciones')" class="nav-link" to="/documentos/validaciones" @click.native="closeMenu">Validaciones</NuxtLink>
        </div>

        <!-- CONFIGURACION -->
        <button v-if="hasAccess(configuracionRoutes)" class="module-button" type="button" @click="toggleConfiguracion">
          <span>Configuracion</span>
          <span class="chevron" :class="{ 'chevron--open': configuracionOpen }">›</span>
        </button>
        <div v-if="hasAccess(configuracionRoutes)" v-show="configuracionOpen" class="submenu">
          <NuxtLink v-if="can('/configuracion/envases')" class="nav-link" to="/configuracion/envases" @click.native="closeMenu">Envases</NuxtLink>
          <NuxtLink v-if="can('/configuracion/residuos')" class="nav-link" to="/configuracion/residuos" @click.native="closeMenu">Residuos</NuxtLink>
          <NuxtLink v-if="can('/configuracion/clientes')" class="nav-link" to="/configuracion/clientes" @click.native="closeMenu">Clientes</NuxtLink>
          <NuxtLink v-if="can('/configuracion/productos')" class="nav-link" to="/configuracion/productos" @click.native="closeMenu">Productos</NuxtLink>
          <NuxtLink v-if="can('/configuracion/generador')" class="nav-link" to="/configuracion/generador" @click.native="closeMenu">Generadores</NuxtLink>
          <NuxtLink v-if="can('/configuracion/personal')" class="nav-link" to="/configuracion/personal" @click.native="closeMenu">Personal</NuxtLink>
          <NuxtLink v-if="can('/configuracion/roles')" class="nav-link" to="/configuracion/roles" @click.native="closeMenu">Roles y permisos</NuxtLink>
          <NuxtLink v-if="can('/configuracion/vehiculos')" class="nav-link" to="/configuracion/vehiculos" @click.native="closeMenu">Vehiculos</NuxtLink>
        </div>
      </nav>
    </aside>
  </div>
</template>

<script>
export default {
  name: 'AppShell',

  data() {
    return {
      isOpen: false,
      menuFijado: false,
      userMenuOpen: false, // Estado del menú de usuario

      // Modulos Open
      planificacionOpen: true,
      operacionesOpen: true,
      controlAceptacionOpen: true,
      configuracionOpen: false,
      documentosOpen: true
    }
  },

  computed: {
    isDarkMode() {
      // Nota: Depende de Vuetify configurado.
      return this.$vuetify?.theme?.dark || false
    },
    currentUserName() { return this.$auth?.user?.nombres || 'Kanay - Seche' },
    currentRole() { return this.$auth?.user?.rolNombre || '' },
    operacionesRoutes() { return ['/operaciones/graficos', '/operaciones/pedidos-venta', '/operaciones/recepcion-cisterna'] },
    controlAceptacionRoutes() { return ['/control-aceptacion/graficos'] },
    documentosRoutes() { return ['/documentos/graficos', '/documentos/expedientes', '/documentos/cartas', '/documentos/firmar-pdf', '/documentos/boletas', '/documentos/validaciones'] },
    configuracionRoutes() { return ['/configuracion/envases', '/configuracion/residuos', '/configuracion/clientes', '/configuracion/productos', '/configuracion/generador', '/configuracion/personal', '/configuracion/roles', '/configuracion/vehiculos'] }
  },

  mounted() {
    const menuFijado = localStorage.getItem('menuFijado')
    if (menuFijado === 'true') {
      this.menuFijado = true
      this.isOpen = true
    }
  },

  methods: {
    toggleMenu() {
      this.isOpen = !this.isOpen
    },

    closeMenu() {
      if (!this.menuFijado) {
        this.isOpen = false
      }
    },

    toggleMenuFijado() {
      this.menuFijado = !this.menuFijado
      localStorage.setItem('menuFijado', this.menuFijado.toString())
      if (this.menuFijado) {
        this.isOpen = true
      }
    },

    toggleDarkMode() {
      if (this.$vuetify?.theme) {
        this.$vuetify.theme.dark = !this.$vuetify.theme.dark
      }
    },

    logout() {
      this.userMenuOpen = false
      this.$auth.logout()
    },

    can(route) { return this.$auth?.can(route) || false },
    hasAccess(routes) { return routes.some(route => this.can(route)) },

    // Toggles módulos
    togglePlanificacion() { this.planificacionOpen = !this.planificacionOpen },
    toggleOperaciones() { this.operacionesOpen = !this.operacionesOpen },
    toggleControlAceptacion() { this.controlAceptacionOpen = !this.controlAceptacionOpen },
    toggleConfiguracion() { this.configuracionOpen = !this.configuracionOpen },
    toggleDocumentos() { this.documentosOpen = !this.documentosOpen }
  }
}
</script>

<style scoped>
/* =========================
   VARIABLES Mock (Asegúrate de tenerlas globales)
   ========================= */
:root {
  --color-primary: #004b7a;
  --color-primary-dark: #003a5e;
  --color-secondary: #f48120;
  --color-text: #333333;
  --color-muted: #666666;
}

/* =========================
   TOOLBAR
   ========================= */

.toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 20px;
  color: #ffffff;
  background: var(--color-primary);
  box-shadow: 0 2px 8px rgba(0, 63, 104, 0.18);
}

.brand {
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
  text-decoration: none;
  margin-left: 12px;
}

/* ÁREA DE USUARIO (Nuevo contenedor a la derecha) */
.user-area {
  margin-left: auto;
  /* Empuja todo a la derecha */
  display: flex;
  align-items: center;
  gap: 15px;
}

.company-name {
  font-size: 14px;
  opacity: 0.85;
  font-weight: 500;
}

.avatar-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar-container:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Efecto Ripple simple */
.ripple {
  position: relative;
  overflow: hidden;
}

/* Estilos para el menú de Vuetify */
.user-menu-list {
  min-width: 200px;
}

/* =========================
   BOTONES
   ========================= */
.menu-button,
.close-button,
.pin-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
}

.menu-button {
  flex-direction: column;
  gap: 5px;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  transition: background 0.2s ease;
}

.menu-button:hover {
  background: rgba(255, 255, 255, 0.18);
}

.menu-button span {
  width: 20px;
  height: 2px;
  border-radius: 99px;
  background: #ffffff;
}

/* =========================
   SIDEBAR
   ========================= */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  width: min(300px, 85vw);
  height: 100vh;
  color: var(--color-text);
  background: #ffffff;
  box-shadow: 18px 0 40px rgba(15, 23, 42, 0.2);
  transform: translateX(-105%);
  transition: transform 0.25s ease-out;
}

.sidebar--open,
.sidebar--fixed {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 16px;
  color: #ffffff;
  background: var(--color-primary);
  border-bottom: 1px solid var(--color-primary-dark);
}

.sidebar-header strong {
  font-size: 16px;
  font-weight: 600;
}

.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Botones Sidebar */
.pin-button,
.close-button {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--color-primary);
  background: #ffffff;
  transition: all 0.2s ease;
}

.pin-button:hover,
.close-button:hover,
.pin-button--active {
  color: #ffffff;
  background: var(--color-secondary);
}

/* =========================
   NAVEGACION CONTENT
   ========================= */
.nav {
  padding: 12px;
}

.module-button,
.nav-link {
  width: 100%;
  min-height: 40px;
  border-radius: 6px;
  font: inherit;
  margin-bottom: 2px;
}

.module-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  padding: 0 10px;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 14px;
  background: #f1f6f9;
  cursor: pointer;
  transition: all 0.15s ease;
}

.module-button:hover {
  color: #ffffff;
  background: var(--color-primary);
}

.module-button--spaced {
  margin-top: 8px;
}

.chevron {
  display: inline-block;
  font-size: 18px;
  transition: transform 0.2s ease;
}

.chevron--open {
  transform: rotate(90deg);
}

.submenu {
  margin-top: 4px;
  padding-left: 8px;
  margin-bottom: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: var(--color-muted);
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: var(--color-primary);
  background: #f0f6fa;
}

.nav-icon {
  width: 16px;
  height: 16px;
  margin-left: auto;
  fill: none;
  stroke: var(--color-muted);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-link:hover .nav-icon {
  stroke: var(--color-primary);
}

.nav-link.nuxt-link-active {
  color: var(--color-primary);
  font-weight: 600;
  background: #EAF3F8;
  border-left: 3px solid var(--color-secondary);
}

/* =========================
   BACKDROP & RESPONSIVE
   ========================= */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(15, 23, 42, 0.5);
}

@media (max-width: 640px) {
  .brand {
    font-size: 18px;
    margin-left: 8px;
  }

  .sidebar--fixed {
    transform: translateX(-105%);
  }

  .sidebar--fixed.sidebar--open {
    transform: translateX(0);
  }
}
</style>
