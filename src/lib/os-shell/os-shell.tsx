/**
 * OS Shell Desktop — React component for Paradigm OS Shell (Phase 12)
 * 
 * A web-based desktop environment where every window is a seed-powered artifact.
 * This is the prototype. The full vision is a Wayland/Linux session.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createHash } from 'crypto';
import { ShellState, type ShellWindow, DEFAULT_APPS } from './shell-state';

interface ShellProps {
  seedHash?: string;
}

export function OSDShell({ seedHash }: ShellProps) {
  const [shell] = useState(() => new ShellState(seedHash));
  const [windows, setWindows] = useState<ShellWindow[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [showLauncher, setShowLauncher] = useState(false);
  const [time, setTime] = useState(new Date());
  const dragRef = useRef<{ windowId: string; startX: number; startY: number; winX: number; winY: number } | null>(null);

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const openApp = useCallback((appId: string) => {
    const win = shell.openApp(appId);
    if (win) {
      setWindows(shell.getWindows());
      setActiveWindow(win.id);
    }
    setShowLauncher(false);
  }, [shell]);

  const closeWindow = useCallback((windowId: string) => {
    shell.closeWindow(windowId);
    setWindows(shell.getWindows());
    if (activeWindow === windowId) setActiveWindow(null);
  }, [shell, activeWindow]);

  const focusWindow = useCallback((windowId: string) => {
    shell.focusWindow(windowId);
    setActiveWindow(windowId);
    setWindows(shell.getWindows());
  }, [shell]);

  const minimizeWindow = useCallback((windowId: string) => {
    shell.minimizeWindow(windowId);
    setWindows(shell.getWindows());
  }, [shell]);

  const maximizeWindow = useCallback((windowId: string) => {
    shell.maximizeWindow(windowId);
    setWindows(shell.getWindows());
  }, [shell]);

  const handleMouseDown = useCallback((windowId: string, e: React.MouseEvent) => {
    focusWindow(windowId);
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    dragRef.current = { windowId, startX: e.clientX, startY: e.clientY, winX: win.position.x, winY: win.position.y };
  }, [windows, focusWindow]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    shell.moveWindow(dragRef.current.windowId, dragRef.current.winX + dx, dragRef.current.winY + dy);
    setWindows(shell.getWindows());
  }, [shell]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const desktop = shell.getDesktop();
  const wallpaper = desktop.wallpaper;
  const visibleWindows = windows.filter(w => !w.minimized).sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      data-testid="os-shell"
      style={{
        width: '100vw',
        height: '100vh',
        background: `linear-gradient(135deg, ${wallpaper.colors[0]}, ${wallpaper.colors[1]}, ${wallpaper.colors[2]})`,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        userSelect: 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Desktop Grid Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        pointerEvents: 'none',
      }} />

      {/* Windows */}
      {visibleWindows.map(win => (
        <div
          key={win.id}
          style={{
            position: 'absolute',
            left: win.maximized ? 0 : win.position.x,
            top: win.maximized ? 0 : win.position.y,
            width: win.maximized ? '100%' : win.size.width,
            height: win.maximized ? 'calc(100% - 48px)' : win.size.height,
            zIndex: win.zIndex,
            background: 'rgba(20, 20, 30, 0.95)',
            borderRadius: win.maximized ? 0 : '12px',
            border: `1px solid ${activeWindow === win.id ? '#533483' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: activeWindow === win.id
              ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(83,52,131,0.3)'
              : '0 4px 16px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onMouseDown={() => focusWindow(win.id)}
        >
          {/* Title Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              cursor: 'move',
            }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(win.id, e); }}
          >
            <span style={{ fontSize: '16px', marginRight: '8px' }}>{win.icon}</span>
            <span style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#ddd' }}>{win.title}</span>
            <span style={{ fontSize: '11px', color: '#888', marginRight: '12px' }}>{win.seedHash.slice(0, 8)}</span>
            <button onClick={() => minimizeWindow(win.id)} style={titleBtnStyle} title="Minimize">─</button>
            <button onClick={() => maximizeWindow(win.id)} style={titleBtnStyle} title="Maximize">□</button>
            <button onClick={() => closeWindow(win.id)} style={{ ...titleBtnStyle, color: '#e94560' }} title="Close">✕</button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', color: '#ccc' }}>
            <WindowContent app={win} />
          </div>
        </div>
      ))}

      {/* App Launcher Overlay */}
      {showLauncher && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowLauncher(false)}
        >
          <div
            style={{
              background: 'rgba(20, 20, 30, 0.98)',
              borderRadius: '16px',
              padding: '32px',
              width: '600px',
              maxHeight: '70vh',
              overflow: 'auto',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', color: '#fff' }}>Launch App</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {DEFAULT_APPS.map(app => (
                <button
                  key={app.id}
                  onClick={() => openApp(app.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '16px 8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(83,52,131,0.3)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <span style={{ fontSize: '32px', marginBottom: '8px' }}>{app.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{app.name}</span>
                  <span style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>{app.seedDomain}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '48px',
        background: 'rgba(20, 20, 30, 0.95)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
      }}>
        {/* Start Button */}
        <button
          onClick={() => setShowLauncher(!showLauncher)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: showLauncher ? 'rgba(83,52,131,0.5)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            transition: 'all 0.2s',
          }}
        >
          ◆
        </button>

        {/* Running Apps */}
        <div style={{ flex: 1, display: 'flex', gap: '4px', marginLeft: '12px', overflow: 'auto' }}>
          {windows.map(win => (
            <button
              key={win.id}
              onClick={() => {
                if (win.minimized) { shell.minimizeWindow(win.id); /* toggle */ }
                focusWindow(win.id);
                setWindows(shell.getWindows());
              }}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                background: activeWindow === win.id ? 'rgba(83,52,131,0.4)' : 'rgba(255,255,255,0.05)',
                border: activeWindow === win.id ? '1px solid rgba(83,52,131,0.6)' : '1px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#ccc',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <span>{win.icon}</span>
              <span>{win.title}</span>
            </button>
          ))}
        </div>

        {/* System Tray */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#888', fontSize: '13px' }}>
          <span style={{ color: '#aaa' }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span style={{ color: '#533483' }}>◆</span>
        </div>
      </div>
    </div>
  );
}

// ─── Window Content Renderer ─────────────────────────────────────────────────

function WindowContent({ app }: { app: ShellWindow }) {
  switch (app.type) {
    case 'terminal':
      return <TerminalContent />;
    default:
      return <SeedAppContent app={app} />;
  }
}

function TerminalContent() {
  const [lines, setLines] = useState<string[]>([
    'Paradigm OS Shell v0.1.0',
    'Type "help" for available commands.',
    '',
  ]);
  const [input, setInput] = useState('');

  const handleCommand = (cmd: string) => {
    const newLines = [...lines, `$ ${cmd}`];
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();

    switch (command) {
      case 'help':
        newLines.push('Available commands:');
        newLines.push('  help          Show this help');
        newLines.push('  seed <domain> Create a new seed');
        newLines.push('  grow <seed>   Grow a seed into an artifact');
        newLines.push('  evolve <seed> Evolve a seed');
        newLines.push('  compose <a> <b> Compose two seeds');
        newLines.push('  list          List active seeds');
        newLines.push('  clear         Clear terminal');
        newLines.push('  about         About Paradigm');
        newLines.push('');
        break;
      case 'seed':
        newLines.push(`Created seed in domain: ${parts[1] || 'game'}`);
        newLines.push(`  hash: ${createHash('sha256').update(cmd + Date.now()).digest('hex').slice(0, 16)}`);
        newLines.push('');
        break;
      case 'grow':
        newLines.push(`Growing seed...`);
        newLines.push(`  Artifact generated successfully`);
        newLines.push('');
        break;
      case 'about':
        newLines.push('Paradigm Absolute v1.0.0');
        newLines.push('Deterministic Synthetic Evolution Operating System');
        newLines.push('Every artifact is a seed. Every seed is sovereign.');
        newLines.push('');
        break;
      case 'clear':
        setLines([]);
        setInput('');
        return;
      case '':
        break;
      default:
        newLines.push(`Unknown command: ${command}. Type "help" for available commands.`);
        newLines.push('');
    }

    setLines(newLines);
    setInput('');
  };

  return (
    <div style={{ fontFamily: "'Cascadia Code', 'Fira Code', monospace", fontSize: '13px' }}>
      {lines.map((line, i) => (
        <div key={i} style={{ color: line.startsWith('$') ? '#533483' : '#aaa', lineHeight: '1.6' }}>
          {line}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ color: '#533483', marginRight: '8px' }}>$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCommand(input); }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
          autoFocus
        />
      </div>
    </div>
  );
}

function SeedAppContent({ app }: { app: ShellWindow }) {
  const [generating, setGenerating] = useState(false);
  const [artifact, setArtifact] = useState<any>(null);

  const generateArtifact = async () => {
    setGenerating(true);
    try {
      const domain = app.title === 'Card Games' ? 'cardgame'
        : app.title === 'Board Games' ? 'boardgame'
        : app.title === 'Synthesizer' ? 'music'
        : app.title === 'World Builder' ? 'world'
        : app.title === 'Character Lab' ? 'character'
        : app.title === 'Game Engine' ? 'game'
        : app.title === '3D Studio' ? 'geometry3d'
        : app.title === 'Story Engine' ? 'narrative'
        : app.title === 'Evolution Lab' ? 'alife'
        : 'game';

      const res = await fetch('/api/seeds/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          $domain: domain,
          $name: `${domain}-from-shell`,
          genes: {},
        }),
      });
      const data = await res.json();
      setArtifact(data);
    } catch (e) {
      setArtifact({ error: 'Generation failed — API may not be running' });
    }
    setGenerating(false);
  };

  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>{app.icon}</div>
      <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px' }}>{app.title}</h3>
      <p style={{ color: '#888', fontSize: '14px', margin: '0 0 24px 0' }}>
        Seed-powered application
      </p>
      
      {!artifact ? (
        <button
          onClick={generateArtifact}
          disabled={generating}
          style={{
            padding: '12px 24px',
            background: generating ? '#666' : 'linear-gradient(135deg, #533483, #e94560)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: generating ? 'wait' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s',
          }}
        >
          {generating ? 'Generating...' : 'Generate Artifact'}
        </button>
      ) : artifact.error ? (
        <div style={{ color: '#e94560', padding: '16px', background: 'rgba(233,69,96,0.1)', borderRadius: '8px' }}>
          {artifact.error}
        </div>
      ) : (
        <div style={{ textAlign: 'left' }}>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(46,125,50,0.2)',
            borderRadius: '8px',
            border: '1px solid rgba(46,125,50,0.4)',
            marginBottom: '12px',
          }}>
            <div style={{ color: '#4caf50', fontSize: '13px', fontWeight: 'bold' }}>Generated Successfully</div>
            <div style={{ color: '#aaa', fontSize: '12px', marginTop: '4px' }}>
              Domain: {artifact.$domain || 'unknown'} | Hash: {(artifact.$hash || '').slice(0, 12)}...
            </div>
          </div>
          <pre style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#aaa',
            overflow: 'auto',
            maxHeight: '200px',
          }}>
            {JSON.stringify(artifact, null, 2).slice(0, 500)}
          </pre>
        </div>
      )}
      
      <div style={{
        marginTop: '16px',
        padding: '8px 16px',
        background: 'rgba(83,52,131,0.2)',
        borderRadius: '8px',
        border: '1px solid rgba(83,52,131,0.4)',
        color: '#533483',
        fontSize: '12px',
        display: 'inline-block',
      }}>
        Seed: {app.seedHash.slice(0, 12)}...
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const titleBtnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '6px',
  background: 'rgba(255,255,255,0.05)',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  color: '#aaa',
  marginLeft: '4px',
  transition: 'all 0.2s',
};

export default OSDShell;
