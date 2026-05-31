/**
 * Sensor Data Inverter — time-series sensor data → physics/alife seed
 */
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

interface SensorArtifact {
  readings: Array<{ timestamp: number; values: Record<string, number> }>;
  sensorType: string;
  unit: string;
}

export const sensorInverter: Inverter<SensorArtifact> = {
  id: 'sensor.timeseries-v1',
  domain: 'physics',
  accepts(a: SensorArtifact): boolean { return a && Array.isArray(a.readings) && a.readings.length > 0; },
  async invert(artifact: SensorArtifact): Promise<InversionReport> {
    const start = Date.now();
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];

    genes.push({ path: 'physics.sensorType', value: artifact.sensorType, confidence: 0.95, level: 'high' });
    genes.push({ path: 'physics.readingCount', value: artifact.readings.length, confidence: 0.95, level: 'high' });

    // Time range
    const times = artifact.readings.map(r => r.timestamp);
    const timeRange = Math.max(...times) - Math.min(...times);
    genes.push({ path: 'physics.timeRange', value: timeRange, confidence: 0.9, level: 'high' });

    // Value statistics
    const allValues = artifact.readings.flatMap(r => Object.values(r.values));
    if (allValues.length > 0) {
      const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
      const variance = allValues.reduce((s, v) => s + (v - mean) ** 2, 0) / allValues.length;
      genes.push({ path: 'physics.mean', value: mean, confidence: 0.8, level: 'high' });
      genes.push({ path: 'physics.variance', value: variance, confidence: 0.7, level: 'medium' });
    }

    residuals.push({ feature: 'physical model', reason: 'no-gene', raw: 'Sensor data does not directly map to physics simulation parameters' });

    return {
      domain: 'physics', inverterId: this.id,
      artifactBytes: JSON.stringify(artifact).length,
      genes, residuals,
      overallConfidence: genes.reduce((s, g) => s + g.confidence, 0) / genes.length,
      elapsedMs: Date.now() - start,
    };
  },
};
