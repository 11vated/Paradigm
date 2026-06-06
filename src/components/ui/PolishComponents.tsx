/**
 * UI Polish Components — Error Boundaries, Toasts, Onboarding
 */
/* eslint-disable react-refresh/only-export-components -- Polish components file co-locates hooks (useToast, useKeyboardShortcuts) with components by design. */

import React, { Component, ErrorInfo, createContext, useContext, useState } from 'react';

/**
 * Error Boundary Component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: 20,
          background: '#2a1a1a',
          borderRadius: 8,
          color: '#fff',
          maxWidth: 600,
          margin: '20px auto'
        }}>
          <h2 style={{ color: '#e74c3c', margin: '0 0 16px 0' }}>Something went wrong</h2>
          <pre style={{
            background: '#1a1a1a',
            padding: 12,
            borderRadius: 4,
            overflow: 'auto',
            fontSize: 12,
            color: '#f39c12'
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              marginTop: 16,
              padding: '8px 24px',
              background: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Toast Notification System
 */
interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type?: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastIdCounter = 0;
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: Toast['type'] = 'info', duration: number = 5000) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              background: toast.type === 'success' ? '#27ae60'
                : toast.type === 'error' ? '#e74c3c'
                : toast.type === 'warning' ? '#f39c12'
                : '#3498db',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: 'slideIn 0.3s ease',
              minWidth: 200,
              maxWidth: 400,
              cursor: 'pointer'
            }}
            tabIndex={0}
            onClick={() => removeToast(toast.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeToast(toast.id); } }}
            aria-label={`${toast.type} toast: ${toast.message}. Press Enter to dismiss.`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

/**
 * Onboarding Tutorial Component
 */
interface OnboardingStep {
  title: string;
  description: string;
  target?: string;
  action?: () => void;
}

interface OnboardingProps {
  steps: OnboardingStep[];
  onComplete: () => void;
  onSkip?: () => void;
}

export function Onboarding({ steps, onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];

  if (!step) {
    onComplete();
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: '#2a2a2a',
        borderRadius: 12,
        padding: 32,
        maxWidth: 500,
        color: '#fff'
      }}>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>
          Step {currentStep + 1} of {steps.length}
        </div>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 24 }}>{step.title}</h2>
        <p style={{ margin: '0 0 24px 0', color: '#ccc', lineHeight: 1.6 }}>
          {step.description}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          {onSkip && currentStep < steps.length - 1 && (
            <button
              onClick={onSkip}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#888',
                border: '1px solid #444',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Skip
            </button>
          )}
          <button
            onClick={() => {
              if (currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
              } else {
                onComplete();
              }
            }}
            style={{
              padding: '8px 24px',
              background: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {currentStep < steps.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Keyboard Shortcuts Hook
 */
export function useKeyboardShortcuts(
  shortcuts: Record<string, (e: KeyboardEvent) => void>
) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key](e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}

/**
 * Command Palette Component
 */
interface CommandPaletteProps {
  commands: { name: string; shortcut: string; action: () => void }[];
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ commands, isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  const filtered = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 100,
        zIndex: 9999
      }} onClick={onClose}>
      <div
        style={{
          background: '#2a2a2a',
          borderRadius: 12,
          width: 500,
          maxHeight: 400,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <input
          type="text"
          placeholder="Type a command..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: 16,
            background: '#1a1a1a',
            border: 'none',
            borderBottom: '1px solid #333',
            color: '#fff',
            fontSize: 16,
            outline: 'none'
          }}
          autoFocus
        />
        <div role="listbox" aria-label="Command palette results" style={{ overflow: 'auto', flex: 1 }}>
          {filtered.map((cmd, i) => (
            <div
              key={i}
              role="option"
              tabIndex={0}
              aria-selected={false}
              onClick={() => {
                cmd.action();
                onClose();
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cmd.action(); onClose(); } }}
              aria-label={`Command: ${cmd.name}, shortcut ${cmd.shortcut}`}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{cmd.name}</span>
              <kbd style={{
                background: '#1a1a1a',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12,
                color: '#888'
              }}>
                {cmd.shortcut}
              </kbd>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
