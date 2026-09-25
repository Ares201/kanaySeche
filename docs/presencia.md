# Usuarios en línea con Socket.IO

Todos los usuarios con sesión iniciada tienen el botón de usuarios en la barra superior. Muestra nombres, iniciales, punto verde y contador, incluido el propio usuario. No tiene chat. Estar en línea significa mantener una conexión al servicio (también con una pestaña en segundo plano), no estar usando el teclado.

## Ejecutar en desarrollo

Requiere Node.js 22 o superior. Instalar las dependencias con `npm install`. Agregar a `.env`:

```dotenv
PRESENCE_URL=http://localhost:3001
PRESENCE_ORIGINS=http://localhost:3000
PRESENCE_SECRET=reemplazar-por-un-secreto-aleatorio-de-al-menos-32-caracteres
FIREBASE_PROJECT_ID=kanaybd
GOOGLE_APPLICATION_CREDENTIALS=C:/ruta/privada/cuenta-servicio.json
```

Generar un secreto con `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. La cuenta de servicio debe tener permiso de lectura sobre `personal` y `roles` en Firestore. Alternativamente, usar credenciales predeterminadas del entorno de Google Cloud. No publicar el archivo de credenciales ni el secreto en el frontend.

En dos terminales ejecutar `npm run presence` y `npm run dev`. Iniciar sesión nuevamente para obtener el token de presencia. Las sesiones anteriores a esta funcionalidad necesitan volver a iniciar sesión.

## Producción

El frontend actual se genera como archivos estáticos en Firebase Hosting; el proceso Socket.IO se despliega por separado en un servidor Node que admita conexiones persistentes. Usar una sola instancia del servicio: el registro de conexiones está en memoria. Para varias instancias se necesita un adaptador y agregación de presencia compartida antes de escalar.

Configurar `PRESENCE_URL=https://dominio-del-servicio` **antes** de `npm run generate`. En el servidor configurar `PRESENCE_ORIGINS` con los orígenes exactos del frontend separados por comas, `PRESENCE_SECRET`, las credenciales de Firestore y opcionalmente `PORT` (3001 por defecto). El proxy debe admitir WebSocket y un timeout superior a 20 segundos. Usar HTTPS para proteger credenciales y tokens. `/health` comprueba que el proceso responde; no comprueba Firestore.

El servidor verifica el usuario y su contraseña contra el modelo de acceso existente y emite un token firmado de 24 horas guardado en `sessionStorage`. Las contraseñas no se guardan en el nuevo almacenamiento de presencia ni se incluyen en la lista emitida. Al reconectar se comprueban usuario, rol, contraseña vigente y expiración. Cambios de rol o desactivaciones de conexiones ya abiertas se aplican al reconectar o vencer el token. Al cerrar sesión se desconecta esa pestaña; otras sesiones del mismo usuario siguen en línea. Al perder la red, la baja puede tardar aproximadamente 20 segundos por detección del heartbeat. Al recuperar conexión se envía una lista completa.

Si el servicio no responde, el acceso existente sigue funcionando y el panel indica que la lista no está disponible. No presenta una lista antigua como si estuviera actualizada. No se han cambiado las reglas de Firestore ni el sistema de contraseñas existente.

Validación local: `npm run test:presence` (servidor real con usuarios de prueba, sin acceder a Firestore).

Referencias: [autenticación en Socket.IO](https://socket.io/docs/v4/middlewares/), [servidor independiente](https://socket.io/docs/v4/server-initialization/).
