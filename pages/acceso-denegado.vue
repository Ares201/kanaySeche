<template><section class="denied"><v-icon size="64" color="warning">mdi-shield-lock</v-icon><h1>Acceso no autorizado</h1><p>No tienes permisos para ingresar a esta página.</p><v-btn color="primary" to="/">Volver al inicio</v-btn></section></template>
<script>export default { name: 'AccessDeniedPage' }</script>
<style scoped>.denied{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px}.denied h1,.denied p{margin:0}</style>
