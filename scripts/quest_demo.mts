#!/usr/bin/env -S npx tsx
import { createFriendSeed } from '../src/lib/friend/genesis';
import { createWorldSeed, composeQuest, questBrief } from '../src/lib/world';

const friends = ['nori-the-curious', 'atlas-the-bold', 'vesper'];
const worlds = ['vellichor', 'iron-marsh', 'thrice-fallen'];

for (const fs of friends) {
  for (const ws of worlds) {
    const friend = createFriendSeed(fs);
    const world = createWorldSeed(ws);
    const quest = composeQuest(friend, world);
    console.log(questBrief(quest));
    console.log('\n---\n');
  }
}
