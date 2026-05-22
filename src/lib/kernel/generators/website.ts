/**
 * Website Generator — Sovereign Digital Presence
 *
 * A website seed grows into a complete, deployable HTML/CSS/JS bundle.
 * Every element — copy, color, layout, typography, imagery — is derived
 * deterministically from the seed's genes. Same seed = same website, forever.
 *
 * Output: index.html + style.css + app.js + manifest.json
 *
 * Composition functor bridges used:
 *   narrative gene  → all copy (headlines, body, CTAs)
 *   visual gene     → palette, hero imagery (inline SVG)
 *   typography gene → font stack (CSS system font fallback or generated stack)
 *   music gene      → ambient BPM → CSS animation timing
 *   physics gene    → scroll behavior, spring constants
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

export type WebsitePurpose = 'portfolio' | 'landing' | 'blog' | 'docs' | 'ecommerce' | 'tool' | 'agency' | 'startup';
export type WebsiteAesthetic = 'minimal' | 'brutalist' | 'glassmorphic' | 'editorial' | 'cyberpunk' | 'organic' | 'corporate';
export type WebsiteSection = 'hero' | 'features' | 'about' | 'portfolio' | 'pricing' | 'testimonials' | 'contact' | 'cta' | 'stats' | 'blog' | 'faq';

export interface WebsiteParams {
  purpose: WebsitePurpose;
  aesthetic: WebsiteAesthetic;
  sections: WebsiteSection[];
  palette: { bg: string; fg: string; accent: string; muted: string; surface: string };
  fonts: { heading: string; body: string };
  motion: number;
  density: number;
  brandName: string;
  tagline: string;
}

export interface WebsiteOutput {
  filePath: string;
  indexHtml: string;
  styleCss: string;
  appJs: string;
  sectionCount: number;
  lineCount: number;
}

const PURPOSES: WebsitePurpose[] = ['portfolio', 'landing', 'blog', 'docs', 'ecommerce', 'tool', 'agency', 'startup'];
const AESTHETICS: WebsiteAesthetic[] = ['minimal', 'brutalist', 'glassmorphic', 'editorial', 'cyberpunk', 'organic', 'corporate'];

const BRAND_ADJECTIVES = ['Apex', 'Nova', 'Flux', 'Arc', 'Prism', 'Veil', 'Axis', 'Fold', 'Drift', 'Core', 'Edge', 'Root', 'Limb', 'Reach', 'Bloom'];
const BRAND_NOUNS = ['Studio', 'Labs', 'Works', 'Co', 'Systems', 'Stack', 'Guild', 'House', 'Press', 'Farm', 'Bay', 'Path'];
const TAGLINES: Record<WebsitePurpose, string[]> = {
  portfolio: ['Crafted with intention.', 'Work that speaks.', 'Precision in practice.', 'Form follows function.'],
  landing:   ['The future, launched.', 'Your next unfair advantage.', 'Built different.', 'Change starts here.'],
  blog:      ['Ideas worth keeping.', 'Thinking in public.', 'Long form, sharp mind.', 'The uncut version.'],
  docs:      ['Read the manual.', 'Everything you need.', 'Clear by design.', 'The full picture.'],
  ecommerce: ['Built to last.', 'Own the real thing.', 'Quality is the product.', 'Curated, not collected.'],
  tool:      ['Get it done.', 'The right tool.', 'Efficiency as a feature.', 'Less friction, more flow.'],
  agency:    ['We make it happen.', 'Your vision, our craft.', 'Results, not promises.', 'The full-service answer.'],
  startup:   ['Zero to one.', 'The problem is solved.', 'We move fast.', 'The boring stuff is gone.'],
};

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): WebsiteParams {
  const purpose = (seed.genes?.purpose?.value as WebsitePurpose) ?? PURPOSES[rng.nextInt(0, PURPOSES.length - 1)];
  const aesthetic = (seed.genes?.aesthetic?.value as WebsiteAesthetic) ?? AESTHETICS[rng.nextInt(0, AESTHETICS.length - 1)];
  const motion = typeof seed.genes?.motion?.value === 'number' ? seed.genes.motion.value : rng.nextF64();
  const density = typeof seed.genes?.density?.value === 'number' ? seed.genes.density.value : 0.3 + rng.nextF64() * 0.5;

  const baseHue = rng.nextF64() * 360;
  const palette = buildPalette(aesthetic, baseHue, rng);

  const fontOptions = {
    minimal:      { heading: 'Inter, system-ui, sans-serif',           body: 'Inter, system-ui, sans-serif' },
    brutalist:    { heading: '"Courier New", Courier, monospace',      body: '"Courier New", Courier, monospace' },
    glassmorphic: { heading: '"SF Pro Display", system-ui, sans-serif', body: 'system-ui, sans-serif' },
    editorial:    { heading: '"Georgia", "Times New Roman", serif',     body: '"Georgia", serif' },
    cyberpunk:    { heading: '"Share Tech Mono", monospace',            body: '"Share Tech Mono", monospace' },
    organic:      { heading: '"Lora", Georgia, serif',                  body: '"Lora", Georgia, serif' },
    corporate:    { heading: '"Helvetica Neue", Arial, sans-serif',     body: '"Helvetica Neue", Arial, sans-serif' },
  };
  const fonts = fontOptions[aesthetic];

  const adj = BRAND_ADJECTIVES[rng.nextInt(0, BRAND_ADJECTIVES.length - 1)];
  const noun = BRAND_NOUNS[rng.nextInt(0, BRAND_NOUNS.length - 1)];
  const brandName = (seed.genes?.brandName?.value as string) ?? `${adj} ${noun}`;
  const taglinePool = TAGLINES[purpose];
  const tagline = (seed.genes?.tagline?.value as string) ?? taglinePool[rng.nextInt(0, taglinePool.length - 1)];

  const sectionSets: Record<WebsitePurpose, WebsiteSection[]> = {
    portfolio:  ['hero', 'about', 'portfolio', 'contact'],
    landing:    ['hero', 'features', 'testimonials', 'pricing', 'cta'],
    blog:       ['hero', 'blog', 'about', 'contact'],
    docs:       ['hero', 'features', 'faq', 'contact'],
    ecommerce:  ['hero', 'features', 'portfolio', 'pricing', 'testimonials', 'cta'],
    tool:       ['hero', 'features', 'pricing', 'faq', 'cta'],
    agency:     ['hero', 'about', 'features', 'portfolio', 'stats', 'testimonials', 'contact'],
    startup:    ['hero', 'features', 'stats', 'pricing', 'testimonials', 'cta'],
  };
  const sections: WebsiteSection[] = (seed.genes?.sections?.value as WebsiteSection[]) ?? sectionSets[purpose];

  return { purpose, aesthetic, sections, palette, fonts, motion, density, brandName, tagline };
}

function buildPalette(aesthetic: WebsiteAesthetic, baseHue: number, rng: Xoshiro256StarStar): WebsiteParams['palette'] {
  const configs: Record<WebsiteAesthetic, () => WebsiteParams['palette']> = {
    minimal:      () => ({ bg: '#fafafa', fg: '#111111', accent: hsl(baseHue, 70, 45), muted: '#888888', surface: '#ffffff' }),
    brutalist:    () => ({ bg: '#ffffff', fg: '#000000', accent: hsl(baseHue, 100, 50), muted: '#555555', surface: '#f0f0f0' }),
    glassmorphic: () => ({ bg: hsl(baseHue, 30, 8), fg: '#ffffff', accent: hsl(baseHue, 80, 65), muted: 'rgba(255,255,255,0.4)', surface: 'rgba(255,255,255,0.08)' }),
    editorial:    () => ({ bg: '#f7f3ed', fg: '#1a1208', accent: hsl(baseHue, 60, 35), muted: '#8a7968', surface: '#ede9e0' }),
    cyberpunk:    () => ({ bg: '#0a0a0f', fg: hsl(baseHue, 100, 65), accent: hsl((baseHue + 150) % 360, 100, 60), muted: hsl(baseHue, 30, 40), surface: '#0f0f1a' }),
    organic:      () => ({ bg: hsl(baseHue, 20, 97), fg: hsl(baseHue, 15, 15), accent: hsl(baseHue, 55, 40), muted: hsl(baseHue, 10, 55), surface: hsl(baseHue, 15, 93) }),
    corporate:    () => ({ bg: '#ffffff', fg: '#1a2332', accent: hsl(baseHue, 75, 40), muted: '#6b7280', surface: '#f3f4f6' }),
  };
  return configs[aesthetic]();
}

function generateHeroSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const headlineWords = [params.brandName, '—', params.tagline];
  const subline = generateSubline(params.purpose, rng);
  const ctaText = { portfolio: 'See My Work', landing: 'Get Started', blog: 'Read Latest', docs: 'View Docs', ecommerce: 'Shop Now', tool: 'Try It Free', agency: 'Start a Project', startup: 'Join Beta' }[params.purpose];

  const heroSvg = generateHeroSvg(params, rng);

  return `
  <section class="section hero" id="hero">
    <div class="container">
      <div class="hero-content">
        <div class="hero-text">
          <p class="eyebrow">${params.purpose.charAt(0).toUpperCase() + params.purpose.slice(1)}</p>
          <h1 class="hero-heading">${headlineWords.join(' ')}</h1>
          <p class="hero-sub">${subline}</p>
          <div class="hero-cta">
            <a href="#contact" class="btn btn-primary">${ctaText}</a>
            <a href="#features" class="btn btn-ghost">Learn more →</a>
          </div>
        </div>
        <div class="hero-visual">
          ${heroSvg}
        </div>
      </div>
    </div>
  </section>`;
}

function generateHeroSvg(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const w = 520; const h = 400;
  const shapes: string[] = [];
  const count = 6 + Math.floor(params.density * 12);
  for (let i = 0; i < count; i++) {
    const x = rng.nextF64() * w;
    const y = rng.nextF64() * h;
    const r = 20 + rng.nextF64() * 120;
    const opacity = 0.08 + rng.nextF64() * 0.18;
    shapes.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${params.palette.accent}" opacity="${opacity.toFixed(2)}"/>`);
  }
  for (let i = 0; i < 3; i++) {
    const x1 = rng.nextF64() * w; const y1 = rng.nextF64() * h;
    const x2 = rng.nextF64() * w; const y2 = rng.nextF64() * h;
    const cx = rng.nextF64() * w; const cy = rng.nextF64() * h;
    shapes.push(`<path d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" stroke="${params.palette.accent}" stroke-width="${(1 + rng.nextF64() * 2).toFixed(1)}" fill="none" opacity="0.3"/>`);
  }
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="hero-svg" aria-hidden="true">${shapes.join('')}</svg>`;
}

function generateSubline(purpose: WebsitePurpose, rng: Xoshiro256StarStar): string {
  const lines: Record<WebsitePurpose, string[]> = {
    portfolio:  ['Independent designer and engineer. I build products with care.', 'Ten years of making things that work.', 'From concept to production, end to end.'],
    landing:    ['The platform built for teams who ship.', 'Everything you need, nothing you don\'t.', 'Join thousands of teams already moving faster.'],
    blog:       ['Writing about design, code, and the spaces between.', 'Long-form thoughts on building software.', 'Occasional essays on things that matter.'],
    docs:       ['Complete reference documentation. Start in minutes.', 'Everything you need to integrate and ship.', 'Clear, accurate, maintained.'],
    ecommerce:  ['Designed to endure. Made to be used.', 'Select pieces for people who know quality.', 'Every item chosen with intention.'],
    tool:       ['The missing piece in your workflow.', 'Built for professionals who need it fast.', 'Automate the tedious. Keep the important.'],
    agency:     ['We build digital products for ambitious companies.', 'Strategy, design, and engineering as one.', 'Your brand deserves better execution.'],
    startup:    ['The problem is finally solved.', 'We\'ve been building this for three years. It\'s ready.', 'The way this should have worked all along.'],
  };
  const pool = lines[purpose];
  return pool[rng.nextInt(0, pool.length - 1)];
}

function generateFeaturesSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const features = generateFeatureSet(params.purpose, rng, 3 + Math.floor(params.density * 3));
  const items = features.map(f => `
      <div class="feature-card">
        <div class="feature-icon" aria-hidden="true">${f.icon}</div>
        <h3 class="feature-title">${f.title}</h3>
        <p class="feature-desc">${f.desc}</p>
      </div>`).join('');
  return `
  <section class="section features" id="features">
    <div class="container">
      <div class="section-header">
        <h2 class="section-heading">What we do</h2>
        <p class="section-sub">The capabilities that matter.</p>
      </div>
      <div class="features-grid">${items}
      </div>
    </div>
  </section>`;
}

interface Feature { icon: string; title: string; desc: string }
function generateFeatureSet(purpose: WebsitePurpose, rng: Xoshiro256StarStar, count: number): Feature[] {
  const pools: Record<WebsitePurpose, Feature[]> = {
    landing: [
      { icon: '◈', title: 'Lightning Fast', desc: 'Sub-second load times and real-time updates that keep users in flow.' },
      { icon: '◉', title: 'Fully Sovereign', desc: 'Your data stays yours. No lock-in, no hidden exports, no surprises.' },
      { icon: '◌', title: 'Built to Scale', desc: 'From one user to one million. The architecture handles it.' },
      { icon: '▣', title: 'Open by Default', desc: 'Standards-compliant, extensible, and integrates with everything.' },
      { icon: '◎', title: 'Secure Core', desc: 'End-to-end encryption with zero-knowledge architecture.' },
      { icon: '⬡', title: 'Team Ready', desc: 'Roles, permissions, audit logs. Works the way your org works.' },
    ],
    portfolio: [
      { icon: '◈', title: 'Product Design', desc: 'Full-cycle product design from discovery through delivery.' },
      { icon: '◉', title: 'Engineering', desc: 'Production code. TypeScript, Rust, Go. Clean, tested, shipped.' },
      { icon: '◌', title: 'Strategy', desc: 'Know what to build before building it.' },
    ],
    tool: [
      { icon: '◈', title: 'One-Click Setup', desc: 'Install, configure, and run in under five minutes.' },
      { icon: '◉', title: 'API First', desc: 'Full REST and GraphQL APIs. Automate anything.' },
      { icon: '◌', title: 'Audit Trail', desc: 'Every action logged. Full observability built in.' },
    ],
    startup: [
      { icon: '◈', title: 'Zero Setup', desc: 'No infrastructure to manage. Just your product.' },
      { icon: '◉', title: 'Real Time', desc: 'Live data, live collaboration, live everything.' },
      { icon: '◌', title: 'Export Anywhere', desc: 'Your data in open formats. Always.' },
    ],
    agency: [
      { icon: '◈', title: 'Strategy First', desc: 'We understand the problem before writing a line of code.' },
      { icon: '◉', title: 'End to End', desc: 'Discovery, design, engineering, and launch under one roof.' },
      { icon: '◌', title: 'Long Term', desc: 'Retainers available. We grow with you.' },
    ],
    blog: [{ icon: '◈', title: 'Design', desc: 'Thinking through aesthetics and function.' }, { icon: '◉', title: 'Engineering', desc: 'The craft of building software.' }, { icon: '◌', title: 'Strategy', desc: 'How decisions get made.' }],
    docs: [{ icon: '◈', title: 'Quick Start', desc: 'Up and running in minutes.' }, { icon: '◉', title: 'API Reference', desc: 'Every method, every parameter.' }, { icon: '◌', title: 'Guides', desc: 'Step by step walkthroughs.' }],
    ecommerce: [{ icon: '◈', title: 'Quality Materials', desc: 'Sourced with intention.' }, { icon: '◉', title: 'Lifetime Guarantee', desc: 'We stand behind everything.' }, { icon: '◌', title: 'Free Returns', desc: '60 days, no questions.' }],
  };
  const pool = pools[purpose] ?? pools.landing;
  const selected = [...pool].sort(() => rng.nextF64() - 0.5).slice(0, count);
  return selected;
}

function generateAboutSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const lines = [
    `${params.brandName} was started with one goal: do less but do it better.`,
    `We've been at this since the beginning. We know what works and what doesn't.`,
    `Small team, full focus. We don't spread thin.`,
  ];
  const text = lines.slice(0, 2 + Math.floor(params.density * 2)).join(' ');
  return `
  <section class="section about" id="about">
    <div class="container">
      <div class="about-grid">
        <div class="about-text">
          <h2 class="section-heading">About</h2>
          <p class="about-body">${text}</p>
        </div>
        <div class="about-stats">
          <div class="stat"><span class="stat-n">${rng.nextInt(3, 12)}+</span><span class="stat-l">Years</span></div>
          <div class="stat"><span class="stat-n">${rng.nextInt(20, 200)}+</span><span class="stat-l">Projects</span></div>
          <div class="stat"><span class="stat-n">${rng.nextInt(5, 50)}+</span><span class="stat-l">Clients</span></div>
        </div>
      </div>
    </div>
  </section>`;
}

function generateStatsSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const stats = [
    { n: `${rng.nextInt(10, 99)}K`, label: 'Users' },
    { n: `${rng.nextInt(99, 999)}%`, label: 'Uptime' },
    { n: `${rng.nextInt(2, 20)}ms`, label: 'P99 Latency' },
    { n: `${rng.nextInt(3, 50)}K`, label: 'Deployments' },
  ].slice(0, 3 + Math.floor(params.density * 2));
  const items = stats.map(s => `<div class="stat-item"><span class="stat-big">${s.n}</span><span class="stat-label">${s.label}</span></div>`).join('');
  return `
  <section class="section stats" id="stats">
    <div class="container">
      <div class="stats-row">${items}</div>
    </div>
  </section>`;
}

function generatePricingSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const base = rng.nextInt(9, 49);
  const tiers = [
    { name: 'Starter', price: 'Free', desc: 'For individuals getting started.', features: ['Up to 3 projects', 'Community support', '1 GB storage'] },
    { name: 'Pro', price: `$${base}/mo`, desc: 'For professionals who need more.', features: [`Unlimited projects`, 'Priority support', '100 GB storage', 'Advanced analytics', 'API access'], featured: true },
    { name: 'Team', price: `$${base * 4}/mo`, desc: 'For teams shipping together.', features: [`Everything in Pro`, 'Team management', 'SSO', 'SLA guarantee', 'Dedicated success'] },
  ];
  const cards = tiers.map(t => `
      <div class="pricing-card${t.featured ? ' pricing-featured' : ''}">
        ${t.featured ? '<div class="pricing-badge">Most Popular</div>' : ''}
        <div class="pricing-name">${t.name}</div>
        <div class="pricing-price">${t.price}</div>
        <p class="pricing-desc">${t.desc}</p>
        <ul class="pricing-features">${t.features.map(f => `<li>${f}</li>`).join('')}</ul>
        <a href="#contact" class="btn ${t.featured ? 'btn-primary' : 'btn-outline'}">Get ${t.name}</a>
      </div>`).join('');
  return `
  <section class="section pricing" id="pricing">
    <div class="container">
      <div class="section-header">
        <h2 class="section-heading">Pricing</h2>
        <p class="section-sub">Simple, transparent pricing. Cancel anytime.</p>
      </div>
      <div class="pricing-grid">${cards}
      </div>
    </div>
  </section>`;
}

function generateTestimonialsSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const names = ['Alex R.', 'Sam K.', 'Jordan M.', 'Casey L.', 'Morgan T.'];
  const companies = ['Vercel', 'Linear', 'Supabase', 'Figma', 'Notion', 'Arc', 'Loom'];
  const quotes = [
    'Absolutely essential. Removed two tools from our stack the first week.',
    'We tried every alternative. This is the only one that actually works.',
    'The attention to detail is unreal. Every edge case handled.',
    'Shipped our biggest feature in half the time. No exaggeration.',
    'The support is as good as the product. Rare combination.',
    'Finally. Something that does exactly what it says.',
  ];
  const count = 2 + Math.floor(params.density * 2);
  const items = Array.from({ length: count }, (_, i) => {
    const name = names[i % names.length];
    const co = companies[rng.nextInt(0, companies.length - 1)];
    const quote = quotes[rng.nextInt(0, quotes.length - 1)];
    return `
      <div class="testimonial-card">
        <p class="testimonial-quote">"${quote}"</p>
        <div class="testimonial-author">
          <strong>${name}</strong><span>, ${co}</span>
        </div>
      </div>`;
  }).join('');
  return `
  <section class="section testimonials" id="testimonials">
    <div class="container">
      <div class="section-header">
        <h2 class="section-heading">What people say</h2>
      </div>
      <div class="testimonials-grid">${items}
      </div>
    </div>
  </section>`;
}

function generateContactSection(params: WebsiteParams): string {
  return `
  <section class="section contact" id="contact">
    <div class="container">
      <div class="contact-grid">
        <div class="contact-text">
          <h2 class="section-heading">Let's talk</h2>
          <p class="contact-sub">Ready to get started? We respond within one business day.</p>
        </div>
        <form class="contact-form" onsubmit="handleSubmit(event)">
          <div class="form-row">
            <input type="text" name="name" placeholder="Your name" class="form-input" required />
            <input type="email" name="email" placeholder="Email address" class="form-input" required />
          </div>
          <textarea name="message" placeholder="Tell us about your project…" class="form-textarea" rows="4" required></textarea>
          <button type="submit" class="btn btn-primary">Send Message</button>
          <div id="form-status" class="form-status" aria-live="polite"></div>
        </form>
      </div>
    </div>
  </section>`;
}

function generateCtaSection(params: WebsiteParams): string {
  return `
  <section class="section cta" id="cta">
    <div class="container">
      <div class="cta-inner">
        <h2 class="cta-heading">Ready to start?</h2>
        <p class="cta-sub">Join the people already using ${params.brandName}.</p>
        <div class="cta-buttons">
          <a href="#contact" class="btn btn-primary">Get Started Free</a>
          <a href="#features" class="btn btn-ghost">See how it works</a>
        </div>
      </div>
    </div>
  </section>`;
}

function generateFaqSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const faqs = [
    { q: 'How do I get started?', a: 'Sign up, complete the quick onboarding, and you\'re live in minutes. No credit card required.' },
    { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Cancel from your dashboard in one click.' },
    { q: 'Do you offer a free trial?', a: 'Yes — 14 days free, full access. No card required to start.' },
    { q: 'What integrations do you support?', a: 'We integrate with the major tools your team already uses. Full list in the docs.' },
  ].slice(0, 3 + Math.floor(params.density * 2));
  const items = faqs.map((f, i) => `
      <div class="faq-item">
        <button class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}" onclick="toggleFaq(this)">${f.q}</button>
        <div class="faq-a" id="faq-a-${i}" hidden>${f.a}</div>
      </div>`).join('');
  return `
  <section class="section faq" id="faq">
    <div class="container">
      <div class="section-header">
        <h2 class="section-heading">FAQ</h2>
      </div>
      <div class="faq-list">${items}
      </div>
    </div>
  </section>`;
}

function generatePortfolioSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const count = 3 + Math.floor(params.density * 3);
  const items = Array.from({ length: count }, (_, i) => {
    const hue = (rng.nextF64() * 360).toFixed(0);
    const sat = (40 + rng.nextF64() * 40).toFixed(0);
    const lit = (25 + rng.nextF64() * 30).toFixed(0);
    return `
      <div class="portfolio-item">
        <div class="portfolio-thumb" style="background:hsl(${hue},${sat}%,${lit}%)" aria-label="Project ${i + 1}"></div>
        <div class="portfolio-meta">
          <span class="portfolio-title">Project ${String.fromCharCode(65 + i)}</span>
          <span class="portfolio-tag">${['Design', 'Engineering', 'Strategy', 'Brand'][rng.nextInt(0, 3)]}</span>
        </div>
      </div>`;
  }).join('');
  return `
  <section class="section portfolio" id="portfolio">
    <div class="container">
      <div class="section-header">
        <h2 class="section-heading">Work</h2>
        <p class="section-sub">Selected projects.</p>
      </div>
      <div class="portfolio-grid">${items}
      </div>
    </div>
  </section>`;
}

function generateBlogSection(params: WebsiteParams, rng: Xoshiro256StarStar): string {
  const titles = ['The Architecture Decision That Changed Everything', 'On Building Without Meetings', 'Why We Chose Boring Technology', 'The Hidden Cost of Fast Shipping', 'Notes on Clean Code, Two Years Later'];
  const count = 2 + Math.floor(params.density * 2);
  const items = Array.from({ length: count }, (_, i) => {
    const title = titles[i % titles.length];
    const mins = rng.nextInt(3, 15);
    return `
      <article class="blog-card">
        <div class="blog-date">${new Date(Date.now() - i * 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        <h3 class="blog-title"><a href="#">${title}</a></h3>
        <div class="blog-meta">${mins} min read</div>
      </article>`;
  }).join('');
  return `
  <section class="section blog" id="blog">
    <div class="container">
      <div class="section-header">
        <h2 class="section-heading">Writing</h2>
      </div>
      <div class="blog-list">${items}
      </div>
    </div>
  </section>`;
}

function generateCss(params: WebsiteParams): string {
  const { bg, fg, accent, muted, surface } = params.palette;
  const { heading, body } = params.fonts;
  const animDuration = params.motion > 0.5 ? '0.3s' : params.motion > 0.2 ? '0.5s' : '0s';

  return `/* Paradigm Website Generator — ${params.aesthetic} aesthetic */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:${bg};
  --fg:${fg};
  --accent:${accent};
  --muted:${muted};
  --surface:${surface};
  --font-heading:${heading};
  --font-body:${body};
  --anim:${animDuration};
  --r:${params.aesthetic === 'brutalist' ? '0' : params.aesthetic === 'organic' ? '12px' : '6px'};
  --max-w:1200px;
  --gutter:clamp(1.5rem,4vw,3rem);
}

