/**
 * useAgent — SSE streaming agent hook with POST /api/agent/query fallback.
 *
 * Emits typed events from /api/agent/stream (when available):
 *   delta {token}       — streaming text token
 *   tool_call_start {name, args}
 *   tool_call_end {name, latencyMs, ok}
 *   card {kind, payload}
 *   done {latencyMs}
 *   tier {tier}
 *
 * Falls back to POST /api/agent/query when SSE is unavailable.
 */
import { useCallback, useRef } from 'react';
import {
  useAgentThreads,
  newTurnId,
  newCardId,
  type Turn,
  type SurfacedCard,
  type CardKind,
} from '@/stores/agentThreads';
import { kernelNowIso } from '@/lib/kernel/clock';

interface AgentResponse {
  success: boolean;
  intent?: string;
  message?: string;
  data?: any;
  tier?: number;
}

const TIER_NAMES: Record<number, string> = {
  0: 'kernel',
  1: 'fast',
  2: 'standard',
  3: 'deep',
};

export function useAgent() {
  const { threads, currentThreadId, appendTurn, patchTurn } = useAgentThreads();
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string): Promise<void> => {
      if (!currentThreadId || !text.trim()) return;
      const tid = currentThreadId;

      // Optimistic user turn
      const userTurn: Turn = {
        id: newTurnId(),
        role: 'user',
        at: kernelNowIso(),
        text: text.trim(),
      };
      appendTurn(tid, userTurn);

      // Pending agent turn
      const agentTurnId = newTurnId();
      const startedAt = performance.now();
      appendTurn(tid, {
        id: agentTurnId,
        role: 'agent',
        at: kernelNowIso(),
        text: '',
        streaming: true,
        parentId: userTurn.id,
      });

      const trySse = async (): Promise<boolean> => {
        try {
          const controller = new AbortController();
          abortRef.current = controller;

          const res = await fetch('/api/agent/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: text.trim() }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) return false;

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let collectedCards: SurfacedCard[] = [];
          let tier: string | undefined;

          let accumulatedText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (!data) continue;

              try {
                const event = JSON.parse(data);

                switch (event.type) {
                  case 'delta':
                    accumulatedText += event.token;
                    patchTurn(tid, agentTurnId, { text: accumulatedText });
                    break;

                  case 'tool_call_start':
                    collectedCards.push({
                      id: newCardId(),
                      kind: 'tool-calls' as CardKind,
                      payload: { tool: event.name, args: event.args, status: 'running' },
                    });
                    break;

                  case 'tool_call_end':
                    collectedCards.push({
                      id: newCardId(),
                      kind: 'tool-calls' as CardKind,
                      payload: { tool: event.name, latencyMs: event.latencyMs, ok: event.ok },
                    });
                    break;

                  case 'card':
                    if (event.kind && event.payload) {
                      collectedCards.push({
                        id: newCardId(),
                        kind: event.kind as CardKind,
                        payload: event.payload,
                      });
                    }
                    break;

                  case 'tier':
                    tier = TIER_NAMES[event.tier] ?? event.tier;
                    break;

                  case 'done':
                    patchTurn(tid, agentTurnId, {
                      streaming: false,
                      inferenceTier: tier as any,
                      cards: collectedCards.length ? collectedCards : undefined,
                      fingerprint: {
                        latencyMs: Math.round(performance.now() - startedAt),
                      },
                    });
                    break;
                }
              } catch {
                // skip malformed events
              }
            }
          }

          // Final flush after stream ends
          if (accumulatedText && !threads.find(t => t.id === tid)?.turns.find(u => u.id === agentTurnId)?.streaming === false) {
            patchTurn(tid, agentTurnId, {
              text: accumulatedText,
              streaming: false,
              inferenceTier: tier as any,
              cards: collectedCards.length ? collectedCards : undefined,
              fingerprint: { latencyMs: Math.round(performance.now() - startedAt) },
            });
          }

          return true;
        } catch {
          return false;
        } finally {
          abortRef.current = null;
        }
      };

      // Try SSE first, fallback to POST
      const sseWorked = await trySse();
      if (sseWorked) return;

      // Fallback: POST /api/agent/query
      try {
        const res = await fetch('/api/agent/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text.trim() }),
        });

        const json: AgentResponse = await res.json().catch(() => ({
          success: false,
          message: 'agent · failed to parse response',
        }));

        const cards: SurfacedCard[] = [];

        if (json.intent && json.intent !== 'help' && json.intent !== 'unknown') {
          cards.push({
            id: newCardId(),
            kind: 'tool-calls',
            payload: {
              intent: json.intent,
              data: json.data ?? null,
              latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
              ok: json.success,
            },
          });
        }

        const grown = json.data?.seed ?? json.data?.population?.[0] ?? null;
        if (grown) {
          cards.push({
            id: newCardId(),
            kind: 'gspl-source',
            payload: { kind: 'json', seed: grown },
          });
        }

        const replyText =
          (json.message && String(json.message).trim()) ||
          (json.success ? `intent · ${json.intent ?? 'ok'}` : 'agent · no message returned');

        patchTurn(tid, agentTurnId, {
          text: replyText,
          streaming: false,
          inferenceTier: TIER_NAMES[json.tier ?? 2] as any,
          cards: cards.length ? cards : undefined,
          fingerprint: { latencyMs: Math.round(performance.now() - startedAt) },
        });
      } catch (err: any) {
        patchTurn(tid, agentTurnId, {
          text: `agent · transport error · ${err?.message ?? String(err)}`,
          streaming: false,
        });
      }
    },
    [currentThreadId, appendTurn, patchTurn],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { threads, currentThreadId, send, cancel };
}
