// Minimal ambient type for the jsqr package (no @types/jsqr published).
// jsQR decodes a QR code from raw RGBA pixel data into a string payload.
//
// Usage in this codebase: `import jsQR from "jsqr"; jsQR(data, width, height);`
declare module "jsqr" {
  type BitMatrix = unknown;
  type Version = unknown;
  type DecodeOptions = {
    inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth";
  };

  export default function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: DecodeOptions
  ): { data: string; location: unknown; version: Version; matrix: BitMatrix } | null;
}