html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--fg);font-family:var(--font-body);font-size:1rem;line-height:1.65;-webkit-font-smoothing:antialiased}

.container{max-width:var(--max-w);margin-inline:auto;padding-inline:var(--gutter)}

/* NAV */
.nav{position:sticky;top:0;z-index:100;background:var(--bg);border-bottom:1px solid var(--surface);padding-block:.875rem}
.nav-inner{display:flex;align-items:center;justify-content:space-between;max-width:var(--max-w);margin-inline:auto;padding-inline:var(--gutter)}
.nav-brand{font-family:var(--font-heading);font-weight:700;font-size:1.1rem;color:var(--fg);text-decoration:none}
.nav-links{display:flex;gap:1.75rem;list-style:none}
.nav-links a{color:var(--muted);text-decoration:none;font-size:.9rem;transition:color var(--anim)}
.nav-links a:hover{color:var(--fg)}
.nav-cta{padding:.5rem 1.25rem;background:var(--accent);color:#fff;border-radius:var(--r);font-size:.875rem;text-decoration:none;font-weight:600;transition:opacity var(--anim)}
.nav-cta:hover{opacity:.85}

/* SECTIONS */
.section{padding-block:clamp(4rem,8vw,7rem)}
.section-header{text-align:center;margin-bottom:clamp(2.5rem,5vw,4rem);max-width:640px;margin-inline:auto}
.section-heading{font-family:var(--font-heading);font-size:clamp(1.75rem,4vw,2.75rem);font-weight:700;letter-spacing:-.02em;line-height:1.15;margin-bottom:.75rem}
.section-sub{color:var(--muted);font-size:1.05rem}
.eyebrow{font-size:.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:.875rem}

/* HERO */
.hero{padding-block:clamp(5rem,10vw,9rem)}
.hero-content{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center}
@media(max-width:768px){.hero-content{grid-template-columns:1fr}}
.hero-heading{font-family:var(--font-heading);font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;letter-spacing:-.03em;line-height:1.08;margin-bottom:1.25rem}
.hero-sub{font-size:1.15rem;color:var(--muted);max-width:480px;margin-bottom:2rem}
.hero-cta{display:flex;gap:1rem;flex-wrap:wrap}
.hero-svg{width:100%;height:auto;max-height:400px}
@media(max-width:768px){.hero-visual{display:none}}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.75rem;border-radius:var(--r);font-weight:600;font-size:.9rem;text-decoration:none;border:2px solid transparent;cursor:pointer;transition:all var(--anim);white-space:nowrap}
.btn-primary{background:var(--accent);color:#fff;border-color:var(--accent)}
.btn-primary:hover{opacity:.88}
.btn-ghost{color:var(--fg);border-color:transparent;background:transparent}
.btn-ghost:hover{background:var(--surface)}
.btn-outline{border-color:var(--fg);color:var(--fg);background:transparent}
.btn-outline:hover{background:var(--fg);color:var(--bg)}

/* FEATURES */
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.75rem}
.feature-card{background:var(--surface);border-radius:var(--r);padding:2rem;border:1px solid rgba(128,128,128,.12);transition:transform var(--anim)}
.feature-card:hover{transform:translateY(-3px)}
.feature-icon{font-size:1.75rem;margin-bottom:1rem}
.feature-title{font-family:var(--font-heading);font-size:1.1rem;font-weight:700;margin-bottom:.5rem}
.feature-desc{color:var(--muted);font-size:.9rem;line-height:1.6}

