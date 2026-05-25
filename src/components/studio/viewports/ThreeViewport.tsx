// TODO(typing-sprint): Legacy studio component (/classic/* routes). AGENTS.md sanctions this debt pending the Typing Sprint that converts these JSX-style files to fully typed TSX.
import { useRef, useState, useEffect, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Grid } from '@react-three/drei';
import { DOMAIN_COLORS as DOMAIN_COLORS_HEX } from '@/lib/constants';
import { loadOBJFromURL, parseOBJ, objToBufferGeometry } from '@/lib/kernel/generators/obj-loader';
import type { ViewportProps, MeshData } from './types';

function EmergentMesh({ meshData, color }: { meshData: MeshData | null; color: string }) {
  const geometry = useMemo(() => {
    if (!meshData || !meshData.vertices) return null;
    try {
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
      if (meshData.indices && meshData.indices.length > 0) {
        const indices = meshData.indices.length < 65536
          ? new Uint16Array(meshData.indices)
          : new Uint32Array(meshData.indices);
        geo.setIndex(new THREE.BufferAttribute(indices, 1));
      }
      geo.computeBoundingBox();
      const center = new THREE.Vector3();
      geo.boundingBox!.getCenter(center);
      geo.translate(-center.x, -center.y, -center.z);
      const size = new THREE.Vector3();
      geo.boundingBox!.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        geo.scale(2.0 / maxDim, 2.0 / maxDim, 2.0 / maxDim);
      }
      return geo;
    } catch {
      return null;
    }
  }, [meshData]);

  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;
    }
  });

  if (!geometry) return <FallbackMesh domain="unknown" color={color} />;

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow position={[0, 1, 0]}>
      <meshStandardMaterial
        color={meshData?.colors ? 0xffffff : color}
        vertexColors={!!meshData?.colors}
        roughness={0.3} metalness={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function FallbackMesh({ domain, color, artifact }: { domain: string; color: string; artifact?: any }) {
  const meshRef = useRef<THREE.Group | THREE.Mesh>(null);
  const reducedMotion = useReducedMotion();
  const signature = useMemo(() => {
    const text = `${artifact?.seed_hash || artifact?.name || domain || 'seed'}`;
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
    return Math.abs(hash);
  }, [artifact?.seed_hash, artifact?.name, domain]);
  const variant = signature % 5;
  const scale = 0.75 + ((signature % 17) / 40);

  useFrame(() => {
    if (meshRef.current && reducedMotion !== true) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x += 0.002;
    }
  });

  if (domain === 'music' || domain === 'audio') {
    return (
      <group ref={meshRef as any} position={[0, 0.9, 0]} scale={scale}>
        {Array.from({ length: 9 }).map((_, i) => {
          const h = 0.25 + (((signature >> (i % 8)) & 7) / 7) * 1.2;
          return (
            <mesh key={i} position={[(i - 4) * 0.18, h / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.1, h, 0.16]} />
              <meshStandardMaterial color={color} roughness={0.35} metalness={0.25} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (domain === 'character' || domain === 'agent' || domain === 'fashion') {
    return (
      <group ref={meshRef as any} position={[0, 1, 0]} scale={scale}>
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.32, 24, 16]} />
          <meshStandardMaterial color={color} roughness={0.45} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.32, 0.75, 8, 16]} />
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.2} />
        </mesh>
        <mesh position={[-0.42, 0.12, 0]} rotation={[0, 0, 0.35]} castShadow receiveShadow>
          <capsuleGeometry args={[0.08, 0.55, 6, 10]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.42, 0.12, 0]} rotation={[0, 0, -0.35]} castShadow receiveShadow>
          <capsuleGeometry args={[0.08, 0.55, 6, 10]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
        </mesh>
      </group>
    );
  }

  if (domain === 'architecture' || domain === 'furniture') {
    return (
      <group ref={meshRef as any} position={[0, 0.35, 0]} scale={scale}>
        {Array.from({ length: 7 }).map((_, i) => {
          const h = 0.45 + (((signature >> (i % 10)) & 15) / 15) * 1.4;
          return (
            <mesh key={i} position={[(i - 3) * 0.28, h / 2, ((i % 2) - 0.5) * 0.3]} castShadow receiveShadow>
              <boxGeometry args={[0.2, h, 0.22]} />
              <meshStandardMaterial color={color} roughness={0.65} metalness={0.25} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (domain === 'vehicle' || domain === 'robotics') {
    return (
      <group ref={meshRef as any} position={[0, 0.75, 0]} scale={scale}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.25, 0.32, 0.55]} />
          <meshStandardMaterial color={color} roughness={0.28} metalness={0.55} />
        </mesh>
        <mesh position={[0.2, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.55, 0.28, 0.42]} />
          <meshStandardMaterial color={color} roughness={0.25} metalness={0.45} />
        </mesh>
        {[-0.45, 0.45].map((x) => (
          <mesh key={x} position={[x, -0.24, 0.32]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <torusGeometry args={[0.16, 0.045, 10, 24]} />
            <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.2} />
          </mesh>
        ))}
      </group>
    );
  }

  if (domain === 'geometry3d' || domain === 'food') {
    return (
      <mesh ref={meshRef as any} castShadow receiveShadow position={[0, 1, 0]} scale={scale * 0.8}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} wireframe={false} />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef as any} castShadow receiveShadow position={[0, 1, 0]} scale={scale}>
      {variant === 0 ? <icosahedronGeometry args={[0.8, 1]} /> : null}
      {variant === 1 ? <octahedronGeometry args={[0.9, 1]} /> : null}
      {variant === 2 ? <torusKnotGeometry args={[0.42, 0.14, 90, 12]} /> : null}
      {variant === 3 ? <dodecahedronGeometry args={[0.78, 0]} /> : null}
      {variant === 4 ? <boxGeometry args={[1.0, 1.0, 1.0]} /> : null}
      <meshStandardMaterial color={color} roughness={0.2 + variant * 0.08} metalness={0.25 + variant * 0.08} />
    </mesh>
  );
}

export default function ThreeViewport({ artifact }: ViewportProps) {
  const domainColor = DOMAIN_COLORS_HEX[artifact?.domain] || '#00E5FF';
  const hasEmergentMesh = artifact?.emergent_assets?.mesh?.vertices?.length > 0;
  const objFilePath = artifact?.artifact?.filePath;

  const [objGeometry, setObjGeometry] = useState<THREE.BufferGeometry | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!objFilePath || !objFilePath.endsWith('.obj')) return;
    if (geometryRef.current) { geometryRef.current.dispose(); geometryRef.current = null; }
    const loadObj = async () => {
      try {
        const resp = await fetch(`/output/${objFilePath.split('/').pop()}`);
        const text = await resp.text();
        const objData = parseOBJ(text);
        const geo = objToBufferGeometry(objData);
        geo.computeBoundingBox();
        const center = new THREE.Vector3();
        geo.boundingBox!.getCenter(center);
        geo.translate(-center.x, -center.y, -center.z);
        const size = new THREE.Vector3();
        geo.boundingBox!.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) geo.scale(2.0 / maxDim, 2.0 / maxDim, 2.0 / maxDim);
        geometryRef.current = geo;
        setObjGeometry(geo);
      } catch { /* ignore OBJ load errors */ }
    };
    loadObj();
    return () => { if (geometryRef.current) { geometryRef.current.dispose(); geometryRef.current = null; } };
  }, [objFilePath]);

  return (
    <div className="w-full h-full block" data-testid="preview-3d-canvas">
      <Canvas shadows camera={{ position: [0, 2, 4], fov: 50 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
        }}>
        <color attach="background" args={['#030303']} />
        <fog attach="fog" args={['#030303', 5, 15]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <pointLight position={[-3, 2, -2]} color={domainColor} intensity={0.5} distance={10} />
        <Grid infiniteGrid fadeDistance={20} sectionColor="#1a1a1a" cellColor="#111111" position={[0, -0.01, 0]} />
        {hasEmergentMesh ? <EmergentMesh meshData={artifact.emergent_assets.mesh} color={domainColor} />
        : objGeometry ? (
          <mesh geometry={objGeometry} position={[0, 1, 0]}>
            <meshStandardMaterial color="#00E5FF" roughness={0.3} metalness={0.4} side={THREE.DoubleSide} />
          </mesh>
        ) : <FallbackMesh domain={artifact?.domain} color={domainColor} artifact={artifact} />}
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={10} blur={2} far={4} />
        <OrbitControls makeDefault autoRotate={false} enablePan={false} minDistance={1.5} maxDistance={8} />
      </Canvas>
    </div>
  );
}
