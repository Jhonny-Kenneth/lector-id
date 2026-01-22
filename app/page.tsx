"use client";

import { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import { buildPdfFilename, createIdPdf } from "@/lib/pdf";

type StatusState = {
  type: "idle" | "success" | "error" | "info";
  message: string;
};

const buildMailSubject = (name?: string) => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const subjectName = name?.trim() || "Cliente";
  return `Cedula - ${subjectName} - ${date} ${time}`;
};

export default function Home() {
  const [clientName, setClientName] = useState("");
  const [captureSide, setCaptureSide] = useState<"front" | "back">("front");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusState>({
    type: "info",
    message: "Inicia la camara y captura el frente de la cedula.",
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const emailTo = process.env.NEXT_PUBLIC_EMAIL_TO || "";

  const handleCapture = (dataUrl: string) => {
    if (captureSide === "front") {
      setFrontImage(dataUrl);
      setCaptureSide("back");
      setStatus({
        type: "success",
        message: "Frente capturado. Ahora captura el reverso.",
      });
    } else {
      setBackImage(dataUrl);
      setStatus({
        type: "success",
        message: "Reverso capturado. Ya puedes generar el PDF.",
      });
    }
  };

  const clearFront = () => {
    setFrontImage(null);
    setCaptureSide("front");
    setStatus({
      type: "info",
      message: "Captura nuevamente el frente de la cedula.",
    });
  };

  const clearBack = () => {
    setBackImage(null);
    setCaptureSide("back");
    setStatus({
      type: "info",
      message: "Captura nuevamente el reverso de la cedula.",
    });
  };

  const canGenerate = Boolean(frontImage && backImage);

  const buildPdfBytes = async () => {
    if (!frontImage || !backImage) {
      throw new Error("Faltan capturas.");
    }
    return createIdPdf(frontImage, backImage, { clientName });
  };

  const handleDownload = async () => {
    if (!canGenerate) {
      setStatus({
        type: "error",
        message: "Debes capturar frente y reverso antes de descargar.",
      });
      return;
    }
    setIsDownloading(true);
    try {
      const pdfBytes = await buildPdfBytes();
      const filename = buildPdfFilename(clientName);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({ type: "success", message: "PDF descargado." });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudo generar el PDF. Intenta de nuevo.",
      });
    } finally {
      setIsDownloading(false);
    }
  };


  const handleOpenEmail = async () => {
    if (!canGenerate) {
      setStatus({
        type: "error",
        message: "Debes capturar frente y reverso antes de enviar.",
      });
      return;
    }
    if (!emailTo) {
      setStatus({
        type: "error",
        message: "No hay correo destino configurado en NEXT_PUBLIC_EMAIL_TO.",
      });
      return;
    }
    setIsSending(true);
    try {
      const pdfBytes = await buildPdfBytes();
      const filename = buildPdfFilename(clientName);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      const subject = buildMailSubject(clientName);
      const body = [
        "Adjunto el PDF de la cedula.",
        "",
        "Nota: el archivo se descargo automaticamente; adjuntalo al correo.",
      ].join("\n");
      const mailto = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
      setStatus({
        type: "success",
        message: "Se abrio tu app de correo. Adjunta el PDF descargado.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudo generar el PDF para el correo.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const statusStyles: Record<StatusState["type"], string> = {
    idle: "border-slate-200 bg-slate-50 text-slate-600",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-8 py-10 text-slate-900">
      <header className="mx-auto mb-8 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Captura de cedulas USB
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Captura frente y reverso desde una camara USB, genera un PDF de dos
              paginas y envialo por correo corporativo.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">
            Requiere HTTPS para camara en produccion
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Camara en vivo</h2>
              <p className="text-sm text-slate-500">
                Selecciona la camara y captura el lado actual.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                className={`rounded-full px-3 py-1 ${
                  captureSide === "front" ? "bg-white text-slate-900" : ""
                }`}
                onClick={() => setCaptureSide("front")}
              >
                Frente
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 ${
                  captureSide === "back" ? "bg-white text-slate-900" : ""
                }`}
                onClick={() => setCaptureSide("back")}
              >
                Reverso
              </button>
            </div>
          </div>
          <CameraCapture onCapture={handleCapture} />
        </section>

        <section className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Previsualizaciones</h2>
            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Frente</p>
                  <button
                    type="button"
                    onClick={clearFront}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Repetir
                  </button>
                </div>
                <div className="mt-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  {frontImage ? (
                    <img
                      src={frontImage}
                      alt="Frente"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">Sin captura</span>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Reverso</p>
                  <button
                    type="button"
                    onClick={clearBack}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Repetir
                  </button>
                </div>
                <div className="mt-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  {backImage ? (
                    <img
                      src={backImage}
                      alt="Reverso"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">Sin captura</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Entrega</h2>
            <label className="mt-4 block text-xs font-semibold uppercase text-slate-500">
              ID / Nombre del cliente (opcional)
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Ej: Cliente_123"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!canGenerate || isDownloading}
                className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50"
              >
                {isDownloading ? "Generando PDF..." : "Generar / Descargar PDF"}
              </button>
              <button
                type="button"
                onClick={handleOpenEmail}
                disabled={!canGenerate || isSending}
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50 disabled:opacity-50"
              >
                {isSending ? "Preparando correo..." : "Abrir app de correo"}
              </button>
            </div>
            {!canGenerate && (
              <p className="mt-3 text-xs text-slate-500">
                Necesitas ambas capturas para habilitar el PDF y el envio.
              </p>
            )}
          </div>

          <div className={`rounded-2xl border px-4 py-3 text-sm ${statusStyles[status.type]}`}>
            {status.message}
          </div>
        </section>
      </main>
    </div>
  );
}
