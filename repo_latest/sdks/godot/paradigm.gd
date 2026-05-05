# Paradigm SDK for Godot 4.x
# File: paradigm.gd

extends Node

class_name ParadigmSDK

var _seeds: Dictionary = {}
var _seed_counter: int = 0
var _kernel: Kernel

class Kernel:
	var rng = RandomNumberGenerator.new()
	var generation: int = 0
	
	func _init():
		rng.randomize()
	
	func random_float() -> float:
		return rng.randf()
	
	func random_int(min_val: int, max_val: int) -> int:
		return rng.randi_range(min_val, max_val)
	
	func random_bool() -> bool:
		return rng.randf() > 0.5

class UniversalSeed:
	var id: String
	var name: String
	var genes: Dictionary = {}
	var metadata: Dictionary = {}
	var fitness: float = 0.0
	
	func _init(seed_name: String = ""):
		id = _generate_id()
		name = seed_name if seed_name != "" else "Seed_" + id
		metadata["created"] = Time.get_unix_time_from_system()
	
	static func _generate_id() -> String:
		return "seed_%05d" % [_get_counter()]
	
	static var _counter: int = 0
	static func _get_counter() -> int:
		_counter += 1
		return _counter
	
	func set_gene(gene_type: String, value: Variant) -> void:
		genes[gene_type] = value
	
	func get_gene(gene_type: String) -> Variant:
		return genes.get(gene_type)
	
	func has_gene(gene_type: String) -> bool:
		return genes.has(gene_type)
	
	func mutate(intensity: float = 0.1) -> UniversalSeed:
		var mutated = UniversalSeed.new(name + "_mutated")
		for key in genes:
			if randf() < intensity:
				mutated.genes[key] = _mutate_value(genes[key], intensity)
			else:
				mutated.genes[key] = genes[key]
		mutated.metadata["lineage"] = [id]
		return mutated
	
	func _mutate_value(value: Variant, intensity: float) -> Variant:
		if typeof(value) == TYPE_FLOAT:
			return value + (randf() - 0.5) * intensity * 2
		elif typeof(value) == TYPE_STRING:
			return value.substr(0, 1) + value.substr(1).to_upper()
		elif typeof(value) == TYPE_COLOR:
			return Color(
				clamp(value.r + (randf() - 0.5) * intensity, 0, 1),
				clamp(value.g + (randf() - 0.5) * intensity, 0, 1),
				clamp(value.b + (randf() - 0.5) * intensity, 0, 1)
			)
		return value
	
	func breed(other: UniversalSeed) -> UniversalSeed:
		var child = UniversalSeed.new(name + " x " + other.name)
		var all_genes = genes.keys()
		all_genes.append_array(other.genes.keys())
		all_genes = ArrayUtils.unique(all_genes)
		
		for gene in all_genes:
			if genes.has(gene) and other.genes.has(gene):
				child.genes[gene] = genes[gene] if randf() < 0.5 else other.genes[gene]
			elif genes.has(gene):
				child.genes[gene] = genes[gene]
			elif other.genes.has(gene):
				child.genes[gene] = other.genes[gene]
		
		child.metadata["lineage"] = [id, other.id]
		return child
	
	func to_dict() -> Dictionary:
		return {
			"id": id,
			"name": name,
			"genes": genes,
			"metadata": metadata,
			"fitness": fitness
		}
	
	static func from_dict(data: Dictionary) -> UniversalSeed:
		var seed = UniversalSeed.new(data.get("name", ""))
		seed.id = data.get("id", seed.id)
		seed.genes = data.get("genes", {})
		seed.metadata = data.get("metadata", {})
		seed.fitness = data.get("fitness", 0.0)
		return seed

class ArrayUtils:
	static func unique(array: Array) -> Array:
		var seen = {}
		var result = []
		for item in array:
			if not seen.has(item):
				seen[item] = true
				result.append(item)
		return result

