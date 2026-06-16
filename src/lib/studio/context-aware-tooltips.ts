/**
 * Context-Aware Tooltips and AI-Guided Creation Flow
 * 
 * This system provides intelligent tooltips and guided creation flows
 * that adapt to user context and provide AI-powered assistance.
 * 
 * Features:
 * - Context-aware tooltip positioning and content
 * - AI-guided creation suggestions
 * - Progressive disclosure of information
 * - Deterministic suggestion generation
 */

import { type Seed } from '@/lib/kernel/types';
import { rngFromHash } from '@/lib/kernel/rng';

export interface TooltipContext {
  element: string;
  action: string;
  seed?: Seed;
  position: { x: number; y: number };
  timestamp: number;
}

export interface CreationSuggestion {
  type: 'mutation' | 'breeding' | 'evolution' | 'exploration' | 'creation';
  title: string;
  description: string;
  confidence: number;
  seed?: Seed;
  action: () => void;
}

export class ContextAwareTooltips {
  private tooltipCallbacks: Map<string, (context: TooltipContext) => void> = new Map();
  private suggestionCallbacks: Map<string, (suggestions: CreationSuggestion[]) => void> = new Map();
  private contextHistory: TooltipContext[] = [];
  private maxHistorySize = 100;
  private rng: (() => number) | null = null;
  
  /**
   * Initialize with seed for deterministic suggestions
   */
  initialize(seed?: Seed): void {
    if (seed) {
      const hash = seed.$hash || seed.id || 'default';
      this.rng = rngFromHash(hash).nextF64;
    } else {
      this.rng = Math.random;
    }
  }
  
  /**
   * Register tooltip callback
   */
  onTooltip(callback: (context: TooltipContext) => void): () => void {
    const id = `tooltip-${Date.now()}-${Math.random()}`;
    this.tooltipCallbacks.set(id, callback);
    
    return () => {
      this.tooltipCallbacks.delete(id);
    };
  }
  
  /**
   * Register suggestion callback
   */
  onSuggestion(callback: (suggestions: CreationSuggestion[]) => void): () => void {
    const id = `suggestion-${Date.now()}-${Math.random()}`;
    this.suggestionCallbacks.set(id, callback);
    
    return () => {
      this.suggestionCallbacks.delete(id);
    };
  }
  
  /**
   * Trigger tooltip with context
   */
  triggerTooltip(context: TooltipContext): void {
    // Add to history
    this.contextHistory.push(context);
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory.shift();
    }
    
