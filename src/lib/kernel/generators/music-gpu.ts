/**
 * WebGPU Compute Shaders for Music V2 Generator
 * Generates audio samples in parallel on GPU
 * Enables real-time synthesis of 10,000+ samples
 */

import type { MusicParams, Note } from './music-v2';

/**
 * WGSL Compute Shader for audio synthesis
 * Synthesizes audio from note data on GPU
 */
export const MUSIC_SYNTHESIS_WGSL = `
struct Note {
  pitch: u32,
  startSample: u32,
  durationSamples: u32,
  velocity: u32, // 0-127
  track: u32, // 0=melody, 1=harmony, 2=bass, 3=drums
  instrument: u32, // 0=piano, 1=synth, 2=bass, 3=drums
}

struct AudioUniforms {
  sampleRate: f32,
  tempo: f32,
  duration: f32,
  trackCount: u32,
}

@group(0) @binding(0) var<uniform> uniforms: AudioUniforms;
@group(0) @binding(1) var<storage, read> notes: array<Note>;
@group(0) @binding(2) var<storage, read_write> audioBuffer: array<f32>; // Interleaved stereo

// Waveform synthesis functions
fn sineWave(freq: f32, t: f32) -> f32 {
  return sin(2.0 * 3.14159 * freq * t);
}

fn sawtoothWave(freq: f32, t: f32) -> f32 {
  let period = 1.0 / freq;
  let phase = t % period;
  return 2.0 * (phase / period) - 1.0;
}

fn triangleWave(freq: f32, t: f32) -> f32 {
  let period = 1.0 / freq;
  let phase = t % period;
  let normalized = phase / period;
  if (normalized < 0.5) {
    return 4.0 * normalized - 1.0;
  } else {
    return 3.0 - 4.0 * normalized;
  }
}

fn noise() -> f32 {
  // Simplified noise (would use proper RNG in real impl)
  return (f32(timestamp() & 0xFFFFu) / 65535.0) * 2.0 - 1.0;
}

// ADSR envelope
fn envelope(t: f32, duration: f32) -> f32 {
  let attack = 0.1;
  let decay = 0.2;
  let sustain = 0.7;
  let release = 0.3;
  
  if (t < duration * attack) {
    return t / (duration * attack);
  } else if (t < duration * (attack + decay)) {
    let decayT = t - duration * attack;
    return 1.0 - (1.0 - sustain) * (decayT / (duration * decay));
  } else if (t < duration * (1.0 - release)) {
    return sustain;
  } else {
    let releaseT = t - duration * (1.0 - release);
    return sustain * (1.0 - releaseT / (duration * release));
  }
}

// MIDI note to frequency
fn midiToFreq(midiNote: u32) -> f32 {
  return 440.0 * pow(2.0, (f32(midiNote) - 69.0) / 12.0);
}

@compute @workgroup_size(64)
fn synthesizeAudio(@builtin(global_invocation_id) id: vec3<u32>) {
  let sampleIdx = id.x;
  let totalSamples = arrayLength(&audioBuffer) / 2u; // Stereo, so /2
  if (sampleIdx >= totalSamples) { return; }
  
  let t = f32(sampleIdx) / uniforms.sampleRate;
  var sample: f32 = 0.0;
  
  // Sum all notes that are active at this time
  for (var i = 0u; i < arrayLength(&notes); i++) {
    let note = notes[i];
    let start = note.startSample;
    let end = start + note.durationSamples;
    
    if (sampleIdx >= start && sampleIdx < end) {
      let noteTime = f32(sampleIdx - start) / uniforms.sampleRate;
      let freq = midiToFreq(note.pitch);
      let env = envelope(noteTime, f32(note.durationSamples) / uniforms.sampleRate);
      let velocity = f32(note.velocity) / 127.0;
      
      // Select waveform based on instrument
      var wave: f32;
      if (note.instrument == 0u) {
        // Piano: sine + harmonics
        wave = sineWave(freq, noteTime) * 0.6 +
               sineWave(freq * 2.0, noteTime) * 0.3 +
               sineWave(freq * 3.0, noteTime) * 0.1;
      } else if (note.instrument == 1) {
        // Synth: sawtooth
        wave = sawtoothWave(freq, noteTime);
      } else if (note.instrument == 2) {
        // Bass: triangle
        wave = triangleWave(freq, noteTime);
      } else {
        // Drums: noise
        wave = noise() * 0.3;
      }
      
      sample += wave * env * velocity;
    }
  }
  
  // Write to stereo buffer (same value for L/R for simplicity)
  let stereoIdx = sampleIdx * 2u;
  audioBuffer[stereoIdx] = sample;
  audioBuffer[stereoIdx + 1u] = sample;
}
`;

/**
 * Create GPU buffers for music synthesis
 */
export async function createMusicBuffers(
  device: GPUDevice,
  params: MusicParams,
  notes: Note[],
  totalSamples: number
): Promise<{
  uniformBuffer: GPUBuffer;
  noteBuffer: GPUBuffer;
  audioBuffer: GPUBuffer;
}> {
  // Uniform buffer
  const uniformData = new Float32Array([
    SAMPLE_RATE,
    params.tempo,
    params.duration,
    notes.length
  ]);

  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Float32Array(uniformBuffer.getMappedRange()).set(uniformData);
  uniformBuffer.unmap();

  // Note buffer
  const noteData = new Uint32Array(notes.length * 6); // 6 u32 per note
  notes.forEach((note, i) => {
    const offset = i * 6;
    noteData[offset] = note.pitch;
    noteData[offset + 1] = note.startSample;
    noteData[offset + 2] = note.durationSamples;
    noteData[offset + 3] = note.velocity;
    noteData[offset + 4] = note.track === 'melody' ? 0 : note.track === 'harmony' ? 1 : note.track === 'bass' ? 2 : 3;
    noteData[offset + 5] = note.instrument === 'piano' ? 0 : note.instrument === 'synth' ? 1 : note.instrument === 'bass' ? 2 : 3;
  });

  const noteBuffer = device.createBuffer({
    size: noteData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true
  });
  new Uint32Array(noteBuffer.getMappedRange()).set(noteData);
  noteBuffer.unmap();

  // Audio buffer (stereo f32)
  const audioBuffer = device.createBuffer({
    size: totalSamples * 2 * 4, // 2 channels × 4 bytes per f32
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  return { uniformBuffer, noteBuffer, audioBuffer };
}

/**
 * Build compute pipeline for audio synthesis
 */
export async function buildMusicPipeline(
  device: GPUDevice,
  shaderCode: string
): Promise<GPUComputePipeline> {
  const module = device.createShaderModule({ code: shaderCode });

  return await device.createComputePipelineAsync({
    layout: 'auto',
    compute: { module, entryPoint: 'synthesizeAudio' }
  });
}

// Re-export SAMPLE_RATE from music-v2
export { SAMPLE_RATE };
