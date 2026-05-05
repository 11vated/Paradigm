export type GeneValue = number | string | boolean | GeneValue[] | { [key: string]: GeneValue };

export interface Gene {
  id: string;
  type: string;
  value: GeneValue;
  metadata: GeneMetadata;
}

export interface GeneMetadata {
  mutable: boolean;
  dominant: boolean;
  expressionRange?: [number, number];
  mutationRate: number;
}

export interface Genome {
  id: string;
  genes: Map<string, Gene>;
  fitness?: number;
  lineage: string[];
}

export interface EffectConfig {
  intensity: number;
  probability: number;
}

export type EffectFunction = (genome: Genome, config: EffectConfig, rng: RNG) => Genome;

export interface RNG {
  nextFloat(): number;
  nextInt(min: number, max: number): number;
  nextBoolean(): boolean;
}

export enum EffectType {
  MUTATION = 'mutation',
  CROSSOVER = 'crossover',
  SELECTION = 'selection',
  INVERSION = 'inversion',
  DUPLICATION = 'duplication',
  DELETION = 'deletion',
  TRANSLOCATION = 'translocation',
  HOMEOSTASIS = 'homeostasis'
}

export class Effects {
  private static applyMutation(genome: Genome, config: EffectConfig, rng: RNG): Genome {
    if (genome.genes.size === 0) return genome;
    
    const newGenes = new Map(genome.genes);
    const geneIds = Array.from(newGenes.keys());
    const targetGeneId = geneIds[rng.nextInt(0, geneIds.length - 1)];
    const targetGene = newGenes.get(targetGeneId)!;
    
    if (!targetGene.metadata.mutable) return genome;
    
    const mutationType = rng.nextInt(0, 3);
    let newValue: GeneValue = targetGene.value;
    
    switch (mutationType) {
      case 0:
        if (typeof targetGene.value === 'number') {
          const range = targetGene.metadata.expressionRange || [0, 1];
          const mutation = (rng.nextFloat() - 0.5) * config.intensity * (range[1] - range[0]);
          newValue = targetGene.value + mutation;
        }
        break;
      case 1:
        if (Array.isArray(targetGene.value)) {
          const idx = rng.nextInt(0, targetGene.value.length - 1);
          const newArray = [...targetGene.value];
          newArray[idx] = this.mutateValue(newArray[idx], config.intensity, rng);
          newValue = newArray;
        }
        break;
      case 2:
        if (typeof targetGene.value === 'object' && targetGene.value !== null) {
          const keys = Object.keys(targetGene.value);
          if (keys.length > 0) {
            const key = keys[rng.nextInt(0, keys.length - 1)];
            const obj = { ...targetGene.value } as Record<string, GeneValue>;
            obj[key] = this.mutateValue(obj[key], config.intensity, rng);
            newValue = obj;
          }
        }
        break;
      case 3:
        newValue = this.mutateValue(targetGene.value, config.intensity, rng);
        break;
    }
    
    newGenes.set(targetGeneId, {
      ...targetGene,
      value: newValue
    });
    
    return { ...genome, genes: newGenes, lineage: [...genome.lineage, 'mutation'] };
  }

  private static mutateValue(value: GeneValue, intensity: number, rng: RNG): GeneValue {
    if (typeof value === 'number') {
      return value + (rng.nextFloat() - 0.5) * intensity * 2;
    }
    if (typeof value === 'string') {
      const chars = value.split('');
      const idx = rng.nextInt(0, chars.length - 1);
      chars[idx] = String.fromCharCode(chars[idx].charCodeAt(0) + (rng.nextBoolean() ? 1 : -1));
      return chars.join('');
    }
    if (typeof value === 'boolean') {
      return rng.nextFloat() < intensity ? !value : value;
    }
    return value;
  }

  private static applyCrossover(genomeA: Genome, genomeB: Genome, config: EffectConfig, rng: RNG): Genome {
    if (rng.nextFloat() >= config.probability) return genomeA;
    
    const newGenes = new Map<string, Gene>();
    const genesA = Array.from(genomeA.genes.entries());
    const genesB = Array.from(genomeB.genes.entries());
    
    for (let i = 0; i < Math.max(genesA.length, genesB.length); i++) {
      if (i < genesA.length && i < genesB.length) {
        const gene = rng.nextFloat() < 0.5 ? genesA[i][1] : genesB[i][1];
        newGenes.set(genesA[i][0], { ...gene });
      } else if (i < genesA.length) {
        newGenes.set(genesA[i][0], { ...genesA[i][1] });
      } else {
        newGenes.set(genesB[i][0], { ...genesB[i][1] });
      }
    }
    
    return {
      id: crypto.randomUUID(),
      genes: newGenes,
      fitness: undefined,
      lineage: [genomeA.id, genomeB.id]
    };
  }

  private static applySelection(genomes: Genome[], config: EffectConfig, rng: RNG): Genome[] {
    if (genomes.length <= 1) return genomes;
    
    const sorted = [...genomes].sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
    const selectedCount = Math.max(1, Math.floor(genomes.length * (1 - config.intensity)));
    
    return sorted.slice(0, selectedCount);
  }

