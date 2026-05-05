import { useState, useRef, useEffect } from 'react';
import { useSeedStore } from '@/stores/seedStore';
import { getAgentWs } from '@/services/wsAgent';
import { Loader2, Send, Bot, User, Sparkles, Wifi, WifiOff } from 'lucide-react';

function MessageBubble({ role, content, intent, data }) {
  const isAgent = role === 'agent';

  return (
    <div className={`flex gap-3 ${isAgent ? '' : 'flex-row-reverse'}`}>
      <div className={`shrink-0 w-6 h-6 rounded-sm flex items-center justify-center ${isAgent ? 'bg-secondary/10 text-secondary border border-secondary/20' : 'bg-[#1a1a1a] text-[#888] border border-[#222]'}`}>
        {isAgent ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
      </div>
      <div className={`max-w-[85%] space-y-1 ${isAgent ? '' : 'text-right'}`}>
        <div className={`inline-block px-3 py-2 font-mono text-[11px] leading-relaxed rounded-sm ${isAgent ? 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#ccc]' : 'bg-primary/5 border border-primary/20 text-[#eee]'}`}>
          {content}
        </div>
        {intent && intent !== 'error' && (
          <div className="font-mono text-[9px] text-[#666] flex items-center gap-1.5 mt-1">
            <Sparkles className="w-2.5 h-2.5 text-accent" />
            <span className="uppercase tracking-widest">{intent}</span>
            {data?.seed && <span className="text-secondary/60 ml-2 tracking-widest">+ SEED</span>}
            {data?.seeds && <span className="text-secondary/60 ml-2 tracking-widest">+ {data.seeds.length} SEEDS</span>}
            {data?.population && <span className="text-secondary/60 ml-2 tracking-widest">+ POP: {data.population.length}</span>}
            {data?.domains && <span className="text-accent/60 ml-2 tracking-widest">{data.domains.length} DOMAINS</span>}
            {data?.types && <span className="text-primary/60 ml-2 tracking-widest">{data.types.length} TYPES</span>}
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
  const agentQueryInStore = useSeedStore((s) => s.agentQuery);

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
        const result = await agentQueryInStore(query);
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
    <div className="flex flex-col h-full bg-[#080808]" data-testid="agent-panel">
      {/* Header handled by StudioPage wrapper now, but we keep WS indicator */}
      <div className="px-4 py-2 border-b border-[#1a1a1a] flex items-center justify-between bg-[#050505]">
         <span className="font-mono text-[9px] text-[#666] tracking-widest uppercase">Connection</span>
         <span className="font-mono text-[9px] text-[#555] flex items-center gap-1.5 uppercase tracking-widest">
          {wsConnected ? (
            <><Wifi className="w-2.5 h-2.5 text-secondary" /> STREAM</>
          ) : (
            <><WifiOff className="w-2.5 h-2.5 text-[#444]" /> HTTP</>
          )}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-label="Agent conversation" aria-live="polite">
        {messages.map((msg, i) => (
          <MessageBubble key={i} {...msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[#666]" role="status" aria-label="Processing query">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Processing...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[#1a1a1a] bg-[#050505]">
        <div className="flex gap-2">
          <input
            data-testid="agent-input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder='e.g., "compose a character. warrior."'
            aria-label="Send a query to the GSPL Agent"
            disabled={loading}
            className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] focus:border-secondary/50 font-mono text-[11px] text-[#eee] placeholder-[#444] transition-colors disabled:opacity-40 outline-none rounded-sm"
          />
          <button
            data-testid="agent-send"
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message to agent"
            className="px-4 py-2 bg-secondary/10 text-secondary hover:bg-secondary/20 border border-secondary/20 transition-all disabled:opacity-30 flex items-center rounded-sm"
          >
            <Send className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