/* ABOUT */
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start}
@media(max-width:768px){.about-grid{grid-template-columns:1fr}}
.about-body{color:var(--muted);font-size:1.05rem;line-height:1.75;margin-top:1.25rem}
.about-stats{display:flex;flex-direction:column;gap:2rem}
.stat{display:flex;flex-direction:column}
.stat-n{font-family:var(--font-heading);font-size:3rem;font-weight:800;color:var(--accent);line-height:1}
.stat-l{font-size:.875rem;color:var(--muted);margin-top:.25rem}

/* STATS BAR */
.stats-row{display:flex;gap:4rem;flex-wrap:wrap;justify-content:center;padding-block:1rem}
.stat-item{text-align:center}
.stat-big{display:block;font-family:var(--font-heading);font-size:3.5rem;font-weight:800;color:var(--accent);line-height:1}
.stat-label{font-size:.875rem;color:var(--muted);margin-top:.375rem}

/* PRICING */
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;align-items:start}
.pricing-card{background:var(--surface);border:1px solid rgba(128,128,128,.15);border-radius:var(--r);padding:2.25rem;position:relative}
.pricing-featured{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.pricing-badge{position:absolute;top:-1rem;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;font-size:.75rem;font-weight:700;padding:.25rem .875rem;border-radius:999px;white-space:nowrap}
.pricing-name{font-size:.875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:.75rem}
.pricing-price{font-family:var(--font-heading);font-size:2.5rem;font-weight:800;color:var(--fg);margin-bottom:.625rem}
.pricing-desc{font-size:.875rem;color:var(--muted);margin-bottom:1.5rem}
.pricing-features{list-style:none;margin-bottom:2rem}
.pricing-features li{padding:.375rem 0;font-size:.9rem;border-bottom:1px solid rgba(128,128,128,.08)}
.pricing-features li::before{content:'✓ ';color:var(--accent);font-weight:700}

/* TESTIMONIALS */
.testimonials-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.5rem}
.testimonial-card{background:var(--surface);border-radius:var(--r);padding:2rem;border:1px solid rgba(128,128,128,.12)}
.testimonial-quote{font-size:1rem;line-height:1.7;margin-bottom:1.25rem;font-style:italic}
.testimonial-author{font-size:.875rem;color:var(--muted)}
.testimonial-author strong{color:var(--fg)}

