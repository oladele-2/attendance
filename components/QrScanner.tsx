"use client";

import { useEffect, useRef, useState } from "react";
import { IconAlert, IconQr } from "./icons";

type Html5QrcodeCtor = new (id: string) => {
  start: (
    camera: { facingMode: string },
    config: { fps: number; qrbox: number },
    onSuccess: (text: string) => void,
    onError?: (err: string) => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
};

function stopAllCameras() {
  document.querySelectorAll("video").forEach((video) => {
    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    video.srcObject = null;
  });
}

export function QrScanner() {
  const [message, setMessage] = useState("Use email or phone to sign in, or open the camera to scan a staff QR code.");
  const [ok, setOk] = useState<boolean | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const locking = useRef(false);
  const scannerRef = useRef<InstanceType<Html5QrcodeCtor> | undefined>(undefined);

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
      scannerRef.current = undefined;
      stopAllCameras();
    };
  }, []);

  async function stopScanner() {
    try {
      await scannerRef.current?.stop();
    } catch {
      // already stopped
    }
    scannerRef.current = undefined;
    stopAllCameras();
    setCameraOn(false);
  }

  async function closeCamera() {
    await stopScanner();
    setOk(null);
    setMessage("Camera closed. Sign in with email or phone, or open the camera again to scan.");
  }

  async function openCamera() {
    setCameraOn(true);
    setOk(null);
    setMessage("Starting camera...");
    try {
      await new Promise<void>((resolve, reject) => {
        if (document.querySelector("script[data-html5-qrcode]")) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        script.dataset.html5Qrcode = "1";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("QR library failed to load"));
        document.body.appendChild(script);
      });

      const Html5Qrcode = (window as unknown as { Html5Qrcode: Html5QrcodeCtor }).Html5Qrcode;
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      const onDecoded = async (decodedText: string) => {
        if (locking.current) return;
        try {
          const qrData = JSON.parse(decodedText) as { user_id?: number };
          if (!qrData.user_id) {
            setOk(false);
            setMessage("That QR code is not a staff login code.");
            return;
          }
          locking.current = true;
          setOk(null);
          setMessage("QR scanned. Signing you in...");
          const res = await fetch("/api/qr-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: qrData.user_id }),
          });
          const data = (await res.json()) as { success?: boolean; message?: string; redirect?: string };
          if (data.success) {
            setOk(true);
            setMessage(data.message || "Login successful");
            await stopScanner();
            setTimeout(() => {
              window.location.href = data.redirect || "/verification";
            }, 400);
          } else {
            setOk(false);
            setMessage(data.message || "Login failed. Try again or use email and password.");
            locking.current = false;
          }
        } catch {
          locking.current = false;
          setOk(false);
          setMessage("Invalid QR code content. Use a staff attendance card.");
        }
      };
      try {
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, onDecoded, () => undefined);
      } catch {
        await scanner.start({ facingMode: "user" }, { fps: 10, qrbox: 250 }, onDecoded, () => undefined);
      }
      setMessage("Point your camera at your staff QR code");
    } catch (err) {
      console.error(err);
      await stopScanner();
      setOk(false);
      setMessage("Unable to start the camera. Allow camera access, or use email login.");
    }
  }

  return (
    <section className="text-center">
      <div id="reader" className={`mx-auto max-w-sm overflow-hidden rounded-xl bg-slate-100 ${cameraOn ? "min-h-40" : ""}`} />
      <p
        className={`mt-4 flex items-center justify-center gap-2 text-sm ${
          ok === false ? "text-[#a40606]" : ok === true ? "text-green-700" : "text-slate-600"
        }`}
      >
        {ok === false ? <IconAlert size={16} /> : <IconQr size={16} />}
        {message}
      </p>
      {cameraOn ? (
        <button
          type="button"
          onClick={() => void closeCamera()}
          className="mt-3 text-sm font-semibold text-slate-600 hover:text-[#a40606]"
        >
          Close camera
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void openCamera()}
          className="mt-3 text-sm font-semibold text-[#ff8002] hover:underline"
        >
          Open camera to scan QR
        </button>
      )}
    </section>
  );
}
