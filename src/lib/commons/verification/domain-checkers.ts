export interface CheckerResult {
  score: number;
  issues: string[];
  details: Record<string, unknown>;
}

export type DomainChecker = (artifact: Record<string, unknown>, description: string) => CheckerResult;

function extractNumericHint(desc: string, keywords: Record<string, number>): number | null {
  const lower = desc.toLowerCase();
  for (const [word, val] of Object.entries(keywords)) {
    if (lower.includes(word)) return val;
  }
  return null;
}

function statInRange(artifact: Record<string, unknown>, path: string[], min: number, max: number, label: string): string | null {
  let obj: unknown = artifact;
  for (const key of path) {
    if (!obj || typeof obj !== 'object') return null;
    obj = (obj as Record<string, unknown>)[key];
  }
  if (typeof obj === 'number') {
    if (obj < min) return `${label} ${obj} is below expected ${min}`;
    if (obj > max) return `${label} ${obj} is above expected ${max}`;
  }
  return null;
}

function checkStyle(artifact: Record<string, unknown>, desc: string): number {
  const lower = desc.toLowerCase();
  const styleMap: Record<string, string[]> = {
    dark: ['dark', 'noir', 'gothic', 'shadow', 'ominous'],
    vibrant: ['bright', 'cheerful', 'colorful', 'vibrant', 'neon'],
    minimal: ['minimal', 'clean', 'simple', 'modern', 'sleek'],
    organic: ['organic', 'natural', 'flowing', 'curved', 'earthy'],
    cyberpunk: ['cyber', 'tech', 'digital', 'neon', 'futuristic'],
  };

  let totalScore = 0;
  const renderHints = (artifact.render_hints as Record<string, unknown>) || {};
  const artifactMode = (renderHints.mode as string) || '';

  for (const [style, words] of Object.entries(styleMap)) {
    const descMatch = words.some(w => lower.includes(w));
    const artifactMatch = artifactMode.toLowerCase().includes(style) || lower.includes(style);
    if (descMatch && artifactMatch) totalScore += 0.2;
  }
  return Math.min(totalScore, 0.8);
}

const characterChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const stats = a.stats as Record<string, unknown> | undefined;

  if (stats) {
    const strengthHint = extractNumericHint(d, { strong: 0.8, weak: 0.2, mighty: 0.9, fragile: 0.2 });
    const agilityHint = extractNumericHint(d, { agile: 0.8, swift: 0.8, quick: 0.7, clumsy: 0.2, slow: 0.2 });
    const sizeHint = extractNumericHint(d, { tall: 0.8, huge: 0.9, large: 0.7, small: 0.3, tiny: 0.2 });

    if (strengthHint !== null) { const s = stats.strength as number; if (s !== undefined && s < strengthHint * 100 - 20) issues.push(`strength ${s} below expected ${Math.round(strengthHint * 100)}`); }
    if (agilityHint !== null) { const a2 = stats.agility as number; if (a2 !== undefined && a2 < agilityHint * 100 - 20) issues.push(`agility ${a2} below expected ${Math.round(agilityHint * 100)}`); }
    if (lower.includes('warrior') || lower.includes('fighter') || lower.includes('knight')) {
      if (stats.strength !== undefined && (stats.strength as number) < 40) issues.push('warrior should have strength >= 40');
    }
    if (lower.includes('mage') || lower.includes('wizard')) {
      if (stats.strength !== undefined && (stats.strength as number) > 80) issues.push('mage should not have excessive strength');
    }
    if (lower.includes('rogue') || lower.includes('thief') || lower.includes('assassin')) {
      if (stats.agility !== undefined && (stats.agility as number) < 50) issues.push('rogue should have agility >= 50');
    }
  }

  const archetype = a.archetype as string;
  if (archetype) {
    const archetypes = ['warrior', 'mage', 'rogue', 'knight', 'bard', 'ranger'];
    const mentioned = archetypes.filter(w => lower.includes(w));
    if (mentioned.length > 0 && !mentioned.some(w => archetype.toLowerCase().includes(w))) {
      issues.push(`description mentions ${mentioned.join('/')} but archetype is ${archetype}`);
    }
  }

  const styleScore = checkStyle(a, d);
  return { score: issues.length === 0 ? 0.7 + styleScore : 0.4 - issues.length * 0.1, issues, details: { styleScore } };
};

const musicChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const music = a.music as Record<string, unknown> | undefined;

  if (music) {
    if (lower.includes('fast') && typeof music.tempo === 'number' && music.tempo < 0.6) issues.push(`tempo ${music.tempo} too low for 'fast'`);
    if (lower.includes('slow') && typeof music.tempo === 'number' && music.tempo > 0.5) issues.push(`tempo ${music.tempo} too high for 'slow'`);
    if (lower.includes('major') && music.scale !== 'major') issues.push('description says major but scale is ' + music.scale);
    if (lower.includes('minor') && music.scale !== 'minor') issues.push('description says minor but scale is ' + music.scale);
    if ((lower.includes('jazz') || lower.includes('blues')) && typeof music.tempo === 'number' && music.tempo > 0.8) issues.push('jazz/blues tempo too high');
  }

  const styleScore = checkStyle(a, d);
  return { score: issues.length === 0 ? 0.7 + styleScore : 0.4 - issues.length * 0.1, issues, details: { styleScore } };
};

const spriteChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const visual = a.visual as Record<string, unknown> | undefined;

  if (visual) {
    const res = visual.resolution as number;
    if (res) {
      if (lower.includes('pixel') || lower.includes('8bit') || lower.includes('16bit') || lower.includes('retro')) {
        if (res > 64) issues.push(`pixel art resolution ${res} too high for retro style`);
      }
      if (lower.includes('hd') || lower.includes('high') && res < 64) issues.push(`resolution ${res} too low for HD`);
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.1, issues, details: {} };
};

const visual2dChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const visual = a.visual as Record<string, unknown> | undefined;

  if (visual) {
    const style = visual.style as string;
    if (style && lower.includes('abstract') && style !== 'abstract') issues.push('expected abstract style');
    if (lower.includes('landscape') && style && style !== 'landscape') issues.push('expected landscape style');
    if (lower.includes('portrait') && style && style !== 'portrait') issues.push('expected portrait style');
  }

  const styleScore = checkStyle(a, d);
  return { score: issues.length === 0 ? 0.7 + styleScore : 0.4 - issues.length * 0.1, issues, details: { styleScore } };
};

const proceduralChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const terrain = a.terrain as Record<string, unknown> | undefined;

  if (terrain) {
    const biome = terrain.biome as string;
    if (biome) {
      for (const b of ['mountain', 'desert', 'forest', 'tundra', 'ocean', 'temperate']) {
        if (lower.includes(b) && !biome.includes(b)) issues.push(`terrain biome is ${biome}, description mentions ${b}`);
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const narrativeChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const story = a.story as Record<string, unknown> | undefined;

  if (story) {
    const tone = story.tone as string;
    if (tone) {
      if (lower.includes('dark') || lower.includes('tragic')) {
        if (!['dark', 'tragic', 'noir'].includes(tone)) issues.push(`expected dark tone but got ${tone}`);
      }
      if (lower.includes('epic') || lower.includes('heroic')) {
        if (!['epic', 'heroic', 'grand'].includes(tone)) issues.push(`expected epic tone but got ${tone}`);
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const architectureChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const building = a.building as Record<string, unknown> | undefined;

  if (building) {
    const style = building.style as string;
    if (style) {
      const archStyles = ['modern', 'gothic', 'classical', 'brutalist', 'victorian', 'futuristic'];
      const mentioned = archStyles.filter(s => lower.includes(s));
      if (mentioned.length > 0 && !mentioned.includes(style)) {
        issues.push(`style is ${style}, description mentions ${mentioned.join('/')}`);
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const vehicleChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const vehicle = a.vehicle as Record<string, unknown> | undefined;

  if (vehicle) {
    const vType = vehicle.vehicleType as string;
    if (vType) {
      const typeMap: Record<string, string[]> = { car: ['car', 'sports'], ship: ['ship', 'boat', 'vessel'], drone: ['drone', 'uav'], cycle: ['cycle', 'motorcycle', 'bike'] };
      let mentionedMatch = false;
      for (const [t, words] of Object.entries(typeMap)) {
        if (words.some(w => lower.includes(w))) {
          if (vType === t) { mentionedMatch = true; break; }
        }
      }
      if (!mentionedMatch) {
        for (const [t, words] of Object.entries(typeMap)) {
          if (words.some(w => lower.includes(w)) && vType !== t) {
            issues.push(`expected ${t} vehicle but got ${vType}`);
            break;
          }
        }
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const fashionChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const garment = a.garment as Record<string, unknown> | undefined;

  if (garment) {
    const cType = garment.clothingType as string;
    if (cType) {
      const typeMap: Record<string, string[]> = { shirt: ['shirt', 'top'], pants: ['pants', 'trousers'], dress: ['dress', 'gown'], jacket: ['jacket', 'coat'], shoes: ['shoes', 'boots'] };
      let mentionedMatch = false;
      for (const [t, words] of Object.entries(typeMap)) {
        if (words.some(w => lower.includes(w))) {
          if (cType === t) { mentionedMatch = true; break; }
        }
      }
      if (!mentionedMatch) {
        for (const [t, words] of Object.entries(typeMap)) {
          if (words.some(w => lower.includes(w)) && cType !== t) {
            issues.push(`expected ${t} but got ${cType}`);
            break;
          }
        }
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const foodChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const food = a.food as Record<string, unknown> | undefined;

  if (food) {
    const fType = food.foodType as string;
    if (fType && !lower.includes(fType)) {
      for (const word of lower.split(/\s+/)) {
        if (['apple', 'ramen', 'pizza', 'cake', 'bread', 'steak', 'salad', 'soup', 'chocolate', 'ice cream', 'sushi', 'taco'].includes(word)) {
          if (!fType.includes(word)) issues.push(`expected ${word} but got ${fType}`);
          break;
        }
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const agentChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const config = a.config as Record<string, unknown> | undefined;

  if (config) {
    const persona = config.persona as string;
    if (persona) {
      const personaMap: Record<string, string[]> = {
        architect: ['architect', 'builder', 'designer'],
        artist: ['artist', 'painter', 'creative'],
        critic: ['critic', 'reviewer', 'evaluator'],
        explorer: ['explorer', 'discoverer', 'scout'],
        composer: ['composer', 'musician', 'writer'],
        analyst: ['analyst', 'analytical', 'researcher'],
      };
      let mentionedMatch = false;
      for (const [p, words] of Object.entries(personaMap)) {
        if (words.some(w => lower.includes(w))) {
          if (persona === p) { mentionedMatch = true; break; }
        }
      }
      if (!mentionedMatch) {
        for (const [p, words] of Object.entries(personaMap)) {
          if (words.some(w => lower.includes(w)) && persona !== p) {
            issues.push(`expected ${p} persona but got ${persona}`);
            break;
          }
        }
      }
    }
    if (lower.includes('creative') || lower.includes('imaginative')) {
      if (typeof config.temperature === 'number' && config.temperature < 0.5) issues.push('creative agent should have higher temperature');
    }
    if (lower.includes('precise') || lower.includes('logical')) {
      if (typeof config.temperature === 'number' && config.temperature > 0.5) issues.push('logical agent should have lower temperature');
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const gameChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const game = a.game as Record<string, unknown> | undefined;

  if (game) {
    const genre = game.genre as string;
    if (genre) {
      const genreMap: Record<string, string[]> = {
        platformer: ['platformer', 'jump'],
        puzzle: ['puzzle', 'brain'],
        shooter: ['shooter', 'fps', 'combat'],
        rpg: ['rpg', 'role', 'quest'],
        adventure: ['adventure', 'explore'],
        strategy: ['strategy', 'tactical', 'rts'],
        racing: ['racing', 'race', 'speed'],
        simulation: ['simulation', 'sim', 'builder'],
      };
      let mentionedMatch = false;
      for (const [g, words] of Object.entries(genreMap)) {
        if (words.some(w => lower.includes(w))) {
          if (genre === g) { mentionedMatch = true; break; }
        }
      }
      if (!mentionedMatch) {
        for (const [g, words] of Object.entries(genreMap)) {
          if (words.some(w => lower.includes(w)) && genre !== g) {
            issues.push(`expected ${g} genre but got ${genre}`);
            break;
          }
        }
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const ecosystemChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const eco = a.ecosystem as Record<string, unknown> | undefined;

  if (eco) {
    if (typeof eco.speciesCount === 'number') {
      if (lower.includes('rich') || lower.includes('diverse')) {
        if (eco.speciesCount < 15) issues.push(`species count ${eco.speciesCount} low for diverse ecosystem`);
      }
      if (lower.includes('simple') || lower.includes('sparse')) {
        if (eco.speciesCount > 10) issues.push(`species count ${eco.speciesCount} high for simple ecosystem`);
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const animationChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const anim = a.animation as Record<string, unknown> | undefined;

  if (anim) {
    if (typeof anim.fps === 'number') {
      if (lower.includes('smooth') && anim.fps < 30) issues.push(`fps ${anim.fps} too low for smooth animation`);
      if (lower.includes('slow') && anim.fps > 20) issues.push(`fps ${anim.fps} too high for slow animation`);
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const choreographyChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const dance = a.dance as Record<string, unknown> | undefined;

  if (dance) {
    const style = dance.style as string;
    if (style) {
      const styleMap: Record<string, string[]> = {
        ballet: ['ballet', 'graceful'],
        contemporary: ['contemporary', 'modern'],
        hiphop: ['hiphop', 'hip hop', 'street'],
        salsa: ['salsa', 'latin'],
        breakdance: ['breakdance', 'break', 'b-boy'],
      };
      let mentionedMatch = false;
      for (const [s, words] of Object.entries(styleMap)) {
        if (words.some(w => lower.includes(w))) {
          if (style === s) { mentionedMatch = true; break; }
        }
      }
      if (!mentionedMatch) {
        for (const [s, words] of Object.entries(styleMap)) {
          if (words.some(w => lower.includes(w)) && style !== s) {
            issues.push(`expected ${s} dance style but got ${style}`);
            break;
          }
        }
      }
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const alifeChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const sim = a.simulation as Record<string, unknown> | undefined;

  if (sim) {
    const env = sim.environment as string;
    if (env) {
      if (lower.includes('forest') && env !== 'forest') issues.push(`expected forest environment but got ${env}`);
      if (lower.includes('desert') && env !== 'desert') issues.push(`expected desert environment but got ${env}`);
      if (lower.includes('ocean') && env !== 'ocean') issues.push(`expected ocean environment but got ${env}`);
    }
    if (lower.includes('conway') || lower.includes('game of life')) {
      if (typeof sim.mutationRate === 'number' && sim.mutationRate > 0.01) issues.push('conway should have near-zero mutation rate');
    }
  }

  return { score: issues.length === 0 ? 0.75 : 0.4 - issues.length * 0.15, issues, details: {} };
};

const genericChecker: DomainChecker = (a, d) => {
  const issues: string[] = [];
  const lower = d.toLowerCase();
  const styleScore = checkStyle(a, d);

  const name = (a.name as string) || '';
  if (name && !lower.includes(name.toLowerCase()) && name.length > 3) {
    const words = lower.split(/\s+/).filter(w => w.length > 3);
    if (words.length > 0 && !words.some(w => name.toLowerCase().includes(w))) {
      // mild mismatch, not severe
    }
  }

  return { score: 0.5 + styleScore, issues, details: { styleScore } };
};

export const DOMAIN_CHECKERS: Record<string, DomainChecker> = {
  character: characterChecker,
  sprite: spriteChecker,
  music: musicChecker,
  visual2d: visual2dChecker,
  procedural: proceduralChecker,
  fullgame: gameChecker,
  animation: animationChecker,
  geometry3d: genericChecker,
  narrative: narrativeChecker,
  ui: genericChecker,
  physics: genericChecker,
  audio: genericChecker,
  ecosystem: ecosystemChecker,
  game: gameChecker,
  alife: alifeChecker,
  shader: genericChecker,
  particle: genericChecker,
  typography: genericChecker,
  architecture: architectureChecker,
  vehicle: vehicleChecker,
  furniture: genericChecker,
  fashion: fashionChecker,
  robotics: genericChecker,
  circuit: genericChecker,
  food: foodChecker,
  choreography: choreographyChecker,
  agent: agentChecker,
};

export function getDomainChecker(domain: string): DomainChecker {
  return DOMAIN_CHECKERS[domain] || genericChecker;
}