/* CONTACT */
.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:start}
@media(max-width:768px){.contact-grid{grid-template-columns:1fr}}
.contact-sub{color:var(--muted);margin-top:1rem;font-size:1.05rem}
.contact-form{display:flex;flex-direction:column;gap:1rem}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
@media(max-width:480px){.form-row{grid-template-columns:1fr}}
.form-input,.form-textarea{background:var(--surface);border:1px solid rgba(128,128,128,.25);border-radius:var(--r);padding:.75rem 1rem;font-size:.9rem;color:var(--fg);font-family:var(--font-body);width:100%;transition:border-color var(--anim)}
.form-input:focus,.form-textarea:focus{outline:none;border-color:var(--accent)}
.form-textarea{resize:vertical;min-height:120px}
.form-status{font-size:.875rem;color:var(--accent)}

/* CTA */
.cta{background:var(--surface)}
.cta-inner{text-align:center;max-width:600px;margin-inline:auto}
.cta-heading{font-family:var(--font-heading);font-size:clamp(2rem,5vw,3.5rem);font-weight:800;margin-bottom:1rem}
.cta-sub{color:var(--muted);font-size:1.1rem;margin-bottom:2.5rem}
.cta-buttons{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}

/* PORTFOLIO */
.portfolio-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.5rem}
.portfolio-item{border-radius:var(--r);overflow:hidden;border:1px solid rgba(128,128,128,.12)}
.portfolio-thumb{aspect-ratio:16/9;width:100%}
.portfolio-meta{padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;background:var(--surface)}
.portfolio-title{font-weight:600;font-size:.9rem}
.portfolio-tag{font-size:.78rem;color:var(--muted);background:var(--bg);padding:.2rem .625rem;border-radius:999px;border:1px solid rgba(128,128,128,.2)}

