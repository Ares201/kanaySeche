<template>
  <v-app class="layout">
    <Toolbar />
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
</style>
