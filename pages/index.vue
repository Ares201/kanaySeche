<template>
  <section class="home-page" :style="backgroundStyle">
    <div class="background-overlay" />

    <div class="welcome-card">
      <span class="welcome-eyebrow">Ecocentro Chilca</span>
      <h1>Bienvenido, {{ userName }}</h1>
      <p>{{ userRole }}</p>
    </div>

    <aside class="background-sidebar" aria-label="Seleccionar imagen de fondo">
      <span class="sidebar-title">Fondos</span>
      <button v-for="(background, index) in backgrounds" :key="background.url" type="button"
        class="background-option" :class="{ 'background-option--active': selectedBackground === index }"
        :title="`Usar fondo ${index + 1}`" :aria-label="`Usar fondo ${index + 1}`"
        @click="selectBackground(index)">
        <img :src="background.url" :alt="background.alt">
      </button>
    </aside>
  </section>
</template>

<script>
const BACKGROUND_STORAGE_KEY = 'kanay_home_background'

export default {
  name: 'IndexPage',
  data: () => ({
    selectedBackground: 0,
    backgrounds: [
      {
        url: 'https://s1.significados.com/foto/medio-ambiente-og.jpg',
        alt: 'Paisaje relacionado con el medio ambiente',
        link: ''
      },
      {
        url: 'https://i.pinimg.com/736x/40/39/9f/40399fc2591c573519bb517e58a10792.jpg',
        alt: 'Imagen ambiental',
        link: ''
      },
      {
        url: 'https://i.pinimg.com/1200x/d8/f9/38/d8f9383f9febdd2e80fedc2dd39d1297.jpg',
        alt: 'Imagen de naturaleza',
        link: ''
      }
    ]
  }),
  computed: {
    userName() {
      return this.$auth?.state?.session?.nombres || 'Usuario'
    },
    userRole() {
      return this.$auth?.state?.session?.rolNombre || ''
    },
    backgroundStyle() {
      const background = this.backgrounds[this.selectedBackground] || this.backgrounds[0]
      return { backgroundImage: `url("${background.url}")` }
    }
  },
  mounted() {
    const savedBackground = Number(localStorage.getItem(BACKGROUND_STORAGE_KEY))
    if (Number.isInteger(savedBackground) && this.backgrounds[savedBackground]) {
      this.selectedBackground = savedBackground
    }
  },
  methods: {
    selectBackground(index) {
      this.selectedBackground = index
      localStorage.setItem(BACKGROUND_STORAGE_KEY, String(index))
    }
  }
}
</script>

<style scoped>
.home-page {
  position: relative;
  min-height: calc(100vh - 64px);
  padding: clamp(28px, 6vw, 80px);
  overflow: hidden;
  background-color: #173c3b;
  background-position: center;
  background-size: cover;
  transition: background-image .45s ease-in-out;
}

.background-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, rgba(5, 28, 32, .78) 0%, rgba(5, 28, 32, .4) 48%, rgba(5, 28, 32, .18) 100%);
}

.welcome-card {
  position: relative;
  z-index: 1;
  width: min(590px, calc(100% - 110px));
  margin-top: clamp(60px, 13vh, 150px);
  padding: clamp(28px, 4vw, 52px);
  border: 1px solid rgba(255, 255, 255, .26);
  border-radius: 20px;
  color: white;
  background: rgba(5, 36, 42, .36);
  box-shadow: 0 24px 70px rgba(0, 0, 0, .24);
  backdrop-filter: blur(12px);
}

.welcome-eyebrow {
  display: block;
  margin-bottom: 12px;
  color: #b8efe1;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 64px);
  line-height: 1.05;
  letter-spacing: -.04em;
  text-shadow: 0 3px 18px rgba(0, 0, 0, .22);
}

.welcome-card p {
  margin: 16px 0 0;
  color: rgba(255, 255, 255, .82);
  font-size: 17px;
}

.background-sidebar {
  position: absolute;
  z-index: 2;
  top: 50%;
  right: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border: 1px solid rgba(255, 255, 255, .25);
  border-radius: 18px;
  background: rgba(7, 31, 37, .48);
  box-shadow: 0 18px 45px rgba(0, 0, 0, .2);
  backdrop-filter: blur(12px);
  transform: translateY(-50%);
}

.sidebar-title {
  color: rgba(255, 255, 255, .76);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.background-option {
  width: 68px;
  height: 54px;
  padding: 3px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 11px;
  background: rgba(255, 255, 255, .14);
  cursor: pointer;
  transition: transform .2s, border-color .2s, box-shadow .2s;
}

.background-option:hover { transform: translateX(-3px); }
.background-option--active { border-color: #a7f3d0; box-shadow: 0 0 0 3px rgba(167, 243, 208, .2); }
.background-option img { width: 100%; height: 100%; border-radius: 7px; object-fit: cover; }

@media (max-width: 640px) {
  .home-page { min-height: calc(100vh - 64px); padding: 24px; }
  .welcome-card { width: 100%; margin-top: 50px; }
  .background-sidebar { top: auto; right: 50%; bottom: 22px; flex-direction: row; transform: translateX(50%); }
  .sidebar-title { display: none; }
  .background-option { width: 58px; height: 46px; }
}
</style>
