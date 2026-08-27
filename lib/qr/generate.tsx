"use client";

import QRCode from "react-qr-code";

// Frontend QR rendering for DismissFlow EPS.
//
// Responsibility (Docs/architecture.md §3.4, §8.6): the browser turns the
// server-issued token into a scannable image. It does NOT generate the token
// (that is server authority) and it encodes NOTHING but the token string — no
// student name, admission number, or guardian PII (PRD §14, §21).
//
// The opaque `token` is the sole QR payload. All meaning is resolved server-side
// during a future scan (Phase 4+). Colors are matched to the dark/bone palette
// used by the Parent portal so the code reads as one system.

export function DismissalQr({
  token,
  size = 176
}: {
  token: string;
  size?: number;
}) {
  return (
    <QRCode
      value={token}
      size={size}
      level="M"
      fgColor="#16140F"
      bgColor="#F1E8DC"
      style={{ height: "auto", width: "100%", display: "block" }}
    />
  );
}
