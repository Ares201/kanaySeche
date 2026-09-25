<template>
  <v-menu v-if="$auth.isAuthenticated" bottom left offset-y :close-on-content-click="false" max-width="340" :z-index="1100">
    <template #activator="{ on, attrs }">
      <button type="button" class="presence-button" v-bind="attrs" v-on="on" :aria-label="label" title="Usuarios en línea">
        <v-icon small color="white">mdi-account-multiple-outline</v-icon>
        <span class="presence-dot" :class="{ 'presence-dot--online': connected }" />
        <span>{{ connected ? users.length : '—' }}</span>
      </button>
    </template>
    <v-card class="presence-card">
      <v-card-title class="subtitle-1 font-weight-bold">Usuarios en línea <v-spacer /><span class="text-caption">{{ connected ? users.length : '—' }}</span></v-card-title>
      <v-divider />
      <div role="status" aria-live="polite" class="presence-caption">{{ message }}</div>
      <v-list v-if="connected && users.length" class="presence-list" aria-label="Usuarios conectados">
        <v-list-item v-for="user in users" :key="user.id">
          <v-list-item-avatar color="#e8f3ed"><span class="presence-initials">{{ initials(user.nombres) }}</span></v-list-item-avatar>
          <v-list-item-content><v-list-item-title>{{ user.nombres }}<span v-if="user.id === $auth.user.id" class="text-caption"> (Tú)</span></v-list-item-title></v-list-item-content>
          <span class="presence-dot presence-dot--online" aria-label="En línea" />
        </v-list-item>
      </v-list>
      <v-card-actions v-if="status === 'unavailable'"><v-btn text small color="primary" @click="$presence.retry()">Reintentar</v-btn></v-card-actions>
    </v-card>
  </v-menu>
</template>

<script>
export default {
  computed: {
    status() { return this.$presence.state.status },
    users() { return this.$presence.state.users },
    connected() { return this.status === 'connected' },
    label() { return this.connected ? `Usuarios en línea: ${this.users.length}` : 'Usuarios en línea: sin conexión' },
    message() {
      if (this.connected) return this.users.length ? 'Conectados en este momento' : 'No hay usuarios en línea.'
      if (this.status === 'connecting') return 'Conectando…'
      if (this.status === 'auth-required') return 'Vuelve a iniciar sesión para ver quién está en línea.'
      return 'La lista de usuarios no está disponible por el momento.'
    }
  },
  methods: {
    initials(name) { return String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() }
  }
}
</script>

<style scoped>
.presence-button { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 10px; border-radius: 20px; color: white; background: rgba(255,255,255,.12); white-space: nowrap; }
.presence-button:focus-visible { outline: 2px solid white; outline-offset: 3px; }
.presence-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #94a3b8; flex-shrink: 0; }
.presence-dot--online { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,.12); }
.presence-card { width: min(340px, calc(100vw - 24px)); }
.presence-caption { padding: 14px 16px 8px; font-size: 13px; opacity: .75; }
.presence-list { max-height: min(400px, 60vh); overflow-y: auto; }
.presence-initials { color: #166534; font-size: 14px; font-weight: 600; }
</style>
