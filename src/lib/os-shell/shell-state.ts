/**
 * OS Shell State — Phase 12
 * 
 * Manages the Paradigm OS Shell desktop environment.
 * Every window, app, and action is a seed + kernel operation.
 * 
 * This is the web-based prototype. The full vision is a Wayland/Linux session
 * where Paradigm IS the operating system.
 */

import { createHash } from 'crypto';
import { Xoshiro256StarStar } from '../kernel/rng';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShellWindow {
  id: string;
  seedHash: string;          // The seed that generated this window
  title: string;
  type: 'app' | 'terminal' | 'browser' | 'editor' | 'renderer' | 'filemanager';
  position: { x: number; y: number };
  size: { width: number; height: number };
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  content: string;           // HTML content or seed reference
  icon: string;              // Emoji icon
  createdAt: number;
}

export interface ShellDesktop {
  wallpaper: {
    seedHash: string;
    style: 'procedural' | 'solid' | 'gradient' | 'generative';
    colors: string[];
  };
  taskbar: {
    apps: ShellApp[];
    clock: boolean;
    systemTray: boolean;
  };
  windows: ShellWindow[];
  nextZIndex: number;
}

export interface ShellApp {
  id: string;
  name: string;
  icon: string;
  seedDomain: string;        // Which generator domain this app uses
  description: string;
  defaultSize: { width: number; height: number };
}

// ─── Default Apps ────────────────────────────────────────────────────────────

export const DEFAULT_APPS: ShellApp[] = [
  { id: 'terminal', name: 'Terminal', icon: '>', seedDomain: 'agent', description: 'Command-line interface', defaultSize: { width: 700, height: 400 } },
  { id: 'canvas', name: 'Canvas', icon: '🎨', seedDomain: 'visual2d', description: '2D drawing canvas', defaultSize: { width: 800, height: 600 } },
  { id: 'music', name: 'Synthesizer', icon: '🎵', seedDomain: 'music', description: 'Music synthesis studio', defaultSize: { width: 900, height: 500 } },
  { id: 'world', name: 'World Builder', icon: '🌍', seedDomain: 'world', description: 'Procedural world generator', defaultSize: { width: 800, height: 600 } },
  { id: 'character', name: 'Character Lab', icon: '👤', seedDomain: 'character', description: 'Character generator', defaultSize: { width: 600, height: 700 } },
  { id: 'game', name: 'Game Engine', icon: '🎮', seedDomain: 'game', description: 'Game generator & player', defaultSize: { width: 800, height: 600 } },
  { id: 'cardgame', name: 'Card Games', icon: '🃏', seedDomain: 'cardgame', description: 'Card game suite', defaultSize: { width: 700, height: 500 } },
  { id: 'boardgame', name: 'Board Games', icon: '♟', seedDomain: 'boardgame', description: 'Board game suite', defaultSize: { width: 600, height: 600 } },
  { id: '3d', name: '3D Studio', icon: '📦', seedDomain: 'geometry3d', description: '3D model generator', defaultSize: { width: 800, height: 600 } },
  { id: 'narrative', name: 'Story Engine', icon: '📖', seedDomain: 'narrative', description: 'Narrative generator', defaultSize: { width: 700, height: 500 } },
  { id: 'evolve', name: 'Evolution Lab', icon: '🧬', seedDomain: 'alife', description: 'Evolutionary simulation', defaultSize: { width: 800, height: 600 } },
  { id: 'files', name: 'Seed Vault', icon: '📁', seedDomain: 'none', description: 'Seed file manager', defaultSize: { width: 600, height: 400 } },
  { id: 'settings', name: 'Settings', icon: '⚙', seedDomain: 'none', description: 'System settings', defaultSize: { width: 500, height: 400 } },
  { id: 'shell-info', name: 'About', icon: 'ℹ', seedDomain: 'none', description: 'About Paradigm OS', defaultSize: { width: 400, height: 300 } },
];

// ─── Shell State Manager ─────────────────────────────────────────────────────

export class ShellState {
  private desktop: ShellDesktop;
  private rng: Xoshiro256StarStar;

  constructor(seedHash?: string) {
    this.rng = new Xoshiro256StarStar(seedHash || 'os-shell-default');
    
    const colors = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560'];
    const selectedColors = [];
    for (let i = 0; i < 3; i++) {
      selectedColors.push(colors[Math.floor(this.rng.nextF64() * colors.length)]);
    }

    this.desktop = {
      wallpaper: {
        seedHash: seedHash || 'os-shell-default',
        style: 'generative',
        colors: selectedColors,
      },
      taskbar: {
        apps: DEFAULT_APPS,
        clock: true,
        systemTray: true,
      },
      windows: [],
      nextZIndex: 1,
    };
  }

  getDesktop(): ShellDesktop {
    return { ...this.desktop };
  }

  openApp(appId: string): ShellWindow | null {
    const app = this.desktop.taskbar.apps.find(a => a.id === appId);
    if (!app) return null;

    // Generate deterministic position
    const offsetX = Math.floor(this.rng.nextF64() * 200) + 50;
    const offsetY = Math.floor(this.rng.nextF64() * 150) + 50;

    const window: ShellWindow = {
      id: `win-${Date.now()}-${Math.floor(this.rng.nextF64() * 10000)}`,
      seedHash: createHash('sha256').update(`${appId}:${Date.now()}`).digest('hex').slice(0, 16),
      title: app.name,
      type: app.id === 'terminal' ? 'terminal' : 'app',
      position: { x: offsetX, y: offsetY },
      size: { ...app.defaultSize },
      minimized: false,
      maximized: false,
      zIndex: this.desktop.nextZIndex++,
      content: '',
      icon: app.icon,
      createdAt: Date.now(),
    };

    this.desktop.windows.push(window);
    return window;
  }

  closeWindow(windowId: string): void {
    this.desktop.windows = this.desktop.windows.filter(w => w.id !== windowId);
  }

  minimizeWindow(windowId: string): void {
    const win = this.desktop.windows.find(w => w.id === windowId);
    if (win) win.minimized = true;
  }

  maximizeWindow(windowId: string): void {
    const win = this.desktop.windows.find(w => w.id === windowId);
    if (win) win.maximized = !win.maximized;
  }

  focusWindow(windowId: string): void {
    const win = this.desktop.windows.find(w => w.id === windowId);
    if (win) win.zIndex = this.desktop.nextZIndex++;
  }

  moveWindow(windowId: string, x: number, y: number): void {
    const win = this.desktop.windows.find(w => w.id === windowId);
    if (win) win.position = { x, y };
  }

  resizeWindow(windowId: string, width: number, height: number): void {
    const win = this.desktop.windows.find(w => w.id === windowId);
    if (win) win.size = { width: Math.max(200, width), height: Math.max(150, height) };
  }

  getWindows(): ShellWindow[] {
    return [...this.desktop.windows];
  }

  getVisibleWindows(): ShellWindow[] {
    return this.desktop.windows
      .filter(w => !w.minimized)
      .sort((a, b) => a.zIndex - b.zIndex);
  }
}
