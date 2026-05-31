/**
 * Map Inverter — geographic/map data → world seed
 */
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

interface MapArtifact {
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  features: Array<{ type: string; name?: string; properties?: Record<string, unknown> }>;
  scale: number;
}

export const mapInverter: Inverter<MapArtifact> = {
  id: 'map.geographic-v1',
  domain: 'world',
  accepts(a: MapArtifact): boolean { return a && a.bounds && Array.isArray(a.features); },
  async invert(artifact: MapArtifact): Promise<InversionReport> {
    const start = Date.now();
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];

    // Bounds
    const latRange = artifact.bounds.maxLat - artifact.bounds.minLat;
    const lngRange = artifact.bounds.maxLng - artifact.bounds.minLng;
    genes.push({ path: 'world.latitudeRange', value: latRange, confidence: 0.95, level: 'high' });
    genes.push({ path: 'world.longitudeRange', value: lngRange, confidence: 0.95, level: 'high' });

    // Feature analysis
    const featureTypes = new Set(artifact.features.map(f => f.type));
    genes.push({ path: 'world.featureTypes', value: Array.from(featureTypes), confidence: 0.9, level: 'high' });
    genes.push({ path: 'world.featureCount', value: artifact.features.length, confidence: 0.95, level: 'high' });

    // Scale
    genes.push({ path: 'world.scale', value: artifact.scale, confidence: 0.9, level: 'high' });

    // Biome estimation from features
    const hasWater = artifact.features.some(f => f.type === 'water' || f.type === 'ocean' || f.type === 'river');
    const hasMountain = artifact.features.some(f => f.type === 'mountain' || f.type === 'hill');
    const biome = hasWater && hasMountain ? 'coastal' : hasWater ? 'ocean' : hasMountain ? 'mountain' : 'plains';
    genes.push({ path: 'world.biome', value: biome, confidence: 0.5, level: 'medium', note: 'Estimated from feature types' });

    residuals.push({ feature: 'elevation data', reason: 'no-gene', raw: 'DEM raster not processed' });

    return {
      domain: 'world', inverterId: this.id,
      artifactBytes: JSON.stringify(artifact).length,
      genes, residuals,
      overallConfidence: genes.reduce((s, g) => s + g.confidence, 0) / genes.length,
      elapsedMs: Date.now() - start,
    };
  },
};
