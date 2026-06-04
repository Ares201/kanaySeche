const { PDFDocument } = require('pdf-lib')

const MAX_BODY_SIZE = 35 * 1024 * 1024
module.exports = async function signPdfEndpoint(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { message: 'Metodo no permitido' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const pdfBytes = Buffer.from(body.pdfBase64 || '', 'base64')
    const signatureBytes = Buffer.from(body.signatureBase64 || '', 'base64')

    if (!pdfBytes.length || !signatureBytes.length) {
      sendJson(res, 400, { message: 'PDF y firma PNG son requeridos' })
      return
    }

    const signedPdfBytes = await signPdf(pdfBytes, signatureBytes)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="documento-firmado.pdf"')
    res.end(Buffer.from(signedPdfBytes))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    sendJson(res, 500, { message: 'No se pudo firmar el PDF' })
  }
}

async function signPdf(pdfBytes, signatureBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const signatureImage = await pdfDoc.embedPng(signatureBytes)
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const pageWidth = lastPage.getWidth()
  const signatureWidth = pageWidth * 1.25
  const signatureHeight = signatureWidth * (signatureImage.height / signatureImage.width)

  lastPage.drawImage(signatureImage, {
    x: ((pageWidth - signatureWidth) / 2) + 65,
    y: 40,
    width: signatureWidth,
    height: signatureHeight
  })

  return pdfDoc.save()
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = ''

    req.on('data', chunk => {
      rawBody += chunk

      if (Buffer.byteLength(rawBody) > MAX_BODY_SIZE) {
        reject(new Error('El archivo supera el limite permitido'))
        req.destroy()
      }
    })

    req.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {})
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', reject)
  })
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}
