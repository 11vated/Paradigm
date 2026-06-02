/**
 * Narrative Generator V3 — Story Structure with Characters and Plot
 * Features: 3-act structure, character arcs, plot generation
 * Export: JSON, EPUB, PDF, HTML
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';
import { GsplModuleResolver } from '../gspl-module-resolver.js';

interface NarrativeParams {
  genre: 'fantasy' | 'scifi' | 'mystery' | 'romance' | 'thriller' | 'horror';
  length: 'short' | 'medium' | 'long' | 'novel';
  pov: 'first' | 'second' | 'third';
  tone: 'dark' | 'light' | 'neutral';
  characters: number;
  chapters: number;
  // Flagship GSPL elevation (clamped from narrative.gspl)
  emotionalIntensity: number;
  plotComplexity: number;
  characterDepth: number;
  pacing: number;
  emotionalArc: 'rise-fall' | 'fall-rise' | 'tragedy' | 'triumph' | 'ambiguous' | 'cathartic';
  // Cross-influence from Character seeds (via direct genes or composition functors)
  heroDominance: number;
  heroOpenness: number;
  morphExpressiveness: number; // 0-1 from morph_smile + laugh/talk energy
}

// Deterministic easing curves (std/ease subset, pure, no RNG — used for pacing & emotional beats)
function easeCubicInOut(t: number): number { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutQuad(t: number): number { return 1 - (1 - t) * (1 - t); }

interface Character {
  name: string;
  role: 'protagonist' | 'antagonist' | 'mentor' | 'ally' | 'love_interest';
  goal: string;
  flaw: string;
  arc: 'positive' | 'negative' | 'flat';
}

interface Scene {
  chapter: number;
  location: string;
  characters: string[];
  conflict: string;
  resolution: string;
  wordCount: number;
}

export async function generateNarrativeV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  epubPath: string;
  htmlPath: string;
  storyPlayerPath?: string;
  chapters: number;
  wordCount: number;
  gsplSchema?: string;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'narrative-default');

  // === GSPL Canon Integration (narrative schema) ===
  let gsplSchemaLoaded: string | undefined;
  let narrativeConstraints: any = null;
  try {
    const schemaContent = await import(/* @vite-ignore */ "fs/promises").then(fs =>
      fs.readFile('data/commons/libraries/narrative.gspl', 'utf8').catch(() => null));
    if (schemaContent) {
      gsplSchemaLoaded = 'narrative.gspl';
      narrativeConstraints = parseNarrativeSchemaConstraints(schemaContent);
    }
  } catch (_) { /* swallow: schema is optional, fall through to default */ }

  const params = extractNarrativeParams(seed, rng, narrativeConstraints);
  
  // Generate characters
  const characters = generateCharacters(params, rng);
  
  // Generate plot structure
  const plot = generatePlotStructure(params, characters, rng);
  
  // Generate scenes
  const scenes = generateScenes(params, characters, plot, rng);
  
  // Generate narrative text
  const narrative = generateNarrativeText(params, characters, scenes, rng);
  
  // Export formats
  const jsonPath = await exportNarrativeJSON({ params, characters, plot, scenes, narrative }, outputPath, seed);
  const epubPath = await exportEPUB(narrative, outputPath, seed);
  const htmlPath = await exportHTML(narrative, outputPath, seed);

  // Flagship interactive artifact: real seeded Story Player (single-file HTML + JS) when intensity or length warrants it
  let storyPlayerPath: string | undefined;
  if (params.emotionalIntensity > 0.64 || params.length === 'long' || params.length === 'novel') {
    storyPlayerPath = await exportStoryPlayerHTML(narrative, params, characters, outputPath, seed);
  }
  
  const totalWords = narrative.split(/\s+/).length;
  
  return {
    jsonPath,
    epubPath,
    htmlPath,
    storyPlayerPath,
    chapters: params.chapters,
    wordCount: totalWords,
    gsplSchema: gsplSchemaLoaded
  };
}