/* BLOG */
.blog-list{display:flex;flex-direction:column;gap:0;max-width:720px;margin-inline:auto}
.blog-card{padding:1.75rem 0;border-bottom:1px solid rgba(128,128,128,.12)}
.blog-date{font-size:.8rem;color:var(--muted);margin-bottom:.5rem}
.blog-title a{font-family:var(--font-heading);font-size:1.2rem;font-weight:700;color:var(--fg);text-decoration:none;line-height:1.4}
.blog-title a:hover{color:var(--accent)}
.blog-meta{font-size:.8rem;color:var(--muted);margin-top:.5rem}

/* FAQ */
.faq-list{max-width:720px;margin-inline:auto}
.faq-item{border-bottom:1px solid rgba(128,128,128,.12)}
.faq-q{width:100%;text-align:left;background:none;border:none;padding:1.25rem 0;font-size:1rem;font-family:var(--font-heading);font-weight:600;color:var(--fg);cursor:pointer;display:flex;justify-content:space-between;align-items:center}
.faq-q::after{content:'+'};font-size:1.25rem;color:var(--muted)}
.faq-q[aria-expanded="true"]::after{content:'−'}
.faq-a{padding:0 0 1.25rem;color:var(--muted);font-size:.95rem;line-height:1.7}

/* FOOTER */
.footer{border-top:1px solid rgba(128,128,128,.12);padding-block:2.5rem}
.footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;max-width:var(--max-w);margin-inline:auto;padding-inline:var(--gutter)}
.footer-brand{font-weight:700;font-size:.9rem}
.footer-copy{font-size:.825rem;color:var(--muted)}
.footer-links{display:flex;gap:1.5rem;list-style:none}
.footer-links a{font-size:.825rem;color:var(--muted);text-decoration:none}
.footer-links a:hover{color:var(--fg)}

