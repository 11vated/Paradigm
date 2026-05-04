import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSeedStore } from '@/stores/seedStore';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceX, forceY } from 'd3-force';

interface CanvasNode {
  id: string;
  hash: string;
  name: string;
  domain: string;
  generation: number;
  operation: string;
  fitness: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface CanvasLink {
  source: string | CanvasNode;
  target: string | CanvasNode;
  operation: string;
}

interface InfiniteCanvasProps {
  initialNodes?: CanvasNode[];
  initialLinks?: CanvasLink[];
  onNodeClick?: (node: CanvasNode) => void;
}

const GRID_SIZE = 40;
const NODE_RADIUS = 24;
const DOMAIN_COLORS: Record<string, string> = {
  character: '#f97316',
  sprite: '#84cc16',
  music: '#06b6d4',
  visual2d: '#8b5cf6',
  game: '#ec4899',
  procedural: '#14b8a6',
  animation: '#f43f5e',
  architecture: '#a8a29e',
  vehicle: '#6366f1',
  fashion: '#f59e0b',
  robotics: '#0ea5e9',
  circuit: '#22c55e',
  food: '#eab308',
  narrative: '#d946ef',
  agent: '#64748b',
  ecosystem: '#10b981',
  typography: '#0d9488',
  furniture: '#78716c',
  choreography: '#e879f9',
  alife: '#3b82f6',
  shader: '#f472b6',
  particle: '#14b8a6',
  geometry3d: '#0d9488',
  physics: '#f59e0b',
  ui: '#06b6d4',
  audio: '#a855f7',
  terrain: '#84cc16',
  default: '#94a3b8',
};

export default function InfiniteCanvas({
  initialNodes = [],
  initialLinks = [],
  onNodeClick,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>(initialNodes);
  const [links, setLinks] = useState<CanvasLink[]>(initialLinks);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const simulationRef = useRef<any>(null);
  const seeds = useSeedStore((s) => s.seeds);

  const seedNodes = useMemo(() => {
    return (seeds || []).map((s: any) => ({
      id: s.id || s.$hash,
      hash: s.$hash,
      name: s.$name,
      domain: s.$domain || 'default',
      generation: s.$lineage?.generation || 0,
      operation: s.$lineage?.operation || 'primordial',
      fitness: s.$fitness?.overall || 0,
    }));
  }, [seeds]);

  useEffect(() => {
    if (seedNodes.length > 0) {
      setNodes(seedNodes);
    }
  }, [seedNodes]);

  useEffect(() => {
    if (seedNodes.length === 0) return;

    const linkData: CanvasLink[] = [];
    const hashMap = new Map(seedNodes.map(n => [n.hash, n]));

    seedNodes.forEach(node => {
      const seed = hashMap.get(node.hash) as any;
      if (seed?.$lineage?.parents) {
        seed.$lineage.parents.forEach((parentHash: string) => {
          if (hashMap.has(parentHash)) {
            linkData.push({
              source: parentHash,
              target: node.hash,
              operation: seed.$lineage.operation || 'lineage',
            });
          }
        });
      }
    });

    setLinks(linkData);

    const sim = forceSimulation(seedNodes)
      .force('link', forceLink<any, any>(linkData).id((d: any) => d.hash).distance(80))
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(400, 300))
      .force('x', forceX(400).strength(0.05))
      .force('y', forceY(300).strength(0.05))
      .alphaDecay(0.02)
      .on('tick', () => {
        setNodes([...sim.nodes()]);
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [seedNodes]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridStart = -2000;
    const gridEnd = 2000;
    for (let x = gridStart; x <= gridEnd; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, gridStart);
      ctx.lineTo(x, gridEnd);
      ctx.stroke();
    }
    for (let y = gridStart; y <= gridEnd; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(gridStart, y);
      ctx.lineTo(gridEnd, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    links.forEach(link => {
      const source = typeof link.source === 'object' ? link.source : nodes.find(n => n.hash === link.source);
      const target = typeof link.target === 'object' ? link.target : nodes.find(n => n.hash === link.target);
      if (!source || !target) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    });

    nodes.forEach(node => {
      const color = DOMAIN_COLORS[node.domain] || DOMAIN_COLORS.default;
      const isSelected = selectedNode === node.hash;
      const radius = NODE_RADIUS;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const name = node.name?.slice(0, 12) || node.hash?.slice(0, 8) || 'seed';
      ctx.fillText(name, node.x, node.y + radius + 14);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(`G${node.generation}`, node.x, node.y + radius + 26);
    });

    ctx.restore();
  }, [nodes, links, transform, selectedNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        draw();
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - transform.x) / transform.scale,
      y: (screenY - transform.y) / transform.scale,
    };
  }, [transform]);

  const findNodeAtPosition = useCallback((canvasX: number, canvasY: number) => {
    for (const node of nodes) {
      const dx = canvasX - node.x;
      const dy = canvasY - node.y;
      if (Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform(prev => {
      const newScale = Math.max(0.2, Math.min(3, prev.scale * delta));
      const scaleChange = newScale / prev.scale;
      return {
        scale: newScale,
        x: mouseX - (mouseX - prev.x) * scaleChange,
        y: mouseY - (mouseY - prev.y) * scaleChange,
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const canvasPos = screenToCanvas(screenX, screenY);
    const node = findNodeAtPosition(canvasPos.x, canvasPos.y);

    if (node) {
      setDraggedNode(node.hash);
      if (onNodeClick) {
        setSelectedNode(node.hash);
        onNodeClick(node);
      }
    } else {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [screenToCanvas, findNodeAtPosition, onNodeClick, transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggedNode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const canvasPos = screenToCanvas(screenX, screenY);

      setNodes(prev => prev.map(n =>
        n.hash === draggedNode
          ? { ...n, fx: canvasPos.x, fy: canvasPos.y, x: canvasPos.x, y: canvasPos.y }
          : { ...n, fx: undefined, fy: undefined }
      ));
    } else if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    }
  }, [draggedNode, isPanning, panStart, screenToCanvas]);

  const handleMouseUp = useCallback(() => {
    if (draggedNode && simulationRef.current) {
      simulationRef.current.alpha(0.3).restart();
    }
    setDraggedNode(null);
    setIsPanning(false);
  }, [draggedNode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
      setTransform({ x: 0, y: 0, scale: 1 });
    } else if (e.key === 'Escape') {
      setSelectedNode(null);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-900 rounded-lg"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab"
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }))}
          className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded hover:bg-slate-700 transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale * 0.8) }))}
          className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded hover:bg-slate-700 transition-colors"
        >
          -
        </button>
        <button
          onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
          className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded hover:bg-slate-700 transition-colors"
        >
          Reset
        </button>
      </div>
      <div className="absolute bottom-4 right-4 text-xs text-slate-500 font-mono">
        {nodes.length} seeds · {transform.scale.toFixed(1)}x
      </div>
    </div>
  );
}