    // Trigger callbacks
    this.tooltipCallbacks.forEach((callback) => {
      callback(context);
    });
  }
  
  /**
   * Generate context-aware tooltip content
   */
  generateTooltipContent(context: TooltipContext): { title: string; content: string; actions: string[] } {
    const rng = this.rng || Math.random;
    
    const baseContent = {
      title: '',
      content: '',
      actions: [] as string[],
    };
    
    switch (context.element) {
      case 'seed':
        baseContent.title = context.seed?.$name || 'Artifact';
        baseContent.content = this.generateSeedTooltip(context.seed);
        baseContent.actions = ['Mutate', 'Breed', 'Evolve', 'Export'];
        break;
      
      case 'canvas':
        baseContent.title = 'Reality Canvas';
        baseContent.content = 'Infinite workspace for artifact generation. Drag to pan, scroll to zoom.';
        baseContent.actions = ['Create Artifact', 'Clear Canvas', 'Reset View'];
        break;
      
      case 'forge':
        baseContent.title = 'Seed Forge';
        baseContent.content = 'Visual seed editor with live preview and gene mutation controls.';
        baseContent.actions = ['Apply Mutation', 'Reset Genes', 'Preview'];
        break;
      
      case 'spectral':
        baseContent.title = 'Spectral Studio';
        baseContent.content = 'EM-spectrum renderer for unseen dimensions and material analysis.';
        baseContent.actions = ['Analyze Spectrum', 'Export Data', 'Compare'];
        break;
      
      case 'nexus':
        baseContent.title = 'Nexus Bridge';
        baseContent.content = 'Seamless transition between digital creation and simulation layers.';
        baseContent.actions = ['Transfer Layer', 'Sync State', 'View History'];
        break;
      
      default:
        baseContent.title = 'Unknown Element';
        baseContent.content = 'No context information available.';
        baseContent.actions = [];
    }
    
    return baseContent;
  }
  
  /**
   * Generate seed-specific tooltip content
   */
  private generateSeedTooltip(seed?: Seed): string {
    if (!seed) return 'No seed selected.';
    
    const parts: string[] = [];
    
    if (seed.$domain) {
      parts.push(`Domain: ${seed.$domain}`);
    }
    
    if (seed.$lineage?.generation !== undefined) {
      parts.push(`Generation: ${seed.$lineage.generation}`);
    }
    
    if (seed.$fitness?.overall !== undefined) {
      parts.push(`Fitness: ${(seed.$fitness.overall * 100).toFixed(1)}%`);
    }
    
    if (seed.$lineage?.parents && seed.$lineage.parents.length > 0) {
      parts.push(`Parents: ${seed.$lineage.parents.length}`);
    }
    
    return parts.join(' | ') || 'Basic artifact with no metadata.';
  }
  
  /**
   * Generate AI-guided creation suggestions
   */
  generateSuggestions(context: TooltipContext): CreationSuggestion[] {
    const rng = this.rng || Math.random;
    const suggestions: CreationSuggestion[] = [];
    
    // Analyze context history for patterns
    const recentContexts = this.contextHistory.slice(-10);
    const elementFrequency = this.analyzeElementFrequency(recentContexts);
    
    // Generate suggestions based on context
    if (context.element === 'seed' && context.seed) {
      suggestions.push({
        type: 'mutation',
        title: 'Optimize Mutation',
        description: 'Apply targeted mutations to improve fitness',
        confidence: 0.8 + rng() * 0.1,
        seed: context.seed,
        action: () => {},
      });
      
      suggestions.push({
        type: 'breeding',
        title: 'Find Compatible Seeds',
        description: 'Discover seeds with high breeding potential',
        confidence: 0.7 + rng() * 0.15,
        seed: context.seed,
        action: () => {},
      });
    }
    
    if (context.element === 'canvas') {
      suggestions.push({
        type: 'exploration',
        title: 'Explore New Territory',
        description: 'Navigate to unexplored regions of the canvas',
        confidence: 0.6 + rng() * 0.2,
        action: () => {},
      });
      
      suggestions.push({
        type: 'creation',
        title: 'Create Cluster',
        description: 'Generate a cluster of related artifacts',
        confidence: 0.5 + rng() * 0.3,
        action: () => {},
      });
    }
    
    // Sort by confidence
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    // Return top 3 suggestions
    return suggestions.slice(0, 3);
  }
  
  /**
   * Analyze element frequency in context history
   */
  private analyzeElementFrequency(contexts: TooltipContext[]): Map<string, number> {
    const frequency = new Map<string, number>();
    
    contexts.forEach((context) => {
      const count = frequency.get(context.element) || 0;
      frequency.set(context.element, count + 1);
    });
    
    return frequency;
  }
  
  /**
   * Get context history
   */
  getContextHistory(): TooltipContext[] {
    return [...this.contextHistory];
  }
  
  /**
   * Clear context history
   */
  clearHistory(): void {
    this.contextHistory = [];
  }
  
  /**
   * Get most frequent element
   */
  getMostFrequentElement(): string | null {
    if (this.contextHistory.length === 0) return null;
    
    const frequency = this.analyzeElementFrequency(this.contextHistory);
    let maxCount = 0;
    let mostFrequent: string | null = null;
    
    frequency.forEach((count, element) => {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = element;
      }
    });
    
    return mostFrequent;
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.tooltipCallbacks.clear();
    this.suggestionCallbacks.clear();
    this.contextHistory = [];
    this.rng = null;
  }
}