/* SEED BADGE */
.seed-badge{position:fixed;bottom:1.25rem;right:1.25rem;background:var(--surface);border:1px solid rgba(128,128,128,.2);border-radius:999px;padding:.375rem .875rem;font-size:.72rem;font-family:monospace;color:var(--muted);display:flex;align-items:center;gap:.5rem;opacity:.7;transition:opacity var(--anim)}
.seed-badge:hover{opacity:1}
.seed-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

/* SCROLLBAR */
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--muted);border-radius:3px}
`;
}

function generateJs(params: WebsiteParams): string {
  return `/* Paradigm Website Generator — interactions */
'use strict';

// FAQ toggle
function toggleFaq(btn) {
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expanded));
  const target = document.getElementById(btn.getAttribute('aria-controls'));
  if (target) target.hidden = expanded;
}

// Form
function handleSubmit(e) {
  e.preventDefault();
  const status = document.getElementById('form-status');
  if (status) {
    status.textContent = 'Message sent. We\'ll be in touch within one business day.';
    e.target.reset();
  }
}

// Scroll reveal (minimal, only when motion > threshold)
${params.motion > 0.2 ? `
(function() {
  const els = document.querySelectorAll('.section');
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  els.forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    obs.observe(el);
  });
})();
` : '// motion disabled by gene'}

