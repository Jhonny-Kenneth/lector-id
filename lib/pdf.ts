import { PDFDocument } from "pdf-lib";

export type IdPdfMeta = {
  clientName?: string;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 36;

const sanitizeClientName = (value?: string) => {
  const raw = (value || "cliente").trim().replace(/\s+/g, "_");
  const sanitized = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  return sanitized.length > 0 ? sanitized : "cliente";
};

const buildTimestamp = () => {
  const now = new Date();
  const pad = (num: number) => String(num).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `${date}_${time}`;
};

export const buildPdfFilename = (clientName?: string) => {
  const safeName = sanitizeClientName(clientName);
  return `cedula_${safeName}_${buildTimestamp()}.pdf`;
};

const dataUrlToBytes = (dataUrl: string) => {
  const [header, base64] = dataUrl.split(",");
  if (!header || !base64) {
    throw new Error("Data URL invalido.");
  }
  const match = header.match(/data:(.*?);base64/);
  const mime = match?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, mime };
};

export const createIdPdf = async (
  frontDataUrl: string,
  backDataUrl: string,
  _meta?: IdPdfMeta
) => {
  const pdfDoc = await PDFDocument.create();

  const embedImage = async (dataUrl: string) => {
    const { bytes, mime } = dataUrlToBytes(dataUrl);
    if (mime === "image/png") {
      return pdfDoc.embedPng(bytes);
    }
    return pdfDoc.embedJpg(bytes);
  };

  const drawCenteredImage = async (dataUrl: string) => {
    const image = await embedImage(dataUrl);
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const maxWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
    const maxHeight = PAGE_HEIGHT - PAGE_MARGIN * 2;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (PAGE_WIDTH - width) / 2;
    const y = (PAGE_HEIGHT - height) / 2;
    page.drawImage(image, { x, y, width, height });
  };

  await drawCenteredImage(frontDataUrl);
  await drawCenteredImage(backDataUrl);

  return pdfDoc.save();
};
