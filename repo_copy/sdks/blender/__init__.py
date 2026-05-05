# Paradigm SDK for Blender
# File: __init__.py
# Version: 1.0.0

bl_info = {
    "name": "Paradigm GSPL",
    "author": "Paradigm Team",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Sidebar > Paradigm",
    "description": "Genetic Seed Programming for Blender",
    "warning": "",
    "doc_url": "",
    "category": "Paradigm"
}

import bpy
import random
import json
from typing import Dict, List, Optional, Any
from bpy.props import StringProperty, FloatProperty, BoolProperty, EnumProperty

# Gene Types
GENE_TYPES = [
    ("COLOR", "Color", "Color gene"),
    ("SHAPE", "Shape", "Shape gene"),
    ("MOTION", "Motion", "Motion gene"),
    ("TEXTURE", "Texture", "Texture gene"),
    ("MATERIAL", "Material", "Material gene"),
    ("LIGHTING", "Lighting", "Lighting gene"),
    ("STRUCTURE", "Structure", "Structure gene"),
    ("PHYSICS", "Physics", "Physics gene"),
]

class ParadigmSeed:
    """Universal Seed class for Blender"""
    
    def __init__(self, name: str = ""):
        self.id = f"seed_{random.randint(0, 99999):05d}"
        self.name = name or f"Seed_{self.id}"
        self.genes: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self.fitness: float = 0.0
    
    def set_gene(self, gene_type: str, value: Any) -> None:
        self.genes[gene_type] = value
    
    def get_gene(self, gene_type: str) -> Optional[Any]:
        return self.genes.get(gene_type)
    
    def has_gene(self, gene_type: str) -> bool:
        return gene_type in self.genes
    
    def mutate(self, intensity: float = 0.1) -> 'ParadigmSeed':
        """Create mutated copy"""
        mutated = ParadigmSeed(self.name + "_mutated")
        mutated.genes = self.genes.copy()
        
        for gene_type in mutated.genes:
            if random.random() < intensity:
                mutated.genes[gene_type] = self._mutate_value(mutated.genes[gene_type], intensity)
        
        mutated.metadata["lineage"] = [self.id]
        return mutated
    
    def _mutate_value(self, value: Any, intensity: float) -> Any:
        """Mutate a single gene value"""
        if isinstance(value, (int, float)):
            return value + (random.random() - 0.5) * intensity * 2
        elif isinstance(value, str):
            return value[:1] + value[1:].upper() if len(value) > 1 else value
        elif isinstance(value, (list, tuple)) and len(value) >= 3:
            new_list = list(value)
            idx = random.randint(0, len(new_list) - 1)
            new_list[idx] += (random.random() - 0.5) * intensity
            return new_list
        elif isinstance(value, dict):
            new_dict = value.copy()
            key = random.choice(list(new_dict.keys()))
            if isinstance(new_dict[key], (int, float)):
                new_dict[key] += (random.random() - 0.5) * intensity
            return new_dict
        return value
    
    def breed(self, other: 'ParadigmSeed') -> 'ParadigmSeed':
        """Breed with another seed"""
        child = ParadigmSeed(f"{self.name} x {other.name}")
        
        all_genes = set(self.genes.keys()) | set(other.genes.keys())
        for gene in all_genes:
            if self.has_gene(gene) and other.has_gene(gene):
                child.genes[gene] = random.choice([self.genes[gene], other.genes[gene]])
            elif self.has_gene(gene):
                child.genes[gene] = self.genes[gene]
            else:
                child.genes[gene] = other.genes[gene]
        
        child.metadata["lineage"] = [self.id, other.id]
        return child
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "genes": self.genes,
            "metadata": self.metadata,
            "fitness": self.fitness
        }
    
    @staticmethod
    def from_dict(data: dict) -> 'ParadigmSeed':
        seed = ParadigmSeed(data.get("name", ""))
        seed.id = data.get("id", seed.id)
        seed.genes = data.get("genes", {})
        seed.metadata = data.get("metadata", {})
        seed.fitness = data.get("fitness", 0.0)
        return seed

