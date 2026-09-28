# kanaySeche

## Certificados PDF

La API de certificados usa `publicRuntimeConfig`, independiente de `API_URL` y de Axios:

| Variable | Desarrollo | Producción |
| --- | --- | --- |
| `CERTIFICADOS_API_URL` | `http://localhost:8000` | `https://api-query-control-pesaje.vercel.app` |
| `CERTIFICADOS_MAX_TOTAL_BYTES` | `4000000` | `4000000` |

Estos son los valores predeterminados. Puedes definirlos en `.env` o en el entorno de despliegue. El límite debe ser un entero positivo en bytes; valores inválidos usan 4000000. Son valores públicos, no secretos. Reinicia Nuxt después de cambiarlos; si publicas archivos estáticos, vuelve a generar y desplegar el sitio.

La suma de los PDFs se limita preventivamente a 4 MB decimales. No garantiza que la solicitud con su envoltura multipart ni el ZIP cumplan el límite de 4,5 MB de Vercel. El backend debe validar contenido y tamaños. Un archivo inválido rechaza el lote completo. No hay OCR: los archivos `otro_cert_N.pdf` requieren revisión; `manifest.json` contiene los datos extraídos y esta pantalla no lo analiza.

En el **backend**, configura `ALLOWED_ORIGINS` con el origen exacto de Nuxt, sin barra final (por ejemplo, `http://localhost:3000`), y expón `X-Archivos-Procesados` mediante CORS. Los cambios del backend deben estar desplegados antes de probar contra producción. Un error de conexión puede deberse a red, disponibilidad o CORS; no permite atribuir una causa única.

La espera del cliente termina a los 60 segundos, incluida la lectura del ZIP. Cancelarla no cancela necesariamente el procesamiento del servidor. No hay reenvíos automáticos. La estadística en `procesarCertificados` usa exclusivamente un entero no negativo válido del header; si falta o falla Firebase, se conserva el resultado exitoso de la descarga y se avisa sin reenviar.

Para asignar acceso, sincroniza las páginas del sistema en **Roles y permisos → Páginas y módulos**, y asigna Certificados al rol. El menú y el middleware usan `/documentos/certificados`.

Pruebas sin documentos ni escrituras reales: `node --test tests/*.test.cjs`.

## Build Setup

```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production and launch server
$ npm run build
$ npm run start

# generate static project
$ npm run generate

#Deploy
firebase deploy
```
