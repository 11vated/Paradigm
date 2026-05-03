/**
 * Journalism Generator — produces journalism content
 * News articles, investigative reports, features
 * $0.1T market: Journalism
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface JournalismParams {
  articleType: 'news' | 'investigative' | 'feature' | 'opinion';
  wordCount: number;
  sources: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateJournalism(seed: Seed, outputPath: string): Promise<{ filePath: string; articlePath: string; articleType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    journalism: { articleType: params.articleType, wordCount: params.wordCount, sources: params.sources, quality: params.quality },
    content: { headline: `${params.articleType.charAt(0).toUpperCase() + params.articleType.slice(1)} Headline ${rng.nextInt(1, 100)}`, lead: 'Lead paragraph...', body: 'Article body...', conclusion: 'Conclusion...' },
    sources: Array.from({ length: params.sources }, (_, i) => ({ id: i+1, type: ['interview', 'document', 'expert', 'data'][rng.nextInt(0, 3)], reliability: rng.nextF64() })),
    publishing: { outlet: ['NYT', 'WP', 'Guardian', 'Reuters'][rng.nextInt(0, 3)], byline: `By Reporter ${rng.nextInt(1, 100)}`, date: `2026-0${rng.nextInt(1,9)}-${rng.nextInt(10,28)}` }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_journalism.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const articlePath = outputPath.replace(/\.json$/, '_article.md');
  fs.writeFileSync(articlePath, `# ${config.content.headline}\n\n${config.content.lead}\n\n${config.content.body}\n\nParadigm GSPL — Journalism`);

  return { filePath: jsonPath, articlePath, articleType: params.articleType };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): JournalismParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    articleType: seed.genes?.articleType?.value || ['news', 'investigative', 'feature', 'opinion'][rng.nextInt(0, 3)],
    wordCount: Math.floor(((seed.genes?.wordCount?.value as number || rng.nextF64()) * 4900) + 100),
    sources: Math.floor(((seed.genes?.sources?.value as number || rng.nextF64()) * 48) + 2),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
