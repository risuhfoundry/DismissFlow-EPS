"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// Browser-camera QR scanner for the Gate portal.
//
// Source of truth: Docs/architecture.md §4.2, §8 — the gate client decodes the
// QR into an opaque token and ships it to the server. The browser is NEVER
// authoritative about whether the token is valid; the server validates the
// hash, expiry, and single-use state and returns the verdict.
//
// We use the `jsQR` decoder (a small, production-grade pure-JS QR reader) over
// the raw camera stream via getUserMedia + a hidden <canvas>. This supports the
// broad set of mobile/desktop browsers a school gate might use (unlike the
// BarcodeDetector Web API, which is absent on Firefox and older Safari) and lets
// us own the full camera lifecycle: permission handling, "no camera" / "denied"
// states, pausing after a detection, and releasing the camera on unmount.
//
// The scanner ONLY produces a token string. It never inspects, validates, logs,
// or persists the QR contents — that is the server's job (scan-qr Edge Function).
//
// The caller subscribes via onDetect(token) and tears the scanner down with
// stop(). After a successful detection the loop is paused (so the same QR in
// view is not re-processed); call resume() to start reading the next code.

export type ScannerStatus = "idle" | "requesting" | "scanning" | "denied" | "error";

export function useQrScanner(onDetect: (token: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Stop the decode loop and release the camera. Safe to call repeatedly.
  function stop() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const v = videoRef.current;
    if (v) v.srcObject = null;
    pausedRef.current = false;
    setStatus("idle");
  }

  // Tear down on unmount so the camera is always released when leaving the page.
  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loop() {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas) return;

    // While paused (a result is already shown) we keep the loop alive but skip
    // decoding, so a later resume() transparently continues scanning.
    if (!pausedRef.current && v.readyState >= 2) {
      const w = v.videoWidth;
      const h = v.videoHeight;
      if (w > 0 && h > 0) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, w, h);
          if (code?.data) {
            // Pause immediately so the same code in view is not re-processed
            // while the operator reads the result.
            pausedRef.current = true;
            onDetectRef.current(code.data);
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  async function start() {
    setError(null);
    if (status === "scanning" || status === "requesting") return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus("error");
      setError("Camera access is not available on this device or browser.");
      return;
    }

    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;

      const v = videoRef.current;
      if (!v) {
        stop();
        return;
      }
      v.srcObject = stream;
      await v.play();

      pausedRef.current = false;
      setStatus("scanning");
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const err = e as { name?: string; message?: string };
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        setStatus("denied");
        setError(
          "Camera permission was denied. Allow camera access for this site and try again."
        );
      } else if (
        err?.name === "NotFoundError" ||
        err?.name === "OverconstrainedError" ||
        err?.name === "DevicesNotFoundError"
      ) {
        setStatus("error");
        setError("No camera was found on this device.");
      } else {
        setStatus("error");
        setError(err?.message ?? "Could not start the camera.");
      }
    }
  }

  // Resume decoding after a paused (post-detection) state. No-op unless the
  // camera is currently live and scanning.
  function resume() {
    if (status === "scanning") {
      pausedRef.current = false;
    }
  }

  return { videoRef, canvasRef, status, error, start, stop, resume };
}