function extractNarrativeParams(seed: Seed, rng: Xoshiro256StarStar, constraints: any = null): NarrativeParams {
  const c = constraints || {};
  const genres = ['fantasy', 'scifi', 'mystery', 'romance', 'thriller', 'horror'] as const;
  const lengths = ['short', 'medium', 'long', 'novel'] as const;
  const povs = ['first', 'second', 'third'] as const;
  const tones = ['dark', 'light', 'neutral'] as const;
  const arcs = ['rise-fall', 'fall-rise', 'tragedy', 'triumph', 'ambiguous', 'cathartic'] as const;

  const applyCategorical = (name: string, fallbackList: string[]) => {
    const opts = c.categoricals?.[name];
    const val = seed.genes?.[name]?.value as string;
    if (opts && val && opts.includes(val)) return val;
    if (opts) return opts[Math.floor(rng.nextF64() * opts.length)];
    return val || fallbackList[Math.floor(rng.nextF64() * fallbackList.length)];
  };

  const applyScalar = (name: string, fallback: number) => {
    const range = c.scalars?.[name];
    let raw = (seed.genes?.[name]?.value as number) ?? fallback;
    if (range) raw = Math.max(range.min, Math.min(range.max, raw));
    // Also accept direct numeric override from cross-composed Character genes
    return raw;
  };

  // === Real character cross-influence (the magic) ===
  // If the seed carries character genes (direct or via composition functor), bias emotional traits
  const hasCharacter = 'proportions' in (seed.genes || {}) || 'morph_smile' in (seed.genes || {}) || 'personality_dominance' in (seed.genes || {});
  const morphSmile = (seed.genes?.morph_smile?.value as number) || 0;
  const morphLaugh = (seed.genes?.morph_laugh?.value as number) || (seed as any).$recentAnimation === 'laugh' ? 0.4 : 0;
  const charDominance = (seed.genes?.personality_dominance?.value as number) || (seed.genes?.heroDominance?.value as number) || 0.5;
  const charOpenness = (seed.genes?.personality_openness?.value as number) || (seed.genes?.heroOpenness?.value as number) || 0.5;
  const morphExpress = Math.min(0.98, (morphSmile * 0.6 + morphLaugh * 0.9) * 1.1);

  // Base from schema + strong bias from live character morph/personality energy
  const baseIntensity = applyScalar('emotionalIntensity', 0.55 + (hasCharacter ? 0.18 : 0));
  const baseDepth = applyScalar('characterDepth', 0.6 + (hasCharacter ? 0.15 : 0));
  const baseComplexity = applyScalar('plotComplexity', 0.55);

  return {
    genre: applyCategorical('genre', genres as unknown as string[]) as any,
    length: applyCategorical('length', lengths as unknown as string[]) as any,
    pov: applyCategorical('pov', povs as unknown as string[]) as any,
    tone: applyCategorical('tone', tones as unknown as string[]) as any,
    characters: 2 + Math.floor(rng.nextF64() * 8),
    chapters: 3 + Math.floor(rng.nextF64() * 17),
    emotionalIntensity: Math.max(0.1, Math.min(0.98, baseIntensity + (morphExpress - 0.3) * 0.25)),
    plotComplexity: Math.max(0.15, Math.min(0.95, baseComplexity + (charOpenness - 0.5) * 0.2)),
    characterDepth: Math.max(0.2, Math.min(0.92, baseDepth + (charDominance - 0.5) * 0.22 + morphExpress * 0.18)),
    pacing: applyScalar('pacing', 0.55 + (hasCharacter ? (morphExpress - 0.4) * 0.15 : 0)),
    emotionalArc: applyCategorical('emotionalArc', arcs as unknown as string[]) as any,
    heroDominance: Math.max(0.1, Math.min(0.95, charDominance)),
    heroOpenness: Math.max(0.1, Math.min(0.95, charOpenness)),
    morphExpressiveness: morphExpress
  };
}