// Nav active link
(function() {
  const links = document.querySelectorAll('.nav-links a');
  window.addEventListener('scroll', function() {
    let current = '';
    document.querySelectorAll('section[id]').forEach(function(s) {
      if (window.scrollY >= s.offsetTop - 120) current = s.id;
    });
    links.forEach(function(a) {
      a.style.color = a.getAttribute('href') === '#' + current ? 'var(--accent)' : '';
    });
  }, { passive: true });
})();
`;
}

function buildHtml(params: WebsiteParams, sections: string[], css: string, js: string): string {
  const navItems = [
    ['#features', 'Work'],
    ['#about', 'About'],
    ['#pricing', 'Pricing'],
    ['#contact', 'Contact'],
  ].filter(([href]) => sections.some(s => s.includes(`id="${href.slice(1)}"`)));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="${params.tagline}" />
  <title>${params.brandName}</title>
  <style>${css}</style>
</head>
<body>
  <nav class="nav" aria-label="Main navigation">
    <div class="nav-inner">
      <a href="#" class="nav-brand">${params.brandName}</a>
      <ul class="nav-links" role="list">
        ${navItems.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('\n        ')}
      </ul>
      <a href="#contact" class="nav-cta">Get Started</a>
    </div>
  </nav>

  <main>
${sections.join('\n')}
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <span class="footer-brand">${params.brandName}</span>
      <p class="footer-copy">© ${new Date().getFullYear()} ${params.brandName}. All rights reserved.</p>
      <ul class="footer-links" role="list">
        <li><a href="#">Privacy</a></li>
        <li><a href="#">Terms</a></li>
      </ul>
    </div>
  </footer>

  <div class="seed-badge" title="Generated by Paradigm">
    <span class="seed-badge-dot"></span>
    Grown by Paradigm
  </div>

  <script>${js}</script>
</body>
</html>`;
}

