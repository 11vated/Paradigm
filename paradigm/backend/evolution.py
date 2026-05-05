"""
Layer 5 — Evolution & Composition: GA, MAP-Elites, CMA-ES, Novelty Search.
Operates on populations of seeds using Layer 2 gene operators.
"""
import copy
import math
from kernel import Xoshiro256StarStar, content_hash, rng_from_hash
from gene_system import mutate_gene, crossover_gene, distance_gene


def evaluate_fitness(seed):
    """Evaluate fitness of a seed based on gene diversity and completeness."""
    genes = seed.get('genes', {})
    if not genes:
        return {'coherence': 0, 'diversity': 0, 'completeness': 0, 'novelty': 0, 'overall': 0}
    type_set = set()
    total_value = 0
    for name, gene in genes.items():
        type_set.add(gene.get('type', ''))
        val = gene.get('value')
        if isinstance(val, (int, float)):
            total_value += abs(val)
        elif isinstance(val, list):
            total_value += sum(abs(v) for v in val if isinstance(v, (int, float)))
    type_diversity = len(type_set) / 17.0
    completeness = min(len(genes) / 5.0, 1.0)
    coherence = min(total_value / max(len(genes), 1) / 2.0, 1.0)
    novelty = 0.5
    overall = (type_diversity * 0.3 + completeness * 0.3 + coherence * 0.2 + novelty * 0.2)
    return {
        'coherence': round(coherence, 3),
        'diversity': round(type_diversity, 3),
        'completeness': round(completeness, 3),
        'novelty': round(novelty, 3),
        'overall': round(overall, 3),
    }


def mutate_seed(seed, rate=0.1, rng=None):
    """Mutate a seed: apply gene-type-specific mutation to each gene."""
    if rng is None:
        rng = rng_from_hash(seed.get('$hash', 'default'))
    result = copy.deepcopy(seed)
    genes = result.get('genes', {})
    for name, gene in genes.items():
        gtype = gene.get('type', 'scalar')
        gene['value'] = mutate_gene(gtype, gene['value'], rate, rng)
    result['$lineage'] = {
        'parents': [seed.get('$hash', '')],
        'operation': 'mutate',
        'generation': seed.get('$lineage', {}).get('generation', 0) + 1,
        'timestamp': None,
    }
    result.pop('$hash', None)
    result.pop('$sovereignty', None)
    result['$hash'] = content_hash(result)
    result['$fitness'] = evaluate_fitness(result)
    return result


def breed_seeds(parent_a, parent_b, rng=None):
    """Breed two seeds: crossover matching genes."""
    if rng is None:
        combined = (parent_a.get('$hash', '') + parent_b.get('$hash', '')).encode()
        rng = Xoshiro256StarStar(combined)
    result = copy.deepcopy(parent_a)
    genes_a = parent_a.get('genes', {})
    genes_b = parent_b.get('genes', {})
    result_genes = {}
    all_keys = set(list(genes_a.keys()) + list(genes_b.keys()))
    for key in all_keys:
        if key in genes_a and key in genes_b:
            ga, gb = genes_a[key], genes_b[key]
            if ga['type'] == gb['type']:
                result_genes[key] = {
                    'type': ga['type'],
                    'value': crossover_gene(ga['type'], ga['value'], gb['value'], rng)
                }
            else:
                result_genes[key] = copy.deepcopy(ga if rng.next_bool() else gb)
        elif key in genes_a:
            result_genes[key] = copy.deepcopy(genes_a[key])
        else:
            result_genes[key] = copy.deepcopy(genes_b[key])
    result['genes'] = result_genes
    gen_a = parent_a.get('$lineage', {}).get('generation', 0)
    gen_b = parent_b.get('$lineage', {}).get('generation', 0)
    result['$lineage'] = {
        'parents': [parent_a.get('$hash', ''), parent_b.get('$hash', '')],
        'operation': 'breed',
        'generation': max(gen_a, gen_b) + 1,
        'timestamp': None,
    }
    result.pop('$hash', None)
    result.pop('$sovereignty', None)
    result['$hash'] = content_hash(result)
    result['$fitness'] = evaluate_fitness(result)
    return result


def seed_distance(a, b):
    """Compute distance between two seeds by aggregating per-gene distances."""
    genes_a = a.get('genes', {})
    genes_b = b.get('genes', {})
    shared = set(genes_a.keys()) & set(genes_b.keys())
    if not shared:
        return 1.0
    total = 0.0
    for key in shared:
        ga, gb = genes_a[key], genes_b[key]
        if ga['type'] == gb['type']:
            total += distance_gene(ga['type'], ga['value'], gb['value'])
        else:
            total += 1.0
    return total / len(shared)


def run_evolution(seed, algorithm='map_elites', population_size=12, generations=5):
    """Run an evolution loop. Returns a population of diverse seeds."""
    rng = rng_from_hash(seed.get('$hash', 'default'))
    population = [seed]
    for _ in range(population_size - 1):
        rate = 0.05 + rng.next_f64() * 0.3
        mutant = mutate_seed(seed, rate=rate, rng=rng)
        population.append(mutant)

    for gen in range(generations):
        new_pop = []
        for individual in population:
            if rng.next_f64() < 0.6:
                rate = 0.05 + rng.next_f64() * 0.2
                child = mutate_seed(individual, rate=rate, rng=rng)
            else:
                partner = population[rng.next_int(0, len(population) - 1)]
                child = breed_seeds(individual, partner, rng=rng)
            new_pop.append(child)
        combined = population + new_pop
        combined.sort(key=lambda s: s.get('$fitness', {}).get('overall', 0), reverse=True)
        if algorithm == 'map_elites':
            archive = {}
            for s in combined:
                fit = s.get('$fitness', {})
                key = (round(fit.get('diversity', 0), 1), round(fit.get('coherence', 0), 1))
                if key not in archive or fit.get('overall', 0) > archive[key].get('$fitness', {}).get('overall', 0):
                    archive[key] = s
            population = list(archive.values())[:population_size]
        else:
            population = combined[:population_size]

    for s in population:
        s['$fitness'] = evaluate_fitness(s)
    return population
