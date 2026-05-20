#!/usr/bin/env -S npx tsx
/**
 * Game demo — Friend × World → Quest → Game.
 */
import { createFriendSeed } from '../src/lib/friend/genesis';
import { createWorldSeed } from '../src/lib/world/genesis';
import { composeQuest } from '../src/lib/world/quest';
import { generateWorld } from '../src/lib/world/generator';
import { createGameSeed, generateGame } from '../src/lib/game';

const friends = ['nori-the-curious', 'iris', 'wren-the-quiet'];
const worlds  = ['vellichor', 'iron-marsh', 'thrice-fallen'];

for (let i = 0; i < 3; i++) {
  const f = createFriendSeed(friends[i]);
  const w = createWorldSeed(worlds[i]);
  const wArt = generateWorld(w);
  const q = composeQuest(f, w);
  const gSeed = createGameSeed(q);
  const game = generateGame(gSeed, wArt);
  console.log(`\n━━━ ${game.title} ━━━`);
  console.log(`${game.pitch}`);
  console.log(`Archetype: ${game.archetype} · ${game.meta.sceneCount} scenes · ${game.endings.length} endings · ${game.meta.choiceCount} choices`);
  console.log(`\n  Opening scene: ${game.scenes[0].title}`);
  console.log(`  > ${game.scenes[0].body}`);
  console.log(`  Choices: ${game.scenes[0].choices.map((c) => `"${c.text}"`).join(', ')}`);
}
