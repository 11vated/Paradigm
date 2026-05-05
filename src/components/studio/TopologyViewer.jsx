import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DOMAIN_COLORS } from '@/lib/constants';

function LatticePoints({ seed, artifact }) {
  const pointsRef = useRef();
  
  // Re-calculate positions and colors whenever the field updates
  const { positions, colors } = useMemo(() => {
    // We expect artifact.full_field to be a densely packed Float32Array
    const field = artifact?.full_field;
    
    const gridSize = artifact?.grid_size || [32, 32, 32];
    const nX = gridSize[0];
    const nY = gridSize[1];
    const nZ = gridSize[2];
    const maxDim = Math.max(nX, nY, nZ);
    
    if (!field || field.length !== nX * nY * nZ) return { positions: new Float32Array(), colors: new Float32Array() };

    const pos = [];
    const col = [];
    
    const scale = 4.0 / maxDim; // Fit within a roughly 4 unit box
    const offsetX = (nX * scale) / 2;
    const offsetY = (nY * scale) / 2;
    const offsetZ = (nZ * scale) / 2;
    
    const domainColor = new THREE.Color(DOMAIN_COLORS[artifact?.domain] || '#00E5FF');
    // Using HSL to tweak lightness based on density
    const hsl = { h: 0, s: 0, l: 0 };
    domainColor.getHSL(hsl);

    for (let x = 0; x < nX; x++) {
      for (let y = 0; y < nY; y++) {
        for (let z = 0; z < nZ; z++) {
          const idx = x * nY * nZ + y * nZ + z;
          const density = field[idx];
          
          // Only render points with some density to avoid drawing 32k invisible points
          if (density > 0.05) {
            // Mapping Z in data to Y in three.js, Y in data to Z, to match engine convention
            pos.push(
               (x * scale) - offsetX,
               (z * scale) - offsetZ,
               (y * scale) - offsetY
            );
            
            // Adjust lightness by density (higher density = brighter)
            domainColor.setHSL(hsl.h, hsl.s, Math.max(0.2, density * 0.8));
            col.push(domainColor.r, domainColor.g, domainColor.b);
          }
        }
      }
    }
    
    return { 
      positions: new Float32Array(pos), 
      colors: new Float32Array(col) 
    };
  }, [artifact]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  if (positions.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={colors.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.8} />
    </points>
  );
}

export default function TopologyViewer({ seed, artifact }) {
  if (!artifact) return null;

  return (
    <group>
      <LatticePoints seed={seed} artifact={artifact} />
    </group>
  );
}
