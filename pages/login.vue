<template>
  <section class="login-page">
    <div class="login-overlay" />
    <div class="login-panel">
      <form class="login-card" @submit.prevent="submit">
        <div class="login-brand">
          <span class="brand-mark">KS</span>
          <div><strong>Kanay · Séché</strong><small>Gestión Documentaria</small></div>
        </div>
        <div class="login-heading">
          <span class="eyebrow">Ecocentro Chilca</span>
          <h1>{{ bootstrap ? 'Crear administrador' : 'Bienvenido' }}</h1>
          <p>{{ bootstrap ? 'Configura la primera cuenta administradora.' : 'Ingresa con tu cuenta para continuar.' }}</p>
        </div>
        <label v-if="bootstrap">Nombres completos<input v-model.trim="nombres" type="text" required></label>
        <label>Correo electrónico<input v-model.trim="correo" type="email" autocomplete="username" placeholder="nombre@empresa.com" required></label>
        <label>Contraseña<input v-model="password" type="password" autocomplete="current-password" placeholder="Ingresa tu contraseña" required></label>
        <v-alert v-if="error" dense outlined type="error">{{ error }}</v-alert>
        <button class="primary-button" type="submit" :disabled="loading">
          {{ loading ? 'Procesando...' : bootstrap ? 'Crear administrador' : 'Iniciar sesión' }}
        </button>
        <span class="login-footer">Sistema interno · Ecocentro Chilca</span>
      </form>
    </div>
  </section>
</template>

<script>
export default {
  layout: 'public',
  data: () => ({ nombres: '', correo: '', password: '', error: '', loading: false, bootstrap: false }),
  async mounted() {
    if (this.$auth.isAuthenticated) this.$router.replace('/')
    else this.bootstrap = await this.$auth.canBootstrap()
  },
  methods: {
    async submit() {
      this.loading = true
      this.error = ''
      try {
        if (this.bootstrap) {
          await this.$auth.createInitialAdmin({ nombres: this.nombres, correo: this.correo, password: this.password })
        } else {
          await this.$auth.login(this.correo, this.password)
        }
        this.$router.replace('/')
      } catch (error) {
        this.error = error.message || 'No se pudo iniciar sesión.'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.login-page { position: relative; min-height: 100vh; overflow: hidden; background: #19303d url('/ecocentroChilca.png') center center / cover no-repeat; }
.login-overlay { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(4, 25, 38, .64) 0%, rgba(4, 25, 38, .27) 48%, rgba(4, 25, 38, .08) 100%); }
.login-panel { position: relative; z-index: 1; display: flex; align-items: center; width: min(620px, 46vw); min-height: 100vh; padding: 48px clamp(28px, 5vw, 76px); background: rgba(247, 250, 252, .94); box-shadow: 20px 0 70px rgba(3, 19, 30, .28); backdrop-filter: blur(10px); }
.login-card { width: min(420px, 100%); margin: 0 auto; }
.login-brand { display: flex; align-items: center; gap: 12px; margin-bottom: clamp(44px, 9vh, 90px); color: #123e55; }
.brand-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; color: #fff; background: linear-gradient(135deg, #006b75, #003f68); font-size: 15px; font-weight: 800; box-shadow: 0 8px 22px rgba(0, 75, 122, .22); }
.login-brand div { display: flex; flex-direction: column; }
.login-brand strong { font-size: 17px; letter-spacing: .01em; }
.login-brand small { margin-top: 2px; color: #72828d; font-size: 12px; }
.login-heading { margin-bottom: 28px; }
.eyebrow { display: block; margin-bottom: 8px; color: #04747b; font-size: 11px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
h1 { margin: 0 0 9px; color: #123e55; font-size: clamp(32px, 3vw, 44px); line-height: 1.08; letter-spacing: -.035em; }
p { margin: 0; color: #6b7d88; line-height: 1.55; }
label { display: flex; flex-direction: column; gap: 8px; margin-bottom: 17px; color: #324d5b; font-size: 13px; font-weight: 700; }
input { min-height: 48px; padding: 0 14px; border: 1px solid #cbd7dc; border-radius: 9px; color: #183b4c; background: rgba(255,255,255,.86); outline: none; transition: border-color .2s, box-shadow .2s; }
input:focus { border-color: #087681; box-shadow: 0 0 0 3px rgba(8, 118, 129, .13); }
.primary-button { width: 100%; min-height: 49px; margin-top: 5px; border: 0; border-radius: 9px; color: white; background: linear-gradient(135deg, #006c76, #004b7a); font-weight: 800; cursor: pointer; box-shadow: 0 10px 24px rgba(0, 75, 122, .24); transition: transform .2s, box-shadow .2s; }
.primary-button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(0, 75, 122, .3); }
.primary-button:disabled { opacity: .65; }
.login-footer { display: block; margin-top: 26px; color: #8a989f; font-size: 11px; text-align: center; }

@media (max-width: 850px) {
  .login-page { background-position: 62% center; }
  .login-panel { width: min(540px, 82vw); padding: 36px 32px; }
  .login-brand { margin-bottom: 48px; }
}

@media (max-width: 600px) {
  .login-page { display: flex; align-items: flex-end; padding: 20px; background-position: 58% center; }
  .login-overlay { background: linear-gradient(180deg, rgba(4,25,38,.2), rgba(4,25,38,.62)); }
  .login-panel { width: 100%; min-height: auto; max-height: calc(100vh - 40px); overflow-y: auto; padding: 26px 22px; border-radius: 18px; background: rgba(255,255,255,.96); }
  .login-brand { margin-bottom: 30px; }
  h1 { font-size: 32px; }
}
</style>
