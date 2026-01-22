import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const MAX_BYTES = 8 * 1024 * 1024;
export const runtime = "nodejs";

const buildSubjectDate = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `${date} ${time}`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pdfBase64 = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
    const filename = typeof body.filename === "string" ? body.filename : "";
    const clientName = typeof body.clientName === "string" ? body.clientName : "";

    if (!pdfBase64 || !filename) {
      return NextResponse.json(
        { ok: false, message: "Faltan datos para enviar el PDF." },
        { status: 400 }
      );
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    if (pdfBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, message: "El PDF supera el limite de 8MB." },
        { status: 413 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const emailTo = process.env.EMAIL_TO;
    const emailFrom = process.env.EMAIL_FROM;

    if (!host || !port || !user || !pass || !emailTo || !emailFrom) {
      return NextResponse.json(
        { ok: false, message: "Faltan variables SMTP en el servidor." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });

    const subjectName = clientName?.trim() || "Cliente";
    const subject = `Cedula - ${subjectName} - ${buildSubjectDate()}`;

    await transporter.sendMail({
      from: emailFrom,
      to: emailTo,
      subject,
      text: "Se adjunta el PDF con la cedula capturada.",
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, message: "No fue posible enviar el correo." },
      { status: 500 }
    );
  }
}
