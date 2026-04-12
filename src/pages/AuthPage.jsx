import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dna, Loader2, AlertCircle, ArrowRight, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { login, register } from '@/services/api';

export default function AuthPage() {
  const navigate = useNavigate();
  const { setAuth, setLoading, setError, loading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const toggleMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    clearError();
    setLoading(true);
    try {
      const fn = mode === 'login' ? login : register;
      const result = await fn(username.trim(), password);
      setAuth(result.token, { username: result.username, role: result.role, id: result.user_id });
      navigate('/studio');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Authentication failed';
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(249,115,22,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-orange-500/20"
          animate={{
            x: [0, Math.sin(i * 1.2) * 100, 0],
            y: [0, Math.cos(i * 0.8) * 80, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{ duration: 6 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
          style={{ left: `${15 + i * 14}%`, top: `${20 + i * 10}%` }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Dna className="w-6 h-6 text-orange-500" />
          <span className="font-heading font-black text-xl tracking-tight">PARADIGM</span>
        </div>

        {/* Auth card */}
        <div className="border border-neutral-800/80 bg-neutral-950/60 backdrop-blur-sm">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-neutral-800/50">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5 text-orange-500/70" />
              <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">
                {mode === 'login' ? 'Authenticate' : 'Create Account'}
              </span>
            </div>
            <p className="font-mono text-[10px] text-neutral-600">
              {mode === 'login'
                ? 'Sign in to access the Creation Studio'
                : 'Register to begin creating sovereign seeds'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2 p-2.5 border border-red-500/20 bg-red-500/5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <span className="font-mono text-[10px] text-red-400">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Username</label>
              <input
                data-testid="auth-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full px-3 py-2 bg-black/40 border border-neutral-800 font-mono text-sm text-neutral-200 placeholder-neutral-700 focus:outline-none focus:border-orange-500/50 transition-colors"
                placeholder="your_username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[9px] text-neutral-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  data-testid="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-3 py-2 pr-9 bg-black/40 border border-neutral-800 font-mono text-sm text-neutral-200 placeholder-neutral-700 focus:outline-none focus:border-orange-500/50 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              data-testid="auth-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-orange-500 text-black font-bold text-xs uppercase tracking-wider hover:bg-orange-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Enter Studio' : 'Create Account'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="px-5 pb-4 text-center">
            <button
              data-testid="auth-toggle"
              onClick={toggleMode}
              className="font-mono text-[10px] text-neutral-500 hover:text-orange-500 transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Version tag */}
        <div className="mt-4 text-center font-mono text-[9px] text-neutral-700">
          PARADIGM ENGINE v2.0 — Sovereign Creative Platform
        </div>
      </motion.div>
    </div>
  );
}
