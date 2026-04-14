import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { agentQuery } from '@/services/api';
import { getAgentWs } from '@/services/wsAgent';
import { Loader2, Send, Bot, User, Sparkles, Wifi, WifiOff, Zap, Brain, Cpu } from 'lucide-react';

// ─── Reasoning Graph (replaces loading spinner) ──────────────────────────────

function ReasoningGraph({ active }) {
  const steps = [
    { label: 'Parsing intent', icon: Zap, color: '#00E5FF', delay: 0 },
    { label: 'Building plan', icon: Brain, color: '#8A2BE2', delay: 0.3 },
    { label: 'Executing tools', icon: Cpu, color: '#FF0055', delay: 0.6 },
  ];

  if (!active) return null;

  return (
    <div className="flex items-center gap-1 py-1.5">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          className="flex items-center gap-1"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: step.delay, duration: 0.3 }}
        >
          {i > 0 && (
            <motion.div
              className="w-4 h-px"
              style={{ background: steps[i - 1].color }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: step.delay - 0.1, duration: 0.2 }}
            />
          )}
          <motion.div
            className="flex items-center gap-1 px-1.5 py-0.5 border rounded-sm"
            style={{ borderColor: `${step.color}40`, background: `${step.color}08` }}
            animate={{
              borderColor: [`${step.color}40`, `${step.color}80`, `${step.color}40`],
              boxShadow: [`0 0 0 ${step.color}00`, `0 0 8px ${step.color}30`, `0 0 0 ${step.color}00`],
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: step.delay }}
          >
            <step.icon className="w-2.5 h-2.5" style={{ color: step.color }} />
            <span className="font-mono text-[7px] uppercase" style={{ color: step.color }}>{step.label}</span>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ role, content, intent, data }) {
  const isAgent = role === 'agent';

  return (
    <motion.div
      className={`flex gap-2 ${isAgent ? '' : 'flex-row-reverse'}`}
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isAgent ? 'bg-primary/10 text-primary' : 'bg-neutral-800 text-neutral-400'}`}>
        {isAgent ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
      </div>
      <div className={`max-w-[85%] space-y-1 ${isAgent ? '' : 'text-right'}`}>
        <div className={`inline-block px-3 py-2 font-mono text-[11px] leading-relaxed ${
          isAgent
            ? 'glass-panel text-neutral-300'
            : 'bg-primary/10 border border-primary/20 text-neutral-200'
        }`}>
          {content}
        </div>
        {intent && intent !== 'error' && (
          <motion.div
            className="font-mono text-[8px] text-neutral-600 flex items-center gap-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-2.5 h-2.5" />
            intent: {intent}
            {data?.seed && <span className="text-primary/60 ml-1">+ seed created</span>}
            {data?.seeds && <span className="text-primary/60 ml-1">+ {data.seeds.length} seeds</span>}
            {data?.population && <span className="text-secondary/60 ml-1">+ pop:{data.population.length}</span>}
            {data?.domains && <span className="text-accent/60 ml-1">{data.domains.length} domains</span>}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Agent Panel ─────────────────────────────────────────────────────────────

export default function AgentPanel({ onSeedCreated }) {
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'I\'m the Paradigm GSPL Agent. Ask me to create seeds, mutate, evolve, compose across domains, parse GSPL code, or explore the kernel. Try: "create a character seed called Hero" or "list domains".', intent: null }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const scrollRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = getAgentWs();
    wsRef.current = ws;
    ws.onConnect = () => setWsConnected(true);
    ws.onDisconnect = () => setWsConnected(false);
    ws.onMessage = () => {};
    ws.connect();
    return () => {};
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const processResult = (result) => {
    setMessages(prev => [...prev, {
      role: 'agent',
      content: result.message || (result.success !== false ? 'Done.' : 'Something went wrong.'),
      intent: result.intent || result.type,
      data: result.data,
    }]);
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
        const result = await wsRef.current.send(query);
        if (result.type === 'error') {
          setMessages(prev => [...prev, { role: 'agent', content: result.message, intent: 'error' }]);
        } else {
          processResult(result);
        }
      } else {
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
            <motion.span className="flex items-center gap-1" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
              <Wifi className="w-2.5 h-2.5 text-secondary" /> ws
            </motion.span>
          ) : (
            <><WifiOff className="w-2.5 h-2.5 text-neutral-600" /> http</>
          )}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" role="log" aria-label="Agent conversation" aria-live="polite">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <MessageBubble key={i} {...msg} />
          ))}
        </AnimatePresence>

        {/* Reasoning graph replaces spinner */}
        {loading && <ReasoningGraph active={true} />}
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
          <motion.button
            data-testid="agent-send"
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message to agent"
            className="px-2.5 py-1.5 bg-primary text-black hover:bg-primary/80 transition-colors disabled:opacity-30 flex items-center"
            whileHover={{ boxShadow: '0 0 12px rgba(0,229,255,0.3)' }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-3 h-3" aria-hidden="true" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}
