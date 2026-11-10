# Lector ID (Next.js 14)

Aplicacion de escritorio web para capturar frente y reverso de una cedula con camara USB, generar un PDF de 2 paginas y enviarlo por correo corporativo.

## Requisitos

- Node.js 18+
- Camara USB conectada al PC
- HTTPS en produccion (Chrome/Edge exigen HTTPS para usar camara)

## Instalacion

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Variables de entorno

Crea un archivo `.env.local` con el siguiente contenido (ejemplo sin secretos):

```bash
SMTP_HOST=smtp.tuempresa.com
SMTP_PORT=587
SMTP_USER=usuario@tuempresa.com
SMTP_PASS=tu_password
EMAIL_TO=recepcion@tuempresa.com
EMAIL_FROM=lector-id@tuempresa.com
NEXT_PUBLIC_EMAIL_TO=recepcion@tuempresa.com
```

## Flujo de uso

1. Iniciar camara y elegir el dispositivo USB.
2. Capturar el frente de la cedula.
3. Capturar el reverso de la cedula.
4. Verificar previsualizaciones.
5. Descargar PDF o enviar por correo.

## Troubleshooting

- **Permiso denegado / camara no disponible**: verifica permisos del navegador y que la pagina este en HTTPS.
- **No se detectan camaras**: desconecta y reconecta la camara, luego recarga la pagina.
- **PDF muy grande**: revisa que las capturas no sean excesivamente pesadas; el limite de envio por correo es 3MB para respetar el limite de solicitudes de Vercel al codificar en base64.

## Despliegue en Vercel

Importa este repositorio como un proyecto Next.js. Usa `npm run build` como comando de compilacion y conserva el directorio de salida predeterminado.

Configura en Vercel las variables SMTP indicadas arriba y las credenciales por area que utiliza `app/api/send/route.ts` (sufijos para `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` y `EMAIL_FROM_NAME`):

| Ruta | Sufijo SMTP | Destinatario |
| --- | --- | --- |
| `/hostess-maunaloa` | sin sufijo (`SMTP_USER`, `SMTP_PASS`, ...) | `EMAIL_TO` |
| `/caja-maunaloa` | `_CAJA` | `EMAIL_TO` (por defecto aelhassani@maunaloa.com.do) |
| `/mesas-maunaloa` | `_MESAS` | `EMAIL_TO` |
| `/caja-superbets-vip` | `_CAJASBVIP` | `EMAIL_TO` |
| `/hostess-superbets-vip` | `_HOSTESSVIP` | `EMAIL_TO` |
| `/caja-superbets-tiradentes` | `_TIRADENTES` (si falta, usa `_CAJASBVIP`) | `EMAIL_TO_SUPERBETS` (por defecto jhonny.kenneth@superbets.do) |
| `/caja-superbets-san-martin` | `_SANMARTIN` (si falta, usa `_CAJASBVIP`) | `EMAIL_TO_SUPERBETS` |

Las rutas anteriores (`/caja`, `/cajasbvip`, `/hostessvip`, `/mesas`) redirigen a las nuevas.

Deja `NEXT_PUBLIC_BASE_PATH` vacio para servir la aplicacion desde la raiz del dominio. Las variables de `.env.local` no se suben al repositorio ni se transfieren automaticamente a Vercel. Vuelve a desplegar despues de configurar las variables. Comprueba la camara, la descarga de PDF y el envio desde cada area en la URL HTTPS publicada.
- **Fallo SMTP**: valida host, puerto, usuario y password en `.env.local`.
- **Abrir app de correo**: usa `NEXT_PUBLIC_EMAIL_TO` para definir el destino en el boton de mailto.

## Estructura clave

- `app/page.tsx`: UI principal y flujo de captura.
- `components/CameraCapture.tsx`: manejo de camara USB y fallback.
- `lib/pdf.ts`: generacion de PDF con pdf-lib.
- `app/api/send/route.ts`: envio SMTP con nodemailer.
