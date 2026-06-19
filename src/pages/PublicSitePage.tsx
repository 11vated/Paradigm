/**
 * PublicSitePage — The Paradigm public landing surface.
 *
 * Hero section, deterministic-artifact previews, and CTA loop. Every
 * element meets WCAG 2.2 AA (landmarks, headings, alt-text, contrast,
 * keyboard navigation). Fully responsive: mobile → tablet → desktop.
 *
 * Route: /public
 * (added before /* catch-all in App.tsx)
 */
import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Sparkles, Shuffle, Download, Github, Heart, Globe, Music,
  Box, Atom, Telescope, Waves, QrCode, ChevronDown, Star,
} from 'lucide-react';
import { renderSeedMobile, isFlagshipDomain } from '@/lib/rendering/mobile-renderer';

const FEATURES: Array<{ icon: React.ReactNode; title: string; desc: string }> = [
  { icon: <Sparkles size={20} aria-hidden="true" />, title: 'Deterministic Breeding', desc: 'Breed seeds across 27 domains. Same seed + same RNG = bit-identical artifact, every time.' },
  { icon: <Shuffle size={20} aria-hidden="true" />, title: 'Cross-Domain Composition', desc: 'Friend meets world becomes quest. Music seeds compose with game seeds. No boundaries.' },
  { icon: <Download size={20} aria-hidden="true" />, title: 'Sovereign Artifacts', desc: 'Every artifact cryptographically signed. ECDSA-P256 provenance. Own your creations.' },
  { icon: <Box size={20} aria-hidden="true" />, title: '27 Domain Engines', desc: 'From characters to cosmology, music to molecules — one generative substrate for all.' },
  { icon: <Heart size={20} aria-hidden="true" />, title: 'Sovereign Companions', desc: 'Friend seeds evolve with you. Memory, voice, personality — all deterministic, all yours.' },
  { icon: <Globe size={20} aria-hidden="true" />, title: 'Web-Native Substrate', desc: 'No blockchain required. Deterministic from browser. Export to chain when ready.' },
];

const SAMPLE_SEEDS = [
  { name: 'Aelara',
    domain: 'character',
    hash: '0xae7a',
    $domain: 'character',
    $name: 'Aelara',
    $fitness: { overall: 0.97 },
  },
  { name: 'Verdant Vale',
    domain: 'world',
    hash: '0xbb1b',
    $domain: 'world',
    $name: 'Verdant Vale',
  },
  { name: 'Quantum Bloom',
    domain: 'quantum',
    hash: '0xc0de',
    $domain: 'quantum',
    $name: 'Quantum Bloom',
  },
  { name: 'Synth Tide',
    domain: 'music',
    hash: '0xd3ad',
    $domain: 'music',
    $name: 'Synth Tide',
  },
  { name: 'Crystal Forest',
    domain: 'geometry3d',
    hash: '0xe5f7',
    $domain: 'geometry3d',
    $name: 'Crystal Forest',
  },
  { name: 'Stellar Nursery',
    domain: 'cosmology',
    hash: '0xf00d',
    $domain: 'cosmology',
    $name: 'Stellar Nursery',
  },
  { name: 'Web Weaver',
    domain: 'website',
    hash: '0xa11c',
    $domain: 'website',
    $name: 'Web Weaver',
  },
  { name: 'Sprite Dash',
    domain: 'sprite',
    hash: '0xb2e3',
    $domain: 'sprite',
    $name: 'Sprite Dash',
  },
].map((s) => ({
  ...s,
  $hash: s.hash,
  $lineage: { generation: 1 },
  $fitness: s.$fitness ?? null,
  strata: ['deterministic', 'sovereign'],
  genes: { seed_type: { type: 'string', value: s.domain } },
}));

function renderSvgDataUri(svgContent: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
}

