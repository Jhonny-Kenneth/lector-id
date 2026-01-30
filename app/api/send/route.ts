import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
export const runtime = "nodejs";

const buildSubjectDate = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `${date} ${time}`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pdfBase64, filename, clientName } = body;

    // 1. Validaciones iniciales
    if (!pdfBase64 || !filename) {
      return NextResponse.json(
        { ok: false, message: "Faltan datos obligatorios (PDF o nombre de archivo)." },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    if (pdfBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, message: "El archivo excede el límite de 8MB." },
        { status: 413 }
      );
    }

    // 2. Configuración de transporte (Verificación de variables)
    const config = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      to: process.env.EMAIL_TO,
      from: process.env.EMAIL_FROM,
    };

    if (!config.host || !config.user || !config.pass) {
      console.error("❌ Error: Faltan variables de entorno SMTP.");
      return NextResponse.json(
        { ok: false, message: "Configuración de servidor incompleta." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465, // True para 465, false para 587
      auth: {
        user: config.user,
        pass: config.pass,
      },
      // Esto ayuda a evitar problemas con certificados SSL no firmados en hostings compartidos
      tls: {
        rejectUnauthorized: false 
      }
    });

    // 3. Preparar el correo
    const subjectName = clientName?.trim() || "Cliente";
    const subject = `Cédula - ${subjectName} - ${buildSubjectDate()}`;

    // 4. Enviar
    await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: subject,
      text: `Se adjunta la cédula de: ${subjectName}\nFecha de envío: ${buildSubjectDate()}`,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("✅ Correo enviado con éxito a:", config.to);
    return NextResponse.json({ ok: true, message: "Correo enviado correctamente." });

  } catch (error: any) {
    // Log detallado en la consola del servidor (terminal)
    console.error("❌ ERROR SMTP:", error.message);
    
    return NextResponse.json(
      { 
        ok: false, 
        message: "Error al enviar el correo",
        debug: error.message // Quitar 'debug' en producción
      },
      { status: 500 }
    );
  }
}