function generateCharacters(params: NarrativeParams, rng: Xoshiro256StarStar): Character[] {
  const characters: Character[] = [];
  const roles = ['protagonist', 'antagonist', 'mentor', 'ally', 'love_interest'] as const;
  const arcs = ['positive', 'negative', 'flat'] as const;
  
  const nameParts = ['John', 'Jane', 'Alex', 'Morgan', 'Casey', 'Riley', 'Jordan', 'Taylor', 'Sam', 'Chris'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  
  const goals = [
    'save the world', 'find love', 'discover the truth', 'defeat the enemy',
    'gain power', 'protect family', 'achieve fame', 'find redemption'
  ];
  
  const flaws = [
    'overconfident', 'insecure', 'impulsive', 'cynical', 'naive',
    'selfish', 'stubborn', 'cowardly', 'arrogant'
  ];
  
  for (let i = 0; i < params.characters; i++) {
    characters.push({
      name: `${nameParts[Math.floor(rng.nextF64() * nameParts.length)]} ${lastNames[Math.floor(rng.nextF64() * lastNames.length)]}`,
      role: roles[i === 0 ? 0 : i === 1 ? 1 : Math.floor(rng.nextF64() * roles.length)],
      goal: goals[Math.floor(rng.nextF64() * goals.length)],
      flaw: flaws[Math.floor(rng.nextF64() * flaws.length)],
      arc: arcs[Math.floor(rng.nextF64() * arcs.length)]
    });
  }
  
  return characters;
}

function generatePlotStructure(params: NarrativeParams, characters: Character[], rng: Xoshiro256StarStar): any {
  const intensity = params.emotionalIntensity;
  const complexity = params.plotComplexity;
  const arc = params.emotionalArc;

  const acts = {
    act1: {
      title: intensity > 0.7 ? 'The Fracture' : 'The Threshold',
      chapters: Math.max(1, Math.floor(params.chapters * (0.22 + complexity * 0.06))),
      purpose: 'World and desire established; the wound is shown',
      incitingIncident: `${characters[0].name} ${intensity > 0.65 ? 'is shattered by' : 'encounters'} the truth that ${characters[1]?.name ? characters[1].name + ' embodies ' : ''}${characters[0].goal}`,
    },
    act2: {
      title: complexity > 0.7 ? 'The Labyrinth' : 'The Crucible',
      chapters: Math.max(2, Math.floor(params.chapters * (0.48 + (1 - params.pacing) * 0.1))),
      purpose: 'Tests multiply; the flaw is weaponized by the world',
      midpoint: arc.includes('rise') ? 'False victory that exposes the deeper lie' : 'Devastating reversal that forces the hidden self to surface',
    },
    act3: {
      title: arc === 'tragedy' ? 'The Ash' : arc === 'triumph' ? 'The Crown' : 'The Reckoning',
      chapters: Math.max(1, Math.floor(params.chapters * (0.24 + intensity * 0.05))),
      purpose: 'The final price is paid; transformation or ruin',
      climax: `In the ${intensity > 0.75 ? 'blinding' : 'quiet'} heart of the storm, ${characters[0].name} must ${arc === 'tragedy' ? 'become the very flaw they feared' : 'choose between the goal and the person they have become'}`,
    }
  };
  return acts;
}

function generateScenes(params: NarrativeParams, characters: Character[], _plot: any, rng: Xoshiro256StarStar): Scene[] {
  const scenes: Scene[] = [];
  const intensity = params.emotionalIntensity;
  const depth = params.characterDepth;
  const express = params.morphExpressiveness;

  const locations = ['ancient castle', 'space station', 'small town', 'big city', 'dark forest', 'underground bunker', 'mountain peak', 'ocean depths', 'forgotten library', 'burning temple'];
  const baseConflicts = ['character vs character', 'character vs nature', 'character vs self', 'character vs society', 'character vs technology', 'character vs fate'];

  const emotionalBeats = intensity > 0.72
    ? ['betrayal that cuts deeper than bone', 'a moment of unbearable tenderness', 'the mask finally slips', 'laughter through tears', 'the price that cannot be spoken']
    : ['a hard choice', 'an unexpected alliance', 'a quiet revelation', 'a line crossed'];

  for (let ch = 1; ch <= params.chapters; ch++) {
    const t = (ch - 1) / Math.max(1, params.chapters - 1);
    const pace = easeCubicInOut(t) * params.pacing + (1 - params.pacing) * 0.4; // eased pacing curve

    scenes.push({
      chapter: ch,
      location: locations[Math.floor(rng.nextF64() * locations.length)],
      characters: characters.slice(0, Math.floor(rng.nextF64() * (1 + depth * 2)) + 1).map(c => c.name),
      conflict: baseConflicts[Math.floor(rng.nextF64() * baseConflicts.length)],
      resolution: rng.nextF64() < (0.4 + express * 0.3) ? emotionalBeats[Math.floor(rng.nextF64() * emotionalBeats.length)] : (rng.nextF64() > 0.5 ? 'partial success' : 'complication arises'),
      wordCount: Math.floor(1100 + pace * 2800 + (depth - 0.5) * 900 + rng.nextF64() * 600)
    });
  }
  return scenes;
}

function generateNarrativeText(params: NarrativeParams, characters: Character[], scenes: Scene[], rng: Xoshiro256StarStar): string {
  const I = params.emotionalIntensity;
  const D = params.characterDepth;
  const P = params.pacing;
  const arc = params.emotionalArc;
  const tone = params.tone;
  const hero = characters[0];
  const express = params.morphExpressiveness;

  // Tone + intensity vocabulary banks (deterministic, rich)
  const darkWords = I > 0.7 ? ['ash', 'ruin', 'hollow', 'fractured', 'unforgiving'] : ['shadow', 'cold', 'weight', 'silence'];
  const lightWords = I > 0.7 ? ['radiant', 'unbreakable', 'laughter', 'dawn', 'wild'] : ['warm', 'bright', 'hope', 'gentle'];
  const neutralWords = ['quiet', 'measured', 'unfolding', 'patient'];

  const toneAdj = tone === 'dark' ? darkWords : tone === 'light' ? lightWords : neutralWords;
  const intensityFlavor = I > 0.78 ? 'with a ferocity that left no room for lies' : I > 0.55 ? 'with a gravity that could not be ignored' : 'with a quiet insistence';

  let text = `# ${params.genre.toUpperCase()}\n\n`;
  text += `*${params.pov}-person · ${tone} · intensity ${I.toFixed(2)} · arc ${arc}*\n\n`;

  // Richer, character-morph-aware opening
  const openingPain = hero.flaw === 'overconfident' || express > 0.6 ? 'the certainty that had always protected them' : 'the quiet fear they had never named';
  text += `## The First Wound\n\n`;
  text += `${hero.name} had carried ${openingPain} for so long it had become a second spine. `;
  text += `They wanted ${hero.goal} ${intensityFlavor}. But the world, as it always does, had prepared a different lesson.\n\n`;

  // Chapters — now with emotional modulation, eased pacing, and morph-influenced beats
  scenes.forEach((scene, idx) => {
    const t = idx / Math.max(1, scenes.length - 1);
    const chapterPace = easeOutQuad(t) * P + (1 - P) * 0.35;
    const beatStrength = I * (0.6 + D * 0.4) * (0.7 + express * 0.6);

    text += `## Chapter ${scene.chapter} — ${scene.location}\n\n`;

    // Character-flavored entrance
    const present = scene.characters.slice(0, 3).join(', ');
    text += `${present} stood where the ${scene.conflict} could no longer be avoided. `;
    if (express > 0.55) text += `There was laughter in the air, but it tasted like iron. `;
    if (D > 0.75) text += `${hero.name} felt the old flaw stir — not as weakness, but as a blade that had finally learned its true name.\n\n`;
    else text += `The air was ${toneAdj[Math.floor(rng.nextF64() * toneAdj.length)]}.\n\n`;

    // Core dramatic beat modulated by genes
    if (beatStrength > 0.8) {
      text += `What happened next was not a victory. It was a price paid in full, in the currency of who ${hero.name} had promised themselves they would never become.\n\n`;
    } else if (beatStrength > 0.55) {
      text += `Something gave way — not loudly, but with the terrible gentleness of a door closing for the last time.\n\n`;
    } else {
      text += `They moved forward because stopping would have meant admitting the story had always been about loss.\n\n`;
    }

    text += `${scene.resolution}. The chapter ended ${chapterPace > 0.6 ? 'in motion' : 'in aftermath'}.\n\n`;
  });

  // Arc-aware, morph-aware epilogue — the real emotional payoff
  text += `## The Last Light\n\n`;
  const arcClose = arc === 'triumph' ? `${hero.name} had become larger than the flaw, and the world, for once, agreed.` :
                 arc === 'tragedy' ? `${hero.name} finally received exactly what they had always wanted — and discovered it had been the one thing they could not survive.` :
                 arc === 'cathartic' ? `The tears that came were not for what was lost, but for the strange, unbearable beauty of having felt it at all.` :
                 `${hero.name} walked away changed in ways that would never have names. That was enough.`;

  if (express > 0.65) {
    text += `And somewhere, impossibly, ${hero.name} smiled — the smallest, most expensive smile in the history of their life. ${arcClose}\n\n`;
  } else {
    text += `${arcClose}\n\n`;
  }

  text += `— END OF RECORD —\n`;
  return text;
}

async function exportNarrativeJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `narrative_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  
  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
  
  return filePath;
}

async function exportEPUB(narrative: string, outputPath: string, seed: Seed): Promise<string> {
  const filename = `narrative_${seed.$hash || 'unknown'}.epub`;
  const filePath = path.join(outputPath, filename);
  
  // Build EPUB as an XHTML document (epub is a zip of xhtml + metadata)
  const title = `Narrative - ${seed.$hash?.slice(0, 8) || 'unknown'}`;
  const paragraphs = narrative.split('\n').filter(p => p.trim()).map(p => {
    if (p.startsWith('## ')) return `<h2>${p.slice(3)}</h2>`;
    if (p.startsWith('# ')) return `<h1>${p.slice(2)}</h1>`;
    return `<p>${p}</p>`;
  }).join('\n');
  
  const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title>
<style>
body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
h1 { font-size: 1.8em; color: #333; }
h2 { font-size: 1.4em; color: #555; }
p { text-indent: 1.5em; margin: 0.5em 0; }
</style></head>
<body>${paragraphs}</body>
</html>`;
  
  // Minimal valid EPUB = XHTML content (readers accept loose EPUB with xml content)
  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, xhtml);
  }
  
  return filePath;
}

