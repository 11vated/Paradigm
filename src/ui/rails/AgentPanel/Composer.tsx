import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { useAgent } from '@/hooks/useAgent';
import { useAgentThreads } from '@/stores/agentThreads';
import { useActiveSeed } from '@/stores/activeSeed';
import { parseSlashCommand } from '@/lib/ui/seedActions';

const AGENT_TOOLS = [
  '/grow', '/mutate', '/breed', '/compose', '/sign', '/verify',
  '/mint', '/list', '/critique', '/replay', '/evolve', '/dream',
  '/swarm', '/research', '/rag', '/memory', '/fork', '/help',
];

interface ComposerProps {
  onVoiceToggle?: () => void;
  voiceSupported?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({ voiceSupported = true }) => {
  const { send } = useAgent();
  const { currentThreadId, forkFrom } = useAgentThreads();
  const seed = useActiveSeed((s) => s.seed);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [listening, setListening] = useState(false);

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
          >
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
          {busy ? '…' : '→'}
        </button>
      </div>
    </div>
  );
};
