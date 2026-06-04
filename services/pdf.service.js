const SIGN_ENDPOINT = '/api/pdf/sign'
const SIGNATURE_STORAGE_KEY = 'kanay-user-signature-url'
const SIGNATURE_BASE64_STORAGE_KEY = 'kanay-user-signature-base64'

export function getStoredSignatureUrl() {
  if (!process.client) return ''

  return window.localStorage.getItem(SIGNATURE_STORAGE_KEY) || ''
}

export function setStoredSignatureUrl(url) {
  if (process.client && url) {
    window.localStorage.setItem(SIGNATURE_STORAGE_KEY, url)
  }
}

export function getStoredSignatureBase64() {
  if (!process.client) return ''

  return window.localStorage.getItem(SIGNATURE_BASE64_STORAGE_KEY) || ''
}

export function setStoredSignatureBase64(base64) {
  if (process.client && base64) {
    window.localStorage.setItem(SIGNATURE_BASE64_STORAGE_KEY, base64)
  }
}

export function createPdfObjectUrl(file) {
  return URL.createObjectURL(file)
}

export async function fileToBase64(file) {
  const dataUrl = await readAsDataUrl(file)
  return dataUrl.split(',')[1]
}

export async function urlToBase64(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('No se pudo obtener la firma PNG')
  }

  const blob = await response.blob()
  return fileToBase64(blob)
}

export async function uploadSignature({ storage, file }) {
  const extension = getFileExtension(file.name) || 'png'
  const path = `documentos/firmas/usuario/firma-${Date.now()}.${extension}`
  const snapshot = await storage.ref(path).put(file, {
    contentType: file.type || 'image/png'
  })

  const url = await snapshot.ref.getDownloadURL()
  setStoredSignatureUrl(url)
  setStoredSignatureBase64(await fileToBase64(file))

  return url
}

export async function uploadOriginalPdf({ storage, file }) {
  const path = `documentos/pdfs/originales/${Date.now()}-${sanitizeFileName(file.name)}`
  const snapshot = await storage.ref(path).put(file, {
    contentType: 'application/pdf'
  })

  return snapshot.ref.getDownloadURL()
}

export async function uploadSignedPdf({ storage, blob, originalName }) {
  const fileName = getSignedFileName(originalName)
  const path = `documentos/pdfs/firmados/${Date.now()}-${sanitizeFileName(fileName)}`
  const snapshot = await storage.ref(path).put(blob, {
    contentType: 'application/pdf'
  })

  return {
    name: fileName,
    url: await snapshot.ref.getDownloadURL()
  }
}

export async function signPdf({ pdfFile, signatureBase64 }) {
  const pdfBase64 = await fileToBase64(pdfFile)
  const response = await fetch(SIGN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pdfBase64,
      signatureBase64
    })
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new Error(message || 'No se pudo firmar el PDF')
  }

  return response.blob()
}

export function getSignedFileName(fileName) {
  return String(fileName || 'documento.pdf').replace(/\.pdf$/i, '-firmado.pdf')
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function readErrorMessage(response) {
  try {
    const data = await response.json()
    return data.message
  } catch (_error) {
    return ''
  }
}

function getFileExtension(fileName) {
  const parts = String(fileName || '').split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

function sanitizeFileName(fileName) {
  return String(fileName || 'archivo.pdf')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
}