class ParadigmKernel:
    """Kernel for deterministic operations"""
    
    def __init__(self, seed: int = None):
        self._random = random.Random(seed)
        self.generation = 0
        self.seeds: Dict[str, ParadigmSeed] = {}
    
    def create_seed(self, name: str = "", genes: Dict = None) -> ParadigmSeed:
        seed = ParadigmSeed(name)
        if genes:
            for k, v in genes.items():
                seed.set_gene(k, v)
        self.seeds[seed.id] = seed
        return seed
    
    def get_seed(self, seed_id: str) -> Optional[ParadigmSeed]:
        return self.seeds.get(seed_id)
    
    def breed(self, parent_a_id: str, parent_b_id: str) -> Optional[ParadigmSeed]:
        parent_a = self.get_seed(parent_a_id)
        parent_b = self.get_seed(parent_b_id)
        if parent_a and parent_b:
            child = parent_a.breed(parent_b)
            self.seeds[child.id] = child
            return child
        return None
    
    def evolve(self, population: List[ParadigmSeed], fitness_fn, generations: int = 100) -> dict:
        """Basic genetic algorithm evolution"""
        pop = population.copy()
        best_seed = pop[0]
        best_fitness = float('-inf')
        
        for gen in range(generations):
            pop.sort(key=lambda s: fitness_fn(s), reverse=True)
            
            if fitness_fn(pop[0]) > best_fitness:
                best_fitness = fitness_fn(pop[0])
                best_seed = pop[0]
            
            new_pop = pop[:2]
            while len(new_pop) < len(population):
                parent_a = self._tournament_select(pop, fitness_fn)
                parent_b = self._tournament_select(pop, fitness_fn)
                child = parent_a.breed(parent_b) if self._random.random() < 0.7 else parent_a
                
                if self._random.random() < 0.1:
                    child = child.mutate(0.1)
                
                new_pop.append(child)
            
            pop = new_pop
        
        return {"best_seed": best_seed, "generations": generations}
    
    def _tournament_select(self, population: List[ParadigmSeed], fitness_fn) -> ParadigmSeed:
        tournament = self._random.sample(population, min(5, len(population)))
        tournament.sort(key=lambda s: fitness_fn(s), reverse=True)
        return tournament[0]

# Global Kernel Instance
_kernel = ParadigmKernel()

# Blender UI Panel
class PARADIGM_PT_panel(bpy.types.Panel):
    bl_label = "Paradigm GSPL"
    bl_idname = "PARADIGM_PT_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Paradigm"
    
    def draw(self, context):
        layout = self.layout
        layout.label(text="Paradigm Genetic Seeds")
        
        row = layout.row()
        row.operator("paradigm.create_seed")
        
        layout.separator()
        
        for seed_id in list(_kernel.seeds.keys())[:10]:
            seed = _kernel.seeds[seed_id]
            row = layout.row()
            row.label(text=seed.name)

class PARADIGM_OT_create_seed(bpy.types.-operator):
    bl_idname = "paradigm.create_seed"
    bl_label = "Create Seed"
    bl_options = {"REGISTER"}
    
    name: StringProperty(name="Name", default="")
    color: FloatProperty(name="Color R", default=0.5, min=0, max=1)
    shape: EnumProperty(name="Shape", items=[
        ("CUBE", "Cube", ""),
        ("SPHERE", "Sphere", ""),
        ("CONE", "Cone", ""),
        ("CYLINDER", "Cylinder", ""),
    ])
    
    def execute(self, context):
        genes = {
            "color": [self.color, 0.5, 0.5],
            "shape": self.shape,
        }
        seed = _kernel.create_seed(self.name or f"Seed_{random.randint(0, 999)}", genes)
        
        # Create corresponding mesh
        bpy.ops.mesh.primitive_cube_add()
        obj = context.active_object
        obj.name = seed.name
        seed.metadata["blender_object"] = obj.name
        
        self.report({"INFO"}, f"Created {seed.name}")
        return {"FINISHED"}

class PARADIGM_OT_breed(bpy.types.Operator):
    bl_idname = "paradigm.breed_seeds"
    bl_label = "Breed Seeds"
    bl_options = {"REGISTER"}
    
    parent_a: StringProperty(name="Parent A")
    parent_b: StringProperty(name="Parent B")
    
    def execute(self, context):
        child = _kernel.breed(self.parent_a, self.parent_b)
        if child:
            self.report({"INFO"}, f"Created {child.name}")
        return {"FINISHED"}

class PARADIGM_OT_evolve(bpy.types.Operator):
    bl_idname = "paradigm.evolve"
    bl_label = "Evolve Population"
    bl_options = {"REGISTER"}
    
    generations: bpy.props.IntProperty(name="Generations", default=100, min=1, max=1000)
    
    def execute(self, context):
        population = list(_kernel.seeds.values())
        
        def fitness(seed):
            return random.random()
        
        result = _kernel.evolve(population, fitness, self.generations)
        self.report({"INFO"}, f"Evolved {self.generations} generations")
        return {"FINISHED"}

classes = [
    PARADIGM_PT_panel,
    PARADIGM_OT_create_seed,
    PARADIGM_OT_breed,
    PARADIGM_OT_evolve,
]

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in classes:
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()