/** Inverse Pipeline — public barrel. */
export * from './types';
export { DefaultInverterRegistry, selectInverter } from './registry';
export { WavAudioInverter } from './audio-inverter';
export { RgbImageInverter } from './image-inverter';
export { CharacterTextInverter } from './text-inverter';
export { NarrativeTextInverter } from './narrative-inverter';
export { SeedGraphInverter, type LineageNode, type LineageGraph } from './seed-graph-inverter';
export { PersonaVectorInverter, type PersonaVector } from './persona-inverter';
export { videoInverter } from './video-inverter';
export { midiInverter } from './midi-inverter';
export { codeInverter } from './code-inverter';
export { gameReplayInverter } from './game-replay-inverter';
export { sensorInverter } from './sensor-inverter';
export { genomeInverter } from './genome-inverter';
export { mapInverter } from './map-inverter';
export { legalInverter } from './legal-inverter';

import { DefaultInverterRegistry } from './registry';
import { WavAudioInverter } from './audio-inverter';
import { RgbImageInverter } from './image-inverter';
import { CharacterTextInverter } from './text-inverter';
import { videoInverter } from './video-inverter';
import { midiInverter } from './midi-inverter';
import { codeInverter } from './code-inverter';
import { gameReplayInverter } from './game-replay-inverter';
import { sensorInverter } from './sensor-inverter';
import { genomeInverter } from './genome-inverter';
import { mapInverter } from './map-inverter';
import { legalInverter } from './legal-inverter';

/** Build a registry pre-loaded with all inverters. */
export function createStandardInverterRegistry(): DefaultInverterRegistry {
  const r = new DefaultInverterRegistry();
  r.register(new WavAudioInverter());
  r.register(new RgbImageInverter());
  r.register(new CharacterTextInverter());
  // Phase 11: Full 15-modality inverse pipeline
  r.register(videoInverter);
  r.register(midiInverter);
  r.register(codeInverter);
  r.register(gameReplayInverter);
  r.register(sensorInverter);
  r.register(genomeInverter);
  r.register(mapInverter);
  r.register(legalInverter);
  return r;
}
