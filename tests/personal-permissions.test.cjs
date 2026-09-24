const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const load = name => import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname,'..',name),'utf8')).toString('base64'))
test('delegated personal writes omit role and password and preserve stored credentials', async () => {
  const { toPersonalPayload } = await load('models/personal.js')
  const form = { nombres:'Ana',telefono:'123',correo:'ana@example.com',estado:true,rolId:'admin',rolNombre:'Administrador',password:'attempt' }
  const payload = toPersonalPayload(form,{isAdmin:false})
  for(const key of ['rolId','rolNombre','password']) assert.equal(Object.hasOwn(payload,key),false)
  const existing = {rolId:'operator',rolNombre:'Operaciones',password:'original'}
  assert.deepEqual({...existing,...payload}, {...payload,...existing})
  assert.equal(toPersonalPayload(form,{isAdmin:true}).password,'attempt')
  assert.equal(toPersonalPayload(form,{isAdmin:true}).rolId,'admin')
  assert.equal(Object.hasOwn(toPersonalPayload({...form,password:''},{isAdmin:true}),'password'),false)
})
test('personal page requires assigned permission and roles page stays admin only', async () => {
  const { canAccessRoute } = await load('utils/access-control.js')
  const user = {rolNombre:'Operaciones',rutasPermitidas:['/configuracion/personal','/configuracion/roles']}
  assert.equal(canAccessRoute(user,'/configuracion/personal'),true)
  assert.equal(canAccessRoute({...user,rutasPermitidas:[]},'/configuracion/personal'),false)
  assert.equal(canAccessRoute(user,'/configuracion/roles'),false)
})
