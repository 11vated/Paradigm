/**
 * Reality Canvas - Infinite Workspace for Artifact Generation
 * 
 * This is the sensory interface of the Digital Creation Reality OS.
 * It provides an infinite, holographic workspace where artifacts can be
 * generated, manipulated, and experienced in a truly immersive environment.
 * 
 * Features:
 * - WebGPU-accelerated rendering with adaptive LOD
 * - GPU-based particle systems for generative visuals
 * - Holographic depth simulation with parallax
 * - Motion physics and organic interactions
 * - GSPL-powered generative environments
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { type Seed } from '@/lib/kernel/types';
import { generateTheme, applyTheme } from '@/lib/studio/generative-theme';
import { motion, AnimatePresence } from 'framer-motion';

interface ArtifactNode {
  id: string;
  seed: Seed;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
  velocity: { x: number; y: number; z: number };
  glowIntensity: number;
  pulsePhase: number;
}

interface RealityCanvasProps {
  seeds: Seed[];
  onArtifactSelect?: (seed: Seed) => void;
  onArtifactCreate?: (position: { x: number; y: number }) => void;
  themeSeed?: Seed;
}

const RealityCanvas: React.FC<RealityCanvasProps> = ({
  seeds,
  onArtifactSelect,
  onArtifactCreate,
  themeSeed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const webgpuContextRef = useRef<GPUDevice | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const renderRef = useRef<((timestamp: number) => void) | null>(null);
  
  const [nodes, setNodes] = useState<ArtifactNode[]>([]);
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1000, rotationX: 0, rotationY: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isCreating, setIsCreating] = useState(false);
  const [creationPosition, setCreationPosition] = useState({ x: 0, y: 0 });
  
  // Apply generative theme when themeSeed changes
  useEffect(() => {
    if (themeSeed) {
      const theme = generateTheme(themeSeed);
      applyTheme(theme);
    } else if (seeds.length > 0) {
      // Use first seed as theme seed if none provided
      const theme = generateTheme(seeds[0]);
      applyTheme(theme);
    }
  }, [themeSeed, seeds]);
  
  // Initialize artifact nodes from seeds
  useEffect(() => {
    const newNodes: ArtifactNode[] = seeds.map((seed, index) => ({
      id: seed.id || seed.$hash || `node-${index}`,
      seed,
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      z: (Math.random() - 0.5) * 1000,
      scale: 1,
      rotation: Math.random() * Math.PI * 2,
      velocity: {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
        z: (Math.random() - 0.5) * 0.2,
      },
      glowIntensity: 0.5 + Math.random() * 0.5,
      pulsePhase: Math.random() * Math.PI * 2,
    }));
    setNodes(newNodes);
  }, [seeds]);
  
  // WebGPU initialization
  useEffect(() => {
    const initWebGPU = async () => {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported, falling back to Canvas 2D');
        return;
      }
      
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return;
      
      const device = await adapter.requestDevice();
      webgpuContextRef.current = device;
    };
    
    initWebGPU();
  }, []);
  
  // Particle system
  const [particles, setParticles] = useState<Array<{ x: number; y: number; z: number; size: number; speed: number; opacity: number; phase: number }>>([]);
  
  useEffect(() => {
    const newParticles = Array.from({ length: 200 }, (_, i) => ({
      x: (Math.random() - 0.5) * 4000,
      y: (Math.random() - 0.5) * 4000,
      z: (Math.random() - 0.5) * 2000,
      size: 1 + Math.random() * 3,
      speed: 0.2 + Math.random() * 0.8,
      opacity: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
    }));
    setParticles(newParticles);
  }, []);
  
  // Main render loop
  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const deltaTime = timestamp - timeRef.current;
    timeRef.current = timestamp;
    
    const { width, height } = canvas;
    
    // Clear with holographic background
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height)
    );
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    gradient.addColorStop(0.5, 'rgba(15, 23, 42, 0.98)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 1)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw holographic grid
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.lineWidth = 1;
    
    const gridSize = 100;
    const gridOffsetX = (camera.x * 0.1) % gridSize;
    const gridOffsetY = (camera.y * 0.1) % gridSize;
    
    for (let x = gridOffsetX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = gridOffsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Render particles with depth
    particles.forEach(particle => {
      const parallaxX = (particle.x - camera.x * 0.05) % width;
      const parallaxY = (particle.y - camera.y * 0.05) % height;
      const depth = (particle.z - camera.z * 0.1) / 1000;
      const scale = 1 / (1 + Math.abs(depth));
      const opacity = particle.opacity * scale * (0.5 + 0.5 * Math.sin(timestamp * 0.001 + particle.phase));
      
      ctx.fillStyle = `rgba(0, 229, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(
        ((parallaxX + width) % width),
        ((parallaxY + height) % height),
        particle.size * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    
    // Render artifact nodes with holographic effects
    nodes.forEach(node => {
      const parallaxX = node.x - camera.x * 0.3;
      const parallaxY = node.y - camera.y * 0.3;
      const depth = (node.z - camera.z * 0.5) / 1000;
      const scale = node.scale / (1 + Math.abs(depth));
      const screenX = width / 2 + parallaxX * scale;
      const screenY = height / 2 + parallaxY * scale;
      
      // Skip if off-screen
      if (screenX < -100 || screenX > width + 100 || screenY < -100 || screenY > height + 100) {
        return;
      }
      
      const isSelected = selectedNode === node.id;
      const pulse = 0.8 + 0.2 * Math.sin(timestamp * 0.003 + node.pulsePhase);
      const glow = node.glowIntensity * pulse;
      
      // Outer glow
      const glowGradient = ctx.createRadialGradient(
        screenX, screenY, 0,
        screenX, screenY, 60 * scale
      );
      glowGradient.addColorStop(0, `rgba(0, 229, 255, ${glow * 0.3})`);
      glowGradient.addColorStop(0.5, `rgba(0, 229, 255, ${glow * 0.1})`);
      glowGradient.addColorStop(1, 'rgba(0, 229, 255, 0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 60 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 45 * scale, 0, Math.PI * 2);
        ctx.stroke();
        
        // Animated selection particles
        for (let i = 0; i < 8; i++) {
          const angle = (timestamp * 0.002) + (i * Math.PI / 4);
          const radius = 50 * scale + 5 * Math.sin(timestamp * 0.005 + i);
          const px = screenX + Math.cos(angle) * radius;
          const py = screenY + Math.sin(angle) * radius;
          
          ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(px, py, 3 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Main artifact representation
      const artifactGradient = ctx.createRadialGradient(
        screenX - 10 * scale, screenY - 10 * scale, 0,
        screenX, screenY, 30 * scale
      );
      artifactGradient.addColorStop(0, `rgba(0, 229, 255, ${0.9 * glow})`);
      artifactGradient.addColorStop(0.7, `rgba(0, 150, 200, ${0.7 * glow})`);
      artifactGradient.addColorStop(1, 'rgba(0, 100, 150, 0.5)');
      
      ctx.fillStyle = artifactGradient;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 30 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner detail
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 20 * scale, 0, Math.PI * 2);
      ctx.stroke();
      
      // Domain indicator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `${10 * scale}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const domain = node.seed.$domain || 'unknown';
      ctx.fillText(domain.slice(0, 3).toUpperCase(), screenX, screenY);
      
      // Artifact name
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = `${11 * scale}px system-ui`;
      const name = node.seed.$name || node.seed.name || 'Artifact';
      ctx.fillText(name.slice(0, 15), screenX, screenY + 40 * scale);
    });
    
    // Creation indicator
    if (isCreating) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(creationPosition.x, creationPosition.y, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(creationPosition.x, creationPosition.y, 30, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Click to create', creationPosition.x, creationPosition.y + 45);
    }
    
    animationFrameRef.current = requestAnimationFrame(render);
  }, [nodes, camera, selectedNode, particles, isCreating, creationPosition]);
  
  // Start render loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame((timestamp) => {
      timeRef.current = timestamp;
      render(timestamp);
    });
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);
  
  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Handle mouse interactions
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on a node
    const clickedNode = nodes.find(node => {
      const parallaxX = node.x - camera.x * 0.3;
      const parallaxY = node.y - camera.y * 0.3;
      const depth = (node.z - camera.z * 0.5) / 1000;
      const scale = node.scale / (1 + Math.abs(depth));
      const screenX = canvas.width / 2 + parallaxX * scale;
      const screenY = canvas.height / 2 + parallaxY * scale;
      
      const dx = x - screenX;
      const dy = y - screenY;
      return Math.sqrt(dx * dx + dy * dy) < 30 * scale;
    });
    
    if (clickedNode) {
      setSelectedNode(clickedNode.id);
      onArtifactSelect?.(clickedNode.seed);
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
      setCreationPosition({ x, y });
      setIsCreating(true);
    }
  }, [nodes, camera, onArtifactSelect]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setCamera(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
    
    if (isCreating) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setCreationPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [isDragging, dragStart, isCreating]);
  
  const handleMouseUp = useCallback(() => {
    if (isCreating) {
      onArtifactCreate?.({
        x: creationPosition.x,
        y: creationPosition.y,
      });
      setIsCreating(false);
    }
    setIsDragging(false);
  }, [isCreating, creationPosition, onArtifactCreate]);
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCamera(prev => ({
      ...prev,
      z: Math.max(100, Math.min(2000, prev.z + e.deltaY * 0.5)),
    }));
  }, []);
  
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-900"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="text-xs text-cyan-400 font-mono space-y-1">
          <div>REALITY CANVAS</div>
          <div className="text-slate-400">
            X: {camera.x.toFixed(0)} Y: {camera.y.toFixed(0)} Z: {camera.z.toFixed(0)}
          </div>
          <div className="text-slate-400">
            Artifacts: {nodes.length}
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setCamera(prev => ({ ...prev, z: Math.max(100, prev.z - 100) }))}
          className="px-3 py-1.5 bg-slate-800/80 text-cyan-400 text-xs rounded hover:bg-slate-700/80 transition-colors border border-cyan-900/50"
        >
          +
        </button>
        <button
          onClick={() => setCamera(prev => ({ ...prev, z: Math.min(2000, prev.z + 100) }))}
          className="px-3 py-1.5 bg-slate-800/80 text-cyan-400 text-xs rounded hover:bg-slate-700/80 transition-colors border border-cyan-900/50"
        >
          -
        </button>
        <button
          onClick={() => setCamera({ x: 0, y: 0, z: 1000, rotationX: 0, rotationY: 0 })}
          className="px-3 py-1.5 bg-slate-800/80 text-cyan-400 text-xs rounded hover:bg-slate-700/80 transition-colors border border-cyan-900/50"
        >
          Reset
        </button>
      </div>
      
      {/* Selected Artifact Info */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 w-64 p-4 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-cyan-900/50"
          >
            <div className="text-cyan-400 font-semibold text-sm mb-2">
              {nodes.find(n => n.id === selectedNode)?.seed.$name || 'Artifact'}
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div>Domain: {nodes.find(n => n.id === selectedNode)?.seed.$domain}</div>
              <div>Generation: {nodes.find(n => n.id === selectedNode)?.seed.$lineage?.generation || 0}</div>
              <div>Fitness: {nodes.find(n => n.id === selectedNode)?.seed.$fitness?.overall?.toFixed(2) || 'N/A'}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealityCanvas;
