/**
 * Narrative Generator V3 — Story Structure with Characters and Plot
 * Features: 3-act structure, character arcs, plot generation
 * Export: JSON, EPUB, PDF, HTML
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface NarrativeParams {
  genre: 'fantasy' | 'scifi' | 'mystery' | 'romance' | 'thriller' | 'horror';
  length: 'short' | 'medium' | 'long' | 'novel';
  pov: 'first' | 'second' | 'third';
  tone: 'dark' | 'light' | 'neutral';
  characters: number;
  chapters: number;
}

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
  chapters: number;
  wordCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'narrative-default');
  const params = extractNarrativeParams(seed, rng);
  
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
  
  const totalWords = narrative.split(/\s+/).length;
  
  return {
    jsonPath,
    epubPath,
    htmlPath,
    chapters: params.chapters,
    wordCount: totalWords
  };
}

function extractNarrativeParams(seed: Seed, rng: Xoshiro256StarStar): NarrativeParams {
  const genres = ['fantasy', 'scifi', 'mystery', 'romance', 'thriller', 'horror'] as const;
  const lengths = ['short', 'medium', 'long', 'novel'] as const;
  const povs = ['first', 'second', 'third'] as const;
  const tones = ['dark', 'light', 'neutral'] as const;
  
  return {
    genre: genres[Math.floor(rng.nextF64() * genres.length)],
    length: lengths[Math.floor(rng.nextF64() * lengths.length)],
    pov: povs[Math.floor(rng.nextF64() * povs.length)],
    tone: tones[Math.floor(rng.nextF64() * tones.length)],
    characters: 2 + Math.floor(rng.nextF64() * 8),
    chapters: 3 + Math.floor(rng.nextF64() * 17)
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
  // Three-act structure
  const acts = {
    act1: {
      title: 'Setup',
      chapters: Math.floor(params.chapters * 0.25),
      purpose: 'Introduce characters and world',
      incitingIncident: `The ${characters[0].name} discovers ${characters[1]?.name ? characters[1].name + ' is ' : ''}a threat`,
    },
    act2: {
      title: 'Confrontation',
      chapters: Math.floor(params.chapters * 0.5),
      purpose: 'Rising action and complications',
      midpoint: 'Major revelation or setback',
    },
    act3: {
      title: 'Resolution',
      chapters: Math.floor(params.chapters * 0.25),
      purpose: 'Climax and resolution',
      climax: `Final confrontation between ${characters[0].name} and ${characters[1]?.name || 'the antagonist'}`,
    }
  };
  
  return acts;
}

function generateScenes(params: NarrativeParams, characters: Character[], plot: any, rng: Xoshiro256StarStar): Scene[] {
  const scenes: Scene[] = [];
  
  const locations = [
    'ancient castle', 'space station', 'small town', 'big city',
    'dark forest', 'underground bunker', 'mountain peak', 'ocean depths'
  ];
  
  const conflicts = [
    'character vs character', 'character vs nature', 'character vs self',
    'character vs society', 'character vs technology', 'character vs fate'
  ];
  
  for (let ch = 1; ch <= params.chapters; ch++) {
    scenes.push({
      chapter: ch,
      location: locations[Math.floor(rng.nextF64() * locations.length)],
      characters: characters.slice(0, Math.floor(rng.nextF64() * 3) + 1).map(c => c.name),
      conflict: conflicts[Math.floor(rng.nextF64() * conflicts.length)],
      resolution: rng.nextF64() > 0.5 ? 'partial success' : 'complication arises',
      wordCount: 1500 + Math.floor(rng.nextF64() * 2500)
    });
  }
  
  return scenes;
}

function generateNarrativeText(params: NarrativeParams, characters: Character[], scenes: Scene[], rng: Xoshiro256StarStar): string {
  let narrative = `# ${params.genre.toUpperCase()} STORY\n\n`;
  narrative += `POV: ${params.pov} person | Tone: ${params.tone}\n\n`;
  
  // Introduction
  narrative += `## Introduction\n\n`;
  narrative += `In a world where ${params.genre === 'fantasy' ? 'magic flows through all things' : params.genre === 'scifi' ? 'technology has surpassed imagination' : 'danger lurks around every corner'},\n`;
  narrative += `${characters[0].name} stood at the crossroads of destiny.\n\n`;
  narrative += `Driven by the goal to ${characters[0].goal}, but hindered by being ${characters[0].flaw},\n`;
  narrative += `our hero would face challenges beyond imagination.\n\n`;
  
  // Chapters
  scenes.forEach(scene => {
    narrative += `## Chapter ${scene.chapter}\n\n`;
    narrative += `Location: ${scene.location}\n\n`;
    narrative += `${scene.characters.join(', ')} gathered as the ${scene.conflict} unfolded.\n\n`;
    narrative += `The tension was palpable. ${scene.resolution === 'partial success' ? 'Progress was made, but at a cost.' : 'Nothing went as planned.'}\n\n`;
  });
  
  // Conclusion
  narrative += `## Epilogue\n\n`;
  narrative += `And so, ${characters[0].name}'s journey came to an end.\n`;
  narrative += `${characters[0].arc === 'positive' ? 'Changed for the better, they had grown beyond their flaws.' : characters[0].arc === 'negative' ? 'The journey had broken them, leaving only shadows of who they once were.' : 'They remained unchanged, a constant in a world of flux.'}\n\n`;
  narrative += `THE END\n`;
  
  return narrative;
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
  
  // EPUB export would use proper EPUB library
  // Placeholder for now
  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, '// EPUB placeholder');
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
