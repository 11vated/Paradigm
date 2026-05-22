/**
 * TopNav — minimal top bar present on every Paradigm page.
 *
 * The four-stage product loop made visible:
 *   friend → world → quest → play
 */
import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS: Array<{ to: string; label: string; hint: string }> = [
  { to: '/classic/friend', label: 'friend', hint: 'sovereign companion' },
  { to: '/classic/world', label: 'world', hint: 'deterministic setting' },
  { to: '/classic/quest', label: 'quest', hint: 'friend × world' },
  { to: '/classic/play', label: 'play', hint: 'playable scene graph' },
];

export const TopNav: React.FC = () => (
  <nav className="border-b border-zinc-900 bg-zinc-950 sticky top-0 z-10">
    <div className="max-w-6xl mx-auto px-8 py-3 flex items-center gap-8 text-sm">
      <NavLink to="/" className="text-zinc-100 font-serif text-base mr-2 hover:text-amber-200">Paradigm</NavLink>
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `relative tracking-[0.15em] uppercase text-xs transition-colors ${
              isActive ? 'text-amber-300' : 'text-zinc-500 hover:text-zinc-200'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
      <span className="ml-auto text-xs text-zinc-700 font-mono">deterministic · sovereign · breedable</span>
    </div>
  </nav>
);
