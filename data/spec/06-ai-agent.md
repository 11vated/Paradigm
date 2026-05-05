# 06 — AI Agent Elevation

*Status: IN PROGRESS*

---

## Overview

Phase 5 transforms Paradigm into an **AI-native generative platform**. We create a custom **Seed LLM** — a language model fine-tuned on seed phrases and generative patterns — and build AI agent tools that enable natural language interaction with the generative system. This makes Paradigm accessible to non-programmers while maintaining seed determinism.

---

## 5.1 Seed LLM Architecture

### Model Specification
- **Base Model**: GPT-4o / Claude 3.5 / Llama 3.1 (API-compatible)
- **Fine-tuning Dataset**: 100K+ seed phrases + GSPL programs + generated outputs
- **Context Window**: 128K tokens (full GSPL programs + assets)
- **Output Format**: Structured seed objects + GSPL code

### Seed LLM Interface
```typescript
interface SeedLLM {
  // Generate seed from prompt
  generateSeed(prompt: string): Promise<Seed>;

  // Generate GSPL program from description
  generateGSPL(description: string, seed: Seed): Promise<string>;

  // Refine existing seed
  refineSeed(seed: Seed, feedback: string): Promise<Seed>;

  // Evaluate generative quality
  evaluateOutput(output: GeneratorOutput, criteria: string): Promise<number>;

  // Batch generate variations
  generateVariations(seed: Seed, count: number): Promise<Seed[]>;
}
```

### Prompt Templates
```
System: You are Seed LLM, an AI specialized in generative design.
You create deterministic seeds and GSPL programs for the Paradigm platform.

User: Create a character seed for a "cyberpunk warrior"
Output: {
  "phrase": "cyberpunk warrior neon cybernetic",
  "domain": "character",
  "params": {
    "style": "cyberpunk",
    "archetype": "warrior",
    "palette": "neon"
  }
}
```

---

## 5.2 AI Agent Tools

### Tool Definitions
```typescript
interface AIAgentTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(params: unknown): Promise<unknown>;
}

const SEED_TOOLS: AIAgentTool[] = [
  {
    name: 'generate_seed',
    description: 'Generate a new seed from a text prompt',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        domain: { type: 'string', enum: ['character', 'music', 'sprite'] },
      },
      required: ['prompt'],
    },
    execute: async (params) => {
      const seed = await seedLLM.generateSeed(params.prompt);
      return seed;
    },
  },
  {
    name: 'grow_artifact',
    description: 'Grow a generative artifact from a seed',
    parameters: {
      type: 'object',
      properties: {
        seed_hash: { type: 'string' },
        format: { type: 'string', enum: ['obj', 'wav', 'png'] },
      },
      required: ['seed_hash'],
    },
    execute: async (params) => {
      const seed = await loadSeed(params.seed_hash);
      return await growSeed(seed);
    },
  },
  {
    name: 'write_gspl',
    description: 'Write a GSPL program for generative design',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        seed_phrase: { type: 'string' },
      },
      required: ['description'],
    },
    execute: async (params) => {
      const seed = rngFromHash(params.seed_phrase || params.description);
      return await seedLLM.generateGSPL(params.description, seed);
    },
  },
  {
    name: 'export_gseed',
    description: 'Export artifact as .gseed with provenance',
    parameters: {
      type: 'object',
      properties: {
        seed_hash: { type: 'string' },
        author: { type: 'string' },
      },
      required: ['seed_hash'],
    },
    execute: async (params) => {
      // Creates .gseed with C2PA + royalty
      return await exportAsGseed(params.seed_hash, params.author);
    },
  },
];
```

---

## 5.3 Generative Design Workflows

### Workflow 1: Natural Language → Artifact
```
User: "Create a cyberpunk warrior character"
  ↓
Seed LLM: generates seed + GSPL program
  ↓
Interpreter: executes GSPL → GeneratorOutput
  ↓
Preview: renders 3D character
  ↓
Export: .gseed with C2PA manifest
```

### Workflow 2: Iterative Refinement
```
User: "Make the character more muscular"
  ↓
Seed LLM: refines seed (mutates params)
  ↓
Regenerate: new output with same seed hash lineage
  ↓
Compare: side-by-side preview
  ↓
Approve: commit to lineage
```

### Workflow 3: Batch Generation
```
User: "Generate 10 variations of this sprite"
  ↓
Seed LLM: creates 10 seed variations
  ↓
Batch grow: parallel generation
  ↓
Gallery: displays all 10 outputs
  ↓
Select: pick best, export as .gseed
```

---

## 5.4 Implementation Files

| File                          | Description                          |
|-------------------------------|--------------------------------------|
| `seed-llm.ts`                 | Seed LLM interface + API client      |
| `ai-agent.ts`                 | AI agent with tool-calling           |
| `generative-design.ts`        | Workflow orchestration               |
| `prompt-templates.ts`         | Prompt engineering for seeds         |

---

## 5.5 Integration with Paradigm Studio

### Chat Interface
```jsx
<SeedChat>
  <Message role="user">Create a character</Message>
  <Message role="assistant">
    <SeedPreview seed={seed} />
    <GSPLCode code={gsplProgram} />
    <Actions>
      <Button>Regenerate</Button>
      <Button>Export .gseed</Button>
    </Actions>
  </Message>
</SeedChat>
```

### Seed Lineage Visualization
```
Seed A (cyberpunk warrior)
  ├─ Seed B (more muscular) ← user refinement
  │   ├─ Seed C (bulkier arms)
  │   └─ Seed D (wider shoulders)
  └─ Seed E (femenine variant)
```

---

## Acceptance Criteria

- [ ] Seed LLM interface defined with all methods
- [ ] AI agent tools implemented (generate, grow, write GSPL, export)
- [ ] Prompt templates created for seed generation
- [ ] Generative design workflows operational
- [ ] Integration with Paradigm Studio UI
- [ ] Build passes with all new files

---

*Phase 5 makes Paradigm an AI-native platform where anyone can create generative art through conversation.*
