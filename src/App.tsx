import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StudioPage from "@/pages/StudioPage";
import SeedChat from "@/components/studio/SeedChat";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/chat" element={<SeedChat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LandingPage() {
  return (
    <div style={styles.landing}>
      <div style={styles.hero}>
        <h1 style={styles.title}>Paradigm</h1>
        <p style={styles.subtitle}>Nobel Prize-Caliber AI-Native Generative Platform</p>
        <div style={styles.stats}>
          <div style={styles.stat}>
            <strong>140+</strong>
            <span>Domains</span>
          </div>
          <div style={styles.stat}>
            <strong>5</strong>
            <span>Phases Complete</span>
          </div>
          <div style={styles.stat}>
            <strong>GPU</strong>
            <span>Accelerated</span>
          </div>
        </div>
        <div style={styles.cta}>
          <a href="/studio" style={styles.buttonPrimary}>Enter Studio</a>
          <a href="/chat" style={styles.buttonSecondary}>Try Chat</a>
        </div>
      </div>
      <div style={styles.features}>
        <div style={styles.feature}>
          <h3>🎨 V2 Generators</h3>
          <p>Character, Music, Sprite — world-class generative algorithms</p>
        </div>
        <div style={styles.feature}>
          <h3>⚡ WebGPU Compute</h3>
          <p>GPU-accelerated generation with CPU fallback</p>
        </div>
        <div style={styles.feature}>
          <h3>📜 GSPL Language</h3>
          <p>Custom programming language for seed operations</p>
        </div>
        <div style={styles.feature}>
          <h3>🔒 Binary Format</h3>
          <p>.gseed with C2PA provenance & royalty tracking</p>
        </div>
        <div style={styles.feature}>
          <h3>🤖 AI Agent</h3>
          <p>Natural language to generative artifacts</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  landing: {
    minHeight: '100vh',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  hero: {
    padding: '80px 24px',
    textAlign: 'center' as const,
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '64px',
    fontWeight: 'bold',
    margin: '0 0 16px',
    background: 'linear-gradient(135deg, #4a9eff, #ff6b6b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '20px',
    color: '#888',
    margin: '0 0 32px',
  },
  stats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '48px',
    marginBottom: '48px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  cta: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
  },
  buttonPrimary: {
    padding: '12px 32px',
    backgroundColor: '#4a9eff',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  buttonSecondary: {
    padding: '12px 32px',
    backgroundColor: 'transparent',
    color: '#4a9eff',
    border: '2px solid #4a9eff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    padding: '48px 24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  feature: {
    padding: '24px',
    backgroundColor: '#2a2a2a',
    borderRadius: '12px',
    textAlign: 'center' as const,
  },
};

export default App;
