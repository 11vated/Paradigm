/**
 * usePaneLayout — three-pane drag-resize + focus mode keyboard shortcuts.
 *
 * Returns:
 *  - left%, agent%, center% (computed)
 *  - bind handlers for the two grippers (between left/center, center/agent)
 *  - keyboard shortcuts: cmd+\ collapse left, cmd+shift+\ collapse agent,
 *    cmd+enter expand agent fullscreen, escape restore.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useLayout } from '@/stores/layoutStore';

export function usePaneLayout() {
  const { leftPct, agentPct, focusMode, setPanes, setFocus } = useLayout();

  const dragRef = useRef<{
    target: 'left' | 'agent';
    startX: number;
    startLeft: number;
    startAgent: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (target: 'left' | 'agent') => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        target,
        startX: e.clientX,
        startLeft: leftPct,
        startAgent: agentPct,
      };
    },
    [leftPct, agentPct],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dxPct = (dx / Math.max(window.innerWidth, 1)) * 100;
      if (drag.target === 'left') {
        setPanes(drag.startLeft + dxPct, agentPct);
      } else {
        setPanes(leftPct, drag.startAgent - dxPct);
      }
    },
    [leftPct, agentPct, setPanes],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const meta = ev.metaKey || ev.ctrlKey;
      if (!meta) return;

      // cmd+enter → expand agent fullscreen
      if (ev.key === 'Enter') {
        ev.preventDefault();
        setFocus(focusMode === 'agent-fullscreen' ? 'normal' : 'agent-fullscreen');
        return;
      }
      // cmd+\ → calm focus (collapse left rail)
      if (ev.key === '\\' && !ev.shiftKey) {
        ev.preventDefault();
        setFocus(focusMode === 'calm' ? 'normal' : 'calm');
        return;
      }
    };
    const escape = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && focusMode !== 'normal') {
        setFocus('normal');
      }
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keydown', escape);
    };
  }, [focusMode, setFocus]);

  const centerPct = Math.max(20, 100 - leftPct - agentPct);

  return {
    leftPct,
    agentPct,
    centerPct,
    focusMode,
    leftGripper:  { onPointerDown: onPointerDown('left'),  onPointerMove, onPointerUp },
    agentGripper: { onPointerDown: onPointerDown('agent'), onPointerMove, onPointerUp },
  };
}
