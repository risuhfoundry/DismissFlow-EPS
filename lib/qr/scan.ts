"use client";

import { useEffect, useRef, useState } from "react";

// Browser-camera QR scanner for the Gate portal.
//
// Source of truth: Docs/architecture.md §4.2, §8 — the gate client decodes the
// QR into an opaque token and ships it to the server. The browser is NEVER
// authoritative about whether the token is valid; the server validates the
// hash, expiry, and single-use state and returns the verdict.
//
// We use the standard BarcodeDetector Web API when available (Chrome / Edge
// desktop, modern Android, and Safari 17+ in iOS), with a manual-entry
// fallback that the UI surfaces. Detection runs against the supplied
// <video> element; the caller subscribes to onDetect(token) and tears the
// detector down on stop.

type DetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
};

function getDetector(): DetectorLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { BarcodeDetector?: { new (opts: { formats: string[] }): DetectorLike } };
  if (!w.BarcodeDetector) return null;
  try {
    return new w.BarcodeDetector({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

export type ScannerStatus = "idle" | "requesting" | "scanning" | "denied" | "error";

export function useQrScanner(onDetect: (token: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError(null);
    if (status === "scanning" || status === "requesting") return;
    const detector = getDetector();
    if (!detector) {
      setStatus("error");
      setError(
        "BarcodeDetector is not available in this browser. Use the manual entry field below."
      );
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setStatus("error");
      setError("Camera access is not available.");
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
      setStatus("scanning");
      const loop = async () => {
        if (!videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          for (const c of codes) {
            if (c.rawValue) {
              onDetectRef.current(c.rawValue);
              return;
            }
          }
        } catch {
          /* ignore per-frame errors */
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      const err = e as { name?: string; message?: string };
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        setStatus("denied");
        setError("Camera permission was denied. Allow camera access and try again.");
      } else {
        setStatus("error");
        setError(err?.message ?? "Could not start the camera.");
      }
    }
  }

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
    setStatus("idle");
  }

  return { videoRef, status, error, start, stop };
}
