/**
 * Narrative Generator — produces enhanced story with metadata
 * Generates narrative with structure analysis
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

export async function generateNarrativeEnhanced(seed: Seed, outputPath: string): Promise<{ filePath: string; wordCount: number; acts: number }> {
  const params = extractParams(seed);

  // Generate narrative content
  const narrative = buildEnhancedNarrative(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write enhanced text file
  const txtPath = outputPath.replace(/\.txt$/, '_enhanced.txt');
  fs.writeFileSync(txtPath, narrative.content);

  // Write detailed metadata JSON
  const jsonPath = outputPath.replace(/\.txt$/, '_meta.json');
  fs.writeFileSync(jsonPath, JSON.stringify(narrative.metadata, null, 2));

  return {
    filePath: txtPath,
    wordCount: narrative.wordCount,
    acts: params.acts
  };
}

function buildEnhancedNarrative(params: NarrativeParams): { content: string; metadata: any; wordCount: number } {
  const { structure, tone, characters, plot, acts } = params;

  let content = `# ${plot.charAt(0).toUpperCase() + plot.slice(1)} Story\n\n`;
  content += `**Structure:** ${structure}\n`;
  content += `**Tone:** ${tone}\n`;
  content += `**Characters:** ${characters.join(', ')}\n\n`;

  // Generate acts with enhanced descriptions
  for (let act = 1; act <= acts; act++) {
    content += `## Act ${act}\n\n`;

    switch (structure) {
      case 'heros_journey':
        content += generateHeroJourneyAct(act, characters, plot, tone);
        break;
      case 'three_act':
        content += generateThreeActStructure(act, characters, plot, tone);
        break;
      default:
        content += generateGenericAct(act, characters, plot, tone);
    }

    content += '\n\n';
  }

  // Add enhanced sections
  content += `\n\n## Analysis\n\n`;
  content += `**Word Count:** ${content.split(/\s+/).length}\n`;
  content += `**Reading Time:** ${Math.ceil(content.split(/\s+/).length / 200)} minutes\n`;
  content += `**Theme:** ${analyzeTheme(plot, tone)}\n`;
  content += `**Character Arc:** ${characters[0]} transforms through ${acts} acts\n`;

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
      estimatedReadTime: `${Math.ceil(wordCount / 200)} min`,
      theme: analyzeTheme(plot, tone),
      characterArc: `${characters[0]} → Hero's transformation`,
      genre: determineGenre(plot),
    },
    wordCount
  };
}

function generateHeroJourneyAct(act: number, characters: string[], plot: string, tone: string): string {
  const hero = characters[0] || 'the hero';
  const villain = characters[1] || 'the villain';

  const actContent: Record<number, string> = {
    1: `In the ordinary world, ${hero} lives a peaceful life. But destiny calls when ${villain} threatens the land with ${plot}.\n\nThe Call to Adventure comes unexpectedly. ${hero} must decide whether to embark on this perilous journey.`,
    2: `Crossing the Threshold: ${hero} enters the Special World. Here, ${hero} faces trials that test courage and wisdom. Allies are made, enemies revealed.\n\nThe Inmost Cave holds the greatest challenge. ${hero} must confront inner demons before facing ${villain}.`,
    3: `The Ordeal begins as ${hero} confronts ${villain} in the final battle. The Reward is victory, but at great cost.\n\nThe Road Back leads home, but ${hero} is changed forever. The Resurrection comes as ${hero} faces final test and returns with the Elixir — a boon to share with the world.`
  };

  return actContent[act] || `${hero} continues the journey in Act ${act}...`;
}

function generateThreeActStructure(act: number, characters: string[], plot: string, tone: string): string {
  const protagonist = characters[0] || 'the protagonist';

  const actContent: Record<number, string> = {
    1: `The story begins with ${protagonist} facing an inciting incident. The world is established, and the ${plot} sets events in motion.\n\nWe learn about ${protagonist}'s ordinary world and the stakes involved.`,
    2: `Complications arise as ${protagonist} pursues the goal. Obstacles mount, tension rises, and the middle builds toward crisis.\n\nThe Midpoint shifts the story. ${protagonist} realizes what must be done and commits fully to the journey.`,
    3: `The Climax resolves the ${plot}. ${protagonist} faces the final challenge, leading to resolution and a new equilibrium.\n\nThe Denouement shows how the world has changed, and how ${protagonist} has grown through the experience.`
  };

  return actContent[act] || `Act ${act} develops the story further...`;
}

function generateGenericAct(act: number, characters: string[], plot: string, tone: string): string {
  return `In act ${act}, the story develops through ${plot}. Characters including ${characters.join(' and ')} face challenges and grow through their experiences.\n\nThe tone remains ${tone} as the narrative unfolds with unexpected twists and meaningful character development.`;
}

function analyzeTheme(plot: string, tone: string): string {
  const themes: Record<string, string> = {
    'quest': 'Self-discovery and heroism',
    'revenge': 'Justice and redemption',
    'love': 'Connection and sacrifice',
    'mystery': 'Truth and perception',
    'adventure': 'Growth through exploration'
  };
  return themes[plot] || 'Human experience and transformation';
}

function determineGenre(plot: string): string {
  if (plot.includes('quest') || plot.includes('adventure')) return 'Adventure';
  if (plot.includes('murder') || plot.includes('mystery')) return 'Mystery';
  if (plot.includes('love')) return 'Romance';
  return 'Drama';
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
