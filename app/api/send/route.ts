import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const pad2 = (value: number) => String(value).padStart(2, "0");

const buildSubjectDate = () => {
  const now = new Date();
  const date = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  return `${date} ${time}`;
};

const buildFrom = (fromAddress?: string, fromNameOverride?: string) => {
  const addr = (fromAddress || "").trim();
  if (!addr) return undefined;

  const fromName = (fromNameOverride || process.env.EMAIL_FROM_NAME || "").trim();
  if (fromName) return `"${fromName}" <${addr}>`;
  return addr;
};

type SenderCfg = { user?: string; pass?: string; from?: string; fromName?: string };

const resolveSenderConfig = (senderKey?: string): SenderCfg => {
  const key = String(senderKey || "").trim().toLowerCase();

  const defaults: SenderCfg = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME,
  };

  const perSender: Record<string, SenderCfg> = {
    caja: {
      user: process.env.SMTP_USER_CAJA,
      pass: process.env.SMTP_PASS_CAJA,
      from: process.env.EMAIL_FROM_CAJA,
      fromName: process.env.EMAIL_FROM_NAME_CAJA,
    },
    hostessvip: {
      user: process.env.SMTP_USER_HOSTESSVIP,
      pass: process.env.SMTP_PASS_HOSTESSVIP,
      from: process.env.EMAIL_FROM_HOSTESSVIP,
      fromName: process.env.EMAIL_FROM_NAME_HOSTESSVIP,
    },
    hostingsbvip: {
      user: process.env.SMTP_USER_HOSTINGSBVIP || process.env.SMTP_USER_HOSTESSVIP,
      pass: process.env.SMTP_PASS_HOSTINGSBVIP || process.env.SMTP_PASS_HOSTESSVIP,
      from: process.env.EMAIL_FROM_HOSTINGSBVIP || process.env.EMAIL_FROM_HOSTESSVIP,
      fromName:
        process.env.EMAIL_FROM_NAME_HOSTINGSBVIP || process.env.EMAIL_FROM_NAME_HOSTESSVIP,
    },
    cajasbvip: {
      user: process.env.SMTP_USER_CAJASBVIP,
      pass: process.env.SMTP_PASS_CAJASBVIP,
      from: process.env.EMAIL_FROM_CAJASBVIP,
      fromName: process.env.EMAIL_FROM_NAME_CAJASBVIP,
    },
    mesas: {
      user: process.env.SMTP_USER_MESAS,
      pass: process.env.SMTP_PASS_MESAS,
      from: process.env.EMAIL_FROM_MESAS,
      fromName: process.env.EMAIL_FROM_NAME_MESAS,
    },
  };

  return perSender[key] || defaults;
};

const json = (data: any, status = 200, extraHeaders: Record<string, string> = {}) =>
  NextResponse.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...extraHeaders,
    },
  });

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: Request) {
  const errorId = randomUUID();

  try {
    const body = await request.json();
    const { pdfBase64, filename, clientName, senderKey, to, subject, text, html } = body || {};

    // 1) Validaciones básicas del request
    if (!pdfBase64 || !filename) {
      return json(
        { ok: false, message: "Faltan datos obligatorios (PDF o nombre de archivo).", errorId },
        400
      );
    }

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = Buffer.from(String(pdfBase64), "base64");
    } catch {
      return json({ ok: false, message: "PDF base64 inválido.", errorId }, 400);
    }

    if (pdfBuffer.byteLength > MAX_BYTES) {
      return json({ ok: false, message: "El archivo excede el límite de 8MB.", errorId }, 413);
    }

    // 2) Resolver configuración SMTP
    const senderConfig = resolveSenderConfig(senderKey);

    const host = (process.env.SMTP_HOST || "").trim();
    const port = Number(String(process.env.SMTP_PORT || "").trim());

    const userRaw = (senderConfig.user || "").trim();
    // App Password a veces se pega con espacios: "abcd efgh ijkl mnop"
    const passClean = String(senderConfig.pass || "").replace(/\s+/g, "").trim();

    const fromAddress = (senderConfig.from || "").trim();
    const fromName = (senderConfig.fromName || "").trim();
    const toAddress = String(to || process.env.EMAIL_TO || "").trim();

    // Validaciones de env/config
    if (!host || !port || !userRaw || !passClean || !fromAddress) {
      console.error("SMTP CONFIG MISSING", {
        errorId,
        senderKey,
        hostPresent: Boolean(host),
        port,
        userPresent: Boolean(userRaw),
        passClean: passClean,
        fromPresent: Boolean(fromAddress),
      });

      return json(
        { ok: false, message: "Configuración de servidor incompleta.", errorId },
        400
      );
    }

    if (!toAddress) {
      return json({ ok: false, message: "Falta el destinatario (to).", errorId }, 400);
    }

    if (!EMAIL_REGEX.test(toAddress)) {
      return json({ ok: false, message: "Destinatario (to) inválido.", errorId }, 400);
    }

    const from = buildFrom(fromAddress, fromName);
    if (!from) {
      return json({ ok: false, message: "Falta EMAIL_FROM en la configuración.", errorId }, 400);
    }

    // Log seguro (NO imprime contraseña)
    console.log("SMTP USING", {
      errorId,
      senderKey: String(senderKey || "").trim(),
      host,
      port,
      user: userRaw,
      passClean: passClean,
      from: fromAddress,
      to: toAddress,
    });

    // 3) Crear transporte
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,      // 465 SSL
      requireTLS: port === 587,  // 587 STARTTLS
      auth: {
        user: userRaw,
        pass: passClean,
      },
      // OJO: NO desactivar validación TLS para Gmail
      tls: { rejectUnauthorized: false }, // NO recomendado
    });

    // 4) Verificar conexión (diagnóstico)
    try {
      await transporter.verify();
    } catch (e: any) {
      console.error("SMTP VERIFY FAILED", {
        errorId,
        code: e?.code,
        message: e?.message,
        response: e?.response,
        command: e?.command,
        auth: {
          user: userRaw,
          pass: passClean,
        },
      });

      // 502 porque es falla hacia un servicio externo (SMTP)
      return json(
        { ok: false, message: "Fallo al autenticar con el servidor SMTP.", errorId },
        502
      );
    }

    // 5) Preparar contenido
    const subjectName = String(clientName || "").trim() || "Cliente";
    const subjectDate = buildSubjectDate();
    const computedSubject = `Cedula - ${subjectName} - ${subjectDate}`;

    const finalSubject = String(subject || "").trim() || computedSubject;
    const finalText =
      String(text || "").trim() ||
      `Se adjunta la cedula de: ${subjectName}\nFecha de envio: ${subjectDate}`;
    const finalHtml = typeof html === "string" && html.trim().length ? html : undefined;

    // 6) Enviar
    await transporter.sendMail({
      from,
      to: toAddress,
      subject: finalSubject,
      text: finalText,
      html: finalHtml,
      attachments: [
        {
          filename: String(filename),
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("Correo enviado con éxito a:", toAddress);
    return json({ ok: true, message: "Correo enviado correctamente." }, 200);
  } catch (error: any) {
    const safeError = {
      errorId,
      message: error?.message,
      code: error?.code,
      response: error?.response,
      errno: error?.errno,
    };
    console.error("ERROR SMTP:", safeError);

    return json({ ok: false, message: "Email send failed", errorId }, 500);
  }
}
