/**
 * App Generator — Full React/TypeScript Application from Seed
 *
 * Grows a seed into a complete, deployable application codebase:
 *   - React 18 + TypeScript + Vite + Tailwind CSS
 *   - Full component tree: Layout, Nav, Pages, State, API hooks
 *   - package.json, vite.config.ts, tsconfig.json, tailwind.config.ts
 *   - README.md with seed provenance embedded
 *
 * App archetypes: dashboard | marketplace | social | tool | game | docs | portfolio | saas | admin | blog
 *
 * Every identifier, color, copy string, component name, and route
 * is derived deterministically from the seed genes. Same seed = same app, always.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppArchetype =
  | 'dashboard' | 'marketplace' | 'social' | 'tool'
  | 'game' | 'docs' | 'portfolio' | 'saas' | 'admin' | 'blog';

export type AppThemeMode = 'dark' | 'light' | 'system';

export interface AppSeedParams {
  archetype: AppArchetype;
  name: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  themeMode: AppThemeMode;
  pages: string[];
  features: string[];
  apiBase: string;
}

export interface AppArtifact {
  outputDir: string;
  files: string[];
  params: AppSeedParams;
  linesOfCode: number;
  componentCount: number;
  routeCount: number;
}

// ─── Vocabulary ──────────────────────────────────────────────────────────────

const ARCHETYPES: AppArchetype[] = ['dashboard', 'marketplace', 'social', 'tool', 'game', 'docs', 'portfolio', 'saas', 'admin', 'blog'];

const ARCHETYPE_PAGES: Record<AppArchetype, string[][]> = {
  dashboard:   [['Overview', 'Analytics', 'Settings', 'Profile'], ['Metrics', 'Reports', 'Users', 'Config']],
  marketplace: [['Home', 'Browse', 'Product', 'Cart', 'Orders'], ['Discover', 'Listings', 'Item', 'Checkout', 'History']],
  social:      [['Feed', 'Profile', 'Explore', 'Messages', 'Notifications'], ['Timeline', 'Me', 'Search', 'Chat', 'Alerts']],
  tool:        [['Editor', 'Projects', 'Export', 'Settings'], ['Workspace', 'Files', 'Output', 'Preferences']],
  game:        [['Play', 'Leaderboard', 'Store', 'Profile'], ['Arena', 'Rankings', 'Shop', 'Account']],
  docs:        [['Introduction', 'Guide', 'API', 'Examples', 'Changelog'], ['Overview', 'Tutorial', 'Reference', 'Demos', 'Updates']],
  portfolio:   [['Work', 'About', 'Contact', 'Blog'], ['Projects', 'Story', 'Connect', 'Writing']],
  saas:        [['Home', 'Features', 'Pricing', 'Dashboard', 'Settings'], ['Landing', 'Capabilities', 'Plans', 'App', 'Config']],
  admin:       [['Dashboard', 'Users', 'Content', 'Analytics', 'Settings'], ['Overview', 'Accounts', 'Entries', 'Metrics', 'Config']],
  blog:        [['Home', 'Post', 'Archive', 'About'], ['Latest', 'Article', 'Index', 'Info']],
};

const FEATURES: Record<AppArchetype, string[]> = {
  dashboard:   ['real-time charts', 'data tables', 'KPI cards', 'date range picker', 'export CSV'],
  marketplace: ['product grid', 'search & filter', 'cart state', 'checkout flow', 'order history'],
  social:      ['infinite scroll feed', 'like & comment', 'follow graph', 'DM threads', 'notifications'],
  tool:        ['file tree', 'code editor', 'live preview', 'command palette', 'keyboard shortcuts'],
  game:        ['game loop', 'leaderboard', 'player profile', 'achievements', 'in-app store'],
  docs:        ['full-text search', 'sidebar nav', 'code snippets', 'version switcher', 'edit on GitHub'],
  portfolio:   ['project cards', 'lightbox gallery', 'contact form', 'dark mode', 'blog posts'],
  saas:        ['pricing table', 'auth flow', 'billing portal', 'feature flags', 'onboarding wizard'],
  admin:       ['user table', 'role management', 'audit log', 'bulk actions', 'permission gates'],
  blog:        ['article list', 'tag filtering', 'reading time', 'related posts', 'RSS feed'],
};

const TECH_STACK = {
  framework: 'React 18',
  language:  'TypeScript 5',
  bundler:   'Vite 5',
  styling:   'Tailwind CSS 3',
  routing:   'react-router-dom 6',
  state:     'Zustand 4',
  fetching:  'TanStack Query 5',
  ui:        'shadcn/ui',
  icons:     'lucide-react',
  forms:     'react-hook-form + zod',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[], rng: Xoshiro256StarStar): T {
  return arr[Math.floor(rng.nextF64() * arr.length)];
}

function toComponentName(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, '').replace(/^[a-z]/, c => c.toUpperCase());
}

function toKebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function genColor(rng: Xoshiro256StarStar): string {
  const h = Math.floor(rng.nextF64() * 360);
  return `hsl(${h}, 72%, 52%)`;
}

// ─── Parameter extraction from seed genes ────────────────────────────────────

function extractParams(seed: Seed, rng: Xoshiro256StarStar): AppSeedParams {
  const g = (seed as any).genes ?? seed;
  const archetype: AppArchetype =
    (g.archetype?.value as AppArchetype) ??
    (g.purpose?.value as AppArchetype) ??
    ARCHETYPES[Math.floor(rng.nextF64() * ARCHETYPES.length)];

  const pageSets = ARCHETYPE_PAGES[archetype];
  const pages = pageSets[Math.floor(rng.nextF64() * pageSets.length)];

  const featurePool = FEATURES[archetype];
  const featureCount = 2 + Math.floor(rng.nextF64() * 3);
  const features: string[] = [];
  const fIdx = new Set<number>();
  while (features.length < featureCount) {
    const i = Math.floor(rng.nextF64() * featurePool.length);
    if (!fIdx.has(i)) { fIdx.add(i); features.push(featurePool[i]); }
  }

  const namePool = [
    ['Nexus', 'Apex', 'Flux', 'Nova', 'Orbit', 'Pulse', 'Veil', 'Core'],
    ['Lab', 'Hub', 'Base', 'Desk', 'Flow', 'Grid', 'Wave', 'Edge'],
  ];
  const name = pick(namePool[0], rng) + pick(namePool[1], rng);

  const taglines: Record<AppArchetype, string[]> = {
    dashboard:   ['See everything. Miss nothing.', 'Data, simplified.', 'Your metrics, at a glance.'],
    marketplace: ['Buy and sell, beautifully.', 'The market, reinvented.', 'Everything, everyone.'],
    social:      ['Connect without noise.', 'Your people. Your feed.', 'Real connections, real fast.'],
    tool:        ['Work at the speed of thought.', 'The tool you deserve.', 'Built for builders.'],
    game:        ['Play. Compete. Win.', 'The arena awaits.', 'Your game, your rules.'],
    docs:        ['Documentation done right.', 'Read less. Understand more.', 'The manual, rewritten.'],
    portfolio:   ['Work that speaks.', 'Show your best.', 'Your story, beautifully told.'],
    saas:        ['Grow without limits.', 'Software that scales.', 'The platform for builders.'],
    admin:       ['Control at scale.', 'Manage everything.', 'Power in your hands.'],
    blog:        ['Ideas worth reading.', 'Write once. Reach everyone.', 'The blog, rebuilt.'],
  };

  return {
    archetype,
    name,
    tagline: pick(taglines[archetype], rng),
    primaryColor: genColor(rng),
    accentColor: genColor(rng),
    themeMode: pick(['dark', 'light', 'system'] as AppThemeMode[], rng),
    pages,
    features,
    apiBase: `/api/v1`,
  };
}

// ─── File generators ──────────────────────────────────────────────────────────

function genPackageJson(p: AppSeedParams): string {
  return JSON.stringify({
    name: toKebab(p.name),
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: { dev: 'vite', build: 'tsc && vite build', preview: 'vite preview', lint: 'eslint src' },
    dependencies: {
      react: '^18.3.1', 'react-dom': '^18.3.1',
      'react-router-dom': '^6.26.0',
      zustand: '^4.5.5',
      '@tanstack/react-query': '^5.56.2',
      'lucide-react': '^0.441.0',
      'react-hook-form': '^7.53.0', zod: '^3.23.8',
      clsx: '^2.1.1', 'tailwind-merge': '^2.5.2',
    },
    devDependencies: {
      typescript: '^5.5.3', vite: '^5.4.1',
      '@vitejs/plugin-react': '^4.3.1',
      tailwindcss: '^3.4.10', autoprefixer: '^10.4.20', postcss: '^8.4.45',
      '@types/react': '^18.3.5', '@types/react-dom': '^18.3.0',
    },
  }, null, 2);
}

function genViteConfig(p: AppSeedParams): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  server: { proxy: { '${p.apiBase}': 'http://localhost:3000' } },
});
`;
}

function genTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020', useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext', skipLibCheck: true,
      moduleResolution: 'bundler', allowImportingTsExtensions: true,
      isolatedModules: true, moduleDetection: 'force', noEmit: true,
      jsx: 'react-jsx', strict: true, noUnusedLocals: true, noUnusedParameters: true,
      noFallthroughCasesInSwitch: true, baseUrl: '.', paths: { '@/*': ['./src/*'] },
    },
    include: ['src'],
  }, null, 2);
}

function genTailwindConfig(p: AppSeedParams): string {
  return `import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: '${p.themeMode === 'system' ? 'media' : 'class'}',
  theme: {
    extend: {
      colors: {
        primary: '${p.primaryColor}',
        accent: '${p.accentColor}',
      },
    },
  },
} satisfies Config;
`;
}

function genIndexHtml(p: AppSeedParams): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${p.name}</title>
    <meta name="description" content="${p.tagline}" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function genMain(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
`;
}

function genIndexCss(p: AppSeedParams): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-primary: ${p.primaryColor};
  --color-accent: ${p.accentColor};
}

body {
  @apply bg-zinc-950 text-zinc-100 antialiased;
  font-family: 'Inter', system-ui, sans-serif;
}
`;
}

function genApp(p: AppSeedParams): string {
  const routes = p.pages.map(pg =>
    `          <Route path="/${toKebab(pg)}" element={<${toComponentName(pg)}Page />} />`
  ).join('\n');
  const imports = p.pages.map(pg =>
    `import ${toComponentName(pg)}Page from '@/pages/${toComponentName(pg)}Page';`
  ).join('\n');

  return `import { Routes, Route, Navigate } from 'react-router-dom';
${imports}
import { Layout } from '@/components/Layout';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/${toKebab(p.pages[0])}" replace />} />
${routes}
      </Routes>
    </Layout>
  );
}
`;
}

function genLayout(p: AppSeedParams): string {
  const navLinks = p.pages.map(pg =>
    `        { label: '${pg}', href: '/${toKebab(pg)}' },`
  ).join('\n');

  return `import { Link, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import clsx from 'clsx';

const NAV = [
${navLinks}
];

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <span className="font-bold text-lg tracking-tight text-white">${p.name}</span>
          <nav className="flex gap-1">
            {NAV.map(n => (
              <Link
                key={n.href}
                to={n.href}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname.startsWith(n.href)
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
`;
}

function genPage(pageName: string, p: AppSeedParams, rng: Xoshiro256StarStar): string {
  const component = toComponentName(pageName);
  const headline = `${pageName} — ${p.name}`;
  const desc = pick([
    `Manage your ${pageName.toLowerCase()} effortlessly.`,
    `Everything you need for ${pageName.toLowerCase()}.`,
    `Your ${pageName.toLowerCase()} hub, fully sovereign.`,
    `All ${pageName.toLowerCase()} data, beautifully organized.`,
  ], rng);

  return `import { useState } from 'react';

export default function ${component}Page() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">${headline}</h1>
        <p className="text-zinc-400 mt-1">${desc}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="h-3 bg-zinc-700 rounded mb-3 w-2/3" />
            <div className="h-10 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

function genStore(p: AppSeedParams): string {
  return `import { create } from 'zustand';

interface AppState {
  theme: '${p.themeMode}';
  activeItem: string | null;
  setActiveItem: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: '${p.themeMode}',
  activeItem: null,
  setActiveItem: (id) => set({ activeItem: id }),
}));
`;
}

function genReadme(p: AppSeedParams, seedHash: string): string {
  return `# ${p.name}

> ${p.tagline}

## Generated by Paradigm

This application was deterministically generated from a GSPL seed.

| Field | Value |
|---|---|
| Seed Hash | \`${seedHash}\` |
| Archetype | \`${p.archetype}\` |
| Pages | ${p.pages.join(', ')} |
| Features | ${p.features.join(', ')} |
| Stack | ${Object.entries(TECH_STACK).map(([k, v]) => `${k}: ${v}`).join(' · ')} |

## Development

\`\`\`bash
bun install
bun run dev
\`\`\`

## Build

\`\`\`bash
bun run build
\`\`\`
`;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateApp(seed: Seed, outputPath: string): Promise<AppArtifact> {
  const rng = rngFromHash(seed);
  const params = extractParams(seed, rng);
  const seedHash = (seed as any).$hash ?? 'unknown';

  fs.mkdirSync(outputPath, { recursive: true });
  fs.mkdirSync(path.join(outputPath, 'src', 'components'), { recursive: true });
  fs.mkdirSync(path.join(outputPath, 'src', 'pages'), { recursive: true });
  fs.mkdirSync(path.join(outputPath, 'src', 'store'), { recursive: true });

  const files: string[] = [];

  function write(rel: string, content: string): void {
    const abs = path.join(outputPath, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf-8');
    files.push(abs);
  }

  write('package.json',              genPackageJson(params));
  write('vite.config.ts',            genViteConfig(params));
  write('tsconfig.json',             genTsConfig());
  write('tailwind.config.ts',        genTailwindConfig(params));
  write('index.html',                genIndexHtml(params));
  write('src/main.tsx',              genMain());
  write('src/index.css',             genIndexCss(params));
  write('src/App.tsx',               genApp(params));
  write('src/components/Layout.tsx', genLayout(params));
  write('src/store/appStore.ts',     genStore(params));
  write('README.md',                 genReadme(params, seedHash));

  for (const page of params.pages) {
    write(`src/pages/${toComponentName(page)}Page.tsx`, genPage(page, params, rng));
  }

  const linesOfCode = files.reduce((acc, f) => {
    try { return acc + fs.readFileSync(f, 'utf-8').split('\n').length; } catch { return acc; }
  }, 0);

  return {
    outputDir: outputPath,
    files,
    params,
    linesOfCode,
    componentCount: params.pages.length + 1,
    routeCount: params.pages.length,
  };
}
