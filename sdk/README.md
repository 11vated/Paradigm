# @paradigm/sdk

The official TypeScript/JavaScript SDK for the Paradigm Universal Digital Creation Substrate.

## Install

```bash
npm install @paradigm/sdk
# or
bun add @paradigm/sdk
```

## Quick Start

```typescript
import { Paradigm } from '@paradigm/sdk';

const p = new Paradigm({ apiUrl: 'https://your-paradigm.com', apiKey: 'YOUR_KEY' });

// Create and grow a website seed
const seed   = await p.seeds.create({ domain: 'website', genes: { aesthetic: 'minimal' } });
const grown  = await p.seeds.grow(seed.id);
console.log(grown.outputs[0].url); // → https://your-paradigm.com/api/artifacts/...

// Create and grow a quantum wavefunction visualization
const qSeed  = await p.seeds.create({ domain: 'quantum', genes: { potentialType: 'double_well' } });
const qGrown = await p.seeds.grow(qSeed.id);

// Create a world map
const world  = await p.seeds.create({ domain: 'world', genes: { worldType: 'continental' } });
const wGrown = await p.seeds.grow(world.id);

// Evolve with MAP-Elites
const archive = await p.evolve.getArchive('visual2d', { gridX: 16, gridY: 16 });
const stepped = await p.evolve.stepArchive('visual2d', seed.id, 20);

// GSPL programming
const result  = await p.gspl.execute(`
  seed MyArt { gene style: categorical in ["minimal", "brutalist"] }
  grow MyArt from { style: "brutalist" }
`);

// Sovereignty
const receipt = await p.sovereignty.receipt(seed.id);
const signed  = await p.sovereignty.sign(seed.id);

// VCS
const commit = await p.vcs.commit(seed.id, 'initial composition');
const log    = await p.vcs.log(seed.id);
```

## API Reference

### `p.seeds`
| Method | Description |
|---|---|
| `list(params?)` | List seeds with optional domain/page filter |
| `get(id)` | Get a seed by ID |
| `create(params)` | Create a new seed |
| `grow(id)` | Run the domain generator — deterministic, cached |
| `growDirect(seed)` | Grow from a seed object without a stored ID |
| `mutate(id)` | Mutate a seed |
| `breed(idA, idB)` | Breed two seeds |
| `delete(id)` | Delete a seed |
| `exportJson(id)` | Export seed as JSON |

### `p.evolve`
| Method | Description |
|---|---|
| `start(params)` | Start an evolution job |
| `status(jobId)` | Get job status |
| `getArchive(domain)` | Get MAP-Elites archive |
| `stepArchive(domain, seedId, steps)` | Run N MAP-Elites evolution steps |

### `p.vcs`
| Method | Description |
|---|---|
| `commit(seedId, message)` | Commit seed state |
| `log(seedId)` | Get commit history |
| `diff(commitA, commitB)` | Diff two commits |
| `checkout(hash)` | Checkout a specific commit |

### `p.sovereignty`
| Method | Description |
|---|---|
| `sign(seedId)` | Sign with device key |
| `receipt(seedId)` | Get sovereignty receipt |
| `exportGseed(seedId)` | Export as .gseed binary |

### `p.gspl`
| Method | Description |
|---|---|
| `parse(source)` | Parse GSPL → AST |
| `execute(source)` | Execute GSPL program |
| `openRepl()` | Open interactive REPL |
| `repl(sessionId, line)` | Evaluate REPL line |
