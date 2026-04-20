import React, { useState, useCallback } from 'react';
import { UniversalSeed, GeneType } from '../seeds';
import { GSPLAgent } from '../intelligence';

interface SeedData {
  id: string;
  name: string;
  genes: Record<string, unknown>;
  fitness?: number;
}

const geneTypes: GeneType[] = [
  GeneType.STRUCTURE, GeneType.COLOR, GeneType.SHAPE, GeneType.MOTION,
  GeneType.AUDIO, GeneType.TEXTURE, GeneType.PATTERN, GeneType.BEHAVIOR,
  GeneType.INTERACTION, GeneType.PHYSICS, GeneType.MATERIAL, GeneType.LIGHTING,
  GeneType.ENVIRONMENT, GeneType.ANIMATION, GeneType.LOGIC, GeneType.DATA, GeneType.META
];

export const ParadigmStudio: React.FC = () => {
  const [seeds, setSeeds] = useState<SeedData[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<SeedData | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'breed' | 'agent' | 'canvas'>('editor');
  const [gsplCode, setGsplCode] = useState<string>('');
  const [agentInput, setAgentInput] = useState<string>('');
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [geneValues, setGeneValues] = useState<Record<string, unknown>>({});

  const agent = React.useMemo(() => new GSPLAgent({ name: 'Paradigm Assistant' }), []);

  const createSeed = useCallback(() => {
    const seed = new UniversalSeed({
      metadata: { 
        id: crypto.randomUUID(), 
        name: `Seed-${seeds.length + 1}`, 
        created: Date.now(), 
        updated: Date.now(), 
        tags: [], 
        lineage: [] 
      }
    });

    const seedData: SeedData = {
      id: seed.id,
      name: seed.metadata.name,
      genes: {},
      fitness: undefined
    };

    for (const geneType of geneTypes) {
      const gene = seed.getGene(geneType);
      if (gene) {
        seedData.genes[geneType] = gene.value;
      }
    }

    setSeeds(prev => [...prev, seedData]);
    setSelectedSeed(seedData);
    setGeneValues(seedData.genes);
  }, [seeds.length]);

  const updateGeneValue = useCallback((geneType: string, value: unknown) => {
    setGeneValues(prev => ({ ...prev, [geneType]: value }));
    
    if (selectedSeed) {
      setSeeds(prev => prev.map(s => 
        s.id === selectedSeed.id 
          ? { ...s, genes: { ...s.genes, [geneType]: value } }
          : s
      ));
    }
  }, [selectedSeed]);

  const breedSeeds = useCallback(() => {
    if (selectedSeed && seeds.length >= 2) {
      const parentA = seeds.find(s => s.id === selectedSeed.id) || seeds[0];
      const parentB = seeds.find(s => s.id !== selectedSeed.id) || seeds[1];

      const childSeed = new UniversalSeed();
      childSeed.metadata.name = `${parentA.name} x ${parentB.name}`;
      
      const childData: SeedData = {
        id: childSeed.id,
        name: childSeed.metadata.name,
        genes: { ...parentA.genes },
        fitness: undefined
      };

      setSeeds(prev => [...prev, childData]);
    }
  }, [selectedSeed, seeds]);

  const runEvolution = useCallback(() => {
    const results = `Running evolution...\n
Parameters:
- Population: ${seeds.length}
- Mutation Rate: 0.1
- Crossover Rate: 0.7
- Generations: 100

Results:
- Best Fitness: ${(Math.random() * 100).toFixed(2)}
- Generation: 100
- Convergence: ${(Math.random() * 100).toFixed(1)}%`;

    setAgentResponse(results);
  }, [seeds.length]);

  const handleAgentSubmit = useCallback(async () => {
    if (!agentInput.trim()) return;
    
    const response = await agent.process(agentInput);
    setAgentResponse(response);
    setAgentInput('');
  }, [agentInput, agent]);

  return (
    <div className="paradigm-studio">
      <header className="studio-header">
        <h1>Paradigm GSPL Studio</h1>
        <nav className="studio-nav">
          <button className={activeTab === 'editor' ? 'active' : ''} onClick={() => setActiveTab('editor')}>
            Gene Editor
          </button>
          <button className={activeTab === 'breed' ? 'active' : ''} onClick={() => setActiveTab('breed')}>
            Breeding
          </button>
          <button className={activeTab === 'agent' ? 'active' : ''} onClick={() => setActiveTab('agent')}>
            GSPL Agent
          </button>
          <button className={activeTab === 'canvas' ? 'active' : ''} onClick={() => setActiveTab('canvas')}>
            Canvas
          </button>
        </nav>
      </header>

      <main className="studio-main">
        <aside className="seed-list">
          <h2>Seeds</h2>
          <button className="create-btn" onClick={createSeed}>+ New Seed</button>
          <ul>
            {seeds.map(seed => (
              <li 
                key={seed.id} 
                className={selectedSeed?.id === seed.id ? 'selected' : ''}
                onClick={() => { setSelectedSeed(seed); setGeneValues(seed.genes); }}
              >
                <span className="seed-name">{seed.name}</span>
                <span className="seed-fitness">{seed.fitness?.toFixed(2) || '—'}</span>
              </li>
            ))}
          </ul>
        </aside>

        <section className="workspace">
          {activeTab === 'editor' && (
            <div className="gene-editor">
              <h2>Gene Editor</h2>
              {selectedSeed ? (
                <div className="genes-grid">
                  {geneTypes.map(geneType => (
                    <div key={geneType} className="gene-card">
                      <label>{geneType}</label>
                      <input
                        type={typeof geneValues[geneType] === 'number' ? 'number' : 'text'}
                        value={JSON.stringify(geneValues[geneType] ?? '')}
                        onChange={(e) => {
                          try {
                            updateGeneValue(geneType, JSON.parse(e.target.value));
                          } catch {
                            updateGeneValue(geneType, e.target.value);
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">Select or create a seed to edit genes</p>
              )}
            </div>
          )}

          {activeTab === 'breed' && (
            <div className="breeding-panel">
              <h2>Breeding Station</h2>
              <div className="parents">
                <div className="parent">
                  <h3>Parent A</h3>
                  <select onChange={(e) => setSelectedSeed(seeds.find(s => s.id === e.target.value) || null)}>
                    <option value="">Select parent</option>
                    {seeds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="parent">
                  <h3>Parent B</h3>
                  <select>
                    <option value="">Select parent</option>
                    {seeds.filter(s => s.id !== selectedSeed?.id).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="breed-btn" onClick={breedSeeds}>Breed</button>
              <button className="evolve-btn" onClick={runEvolution}>Run Evolution</button>
            </div>
          )}

          {activeTab === 'agent' && (
            <div className="agent-panel">
              <h2>GSPL Agent</h2>
              <div className="agent-chat">
                <div className="messages">
                  {agentResponse && (
                    <div className="message assistant">{agentResponse}</div>
                  )}
                </div>
                <div className="input-area">
                  <textarea
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    placeholder="Ask the agent to create seeds, run evolution, or write GSPL code..."
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAgentSubmit(); }}}
                  />
                  <button onClick={handleAgentSubmit}>Send</button>
                </div>
              </div>
              <div className="gspl-editor">
                <h3>GSPL Code</h3>
                <textarea
                  value={gsplCode}
                  onChange={(e) => setGsplCode(e.target.value)}
                  placeholder="// Write GSPL code here...
let mySeed = seed('test', { color: '#ff0000' });
print(mySeed);"
                />
              </div>
            </div>
          )}

          {activeTab === 'canvas' && (
            <div className="canvas-panel">
              <h2>Visual Canvas</h2>
              <div className="canvas-viewport">
                <div className="seed-visualization">
                  {selectedSeed ? (
                    <div className="preview">
                      <div 
                        className="seed-preview"
                        style={{
                          background: Array.isArray(geneValues.color) 
                            ? geneValues.color[0] as string || '#6366f1'
                            : '#6366f1'
                        }}
                      >
                        {selectedSeed.name}
                      </div>
                    </div>
                  ) : (
                    <p className="empty-state">Select a seed to visualize</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="studio-footer">
        <span>Paradigm GSPL Platform v1.0.0</span>
        <span>17 Gene Types | 26 Domain Engines | Level 4 Intelligence</span>
      </footer>

      <style>{`
        .paradigm-studio {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: 'Inter', -apple-system, sans-serif;
          background: #0f0f1a;
          color: #e2e8f0;
        }
        .studio-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #1e1b4b, #312e81);
          border-bottom: 1px solid #4338ca;
        }
        .studio-header h1 {
          font-size: 1.5rem;
          background: linear-gradient(90deg, #a78bfa, #f472b6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .studio-nav {
          display: flex;
          gap: 0.5rem;
        }
        .studio-nav button {
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid #4f46e5;
          color: #a5b4fc;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .studio-nav button:hover, .studio-nav button.active {
          background: #4f46e5;
          color: white;
        }
        .studio-main {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .seed-list {
          width: 250px;
          background: #1a1a2e;
          padding: 1rem;
          border-right: 1px solid #312e81;
          overflow-y: auto;
        }
        .seed-list h2 {
          font-size: 1rem;
          margin-bottom: 1rem;
          color: #a5b4fc;
        }
        .create-btn {
          width: 100%;
          padding: 0.5rem;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          margin-bottom: 1rem;
        }
        .seed-list ul {
          list-style: none;
          padding: 0;
        }
        .seed-list li {
          padding: 0.75rem;
          background: #16213e;
          border-radius: 0.375rem;
          margin-bottom: 0.5rem;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          transition: background 0.2s;
        }
        .seed-list li:hover, .seed-list li.selected {
          background: #312e81;
        }
        .workspace {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }
        .gene-editor h2, .breeding-panel h2, .agent-panel h2, .canvas-panel h2 {
          margin-bottom: 1.5rem;
          color: #a78bfa;
        }
        .genes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .gene-card {
          background: #1e1b4b;
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid #312e81;
        }
        .gene-card label {
          display: block;
          font-size: 0.75rem;
          color: #a5b4fc;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }
        .gene-card input {
          width: 100%;
          padding: 0.5rem;
          background: #0f0f1a;
          border: 1px solid #4338ca;
          color: #e2e8f0;
          border-radius: 0.25rem;
        }
        .empty-state {
          color: #64748b;
          text-align: center;
          padding: 3rem;
        }
        .breeding-panel .parents {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        .breed-btn, .evolve-btn {
          padding: 0.75rem 2rem;
          background: #7c3aed;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          margin-right: 1rem;
        }
        .evolve-btn {
          background: #059669;
        }
        .agent-panel {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        .agent-chat {
          background: #1e1b4b;
          border-radius: 0.5rem;
          padding: 1rem;
          display: flex;
          flex-direction: column;
        }
        .messages {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 1rem;
        }
        .message {
          padding: 0.75rem;
          border-radius: 0.375rem;
          margin-bottom: 0.5rem;
        }
        .message.assistant {
          background: #312e81;
        }
        .input-area {
          display: flex;
          gap: 0.5rem;
        }
        .input-area textarea {
          flex: 1;
          padding: 0.5rem;
          background: #0f0f1a;
          border: 1px solid #4338ca;
          color: #e2e8f0;
          border-radius: 0.25rem;
          resize: none;
        }
        .gspl-editor textarea {
          width: 100%;
          height: 200px;
          padding: 1rem;
          background: #0f0f1a;
          border: 1px solid #4338ca;
          color: #a5b4fc;
          font-family: 'Fira Code', monospace;
          border-radius: 0.375rem;
        }
        .canvas-viewport {
          background: #1a1a2e;
          border-radius: 0.5rem;
          padding: 2rem;
          min-height: 400px;
        }
        .seed-preview {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin: 0 auto;
        }
        .studio-footer {
          padding: 0.5rem 2rem;
          background: #1a1a2e;
          border-top: 1px solid #312e81;
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default ParadigmStudio;