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
- **PDF muy grande**: revisa que las capturas no sean excesivamente pesadas; el limite de envio es 8MB.
- **Fallo SMTP**: valida host, puerto, usuario y password en `.env.local`.
- **Abrir app de correo**: usa `NEXT_PUBLIC_EMAIL_TO` para definir el destino en el boton de mailto.

## Estructura clave

- `app/page.tsx`: UI principal y flujo de captura.
- `components/CameraCapture.tsx`: manejo de camara USB y fallback.
- `lib/pdf.ts`: generacion de PDF con pdf-lib.
- `app/api/send/route.ts`: envio SMTP con nodemailer.
