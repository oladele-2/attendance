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

export function QrScanner() {
  const [message, setMessage] = useState("Point your camera at your staff QR code");
  const [ok, setOk] = useState<boolean | null>(null);
  const started = useRef(false);
  const locking = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let scanner: InstanceType<Html5QrcodeCtor> | undefined;

    async function start() {
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
      scanner = new Html5Qrcode("reader");
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
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
              void scanner?.stop().catch(() => undefined);
              setTimeout(() => {
                window.location.href = data.redirect || "/verification";
              }, 800);
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
        },
        () => undefined,
      );
    }

    start().catch((err) => {
      console.error(err);
      setOk(false);
      setMessage("Unable to start the camera. Allow camera access, or use email login.");
    });

    return () => {
      void scanner?.stop().catch(() => undefined);
    };
  }, []);

  return (
    <section className="text-center">
      <div id="reader" className="mx-auto max-w-sm overflow-hidden rounded-xl bg-slate-100" />
      <p
        className={`mt-4 flex items-center justify-center gap-2 text-sm ${
          ok === false ? "text-[#a40606]" : ok === true ? "text-green-700" : "text-slate-600"
        }`}
      >
        {ok === false ? <IconAlert size={16} /> : <IconQr size={16} />}
        {message}
      </p>
    </section>
  );
}
