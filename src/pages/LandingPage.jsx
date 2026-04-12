import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Dna, Layers, Shield, GitBranch, Sparkles, Zap, ArrowRight, Hexagon, Atom, Binary } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getStats } from '@/services/api';

const LAYERS = [
  { num: 7, name: 'Studio & Marketplace', desc: 'React SPA, federation, payments', color: '#F97316', icon: Sparkles },
  { num: 6, name: 'Intelligence', desc: 'GSPL Agent, 8 sub-agents, memory', color: '#F59E0B', icon: Atom },
  { num: 5, name: 'Evolution & Composition', desc: 'GA, MAP-Elites, functors', color: '#10B981', icon: GitBranch },
  { num: 4, name: 'Domain Engines', desc: '26 developmental pipelines', color: '#06B6D4', icon: Hexagon },
  { num: 3, name: 'GSPL Language', desc: 'Lexer, parser, type checker', color: '#8B5CF6', icon: Binary },
  { num: 2, name: 'Seed System', desc: 'UniversalSeed, 17 gene types', color: '#EC4899', icon: Dna },
  { num: 1, name: 'Kernel', desc: 'RNG, FIM, tick cycle, effects', color: '#EF4444', icon: Zap },
];

const INVENTIONS = [
  { title: 'UniversalSeed', desc: 'A single JSON structure encoding any creative artifact across 26 domains with genes, lineage, sovereignty.', icon: Dna },
  { title: '17-Type Gene System', desc: 'From scalar to quantum to sovereignty — each type with validate, mutate, crossover, distance operators.', icon: Layers },
  { title: 'Deterministic Engines', desc: '26 domain engines following pure staged pipelines. Same seed = same artifact, always.', icon: Hexagon },
  { title: 'Cross-Domain Composition', desc: 'Category-theoretic functor bridges between domains. A character becomes a sprite, a song, a game.', icon: GitBranch },
  { title: 'Cryptographic Sovereignty', desc: 'ECDSA P-256 signatures baked into the seed. Your creation, your proof, no intermediary.', icon: Shield },
];

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } };

