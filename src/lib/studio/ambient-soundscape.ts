/**
 * Ambient Soundscape and Harmonic Feedback System
 * 
 * This system provides ambient soundscapes and harmonic feedback loops
 * tied to creation events in Paradigm Infinite Studio.
 * 
 * Features:
 * - Generative ambient soundscapes from GSPL seeds
 * - Harmonic feedback on user actions
 * - Deterministic audio generation
 * - Web Audio API integration
 * - Spatial audio positioning
 */

import { type Seed } from '@/lib/kernel/types';
import { rngFromHash } from '@/lib/kernel/rng';

interface SoundLayer {
  frequency: number;
  amplitude: number;
  phase: number;
  duration: number;
  type: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

interface HarmonicFeedback {
  trigger: 'create' | 'mutate' | 'breed' | 'evolve' | 'select';
  baseFrequency: number;
  harmonics: number[];
  duration: number;
  volume: number;
}

export class AmbientSoundscape {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private layers: SoundLayer[] = [];
  private activeOscillators: Map<string, OscillatorNode> = new Map();
  private activeGains: Map<string, GainNode> = new Map();
  private rng: (() => number) | null = null;
  private isPlaying: boolean = false;
  private masterVolume: number = 0.3;
  
  /**
   * Initialize audio context
   */
  async initialize(): Promise<boolean> {
    if (!window.AudioContext) {
      console.warn('Web Audio API not supported');
      return false;
    }
    
    try {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);
      
      return true;
    } catch (error) {
      console.error('Audio context initialization failed:', error);
      return false;
    }
  }
  
  /**
   * Initialize soundscape from seed
   */
  initializeFromSeed(seed: Seed): void {
    const hash = seed.$hash || seed.id || 'default';
    this.rng = rngFromHash(hash).nextF64;
    
    // Generate sound layers from seed
    this.layers = this.generateSoundLayers();
  }
  
  /**
   * Generate sound layers from seed
   */
  private generateSoundLayers(): SoundLayer[] {
    const layers: SoundLayer[] = [];
    const rng = this.rng || Math.random;
    
    // Base drone layer
    layers.push({
      frequency: 110 + rng() * 55, // A2-A3 range
      amplitude: 0.1 + rng() * 0.1,
      phase: rng() * Math.PI * 2,
      duration: 10,
      type: 'sine',
    });
    
    // Harmonic layer
    layers.push({
      frequency: 220 + rng() * 110, // A3-A4 range
      amplitude: 0.05 + rng() * 0.05,
      phase: rng() * Math.PI * 2,
      duration: 8,
      type: 'triangle',
    });
    
    // Texture layer
    layers.push({
      frequency: 440 + rng() * 220, // A4-A5 range
      amplitude: 0.02 + rng() * 0.03,
      phase: rng() * Math.PI * 2,
      duration: 6,
      type: 'sine',
    });
    
    // Sparkle layer
    layers.push({
      frequency: 880 + rng() * 440, // A5-A6 range
      amplitude: 0.01 + rng() * 0.02,
      phase: rng() * Math.PI * 2,
      duration: 4,
      type: 'sine',
    });
    
    return layers;
  }
  
  /**
   * Start ambient soundscape
   */
  start(): void {
    if (!this.audioContext || !this.masterGain || this.isPlaying) return;
    
    this.isPlaying = true;
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    // Start each layer
    this.layers.forEach((layer, index) => {
      this.startLayer(layer, index);
    });
  }
  
  /**
   * Start a single sound layer
   */
  private startLayer(layer: SoundLayer, index: number): void {
    if (!this.audioContext || !this.masterGain) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = layer.type;
    oscillator.frequency.value = layer.frequency;
    
    gainNode.gain.value = layer.amplitude;
    
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    oscillator.start();
    
    // Store references
    this.activeOscillators.set(`layer-${index}`, oscillator);
    this.activeGains.set(`layer-${index}`, gainNode);
    
    // Add subtle modulation
    this.modulateLayer(layer, index, gainNode);
  }
  
