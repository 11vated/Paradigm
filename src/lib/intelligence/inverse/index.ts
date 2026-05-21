/** Inverse Pipeline — public barrel. */
export * from './types';
export { DefaultInverterRegistry, selectInverter } from './registry';
export { WavAudioInverter } from './audio-inverter';
export { RgbImageInverter } from './image-inverter';
export { CharacterTextInverter } from './text-inverter';

import { DefaultInverterRegistry } from './registry';
import { WavAudioInverter } from './audio-inverter';
import { RgbImageInverter } from './image-inverter';
import { CharacterTextInverter } from './text-inverter';

/** Build a registry pre-loaded with the three reference inverters. */
export function createStandardInverterRegistry(): DefaultInverterRegistry {
  const r = new DefaultInverterRegistry();
  r.register(new WavAudioInverter());
  r.register(new RgbImageInverter());
  r.register(new CharacterTextInverter());
  return r;
}
