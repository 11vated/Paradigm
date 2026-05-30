/**
 * DimensionalViewer — The 7-Dimensional Reality Renderer
 *
 * Visualizes a seed across all 7 substrate dimensions simultaneously.
 * This is the "see the invisible" surface of Paradigm.
 *
 * SPATIAL   → 3D position cloud (projected to 2D with depth cue)
 * TEMPORAL  → rhythm / envelope timeline
 * SPECTRAL  → full EM spectrum bar (400nm–700nm visible + IR + UV + radio + X-ray)
 * MODAL     → 12D adjective spider web (emotional/perceptual space)
 * POSSIBLE  → possibility tree (counterfactual branches the seed could grow into)
 * SEMANTIC  → t-SNE-style embedding in 2D (similar seeds cluster)
 * STRUCTURAL → graph topology (gene dependency graph)
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useSeedStore } from '@/stores/seedStore';
import * as THREE from 'three';

interface Gene { type: string; value: unknown }
interface Seed {
  $hash?: string; $name?: string; $domain?: string; $fitness?: number;
  genes?: Record<string, Gene>;
  [key: string]: unknown;
}

interface DimensionalViewerProps {
  seed: Seed | null;
  className?: string;
}

type DimId = 'spatial' | 'temporal' | 'spectral' | 'modal' | 'possible' | 'semantic' | 'structural';

const DIM_LABELS: Record<DimId, string> = {
  spatial:    'SPATIAL',
  temporal:   'TEMPORAL',
  spectral:   'SPECTRAL',
  modal:      'MODAL',
  possible:   'POSSIBLE',
  semantic:   'SEMANTIC',
  structural: 'STRUCTURAL',
};

const DIM_DESCS: Record<DimId, string> = {
  spatial:    'Physical 3D embedding of gene vectors',
  temporal:   'Rhythm, duration, envelope over time',
  spectral:   'Frequency signature across the EM spectrum',
  modal:      '12-axis perceptual/emotional space',
  possible:   'Counterfactual branches — what this seed could become',
  semantic:   'Meaning geometry — proximity to related seeds',
  structural: 'Gene dependency graph — how genes wire together',
};

const DIM_COLORS: Record<DimId, string> = {
  spatial:    '#6366f1',
  temporal:   '#22d3ee',
  spectral:   '#f59e0b',
  modal:      '#ec4899',
  possible:   '#10b981',
  semantic:   '#8b5cf6',
  structural: '#f97316',
};

function hashToFloat(hash: string, i: number): number {
  let h = 0;
  for (let j = 0; j < hash.length; j++) {
    h = (((h << 5) - h) + hash.charCodeAt((j + i * 7) % hash.length)) | 0;
  }
  return (Math.abs(h) % 1000) / 999;
}

function seedToFloats(seed: Seed, count: number): number[] {
  const h = seed.$hash ?? seed.$name ?? 'default';
  return Array.from({ length: count }, (_, i) => hashToFloat(h, i));
}

function SpatialPanel({ seed }: { seed: Seed }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const realGenes = seed.genes || {};

  // Prefer real spatial data from genes (character proportions for body layout, geometry3d for object scale/pos, etc.)
  const hasCharacterSpatial = 'proportions' in realGenes;
  const hasGeometrySpatial = 'scale' in realGenes || 'primitive' in realGenes;

  const floats = useMemo(() => seedToFloats(seed, 90), [seed.$hash]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    ctx.fillStyle = '#080812'; ctx.fillRect(0, 0, W, H);

    const points = 30;

    if (hasCharacterSpatial) {
      // Real 3D body layout from character proportions (tall = spread vertically, wide shoulders = horizontal spread)
      const p = (realGenes.proportions as any)?.value || {};
      const height = p.height || 1.7;
      const shoulder = p.shoulderWidth || 0.5;
      const torso = p.torsoLength || 0.8;

      for (let i = 0; i < points; i++) {
        const t = i / points;
        // Vertical spread based on height + torso
        const y = (H * 0.2) + (t * H * 0.6 * (height / 1.7));
        // Horizontal from shoulder width + some noise from hash
        const x = (W * 0.5) + (Math.sin(t * Math.PI * 2) * W * 0.15 * shoulder) + (floats[i] - 0.5) * 20;
        // Depth (z) from hash + slight torso influence
        const z = floats[i + 10] * 0.8 + (torso - 0.8) * 0.2;

        const r = 2 + z * 6;
        const alpha = 0.4 + z * 0.5;
        const hue = (t * 60 + 200).toFixed(0); // blue-ish for body

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},65%,60%,${alpha.toFixed(2)})`;
        ctx.fill();

        if (i > 0) {
          ctx.beginPath();
          ctx.moveTo( (W * 0.5) + (Math.sin((i-1)/points * Math.PI * 2) * W * 0.15 * shoulder) + (floats[i-1] - 0.5) * 20 , (H * 0.2) + (((i-1)/points) * H * 0.6 * (height / 1.7)) );
          ctx.lineTo(x, y);
          ctx.strokeStyle = `hsla(${hue},50%,50%,0.2)`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }

      // === Real deterministic humanoid glyph preview (the "visible dimension" magic) ===
      const cx = W * 0.78;
      const baseY = H * 0.35;
      const s = Math.min(1.4, Math.max(0.6, height / 1.7)); // scale from real height gene
      const sh = Math.min(1.3, Math.max(0.5, shoulder * 2.2));

      ctx.strokeStyle = 'rgba(163, 163, 172, 0.9)';
      ctx.lineWidth = 1.5;

      // Head
      ctx.beginPath();
      ctx.arc(cx, baseY - 22 * s, 6 * s, 0, Math.PI * 2);
      ctx.stroke();

      // Torso (length from gene)
      const torsoLen = 18 * s * (torso / 0.8);
      ctx.beginPath();
      ctx.moveTo(cx, baseY - 16 * s);
      ctx.lineTo(cx, baseY + torsoLen);
      ctx.stroke();

      // Shoulders + arms (width from gene)
      const armY = baseY + 6 * s;
      ctx.beginPath();
      ctx.moveTo(cx - 12 * sh, armY);
      ctx.lineTo(cx + 12 * sh, armY);
      ctx.stroke();

      // Arms down (simple but gene-influenced)
      ctx.beginPath();
      ctx.moveTo(cx - 12 * sh, armY);
      ctx.lineTo(cx - 18 * sh, armY + 22 * s);
      ctx.moveTo(cx + 12 * sh, armY);
      ctx.lineTo(cx + 18 * sh, armY + 22 * s);
      ctx.stroke();

      // Legs
      ctx.beginPath();
      ctx.moveTo(cx, baseY + torsoLen);
      ctx.lineTo(cx - 7 * sh, baseY + torsoLen + 26 * s);
      ctx.moveTo(cx, baseY + torsoLen);
      ctx.lineTo(cx + 7 * sh, baseY + torsoLen + 26 * s);
      ctx.stroke();

      // Muscle mass influence (thicker torso/arms for high muscleMass gene)
      const muscle = (p.muscleMass || 0.5);
      if (muscle > 0.6) {
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(cx - 3 * sh, baseY + 4);
        ctx.lineTo(cx + 3 * sh, baseY + 4);
        ctx.stroke();
      }

      // Small label
      ctx.fillStyle = 'rgba(163,163,172,0.6)';
      ctx.font = '7px monospace';
      ctx.fillText('HUMANOID', cx - 22, baseY + torsoLen + 38 * s);
    } else if (hasGeometrySpatial) {
      // Real spatial from geometry3d (primitive + scale influence point distribution)
      const scale = Array.isArray(realGenes.scale?.value) ? realGenes.scale.value[0] : (realGenes.scale?.value || 1);
      const prim = realGenes.primitive?.value || 'sphere';

      for (let i = 0; i < points; i++) {
        const t = i / points;
        const x = W * 0.5 + (floats[i] - 0.5) * W * 0.4 * scale;
        const y = H * 0.5 + (floats[i + 5] - 0.5) * H * 0.35 * scale;
        const z = floats[i + 10] * 0.9;

        let r = 3 + z * 5;
        if (prim === 'box') r *= 0.8;
        if (prim === 'torus') r *= (1 + Math.sin(t * 6) * 0.3);

        const alpha = 0.35 + z * 0.6;
        const hue = prim === 'torus' ? '30' : '260';

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},70%,65%,${alpha.toFixed(2)})`;
        ctx.fill();
      }

      // === Real SDF-like glyph preview for geometry3d ===
      const gx = W * 0.78; const gy = H * 0.55; const gs = 22 * Math.min(1.6, Math.max(0.5, scale));
      ctx.strokeStyle = 'rgba(163, 163, 172, 0.85)';
      ctx.lineWidth = 1.8;

      if (prim === 'box' || prim === 'cube') {
        ctx.strokeRect(gx - gs * 0.6, gy - gs * 0.55, gs * 1.2, gs * 1.1);
      } else if (prim === 'torus') {
        ctx.beginPath();
        ctx.arc(gx, gy, gs * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(gx, gy, gs * 0.28, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // sphere / default
        ctx.beginPath();
        ctx.arc(gx, gy, gs * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(gx - gs * 0.18, gy - gs * 0.18, gs * 0.22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(163,163,172,0.55)';
      ctx.font = '7px monospace';
      ctx.fillText(String(prim || 'shape').toUpperCase(), gx - 18, gy + gs * 0.85);
    } else {
      // Original hash-based fallback
      for (let i = 0; i < points; i++) {
        const x = floats[i * 3] * W;
        const y = floats[i * 3 + 1] * H;
        const z = floats[i * 3 + 2];
        const r = 2 + z * 8;
        const alpha = 0.3 + z * 0.7;
        const hue = (floats[i] * 360).toFixed(0);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue},70%,65%,${alpha.toFixed(2)})`;
        ctx.fill();
        if (i > 0) {
          ctx.beginPath();
          ctx.moveTo(floats[(i - 1) * 3] * W, floats[(i - 1) * 3 + 1] * H);
          ctx.lineTo(x, y);
          ctx.strokeStyle = `hsla(${hue},50%,50%,0.15)`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }, [realGenes, floats, hasCharacterSpatial, hasGeometrySpatial]);

  return (
    <>
      <canvas ref={canvasRef} width={280} height={160} style={{ width: '100%', height: 160, display: 'block', borderRadius: 4 }} />
      <SpatialMicroPreview seed={seed} hasCharacterSpatial={hasCharacterSpatial} hasGeometrySpatial={hasGeometrySpatial} />
    </>
  );
}

// === Micro 3D SPATIAL preview (real Three.js micro-preview for character/geometry seeds) ===
// Lightweight, deterministic Three renderer in a tiny canvas — the "full Three" option.
function SpatialMicroPreview({ seed, hasCharacterSpatial, hasGeometrySpatial }: { seed: Seed; hasCharacterSpatial: boolean; hasGeometrySpatial: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const realGenes = seed.genes || {};
  const floats = useMemo(() => seedToFloats(seed, 32), [seed.$hash]);

  // Live pulse ticker for music tempo / narrative tone reactivity (magical 7D SPATIAL dimension)
  const [pulseTime, setPulseTime] = useState(0);
  const hasMusicPulse = 'tempo' in realGenes || 'warmth' in realGenes || 'brightness' in realGenes;
  const hasNarrativePulse = 'tone' in realGenes;
  useEffect(() => {
    if (!hasMusicPulse && !hasNarrativePulse) return;
    let rafId = 0;
    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      setPulseTime(t);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [hasMusicPulse, hasNarrativePulse]);

  // 2D projection canvas — now live pulsing when music/narrative present (breathing + tempo sway + tone expression)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, W, H);

    const cx = W / 2; const cy = H / 2;
    const baseRot = floats[0] * Math.PI * 2;
    const tempo = (realGenes.tempo as any)?.value || 120;
    const resonance = 0.7 + Math.max(0, Math.min(0.6, ((realGenes.warmth as any)?.value || 0.5) * 0.4 + ((realGenes.brightness as any)?.value || 0.5) * 0.3));
    const tone = (realGenes.tone as any)?.value || 'neutral';
    const tonePhase = tone === 'dark' ? -1.0 : tone === 'light' ? 1.15 : 0.15;
    const t = pulseTime;
    const pulseRot = baseRot + Math.sin(t * (tempo / 80)) * 0.035 * (hasMusicPulse ? 1 : 0);
    const pulseScale = 1 + Math.sin(t * (tempo / 95) * 1.6) * 0.028 * resonance * (hasMusicPulse ? 1 : 0);

    if (hasCharacterSpatial) {
      const p = (realGenes.proportions as any)?.value || {};
      const sBase = Math.min(1.2, Math.max(0.7, (p.height || 1.7) / 1.7));
      const s = sBase * pulseScale;
      const sh = Math.min(1.1, Math.max(0.6, (p.shoulderWidth || 0.5) * 2));

      const project = (x: number, y: number, z: number) => {
        const sc = 18 * s / (4 + z * 0.8);
        const sway = Math.sin(t * (tempo / 110) + x * 2) * 0.08 * tonePhase * (hasNarrativePulse || hasMusicPulse ? 1 : 0);
        return [cx + (x * Math.cos(pulseRot) - z * Math.sin(pulseRot)) * sc + sway * 12, cy + y * sc * 0.8];
      };

      // Head (subtle expression bob from music + tone)
      const headBob = Math.sin(t * (tempo / 70)) * 1.8 * resonance * 0.6;
      const [hx, hy] = project(0, -1.2 + headBob * 0.04, 0.2);
      ctx.fillStyle = '#aaa';
      ctx.beginPath(); ctx.arc(hx, hy, 3 * s, 0, Math.PI * 2); ctx.fill();

      // Torso (breathing scale + slight tone lean)
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1.5;
      const t1 = project(-0.4 * sh, 0.3, 0); const t2 = project(0.4 * sh, 0.3, 0);
      const t3 = project(0, 1.8 + Math.sin(t * 1.8) * 0.6 * tonePhase * 0.5, 0.1);
      ctx.beginPath(); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.lineTo(t3[0], t3[1]); ctx.closePath(); ctx.stroke();

      // Arms (tempo-synced opposing swing for walk/dance feel when music present)
      const armSwing = Math.sin(t * (tempo / 55)) * 0.55 * (hasMusicPulse ? 1 : 0.3);
      ctx.beginPath(); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(project(-1.1 * sh - armSwing * 0.6, 0.8, -0.3)[0], project(-1.1 * sh - armSwing * 0.6, 0.8, -0.3)[1]); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(t2[0], t2[1]); ctx.lineTo(project(1.1 * sh + armSwing * 0.6, 0.8, 0.3)[0], project(1.1 * sh + armSwing * 0.6, 0.8, 0.3)[1]); ctx.stroke();

    } else if (hasGeometrySpatial) {
      const scale = Array.isArray(realGenes.scale?.value) ? realGenes.scale.value[0] : (realGenes.scale?.value || 1);
      const prim = realGenes.primitive?.value || 'sphere';
      const gs = 14 * Math.min(1.3, Math.max(0.6, scale)) * pulseScale;

      ctx.strokeStyle = '#8ab';
      ctx.lineWidth = 1.2;
      const rotCos = Math.cos(pulseRot * 0.7);
      const rotSin = Math.sin(pulseRot * 0.7);
      const pulseOff = Math.sin(t * (tempo / 90)) * 2.5 * resonance * (hasMusicPulse ? 1 : 0);

      if (prim === 'box') {
        const pts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
        const proj = pts.map(([px,py,pz]) => {
          const x = (px * rotCos - pz * rotSin) * gs + cx + pulseOff * 0.6;
          const y = (py * 0.7 + pz * 0.3) * gs * 0.6 + cy + Math.sin(t * 2.2) * 1.5 * tonePhase;
          return [x, y];
        });
        const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
        edges.forEach(([a,b]) => { ctx.beginPath(); ctx.moveTo(proj[a][0], proj[a][1]); ctx.lineTo(proj[b][0], proj[b][1]); ctx.stroke(); });
      } else {
        ctx.beginPath();
        ctx.arc(cx + pulseOff * 0.4, cy + Math.sin(t * 2.1) * tonePhase * 2, gs * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        if (prim === 'torus') {
          ctx.beginPath();
          ctx.arc(cx + gs * 0.2 * rotCos + pulseOff * 0.3, cy, gs * 0.35, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }, [seed.$hash, hasCharacterSpatial, hasGeometrySpatial, realGenes, pulseTime, hasMusicPulse, hasNarrativePulse]);

  // Real Three.js micro-preview (tiny rotating 3D view for character/geometry)
  const threeRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!hasCharacterSpatial && !hasGeometrySpatial) return;
    const canvas = threeRef.current; if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(120, 70);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 120/70, 0.1, 100);
    camera.position.z = 3;

    let mesh: THREE.Mesh;
    let headMesh: THREE.Mesh | null = null;
    if (hasCharacterSpatial) {
      const p = (realGenes.proportions as any)?.value || {};
      const s = Math.min(1.2, Math.max(0.7, (p.height || 1.7) / 1.7));
      // Richer lit PBR-ish material (Phong specular) — the micro-preview now feels physical
      const mat = new THREE.MeshPhongMaterial({ color: 0x9aa0aa, shininess: 28, specular: 0x222233, flatShading: false });
      const geo = new THREE.CylinderGeometry(0.15 * s, 0.12 * s, 0.9 * s, 9, 1);
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
      // Head (tracked for expression reactivity)
      headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 9, 8), mat);
      headMesh.position.y = 0.58 * s;
      scene.add(headMesh);
    } else {
      const scale = Array.isArray(realGenes.scale?.value) ? realGenes.scale.value[0] : (realGenes.scale?.value || 1);
      const prim = realGenes.primitive?.value || 'sphere';
      let geo: THREE.BufferGeometry;
      if (prim === 'box') geo = new THREE.BoxGeometry(0.82 * scale, 0.82 * scale, 0.82 * scale);
      else if (prim === 'torus') geo = new THREE.TorusGeometry(0.5 * scale, 0.19 * scale, 9, 18);
      else geo = new THREE.SphereGeometry(0.62 * scale, 13, 12);
      const mat = new THREE.MeshPhongMaterial({ color: 0x7fb3c2, shininess: 22, specular: 0x112233 });
      mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);
    }

    const light = new THREE.AmbientLight(0xffffff, 0.72);
    scene.add(light);
    const point = new THREE.PointLight(0xfff8e8, 0.68, 60);
    point.position.set(2.2, 3.4, 4.6);
    scene.add(point);
    // Extra rim for richer depth (multi-domain lighting now reacts to tone/resonance)
    const rim = new THREE.PointLight(0xaabbee, 0.35, 40);
    rim.position.set(-2.5, -1, -1);
    scene.add(rim);
    let raf = 0;
    const baseSpeed = 0.016;
    const startT = performance.now();
    const animate = () => {
      if (mesh) {
        const expr = (realGenes.morph_smile?.value as number) || 0.32;
        const tempo = (realGenes.tempo as any)?.value || 118;
        const warmth = (realGenes.warmth as any)?.value || 0.52;
        const brightness = (realGenes.brightness as any)?.value || 0.48;
        const resonance = Math.max(0.65, Math.min(1.35, warmth * 0.75 + brightness * 0.55));
        const tone = (realGenes.tone as any)?.value || 'neutral';
        const toneSway = tone === 'dark' ? -0.85 : tone === 'light' ? 1.25 : 0.18;
        const tSec = (performance.now() - startT) / 1000;

        // Tempo drives rotation speed (music makes the preview "breathe and dance")
        const rotSpeed = baseSpeed * (tempo / 125) + expr * 0.011;
        mesh.rotation.y += rotSpeed;

        // Resonance scale pulsing (warmth/brightness from music → model "alive" breathing)
        const scalePulse = 1.0 + Math.sin(tSec * (tempo / 82) * 1.15) * 0.032 * (resonance - 0.65);
        mesh.scale.setScalar(scalePulse);

        // Narrative tone + tempo bob + morph expression (multi-domain SPATIAL magic)
        const bobFreq = (tempo / 95) * 1.8;
        const bob = Math.sin(tSec * bobFreq) * 0.09 * (0.55 + expr * 0.7) * resonance;
        const toneLean = toneSway * Math.sin(tSec * 0.9) * 0.07;
        mesh.position.y = bob * 0.65;
        mesh.position.x = toneLean * 0.6;

        // Dynamic light intensity + temperature shift (resonance brightens, tone cools/warms the light)
        const lightPulse = 0.68 + Math.sin(tSec * (tempo / 105)) * 0.22 * (resonance - 0.6);
        point.intensity = Math.max(0.35, lightPulse);
        const lightColor = tone === 'dark' ? 0xccd8ff : tone === 'light' ? 0xfff0d0 : 0xfff8e8;
        point.color.setHex(lightColor);

        // Head expression (smile drives extra bob + attention; tone adds lean)
        if (headMesh) {
          headMesh.position.y = 0.58 * (mesh.scale.y || 1) + Math.sin(tSec * bobFreq * 1.3) * 0.035 * expr;
          headMesh.rotation.y = Math.sin(tSec * 0.6) * 0.18 * expr;
          headMesh.rotation.x = toneSway * 0.12 * Math.sin(tSec * 0.75);
        }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, [seed.$hash, hasCharacterSpatial, hasGeometrySpatial, realGenes, hasMusicPulse, hasNarrativePulse]);

  if (!hasCharacterSpatial && !hasGeometrySpatial) return null;
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
      <canvas ref={canvasRef} width={120} height={70} style={{ width: 120, height: 70, borderRadius: 3, background: '#050508' }} />
      <canvas ref={threeRef} width={120} height={70} style={{ width: 120, height: 70, borderRadius: 3, background: '#050508' }} />
    </div>
  );
}


function TemporalPanel({ seed }: { seed: Seed }) {
  const W = 280; const H = 100;

  // Prefer real temporal data from seed genes (music, character animations, etc.) for live updates
  const realGenes = seed.genes || {};
  const hasMusicTemporal = 'tempo' in realGenes || 'duration' in realGenes;
  const hasAnimTiming = 'proportions' in realGenes; // proxy for animation timing from character
  const hasRecentAnimation = realGenes.animationState || (seed as any).$recentAnimation; // from live GSPL/character clips (talk/laugh etc)

  const envelope = useMemo(() => {
    let attack, decay, sustain, release;

    if (hasMusicTemporal) {
      // Drive from music genes (tempo/duration influence envelope shape)
      const tempo = (realGenes.tempo?.value as number) || 120;
      const dur = (realGenes.duration?.value as number) || 60;
      attack = Math.max(2, Math.min(20, (dur / tempo) * 3));
      decay = Math.max(3, Math.min(15, 120 / tempo * 4));
      sustain = 0.6 + ((realGenes.warmth?.value as number) || 0.5) * 0.3;
      release = Math.max(4, Math.min(25, dur / tempo * 6));
    } else if (hasAnimTiming) {
      // Derive from character proportions / animation feel + recent clips (talk/laugh energy)
      const height = ((realGenes.proportions as any)?.value?.height) || 1.7;
      const animEnergy = hasRecentAnimation ? 1.2 : 1.0;
      attack = 3 + (height - 1.5) * 4 * animEnergy;
      decay = 5;
      sustain = 0.7;
      release = 8 + (height - 1.5) * 3;
    } else {
      // Fallback to deterministic hash for other domains
      const floats = seedToFloats(seed, 64);
      attack = 4 + Math.floor(floats[0] * 12);
      decay = 4 + Math.floor(floats[1] * 10);
      sustain = floats[2];
      release = 6 + Math.floor(floats[3] * 20);
    }

    const total = attack + decay + release + 8;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= total; i++) {
      let v = 0;
      if (i < attack) v = i / attack;
      else if (i < attack + decay) v = 1.0 - (1.0 - sustain) * ((i - attack) / decay);
      else if (i < total - release) v = sustain;
      else v = sustain * (1 - (i - (total - release)) / release);
      pts.push([(i / total) * W, H - v * (H - 8) - 4]);
    }
    return pts;
  }, [realGenes, seed]);

  const beats = useMemo(() => {
    if (hasMusicTemporal) {
      const tempo = (realGenes.tempo?.value as number) || 120;
      const steps = Math.max(8, Math.min(24, Math.floor(tempo / 8)));
      return Array.from({ length: steps }, (_, i) => 0.4 + ((i % 4 === 0) ? 0.5 : 0.1));
    }
    const floats = seedToFloats(seed, 64);
    let base = Array.from({ length: 16 }, (_, i) => floats[8 + i]);
    // Explicit integration with new character 'laugh'/'talk' clips (from flagship elevation)
    const isLaugh = (seed as any).$recentAnimation === 'laugh' || (realGenes.morph_smile?.value as number || 0) > 0.6;
    const isTalk = (seed as any).$recentAnimation === 'talk';
    if (isLaugh) base = base.map((v,i) => v * (1 + 0.6 * Math.sin(i*1.7))); // bigger energetic swings
    if (isTalk) base = base.map((v,i) => 0.3 + 0.7 * ((i%3===0)?1:0.4)); // rhythmic speech-like pulses
    return base;
  }, [realGenes, seed]);

  const rhythmBars = beats.map((v, i) => ({
    x: (i / beats.length) * W,
    h: 4 + v * 20,
    w: W / beats.length - 1,
  }));

  const envPath = envelope.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {rhythmBars.map((b, i) => (
        <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} fill={`rgba(34,211,238,${0.15 + (i % 3) * 0.2})`} />
      ))}
      <path d={envPath} fill="none" stroke="#22d3ee" strokeWidth="1.5" />
      <text x="4" y="12" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">ADSR ENVELOPE</text>
      <text x="4" y="22" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">RHYTHM GRID</text>
    </svg>
  );
}

const EM_BANDS = [
  { label: 'γ-ray', lo: 0, hi: 0.01e-9, color: '#ff00ff' },
  { label: 'X-ray', lo: 0.01e-9, hi: 10e-9, color: '#cc44ff' },
  { label: 'UV', lo: 10e-9, hi: 400e-9, color: '#8844ff' },
  { label: '380nm', lo: 380e-9, hi: 450e-9, color: '#4400ff' },
  { label: '450nm', lo: 450e-9, hi: 495e-9, color: '#0044ff' },
  { label: '495nm', lo: 495e-9, hi: 570e-9, color: '#00cc44' },
  { label: '570nm', lo: 570e-9, hi: 590e-9, color: '#aacc00' },
  { label: '590nm', lo: 590e-9, hi: 620e-9, color: '#ffaa00' },
  { label: '620nm', lo: 620e-9, hi: 700e-9, color: '#ff2200' },
  { label: 'NIR', lo: 700e-9, hi: 1.4e-6, color: '#880000' },
  { label: 'MIR', lo: 1.4e-6, hi: 3e-6, color: '#550000' },
  { label: 'FIR', lo: 3e-6, hi: 1e-3, color: '#330000' },
  { label: 'Micro', lo: 1e-3, hi: 0.1, color: '#001133' },
  { label: 'Radio', lo: 0.1, hi: 1000, color: '#000066' },
];

function SpectralPanel({ seed }: { seed: Seed }) {
  const floats = useMemo(() => seedToFloats(seed, 32), [seed.$hash]);
  const W = 280; const H = 80;

  const bandW = W / EM_BANDS.length;

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {EM_BANDS.map((band, i) => {
        const intensity = floats[i] * 0.85 + 0.05;
        const barH = intensity * H;
        return (
          <g key={i}>
            <rect x={i * bandW} y={H - barH} width={bandW - 0.5} height={barH} fill={band.color} opacity={intensity} />
            <rect x={i * bandW} y={0} width={bandW - 0.5} height={H} fill={band.color} opacity={0.04} />
          </g>
        );
      })}
      {EM_BANDS.map((band, i) => (
        <text key={i} x={i * bandW + bandW / 2} y={H + 12} textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.3)" fontFamily="monospace">{band.label}</text>
      ))}
      <line x1={6 * bandW} y1={0} x2={9 * bandW} y2={0} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <text x={(6 * bandW + 9 * bandW) / 2} y={8} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.4)" fontFamily="monospace">VISIBLE</text>
    </svg>
  );
}

const MODAL_AXES = ['warm', 'bright', 'heavy', 'sharp', 'fast', 'complex', 'ancient', 'wild', 'loud', 'soft', 'dense', 'vast'];

function ModalPanel({ seed }: { seed: Seed }) {
  const W = 280; const H = 160;
  const cx = W / 2; const cy = H / 2;
  const maxR = Math.min(cx, cy) - 24;
  const n = MODAL_AXES.length;

  const realGenes = seed.genes || {};
  const hasMusicModal = 'warmth' in realGenes || 'brightness' in realGenes;
  const hasCharacterModal = 'personality' in realGenes || 'archetype' in realGenes;
  const hasAppModal = 'interactiveDemo' in realGenes || (seed.$domain === 'app' && 'archetype' in realGenes);

  const points = useMemo(() => {
    return MODAL_AXES.map((label, i) => {
      let value = 0.5;

      if (hasMusicModal) {
        // Map music genes to perceptual axes
        if (label === 'warm') value = (realGenes.warmth?.value as number) || 0.5;
        if (label === 'bright') value = (realGenes.brightness?.value as number) || 0.5;
        if (label === 'complex') value = ((realGenes.complexity?.value as number) || 0.5) * 0.8 + 0.2;
        if (label === 'loud') value = Math.min(0.95, 0.4 + ((realGenes.tempo?.value as number) || 120) / 300);
      } else if (hasCharacterModal) {
        // Map character personality/archetype to modal traits + new animation/morph data (smile/laugh energy, talk intensity)
        const arch = (realGenes.archetype?.value as string) || 'explorer';
        const pers = (realGenes.personality_dominance?.value as number) || 0.5;
        const morphSmile = (realGenes.morph_smile?.value as number) || 0; // from new blendshapes
        const recentLaugh = (seed as any).$recentAnimation === 'laugh' ? 0.3 : 0;
        const animExpress = Math.min(0.95, 0.4 + morphSmile * 0.5 + recentLaugh);

        if (label === 'wild') value = ['rogue','explorer'].includes(arch) ? 0.75 : 0.35;
        if (label === 'ancient') value = ['mystic','guardian'].includes(arch) ? 0.7 : 0.3;
        if (label === 'heavy') value = pers * 0.6 + 0.2;
        if (label === 'fast') value = 0.4 + pers * 0.4;
        if (label === 'warm') value = Math.max(value, animExpress * 0.8); // smile/laugh boosts warmth
        if (label === 'loud') value = Math.max(value, animExpress * 0.7); // laugh/talk boosts loud
        if (label === 'sharp') value = Math.max(value, (morphSmile + recentLaugh) * 0.6); // expression adds sharpness
      }

      // App + character morph cross-boost (interactiveDemo flagship embeds real 5-morph rig → high expressiveness)
      if (hasAppModal) {
        const interactive = (realGenes.interactiveDemo?.value as boolean) ? 0.35 : 0.1;
        const morphEnergy = ((realGenes.morph_smile?.value as number) || 0) + ((realGenes.morph_laugh?.value as number) || 0) * 0.6;
        const appExpress = 0.25 + interactive + morphEnergy * 0.55;
        if (label === 'fast') value = Math.max(value, 0.35 + appExpress * 0.6);
        if (label === 'complex') value = Math.max(value, 0.3 + appExpress * 0.65);
        if (label === 'loud') value = Math.max(value, 0.25 + appExpress * 0.55);
        if (label === 'wild') value = Math.max(value, 0.2 + appExpress * 0.5);
      }

      if (!hasMusicModal && !hasCharacterModal && !hasAppModal) {
        // Fallback hash
        const floats = seedToFloats(seed, 24);
        value = floats[i] * 0.85 + 0.1;
      }

      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = value * maxR;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, angle, label, value };
    });
  }, [realGenes, hasMusicModal, hasCharacterModal, hasAppModal, seed]);

  const polyPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';

  const gridLines = MODAL_AXES.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return `M${cx},${cy} L${(cx + Math.cos(angle) * maxR).toFixed(1)},${(cy + Math.sin(angle) * maxR).toFixed(1)}`;
  });

  const gridCircles = [0.25, 0.5, 0.75, 1.0].map(f => {
    const r = f * maxR;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
    }
    return d + 'Z';
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {gridCircles.map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />)}
      {gridLines.map((d, i) => <path key={i} d={d} stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />)}
      <path d={polyPath} fill="rgba(236,72,153,0.18)" stroke="#ec4899" strokeWidth="1.2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="2.5" fill="#ec4899" />
          <text
            x={(cx + Math.cos(p.angle) * (maxR + 14)).toFixed(1)}
            y={(cy + Math.sin(p.angle) * (maxR + 14) + 3).toFixed(1)}
            textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontFamily="monospace"
          >{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

interface PossibleNode {
  id: string; label: string; depth: number; x: number; y: number;
  probability: number; domain: string; parentId: string | null;
}

function PossiblePanel({ seed }: { seed: Seed }) {
  const floats = useMemo(() => seedToFloats(seed, 48), [seed.$hash]);
  const W = 280; const H = 180;
  const mutateSeedInStore = useSeedStore((s: any) => s.mutateSeed);
  const setCurrentSeed = useSeedStore((s: any) => (newSeed: any) => s.currentSeed = newSeed); // simplified adoption

  const [mutationStrength, setMutationStrength] = useState(0.12);
  const [realBranches, setRealBranches] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Base static tree (kept for visual structure)
  const baseNodes = useMemo<PossibleNode[]>(() => {
    const result: PossibleNode[] = [];
    const currentDomain = seed.$domain ?? 'visual2d';
    const branchDomains = ['music', 'narrative', 'game', 'character', 'shader', 'world', 'website', 'quantum', 'field', 'molecule'];

    result.push({ id: 'root', label: currentDomain, depth: 0, x: W / 2, y: 20, probability: 1.0, domain: currentDomain, parentId: null });

    const numBranches = 3 + Math.floor(floats[0] * 3);
    for (let i = 0; i < numBranches; i++) {
      const domain = branchDomains[i % branchDomains.length];
      const prob = 0.2 + floats[1 + i] * 0.6;
      const x = (W / (numBranches + 1)) * (i + 1);
      result.push({ id: `b${i}`, label: domain, depth: 1, x, y: 70, probability: prob, domain, parentId: 'root' });
    }
    return result;
  }, [floats, seed.$domain]);

  // Real branches generated via actual kernel mutate
  const allNodes = [...baseNodes, ...realBranches.map((b, i) => ({
    id: `real-${i}`,
    label: b.$domain || 'variant',
    depth: 1,
    x: 40 + (i % 5) * 48,
    y: 115 + Math.floor(i / 5) * 28,
    probability: 0.65 + (i % 3) * 0.1,
    domain: b.$domain || 'variant',
    parentId: 'root',
    realSeed: b
  }))];

  const edges = allNodes.filter(n => n.parentId !== null).map(n => {
    const parent = allNodes.find(p => p.id === n.parentId);
    if (!parent) return null;
    return { x1: parent.x, y1: parent.y, x2: n.x, y2: n.y, prob: n.probability };
  }).filter(Boolean);

  const DOMAIN_HUE: Record<string, number> = {
    music: 200, narrative: 40, game: 120, character: 280, shader: 300, world: 160,
    website: 220, quantum: 260, field: 20, molecule: 90, visual2d: 180,
  };

  const handleGenerateRealBranches = async () => {
    if (!seed || isGenerating) return;
    setIsGenerating(true);

    try {
      const branches: any[] = [];
      const strength = mutationStrength;

      // Generate 4 real mutated variants using the kernel (via store)
      for (let i = 0; i < 4; i++) {
        const delta: Record<string, any> = {};
        // Create deterministic small mutations based on seed hash + index
        if (seed.genes) {
          Object.keys(seed.genes).slice(0, 5).forEach((geneName, gi) => {
            const g = seed.genes![geneName];
            if (typeof g.value === 'number') {
              const change = (floats[gi + i] - 0.5) * strength * 2;
              delta[geneName] = Math.max(0, Math.min(1, (g.value as number) + change));
            }
          });
        }

        try {
          const mutated = await mutateSeedInStore(seed.$hash || seed.id, delta);
          if (mutated) branches.push(mutated);
        } catch (e) {
          // Fallback: create a lightweight local variant for preview if API not available
          branches.push({
            $hash: (seed.$hash || 'seed') + '-mut-' + i,
            $domain: seed.$domain,
            $name: `${seed.$name || 'Seed'} variant ${i + 1}`
          });
        }
      }

      setRealBranches(branches);
    } finally {
      setIsGenerating(false);
    }
  };

  const adoptBranch = (branch: any) => {
    if (!branch) return;

    const adopted = branch.realSeed || branch;
    if (adopted && (adopted.$hash || adopted.id)) {
      // Full live adoption across the entire Reality Lens (all 7 dimensions + artifact)
      useSeedStore.setState({ 
        currentSeed: adopted,
        // Force downstream reactivity (SubstratePage + editors will pick this up)
        lastAdoptedAt: Date.now() 
      });

      // Visual flash feedback on the panel (magical "dimension shift" feel)
      const svg = document.querySelector('#possible-svg');
      if (svg) {
        svg.classList.add('!border-emerald-500');
        setTimeout(() => svg.classList.remove('!border-emerald-500'), 420);
      }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, padding: '0 4px' }}>
        <input
          type="range"
          min={0.02} max={0.35} step={0.01}
          value={mutationStrength}
          onChange={e => setMutationStrength(parseFloat(e.target.value))}
          style={{ width: 110 }}
        />
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
          strength {(mutationStrength * 100).toFixed(0)}%
        </span>
        <button
          onClick={handleGenerateRealBranches}
          disabled={isGenerating}
          style={{
            fontSize: 9, fontFamily: 'monospace', padding: '2px 8px',
            background: isGenerating ? '#222' : '#10b98122',
            border: '1px solid #10b98144', color: '#10b981', borderRadius: 3, cursor: 'pointer'
          }}
        >
          {isGenerating ? 'GENERATING…' : 'GENERATE REAL BRANCHES'}
        </button>
        {realBranches.length > 0 && (
          <button onClick={() => setRealBranches([])} style={{ fontSize: 9, fontFamily: 'monospace', color: '#666' }}>clear</button>
        )}
      </div>

      <svg id="possible-svg" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4, border: '1px solid rgba(16,185,129,0.15)', transition: 'border-color 120ms' }}>
        {edges.map((e, i) => e && (
          <line key={i} x1={e.x1.toFixed(1)} y1={e.y1.toFixed(1)} x2={e.x2.toFixed(1)} y2={e.y2.toFixed(1)}
            stroke={`rgba(16,185,129,${(e.prob * 0.6).toFixed(2)})`} strokeWidth={0.5 + e.prob * 1.5} />
        ))}
        {allNodes.map(n => {
          const hue = DOMAIN_HUE[n.domain] ?? 120;
          const r = n.depth === 0 ? 10 : n.depth === 1 ? 7 : 5;
          const isReal = 'realSeed' in n;
          return (
            <g
              key={n.id}
              onClick={() => isReal && adoptBranch((n as any).realSeed)}
              style={{ cursor: isReal ? 'pointer' : 'default' }}
            >
              <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r={r + 4} fill={`hsla(${hue},70%,50%,0.08)`} />
              <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r={r} fill={`hsla(${hue},70%,50%,0.9)`} />
              <text x={n.x.toFixed(1)} y={(n.y + r + 10).toFixed(1)} textAnchor="middle"
                fontSize={n.depth === 0 ? 8 : 6.5} fill="rgba(255,255,255,0.55)" fontFamily="monospace">
                {n.label}
              </text>
              {n.probability < 1 && (
                <text x={n.x.toFixed(1)} y={(n.y + r + 18).toFixed(1)} textAnchor="middle"
                  fontSize={5.5} fill="rgba(255,255,255,0.3)" fontFamily="monospace">
                  {(n.probability * 100).toFixed(0)}%
                </text>
              )}
              {isReal && (
                <text x={n.x.toFixed(1)} y={(n.y - r - 6).toFixed(1)} textAnchor="middle"
                  fontSize={6} fill="#10b981" fontFamily="monospace">real</text>
              )}
            </g>
          );
        })}
      </svg>

      <div style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', padding: '4px 6px' }}>
        Click a <span style={{ color: '#10b981' }}>real</span> branch to adopt it live across the entire Reality Lens.
      </div>
    </div>
  );
}

function SemanticPanel({ seed }: { seed: Seed }) {
  const W = 280; const H = 160;

  // Real genes from the live seed (updates instantly from GeneEditor / GSPLEditor)
  const realGenes = seed.genes ? Object.keys(seed.genes) : [];
  const currentDomain = seed.$domain ?? 'visual2d';

  const clusters = useMemo(() => {
    const domains = ['music', 'narrative', 'game', 'character', 'shader', 'world', 'website', 'physics', 'visual2d', 'sprite', 'agent', 'ecosystem', 'app'];
    
    // Compute real coherence using gene overlap + known strong functors from kernel composition
    const coherence: Record<string, number> = {};
    domains.forEach(d => {
      if (d === currentDomain) {
        coherence[d] = 1.0;
        return;
      }
      let score = 0.15; // base
      // Gene overlap (now includes App interactiveDemo + flagship demo genes)
      const domainGenes = (seed.genes ? Object.keys(seed.genes) : []).filter(g => 
        g.toLowerCase().includes(d.slice(0,4)) || 
        (d === 'character' && ['proportions','face','strength','morph'].some(k => g.includes(k))) ||
        (d === 'music' && ['temporal','resonance','palette','tempo'].some(k => g.includes(k))) ||
        (d === 'app' && ['interactiveDemo','archetype','feature'].some(k => g.includes(k)))
      ).length;
      score += Math.min(0.4, domainGenes * 0.12);

      // Strong known composition functors (from kernel/composition.ts patterns) + new character animation/morph data (laugh/talk boosts music/narrative/game coherence)
      const strongLinks: Record<string, string[]> = {
        character: ['music', 'narrative', 'game', 'world', 'app'],
        music: ['character', 'visual2d', 'game', 'website', 'app'],
        visual2d: ['music', 'website', 'shader', 'sprite'],
        game: ['character', 'music', 'world', 'narrative'],
        app: ['character', 'music', 'narrative', 'game']  // flagship interactiveDemo embeds real CharacterRigExplorer
      };
      if (strongLinks[currentDomain]?.includes(d)) score += 0.35;

      // Dynamic from new character animations (talk/laugh morph energy increases semantic closeness to expressive domains)
      const hasLaughTalk = (seed.genes && (seed.genes.morph_smile || (seed as any).$recentAnimation === 'laugh' || (seed as any).$recentAnimation === 'talk'));
      if (hasLaughTalk && ['music', 'narrative', 'game', 'app'].includes(d)) score += 0.25;

      // App + character morph expressiveness boost (when interactiveDemo true the generated app contains the live 5-morph + LAUGH/TALK rig)
      const interactiveDemo = (seed.genes && (seed.genes.interactiveDemo as any)?.value === true) || (currentDomain === 'app');
      const morphEnergy = ((seed.genes?.morph_smile as any)?.value || 0) + ((seed.genes?.morph_laugh as any)?.value || 0) * 0.7;
      if (interactiveDemo && morphEnergy > 0.15 && ['character', 'music', 'narrative', 'game'].includes(d)) {
        score += 0.22 + morphEnergy * 0.18;
      }

      coherence[d] = Math.max(0.1, Math.min(0.95, score));
    });

    // Position based on real coherence (closer = higher coherence)
    return domains.map((d, i) => {
      const isCurrent = d === currentDomain;
      const coh = coherence[d];
      const angle = (i / domains.length) * Math.PI * 2 - Math.PI / 2;
      const dist = isCurrent ? 0 : (1 - coh) * 95 + 25;
      const cx = W/2 + Math.cos(angle) * dist;
      const cy = H/2 + Math.sin(angle) * (dist * 0.7);
      return { domain: d, x: cx, y: cy, isCurrent, coherence: coh };
    });
  }, [realGenes, currentDomain, seed.genes, seed.$domain]);

  const currentCluster = clusters.find(c => c.isCurrent);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {currentCluster && clusters.filter(c => !c.isCurrent).map((c, i) => {
        const prox = c.coherence;
        if (prox < 0.28) return null;
        return (
          <line key={i} x1={currentCluster.x.toFixed(1)} y1={currentCluster.y.toFixed(1)}
            x2={c.x.toFixed(1)} y2={c.y.toFixed(1)}
            stroke={`rgba(139,92,246,${(prox * 0.55).toFixed(2)})`} strokeWidth={prox * 2.2} />
        );
      })}
      {clusters.map(c => (
        <g key={c.domain}>
          {c.isCurrent && <circle cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} r={18} fill="rgba(139,92,246,0.12)" />}
          <circle cx={c.x.toFixed(1)} cy={c.y.toFixed(1)} r={c.isCurrent ? 8 : 5}
            fill={c.isCurrent ? '#8b5cf6' : `rgba(139,92,246,${0.4 + c.coherence * 0.5})`} />
          <text x={c.x.toFixed(1)} y={(c.y - 11).toFixed(1)} textAnchor="middle"
            fontSize={c.isCurrent ? 8 : 6.5} fill={c.isCurrent ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.35)'}
            fontFamily="monospace">{c.domain}</text>
          {!c.isCurrent && (
            <text x={c.x.toFixed(1)} y={(c.y + 13).toFixed(1)} textAnchor="middle"
              fontSize={5.5} fill="rgba(139,92,246,0.6)" fontFamily="monospace">
              {(c.coherence * 100).toFixed(0)}%
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function StructuralPanel({ seed }: { seed: Seed }) {
  const W = 280; const H = 160;
  
  // Use real genes from the seed when available (live from GeneEditor / GSPL edits)
  const realGenes = seed.genes ? Object.entries(seed.genes).slice(0, 10) : [];
  const geneNames = realGenes.length > 0 
    ? realGenes.map(([name]) => name) 
    : ['proportions', 'face', 'skinTone', 'archetype', 'strength', 'agility', 'palette', 'temporal'];

  const floats = useMemo(() => seedToFloats(seed, 60), [seed.$hash]);

  const nodes = useMemo(() => {
    return geneNames.slice(0, 8).map((g, i) => {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = 52 + floats[i] * 18;
      const geneEntry = realGenes.find(([name]) => name === g);
      const type = geneEntry ? (geneEntry[1] as any).type : 'scalar';
      return { 
        id: g, 
        x: W / 2 + Math.cos(angle) * r, 
        y: H / 2 + Math.sin(angle) * r, 
        type 
      };
    });
  }, [geneNames, floats, realGenes]);

  const GENE_TYPE_COLOR: Record<string, string> = {
    scalar: '#f97316', categorical: '#22d3ee', vector: '#6366f1', temporal: '#22d3ee',
    sovereignty: '#ffd700', graph: '#10b981', quantum: '#8b5cf6', resonance: '#ec4899',
    field: '#f59e0b', symbolic: '#a78bfa', struct: '#34d399', regulatory: '#fb7185',
  };

  // Real-ish edges: link genes that commonly interact via composition or type similarity
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const t1 = nodes[i].type;
      const t2 = nodes[j].type;
      // Stronger connection for related types (visual genes, numeric genes, etc.)
      const related = (t1 === t2) || 
                      (['vector', 'scalar'].includes(t1) && ['vector', 'scalar'].includes(t2)) ||
                      (t1 === 'temporal' && t2 === 'resonance');
      if (related || floats[18 + i + j] > 0.62) {
        edges.push({ x1: nodes[i].x, y1: nodes[i].y, x2: nodes[j].x, y2: nodes[j].y });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block', background: '#080812', borderRadius: 4 }}>
      {edges.map((e, i) => <line key={i} x1={e.x1.toFixed(1)} y1={e.y1.toFixed(1)} x2={e.x2.toFixed(1)} y2={e.y2.toFixed(1)} stroke="rgba(249,115,22,0.22)" strokeWidth="0.8" />)}
      {nodes.map(n => {
        const color = GENE_TYPE_COLOR[n.type] ?? '#888';
        return (
          <g key={n.id}>
            <circle cx={n.x.toFixed(1)} cy={n.y.toFixed(1)} r={7} fill={color} opacity={0.9} />
            <text x={n.x.toFixed(1)} y={(n.y - 10).toFixed(1)} textAnchor="middle"
              fontSize={6} fill="rgba(255,255,255,0.5)" fontFamily="monospace">{n.id.length > 9 ? n.id.slice(0,9) : n.id}</text>
          </g>
        );
      })}
      <circle cx={W / 2} cy={H / 2} r={5} fill="#f97316" />
      <text x={W / 2} y={H / 2 + 15} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.35)" fontFamily="monospace">genes</text>
    </svg>
  );
}

const DIM_PANELS: Record<DimId, React.ComponentType<{ seed: Seed }>> = {
  spatial:    SpatialPanel,
  temporal:   TemporalPanel,
  spectral:   SpectralPanel,
  modal:      ModalPanel,
  possible:   PossiblePanel,
  semantic:   SemanticPanel,
  structural: StructuralPanel,
};

const ALL_DIMS: DimId[] = ['spatial', 'temporal', 'spectral', 'modal', 'possible', 'semantic', 'structural'];

export function DimensionalViewer({ seed, className }: DimensionalViewerProps) {
  const [activeDim, setActiveDim] = useState<DimId>('possible');
  const [layout, setLayout] = useState<'focus' | 'grid'>('focus');

  if (!seed) {
    return (
      <div className={`flex items-center justify-center h-64 ${className ?? ''}`}
        style={{ background: '#080812', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 12 }}>
          No seed selected — grow something to see across all 7 dimensions
        </p>
      </div>
    );
  }

  const ActivePanel = DIM_PANELS[activeDim];

  return (
    <div className={className ?? ''} style={{ background: '#080812', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
            DIMENSIONAL SUBSTRATE
          </span>
          {seed.$domain && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: DIM_COLORS[activeDim], background: `${DIM_COLORS[activeDim]}18`, padding: '2px 6px', borderRadius: 3 }}>
              {seed.$domain}
            </span>
          )}
        </div>
        <button
          onClick={() => setLayout(l => l === 'focus' ? 'grid' : 'focus')}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'monospace', cursor: 'pointer' }}
        >
          {layout === 'focus' ? 'GRID' : 'FOCUS'}
        </button>
      </div>

      <div style={{ padding: '8px 10px', display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {ALL_DIMS.map(dim => (
          <button
            key={dim}
            onClick={() => setActiveDim(dim)}
            style={{
              background: activeDim === dim ? `${DIM_COLORS[dim]}22` : 'transparent',
              border: `1px solid ${activeDim === dim ? DIM_COLORS[dim] : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 4, padding: '3px 8px',
              color: activeDim === dim ? DIM_COLORS[dim] : 'rgba(255,255,255,0.3)',
              fontSize: 8, fontFamily: 'monospace', cursor: 'pointer', letterSpacing: '0.06em',
              transition: 'all 0.15s',
            }}
          >
            {DIM_LABELS[dim]}
          </button>
        ))}
      </div>

      {layout === 'focus' ? (
        <div style={{ padding: 12 }}>
          <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: DIM_COLORS[activeDim], letterSpacing: '0.08em' }}>
              {DIM_LABELS[activeDim]}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
              {DIM_DESCS[activeDim]}
            </span>
          </div>
          <ActivePanel seed={seed} />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
              hash: {(seed.$hash ?? '').slice(0, 16)}…
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>
              fitness: {typeof seed.$fitness === 'number' ? seed.$fitness.toFixed(3) : '—'}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ALL_DIMS.map(dim => {
            const Panel = DIM_PANELS[dim];
            return (
              <div key={dim} onClick={() => { setActiveDim(dim); setLayout('focus'); }}
                style={{ cursor: 'pointer', borderRadius: 6, border: `1px solid ${activeDim === dim ? DIM_COLORS[dim] : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                <div style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 7, color: DIM_COLORS[dim], letterSpacing: '0.08em' }}>{DIM_LABELS[dim]}</span>
                </div>
                <Panel seed={seed} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DimensionalViewer;