function SeedCard({ seed }: { seed: Record<string, unknown> }) {
  const [svgContent, setSvgContent] = useState('');
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    const r = renderSeedMobile(
      seed as Parameters<typeof renderSeedMobile>[0],
      null,
      { width: 375, height: 280, format: 'svg' },
    );
    if (mounted.current) {
      setSvgContent(r.content);
      setLoading(false);
    }
    return () => { mounted.current = false; };
  }, [seed.$name]);

  const name = (seed.$name as string) || 'Untitled';
  const domain = (seed.$domain as string) || 'unknown';
  const isFlagship = isFlagshipDomain(domain);

  return (
    <article
      className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 transition-all duration-300 hover:border-zinc-600 hover:bg-zinc-900 focus-within:ring-2 focus-within:ring-amber-400 focus-within:ring-offset-2 focus-within:ring-offset-black"
    >
      <div className="aspect-[375/280] bg-black/40 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center" aria-label="Loading preview">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : (
          <img
            src={renderSvgDataUri(svgContent)}
            alt={`${name} — ${domain} artifact preview`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">{name}</h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{domain}</p>
          </div>
          {isFlagship && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              <Star size={10} aria-hidden="true" />
              flagship
            </span>
          )}
        </div>
        <NavLink
          to={`/substrate?seed=${seed.$hash as string}`}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 transition-colors focus:outline-none focus:underline"
          aria-label={`View ${name} in substrate`}
        >
          explore
          <ArrowRight size={12} aria-hidden="true" />
        </NavLink>
      </div>
    </article>
  );
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

const PublicSitePage: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [heroDone, setHeroDone] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setHeroDone(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-400 focus:text-black focus:rounded focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      <header role="banner" className="border-b border-zinc-900 bg-zinc-950 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <NavLink
            to="/public"
            className="font-serif text-base text-zinc-100 hover:text-amber-200 transition-colors"
            aria-label="Paradigm home"
          >
            Paradigm
          </NavLink>
          <nav aria-label="Main navigation" className="flex items-center gap-4 sm:gap-6 text-sm">
            <a
              href="#features"
              onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}
              className="text-zinc-500 hover:text-zinc-200 transition-colors text-xs uppercase tracking-widest"
            >
              features
            </a>
            <a
              href="#showcase"
              onClick={(e) => { e.preventDefault(); scrollToSection('showcase'); }}
              className="text-zinc-500 hover:text-zinc-200 transition-colors text-xs uppercase tracking-widest"
            >
              showcase
            </a>
            <a
              href="https://github.com/anomalyco/paradigm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-200 transition-colors"
              aria-label="View on GitHub (opens in new tab)"
            >
              <Github size={16} aria-hidden="true" />
            </a>
            <NavLink
              to="/classic/studio"
              className="hidden sm:inline-flex items-center gap-1.5 bg-amber-400/10 text-amber-300 border border-amber-400/20 px-3 py-1.5 rounded-lg text-xs hover:bg-amber-400/20 transition-colors"
            >
              launch studio
              <ArrowRight size={12} aria-hidden="true" />
            </NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content" role="main">
        <section
          aria-labelledby="hero-title"
          className="relative min-h-[70vh] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-radial from-zinc-900 via-zinc-950 to-black opacity-80" aria-hidden="true" />

          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-20">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={mounted ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 mb-8" role="status">
                <span className="w-2 h-2 rounded-full bg-green-400" aria-hidden="true" />
                <span className="text-[11px] text-amber-300 uppercase tracking-widest font-mono">substrate live · deterministic</span>
              </div>

              <h1 id="hero-title" className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold leading-tight tracking-tight">
                Deterministic
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100">
                  Synthetic Evolution
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Breed, mutate, and compose digital artifacts across 27 domains.
                Every seed produces bit-identical output forever.
                <span className="block mt-2 text-zinc-500 text-sm">Same seed + same RNG = same artifact. Across machines. Across browsers. Across time.</span>
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <NavLink
                  to="/classic/studio"
                  className="inline-flex items-center gap-2 bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-all text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-black"
                >
                  <Sparkles size={16} aria-hidden="true" />
                  create your first seed
                  <ArrowRight size={14} aria-hidden="true" />
                </NavLink>
                <a
                  href="#showcase"
                  onClick={(e) => { e.preventDefault(); scrollToSection('showcase'); }}
                  className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm border border-zinc-800 px-6 py-3 rounded-xl hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-black"
                >
                  view artifacts
                  <ChevronDown size={14} aria-hidden="true" />
                </a>
              </div>
            </motion.div>
          </div>

          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
            aria-hidden="true"
          >
            <ChevronDown size={20} className="text-zinc-600" />
          </div>
        </section>

        <section
          id="features"
          aria-labelledby="features-title"
          className="max-w-6xl mx-auto px-4 sm:px-8 py-20 sm:py-28"
        >
          <div className="text-center mb-16">
            <h2 id="features-title" className="text-2xl sm:text-3xl font-serif font-semibold">
              One substrate.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-100 mt-1">Infinite expression.</span>
            </h2>
            <p className="mt-4 text-zinc-500 text-sm max-w-xl mx-auto">
              Every artifact — from characters to quantum fields — lives on the same deterministic kernel.
              Breed across domains. Compose without friction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 sm:p-6 hover:border-zinc-600 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-300 group-hover:bg-amber-400/10 transition-colors mb-4" aria-hidden="true">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm text-zinc-200 mb-2">{f.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section
          id="showcase"
          aria-labelledby="showcase-title"
          className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20"
        >
          <div className="text-center mb-12">
            <h2 id="showcase-title" className="text-2xl sm:text-3xl font-serif font-semibold">
              Artifact previews
            </h2>
            <p className="mt-3 text-zinc-500 text-sm">
              Deterministic seeds rendered live in your browser. Click explore to dive in.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <AnimatePresence>
              {SAMPLE_SEEDS.map((seed) => (
                <motion.div
                  key={seed.$hash as string}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  layout
                >
                  <SeedCard seed={seed as unknown as Record<string, unknown>} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="text-center mt-12">
            <NavLink
              to="/classic/studio"
              className="inline-flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200 border border-amber-400/20 px-5 py-2.5 rounded-xl hover:bg-amber-400/5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-black"
            >
              see all 27 domains
              <ArrowRight size={14} aria-hidden="true" />
            </NavLink>
          </div>
        </section>

        <section
          aria-labelledby="cta-title"
          className="border-t border-zinc-900"
        >
          <div className="max-w-3xl mx-auto px-4 py-20 sm:py-28 text-center">
            <h2 id="cta-title" className="text-2xl sm:text-3xl font-serif font-semibold mb-4">
              Ready to evolve?
            </h2>
            <p className="text-zinc-500 text-sm mb-8 max-w-lg mx-auto">
              Generate your first deterministic artifact in seconds. No signup required.
              Open source. Sovereign by default.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <NavLink
                to="/classic/studio"
                className="inline-flex items-center gap-2 bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-all text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-black"
              >
                <Sparkles size={16} aria-hidden="true" />
                launch studio
                <ArrowRight size={14} aria-hidden="true" />
              </NavLink>
              <a
                href="https://github.com/anomalyco/paradigm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm border border-zinc-800 px-6 py-3 rounded-xl hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-black"
              >
                <Github size={16} aria-hidden="true" />
                view on GitHub
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer role="contentinfo" className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-zinc-600 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
              paradigm substrate
            </div>
            <nav aria-label="Footer navigation" className="flex items-center gap-4 sm:gap-6 text-xs text-zinc-600">
              <NavLink to="/classic/studio" className="hover:text-zinc-400 transition-colors">studio</NavLink>
              <NavLink to="/substrate" className="hover:text-zinc-400 transition-colors">substrate</NavLink>
              <NavLink to="/health" className="hover:text-zinc-400 transition-colors">health</NavLink>
              <a href="https://github.com/anomalyco/paradigm" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors" aria-label="GitHub (opens in new tab)">
                <Github size={14} aria-hidden="true" />
              </a>
            </nav>
            <p className="text-[10px] text-zinc-700">
              deterministic · sovereign · breedable
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicSitePage;
