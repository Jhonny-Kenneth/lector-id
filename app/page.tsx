"use client";

import { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import { buildPdfFilename, createIdPdf } from "@/lib/pdf";

type StatusState = {
  type: "idle" | "success" | "error" | "info";
  message: string;
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
  const isNameValid = clientName.trim().length > 0;

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

  const canGenerate = Boolean(frontImage && backImage && isNameValid);

  const buildPdfBytes = async () => {
    if (!frontImage || !backImage) {
      throw new Error("Faltan capturas.");
    }
    return createIdPdf(frontImage, backImage, { clientName });
  };

  const toBase64 = (bytes: Uint8Array) => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const handleDownload = async () => {
    if (!clientName.trim()) {
      setStatus({
        type: "error",
        message: "El nombre del cliente es obligatorio.",
      });
      return;
    }
    if (!frontImage || !backImage) {
      setStatus({
        type: "error",
        message: "Debes capturar frente y reverso antes de descargar.",
      });
      return;
    }
    setIsDownloading(true);
    try {
      const pdfBytes = await buildPdfBytes();
      const safeBytes = new Uint8Array(pdfBytes);
      const filename = buildPdfFilename(clientName);
      const blob = new Blob([safeBytes], { type: "application/pdf" });
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


  const handleSendEmail = async () => {
    if (!clientName.trim()) {
      setStatus({
        type: "error",
        message: "El nombre del cliente es obligatorio.",
      });
      return;
    }
    if (!frontImage || !backImage) {
      setStatus({
        type: "error",
        message: "Debes capturar frente y reverso antes de enviar.",
      });
      return;
    }
    setIsSending(true);
    try {
      const pdfBytes = await buildPdfBytes();
      const safeBytes = new Uint8Array(pdfBytes);
      const filename = buildPdfFilename(clientName);

      const downloadBlob = new Blob([safeBytes], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(downloadBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = filename;
      downloadLink.click();
      URL.revokeObjectURL(downloadUrl);

      const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : safeBytes;
      const pdfBase64 = toBase64(bytes);
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, filename, clientName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus({
          type: "error",
          message: data.message || "No fue posible enviar el correo.",
        });
        return;
      }
      setStatus({
        type: "success",
        message: "Correo enviado a jhonnyk12sd@gmail.com.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "No fue posible enviar el correo.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const statusStyles: Record<StatusState["type"], string> = {
    idle: "border-slate-700/60 bg-slate-900/60 text-slate-300",
    info: "border-sky-800/70 bg-sky-950/60 text-sky-200",
    success: "border-emerald-800/70 bg-emerald-950/60 text-emerald-200",
    error: "border-rose-800/70 bg-rose-950/60 text-rose-200",
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-10 text-slate-100">
      <header className="mx-auto mb-8 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Captura de cedulas USB
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Captura frente y reverso desde una camara USB, genera un PDF de dos
              paginas y envialo por correo corporativo.
            </p>
          </div>
          <div className="flex items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/80 p-3 shadow-lg shadow-black/20">
            <img src="https://maunaloa.com.do/wp-content/uploads/2024/05/Logo-MAunaloa-2.png" alt="Logo" className="h-16 w-auto sm:h-20" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Camara en vivo</h2>
              <p className="text-sm text-slate-400">
                Selecciona la camara y captura el lado actual.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-800/80 p-1 text-xs font-semibold text-slate-300">
              <button
                type="button"
                className={`rounded-full px-3 py-1 ${
                  captureSide === "front"
                    ? "bg-slate-100 text-slate-900"
                    : ""
                }`}
                onClick={() => setCaptureSide("front")}
              >
                Frente
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 ${
                  captureSide === "back"
                    ? "bg-slate-100 text-slate-900"
                    : ""
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
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
            <h2 className="text-lg font-semibold">Previsualizaciones</h2>
            <div className="mt-4 grid gap-4">
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Frente</p>
                  <button
                    type="button"
                    onClick={clearFront}
                    className="text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Repetir
                  </button>
                </div>
                <div className="mt-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                  {frontImage ? (
                    <img
                      src={frontImage}
                      alt="Frente"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Sin captura</span>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Reverso</p>
                  <button
                    type="button"
                    onClick={clearBack}
                    className="text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Repetir
                  </button>
                </div>
                <div className="mt-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                  {backImage ? (
                    <img
                      src={backImage}
                      alt="Reverso"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Sin captura</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-6 shadow-xl shadow-black/30">
            <h2 className="text-lg font-semibold">Entrega</h2>
            <label className="mt-4 block text-xs font-semibold uppercase text-slate-400">
              ID / Nombre del cliente (obligatorio)
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Ej: Cliente_123"
              required
              className="mt-2 w-full rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!canGenerate || isDownloading}
                className="w-full rounded-full bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 shadow hover:bg-white disabled:opacity-50"
              >
                {isDownloading ? "Generando PDF..." : "Generar / Descargar PDF"}
              </button>
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={!canGenerate || isSending}
                className="w-full rounded-full border border-slate-700/70 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-200 shadow hover:bg-slate-800 disabled:opacity-50"
              >
                {isSending ? "Enviando correo..." : "Enviar correo"}
              </button>
            </div>
            {!canGenerate && (
              <p className="mt-3 text-xs text-slate-400">
                Necesitas el nombre y ambas capturas para habilitar el PDF y el envio.
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
