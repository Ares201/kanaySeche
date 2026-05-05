<template>
  <div class="app-shell">
    <header class="toolbar">
      <button
        class="menu-button"
        type="button"
        aria-label="Abrir menu de navegacion"
        :aria-expanded="isOpen ? 'true' : 'false'"
        @click="toggleMenu"
      >
        <span />
        <span />
        <span />
      </button>

      <NuxtLink style="text-decoration: none;" to="/" @click.native="closeMenu">
        <div class="brand">
          Kanay Seche
        </div>
      </NuxtLink>
    </header>

    <div v-if="isOpen" class="backdrop" @click="closeMenu" />

    <aside class="sidebar" :class="{ 'sidebar--open': isOpen }" aria-label="Menu principal">
      <div class="sidebar-header">
        <strong>Modulos</strong>
        <button type="button" class="close-button" aria-label="Cerrar menu" @click="closeMenu">
          x
        </button>
      </div>

      <nav class="nav">
        <button class="module-button" type="button" @click="toggleConfiguracion">
          <span>Configuracion</span>
          <span class="chevron" :class="{ 'chevron--open': configuracionOpen }">›</span>
        </button>

        <div v-show="configuracionOpen" class="submenu">
          <NuxtLink class="nav-link" to="/configuracion/envases" @click.native="closeMenu">
            Envases
          </NuxtLink>
          <NuxtLink class="nav-link" to="/configuracion/residuos" @click.native="closeMenu">
            Residuos
          </NuxtLink>
        </div>
      </nav>
    </aside>
  </div>
</template>

<script>
export default {
  name: 'Toolbar',
  data () {
    return {
      isOpen: false,
      configuracionOpen: true
    }
  },
  methods: {
    toggleMenu () {
      this.isOpen = !this.isOpen
    },
    closeMenu () {
      this.isOpen = false
    },
    toggleConfiguracion () {
      this.configuracionOpen = !this.configuracionOpen
    }
  }
}
</script>

<style scoped>
.toolbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 64px;
  padding: 0 24px;
  color: #f8fafc;
  background: #6eb49c;
}

.menu-button,
.close-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  cursor: pointer;
}

.menu-button {
  flex-direction: column;
  gap: 5px;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.12);
}

.menu-button span {
  width: 21px;
  height: 2px;
  border-radius: 99px;
  background: #ffffff;
}

.brand {
  color: #ffffff;
  font-size: 24px;
  text-decoration: none;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(15, 23, 42, 0.38);
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  width: min(320px, 88vw);
  height: 100vh;
  color: #17352c;
  background: #ffffff;
  box-shadow: 18px 0 40px rgba(15, 23, 42, 0.22);
  transform: translateX(-105%);
  transition: transform 0.22s ease;
}

.sidebar--open {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 0 20px;
  border-bottom: 1px solid #e2e8f0;
}

.close-button {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  color: #475569;
  font-size: 18px;
  background: #f1f5f9;
}

.nav {
  padding: 16px;
}

.module-button,
.nav-link {
  width: 100%;
  min-height: 44px;
  border-radius: 8px;
  font: inherit;
}

.module-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 0;
  padding: 0 12px;
  color: #17352c;
  font-weight: 700;
  background: #ecfdf3;
  cursor: pointer;
}

.chevron {
  display: inline-block;
  font-size: 24px;
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

.chevron--open {
  transform: rotate(90deg);
}

.submenu {
  margin-top: 8px;
  padding-left: 10px;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: #334155;
  text-decoration: none;
}

.nav-link:hover,
.nuxt-link-active {
  color: #000000;
}

@media (max-width: 640px) {
  .toolbar {
    padding: 0 16px;
  }
}
</style>