  /**
   * Modulate a layer with subtle changes
   */
  private modulateLayer(layer: SoundLayer, index: number, gainNode: GainNode): void {
    if (!this.audioContext) return;
    
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    // Use deterministic RNG for modulation frequency
    const rng = this.rng || (() => 0.5); // Fallback to constant if no RNG
    lfo.frequency.value = 0.1 + rng() * 0.2; // Slow modulation
    lfoGain.gain.value = layer.amplitude * 0.3;
    
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain);
    
    lfo.start();
    
    // Store LFO references
    this.activeOscillators.set(`lfo-${index}`, lfo);
    this.activeGains.set(`lfo-${index}`, lfoGain);
  }
  
  /**
   * Stop ambient soundscape
   */
  stop(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    
    // Stop all oscillators
    this.activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // Oscillator may already be stopped
      }
    });
    
    this.activeOscillators.clear();
    this.activeGains.clear();
  }
  
  /**
   * Play harmonic feedback for an action
   */
  playFeedback(feedback: HarmonicFeedback): void {
    if (!this.audioContext || !this.masterGain) return;
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    const now = this.audioContext.currentTime;
    
    // Play base tone
    const baseOscillator = this.audioContext.createOscillator();
    const baseGain = this.audioContext.createGain();
    
    baseOscillator.type = 'sine';
    baseOscillator.frequency.value = feedback.baseFrequency;
    
    baseGain.gain.setValueAtTime(0, now);
    baseGain.gain.linearRampToValueAtTime(feedback.volume, now + 0.05);
    baseGain.gain.exponentialRampToValueAtTime(0.001, now + feedback.duration);
    
    baseOscillator.connect(baseGain);
    if (this.masterGain) {
      baseGain.connect(this.masterGain);
    }
    
    baseOscillator.start(now);
    baseOscillator.stop(now + feedback.duration);
    
    // Play harmonics
    feedback.harmonics.forEach((harmonic, index) => {
      const harmonicOscillator = this.audioContext!.createOscillator();
      const harmonicGain = this.audioContext!.createGain();
      
      harmonicOscillator.type = 'sine';
      harmonicOscillator.frequency.value = feedback.baseFrequency * harmonic;
      
      const harmonicVolume = feedback.volume / (index + 2);
      harmonicGain.gain.setValueAtTime(0, now);
      harmonicGain.gain.linearRampToValueAtTime(harmonicVolume, now + 0.05);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + feedback.duration);
      
      harmonicOscillator.connect(harmonicGain);
      if (this.masterGain) {
        harmonicGain.connect(this.masterGain);
      }
      
      harmonicOscillator.start(now);
      harmonicOscillator.stop(now + feedback.duration);
    });
  }
  
  /**
   * Generate harmonic feedback for a trigger
   */
  generateFeedback(trigger: 'create' | 'mutate' | 'breed' | 'evolve' | 'select'): HarmonicFeedback {
    const rng = this.rng || Math.random;
    
    const baseFrequencies = {
      create: 261.63, // C4
      mutate: 293.66, // D4
      breed: 329.63, // E4
      evolve: 392.00, // G4
      select: 440.00, // A4
    };
    
    const harmonics = [1, 2, 3, 5, 8].slice(0, 2 + Math.floor(rng() * 3));
    
    return {
      trigger,
      baseFrequency: baseFrequencies[trigger],
      harmonics,
      duration: 0.5 + rng() * 0.5,
      volume: 0.1 + rng() * 0.2,
    };
  }
  
  /**
   * Trigger feedback for an action
   */
  triggerFeedback(trigger: 'create' | 'mutate' | 'breed' | 'evolve' | 'select'): void {
    const feedback = this.generateFeedback(trigger);
    this.playFeedback(feedback);
  }
  
  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }
  
  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }
  
  /**
   * Check if audio is playing
   */
  isAudioPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Get audio context state
   */
  getAudioState(): 'running' | 'suspended' | 'closed' | 'interrupted' | 'unavailable' {
    if (!this.audioContext) return 'unavailable';
    return this.audioContext.state;
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.masterGain = null;
    this.layers = [];
    this.rng = null;
  }
}

/**
 * Create an ambient soundscape instance
 */
export function createAmbientSoundscape(): AmbientSoundscape {
  return new AmbientSoundscape();
}
