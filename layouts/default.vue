
<template>
  <v-app class="layout">
    <!--
      La sesión se obtiene de localStorage mediante auth.client.js. Por eso el
      servidor no puede generar el mismo menú que el navegador. ClientOnly
      evita que Vue intente hidratar dos árboles de navegación diferentes.
    -->
    <ClientOnly>
      <Toolbar />
      <template #placeholder>
        <div class="toolbar-placeholder" aria-hidden="true" />
      </template>
    </ClientOnly>
    <main class="page">
      <Nuxt />
    </main>
  </v-app>
</template>

<script>
export default {
  name: 'DefaultLayout'
}
</script>

<style>
html {
  font-family: Arial, Helvetica, sans-serif;
  color: #0f172a;
  background: #f8fafc;
}

body {
  margin: 0;
}

* {
  box-sizing: border-box;
}

.page {
  min-height: calc(100vh - 64px);
}

.toolbar-placeholder {
  height: 64px;
  background: #004b7a;
}
</style>