  private static applyInversion(genome: Genome, config: EffectConfig, rng: RNG): Genome {
    if (genome.genes.size < 2 || rng.nextFloat() >= config.probability) return genome;
    
    const geneIds = Array.from(genome.genes.keys());
    const start = rng.nextInt(0, geneIds.length - 2);
    const end = rng.nextInt(start + 1, geneIds.length);
    
    const newGenes = new Map(genome.genes);
    const reversedSegment = geneIds.slice(start, end).reverse();
    
    return { ...genome, genes: newGenes, lineage: [...genome.lineage, 'inversion'] };
  }

  private static applyDuplication(genome: Genome, config: EffectConfig, rng: RNG): Genome {
    if (rng.nextFloat() >= config.probability) return genome;
    
    const newGenes = new Map(genome.genes);
    const geneIds = Array.from(newGenes.keys());
    if (geneIds.length === 0) return genome;
    
    const sourceId = geneIds[rng.nextInt(0, geneIds.length - 1)];
    const sourceGene = newGenes.get(sourceId)!;
    const newId = `${sourceGene.id}_dup_${rng.nextInt(0, 9999)}`;
    
    newGenes.set(newId, { ...sourceGene, id: newId });
    
    return { ...genome, genes: newGenes, lineage: [...genome.lineage, 'duplication'] };
  }

  private static applyDeletion(genome: Genome, config: EffectConfig, rng: RNG): Genome {
    if (genome.genes.size <= 1 || rng.nextFloat() >= config.probability) return genome;
    
    const newGenes = new Map(genome.genes);
    const geneIds = Array.from(newGenes.keys());
    const deleteCount = rng.nextInt(1, Math.ceil(geneIds.length * config.intensity));
    
    for (let i = 0; i < deleteCount; i++) {
      const idx = rng.nextInt(0, newGenes.size - 1);
      const key = geneIds[idx];
      newGenes.delete(key);
    }
    
    return { ...genome, genes: newGenes, lineage: [...genome.lineage, 'deletion'] };
  }

  private static applyTranslocation(genome: Genome, config: EffectConfig, rng: RNG): Genome {
    if (genome.genes.size < 2 || rng.nextFloat() >= config.probability) return genome;
    
    const geneIds = Array.from(genome.genes.keys());
    const idx1 = rng.nextInt(0, geneIds.length - 1);
    let idx2 = rng.nextInt(0, geneIds.length - 1);
    while (idx2 === idx1) idx2 = rng.nextInt(0, geneIds.length - 1);
    
    const newGenes = new Map(genome.genes);
    const temp = newGenes.get(geneIds[idx1]);
    newGenes.set(geneIds[idx1], newGenes.get(geneIds[idx2])!);
    newGenes.set(geneIds[idx2], temp!);
    
    return { ...genome, genes: newGenes, lineage: [...genome.lineage, 'translocation'] };
  }

  private static applyHomeostasis(genome: Genome, config: EffectConfig, rng: RNG): Genome {
    const newGenes = new Map(genome.genes);
    
    for (const [id, gene] of newGenes) {
      if (typeof gene.value === 'number') {
        const range = gene.metadata.expressionRange || [0, 1];
        let value = gene.value;
        
        if (value < range[0]) value = range[0];
        if (value > range[1]) value = range[1];
        
        newGenes.set(id, { ...gene, value });
      }
    }
    
    return { ...genome, genes: newGenes, lineage: [...genome.lineage, 'homeostasis'] };
  }

  static applyEffect(genome: Genome, effectType: EffectType, config: EffectConfig, rng: RNG, partners?: Genome[]): Genome {
    switch (effectType) {
      case EffectType.MUTATION:
        return this.applyMutation(genome, config, rng);
      case EffectType.CROSSOVER:
        if (!partners || partners.length === 0) return genome;
        return this.applyCrossover(genome, partners[0], config, rng);
      case EffectType.SELECTION:
        return genome;
      case EffectType.INVERSION:
        return this.applyInversion(genome, config, rng);
      case EffectType.DUPLICATION:
        return this.applyDuplication(genome, config, rng);
      case EffectType.DELETION:
        return this.applyDeletion(genome, config, rng);
      case EffectType.TRANSLOCATION:
        return this.applyTranslocation(genome, config, rng);
      case EffectType.HOMEOSTASIS:
        return this.applyHomeostasis(genome, config, rng);
      default:
        return genome;
    }
  }

  static applyAll(genome: Genome, config: Partial<EffectConfig>, rng: RNG): Genome {
    const cfg: EffectConfig = {
      intensity: config.intensity ?? 0.1,
      probability: config.probability ?? 0.5
    };
    
    let result = genome;
    result = this.applyEffect(result, EffectType.MUTATION, cfg, rng);
    result = this.applyEffect(result, EffectType.HOMEOSTASIS, cfg, rng);
    
    return result;
  }

  static getEffectNames(): string[] {
    return Object.values(EffectType);
  }
}
