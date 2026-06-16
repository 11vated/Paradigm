/**
 * Gesture and Voice Control Integration
 * 
 * This system provides gesture and voice control capabilities for
 * the Paradigm Infinite Studio, enabling intuitive interaction
 * through natural inputs.
 * 
 * Features:
 * - Gesture recognition using MediaPipe
 * - Voice commands using Web Speech API
 * - Action mapping for gestures and voice
 * - Deterministic command processing
 */

// Type declarations for Web Speech API
type SpeechRecognitionConstructor = {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export interface GestureAction {
  type: 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'pinch' | 'zoom' | 'rotate' | 'tap' | 'hold';
  confidence: number;
  timestamp: number;
}

export interface VoiceCommand {
  command: string;
  confidence: number;
  timestamp: number;
}

export interface ControlAction {
  type: 'gesture' | 'voice';
  action: GestureAction | VoiceCommand;
  handler: () => void;
}

export class GestureVoiceControl {
  private gestureCallbacks: Map<string, (action: GestureAction) => void> = new Map();
  private voiceCallbacks: Map<string, (command: VoiceCommand) => void> = new Map();
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private isEnabled: boolean = false;
  
  /**
   * Initialize gesture and voice control
   */
  async initialize(): Promise<boolean> {
    // Check for Web Speech API support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Web Speech API not supported');
      return false;
    }
    
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      if (!this.recognition) return false;
      
      this.recognition.continuous = true;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const transcript = result[0].transcript.toLowerCase().trim();
            const confidence = result[0].confidence;
            
            this.handleVoiceCommand({
              command: transcript,
              confidence,
              timestamp: Date.now(),
            });
          }
        }
      };
      
      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          console.warn('Microphone permission denied');
        }
      };
      
      this.recognition.onend = () => {
        if (this.isListening && this.isEnabled) {
          // Restart if still supposed to be listening
          try {
            this.recognition?.start();
          } catch {
            // Recognition may have been stopped intentionally
          }
        }
      };
      
      this.isEnabled = true;
      return true;
    } catch (error) {
      console.error('Speech recognition initialization failed:', error);
      return false;
    }
  }
  
  /**
   * Start voice recognition
   */
  startVoiceRecognition(): void {
    if (!this.recognition || !this.isEnabled) return;
    
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
    }
  }
  
  /**
   * Stop voice recognition
   */
  stopVoiceRecognition(): void {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  }
  
  /**
   * Handle voice command
   */
  private handleVoiceCommand(command: VoiceCommand): void {
    // Trigger registered callbacks
    this.voiceCallbacks.forEach((callback) => {
      callback(command);
    });
  }
  
  /**
   * Register voice callback
   */
  onVoiceCommand(callback: (command: VoiceCommand) => void): () => void {
    const id = `voice-${Date.now()}-${Math.random()}`;
    this.voiceCallbacks.set(id, callback);
    
    return () => {
      this.voiceCallbacks.delete(id);
    };
  }
  
  /**
   * Register gesture callback
   */
  onGesture(callback: (action: GestureAction) => void): () => void {
    const id = `gesture-${Date.now()}-${Math.random()}`;
    this.gestureCallbacks.set(id, callback);
    
    return () => {
      this.gestureCallbacks.delete(id);
    };
  }
  
  /**
   * Simulate gesture action (for testing or programmatic triggers)
   */
  simulateGesture(action: GestureAction): void {
    this.gestureCallbacks.forEach((callback) => {
      callback(action);
    });
  }
  
  /**
   * Parse voice command into structured action
   */
  parseVoiceCommand(command: string): { action: string; params: string[] } | null {
    const parts = command.split(' ');
    const action = parts[0];
    const params = parts.slice(1);
    
    const validActions = ['create', 'mutate', 'breed', 'evolve', 'select', 'delete', 'save', 'load', 'export', 'import'];
    
    if (validActions.includes(action)) {
      return { action, params };
    }
    
    return null;
  }
  
  /**
   * Check if voice recognition is active
   */
  isVoiceActive(): boolean {
    return this.isListening;
  }
  
  /**
   * Check if control system is enabled
   */
  isControlEnabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Enable/disable control system
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled && this.isListening) {
      this.stopVoiceRecognition();
    }
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.stopVoiceRecognition();
    this.gestureCallbacks.clear();
    this.voiceCallbacks.clear();
    this.recognition = null;
    this.isEnabled = false;
  }
}

/**
 * Create a gesture and voice control instance
 */
export function createGestureVoiceControl(): GestureVoiceControl {
  return new GestureVoiceControl();
}

/**
 * Gesture recognizer helper for touch/mouse gestures
 */
export class GestureRecognizer {
  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;
  private isDragging: boolean = false;
  private callbacks: Map<string, (action: GestureAction) => void> = new Map();
  
  /**
   * Initialize gesture recognizer on an element
   */
  initialize(element: HTMLElement): void {
    element.addEventListener('mousedown', this.handleStart.bind(this));
    element.addEventListener('mousemove', this.handleMove.bind(this));
    element.addEventListener('mouseup', this.handleEnd.bind(this));
    element.addEventListener('mouseleave', this.handleEnd.bind(this));
    
    element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    element.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }
  
  private handleStart(e: MouseEvent): void {
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTime = Date.now();
    this.isDragging = true;
  }
  
  private handleMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 50) {
      this.isDragging = false;
      this.detectGesture(dx, dy, distance);
    }
  }
  
  private handleEnd(): void {
    this.isDragging = false;
  }
  
  private handleTouchStart(e: TouchEvent): void {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
    this.startTime = Date.now();
    this.isDragging = true;
  }
  
  private handleTouchMove(e: TouchEvent): void {
    if (!this.isDragging) return;
    
    const dx = e.touches[0].clientX - this.startX;
    const dy = e.touches[0].clientY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 50) {
      this.isDragging = false;
      this.detectGesture(dx, dy, distance);
    }
  }
  
  private handleTouchEnd(): void {
    this.isDragging = false;
  }
  
  private detectGesture(dx: number, dy: number, distance: number): void {
    const angle = Math.atan2(dy, dx);
    const angleDeg = angle * (180 / Math.PI);
    
    let type: GestureAction['type'];
    
    if (Math.abs(dx) > Math.abs(dy) * 2) {
      type = dx > 0 ? 'swipe_right' : 'swipe_left';
    } else if (Math.abs(dy) > Math.abs(dx) * 2) {
      type = dy > 0 ? 'swipe_down' : 'swipe_up';
    } else {
      return; // Not a clear gesture
    }
    
    const action: GestureAction = {
      type,
      confidence: Math.min(distance / 100, 1),
      timestamp: Date.now(),
    };
    
    this.callbacks.forEach((callback) => {
      callback(action);
    });
  }
  
  /**
   * Register gesture callback
   */
  onGesture(callback: (action: GestureAction) => void): () => void {
    const id = `gesture-${Date.now()}-${Math.random()}`;
    this.callbacks.set(id, callback);
    
    return () => {
      this.callbacks.delete(id);
    };
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.callbacks.clear();
  }
}

/**
 * Create a gesture recognizer instance
 */
export function createGestureRecognizer(): GestureRecognizer {
  return new GestureRecognizer();
}
