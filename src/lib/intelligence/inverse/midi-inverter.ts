/**
 * MIDI Inverter — MIDI data → music seed
 */
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

interface MIDIArtifact {
  tracks: Array<{ notes: Array<{ pitch: number; velocity: number; duration: number; time: number }>; name?: string }>;
  tempo: number;
  timeSignature: [number, number];
  key?: string;
}

export const midiInverter: Inverter<MIDIArtifact> = {
  id: 'midi.music-v1',
  domain: 'music',
  accepts(a: MIDIArtifact): boolean { return a && Array.isArray(a.tracks) && typeof a.tempo === 'number'; },
  async invert(artifact: MIDIArtifact): Promise<InversionReport> {
    const start = Date.now();
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];

    genes.push({ path: 'music.tempo', value: artifact.tempo, confidence: 0.95, level: 'high' });
    genes.push({ path: 'music.timeSignature', value: `${artifact.timeSignature[0]}/${artifact.timeSignature[1]}`, confidence: 0.95, level: 'high' });

    // Analyze note distribution for key detection
    const allNotes = artifact.tracks.flatMap(t => t.notes.map(n => n.pitch % 12));
    const noteCounts = new Array(12).fill(0);
    allNotes.forEach(n => noteCounts[n]++);
    const dominantNote = noteCounts.indexOf(Math.max(...noteCounts));
    const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    genes.push({ path: 'music.key', value: artifact.key || keyNames[dominantNote], confidence: artifact.key ? 0.9 : 0.5, level: artifact.key ? 'high' : 'medium' });

    // Track count
    genes.push({ path: 'music.trackCount', value: artifact.tracks.length, confidence: 0.95, level: 'high' });

    // Velocity analysis
    const velocities = artifact.tracks.flatMap(t => t.notes.map(n => n.velocity));
    const avgVelocity = velocities.length > 0 ? velocities.reduce((a, b) => a + b, 0) / velocities.length : 64;
    genes.push({ path: 'music.dynamics', value: avgVelocity / 127, confidence: 0.7, level: 'medium' });

    residuals.push({ feature: 'timbre', reason: 'no-gene', raw: 'MIDI does not encode timbre' });
    residuals.push({ feature: 'harmony', reason: 'low-confidence', raw: 'Chord detection requires deeper analysis' });

    return {
      domain: 'music', inverterId: this.id,
      artifactBytes: JSON.stringify(artifact).length,
      genes, residuals,
      overallConfidence: genes.reduce((s, g) => s + g.confidence, 0) / genes.length,
      elapsedMs: Date.now() - start,
    };
  },
};