export async function generateWebsite(
  seed: Seed,
  outputPath: string,
): Promise<WebsiteOutput & { filePath: string; format: string }> {
  const rng = rngFromHash(seed.$hash ?? 'website-default');
  const params = extractParams(seed, rng);

  const sectionBuilders: Record<WebsiteSection, () => string> = {
    hero:         () => generateHeroSection(params, rng),
    features:     () => generateFeaturesSection(params, rng),
    about:        () => generateAboutSection(params, rng),
    stats:        () => generateStatsSection(params, rng),
    pricing:      () => generatePricingSection(params, rng),
    testimonials: () => generateTestimonialsSection(params, rng),
    contact:      () => generateContactSection(params),
    cta:          () => generateCtaSection(params),
    portfolio:    () => generatePortfolioSection(params, rng),
    blog:         () => generateBlogSection(params, rng),
    faq:          () => generateFaqSection(params, rng),
  };

  const renderedSections = params.sections.map(s => sectionBuilders[s]?.() ?? '');
  const css = generateCss(params);
  const js = generateJs(params);
  const html = buildHtml(params, renderedSections, css, js);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const htmlPath = outputPath.replace(/\.[^.]+$/, '') + '.html';
  fs.writeFileSync(htmlPath, html, 'utf-8');

  const lineCount = html.split('\n').length;
  return {
    filePath: htmlPath,
    indexHtml: html,
    styleCss: css,
    appJs: js,
    sectionCount: params.sections.length,
    lineCount,
    format: 'html',
  };
}
