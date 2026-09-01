"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * WorkflowVisual — wraps the Three.js WorkflowScene with a graceful fallback.
 *
 * - Client-only (ssr:false) so WebGL never runs on the server.
 * - If the browser has no WebGL, we show a calm static SVG of the same journey.
 * - The SVG also serves as the loading state.
 *
 * The visualization is decorative; all essential information is in the adjacent
 * prose and the accessible label on the canvas, so it never hides meaning.
 */

const STEPS = [
  "Parent",
  "Request",
  "Teacher",
  "Approval",
  "QR",
  "Gate",
  "Student"
];

function WorkflowFallback() {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      role="img"
      aria-label="The dismissal journey: a parent's request moves through teacher approval and a gate scan to a safe student release."
    >
      <svg
        viewBox="0 0 680 120"
        className="h-auto w-full max-w-[34rem]"
        fill="none"
        aria-hidden="true"
      >
        <line
          x1="40"
          y1="60"
          x2="640"
          y2="60"
          className="stroke-border-strong"
          strokeWidth="2"
        />
        {STEPS.map((s, i) => {
          const x = 40 + (i / (STEPS.length - 1)) * 600;
          const isEnd = i === STEPS.length - 1;
          return (
            <g key={s}>
              <circle
                cx={x}
                cy={60}
                r={isEnd ? 13 : 10}
                className={isEnd ? "fill-success" : "fill-primary"}
              />
              <text
                x={x}
                y={92}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px] font-medium"
              >
                {s}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const WorkflowScene = dynamic(
  () => import("./WorkflowScene").then((m) => m.WorkflowScene),
  { ssr: false, loading: () => <WorkflowFallback /> }
);

export function WorkflowVisual() {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setHasWebGL(!!gl);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  if (!hasWebGL) return <WorkflowFallback />;
  return <WorkflowScene />;
}
