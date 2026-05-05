<template>
  <section class="home-page">
    <h1>AresDev</h1>
    <p>Usa el boton de menu para navegar.</p>
  </section>
</template>
<script>
export default {
  name: 'IndexPage'
}
</script>

<style scoped>
.home-page {
  width: min(960px, calc(100% - 32px));
  margin: 0 auto;
  padding: 40px 0;
}

.home-page h1 {
  margin: 0 0 12px;
  font-size: 32px;
}

.home-page p {
  margin: 0;
  color: #475569;
}
</style>
