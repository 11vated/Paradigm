# @paradigm/sdk

Deterministic substrate SDK for Paradigm Absolute.

Three subentry points:

- `@paradigm/sdk/friend` — sovereign digital companions
- `@paradigm/sdk/world` — settings, conflicts, locations
- `@paradigm/sdk/game` — playable scene graphs + fitness oracle + evolution

Every function is pure + deterministic w.r.t. its inputs. Same seed string → byte-identical artifact, across processes and machines.

## Quickstart

```ts
import { createFriendSeed, generateFriend } from '@paradigm/sdk/friend';
import { createWorldSeed, composeQuest } from '@paradigm/sdk/world';
import { generateGame, createGameSeed, evaluateGame, evolveGames } from '@paradigm/sdk/game';

const friend = createFriendSeed('iris');
const world  = createWorldSeed('vellichor');
const quest  = composeQuest(friend, world);
const game   = generateGame(createGameSeed(quest));
const score  = evaluateGame(game);
console.log(score.score, score.axes);

// Or evolve a winning game pair:
const winner = evolveGames({ pop: 16, generations: 4, initialSeed: 'paradigm' });
console.log(winner.best.fitness.score);
```

## Contracts

Every artifact is governed by the **Paradigm Quality Contract** (5 clauses: synth, invert, rate, curated, determinism). The 7 conformant generators in this build score on the substrate's leaderboard (`npm run quality:contract`).

## License

MIT.
