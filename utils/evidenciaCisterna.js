// Only web links may be used as evidence or loaded in the viewer.
export function getEvidenciaUrl(value) {
  const text = String(value || '').trim()
  if (!/^https:\/\//i.test(text)) return ''
  try {
    const url = new URL(text)
    if (!url.hostname || url.username || url.password) return ''
    if (['mega.nz', 'www.mega.nz', 'mega.co.nz'].includes(url.hostname)) {
      const modern = /^\/(file|folder|embed)\/[\w-]+\/?$/.test(url.pathname) && /^#[\w-]+(?:\/.*)?$/.test(url.hash)
      const legacy = url.pathname === '/' && /^#(?:F)?![\w-]+![\w-]+$/.test(url.hash)
      if (!modern && !legacy) return ''
    }
    return url.href
  } catch (_) {
    return ''
  }
}

export function getEvidenciaEmbedUrl(value) {
  const link = getEvidenciaUrl(value)
  if (!link) return ''
  const url = new URL(link)
  if (['mega.nz', 'www.mega.nz', 'mega.co.nz'].includes(url.hostname)) {
    const file = url.pathname.match(/^\/(?:file|embed)\/([\w-]+)\/?$/)
    const legacy = url.hash.match(/^#!([\w-]+)!([\w-]+)$/)
    if (file) return `https://mega.nz/embed/${file[1]}${url.hash}`
    if (legacy) return `https://mega.nz/embed/${legacy[1]}#${legacy[2]}`
    // Shared folders use MEGA's own browser, not the file embed player.
    return ''
  }
  return link
}
