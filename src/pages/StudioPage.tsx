/**
 * Studio Page — AI-Native Generative Design
 *
 * Main page for the Paradigm Studio with SeedChat AI assistant, GSPL REPL, and Preview.
 */

import React, { useState } from 'react';
import SeedChat from '@/components/studio/SeedChat-Integrated';
import { GsplRepl } from '@/components/studio/GsplRepl';
import { PreviewViewport } from './PreviewViewport';

interface Artifact {
  seed: any;
  output: any;
  gspl: string;
}

export function StudioPage() {
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'repl' | 'preview'>('chat');

  const handleArtifactGenerated = (artifact: Artifact) => {
    setCurrentArtifact(artifact);
    setActiveTab('preview');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <h1 style={styles.title}>Paradigm Studio</h1>
          <span style={styles.subtitle}>AI-Native Generative Platform</span>
        </div>
        <nav style={styles.nav}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              ...styles.navButton,
              ...(activeTab === 'chat' ? styles.navButtonActive : {}),
            }}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab('repl')}
            style={{
              ...styles.navButton,
              ...(activeTab === 'repl' ? styles.navButtonActive : {}),
            }}
          >
            💻 REPL
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            style={{
              ...styles.navButton,
              ...(activeTab === 'preview' ? styles.navButtonActive : {}),
            }}
          >
            👁️ Preview
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        {activeTab === 'chat' ? (
          <div style={styles.chatPanel}>
            <SeedChat onArtifactGenerated={handleArtifactGenerated} />
          </div>
        ) : activeTab === 'repl' ? (
          <div style={styles.replPanel}>
            <GsplRepl />
          </div>
        ) : (
          <div style={styles.previewPanel}>
            {currentArtifact ? (
              <div>
                <div style={styles.artifactInfo}>
                  <h3>{currentArtifact.seed?.$name || 'Generated Artifact'}</h3>
                  <p>Seed: {currentArtifact.seed?.phrase}</p>
                  <p>Hash: {currentArtifact.seed?.hash?.substring(0, 16)}...</p>
                </div>
                <PreviewViewport
                  artifact={currentArtifact?.output}
                  seed={currentArtifact?.seed}
                  onSeedUpdate={() => {}}
                  width={800}
                  height={600}
                />
                <details style={styles.codeDetails}>
                  <summary style={styles.codeSummary}>GSPL Code</summary>
                  <pre style={styles.codeBlock}>{currentArtifact.gspl}</pre>
                </details>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>💬 Start a conversation in the Chat tab to generate artifacts</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <span>Paradigm v1.0 — Nobel Prize-Caliber Generative Platform</span>
        <span>140+ Domains | Deterministic RNG | WebGPU Accelerated</span>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    background: 'linear-gradient(135deg, #4a9eff, #ff6b6b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  nav: {
    display: 'flex',
    gap: '8px',
  },
  navButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  navButtonActive: {
    backgroundColor: '#4a9eff',
    borderColor: '#4a9eff',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
  },
  chatPanel: {
    height: '100%',
    padding: '16px',
  },
  replPanel: {
    height: '100%',
    overflow: 'hidden',
  },
  previewPanel: {
    height: '100%',
    padding: '16px',
    overflowY: 'auto' as const,
  },
  artifactInfo: {
    marginBottom: '16px',
    padding: '16px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
  },
  codeDetails: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px',
  },
  codeSummary: {
    cursor: 'pointer',
    color: '#4a9eff',
    fontSize: '14px',
  },
  codeBlock: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#000',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: '#888',
    fontSize: '18px',
  },
  footer: {
    padding: '12px 24px',
    borderTop: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
  },
};
