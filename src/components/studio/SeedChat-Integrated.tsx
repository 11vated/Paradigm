/**
 * SeedChat Integration — Connects to Real Generators
 * Improved with better error handling, loading states, and full flow
 */

import React, { useState, useRef, useEffect } from 'react';
import { createSeedLLM, type SeedLLM } from '../../lib/kernel/seed-llm';
import { createRealSeedLLM } from '../../lib/kernel/seed-llm-openai';
import { executeGspl } from '../../lib/kernel/gspl-interpreter';
import { growSeed, type Seed, type Artifact } from '../../lib/kernel/engines';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  seed?: Seed;
  gspl?: string;
  output?: Artifact;
  error?: string;
  timestamp: Date;
  step?: 'seed' | 'gspl' | 'grow' | 'complete';
}

type LoadingStep = 'idle' | 'seed' | 'gspl' | 'grow' | 'complete' | 'error';

export function SeedChatIntegrated() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'system',
      content: 'Paradigm Studio AI — Connected to 103+ domain generators. Describe what to generate.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize LLM (mock or real)
  const [llm] = useState<SeedLLM>(() => {
    if (apiKey) {
      try {
        return createRealSeedLLM({ provider: 'openai', apiKey });
      } catch (e) {
        console.warn('Failed to initialize OpenAI, using mock:', e);
        setError('Failed to initialize OpenAI API, using mock generator');
      }
    }
    return createSeedLLM({ provider: 'mock' });
  });

  const sendMessage = async () => {
    if (!input.trim() || loadingStep !== 'idle') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError(null);
    setLoadingStep('seed');

    try {
      // Step 1: Generate seed
      let seed: Seed;
      try {
        seed = await llm.generateSeed(input);
        if (!seed || !seed.phrase) {
          throw new Error('Invalid seed generated - missing phrase');
        }
      } catch (e) {
        throw new Error(`Seed generation failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      setLoadingStep('gspl');

      // Step 2: Generate GSPL program
      let gspl: string;
      try {
        gspl = await llm.generateGSPL(input, seed);
        if (!gspl || gspl.length === 0) {
          throw new Error('Empty GSPL program generated');
        }
      } catch (e) {
        throw new Error(`GSPL generation failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      setLoadingStep('grow');

      // Step 3: Execute GSPL or grow seed
      let output: Artifact | undefined;
      let gsplError: string | null = null;

      // Try GSPL execution first
      try {
        const result = executeGspl(gspl, seed.phrase);
        if (result && result.type && result.domain) {
          output = result as Artifact;
        }
      } catch (e) {
        gsplError = e instanceof Error ? e.message : String(e);
        console.warn('GSPL execution failed, falling back to growSeed:', e);
      }

      // Fallback to growSeed if GSPL didn't produce valid output
      if (!output) {
        try {
          output = await growSeed(seed);
        } catch (e) {
          throw new Error(`Generation failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (!output) {
        throw new Error('No output generated from seed');
      }

      setLoadingStep('complete');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `✓ Generated: ${seed.phrase}\nGSPL: ${gspl.length} chars${gsplError ? '\n⚠ GSPL fallback used' : ''}\nOutput: ${output.type || 'artifact'}`,
        seed,
        gspl,
        output,
        step: 'complete',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(errorMsg);
      setLoadingStep('error');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ``,
        error: errorMsg,
        timestamp: new Date(),
      }]);
    } finally {
      // Reset loading state after a brief delay for UX
      setTimeout(() => setLoadingStep('idle'), 500);
    }
  };

  const getLoadingText = () => {
    switch (loadingStep) {
      case 'seed': return 'Generating seed...';
      case 'gspl': return 'Creating GSPL program...';
      case 'grow': return 'Growing artifact...';
      case 'complete': return 'Complete!';
      case 'error': return 'Error occurred';
      default: return 'Generate';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h3 style={styles.title}>SeedChat — Integrated</h3>
          <span style={styles.status}>
            {loadingStep === 'idle' && <span style={styles.statusReady}>● Ready</span>}
            {loadingStep !== 'idle' && loadingStep !== 'complete' && loadingStep !== 'error' && (
              <span style={styles.statusLoading}><Loader2 size={12} className="animate-spin" /> Working...</span>
            )}
            {loadingStep === 'complete' && <span style={styles.statusComplete}><CheckCircle2 size={12} /> Done</span>}
            {loadingStep === 'error' && <span style={styles.statusError}><AlertCircle size={12} /> Error</span>}
          </span>
        </div>
        <input
          type="password"
          placeholder="OpenAI API Key (optional)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={styles.apiInput}
        />
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div style={styles.messagesContainer}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            ...styles.message,
            ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
            ...(msg.error ? styles.errorMessage : {}),
          }}>
            <div style={styles.messageHeader}>
              <strong>{msg.role === 'user' ? 'You' : msg.error ? 'Error' : 'AI'}</strong>
              <span style={styles.timestamp}>{msg.timestamp.toLocaleTimeString()}</span>
            </div>
            {msg.error ? (
              <div style={styles.errorContent}>
                <AlertCircle size={16} />
                <span>{msg.error}</span>
              </div>
            ) : (
              <div style={styles.messageContent}>{msg.content}</div>
            )}
            {msg.output && !msg.error && (
              <div style={styles.outputInfo}>
                {msg.output.type && <span style={styles.outputBadge}>{msg.output.type}</span>}
                {msg.output.domain && <span style={styles.outputBadge}>{msg.output.domain}</span>}
                {msg.output.mesh && <small>OBJ mesh ready</small>}
                {msg.output.audio && <small>WAV audio ready</small>}
                {msg.output.sprite && <small>PNG sprite ready</small>}
              </div>
            )}
            {msg.gspl && !msg.error && (
              <details style={styles.gsplDetails}>
                <summary style={styles.gsplSummary}>View GSPL Code</summary>
                <pre style={styles.gsplCode}>{msg.gspl}</pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div style={styles.inputContainer}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder="Describe what to generate... (e.g., 'cyberpunk warrior', 'ambient music', 'fantasy forest')"
          style={styles.input}
          rows={2}
          disabled={loadingStep !== 'idle'}
        />
        <button
          onClick={sendMessage}
          disabled={loadingStep !== 'idle' || !input.trim()}
          style={{
            ...styles.sendButton,
            ...(loadingStep !== 'idle' ? styles.sendButtonLoading : {}),
          }}
        >
          {loadingStep !== 'idle' ? (
            <span style={styles.buttonContent}>
              <Loader2 size={16} className="animate-spin" />
              {getLoadingText()}
            </span>
          ) : (
            'Generate'
          )}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, height: '600px', backgroundColor: '#1a1a1a', color: '#fff' },
  header: { padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '16px', fontWeight: 'bold' },
  status: { fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' },
  statusReady: { color: '#00ff00' },
  statusLoading: { color: '#4a9eff', display: 'flex', alignItems: 'center', gap: '4px' },
  statusComplete: { color: '#00ff00', display: 'flex', alignItems: 'center', gap: '4px' },
  statusError: { color: '#ff4444', display: 'flex', alignItems: 'center', gap: '4px' },
  apiInput: { padding: '6px 10px', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '12px', width: '100%' },
  errorBanner: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#ff444420', borderBottom: '1px solid #ff444440', color: '#ff8888', fontSize: '13px' },
  messagesContainer: { flex: 1, overflowY: 'auto' as const, padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  message: { padding: '12px', borderRadius: '8px', maxWidth: '80%' },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#2a2a4a' },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: '#2a3a2a' },
  errorMessage: { alignSelf: 'flex-start', backgroundColor: '#3a2a2a', border: '1px solid #ff444440' },
  messageHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#888' },
  timestamp: { color: '#666' },
  messageContent: { whiteSpace: 'pre-wrap' as const, fontSize: '14px', lineHeight: '1.5' },
  errorContent: { display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#ff8888', fontSize: '13px' },
  outputInfo: { marginTop: '8px', fontSize: '11px', color: '#4a9eff', display: 'flex', gap: '8px', flexWrap: 'wrap' as const },
  outputBadge: { padding: '2px 6px', backgroundColor: '#4a9eff20', borderRadius: '4px', border: '1px solid #4a9eff40' },
  gsplDetails: { marginTop: '8px', fontSize: '12px' },
  gsplSummary: { cursor: 'pointer', color: '#4a9eff', fontSize: '12px' },
  gsplCode: { marginTop: '8px', padding: '8px', backgroundColor: '#000', borderRadius: '4px', fontSize: '11px', overflowX: 'auto' as const, whiteSpace: 'pre' as const, maxHeight: '200px', overflowY: 'auto' as const },
  inputContainer: { padding: '16px', borderTop: '1px solid #333', display: 'flex', gap: '8px' },
  input: { flex: 1, padding: '8px 12px', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontFamily: 'monospace', fontSize: '14px', resize: 'none' as const },
  sendButton: { padding: '8px 16px', backgroundColor: '#4a9eff', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontWeight: 'bold', minWidth: '100px' },
  sendButtonLoading: { backgroundColor: '#2a2a2a', cursor: 'not-allowed' },
  buttonContent: { display: 'flex', alignItems: 'center', gap: '6px' },
};
