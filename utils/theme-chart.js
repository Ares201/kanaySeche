import Chart from 'chart.js/auto'

const themePlugin = {
  id: 'kanay-theme',
  beforeUpdate(chart) {
    const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
    const color = dark ? '#cbd5e1' : '#666666'
    chart.options.color = color
    if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = color
    if (chart.options.plugins?.title) chart.options.plugins.title.color = color
    Object.values(chart.options.scales || {}).forEach(scale => {
      if (scale.ticks) scale.ticks.color = color
      if (scale.grid) scale.grid.color = dark ? 'rgba(148,163,184,.18)' : 'rgba(0,0,0,.1)'
      if (scale.title) scale.title.color = color
    })
  }
}
Chart.register(themePlugin)
if (process.client) {
  const refresh = () => Object.values(Chart.instances).forEach(chart => chart.update('none'))
  window.addEventListener('kanay-theme-change', refresh)
  if (module.hot) module.hot.dispose(() => {
    window.removeEventListener('kanay-theme-change', refresh)
    Chart.unregister(themePlugin)
  })
}
export default Chart
