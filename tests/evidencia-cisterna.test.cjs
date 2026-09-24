const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const load = relative => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')).toString('base64'))

test('evidence rejects unsafe links and MEGA links missing keys', async () => {
  const { getEvidenciaUrl } = await load('utils/evidenciaCisterna.js')
  for (const link of ['', ' ', 'javascript:alert(1)', 'data:text/html,test', '//example.com', 'http://example.com', 'https://user:pass@example.com', 'https://mega.nz/file/example', 'https://mega.nz/']) {
    assert.equal(getEvidenciaUrl(link), '', link)
  }
  assert.equal(getEvidenciaUrl(' https://example.com/photo.jpg '), 'https://example.com/photo.jpg')
})

test('MEGA links preserve decryption keys and folders use external access', async () => {
  const { getEvidenciaUrl, getEvidenciaEmbedUrl } = await load('utils/evidenciaCisterna.js')
  assert.equal(getEvidenciaEmbedUrl('https://mega.nz/file/example#secret_key'), 'https://mega.nz/embed/example#secret_key')
  assert.equal(getEvidenciaEmbedUrl('https://mega.co.nz/#!example!secret_key'), 'https://mega.nz/embed/example#secret_key')
  assert.equal(getEvidenciaEmbedUrl('https://mega.nz/embed/example#secret_key'), 'https://mega.nz/embed/example#secret_key')
  assert.ok(getEvidenciaUrl('https://mega.nz/folder/example#secret_key'))
  assert.equal(getEvidenciaEmbedUrl('https://mega.nz/folder/example#secret_key'), '')
  assert.equal(getEvidenciaEmbedUrl('javascript:alert(1)'), '')
})

test('legacy services remain pending; evidence and observation survive save/reload and removal', async () => {
  const { createEmptyIngresoCisternaForm, toIngresoCisternaPayload, normalizeIngresoCisterna } = await load('models/ingresoCisterna.js')
  assert.equal(normalizeIngresoCisterna({ id: 'old' }).evidenciaLink, '')
  const form = createEmptyIngresoCisternaForm()
  form.evidenciaLink = ' https://mega.nz/file/example#secret_key '
  form.observacion = ' Foto de recepción '
  const saved = normalizeIngresoCisterna({ id: 'new', ...toIngresoCisternaPayload(form) })
  assert.equal(saved.evidenciaLink, 'https://mega.nz/file/example#secret_key')
  assert.equal(saved.observacion, 'Foto de recepción')
  saved.evidenciaLink = ''
  assert.equal(toIngresoCisternaPayload(saved).evidenciaLink, '')
})