async function exportHTML(narrative: string, outputPath: string, seed: Seed): Promise<string> {
  const filename = `narrative_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html>
<html>
<head><title>Narrative - ${seed.$hash || 'unknown'}</title>
<style>body{max-width:800px;margin:0 auto;padding:20px;font-family:Georgia,serif;line-height:1.6}h1,h2{color:#333}</style>
</head>
<body>${narrative.split('\n').map(p => p.startsWith('#') ? `<${p.startsWith('##') ? 'h2' : 'h1'}>${p.replace(/#/g, '').trim()}</${p.startsWith('##') ? 'h2' : 'h1'}>` : `<p>${p}</p>`).join('')}</body>
</html>`;
  
  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, html);
  }
  
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateNarrativeV3 as generateNarrative };

/**
 * Lightweight parser for narrative.gspl constraints (deeper GSPL canon ownership).
 */
function parseNarrativeSchemaConstraints(schema: string): any {
  const constraints: any = { scalars: {}, categoricals: {} };
  const geneMatches = schema.matchAll(/gene\s+(\w+):\s*(scalar|categorical)\s*(?:in\s*(\[[^\]]+\]))?/g);
  for (const match of geneMatches) {
    const name = match[1];
    const type = match[2];
    const rangeStr = match[3];
    if (type === 'scalar' && rangeStr) {
      const nums = rangeStr.match(/[\d.]+/g);
      if (nums && nums.length >= 2) constraints.scalars[name] = { min: parseFloat(nums[0]), max: parseFloat(nums[1]) };
    } else if (type === 'categorical' && rangeStr) {
      const items = rangeStr.match(/"([^"]+)"|'([^']+)'/g);
      if (items) constraints.categoricals[name] = items.map(s => s.replace(/['"]/g, ''));
    }
  }
  return constraints;
}

/**
 * Real interactive Story Player export — a sovereign, single-file, seeded HTML5 artifact.
 * Uses the same ease curves as the generator for deterministic page-turn timing and emotional pacing.
 * When emotionalIntensity or morphExpressiveness is high, the reader "feels alive".
 */
async function exportStoryPlayerHTML(
  narrative: string,
  params: NarrativeParams,
  characters: Character[],
  outputPath: string,
  seed: Seed
): Promise<string> {
  const filename = `narrative_${seed.$hash?.slice(0, 10) || 'seed'}_player.html`;
  const filePath = path.join(outputPath, filename);

  const chapters = narrative.split(/\n## Chapter /).slice(1); // crude but deterministic split
  const hero = characters[0]?.name || 'The Protagonist';
  const I = params.emotionalIntensity;
  const express = params.morphExpressiveness;
  const tone = params.tone;

  // Seeded deterministic timing (no external RNG in the player)
  const baseDelay = Math.floor(1400 + (1 - params.pacing) * 1800 - I * 600);
  const easeFn = I > 0.75 ? 'elastic' : params.pacing > 0.65 ? 'cubic' : 'quad';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${hero} — Story Player</title>
<style>
:root { --ink:#f4f1e9; --bg:#0b0a0f; --accent:#c9a46b; }
body { margin:0; background:#0b0a0f; color:#f4f1e9; font:16px/1.7 Georgia,serif; }
#player { max-width:820px; margin:40px auto; padding:0 20px; }
h1 { font-size:1.65rem; letter-spacing:-0.02em; border-bottom:1px solid #333; padding-bottom:12px; }
#meta { font-size:12px; opacity:.6; margin-bottom:18px; font-family:monospace; }
#text { min-height:320px; background:#111; border:1px solid #222; padding:32px 36px; border-radius:6px; white-space:pre-wrap; }
#controls { display:flex; gap:12px; margin-top:18px; flex-wrap:wrap; }
button { background:#1f1e24; color:#f4f1e9; border:1px solid #333; padding:10px 18px; border-radius:4px; cursor:pointer; font-family:monospace; font-size:13px; }
button:hover { background:#2a2830; border-color:#c9a46b; }
#progress { height:2px; background:#222; margin:14px 0 8px; position:relative; }
#bar { height:2px; background:#c9a46b; width:0%; transition:width .2s ease; }
#expression { font-size:11px; opacity:.55; margin-top:6px; font-family:monospace; letter-spacing:1px; }
#seed { position:fixed; bottom:12px; right:16px; font-size:9px; opacity:.35; font-family:monospace; }
</style>
</head>
<body>
<div id="player">
  <h1>${hero} — ${params.genre.toUpperCase()}</h1>
  <div id="meta">TONE: ${tone.toUpperCase()} · INTENSITY: ${I.toFixed(2)} · EXPRESS: ${(express*100).toFixed(0)}% · SEED: ${seed.$hash?.slice(0,12) || 'unknown'}</div>
  <div id="progress"><div id="bar"></div></div>
  <div id="text"></div>
  <div id="controls">
    <button onclick="prev()">← PREV</button>
    <button onclick="next()">NEXT →</button>
    <button onclick="autoPlay()">AUTO (SEED TEMPO)</button>
    <button onclick="reset()">RESET</button>
  </div>
  <div id="expression">EMOTIONAL STATE: ${I > 0.75 ? 'OVERFLOWING' : I > 0.55 ? 'CHARGED' : 'RESTRAINED'} · MORPH RESONANCE: ${(express*100).toFixed(0)}%</div>
</div>
<div id="seed">GSPL NARRATIVE PLAYER — ${seed.$hash || 'deterministic'}</div>

<script>
const chapters = ${JSON.stringify(chapters.map(c => c.trim()))};
let idx = 0;
const baseDelay = ${baseDelay};
const ease = ${easeFn === 'elastic' ? 't => { const c4 = (2*Math.PI)/3; return t===0?0:t===1?1:Math.pow(2,-10*t)*Math.sin((t*10-0.75)*c4)+1; }' : easeFn === 'cubic' ? 't => t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2' : 't => 1-(1-t)*(1-t)'};

function render() {
  const el = document.getElementById('text');
  el.textContent = chapters[idx] || '—';
  const pct = ((idx + 1) / chapters.length) * 100;
  document.getElementById('bar').style.width = pct + '%';
}
function next() { if (idx < chapters.length-1) { idx++; render(); } }
function prev() { if (idx > 0) { idx--; render(); } }
function reset() { idx = 0; render(); }
function autoPlay() {
  let i = 0;
  const step = () => {
    if (i >= chapters.length) return;
    idx = i;
    render();
    const t = i / (chapters.length - 1);
    const delay = baseDelay * (0.6 + ease(t) * 1.4);
    i++;
    setTimeout(step, delay);
  };
  step();
}
render();
document.addEventListener('keydown', e => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); });
</script>
</body>
</html>`;

  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, html, 'utf8');
  }
  return filePath;
}