export default function LandingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [stats, setStats] = useState(null);

  const goToStudio = () => navigate(isAuthenticated ? '/studio' : '/auth');

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden">
      {/* ─── Nav ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/5" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-orange-500" />
            <span className="font-heading font-black text-lg tracking-tight">PARADIGM</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-400">
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#inventions" className="hover:text-white transition-colors">Inventions</a>
            <button
              data-testid="nav-enter-studio"
              onClick={goToStudio}
              className="px-4 py-1.5 bg-orange-500 text-black font-semibold text-xs uppercase tracking-wider hover:bg-orange-400 transition-colors"
            >
              Enter Studio
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-[#030303]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(249,115,22,0.3) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }} />
        <motion.div
          className="relative z-10 text-center px-6 max-w-5xl"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
        >
          <motion.p variants={fadeUp} className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500/80 mb-6">
            Genetically Organized Evolution
          </motion.p>
          <motion.h1 variants={fadeUp} className="font-heading font-black text-6xl sm:text-7xl lg:text-[120px] leading-[0.85] tracking-tighter mb-6">
            PARADIGM
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            The Genetic Operating Environment for Digital Creation.
            Every artifact is a living blueprint. Every creation evolves.
          </motion.p>
          <motion.p variants={fadeUp} className="font-mono text-xs text-neutral-600 mb-10">
            26 domains / 17 gene types / 7 layers / infinite possibilities
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              data-testid="hero-enter-studio"
              onClick={goToStudio}
              className="px-8 py-3 bg-orange-500 text-black font-bold text-sm uppercase tracking-wider hover:bg-orange-400 transition-all flex items-center gap-2 justify-center"
            >
              Enter the Studio <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#architecture"
              className="px-8 py-3 border border-neutral-700 text-neutral-300 font-medium text-sm uppercase tracking-wider hover:bg-white/5 transition-all text-center"
            >
              View Architecture
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats Bar ───────────────────────────────────────── */}
      <section className="border-y border-neutral-800 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-neutral-800">
          {[
            { label: 'Domains', value: '26' },
            { label: 'Gene Types', value: '17' },
            { label: 'Inventions', value: '1,064' },
            { label: 'Seeds Created', value: stats?.total_seeds || '0' },
          ].map((s, i) => (
            <div key={i} className="py-8 px-6 text-center" data-testid={`stat-${s.label.toLowerCase().replace(' ', '-')}`}>
              <div className="font-heading font-black text-3xl text-white">{s.value}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 7-Layer Architecture ────────────────────────────── */}
      <section id="architecture" className="py-24 px-6" data-testid="architecture-section">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500/80 mb-3">System Architecture</p>
            <h2 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter">Seven Layers</h2>
            <p className="text-neutral-500 mt-3 max-w-xl text-base">Each layer depends only on the layer below. Each can be replaced independently.</p>
          </div>
          <div className="space-y-[1px]">
            {LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <motion.div
                  key={layer.num}
                  className="opacity-0 animate-gridReveal"
                  style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-center gap-4 bg-[#0a0a0a] border border-neutral-800 p-5 hover:border-neutral-700 transition-colors group">
                    <div className="w-10 h-10 flex items-center justify-center border border-neutral-800 group-hover:border-orange-500/30 transition-colors">
                      <Icon className="w-4 h-4" style={{ color: layer.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-neutral-600">L{layer.num}</span>
                        <span className="font-heading font-bold text-sm text-white">{layer.name}</span>
                      </div>
                      <p className="font-mono text-[11px] text-neutral-500 mt-0.5">{layer.desc}</p>
                    </div>
                    <div className="w-24 h-1 bg-neutral-900 overflow-hidden hidden md:block">
                      <div className="h-full" style={{ width: `${(layer.num / 7) * 100}%`, background: layer.color, opacity: 0.6 }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5 Core Inventions ───────────────────────────────── */}
      <section id="inventions" className="py-24 px-6 bg-[#0a0a0a]" data-testid="inventions-section">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald-500/80 mb-3">Core Technology</p>
            <h2 className="font-heading font-black text-4xl sm:text-5xl tracking-tighter">Five Inventions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-neutral-800">
            {INVENTIONS.map((inv, i) => {
              const Icon = inv.icon;
              return (
                <motion.div
                  key={inv.title}
                  className="bg-[#0a0a0a] p-8 opacity-0 animate-fadeInUp"
                  style={{ animationDelay: `${i * 0.12}s`, animationFillMode: 'forwards' }}
                  data-testid={`invention-${i}`}
                >
                  <Icon className="w-6 h-6 text-orange-500 mb-4" />
                  <h3 className="font-heading font-bold text-base mb-2">{inv.title}</h3>
                  <p className="text-neutral-500 text-sm leading-relaxed">{inv.desc}</p>
                </motion.div>
              );
            })}
            <div className="bg-[#0a0a0a] p-8 flex flex-col justify-center items-center border border-dashed border-neutral-700">
              <p className="font-mono text-xs text-neutral-600 text-center mb-3">231 briefs. 1,064 inventions. One substrate.</p>
              <button
                data-testid="inventions-enter-studio"
                onClick={goToStudio}
                className="px-6 py-2 bg-orange-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-orange-400 transition-all"
              >
                Start Creating
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-neutral-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Dna className="w-4 h-4 text-orange-500" />
            <span className="font-heading font-bold text-sm">PARADIGM</span>
            <span className="font-mono text-[10px] text-neutral-600 ml-2">v2.0.0</span>
          </div>
          <p className="font-mono text-[10px] text-neutral-600 tracking-wider">
            GSPL OPEN SPECIFICATION LICENSE / GENETICALLY ORGANIZED EVOLUTION
          </p>
        </div>
      </footer>
    </div>
  );
}
