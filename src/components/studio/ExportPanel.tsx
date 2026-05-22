/**
 * ExportPanel — Download any artifact in any format
 *
 * For every domain, surfaces the appropriate export targets:
 *   - .gseed   Binary sovereign package (all domains)
 *   - .svg     Vector art (visual2d, sprite, world, molecule, field, quantum)
 *   - .html    Deployed website/game (website, game)
 *   - .wav     Audio (music, audio)
 *   - .gltf    3D model (character, geometry3d)
 *   - .pdb     Molecular coordinates (molecule)
 *   - .json    Raw seed data + simulation data (all)
 *   - .zip     Full app codebase (app)
 *   - .md      Narrative story (narrative)
 *   - .glsl    Shader source (shader)
 *   - .gspl    GSPL seed program (all)
 */

import { useState } from 'react';
import { Download, Package, FileText, Music, Box, Code, Globe, Atom, Sigma, FileCode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExportFormat {
  ext: string;
  label: string;
  mime: string;
  icon: React.ReactNode;
  domains: string[] | 'all';
  endpoint: string;
}

interface ExportPanelProps {
  seed: Record<string, unknown>;
  domain: string;
  artifact?: Record<string, unknown>;
  seedId?: string;
}

// ─── Format registry ──────────────────────────────────────────────────────────

const FORMATS: ExportFormat[] = [
  {
    ext: '.gseed',
    label: 'Sovereign Package',
    mime: 'application/octet-stream',
    icon: <Package className="w-4 h-4" />,
    domains: 'all',
    endpoint: '/api/sovereignty/export/gseed',
  },
  {
    ext: '.gspl',
    label: 'GSPL Program',
    mime: 'text/plain',
    icon: <Sigma className="w-4 h-4" />,
    domains: 'all',
    endpoint: '/api/gspl/export',
  },
  {
    ext: '.json',
    label: 'Raw JSON',
    mime: 'application/json',
    icon: <FileText className="w-4 h-4" />,
    domains: 'all',
    endpoint: '/api/seeds/export/json',
  },
  {
    ext: '.svg',
    label: 'SVG Vector',
    mime: 'image/svg+xml',
    icon: <Box className="w-4 h-4" />,
    domains: ['visual2d', 'sprite', 'world', 'molecule', 'field', 'quantum', 'character', 'procedural'],
    endpoint: '/api/seeds/export/svg',
  },
  {
    ext: '.html',
    label: 'HTML File',
    mime: 'text/html',
    icon: <Globe className="w-4 h-4" />,
    domains: ['website', 'game', 'narrative'],
    endpoint: '/api/seeds/export/html',
  },
  {
    ext: '.wav',
    label: 'WAV Audio',
    mime: 'audio/wav',
    icon: <Music className="w-4 h-4" />,
    domains: ['music', 'audio'],
    endpoint: '/api/seeds/export/wav',
  },
  {
    ext: '.gltf',
    label: 'GLTF 3D Model',
    mime: 'model/gltf+json',
    icon: <Box className="w-4 h-4" />,
    domains: ['character', 'geometry3d', 'vehicle', 'architecture', 'furniture'],
    endpoint: '/api/seeds/export/gltf',
  },
  {
    ext: '.pdb',
    label: 'PDB Coordinates',
    mime: 'chemical/x-pdb',
    icon: <Atom className="w-4 h-4" />,
    domains: ['molecule'],
    endpoint: '/api/seeds/export/pdb',
  },
  {
    ext: '.glsl',
    label: 'GLSL Shader',
    mime: 'text/plain',
    icon: <Code className="w-4 h-4" />,
    domains: ['shader'],
    endpoint: '/api/seeds/export/glsl',
  },
  {
    ext: '.zip',
    label: 'App Codebase',
    mime: 'application/zip',
    icon: <FileCode className="w-4 h-4" />,
    domains: ['app'],
    endpoint: '/api/seeds/export/zip',
  },
  {
    ext: '.md',
    label: 'Markdown Story',
    mime: 'text/markdown',
    icon: <FileText className="w-4 h-4" />,
    domains: ['narrative'],
    endpoint: '/api/seeds/export/markdown',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function ExportPanel({ seed, domain, artifact, seedId }: ExportPanelProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const available = FORMATS.filter(f =>
    f.domains === 'all' || f.domains.includes(domain)
  );

  async function handleDownload(fmt: ExportFormat) {
    setDownloading(fmt.ext);
    try {
      const res = await fetch(fmt.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': fmt.mime },
        body: JSON.stringify({ seed, domain, artifact, seedId }),
      });

      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paradigm-${(seed as any).$hash?.slice(0, 8) ?? 'seed'}${fmt.ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setCompleted(prev => new Set([...prev, fmt.ext]));
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Download className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-200">Export</span>
        <span className="ml-auto text-xs text-zinc-500">{domain}</span>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        {available.map(fmt => {
          const isLoading = downloading === fmt.ext;
          const isDone = completed.has(fmt.ext);
          return (
            <button
              key={fmt.ext}
              onClick={() => handleDownload(fmt)}
              disabled={!!downloading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900
                         hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left
                         disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className={isDone ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200'}>
                {fmt.icon}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-mono font-medium text-zinc-300 truncate">
                  {isLoading ? 'Generating…' : fmt.ext}
                </div>
                <div className="text-[10px] text-zinc-600 truncate">{fmt.label}</div>
              </div>
              {isLoading && (
                <motion.div
                  className="ml-auto w-3 h-3 border border-zinc-500 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="px-4 pb-3">
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          All exports embed seed provenance. The <span className="text-zinc-400">.gseed</span> package
          includes the full ECDSA P-256 sovereignty signature and is independently verifiable.
        </p>
      </div>
    </div>
  );
}