/**
 * Create a context-aware tooltips instance
 */
export function createContextAwareTooltips(): ContextAwareTooltips {
  return new ContextAwareTooltips();
}

/**
 * AI-guided creation flow manager
 */
export class AIGuidedCreationFlow {
  private currentStep: number = 0;
  private steps: CreationStep[] = [];
  private isRunning: boolean = false;
  private progressCallbacks: Map<string, (step: number, total: number) => void> = new Map();
  private completionCallbacks: Map<string, () => void> = new Map();
  
  constructor() {
    this.initializeDefaultFlow();
  }
  
  /**
   * Initialize default creation flow
   */
  private initializeDefaultFlow(): void {
    this.steps = [
      {
        id: 'select-domain',
        title: 'Select Domain',
        description: 'Choose the domain for your artifact',
        action: async () => {},
      },
      {
        id: 'configure-genes',
        title: 'Configure Genes',
        description: 'Set initial gene values',
        action: async () => {},
      },
      {
        id: 'generate-seed',
        title: 'Generate Seed',
        description: 'Create the initial seed',
        action: async () => {},
      },
      {
        id: 'mutate-optimize',
        title: 'Mutate & Optimize',
        description: 'Apply mutations to improve fitness',
        action: async () => {},
      },
      {
        id: 'breed-expand',
        title: 'Breed & Expand',
        description: 'Create variations through breeding',
        action: async () => {},
      },
      {
        id: 'export-artifact',
        title: 'Export Artifact',
        description: 'Export the final artifact',
        action: async () => {},
      },
    ];
  }
  
  /**
   * Start guided creation flow
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.currentStep = 0;
    
    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i;
      this.notifyProgress(i, this.steps.length);
      
      await this.steps[i].action();
      
      if (!this.isRunning) break;
    }
    
    if (this.isRunning) {
      this.notifyCompletion();
    }
    
    this.isRunning = false;
  }
  
  /**
   * Stop guided creation flow
   */
  stop(): void {
    this.isRunning = false;
  }
  
  /**
   * Go to specific step
   */
  async goToStep(stepIndex: number): Promise<void> {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return;
    
    this.currentStep = stepIndex;
    await this.steps[stepIndex].action();
    this.notifyProgress(stepIndex, this.steps.length);
  }
  
  /**
   * Get current step
   */
  getCurrentStep(): CreationStep | null {
    if (this.currentStep < 0 || this.currentStep >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentStep];
  }
  
  /**
   * Get all steps
   */
  getSteps(): CreationStep[] {
    return [...this.steps];
  }
  
  /**
   * Register progress callback
   */
  onProgress(callback: (step: number, total: number) => void): () => void {
    const id = `progress-${Date.now()}-${Math.random()}`;
    this.progressCallbacks.set(id, callback);
    
    return () => {
      this.progressCallbacks.delete(id);
    };
  }
  
  /**
   * Register completion callback
   */
  onCompletion(callback: () => void): () => void {
    const id = `completion-${Date.now()}-${Math.random()}`;
    this.completionCallbacks.set(id, callback);
    
    return () => {
      this.completionCallbacks.delete(id);
    };
  }
  
  /**
   * Notify progress
   */
  private notifyProgress(step: number, total: number): void {
    this.progressCallbacks.forEach((callback) => {
      callback(step, total);
    });
  }
  
  /**
   * Notify completion
   */
  private notifyCompletion(): void {
    this.completionCallbacks.forEach((callback) => {
      callback();
    });
  }
  
  /**
   * Check if flow is running
   */
  isFlowRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.progressCallbacks.clear();
    this.completionCallbacks.clear();
  }
}

interface CreationStep {
  id: string;
  title: string;
  description: string;
  action: () => Promise<void>;
}

/**
 * Create an AI-guided creation flow instance
 */
export function createAIGuidedCreationFlow(): AIGuidedCreationFlow {
  return new AIGuidedCreationFlow();
}