class GeneticAlgorithm:
	var population_size: int = 100
	var mutation_rate: float = 0.1
	var crossover_rate: float = 0.7
	var generation_limit: int = 100
	
	func evolve(population: Array, fitness_func: Callable) -> Dictionary:
		var current_pop = population.duplicate()
		var best_seed = null
		var best_fitness = -INF
		
		for gen in range(generation_limit):
			current_pop.sort_custom(func(a, b): return fitness_func.call(a) > fitness_func.call(b))
			
			var f = fitness_func.call(current_pop[0])
			if f > best_fitness:
				best_fitness = f
				best_seed = current_pop[0]
			
			current_pop = _create_next_generation(current_pop, fitness_func)
		
		return {
			"best_seed": best_seed,
			"best_fitness": best_fitness,
			"generations": generation_limit
		}
	
	func _create_next_generation(population: Array, fitness_func: Callable) -> Array:
		var new_pop = []
		
		for i in range(min(2, population.size())):
			new_pop.append(population[i])
		
		while new_pop.size() < population_size:
			var parent_a = _tournament_select(population, fitness_func)
			var parent_b = _tournament_select(population, fitness_func)
			var child = parent_a.breed(parent_b) if randf() < crossover_rate else parent_a
			
			if randf() < mutation_rate:
				child = child.mutate(mutation_rate)
			
			new_pop.append(child)
		
		return new_pop
	
	func _tournament_select(population: Array, fitness_func: Callable) -> UniversalSeed:
		var tournament_size = min(5, population.size())
		var best = null
		var best_fitness = -INF
		
		for i in range(tournament_size):
			var candidate = population.pick_random()
			var f = fitness_func.call(candidate)
			if f > best_fitness:
				best_fitness = f
				best = candidate
		
		return best

# SDK Functions
func _ready():
	_kernel = Kernel.new()

func create_seed(name: String = "", genes: Dictionary = {}) -> UniversalSeed:
	var seed = UniversalSeed.new(name)
	for gene_type in genes:
		seed.set_gene(gene_type, genes[gene_type])
	_seeds[seed.id] = seed
	return seed

func get_seed(seed_id: String) -> UniversalSeed:
	return _seeds.get(seed_id)

func delete_seed(seed_id: String) -> bool:
	if _seeds.has(seed_id):
		_seeds.erase(seed_id)
		return true
	return false

func breed(parent_a_id: String, parent_b_id: String) -> UniversalSeed:
	var parent_a = get_seed(parent_a_id)
	var parent_b = get_seed(parent_b_id)
	if parent_a and parent_b:
		var child = parent_a.breed(parent_b)
		_seeds[child.id] = child
		return child
	return null

func mutate_seed(seed_id: String, intensity: float = 0.1) -> UniversalSeed:
	var seed = get_seed(seed_id)
	if seed:
		var mutated = seed.mutate(intensity)
		_seeds[mutated.id] = mutated
		return mutated
	return null

func evolve(population: Array, fitness_func: Callable) -> Dictionary:
	var ga = GeneticAlgorithm.new()
	return ga.evolve(population, fitness_func)

func get_all_seeds() -> Array:
	return _seeds.values()

func export_seed(seed_id: String) -> String:
	var seed = get_seed(seed_id)
	if seed:
		return JSON.stringify(seed.to_dict())
	return ""

func import_seed(json_data: String) -> UniversalSeed:
	var json = JSON.new()
	var error = json.parse(json_data)
	if error == OK:
		var seed = UniversalSeed.from_dict(json.get_data())
		_seeds[seed.id] = seed
		return seed
	return null

func random_float() -> float:
	return _kernel.random_float()

func random_int(min_val: int, max_val: int) -> int:
	return _kernel.random_int(min_val, max_val)

# GDScript Export for use as Godot plugin
func get_plugin_version() -> String:
	return "1.0.0"

func get_gene_types() -> Array:
	return [
		"color", "shape", "motion", "audio", "physics",
		"behavior", "animation", "texture", "lighting", "structure",
		"material", "environment", "pattern", "interaction", "logic", "data", "meta"
	]