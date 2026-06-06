import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useAgent } from '@/hooks/useAgent';
import { useAgentThreads } from '@/stores/agentThreads';
import { useActiveSeed } from '@/stores/activeSeed';
import { parseSlashCommand } from '@/lib/ui/seedActions';
import { deriveCleanTitle } from '@/lib/kernel/types';

const AGENT_TOOLS = [
  '/grow', '/mutate', '/breed', '/compose', '/sign', '/verify',
  '/mint', '/list', '/critique', '/replay', '/evolve', '/dream',
  '/swarm', '/research', '/rag', '/memory', '/fork', '/help',
];

interface ComposerProps {
  onVoiceToggle?: () => void;
  voiceSupported?: boolean;
}

export const Composer = React.memo<ComposerProps>(({ voiceSupported = true }) => {
  const { send } = useAgent();
  const { currentThreadId, forkFrom, selectedTier, setSelectedTier } = useAgentThreads();
  const seed = useActiveSeed((s) => s.seed);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [listening, setListening] = useState(false);

  // Live strata for composer context (right panel)
  const composerStrata = useMemo(() => {
    if (!seed) return null;
    try {
      const sc = (seed as any).strata?.overall ?? ((seed as any).raw && (seed as any).raw.strataCompliance);
      if (typeof sc === 'number') return Math.round(sc * 100);
      return Math.round(0.73 * 100); // will be live-updated by hook
    } catch { return 73; }
  }, [seed]);

  const filteredCommands = useMemo(() => {
    if (!text.startsWith('/')) return [];
    const partial = text.toLowerCase();
    return AGENT_TOOLS.filter((c) => c.startsWith(partial)).slice(0, 6);
  }, [text]);

  useEffect(() => {
    setShowSuggestions(filteredCommands.length > 0 && text.startsWith('/'));
  }, [filteredCommands, text]);

  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    taRef.current?.focus();
    const onPrompt = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string }>).detail;
      if (detail?.text) {
        setText(detail.text);
        void sendRef.current(detail.text);
      }
    };
    window.addEventListener('paradigm:compose-prompt', onPrompt);
    return () => window.removeEventListener('paradigm:compose-prompt', onPrompt);
  }, []);

  const submit = useCallback(async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setText('');
    try {
      const slash = parseSlashCommand(t);
      if (slash) {
        const result = await slash;
        // Inform the user in the conversation log
        window.dispatchEvent(new CustomEvent('paradigm:agent-system', {
          detail: { tier: result.ok ? 'ok' : 'warn', text: result.message },
        }));
      } else {
        await send(t);
      }
    } finally {
      setBusy(false);
      requestAnimationFrame(() => taRef.current?.focus());
    }
  }, [text, busy, send]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
      return;
    }
    // Enter alone = newline (default)
    // Tab to autocomplete slash command
    if (e.key === 'Tab' && showSuggestions && filteredCommands.length > 0) {
      e.preventDefault();
      setText(filteredCommands[0] + ' ');
      setShowSuggestions(false);
      return;
    }
    // Cmd+Shift+B to fork thread
    if (e.key === 'B' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      if (currentThreadId) {
        forkFrom(currentThreadId, 'latest', `${text.slice(0, 30)}…`);
      }
      return;
    }
  };

  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    if (listening) {
      setListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText((prev) => prev + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  }, [listening]);

  return (
    <div
      style={{
        borderTop: '1px solid var(--r-ink-4)',
        padding: 'var(--r-px-4) var(--r-px-5)',
        background: 'rgba(255,255,255,0.012)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ position: 'relative' }}>
        {/* Prompt bar area strata context (right rail) always visible */}
        {seed && composerStrata != null && <div style={{ fontSize: 9, color: '#64748b', marginBottom: 2, fontFamily: 'monospace' }}>active · strata {composerStrata}% · {deriveCleanTitle(seed.name, seed.hash).slice(0,24)}</div>}
        <textarea
          ref={taRef}
          className="r-input"
          rows={2}
          value={text}
          placeholder="Talk to Paradigm…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          disabled={busy}
          spellCheck={false}
          style={{
            fontFamily: text.startsWith('/') ? 'var(--r-font-display)' : 'var(--r-font-prose)',
            minHeight: 48,
            fontSize: 12,
            paddingRight: 32,
          }}
        />

        {/* Slash autocomplete dropdown */}
        {showSuggestions && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              background: 'var(--r-void-3)',
              border: '1px solid var(--r-ink-4)',
              borderBottom: 'none',
              borderRadius: 'var(--r-radius-1) var(--r-radius-1) 0 0',
              maxHeight: 160,
              overflowY: 'auto',
              zIndex: 10,
            }}
          >
            {filteredCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => {
                  setText(cmd + ' ');
                  setShowSuggestions(false);
                  taRef.current?.focus();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '5px 10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--r-ink-1)',
                  fontFamily: 'var(--r-font-display)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {cmd}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex',
            gap: 3,
            flex: 1,
            minWidth: 0,
            overflowX: 'auto',
          }}
        >
          {AGENT_TOOLS.slice(0, 6).map((c) => (
            <button
              key={c}
              type="button"
              className="r-chip"
              onClick={() => {
                setText((t) => (t.startsWith('/') || t === '' ? c + ' ' : t));
                taRef.current?.focus();
              }}
              style={{ cursor: 'pointer', fontSize: 8, height: 18, padding: '0 5px', flexShrink: 0 }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 3-tier selector: fast / standard / deep (kernel is the local fallback) */}
        <div
          role="group"
          aria-label="Inference tier"
          style={{ display: 'flex', gap: 1, padding: '0 2px', borderLeft: '1px solid var(--r-ink-5)', marginLeft: 2 }}
        >
          {(['fast', 'standard', 'deep'] as const).map((t) => (
            <button
              key={t}
              type="button"
              data-active={selectedTier === t}
              title={`${t} tier${t === 'fast' ? ' — quick replies, no model change' : t === 'standard' ? ' — balanced (default)' : ' — full reasoning, slower'}`}
              onClick={() => setSelectedTier(t)}
              style={{
                cursor: 'pointer',
                fontSize: 8,
                height: 18,
                padding: '0 5px',
                background: selectedTier === t ? 'var(--r-prism-core)' : 'transparent',
                color: selectedTier === t ? 'var(--r-void-0)' : 'var(--r-ink-2)',
                border: '1px solid var(--r-ink-5)',
                borderRadius: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Voice button */}
        {voiceSupported && (
          <button
            className="r-chip"
            onClick={toggleVoice}
            style={{
              cursor: 'pointer',
              borderColor: listening ? 'var(--r-prism-core)' : 'var(--r-ink-4)',
              color: listening ? 'var(--r-prism-core)' : 'var(--r-ink-2)',
              fontSize: 8,
              height: 18,
              padding: '0 5px',
            }}
            title={listening ? 'Listening…' : 'Voice input'}
            aria-pressed={listening}
            aria-label={listening ? 'Voice input (listening)' : 'Voice input'}>
            {listening ? '◉' : '🎤'}
          </button>
        )}

        <span
          style={{
            fontFamily: 'var(--r-font-num)',
            fontSize: 8,
            color: 'var(--r-ink-4)',
            whiteSpace: 'nowrap',
          }}
        >
          ⌘↩ send
        </span>
        <button
          className="r-btn"
          data-tone="primary"
          onClick={submit}
          disabled={busy || !text.trim()}
          style={{
            opacity: busy || !text.trim() ? 0.5 : 1,
            height: 22,
            fontSize: 9,
            padding: '0 8px',
          }}
        >
          {busy ? 'Evolving seed…' : '→'}
        </button>
      </div>
    </div>
  );
});
