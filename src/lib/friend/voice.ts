/**
 * Friend voice synthesis — pure helpers that map VoiceGene → SpeechSynthesisUtterance settings.
 * Browser-side only; safe to import in shared code (guards on `window`).
 */
import type { FriendSeedData, VoiceGene } from './types';

export function isSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** VoiceGene → SpeechSynthesis pitch (0–2, default 1). VoiceGene.pitch is Hz 80-300. */
export function genePitch(v: VoiceGene): number {
  const norm = (Math.max(80, Math.min(300, v.pitch)) - 80) / 220; // 0–1
  return 0.5 + norm * 1.5; // 0.5–2.0
}

/** VoiceGene.tempo (wpm 80-180) → SpeechSynthesis rate (0.1–10, default 1). */
export function geneRate(v: VoiceGene): number {
  const wpm = Math.max(60, Math.min(220, v.tempo));
  return wpm / 130; // 130 wpm ≈ rate 1
}

/** VoiceGene.warmth + breathiness → volume (0–1, default 1). Slightly quieter for breathy voices. */
export function geneVolume(v: VoiceGene): number {
  return Math.max(0.5, 1 - v.breathiness * 0.4);
}

/** Pick the available browser voice that best matches the gene profile.
 *  Deterministic given the same voices list + gene. */
export function pickVoice(voices: SpeechSynthesisVoice[], v: VoiceGene): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  // Prefer en-* voices; pitch high → female, low → male as a coarse heuristic.
  const en = voices.filter(x => x.lang.startsWith('en')).length ? voices.filter(x => x.lang.startsWith('en')) : voices;
  const wantFem = v.pitch > 180;
  const matches = en.filter(x => /female|woman|samantha|victoria|karen|fiona|tessa/i.test(x.name) === wantFem);
  return (matches[0] ?? en[0]) ?? voices[0];
}

/** High-level: speak `text` in `friend`'s voice. Returns a stop() handle. */
export function speakAs(friend: FriendSeedData, text: string): () => void {
  if (!isSpeechAvailable()) return () => {};
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = friend.genes.voice;
  u.pitch = genePitch(v);
  u.rate = geneRate(v);
  u.volume = geneVolume(v);
  const voices = synth.getVoices();
  const picked = pickVoice(voices, v);
  if (picked) u.voice = picked;
  u.lang = picked?.lang ?? 'en-US';
  synth.speak(u);
  return () => synth.cancel();
}
