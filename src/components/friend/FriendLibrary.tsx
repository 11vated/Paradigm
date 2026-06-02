/**
 * FriendLibrary — gallery of all stored Friends, with drag-to-breed.
 *
 * Drop one Friend onto another to breed them. Click to select. Drag
 * onto trash zone to delete. Sorting (created/name) via the header.
 */

import React, { useEffect, useState, useCallback, DragEvent } from 'react';
import type { FriendSeedData } from '@/lib/friend';
import { friendApi } from './api';

export interface FriendLibraryProps {
  /** Called when the user single-clicks a card. */
  onSelect?: (friend: FriendSeedData) => void;
  /** Called when the user drops Friend A onto Friend B. */
  onBreed?: (a: FriendSeedData, b: FriendSeedData) => void;
  /** Called when a Friend is removed. */
  onRemove?: (id: string) => void;
  /** Currently-selected id (shown highlighted). */
  selectedId?: string;
  /** Bump this to force a refetch. */
  refreshKey?: number;
  /** Limit how many to show; default 200. */
  limit?: number;
}

type Sort = 'created' | 'name';

export const FriendLibrary: React.FC<FriendLibraryProps> = ({
  onSelect, onBreed, onRemove, selectedId, refreshKey = 0, limit = 200,
}) => {
  const [friends, setFriends] = useState<FriendSeedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<Sort>('created');
  const [dragId, setDragId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    friendApi.list({ limit, sortBy })
      .then((r) => setFriends(r.friends))
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [limit, sortBy]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
  useEffect(() => { refresh(); }, [refresh, refreshKey]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await friendApi.remove(id);
      setFriends((fs) => fs.filter((f) => f.id !== id));
      onRemove?.(id);
    } catch (e: any) {
      setError(e.message ?? String(e));
    }
  }, [onRemove]);

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-white">
      <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-900 text-[10px] font-mono">
        <span className="text-accent">Library · {friends.length} friend{friends.length === 1 ? '' : 's'}</span>
        <div className="flex gap-1">
          <button
            onClick={() => setSortBy('created')}
            className={`px-1.5 py-0.5 rounded ${sortBy === 'created' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}
          >recent</button>
          <button
            onClick={() => setSortBy('name')}
            className={`px-1.5 py-0.5 rounded ${sortBy === 'name' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-white'}`}
          >name</button>
          <button onClick={refresh} aria-label="Refresh friends" className="px-1.5 py-0.5 text-neutral-500 hover:text-white">↻</button>
        </div>
      </div>

      {error && (
        <div className="px-2 py-1 text-[10px] text-red-400 font-mono border-b border-red-900">{error}</div>
      )}

      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 auto-rows-min">
        {loading && friends.length === 0 && (
          <div className="col-span-full text-center text-[10px] text-neutral-600 font-mono py-8">loading…</div>
        )}
        {!loading && friends.length === 0 && (
          <div className="col-span-full text-center text-[10px] text-neutral-600 font-mono py-8">
            No friends yet. Generate one to begin.
          </div>
        )}
        {friends.map((f) => (
          <FriendCard
            key={f.id}
            friend={f}
            selected={selectedId === f.id}
            dragging={dragId === f.id}
            onSelect={() => onSelect?.(f)}
            onDelete={() => handleDelete(f.id)}
            onDragStart={() => setDragId(f.id)}
            onDragEnd={() => setDragId(null)}
            onDrop={(otherId) => {
              const other = friends.find((x) => x.id === otherId);
              if (other && other.id !== f.id) onBreed?.(other, f);
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  friend: FriendSeedData;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (sourceId: string) => void;
}

const FriendCard: React.FC<CardProps> = ({
  friend, selected, dragging, onSelect, onDelete, onDragStart, onDragEnd, onDrop,
}) => {
  const [hover, setHover] = useState(false);
  const [dropTarget, setDropTarget] = useState(false);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('friend-id', friend.id);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart();
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (e.dataTransfer.types.includes('friend-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDropTarget(true);
    }
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropTarget(false);
    const sourceId = e.dataTransfer.getData('friend-id');
    if (sourceId) onDrop(sourceId);
  };

  const signed = !!friend.sovereignty;
  const op = friend.derivation?.operator ?? 'genesis';
  const gen = friend.derivation?.generation ?? 0;

  const opGlyph = op === 'breed' ? '⚭' : op === 'mutate' ? '~' : '◆';
  const opColor = op === 'breed' ? 'text-emerald-400' : op === 'mutate' ? 'text-amber-400' : 'text-blue-400';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={() => setDropTarget(false)}
      onDrop={handleDrop}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={[
        'relative rounded-md border cursor-pointer p-1.5 select-none transition-colors',
        selected ? 'border-accent bg-neutral-900' : 'border-neutral-800 bg-neutral-925 hover:border-neutral-700',
        dragging ? 'opacity-50' : '',
        dropTarget ? 'ring-2 ring-emerald-500/70' : '',
      ].join(' ')}
      style={{ background: selected ? undefined : 'rgb(15 15 15)' }}
      title={`${friend.name} · ${friend.id}`}
    >
      <div className="aspect-square rounded bg-neutral-900 overflow-hidden flex items-center justify-center text-[10px] font-mono text-neutral-600">
        {/* Mini SVG preview by re-rendering colors; full SVG is in the artifact. We show a small
            colored disc keyed off the genome instead of full SVG for performance in big lists. */}
        <MiniAvatar friend={friend} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-1">
        <div className="truncate text-[10px] font-mono">{friend.name}</div>
        <div className={`text-[9px] font-mono ${opColor}`}>{opGlyph}<span className="text-neutral-700">{gen}</span></div>
      </div>
      <div className="flex items-center justify-between text-[8px] font-mono text-neutral-600">
        <span className="truncate">{friend.id.slice(0, 8)}</span>
        {signed && <span className="text-emerald-400" title="signed">⛨</span>}
      </div>

      {hover && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={`Delete ${friend.name}`}
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-neutral-800 text-neutral-400 hover:bg-red-900 hover:text-red-100 text-[9px] font-mono flex items-center justify-center"
          title="delete"
        >×</button>
      )}
    </div>
  );
};

// ─── MiniAvatar — cheap colored disc keyed off the genome ─────────────────────

const MiniAvatar: React.FC<{ friend: FriendSeedData }> = ({ friend }) => {
  const [r, g, b] = friend.genes.body.skinTone;
  const skin = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  const [hr, hg, hb] = friend.genes.face.hairColor;
  const hair = `rgb(${Math.round(hr * 255)}, ${Math.round(hg * 255)}, ${Math.round(hb * 255)})`;
  const roundness = friend.genes.face.roundness;
  const hairLift = friend.genes.face.brow * 3;

  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%">
      <rect width="32" height="32" fill="#0b0b0b" />
      <ellipse cx="16" cy="17" rx={11} ry={11 * (0.85 + roundness * 0.25)} fill={skin} />
      <path
        d={`M 6 14 Q 16 ${6 - hairLift} 26 14 Q 26 10 16 ${8 - hairLift * 0.7} Q 6 10 6 14 Z`}
        fill={hair}
      />
    </svg>
  );
};
