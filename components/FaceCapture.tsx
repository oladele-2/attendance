"use client";

import { useEffect, useRef, useState } from "react";
import { IconAlert, IconCamera, IconScanFace } from "./icons";

declare global {
  interface Window {
    faceapi?: unknown;
  }
}

type Props = {
  mode: "verify" | "register";
  endpoint: string;
  extraBody?: Record<string, unknown>;
  buttonLabel: string;
  requireFace?: boolean;
  disabled?: boolean;
};

export function FaceCapture({
  mode,
  endpoint,
  extraBody,
  buttonLabel,
  requireFace = true,
  disabled = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState(
    requireFace ? "Loading face models..." : "You can mark attendance now. Camera is optional.",
  );
  const [faceReady, setFaceReady] = useState(false);
  const [ok, setOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const descriptorRef = useRef<number[] | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    let stream: MediaStream | undefined;
    let cancelled = false;

    async function boot() {
      await new Promise<void>((resolve, reject) => {
        if (document.querySelector("script[data-face-api]")) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
        script.dataset.faceApi = "1";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("face-api failed"));
        document.body.appendChild(script);
      });

      const faceapi = window.faceapi as {
        nets: {
          tinyFaceDetector: { loadFromUri: (u: string) => Promise<void> };
          faceLandmark68Net: { loadFromUri: (u: string) => Promise<void> };
          faceRecognitionNet: { loadFromUri: (u: string) => Promise<void> };
        };
        TinyFaceDetectorOptions: new (o: { inputSize: number; scoreThreshold: number }) => unknown;
        detectSingleFace: (el: HTMLVideoElement, opts: unknown) => {
          withFaceLandmarks: () => {
            withFaceDescriptor: () => Promise<{
              descriptor: Float32Array;
              detection: { score: number };
            } | undefined>;
          };
        };
        matchDimensions: (canvas: HTMLCanvasElement, size: { width: number; height: number }) => void;
        resizeResults: (d: unknown, size: { width: number; height: number }) => unknown;
        draw: {
          drawDetections: (c: HTMLCanvasElement, d: unknown) => void;
          drawFaceLandmarks: (c: HTMLCanvasElement, d: unknown) => void;
        };
      };

      const models = "https://di.ajirmed.com/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(models),
        faceapi.nets.faceLandmark68Net.loadFromUri(models),
        faceapi.nets.faceRecognitionNet.loadFromUri(models),
      ]);

      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      if (!videoRef.current || cancelled) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("Look at the camera");

      timer = window.setInterval(async () => {
        const video = videoRef.current;
        const overlay = overlayRef.current;
        if (!video || !overlay || video.readyState < 2) return;
        const displaySize = { width: video.videoWidth || 320, height: video.videoHeight || 240 };
        overlay.width = displaySize.width;
        overlay.height = displaySize.height;
        faceapi.matchDimensions(overlay, displaySize);
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        const ctx = overlay.getContext("2d");
        ctx?.clearRect(0, 0, overlay.width, overlay.height);
        if (detection) {
          const resized = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawDetections(overlay, resized);
          faceapi.draw.drawFaceLandmarks(overlay, resized);
          descriptorRef.current = Array.from(detection.descriptor);
          const conf = Math.round(detection.detection.score * 100);
          setFaceReady(conf >= 90);
          setStatus(`Face detected. Confidence: ${conf}%`);
        } else {
          descriptorRef.current = null;
          setFaceReady(false);
          setStatus(requireFace ? "No face detected." : "No face detected. You can still mark attendance.");
        }
      }, 120);
    }

    boot().catch((err: unknown) => {
      console.error(err);
      setOk(false);
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setStatus("Camera permission was blocked. Allow the camera, or use Check-in / Check-out.");
        return;
      }
      if (name === "NotFoundError") {
        setStatus("No camera was found. Use Check-in / Check-out instead.");
        return;
      }
      setStatus(
        requireFace
          ? "Cannot start the camera or load face models. Use Check-in / Check-out, or try another browser."
          : "Camera unavailable. You can still mark attendance with Check-in / Check-out.",
      );
    });

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [requireFace]);

  async function submit() {
    if (requireFace && !descriptorRef.current) {
      setOk(false);
      setStatus("No clear face captured. Look at the camera and try again.");
      return;
    }
    setBusy(true);
    setOk(null);
    setStatus(mode === "verify" ? "Recording attendance..." : "Saving face template...");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(descriptorRef.current ? { face_vector: descriptorRef.current } : {}),
          ...extraBody,
        }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (res.status === 401) {
        setOk(false);
        setStatus(data.message || "Your session expired. Please sign in again.");
        setTimeout(() => {
          window.location.href = "/scan";
        }, 1200);
        return;
      }
      if (res.status === 403) {
        setOk(false);
        setStatus(data.message || "You do not have permission to do that.");
        return;
      }
      if (data.success) {
        setOk(true);
        setStatus(data.message || "Done");
        if (mode === "verify") {
          setTimeout(() => window.location.reload(), 800);
        }
      } else {
        setOk(false);
        setStatus(data.message || "That did not work. Try again.");
      }
    } catch {
      setOk(false);
      setStatus("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-inner">
        <video ref={videoRef} className="h-auto w-80" autoPlay muted playsInline />
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      </div>
      <p
        className={`mt-3 flex items-center gap-2 text-center text-sm ${
          ok === false ? "text-[#a40606]" : ok === true ? "text-green-700" : "text-slate-600"
        }`}
      >
        {ok === false ? <IconAlert size={16} /> : <IconCamera size={16} />}
        {status}
      </p>
      <button
        type="button"
        disabled={disabled || busy || (requireFace && !faceReady)}
        onClick={submit}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#ff8002] px-5 py-2.5 font-semibold text-white hover:bg-[#d98324] disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        <IconScanFace size={18} />
        {busy ? "Please wait..." : buttonLabel}
      </button>
      {disabled ? (
        <p className="mt-2 text-center text-xs text-slate-500">Face check-in is unavailable because this shift is already complete.</p>
      ) : requireFace && !faceReady ? (
        <p className="mt-2 text-center text-xs text-slate-500">The face button turns on when a face is clearly in view.</p>
      ) : null}
    </div>
  );
}
