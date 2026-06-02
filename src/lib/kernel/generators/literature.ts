/**
 * Literature Generator — produces literary works
 * Novels, poetry, short stories, essays
 * $0.1T market: Publishing (literature)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface LiteratureParams {
  genre: 'novel' | 'poetry' | 'short_story' | 'essay' | 'biography';
  wordCount: number;
  chapters: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateLiterature(seed: Seed, outputPath: string): Promise<{ filePath: string; manuscriptPath: string; storyPath: string; genre: string; wordCount: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    literature: { genre: params.genre, wordCount: params.wordCount, chapters: params.chapters, quality: params.quality },
    narrative: { pov: ['first', 'second', 'third_limited', 'third_omniscient'][rng.nextInt(0, 3)], tense: ['past', 'present', 'future'][rng.nextInt(0, 2)], theme: ['love', 'death', 'adventure', 'mystery', 'coming_of_age'][rng.nextInt(0, 4)] },
    characters: Array.from({ length: Math.floor(rng.nextF64() * 20) + 3 }, (_, i) => ({ name: `Character ${i+1}`, role: ['protagonist', 'antagonist', 'supporting'][rng.nextInt(0, 2)], arc: rng.nextF64() > 0.5 })),
    publishing: { format: ['print', 'ebook', 'audiobook'][rng.nextInt(0, 2)], isbn: `978-${rng.nextInt(1000000000, 9999999999)}`, advance: rng.nextF64() * 100000 + 1000 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_literature.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const manuscriptPath = outputPath.replace(/\.json$/, '_manuscript.txt');
  const manuscriptContent = generateRichManuscript(params, rng);
  fs.writeFileSync(manuscriptPath, manuscriptContent);

  const storyPath = manuscriptPath;

  return { filePath: jsonPath, manuscriptPath, storyPath, genre: params.genre, wordCount: params.wordCount };
}

function generateRichManuscript(params: LiteratureParams, rng: Xoshiro256StarStar): string {
  const title = deriveSeededTitle(params.genre, rng);
  const protagonist = deriveName(rng, 1);
  const foil = deriveName(rng, 2);
  const setting = deriveSetting(params.genre, rng);
  const theme = deriveTheme(params.genre, rng);
  const numChapters = Math.max(1, Math.min(params.chapters, 5));

  let text = `TITLE: ${title}\n`;
  text += `Genre: ${params.genre.toUpperCase()}\n`;
  text += `Word Count Target: ${params.wordCount}\nChapters: ${params.chapters}\nQuality: ${params.quality}\n`;
  text += `Author: Paradigm GSPL Deterministic Engine\n\n`;
  text += `Copyright (c) 2026 Paradigm Absolute — All Rights Reserved. This artifact is bit-identical for the given seed hash.\n\n`;
  text += `═══════════════════════════════════════════════════════════════\n\n`;

  const targetWords = Math.max(2100, Math.min(params.wordCount, 4500));

  if (params.genre === 'poetry') {
    text += generatePoetryCycle(title, protagonist, setting, theme, rng, targetWords);
  } else if (params.genre === 'essay') {
    text += generateCriticalEssay(title, theme, setting, rng, targetWords);
  } else if (params.genre === 'biography') {
    text += generateBiography(title, protagonist, foil, rng, targetWords);
  } else {
    text += `PROLOGUE\n\n`;
    text += generateNarrativePassage(protagonist, foil, setting, theme, rng, 260) + `\n\n`;
    for (let ch = 1; ch <= numChapters; ch++) {
      const chapterTitle = deriveChapterTitle(ch, rng);
      text += `\nCHAPTER ${ch}: ${chapterTitle}\n\n`;
      const chapterWords = Math.floor(targetWords / numChapters);
      text += generateChapter(ch, protagonist, foil, setting, theme, params.genre, rng, chapterWords);
    }
    text += `\n\nEPILOGUE\n\n`;
    text += generateNarrativePassage(protagonist, foil, setting, theme, rng, 210) + `\n\n`;
  }

  text += `\n\n═══════════════════════════════════════════════════════════════\n`;
  text += `END OF MANUSCRIPT\nParadigm GSPL — Literature • Deterministic • Seed-bound • Infinite Composition\n`;
  return text;
}

function deriveSeededTitle(genre: string, rng: Xoshiro256StarStar): string {
  const prefixes = ['The Last', 'Echoes of', 'A Season of', 'The Geometry of', 'Shadows Upon', 'The Weight of', 'Fragments of', 'Beneath the'];
  const nouns = ['Silence', 'Light', 'Ashes', 'Horizon', 'Memory', 'Veil', 'Forge', 'Garden', 'Machine', 'River'];
  const suffix = genre === 'poetry' ? ' and Other Poems' : (genre === 'biography' ? ' — A Life' : '');
  const p = prefixes[rng.nextInt(0, prefixes.length - 1)];
  const n = nouns[rng.nextInt(0, nouns.length - 1)];
  return `${p} ${n}${suffix}`;
}

function deriveName(rng: Xoshiro256StarStar, salt: number): string {
  const first = ['Elias', 'Mira', 'Soren', 'Liora', 'Kael', 'Nadia', 'Theo', 'Selene', 'Riven', 'Asha'][rng.nextInt(0, 9)];
  const last = ['Voss', 'Kade', 'Solari', 'Draven', 'Quell', 'Morrow', 'Strand', 'Vale', 'Raine', 'Thorne'][rng.nextInt(0, 9)];
  return salt % 2 === 0 ? `${first} ${last}` : `${last}, ${first}`;
}

function deriveSetting(genre: string, rng: Xoshiro256StarStar): string {
  const places = genre === 'poetry' ? ['the salt marshes', 'an abandoned observatory', 'the winding canals at dusk', 'a library that forgets its visitors'] :
    ['a rain-lashed coastal city', 'the high desert plateaus', 'a floating archive above the clouds', 'the subterranean rail nexus of New Babel', 'the overgrown orbital ring'];
  return places[rng.nextInt(0, places.length - 1)];
}

function deriveTheme(genre: string, rng: Xoshiro256StarStar): string {
  const t = ['redemption through sacrifice', 'the cost of memory', 'forbidden knowledge and its keepers', 'love that outlives empires', 'the machine that learned to grieve', 'identity in a world of copies'][rng.nextInt(0, 5)];
  return t;
}

function deriveChapterTitle(ch: number, rng: Xoshiro256StarStar): string {
  const beats = ['The Threshold', 'The Fracture', 'The Long Night', 'The Reckoning', 'The Mirror', 'The Departure', 'The Convergence', 'The Unmaking'];
  return beats[rng.nextInt(0, beats.length - 1)] + (ch > 3 ? ` — Part ${ch}` : '');
}

function generateNarrativePassage(prot: string, foil: string, setting: string, theme: string, rng: Xoshiro256StarStar, wordBudget: number): string {
  const sentences: string[] = [];
  const descriptors = ['luminous', 'fractured', 'unyielding', 'ephemeral', 'hollowed', 'resonant', 'ashen', 'verdant', 'mercurial', 'implacable'];
  const verbs = ['witnessed', 'forsook', 'carried', 'unraveled', 'reclaimed', 'inscribed', 'shattered', 'kindled', 'erased', 'restored'];
  const emotions = ['grief', 'wonder', 'fury', 'longing', 'dread', 'ecstasy', 'regret', 'awe'];

  let built = 0;
  while (built < wordBudget) {
    const d = descriptors[rng.nextInt(0, descriptors.length - 1)];
    const v = verbs[rng.nextInt(0, verbs.length - 1)];
    const e = emotions[rng.nextInt(0, emotions.length - 1)];
    const line = `${prot} ${v} the ${d} ${setting} where ${theme.split(' ')[0]} had once ${rng.nextF64() > 0.5 ? 'flourished' : 'died'}. The ${e} clung to every surface like ${['fog', 'dust', 'salt', 'light'][rng.nextInt(0, 3)]}.`;
    sentences.push(line);
    built += line.split(/\s+/).length;
    if (rng.nextF64() > 0.6) {
      sentences.push(`"${foil} would never understand," ${prot.split(',')[0]} murmured, voice raw as ${['winter bark', 'rusted iron', 'distant thunder'][rng.nextInt(0, 2)]}.`);
      built += 9;
    }
  }
  return sentences.join(' ');
}

function generateChapter(chNum: number, prot: string, foil: string, setting: string, theme: string, genre: string, rng: Xoshiro256StarStar, target: number): string {
  let ch = '';
  const beats = Math.max(3, Math.floor(target / 170));
  for (let b = 0; b < beats; b++) {
    const tension = (chNum + b) % 3 === 0 ? 'climax' : (b === 0 ? 'setup' : 'rising');
    ch += generateNarrativePassage(prot, foil, setting, theme, rng, 88) + ' ';
    if (tension === 'rising' && rng.nextF64() > 0.4) {
      ch += `\n\n${prot.split(',')[0]} turned to ${foil.split(',')[0]}. "We were never meant to ${['survive this', 'remember what we lost', 'outlast the forgetting'][rng.nextInt(0, 2)]}." The words hung between them, heavier than the ${['sea', 'sky', 'silence'][rng.nextInt(0, 2)]}.\n\n`;
    }
    if (tension === 'climax') {
      ch += `\nIn that ${['moment', 'collapse', 'revelation'][rng.nextInt(0, 2)]}, the ${theme.split(' ').slice(-1)[0]} became undeniable. ${prot.split(',')[0]} chose.\n\n`;
    }
    if (ch.split(/\s+/).length > target) break;
  }
  if (genre === 'mystery' || genre === 'short_story') {
    ch += `The final clue lay not in the ${setting} but in the contradiction ${prot.split(',')[0]} had carried all along.\n`;
  }
  return ch.trim();
}

function generatePoetryCycle(title: string, prot: string, setting: string, theme: string, rng: Xoshiro256StarStar, target: number): string {
  let p = `${title}\n\n`;
  const stanzas = Math.max(7, Math.floor(target / 52));
  const linesPool = [
    'In the ${setting} the ${prot} walks alone,',
    'carrying ${theme} like a stone in the throat.',
    'Every ${d} wind remembers what we chose to forget.',
    'The ${foil} waits at the edge of light,',
    'neither enemy nor savior, only witness.',
    'We are the ${e} that the ${setting} keeps returning.',
    'No map survives the ${v} of years.',
    'Yet here, at the ${n} of the world, we begin again.'
  ];
  for (let s = 0; s < stanzas; s++) {
    p += '\n';
    for (let l = 0; l < 4 + rng.nextInt(0, 2); l++) {
      let line = linesPool[rng.nextInt(0, linesPool.length - 1)]
        .replace('${setting}', setting)
        .replace('${prot}', prot.split(',')[0])
        .replace('${theme}', theme)
        .replace('${foil}', 'the mirror-self')
        .replace('${d}', ['salt', 'ashen', 'mercurial'][rng.nextInt(0, 2)])
        .replace('${e}', ['hunger', 'echo', 'fracture'][rng.nextInt(0, 2)])
        .replace('${v}', ['unraveling', 'inventory', 'toll'][rng.nextInt(0, 2)])
        .replace('${n}', ['threshold', 'heart', 'end'][rng.nextInt(0, 2)]);
      p += line + '\n';
    }
    p += '\n';
    if (p.split(/\s+/).length > target) break;
  }
  return p;
}

function generateCriticalEssay(title: string, theme: string, setting: string, rng: Xoshiro256StarStar, target: number): string {
  let e = `${title}\n\n`;
  e += `The ${theme} is not a question of aesthetics but of survival. In ${setting}, every artifact carries the residue of decisions made before language hardened into law.\n\n`;
  const sections = ['I. The Premise', 'II. The Counter-Argument', 'III. The Evidence of Ruins', 'IV. The Necessary Conclusion'];
  for (const sec of sections) {
    e += `${sec}\n\n`;
    e += generateNarrativePassage('The observer', 'the archive', setting, theme, rng, 105) + '\n\n';
    e += `What ${['remains', 'resists', 'returns'][rng.nextInt(0, 2)]} is the ${theme.split(' ')[0]} that refuses erasure. This is not metaphor. It is infrastructure.\n\n`;
  }
  e += `In the end, the ${setting} does not forgive. It only records.\n`;
  return e;
}

function generateBiography(title: string, prot: string, foil: string, rng: Xoshiro256StarStar, target: number): string {
  let b = `${title}\n\n`;
  b += `Born in the margins of ${['a collapsing republic', 'an orbital failure', 'the last analog city'][rng.nextInt(0, 2)]}, ${prot.split(',')[0]} learned early that names are contracts we sign with the dead.\n\n`;
  const eras = ['The Early Silence (Age 7–19)', 'The First Fracture', 'The Long Apprenticeship', 'The Public Reckoning', 'The Final Transmission'];
  for (const era of eras) {
    b += `${era}\n`;
    b += generateNarrativePassage(prot.split(',')[0], foil.split(',')[0], 'the archives', 'the cost of memory', rng, 68) + '\n';
    b += `Against ${foil.split(',')[0]}, ${prot.split(',')[0]} discovered that victory and loss wear the same face at midnight.\n\n`;
  }
  b += `The record ends not with death but with the question ${prot.split(',')[0]} left unanswered: what remains when the last witness is gone?\n`;
  return b;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): LiteratureParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  return {
    genre: seed.genes?.genre?.value || ['novel', 'poetry', 'short_story', 'essay', 'biography'][rng.nextInt(0, 4)],
    wordCount: Math.floor(((seed.genes?.wordCount?.value as number || rng.nextF64()) * 99000) + 1000),
    chapters: Math.floor(((seed.genes?.chapters?.value as number || rng.nextF64()) * 48) + 2),
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}
