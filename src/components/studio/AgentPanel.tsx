import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, BarChart3, Bot, Star, Users } from 'lucide-react';
import { createDefaultSwarm, AgentSwarm, type AgentThought } from '@/lib/agent/swarm';

interface AgentPanelProps {
  onSeedCreated?: (seed: any) => void;
}

export default function AgentPanel({ onSeedCreated }: AgentPanelProps) {
  const [swarm] = useState(() => createDefaultSwarm());
  const [isEvolving, setIsEvolving] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [population, setPopulation] = useState<any[]>([]);
  const [thoughts, setThoughts] = useState<AgentThought[]>([]);
  const [reputations, setReputations] = useState<Record<string, number>>({});
  const evolutionRef = useRef(false);

  const handleStartEvolution = useCallback(async () => {
    if (isEvolving) return;
    setIsEvolving(true);
    evolutionRef.current = true;

    swarm.onEvolutionUpdate((gen, pop) => {
      setGeneration(gen);
      setPopulation(pop.slice(0, 10));
    });

    try {
      const request = 'Generate innovative seeds across all domains';
      await swarm.startAutonomousEvolution(request);
    } catch (e) {
      console.error('Evolution error:', e);
    } finally {
      setIsEvolving(false);
      evolutionRef.current = false;
      setReputations(swarm.getSwarmReputation());
      const allThoughts: AgentThought[] = [];
      swarm.getAgents().forEach(agent => {
        allThoughts.push(...agent.getThoughtHistory());
      });
      setThoughts(allThoughts.slice(-20));
    }
  }, [isEvolving, swarm]);

  const handleStopEvolution = useCallback(() => {
    swarm.stopEvolution();
    setIsEvolving(false);
    evolutionRef.current = false;
  }, [swarm]);

  const handleSelectSeed = useCallback((seed: any) => {
    if (onSeedCreated) {
      onSeedCreated(seed);
    }
  }, [onSeedCreated]);

  return (
    <div className="flex flex-col h-full p-3 gap-3 bg-[#050505] overflow-y-auto">
      <div className="font-mono text-[10px] text-[#888] uppercase tracking-wider flex items-center gap-2">
        <Bot className="w-3 h-3 text-primary" />
        Agent Swarm
      </div>

      {/* Swarm Status */}
      <div className="bg-[#0a0a0a] p-3 rounded border border-[#1a1a1a]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[9px] text-[#666]">Status</span>
          <span className={`font-mono text-[9px] ${isEvolving ? 'text-green-500' : 'text-[#444]'}`}>
            {isEvolving ? 'EVOLVING' : 'IDLE'}
          </span>
        </div>

      {isEvolving && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-[#1a1a1a] rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, (generation / 100) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[8px] text-[#666] w-12 text-right">{generation}</span>
          </div>
          <div className="font-mono text-[8px] text-[#444]">
            Population: {population.length} seeds
          </div>
        </div>
      )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!isEvolving ? (
          <button
            onClick={handleStartEvolution}
            className="flex-1 py-2 bg-primary/10 border border-primary/30 text-primary font-mono text-[9px] uppercase tracking-wider hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3" />
            Start Evolution
          </button>
        ) : (
          <button
            onClick={handleStopEvolution}
            className="flex-1 py-2 bg-red-500/10 border border-red-500/30 text-red-500 font-mono text-[9px] uppercase tracking-wider hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1"
          >
            <Pause className="w-3 h-3" />
            Stop
          </button>
        )}
      </div>

      {/* Top Seeds */}
      {population.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1">
            <Star className="w-3 h-3" />
            Top Seeds
          </div>
          <div className="space-y-1">
            {population.slice(0, 5).map((seed, i) => (
              <button
                key={seed.$hash || i}
                onClick={() => handleSelectSeed(seed)}
                className="w-full text-left p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-[#aaa]">{seed.$domain || 'unknown'}</span>
                  <span className="font-mono text-[8px] text-primary">{((seed.fitness || 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="font-mono text-[8px] text-[#666] truncate mt-1">
                  {seed.$hash?.slice(0, 16)}...
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent Reputations */}
      <div>
        <div className="font-mono text-[9px] text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1">
          <Users className="w-3 h-3" />
          Agent Reputations
        </div>
        <div className="space-y-1">
          {Object.entries(reputations).map(([name, rep]) => {
            const reputationValue = typeof rep === 'number' ? rep : parseFloat(rep as string) || 0;
            return (
              <div key={name} className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#1a1a1a] rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                    style={{ width: `${reputationValue * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[8px] text-[#888] w-16 text-right">{(reputationValue * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Thoughts */}
      {thoughts.length > 0 && (
        <div>
          <div className="font-mono text-[9px] text-[#666] uppercase tracking-wider mb-2 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            Recent Thoughts
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {thoughts.slice(-5).reverse().map((thought, i) => (
              <div key={thought.id} className="p-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded">
                <div className="flex items-center gap-1 mb-1">
                  <span className={`px-1 py-0.5 rounded text-[7px] font-mono uppercase ${
                    thought.type === 'idea' ? 'bg-blue-500/20 text-blue-400' :
                    thought.type === 'style' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {thought.type}
                  </span>
                  <span className="font-mono text-[7px] text-[#444] ml-auto">
                    {new Date(thought.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-mono text-[8px] text-[#888] leading-relaxed line-clamp-2">
                  {thought.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
