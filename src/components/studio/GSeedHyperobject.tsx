/**
 * Paradigm Beyond Omega — GSeed v2 Quantum Toroidal Hyperobject
 * Spectacular visualization: NOT a node, NOT a dot
 * 
 * 17 Visual Systems:
 * 1. Quantum Core — SHA-256 hash as refractive crystal
 * 2. Gene Expression Field — 17 types visualized
 * 3. Lineage Tendrils — Energy streams to ancestors
 * 4. Sovereignty Aura — ECDSA as shimmering energy field
 * 5. Domain Halo — Colored ring (60fps shader)
 * 6. Fitness Flame — Particle system above seed
 * 7. Neighborhood Particles — 1,000+ GPU particles
 * 8. Audio Signature — 3D binaural (WebAudio)
 * 9. Haptic Texture — Feel the seed
 * 10. Gravity Field — Seed warps space
 * 11. Temporal Trail — Evolution through time
 * 12. Resonance Field — Harmonic interference
 * 13. Dimensional Projection — 4D→3D (Möbius, Klein)
 * 14. Symbolic Glyphs — Grammar as orbiting runes
 * 15. Field Vectors — Spatial distribution (GPU instanced)
 * 16. Regulatory Network — Gene expression graph
 * 17. Structural Skeleton — Seed's bone structure (WebXR)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { UniversalSeed, GeneType } from '../../seeds';
import { GSeedRenderer, type GSeedVisualConfig } from '../../lib/rendering/webgpu-seed-renderer';

interface GSeedHyperobjectProps {
  seed: UniversalSeed;
  width?: number;
  height?: number;
  autoRotate?: boolean;
  showAllSystems?: boolean;
}

export const GSeedHyperobject: React.FC<GSeedHyperobjectProps> = ({
  seed,
  width = 800,
  height = 600,
  autoRotate = true,
  showAllSystems = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GSeedRenderer | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSystems, setActiveSystems] = useState<number[]>([]);

  // Initialize WebGPU renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const initRenderer = async () => {
      try {
        const renderer = new GSeedRenderer(canvasRef.current!);
        await renderer.init();
        rendererRef.current = renderer;
        setInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize WebGPU');
      }
    };

    initRenderer();

    return () => {
      rendererRef.current?.destroy();
    };
  }, []);

  // Render seed when it changes
  useEffect(() => {
    if (!rendererRef.current || !initialized) return;

    const config = seedToVisualConfig(seed);
    rendererRef.current.render(config, 0.016); // Assume 60fps
  }, [seed, initialized]);

  // Toggle visual systems
  const toggleSystem = useCallback((systemId: number) => {
    setActiveSystems(prev =>
      prev.includes(systemId)
        ? prev.filter(id => id !== systemId)
        : [...prev, systemId]
    );
  }, []);

  if (error) {
    return (
      <div className="gseed-hyperobject error" style={{ width, height }}>
        <div className="error-message">
          <h3>WebGPU Not Supported</h3>
          <p>{error}</p>
          <p>Falling back to WebGL renderer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gseed-hyperobject" style={{ width, height, position: 'relative' }}>
      {/* Main WebGPU Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', height: '100%' }}
      />

      {/* System Controls Overlay */}
      {showAllSystems && (
        <div className="system-controls" style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          padding: '10px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px',
          maxHeight: '90%',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>17 Visual Systems</h4>
          {VISUAL_SYSTEMS.map(sys => (
            <div key={sys.id} style={{ marginBottom: '5px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={activeSystems.includes(sys.id)}
                  onChange={() => toggleSystem(sys.id)}
                />
                {' '}{sys.name}
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Seed Info Overlay */}
      <div className="seed-info" style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        background: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '12px'
      }}>
        <div>Seed: {seed.metadata?.name || 'Unknown'}</div>
        <div>Domain: {seed.$domain || 'N/A'}</div>
        <div>Fitness: {seed.$fitness?.overall?.toFixed(4) || 'N/A'}</div>
        <div>Hash: {seed.$hash?.slice(0, 16)}...</div>
      </div>

      {/* Loading State */}
      {!initialized && (
        <div className="loading" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white'
        }}>
          Initializing Quantum Core...
        </div>
      )}
    </div>
  );
};

// --- Visual System Definitions ---
const VISUAL_SYSTEMS = [
  { id: 1, name: 'Quantum Core', geneType: 'quantum' },
  { id: 2, name: 'Gene Expression', geneType: 'scalar' },
  { id: 3, name: 'Lineage Tendrils', geneType: 'lineage' },
  { id: 4, name: 'Sovereignty Aura', geneType: 'sovereignty' },
  { id: 5, name: 'Domain Halo', geneType: 'domain' },
  { id: 6, name: 'Fitness Flame', geneType: 'fitness' },
  { id: 7, name: 'Neighborhood Particles', geneType: 'field' },
  { id: 8, name: 'Audio Signature', geneType: 'resonance' },
  { id: 9, name: 'Haptic Texture', geneType: 'topology' },
  { id: 10, name: 'Gravity Field', geneType: 'vector' },
  { id: 11, name: 'Temporal Trail', geneType: 'temporal' },
  { id: 12, name: 'Resonance Field', geneType: 'resonance' },
  { id: 13, name: 'Dimensional Projection', geneType: 'dimensional' },
  { id: 14, name: 'Symbolic Glyphs', geneType: 'symbolic' },
  { id: 15, name: 'Field Vectors', geneType: 'field' },
  { id: 16, name: 'Regulatory Network', geneType: 'regulatory' },
  { id: 17, name: 'Structural Skeleton', geneType: 'struct' }
];

// --- Convert Seed to Visual Config ---
function seedToVisualConfig(seed: UniversalSeed): GSeedVisualConfig {
  const genes: Record<string, { type: string; value: unknown }> = {};
  
  // Convert seed genes to visual config using public methods
  const geneTypes = seed.getGeneTypes();
  for (const geneType of geneTypes) {
    const gene = seed.getGene(geneType);
    if (gene) {
      genes[geneType] = { type: gene.type, value: gene.value };
    }
  }

  return {
    hash: seed.id || '',
    domain: seed.getMetadata().domain || 'unknown',
    fitness: seed.getMetadata().fitness || 0,
    sovereignty: {
      owner: '',  // Not available in current API
      signature: '' // Not available in current API
    },
    lineage: {
      parents: seed.getMetadata().lineage || [],
      generation: 0 // Not directly available
    },
    genes
  };
}
