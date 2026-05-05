import { useState, useRef, useEffect } from 'react';
import { agentQuery } from '@/services/api';
import { getAgentWs } from '@/services/wsAgent';
import { Loader2, Send, Bot, User, Sparkles, Wifi, WifiOff } from 'lucide-react';

function MessageBubble({ role, content, intent, data }) {
  const isAgent = role === 'agent';

  return (
    <div className={`flex gap-2 ${isAgent ? '' : 'flex-row-reverse'}`}>
      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isAgent ? 'bg-primary/10 text-primary' : 'bg-neutral-800 text-neutral-400'}`}>
        {isAgent ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
      </div>
      <div className={`max-w-[85%] space-y-1 ${isAgent ? '' : 'text-right'}`}>
        <div className={`inline-block px-3 py-2 font-mono text-[11px] leading-relaxed ${isAgent ? 'bg-neutral-900/60 border border-neutral-800/50 text-neutral-300' : 'bg-primary/10 border border-primary/20 text-neutral-200'}`}>
          {content}
        </div>
        {intent && intent !== 'error' && (
          <div className="font-mono text-[8px] text-neutral-600 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            intent: {intent}
            {data?.seed && <span className="text-primary/60 ml-1">+ seed created</span>}
            {data?.seeds && <span className="text-primary/60 ml-1">+ {data.seeds.length} seeds</span>}
            {data?.population && <span className="text-secondary/60 ml-1">+ pop:{data.population.length}</span>}
            {data?.domains && <span className="text-accent/60 ml-1">{data.domains.length} domains</span>}
            {data?.types && <span className="text-primary/60 ml-1">{data.types.length} types</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPanel({ onSeedCreated }) {
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'I\'m the Paradigm GSPL Agent. Ask me to create seeds, mutate, evolve, compose across domains, parse GSPL code, or explore the kernel. Try: "create a character seed called Hero" or "list domains".', intent: null }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const scrollRef = useRef(null);
  const wsRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = getAgentWs();
    wsRef.current = ws;

    ws.onConnect = () => setWsConnected(true);
    ws.onDisconnect = () => setWsConnected(false);

    // Handle streaming messages (thinking indicators)
    ws.onMessage = (data) => {
      if (data.type === 'thinking') {
        // Could show a typing indicator — for now we skip
      }
    };

    ws.connect();

    return () => {
      // Don't disconnect on unmount — keep alive across tab switches
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const processResult = (result) => {
    const agentMsg = {
      role: 'agent',
      content: result.message || (result.success !== false ? 'Done.' : result.message || 'Something went wrong.'),
      intent: result.intent || result.type,
      data: result.data,
    };
    setMessages(prev => [...prev, agentMsg]);

    // If the agent created a seed, push it to the studio
    if (result.data?.seed && onSeedCreated) onSeedCreated(result.data.seed);
    if (result.data?.seeds?.length > 0 && onSeedCreated) onSeedCreated(result.data.seeds[0]);
    if (result.data?.population?.length > 0 && onSeedCreated) onSeedCreated(result.data.population[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setLoading(true);

    try {
      if (wsConnected && wsRef.current) {
        // Use WebSocket (streaming)
        const result = await wsRef.current.send(query);
        if (result.type === 'error') {
          setMessages(prev => [...prev, { role: 'agent', content: result.message, intent: 'error' }]);
        } else {
          processResult(result);
        }
      } else {
        // Fallback to HTTP
        const result = await agentQuery(query);
        processResult(result);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: err.response?.data?.detail || err.message || 'Request failed',
        intent: 'error',
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full" data-testid="agent-panel">
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-800/50 flex items-center gap-2">
        <Bot className="w-3 h-3 text-primary" />
        <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">GSPL Agent</span>
        <span className="font-mono text-[8px] text-neutral-700 ml-auto flex items-center gap-1">
          {wsConnected ? (
            <><Wifi className="w-2.5 h-2.5 text-secondary" /> ws</>
          ) : (
            <><WifiOff className="w-2.5 h-2.5 text-neutral-600" /> http</>
          )}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" role="log" aria-label="Agent conversation" aria-live="polite">
        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-neutral-600" role="status" aria-label="Processing query">
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
            <span className="font-mono text-[10px]">Processing...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-neutral-800/50">
        <div className="flex gap-1.5">
          <input
            data-testid="agent-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='Try "create a character seed" or "list domains"'
            aria-label="Send a query to the GSPL Agent"
            disabled={loading}
            className="flex-1 px-2.5 py-1.5 bg-black/30 border border-neutral-800 font-mono text-[11px] text-neutral-200 placeholder-neutral-700 focus:border-primary/40 transition-colors disabled:opacity-40"
          />
          <button
            data-testid="agent-send"
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message to agent"
            className="px-2.5 py-1.5 bg-primary text-black hover:bg-primary/80 transition-colors disabled:opacity-30 flex items-center"
          >
            <Send className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
