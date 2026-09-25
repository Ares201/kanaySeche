# Usuarios en línea con Firestore

La presencia utiliza el Firebase existente y se publica con la web en Firebase Hosting. No requiere Socket.IO, Cloud Run, Blaze, credenciales de servidor ni una URL adicional.

Cada pestaña con sesión abierta escribe un documento independiente en `presencia`, con identificador de usuario, nombre y fecha del servidor. No se copian correos, contraseñas ni permisos. Los usuarios se agrupan por identificador para no aparecer duplicados.

Se envía una señal cada 60 segundos. La lista escucha cambios de Firestore y descarta señales de más de tres minutos, comprobándolo cada diez segundos. Al cerrar sesión se intenta eliminar el documento; al cerrar abruptamente el navegador o perder conexión, puede tardar aproximadamente tres minutos en desaparecer. Una pestaña suspendida por el navegador también puede desaparecer hasta que vuelva a activarse. Los relojes de los equipos deben estar sincronizados.

No es una prueba exacta de conectividad: Firestore no ofrece `onDisconnect`. La interfaz oculta resultados de caché y deja de mostrar la lista si no se confirma la propia conexión. Las sesiones existentes se restauran automáticamente sin volver a iniciar sesión.

## Publicación

Ejecutar `firebase deploy --only hosting --project kanaybd`; el predeploy genera la web. No hace falta ejecutar un proceso de presencia por separado. Las variables antiguas `PRESENCE_URL`, `PRESENCE_SECRET` y `PRESENCE_ORIGINS` ya no se utilizan.

La colección `presencia` necesita permiso para consultar, crear y eliminar documentos. No se han modificado las reglas. Las reglas actuales del proyecto permiten acceso sin Firebase Auth hasta el 25 de diciembre de 2026; la sesión propia de la aplicación no es una identidad validable por reglas de Firebase. Por ello, esta presencia es informativa y no sirve para auditoría ni control de acceso. Antes de restringir las reglas será necesario integrar Firebase Authentication para verificar la identidad.

## Consumo

Cada pestaña abierta realiza aproximadamente 60 escrituras por hora y recibe las actualizaciones de las otras pestañas mediante lecturas. También hay lecturas al abrir la lista y al renovar la consulta cada diez minutos. El consumo cuenta dentro de la cuota actual; no implica uso ilimitado gratuito. Las sesiones abandonadas quedan almacenadas, pero no se consultan en nuevas conexiones una vez vencidas; no se ha activado TTL facturable ni limpieza automática del servidor.

Pruebas: `npm run test:presence`.

Referencias: [escuchas de Firestore](https://firebase.google.com/docs/firestore/query-data/listen), [limitaciones de presencia](https://firebase.google.com/docs/firestore/solutions/presence).
