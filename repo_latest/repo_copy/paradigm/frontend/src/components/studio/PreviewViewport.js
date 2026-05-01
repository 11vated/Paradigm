import { useRef, useState, useEffect, useCallback } from 'react';
import { Loader2, Dna } from 'lucide-react';
import * as THREE from 'three';

/* ── Pure Three.js Renderer (no R3F to avoid reconciler issues) ──── */

const DOMAIN_COLORS_HEX = {
  character: 0xF97316, sprite: 0x10B981, music: 0x8B5CF6, visual2d: 0x06B6D4,
  procedural: 0xEC4899, fullgame: 0x14B8A6, animation: 0xA855F7, narrative: 0xF59E0B,
  physics: 0xF43F5E, audio: 0xEF4444, ecosystem: 0x2DD4BF, geometry3d: 0x22D3EE,
  game: 0xFB923C, alife: 0x818CF8, shader: 0xD946EF, particle: 0xD946EF,
  architecture: 0xA855F7, vehicle: 0x22D3EE, food: 0xFB923C, choreography: 0xE879F9,
  ui: 0xFBBF24, typography: 0x94A3B8, furniture: 0x78716C, fashion: 0xF472B6,
  robotics: 0x6366F1, circuit: 0x4ADE80,
};

function useThreeScene(canvasRef, artifact) {
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const meshRef = useRef(null);
  const frameRef = useRef(null);
  const mouseRef = useRef({ isDown: false, x: 0, y: 0, theta: 0, phi: Math.PI / 4 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !artifact) return;

    // Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030303);
    scene.fog = new THREE.Fog(0x030303, 5, 12);

    const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 1.5, 3);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 5, 5);
    directional.castShadow = true;
    scene.add(directional);

    const domainColor = DOMAIN_COLORS_HEX[artifact.domain] || 0xF97316;
    const point = new THREE.PointLight(domainColor, 0.4, 10);
    point.position.set(-3, 2, -2);
    scene.add(point);

    // Grid
    const grid = new THREE.GridHelper(6, 24, 0x1a1a1a, 0x111111);
    grid.position.y = -1.5;
    scene.add(grid);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.95, metalness: 0 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.51;
    floor.receiveShadow = true;
    scene.add(floor);

    // Domain-specific mesh
    let geometry;
    const domain = artifact.domain || 'character';
    if (domain === 'character' || domain === 'narrative') {
      geometry = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16);
    } else if (domain === 'sprite' || domain === 'visual2d') {
      geometry = new THREE.BoxGeometry(1, 1, 0.1);
    } else if (domain === 'music' || domain === 'audio') {
      geometry = new THREE.TorusGeometry(0.6, 0.2, 16, 32);
    } else if (domain === 'procedural') {
      geometry = new THREE.ConeGeometry(0.8, 1.2, 32);
    } else if (domain === 'geometry3d') {
      geometry = new THREE.DodecahedronGeometry(0.7, 1);
    } else if (domain === 'physics') {
      geometry = new THREE.SphereGeometry(0.7, 32, 32);
    } else if (domain === 'architecture' || domain === 'furniture') {
      geometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
    } else if (domain === 'vehicle' || domain === 'robotics') {
      geometry = new THREE.CylinderGeometry(0.3, 0.5, 1.0, 8);
    } else {
      geometry = new THREE.IcosahedronGeometry(0.8, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      color: domainColor,
      roughness: 0.2,
      metalness: 0.6,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    scene.add(mesh);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    meshRef.current = mesh;

    // Animation loop
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      if (meshRef.current) {
        meshRef.current.rotation.x += 0.003;
        meshRef.current.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    }
    animate();

    // Mouse orbit
    const onDown = (e) => {
      mouseRef.current.isDown = true;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const onMove = (e) => {
      if (!mouseRef.current.isDown) return;
      const dx = e.clientX - mouseRef.current.x;
      const dy = e.clientY - mouseRef.current.y;
      mouseRef.current.theta += dx * 0.005;
      mouseRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, mouseRef.current.phi + dy * 0.005));
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      const r = 3.5;
      camera.position.x = r * Math.sin(mouseRef.current.phi) * Math.sin(mouseRef.current.theta);
      camera.position.y = r * Math.cos(mouseRef.current.phi);
      camera.position.z = r * Math.sin(mouseRef.current.phi) * Math.cos(mouseRef.current.theta);
      camera.lookAt(0, 0, 0);
    };
    const onUp = () => { mouseRef.current.isDown = false; };
    const onWheel = (e) => {
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      camera.position.multiplyScalar(factor);
      camera.position.clampLength(1.5, 8);
      camera.lookAt(0, 0, 0);
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('wheel', onWheel);

    // Resize
    const onResize = () => {
      if (!canvas.parentElement) return;
      const w = canvas.parentElement.clientWidth;
      const h = canvas.parentElement.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(canvas.parentElement);

    return () => {
      cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('wheel', onWheel);
      resizeObs.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [artifact, canvasRef]);
}

/* ── 2D Previews ──────────────────────────────────────────────────── */

function CharacterPreview({ artifact }) {
  const v = artifact.visual || {};
  const s = artifact.stats || {};
  return (
    <div className="flex flex-col items-center gap-6" data-testid="preview-character">
      <div className="rounded-sm border border-neutral-800"
        style={{
          width: `${60 + (v.body_width || 0.5) * 100}px`,
          height: `${100 + (v.body_height || 0.8) * 80}px`,
          background: v.color || 'rgb(100,100,100)',
          boxShadow: `0 0 40px ${v.color || 'rgb(100,100,100)'}33`,
        }} />
      <div className="text-center">
        <div className="font-heading font-bold text-lg text-white">{artifact.name}</div>
        <div className="font-mono text-[10px] text-orange-500 uppercase tracking-wider">{artifact.archetype}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-center">
        {Object.entries(s).map(([k, val]) => (
          <div key={k}>
            <div className="font-mono text-[10px] text-neutral-600 uppercase">{k}</div>
            <div className="font-heading font-bold text-sm text-white">{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MusicPreview({ artifact }) {
  const m = artifact.musical || {};
  const melody = artifact.melody_preview || [];
  return (
    <div className="flex flex-col items-center gap-4" data-testid="preview-music">
      <div className="w-56 h-28 bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-indigo-500/10 border border-neutral-800 flex items-center justify-center">
        <div className="flex items-end gap-1 h-20">
          {(melody.length > 0 ? melody.slice(0, 12) : [60, 64, 67, 72, 69, 64, 67, 60]).map((note, i) => (
            <div key={i} className="w-3 bg-purple-500/60 rounded-t-sm animate-pulse"
              style={{ height: `${Math.max(10, ((note - 48) / 40) * 100)}%`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
      <div className="text-center">
        <div className="font-heading font-bold text-lg text-white">{artifact.name}</div>
        <div className="font-mono text-[10px] text-neutral-500">{m.key} {m.scale} / {m.tempo} BPM</div>
      </div>
    </div>
  );
}

function GenericPreview({ artifact }) {
  const colors = {
    sprite: '#10B981', visual2d: '#06B6D4', procedural: '#EC4899', fullgame: '#14B8A6',
    animation: '#A855F7', narrative: '#F59E0B', physics: '#F43F5E', audio: '#EF4444',
    ecosystem: '#2DD4BF', geometry3d: '#22D3EE', game: '#FB923C', alife: '#818CF8',
    shader: '#D946EF', particle: '#D946EF', architecture: '#A855F7', vehicle: '#22D3EE',
    food: '#FB923C', choreography: '#E879F9', ui: '#FBBF24', typography: '#94A3B8',
    furniture: '#78716C', fashion: '#F472B6', robotics: '#6366F1', circuit: '#4ADE80',
  };
  const c = colors[artifact.domain] || '#F97316';
  return (
    <div className="flex flex-col items-center gap-4" data-testid="preview-generic">
      <div className="w-24 h-24 border border-neutral-800 flex items-center justify-center"
        style={{ background: `${c}10`, boxShadow: `0 0 60px ${c}15` }}>
        <Dna className="w-10 h-10" style={{ color: `${c}40` }} />
      </div>
      <div className="text-center">
        <div className="font-heading font-bold text-lg text-white">{artifact.name}</div>
        <div className="font-mono text-[10px] uppercase" style={{ color: c }}>{artifact.domain} / Gen {artifact.generation}</div>
      </div>
    </div>
  );
}

function ArtifactInfo({ artifact }) {
  if (!artifact) return null;
  if (artifact.type === 'character') return <CharacterPreview artifact={artifact} />;
  if (artifact.type === 'music') return <MusicPreview artifact={artifact} />;
  return <GenericPreview artifact={artifact} />;
}

/* ── 3D Viewport using pure Three.js ────────────────────────────────── */

function ThreeViewport({ artifact }) {
  const canvasRef = useRef(null);
  useThreeScene(canvasRef, artifact);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ cursor: 'grab' }}
      data-testid="preview-3d-canvas"
    />
  );
}

/* ── Main Viewport ──────────────────────────────────────────────────── */

export default function PreviewViewport({ artifact, seed, loading }) {
  const [view, setView] = useState('3d');

  return (
    <div className="flex-1 relative overflow-hidden" data-testid="preview-viewport">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-10" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(249,115,22,0.4) 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }} />

      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Growing seed...</span>
          </div>
        </div>
      ) : artifact ? (
        <>
          {/* View toggle */}
          <div className="absolute top-2 right-2 z-20 flex gap-1">
            <button onClick={() => setView('3d')}
              className={`px-2 py-0.5 font-mono text-[8px] uppercase border transition-colors ${view === '3d' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-neutral-800 text-neutral-600'}`}
              data-testid="view-3d-btn">3D</button>
            <button onClick={() => setView('2d')}
              className={`px-2 py-0.5 font-mono text-[8px] uppercase border transition-colors ${view === '2d' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-neutral-800 text-neutral-600'}`}
              data-testid="view-2d-btn">2D</button>
          </div>

          {/* Domain label */}
          <div className="absolute top-2 left-2 z-20 pointer-events-none">
            <div className="font-mono text-[9px] text-neutral-600 uppercase">{artifact.domain} ENGINE</div>
            <div className="font-mono text-[8px] text-neutral-800">{artifact.seed_hash?.slice(0, 24)}</div>
          </div>

          {view === '3d' ? (
            <div className="absolute inset-0" data-testid="viewport-3d-container">
              <ThreeViewport artifact={artifact} />
              <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-[#030303] to-transparent pointer-events-none">
                <div className="font-heading font-bold text-sm text-white">{artifact.name}</div>
                <div className="font-mono text-[9px] text-neutral-500">{artifact.domain} / Gen {artifact.generation}</div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#030303]">
              <ArtifactInfo artifact={artifact} />
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 border border-dashed border-neutral-800 flex items-center justify-center animate-float">
              <Dna className="w-6 h-6 text-neutral-700" />
            </div>
            <p className="font-mono text-xs text-neutral-600 max-w-xs">
              Type a description in the prompt bar below to generate your first seed, or select one from the gallery.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
