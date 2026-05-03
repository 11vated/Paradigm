/**
 * SeedChat Component — AI-Native Generative Interface
 *
 * Provides a chat UI for interacting with the Seed LLM
 * to generate, refine, and export generative artifacts.
 */

import React, { useState, useRef, useEffect } from 'react';
import { createSeedLLM, type SeedLLM, type SeedLLMConfig } from '../../lib/kernel/seed-llm';
import { executeGspl } from '../../lib/kernel/gspl-interpreter';
import { encodeGseed, createGseed } from '../../lib/kernel/binary-format';
import { buildC2PAManifest } from '../../lib/kernel/c2pa-manifest';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  seed?: any;
  gspl?: string;
  output?: any;
  timestamp: Date;
}

interface SeedChatProps {
  onArtifactGenerated?: (artifact: any) => void;
}

export function SeedChat({ onArtifactGenerated }: SeedChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'system',
      content: 'Welcome to Paradigm SeedChat! Describe what you want to generate (character, music, sprite).',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llm] = useState<SeedLLM>(() => createSeedLLM({ provider: 'mock' }));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Step 1: Generate seed from prompt
      const seed = await llm.generateSeed(input);

      // Step 2: Generate GSPL program
      const gspl = await llm.generateGSPL(input, seed);

      // Step 3: Execute GSPL to generate output
      let output;
      try {
        output = executeGspl(gspl, seed.phrase);
      } catch (e) {
        output = { error: e instanceof Error ? e.message : String(e) };
      }

      // Step 4: Create .gseed package
      let gseedInfo;
      try {
        const mockOutput = {
          mesh: output?.mesh || 'mock mesh data',
          format: 'obj' as const,
        };
        const gseed = createGseed(seed, 'character-v2', mockOutput, {
          author: 'Studio User',
          title: input.slice(0, 50),
        });
        const manifest = buildC2PAManifest(seed, 'character-v2');
        gseed.c2paManifest = new TextEncoder().encode(JSON.stringify(manifest));
        gseed.flags.hasC2PA = true;
        const encoded = encodeGseed(gseed);
        gseedInfo = { size: encoded.length, hash: seed.hash?.substring(0, 16) };
      } catch (e) {
        gseedInfo = { error: 'Failed to create .gseed' };
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Generated "${input}"\n\nSeed: ${seed.phrase}\nHash: ${seed.hash?.substring(0, 16)}...\nGSPL: ${gspl.length} chars\n.gseed: ${gseedInfo?.size || 'N/A'} bytes`,
        seed,
        gspl,
        output,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (onArtifactGenerated && output) {
        onArtifactGenerated({ seed, output, gspl });
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>SeedChat — AI Generative Assistant</h3>
        <div style={styles.status}>
          <span style={styles.statusDot}></span>
          {isLoading ? 'Generating...' : 'Ready'}
        </div>
      </div>

      <div style={styles.messagesContainer}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.message,
              ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
            }}
          >
            <div style={styles.messageHeader}>
              <strong>{msg.role === 'user' ? 'You' : 'Seed LLM'}</strong>
              <span style={styles.timestamp}>
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div style={styles.messageContent}>{msg.content}</div>
            {msg.gspl && (
              <details style={styles.gsplDetails}>
                <summary style={styles.gsplSummary}>View GSPL Code</summary>
                <pre style={styles.gsplCode}>{msg.gspl}</pre>
              </details>
            )}
            {msg.output && !msg.output.error && (
              <div style={styles.outputInfo}>
                <small>Output: {msg.output.type || 'artifact'} • {msg.output.format || 'unknown format'}</small>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={styles.inputContainer}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Describe what you want to generate... (e.g., 'cyberpunk warrior character')"
          style={styles.input}
          rows={2}
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={styles.sendButton}
        >
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '600px',
    border: '1px solid #333',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontFamily: 'monospace',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '18px',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#888',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#00ff00',
    animation: 'pulse 2s infinite',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2a2a4a',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a3a2a',
  },
  messageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '12px',
    color: '#888',
  },
  timestamp: {
    color: '#666',
  },
  messageContent: {
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  gsplDetails: {
    marginTop: '8px',
    fontSize: '12px',
  },
  gsplSummary: {
    cursor: 'pointer',
    color: '#4a9eff',
  },
  gsplCode: {
    marginTop: '8px',
    padding: '8px',
    backgroundColor: '#000',
    borderRadius: '4px',
    fontSize: '11px',
    overflowX: 'auto' as const,
    whiteSpace: 'pre' as const,
  },
  outputInfo: {
    marginTop: '8px',
    fontSize: '11px',
    color: '#888',
  },
  inputContainer: {
    padding: '16px',
    borderTop: '1px solid #333',
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '14px',
    resize: 'none' as const,
  },
  sendButton: {
    padding: '8px 16px',
    backgroundColor: '#4a9eff',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
};
export default SeedChat;
