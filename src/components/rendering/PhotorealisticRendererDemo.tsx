// TODO(typing-sprint): Legacy studio component (/classic/* routes). AGENTS.md sanctions this debt pending the Typing Sprint that converts these JSX-style files to fully typed TSX.
import React, { useRef, useEffect, useState } from 'react';

interface PhotorealisticRendererDemoProps {
  width?: number;
  height?: number;
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export const PhotorealisticRendererDemo: React.FC<PhotorealisticRendererDemoProps> = ({
  width = 800,
  height = 600,
  quality = 'high',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('Ready to initialize');
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setError('Failed to get 2D context');
      return;
    }

    // Draw initial placeholder
    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 30;
      imageData.data[i + 1] = 30;
      imageData.data[i + 2] = 35;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText('Click "Initialize Renderer" to begin', 20, 30);
  }, [width, height]);

  const checkWebGPUSupport = async () => {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser. Please use Chrome/Edge with WebGPU enabled.');
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      throw new Error('No WebGPU adapter found. Please ensure your GPU supports WebGPU.');
    }

    return adapter;
  };

  const initializeRenderer = async () => {
    try {
      setStatus('Checking WebGPU support...');
      await checkWebGPUSupport();

      setStatus('Initializing photorealistic renderer...');
      
      // In production, this would initialize the actual renderer:
      // import { createPhotorealisticRenderer } from '@/lib/rendering/photorealistic-renderer';
      // const renderer = createPhotorealisticRenderer(canvasRef.current!, { quality });
      // await renderer.initialize();

      setIsInitialized(true);
      setStatus('Renderer initialized successfully!');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('Initialization failed');
    }
  };

  const renderScene = async () => {
    if (!canvasRef.current || !isInitialized) return;

    try {
      setIsRendering(true);
      setStatus('Creating scene...');

      // Create a simple cube geometry
      const vertices = new Float32Array([
        // Front face
        -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1,
        // Back face
        -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1, -1,
        // Top face
        -1,  1, -1, -1,  1,  1,  1,  1,  1,  1,  1, -1,
        // Bottom face
        -1, -1, -1,  1, -1, -1,  1, -1,  1, -1, -1,  1,
        // Right face
         1, -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,
        // Left face
        -1, -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1,
      ]);

      const normals = new Float32Array([
        // Front
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // Back
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // Top
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // Bottom
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        // Right
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // Left
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
      ]);

      const indices = new Uint32Array([
        0, 1, 2, 0, 2, 3,    // Front
        4, 5, 6, 4, 6, 7,    // Back
        8, 9, 10, 8, 10, 11, // Top
        12, 13, 14, 12, 14, 15, // Bottom
        16, 17, 18, 16, 18, 19, // Right
        20, 21, 22, 20, 22, 23, // Left
      ]);

      setStatus('Rendering scene with path tracer...');

      // Simulate rendering with multiple 3D objects
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      // Create gradient background (HDRI-like)
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
      gradient.addColorStop(0, '#2a2a4e');
      gradient.addColorStop(0.5, '#1a1a3e');
      gradient.addColorStop(1, '#0a0a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Create multiple objects with different materials
      const objects = [
        {
          type: 'cube',
          position: [-2, 0, 0],
          scale: 80,
          material: { baseColor: '#e74c3c', metallic: 0.8, roughness: 0.2 },
        },
        {
          type: 'cube',
          position: [0, 0, 0],
          scale: 80,
          material: { baseColor: '#3498db', metallic: 0.0, roughness: 0.8 },
        },
        {
          type: 'cube',
          position: [2, 0, 0],
          scale: 80,
          material: { baseColor: '#2ecc71', metallic: 0.3, roughness: 0.5 },
        },
        {
          type: 'cube',
          position: [0, 1.5, 0],
          scale: 60,
          material: { baseColor: '#f39c12', metallic: 0.9, roughness: 0.1 },
        },
      ];

      // Light source position
      const lightDir = { x: 0.5, y: -0.5, z: 0.5 };
      const lightColor = { r: 1.0, g: 0.95, b: 0.9 };

      objects.forEach((obj) => {
        const centerX = width / 2 + obj.position[0] * obj.scale;
        const centerY = height / 2 - obj.position[1] * obj.scale;
        const scale = obj.scale;

        // Simple perspective projection with depth
        const projectedVertices: any[] = [];
        const depth: any[] = [];
        for (let i = 0; i < vertices.length; i += 3) {
          const x = vertices[i] + obj.position[0];
          const y = vertices[i + 1] + obj.position[1];
          const z = vertices[i + 2] + obj.position[2];
          
          // Simple perspective
          const perspective = 4 / (4 - z);
          const px = x * scale * perspective + centerX;
          const py = -y * scale * perspective + centerY;
          
          projectedVertices.push({ x: px, y: py });
          depth.push(z);
        }

        // Draw faces with lighting
        const faces = [
          { indices: [0, 1, 2, 3], normal: [0, 0, 1] },
          { indices: [4, 5, 6, 7], normal: [0, 0, -1] },
          { indices: [8, 9, 10, 11], normal: [0, 1, 0] },
          { indices: [12, 13, 14, 15], normal: [0, -1, 0] },
          { indices: [16, 17, 18, 19], normal: [1, 0, 0] },
          { indices: [20, 21, 22, 23], normal: [-1, 0, 0] },
        ];

        faces.forEach((face) => {
          // Calculate lighting
          const dot = face.normal[0] * lightDir.x + 
                      face.normal[1] * lightDir.y + 
                      face.normal[2] * lightDir.z;
          const lightIntensity = Math.max(0.1, dot);
          
          // Apply material properties
          const baseColor = hexToRgb(obj.material.baseColor);
          const metallic = obj.material.metallic;
          const roughness = obj.material.roughness;

          // Combine base color with lighting
          const r = Math.min(255, baseColor.r * lightIntensity * lightColor.r);
          const g = Math.min(255, baseColor.g * lightIntensity * lightColor.g);
          const b = Math.min(255, baseColor.b * lightIntensity * lightColor.b);

          // Add metallic highlight
          if (metallic > 0.5) {
            const highlight = Math.pow(Math.max(0, dot), 32) * metallic;
            return {
              r: Math.min(255, r + highlight * 100),
              g: Math.min(255, g + highlight * 100),
              b: Math.min(255, b + highlight * 100),
            };
          }

          ctx.beginPath();
          ctx.moveTo(projectedVertices[face.indices[0]].x, projectedVertices[face.indices[0]].y);
          ctx.lineTo(projectedVertices[face.indices[1]].x, projectedVertices[face.indices[1]].y);
          ctx.lineTo(projectedVertices[face.indices[2]].x, projectedVertices[face.indices[2]].y);
          ctx.lineTo(projectedVertices[face.indices[3]].x, projectedVertices[face.indices[3]].y);
          ctx.closePath();
          
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fill();
          
          // Edge highlight for metallic materials
          if (metallic > 0.3) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * metallic})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
      });

      // Add ground plane with reflections
      ctx.fillStyle = 'rgba(30, 30, 50, 0.8)';
      ctx.fillRect(0, height/2 + 50, width, height/2 - 50);
      
      // Grid lines on ground
      ctx.strokeStyle = 'rgba(100, 100, 150, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, height/2 + 50);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = height/2 + 50; i < height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Add text overlay
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px Arial';
      ctx.fillText('Rendered with path tracer (simulated)', 20, height - 20);
      ctx.font = '12px Arial';
      ctx.fillText('Objects: 4 cubes with different materials', 20, height - 40);
      ctx.fillText('Lighting: Directional light with HDRI environment', 20, height - 55);

      function hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      }

      setStatus('Scene rendered successfully!');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('Rendering failed');
    } finally {
      setIsRendering(false);
    }
  };

  const exportGLB = async () => {
    try {
      setStatus('Exporting scene to GLB...');

      // In production, this would export the actual scene:
      // const glb = await renderer.exportScene(exportAsset, { format: 'glb' });

      // Simulate export
      const blob = new Blob(['Test GLB content - cube scene'], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cube-scene.glb';
      a.click();
      URL.revokeObjectURL(url);

      setStatus('Scene exported successfully!');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setStatus('Export failed');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold text-white">Photorealistic Renderer Demo</h1>
      
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border-2 border-gray-700 rounded-lg shadow-lg"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={initializeRenderer}
          disabled={isInitialized}
          className="px-5 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          Initialize Renderer
        </button>
        <button
          onClick={renderScene}
          disabled={!isInitialized || isRendering}
          className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isRendering ? 'Rendering...' : 'Render Scene'}
        </button>
        <button
          onClick={exportGLB}
          disabled={!isInitialized}
          className="px-5 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          Export GLB
        </button>
      </div>

      <div className="text-sm text-gray-400">{status}</div>
      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 max-w-2xl text-center">
        <p>
          This demo simulates the photorealistic rendering pipeline. In production, it would use the actual
          WebGPU path tracer with recursive ray tracing, importance sampling, and advanced material models.
        </p>
      </div>
    </div>
  );
};
