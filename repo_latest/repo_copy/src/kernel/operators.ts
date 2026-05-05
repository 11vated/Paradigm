import { Gene, Genome, GeneValue, RNG } from './effects';

export enum GeneOperator {
  BLEND = 'blend',
  INTERPOLATE = 'interpolate',
  COMPOSE = 'compose',
  TRANSFORM = 'transform'
}

export class GeneOperators {
  static blend(valueA: GeneValue, valueB: GeneValue, alpha: number, rng: RNG): GeneValue {
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return valueA * (1 - alpha) + valueB * alpha;
    }
    
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      const len = Math.min(valueA.length, valueB.length);
      const split = Math.floor(len * alpha);
      return valueA.slice(0, split) + valueB.slice(split);
    }
    
    if (Array.isArray(valueA) && Array.isArray(valueB)) {
      const maxLen = Math.max(valueA.length, valueB.length);
      const result = [];
      for (let i = 0; i < maxLen; i++) {
        const a = valueA[i % valueA.length];
        const b = valueB[i % valueB.length];
        result.push(this.blend(a, b, alpha, rng));
      }
      return result;
    }
    
    if (typeof valueA === 'object' && typeof valueB === 'object') {
      const keys = new Set([...Object.keys(valueA as object), ...Object.keys(valueB as object)]);
      const result: Record<string, GeneValue> = {};
      for (const key of keys) {
        const a = (valueA as Record<string, GeneValue>)[key];
        const b = (valueB as Record<string, GeneValue>)[key];
        if (a !== undefined && b !== undefined) {
          result[key] = this.blend(a, b, alpha, rng);
        } else {
          result[key] = a ?? b;
        }
      }
      return result;
    }
    
    return rng.nextFloat() < alpha ? valueB : valueA;
  }

  static interpolate(valueA: GeneValue, valueB: GeneValue, t: number, rng: RNG): GeneValue {
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      const eased = this.easeInOutCubic(Math.max(0, Math.min(1, t)));
      return valueA + (valueB - valueA) * eased;
    }
    
    if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
      const threshold = this.easeInOutCubic(Math.max(0, Math.min(1, t)));
      return rng.nextFloat() < threshold ? valueB : valueA;
    }
    
    return this.blend(valueA, valueB, t, rng);
  }

  private static easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  static compose(geneA: Gene, geneB: Gene, operation: 'add' | 'multiply' | 'max' | 'min', rng: RNG): GeneValue {
    if (typeof geneA.value === 'number' && typeof geneB.value === 'number') {
      switch (operation) {
        case 'add': return geneA.value + geneB.value;
        case 'multiply': return geneA.value * geneB.value;
        case 'max': return Math.max(geneA.value, geneB.value);
        case 'min': return Math.min(geneA.value, geneB.value);
      }
    }
    
    if (Array.isArray(geneA.value) && Array.isArray(geneB.value)) {
      const maxLen = Math.max(geneA.value.length, geneB.value.length);
      const result = [];
      for (let i = 0; i < maxLen; i++) {
        const a = geneA.value[i % geneA.value.length];
        const b = geneB.value[i % geneB.value.length];
        if (typeof a === 'number' && typeof b === 'number') {
          switch (operation) {
            case 'add': result.push(a + b); break;
            case 'multiply': result.push(a * b); break;
            case 'max': result.push(Math.max(a, b)); break;
            case 'min': result.push(Math.min(a, b)); break;
          }
        } else {
          result.push(rng.nextFloat() < 0.5 ? a : b);
        }
      }
      return result;
    }
    
    return rng.nextFloat() < 0.5 ? geneA.value : geneB.value;
  }

  static transform(value: GeneValue, transformType: 'normalize' | 'quantize' | 'clamp' | 'scale', params: Record<string, number>, rng: RNG): GeneValue {
    switch (transformType) {
      case 'normalize':
        if (typeof value === 'number') {
          const min = params.min ?? 0;
          const max = params.max ?? 1;
          return (value - min) / (max - min);
        }
        if (Array.isArray(value)) {
          return value.map(v => this.transform(v, 'normalize', params, rng));
        }
        break;
        
      case 'quantize':
        if (typeof value === 'number') {
          const steps = params.steps ?? 10;
          return Math.round(value * steps) / steps;
        }
        break;
        
      case 'clamp':
        if (typeof value === 'number') {
          const min = params.min ?? 0;
          const max = params.max ?? 1;
          return Math.max(min, Math.min(max, value));
        }
        break;
        
      case 'scale':
        if (typeof value === 'number') {
          const factor = params.factor ?? 1;
          return value * factor;
        }
        if (Array.isArray(value)) {
          return value.map(v => this.transform(v, 'scale', params, rng));
        }
        break;
    }
    
    return value;
  }

  static applyOperator(geneA: Gene, geneB: Gene | null, operator: GeneOperator, rng: RNG, params?: Record<string, unknown>): Gene {
    const valueB = geneB?.value ?? geneA.value;
    let newValue: GeneValue;
    
    switch (operator) {
      case GeneOperator.BLEND:
        const alpha = params?.alpha as number ?? 0.5;
        newValue = this.blend(geneA.value, valueB, alpha, rng);
        break;
        
      case GeneOperator.INTERPOLATE:
        const t = params?.t as number ?? 0.5;
        newValue = this.interpolate(geneA.value, valueB, t, rng);
        break;
        
      case GeneOperator.COMPOSE:
        if (!geneB) return geneA;
        const op = (params?.operation as 'add' | 'multiply' | 'max' | 'min') ?? 'add';
        newValue = this.compose(geneA, geneB, op, rng);
        break;
        
      case GeneOperator.TRANSFORM:
        const transformType = (params?.type as 'normalize' | 'quantize' | 'clamp' | 'scale') ?? 'normalize';
        const transformParams = (params?.params as Record<string, number>) ?? {};
        newValue = this.transform(geneA.value, transformType, transformParams, rng);
        break;
        
      default:
        newValue = geneA.value;
    }
    
    return {
      ...geneA,
      value: newValue
    };
  }

  static mutateGene(gene: Gene, intensity: number, rng: RNG): Gene {
    const mutationType = rng.nextInt(0, 2);
    
    switch (mutationType) {
      case 0:
        return this.applyOperator(gene, null, GeneOperator.TRANSFORM, rng, {
          type: 'scale',
          params: { factor: 1 + (rng.nextFloat() - 0.5) * intensity }
        });
        
      case 1:
        return this.applyOperator(gene, null, GeneOperator.BLEND, rng, {
          alpha: intensity * rng.nextFloat()
        });
        
      case 2:
        return this.applyOperator(gene, null, GeneOperator.TRANSFORM, rng, {
          type: 'clamp',
          params: { min: 0, max: 1 }
        });
        
      default:
        return gene;
    }
  }

  static crossoverGene(geneA: Gene, geneB: Gene, position: number, rng: RNG): Gene {
    const valueA = Array.isArray(geneA.value) ? geneA.value : [geneA.value];
    const valueB = Array.isArray(geneB.value) ? geneB.value : [geneB.value];
    
    const maxLen = Math.max(valueA.length, valueB.length);
    const split = Math.floor(maxLen * position);
    
    const newValue = [...valueA.slice(0, split), ...valueB.slice(split)];
    
    return {
      ...geneA,
      value: newLen => newValue.length === 1 ? newValue[0] : newValue
    };
  }
}
