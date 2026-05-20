/**
 * /friend — standalone full-page Friend studio.
 * Wired into App.tsx routing.
 */

import React from 'react';
import { FriendPanel } from '@/components/friend';

export default function FriendPage() {
  return (
    <div className="h-screen w-screen bg-neutral-950 text-white flex flex-col">
      <header className="h-10 px-3 flex items-center border-b border-neutral-900 gap-3">
        <span className="font-mono text-[10px] text-accent uppercase tracking-widest">
          Paradigm · Friend
        </span>
        <span className="font-mono text-[9px] text-neutral-600">
          deterministic · sovereign · breedable
        </span>
        <a
          href="/"
          className="ml-auto font-mono text-[9px] text-neutral-500 hover:text-white uppercase tracking-wider"
        >
          ← Studio
        </a>
      </header>
      <div className="flex-1 overflow-hidden">
        <FriendPanel />
      </div>
    </div>
  );
}
