/**
 * Time stratum — calendar systems + event causality DAG.
 * Pure / deterministic / IO-free.
 */
import type { Xoshiro256StarStar } from '../kernel/rng.js';

export interface CalendarSpec {
  schema: 'https://paradigm.ai/schema/time/v1';
  name: string;
  daysPerWeek: number;
  weeksPerMonth: number;
  monthsPerYear: number;
  hoursPerDay: number;
  epochOffsetDays: number;
  monthNames: string[];
  weekdayNames: string[];
  seasonalCycle: { season: string; startDay: number; lengthDays: number }[];
  festivals: { name: string; dayOfYear: number; durationDays: number; significance: string }[];
}

export interface TimelineEvent {
  id: string;
  yearDay: number;          // day-of-the-civilisation-year
  duration: number;         // in days
  kind: 'ritual' | 'rite' | 'work' | 'rest' | 'pilgrimage' | 'market';
  participants: string[];   // agent archetypes invited
  dependsOn: string[];      // ids of prior events
}

export interface Chronology {
  schema: 'https://paradigm.ai/schema/chronology/v1';
  calendarId: string;
  yearLengthDays: number;
  events: TimelineEvent[];
}

/** Verify chronology DAG is acyclic and dependencies precede dependents. */
export function verifyChronology(c: Chronology): { passed: boolean; error?: string } {
  const byId: Record<string, TimelineEvent> = {};
  for (const e of c.events) byId[e.id] = e;
  // Topological order = sorted by yearDay (we only need DAG-acyclic + temporal consistency)
  for (const e of c.events) {
    for (const dep of e.dependsOn) {
      const pre = byId[dep];
      if (!pre) return { passed: false, error: `event ${e.id} depends on missing ${dep}` };
      if (pre.yearDay >= e.yearDay) {
        return { passed: false, error: `event ${e.id} (day ${e.yearDay}) depends on ${dep} (day ${pre.yearDay}) — must precede` };
      }
    }
  }
  // Cycle check via DFS
  const color: Record<string, 0|1|2> = {};
  for (const e of c.events) color[e.id] = 0;
  const visit = (id: string): boolean => {
    if (color[id] === 1) return false;       // cycle
    if (color[id] === 2) return true;
    color[id] = 1;
    for (const d of byId[id].dependsOn) if (!visit(d)) return false;
    color[id] = 2;
    return true;
  };
  for (const e of c.events) if (!visit(e.id)) return { passed: false, error: `cycle through ${e.id}` };
  return { passed: true };
}

export function generateCalendar(opts: { name: string; rng: Xoshiro256StarStar }): CalendarSpec {
  const dpw = 5 + opts.rng.nextInt(0, 4);          // 5..8
  const wpm = 3 + opts.rng.nextInt(0, 3);          // 3..5
  const mpy = 8 + opts.rng.nextInt(0, 5);          // 8..12
  const hpd = [16, 18, 20, 22, 24][opts.rng.nextInt(0, 4)];
  const phonemes = ['ka','lo','si','re','mu','no','va','di','wo','ja','el','ur','ai','en','ix','ot','am','sol'];
  const word = (n: number) => { let s = ''; for (let i=0;i<n;i++) s += phonemes[opts.rng.nextInt(0, phonemes.length-1)]; return s.charAt(0).toUpperCase() + s.slice(1); };
  const monthNames = Array.from({length: mpy}, () => word(2 + opts.rng.nextInt(0, 1)));
  const weekdayNames = Array.from({length: dpw}, () => word(1 + opts.rng.nextInt(0, 1)));
  const yearLengthDays = dpw * wpm * mpy;
  // 4 canonical seasons
  const seasonNames = ['waking', 'high-sun', 'gathering', 'long-shadow'];
  const seasonalCycle = seasonNames.map((s, i) => ({
    season: s,
    startDay: Math.floor((i / 4) * yearLengthDays),
    lengthDays: Math.floor(yearLengthDays / 4),
  }));
  // 4-6 festivals at major points (solstices/equinoxes + chosen)
  const nFest = 4 + opts.rng.nextInt(0, 2);
  const festivals = Array.from({length: nFest}, (_, i) => ({
    name: word(2 + opts.rng.nextInt(0, 1)) + '-' + ['rite','vigil','gathering','feast','rebirth'][opts.rng.nextInt(0, 4)],
    dayOfYear: Math.floor((i + 0.5) * yearLengthDays / nFest) + opts.rng.nextInt(-3, 3),
    durationDays: 1 + opts.rng.nextInt(0, 3),
    significance: ['solar', 'lunar', 'ancestral', 'agricultural', 'spiritual'][opts.rng.nextInt(0, 4)],
  }));
  return {
    schema: 'https://paradigm.ai/schema/time/v1',
    name: opts.name,
    daysPerWeek: dpw,
    weeksPerMonth: wpm,
    monthsPerYear: mpy,
    hoursPerDay: hpd,
    epochOffsetDays: opts.rng.nextInt(0, 1000),
    monthNames,
    weekdayNames,
    seasonalCycle,
    festivals,
  };
}

export function generateChronology(cal: CalendarSpec, rng: Xoshiro256StarStar): Chronology {
  const yearLen = cal.daysPerWeek * cal.weeksPerMonth * cal.monthsPerYear;
  const events: TimelineEvent[] = [];
  // Festivals as ritual events
  for (const f of cal.festivals) {
    events.push({
      id: `fest:${f.name}`,
      yearDay: f.dayOfYear,
      duration: f.durationDays,
      kind: 'ritual',
      participants: ['oracle-priest', 'merchant', 'warrior', 'scholar'].filter(() => rng.nextF64() > 0.3),
      dependsOn: [],
    });
  }
  // Add weekly market and rest days
  for (let m = 0; m < cal.monthsPerYear; m++) {
    for (let w = 0; w < cal.weeksPerMonth; w++) {
      const day = m * cal.weeksPerMonth * cal.daysPerWeek + w * cal.daysPerWeek;
      events.push({
        id: `market:${m}-${w}`,
        yearDay: day,
        duration: 1,
        kind: 'market',
        participants: ['merchant', 'scholar'],
        dependsOn: [],
      });
      events.push({
        id: `rest:${m}-${w}`,
        yearDay: day + cal.daysPerWeek - 1,
        duration: 1,
        kind: 'rest',
        participants: ['all'],
        dependsOn: [],
      });
    }
  }
  // Pilgrimages depend on prior festivals
  if (cal.festivals.length >= 2) {
    events.push({
      id: 'pilgrimage:annual',
      yearDay: cal.festivals[1].dayOfYear + 7,
      duration: 12,
      kind: 'pilgrimage',
      participants: ['oracle-priest', 'merchant', 'scholar'],
      dependsOn: [`fest:${cal.festivals[1].name}`],
    });
  }
  events.sort((a, b) => a.yearDay - b.yearDay);
  return {
    schema: 'https://paradigm.ai/schema/chronology/v1',
    calendarId: cal.name,
    yearLengthDays: yearLen,
    events,
  };
}
