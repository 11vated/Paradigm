/**
 * Narrative Generator — produces story text and structure files
 * Generates narrative content based on seed genes
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface NarrativeParams {
  structure: string;
  tone: string;
  characters: string[];
  plot: string;
  acts: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateNarrative(seed: Seed, outputPath: string): Promise<{ filePath: string; wordCount: number; acts: number }> {
  const params = extractParams(seed);

  // Generate narrative content
  const narrative = buildNarrative(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write text file
  const txtPath = outputPath.replace(/\.gltf$/, '.txt');
  fs.writeFileSync(txtPath, narrative.content);

  // Write metadata JSON
  const jsonPath = outputPath.replace(/\.gltf$/, '_meta.json');
  fs.writeFileSync(jsonPath, JSON.stringify(narrative.metadata, null, 2));

  return {
    filePath: txtPath,
    wordCount: narrative.wordCount,
    acts: params.acts
  };
}

function buildNarrative(params: NarrativeParams): { content: string; metadata: any; wordCount: number } {
  const { structure, tone, characters, plot, acts } = params;

  let content = `# ${plot.charAt(0).toUpperCase() + plot.slice(1)} Story\n\n`;
  content += `**Structure:** ${structure}\n`;
  content += `**Tone:** ${tone}\n`;
  content += `**Characters:** ${characters.join(', ')}\n\n`;

  // Generate acts
  for (let act = 1; act <= acts; act++) {
    content += `## Act ${act}\n\n`;

    switch (structure) {
      case 'heros_journey':
        content += generateHerosJourneyAct(act, characters, plot, tone);
        break;
      case 'three_act':
        content += generateThreeActStructure(act, characters, plot, tone);
        break;
      default:
        content += generateGenericAct(act, characters, plot, tone);
    }

    content += '\n\n';
  }

  const wordCount = content.split(/\s+/).length;

  return {
    content,
    metadata: {
      structure,
      tone,
      characters,
      plot,
      acts,
      wordCount,
      estimatedReadTime: `${Math.ceil(wordCount / 200)} min`
    },
    wordCount
  };
}

function generateHerosJourneyAct(act: number, characters: string[], plot: string, tone: string): string {
  const hero = characters[0] || 'the hero';
  const villain = characters[1] || 'the villain';

  const actContent: Record<number, string> = {
    1: `In the ordinary world, ${hero} lives a peaceful life. But destiny calls when ${villain} threatens the land with ${plot}.`,
    2: `${hero} crosses the threshold into the unknown, facing trials that test courage and wisdom. Allies are made, enemies revealed.`,
    3: `The ordeal begins as ${hero} confronts ${villain} in the final battle. The reward is victory, but at great cost. The return journey begins.`
  };

  return actContent[act] || `Act ${act} continues the journey...`;
}

function generateThreeActStructure(act: number, characters: string[], plot: string, tone: string): string {
  const protagonist = characters[0] || 'the protagonist';

  const actContent: Record<number, string> = {
    1: `The story begins with ${protagonist} facing an inciting incident. The world is established, and the ${plot} sets events in motion.`,
    2: `Complications arise as ${protagonist} pursues the goal. Obstacles mount, tension rises, and the middle builds toward crisis.`,
    3: `The climax resolves the ${plot}. ${protagonist} faces the final challenge, leading to resolution and a new equilibrium.`
  };

  return actContent[act] || `Act ${act} develops the story...`;
}

function generateGenericAct(act: number, characters: string[], plot: string, tone: string): string {
  return `In act ${act}, the story develops through ${plot}. Characters including ${characters.join(' and ')} face challenges and grow through their experiences.`;
}

function extractParams(seed: Seed): NarrativeParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    structure: seed.genes?.structure?.value || 'heros_journey',
    tone: seed.genes?.tone?.value || 'epic',
    characters: (() => {
      const c = seed.genes?.characters?.value || ['hero', 'villain'];
      return Array.isArray(c) ? c : ['hero', 'villain'];
    })(),
    plot: seed.genes?.plot?.value || 'quest',
    acts: typeof seed.genes?.acts?.value === 'number' ? seed.genes.acts.value : 3,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
