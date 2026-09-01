"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * WorkflowScene — a restrained, architectural Three.js visualization of the
 * DismissFlow dismissal journey:
 *
 *   Parent → Request → Teacher → Approval → QR → Gate → Student
 *
 * Soft geometry, controlled movement, subtle depth. A single "dismissal" pulse
 * travels the path. No glow, no neon, no decorative chaos. Respects
 * prefers-reduced-motion by rendering one static frame.
 *
 * Colors are read from the design-system CSS variables at runtime so the scene
 * stays token-driven (no raw hex in source — keeps `npm run check:tokens` green).
 * Mounts client-side only (ssr:false via the dynamic wrapper).
 */

function cssColor(name: string, fallbackRgb: string): string {
  if (typeof window === "undefined") return fallbackRgb;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallbackRgb;
}

// Journey nodes laid out along a gentle, calming arc in 3D space.
const NODES = [
  { key: "parent", label: "Parent" },
  { key: "request", label: "Request" },
  { key: "teacher", label: "Teacher" },
  { key: "approval", label: "Approval" },
  { key: "qr", label: "QR" },
  { key: "gate", label: "Gate" },
  { key: "student", label: "Student" }
];

export function WorkflowScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const primary = cssColor("--color-primary", "rgb(44,86,214)");
    const success = cssColor("--color-success", "rgb(22,134,74)");
    const muted = cssColor("--color-muted-foreground", "rgb(91,101,115)");
    const line = cssColor("--color-border-strong", "rgb(205,211,223)");

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf5f7fa, 9, 18);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 1.1, 8.4);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    // Lighting — soft, even, architectural.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xeef1f6, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(3, 6, 5);
    scene.add(key);

    // Path through the nodes — a calm arc, slightly rising toward release.
    const pts = NODES.map((_, i) => {
      const t = i / (NODES.length - 1);
      const x = (t - 0.5) * 6.4;
      const y = Math.sin(t * Math.PI) * 0.55 - 0.1;
      const z = Math.cos(t * Math.PI * 1.4) * 0.5;
      return new THREE.Vector3(x, y, z);
    });
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);

    // Connecting line — thin, quiet.
    const tubeGeo = new THREE.TubeGeometry(curve, 120, 0.018, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(line),
      roughness: 0.9,
      metalness: 0
    });
    group.add(new THREE.Mesh(tubeGeo, tubeMat));

    // Node markers — small soft spheres with a faint ring.
    const nodeGeoS = new THREE.SphereGeometry(0.16, 24, 24);
    const ringGeo = new THREE.TorusGeometry(0.27, 0.012, 12, 40);
    NODES.forEach((node, i) => {
      const isEnd = i === NODES.length - 1;
      const isStart = i === 0;
      const color = isEnd ? success : isStart ? primary : primary;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.55,
        metalness: 0
      });
      const sphere = new THREE.Mesh(nodeGeoS, mat);
      sphere.position.copy(pts[i]);
      group.add(sphere);

      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(isEnd ? success : muted),
        roughness: 0.8,
        metalness: 0,
        transparent: true,
        opacity: 0.5
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pts[i]);
      ring.lookAt(camera.position);
      group.add(ring);
    });

    // Traveling dismissal pulse.
    const pulseGeo = new THREE.SphereGeometry(0.1, 20, 20);
    const pulseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(primary),
      roughness: 0.4,
      metalness: 0,
      emissive: new THREE.Color(primary),
      emissiveIntensity: 0.25
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    group.add(pulse);

    function resize() {
      const w = host!.clientWidth || 1;
      const h = host!.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf = 0;
    const clock = new THREE.Clock();
    let progress = 0;

    function renderFrame() {
      const p = curve.getPointAt(progress % 1);
      pulse.position.copy(p);
      // Gentle, bounded sway — architectural, not playful.
      group.rotation.y = Math.sin(clock.getElapsedTime() * 0.12) * 0.08;
      renderer.render(scene, camera);
    }

    if (reduceMotion) {
      progress = 0.5;
      renderFrame();
    } else {
      const tick = () => {
        progress = (progress + 0.0016) % 1;
        renderFrame();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      tubeGeo.dispose();
      tubeMat.dispose();
      nodeGeoS.dispose();
      ringGeo.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="h-full w-full"
      role="img"
      aria-label="A calm spatial visualization of the dismissal journey: a parent's request moves through teacher approval and a gate scan to a safe student release."
    />
  );
}
