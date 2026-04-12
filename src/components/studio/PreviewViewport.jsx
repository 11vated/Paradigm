import { useRef, useState, useEffect, useMemo } from 'react';
import { Loader2, Dna } from 'lucide-react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei';

/* ── Domain Colors ──── */
const DOMAIN_COLORS_HEX = {
  character: '#F97316', sprite: '#10B981', music: '#8B5CF6', visual2d: '#06B6D4',
  procedural: '#EC4899', fullgame: '#14B8A6', animation: '#A855F7', narrative: '#F59E0B',
  physics: '#F43F5E', audio: '#EF4444', ecosystem: '#2DD4BF', geometry3d: '#22D3EE',
  game: '#FB923C', alife: '#818CF8', shader: '#D946EF', particle: '#D946EF',
  architecture: '#A855F7', vehicle: '#22D3EE', food: '#FB923C', choreography: '#E879F9',
  ui: '#FBBF24', typography: '#94A3B8', furniture: '#78716C', fashion: '#F472B6',
  robotics: '#6366F1', circuit: '#4ADE80', algorithm: '#10B981', building: '#A855F7',
  camera: '#06B6D4', creature: '#F97316', 'cross-domain': '#F59E0B', fluid: '#22D3EE',
  framework: '#8B5CF6', fx: '#D946EF', lighting: '#FBBF24', materials: '#EC4899',
  plant: '#10B981', scene: '#14B8A6', style: '#F472B6', weather: '#2DD4BF'
};

/* ── 3D Viewport using React Three Fiber ────────────────────────────────── */

function EmergentMesh({ meshData, color }) {
  const geometry = useMemo(() => {
    if (!meshData || !meshData.vertices) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(meshData.vertices), 3));
    if (meshData.normals) {
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(meshData.normals), 3));
    } else {
      geo.computeVertexNormals();
    }
    if (meshData.colors) {
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(meshData.colors), 3));
    }
    if (meshData.indices) {
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1));
    }
    // Center and scale the geometry to fit nicely in the viewport
    geo.computeBoundingBox();
    const center = new THREE.Vector3();
    geo.boundingBox.getCenter(center);
    geo.translate(-center.x, -center.y, -center.z);
    
    // Scale down if it's too large (e.g., 32x32x32 grid)
    const size = new THREE.Vector3();
    geo.boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2.0 / maxDim;
      geo.scale(scale, scale, scale);
    }
    
    return geo;
  }, [meshData]);

  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;
    }
  });

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow position={[0, 1, 0]}>
      <meshStandardMaterial 
        color={meshData.colors ? 0xffffff : color} 
        vertexColors={!!meshData.colors}
        roughness={0.3}
        metalness={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function FallbackMesh({ domain, color }) {
  const meshRef = useRef();
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow position={[0, 1, 0]}>
      <icosahedronGeometry args={[0.8, 1]} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.6} />
    </mesh>
  );
}

function ThreeViewport({ artifact }) {
  const domainColor = artifact?.visual?.color || DOMAIN_COLORS_HEX[artifact?.domain] || '#F97316';
  const hasEmergentMesh = artifact?.emergent_assets?.mesh?.vertices?.length > 0;

  return (
    <div className="w-full h-full block" data-testid="preview-3d-canvas">
      <Canvas shadows camera={{ position: [0, 2, 4], fov: 50 }}>
        <color attach="background" args={['#030303']} />
        <fog attach="fog" args={['#030303', 5, 15]} />
        
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <pointLight position={[-3, 2, -2]} color={domainColor} intensity={0.5} distance={10} />
        
        <Grid infiniteGrid fadeDistance={20} sectionColor="#1a1a1a" cellColor="#111111" position={[0, -0.01, 0]} />
        
        {hasEmergentMesh ? (
          <EmergentMesh meshData={artifact.emergent_assets.mesh} color={domainColor} />
        ) : (
          <FallbackMesh domain={artifact?.domain} color={domainColor} />
        )}
        
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={10} blur={2} far={4} />
        <OrbitControls makeDefault autoRotate={false} enablePan={false} minDistance={1.5} maxDistance={8} />
      </Canvas>
    </div>
  );
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
  
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (artifact.preview_slice && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const slice = artifact.preview_slice;
      // Assuming it's a square slice from a 32x32x32 grid, so 32x32
      const size = Math.sqrt(slice.length);
      if (Number.isInteger(size)) {
        canvas.width = size;
        canvas.height = size;
        const imgData = ctx.createImageData(size, size);
        for (let i = 0; i < slice.length; i++) {
          const val = slice[i];
          // Heatmap: dark blue -> cyan -> green -> yellow -> red
          const r = Math.min(255, Math.max(0, val * 255 * 5));
          const g = Math.min(255, Math.max(0, (val * 5 - 0.5) * 255));
          const b = Math.max(0, 255 - val * 255 * 2);
          
          imgData.data[i * 4] = r;
          imgData.data[i * 4 + 1] = g;
          imgData.data[i * 4 + 2] = b;
          imgData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
      }
    }
  }, [artifact.preview_slice]);

  return (
    <div className="flex flex-col items-center gap-4" data-testid="preview-generic">
      {artifact.preview_slice ? (
        <div className="w-32 h-32 border border-neutral-800 p-1 bg-black">
          <canvas ref={canvasRef} className="w-full h-full object-contain" style={{ imageRendering: 'pixelated' }} />
        </div>
      ) : (
        <div className="w-24 h-24 border border-neutral-800 flex items-center justify-center"
          style={{ background: `${c}10`, boxShadow: `0 0 60px ${c}15` }}>
          <Dna className="w-10 h-10" style={{ color: `${c}40` }} />
        </div>
      )}
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

/* ── Main Viewport ──────────────────────────────────────────────────── */

export default function PreviewViewport({ artifact, loading }) {
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
              
              {/* Physics Summary Overlay */}
              {artifact.physics_summary && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-black/50 border border-neutral-800 backdrop-blur-sm rounded-full pointer-events-none">
                  <div className="font-mono text-[9px] text-emerald-400/80">{artifact.physics_summary}</div>
                </div>
              )}

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
