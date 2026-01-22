"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

type CameraCaptureProps = {
  onCapture: (dataUrl: string) => void;
  disabled?: boolean;
};

type DeviceOption = {
  deviceId: string;
  label: string;
};

const MAX_WIDTH = 1600;

export default function CameraCapture({ onCapture, disabled }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices([]);
      return;
    }

    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = list
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camara ${index + 1}`,
        }));
      setDevices(videoInputs);
      if (videoInputs.length > 0) {
        setUseFallback(false);
      }
      if (!selectedId && videoInputs.length > 0) {
        setSelectedId(videoInputs[0].deviceId);
      }
      if (videoInputs.length === 0) {
        setError("No se encontraron camaras disponibles.");
        setUseFallback(true);
      }
    } catch {
      setError("No fue posible listar las camaras.");
      setUseFallback(true);
    }
  };

  const startCamera = async () => {
    setError(null);
    setUseFallback(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("El navegador no soporta acceso a camara.");
      setUseFallback(true);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = selectedId
        ? { video: { deviceId: { exact: selectedId } } }
        : { video: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stopStream();
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setIsActive(true);
      await refreshDevices();
    } catch {
      setError("No se pudo iniciar la camara. Verifica permisos o HTTPS.");
      setUseFallback(true);
      setIsActive(false);
      stopStream();
    }
  };

  const stopCamera = () => {
    stopStream();
    setIsActive(false);
  };

  const captureSnapshot = () => {
    if (disabled || !videoRef.current) {
      return;
    }
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setError("La camara aun no esta lista para capturar.");
      return;
    }

    let targetWidth = video.videoWidth;
    let targetHeight = video.videoHeight;
    if (targetWidth > MAX_WIDTH) {
      const scale = MAX_WIDTH / targetWidth;
      targetWidth = MAX_WIDTH;
      targetHeight = Math.round(targetHeight * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("No se pudo procesar la captura.");
      return;
    }
    context.drawImage(video, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCapture(dataUrl);
  };

  const handleFileFallback = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onCapture(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    refreshDevices();
    if (navigator.mediaDevices?.addEventListener) {
      const handler = () => refreshDevices();
      navigator.mediaDevices.addEventListener("devicechange", handler);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", handler);
        stopStream();
      };
    }
    return () => stopStream();
  }, []);

  useEffect(() => {
    if (isActive) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={isActive ? stopCamera : startCamera}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-50"
          disabled={disabled}
        >
          {isActive ? "Detener camara" : "Iniciar camara"}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Camara:</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            disabled={devices.length === 0 || disabled}
          >
            {devices.length === 0 && <option value="">Sin camaras</option>}
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={captureSnapshot}
          className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
          disabled={!isActive || disabled}
        >
          Capturar
        </button>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner">
        {useFallback ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center text-sm text-slate-600">
            <p className="font-medium">
              No se pudo acceder a la camara. Sube una imagen manualmente.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileFallback}
              className="w-full max-w-xs text-sm text-slate-600"
              disabled={disabled}
            />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/70 bg-white/10" />
          </>
        )}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
