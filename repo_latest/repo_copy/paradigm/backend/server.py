"""
Paradigm — Genetic Computing Platform API
Layer 7 backend: Seeds CRUD, Evolution, Sovereignty, Agent, Engines
MongoDB stores seeds as JSON strings to avoid $-prefix field issues.
"""
from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from kernel import content_hash, DOMAINS, GENE_TYPE_NAMES
from gene_system import get_gene_type_info, validate_gene
from sovereignty import generate_keypair, sign_seed, verify_seed
from evolution import mutate_seed, breed_seeds, run_evolution, evaluate_fitness
from engines import grow_seed, ENGINES
from agent import generate_seed_from_prompt
from gspl_parser import parse_gspl
from composition import compose_seed, find_composition_path, get_composition_graph, FUNCTOR_REGISTRY
from seed_library import get_all_library_seeds, get_library_seeds_by_domain, get_library_stats, SEED_LIBRARY

mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.getenv('DB_NAME', 'paradigm')
allow_origins = [origin.strip() for origin in os.getenv('CORS_ORIGINS', '*').split(',') if origin.strip()]

app = FastAPI(title="Paradigm GSPL Engine", version="1.0.0")
api = APIRouter(prefix="/api")

@app.on_event("startup")
async def startup_db_client():
    client = AsyncIOMotorClient(mongo_url)
    app.state.mongo_client = client
    app.state.db = client[db_name]

@app.on_event("shutdown")
async def shutdown_db_client():
    client = getattr(app.state, 'mongo_client', None)
    if client:
        client.close()


def get_db():
    db_obj = getattr(app.state, 'db', None)
    if db_obj is None:
        raise RuntimeError("Database not initialized")
    return db_obj


def validate_seed_genes(genes):
    if not isinstance(genes, dict):
        return False, "Genes must be an object mapping gene names to gene definitions."
    for name, gene in genes.items():
        if not isinstance(gene, dict):
            return False, f"Gene '{name}' must be an object with type and value."
        gene_type = gene.get('type')
        if gene_type not in GENE_TYPE_NAMES:
            return False, f"Invalid gene type: {gene_type}"
        if not validate_gene(gene_type, gene.get('value')):
            return False, f"Invalid value for gene '{name}' of type '{gene_type}'"
    return True, None

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ─── MongoDB helpers: store seeds as JSON to avoid $ field issues ──────────────
def seed_to_doc(seed):
    """Convert seed to MongoDB document (seed stored as JSON string)."""
    return {
        'id': seed['id'],
        'domain': seed.get('$domain', ''),
        'name': seed.get('$name', ''),
        'generation': seed.get('$lineage', {}).get('generation', 0),
        'seed_hash': seed.get('$hash', ''),
        'fitness': seed.get('$fitness', {}).get('overall', 0),
        'operation': seed.get('$lineage', {}).get('operation', 'primordial'),
        'signed': bool(seed.get('$sovereignty', {}).get('signature')),
        'data': json.dumps(seed),
    }


def doc_to_seed(doc):
    """Convert MongoDB document back to seed."""
    if not doc:
        return None
    return json.loads(doc['data'])


# ─── Pydantic Models ──────────────────────────────────────────────────────────
class SeedCreate(BaseModel):
    domain: str = "character"
    name: str = "Untitled Seed"
    genes: Dict[str, Any] = {}
    metadata: Optional[Dict[str, Any]] = None

class PromptGenerate(BaseModel):
    prompt: str
    domain: Optional[str] = None

class MutateRequest(BaseModel):
    rate: float = 0.1

class BreedRequest(BaseModel):
    parent_a_id: str
    parent_b_id: str

class EvolveRequest(BaseModel):
    algorithm: str = "map_elites"
    population_size: int = 12
    generations: int = 5

class SignRequest(BaseModel):
    private_key: str

class GeneUpdate(BaseModel):
    gene_name: str
    gene_type: str
    value: Any


# ─── Seed CRUD ─────────────────────────────────────────────────────────────────
@api.post("/seeds")
async def create_seed(req: SeedCreate):
    db = get_db()
    valid, reason = validate_seed_genes(req.genes)
    if not valid:
        raise HTTPException(status_code=400, detail=reason)
    seed = {
        'id': str(uuid.uuid4()),
        '$gst': '1.0',
        '$domain': req.domain if req.domain in DOMAINS else 'character',
        '$name': req.name,
        '$lineage': {
            'parents': [],
            'operation': 'primordial',
            'generation': 0,
            'timestamp': datetime.now(timezone.utc).isoformat()
        },
        'genes': req.genes,
        '$metadata': req.metadata or {'engine_version': '1.0.0', 'tags': []},
    }
    seed['$hash'] = content_hash(seed)
    seed['$fitness'] = evaluate_fitness(seed)
    await db.seeds.insert_one(seed_to_doc(seed))
    return seed


@api.get("/seeds")
async def list_seeds(limit: int = 50, domain: Optional[str] = None):
    db = get_db()
    query = {}
    if domain:
        query['domain'] = domain
    docs = await db.seeds.find(query, {"_id": 0}).sort("generation", -1).to_list(limit)
    return [doc_to_seed(d) for d in docs]


@api.get("/seeds/{seed_id}")
async def get_seed(seed_id: str):
    db = get_db()
    doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Seed not found")
    return doc_to_seed(doc)


@api.delete("/seeds/{seed_id}")
async def delete_seed(seed_id: str):
    db = get_db()
    result = await db.seeds.delete_one({"id": seed_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Seed not found")
    return {"deleted": True}


# ─── Agent: Prompt → Seed ──────────────────────────────────────────────────────
@api.post("/seeds/generate")
async def generate_from_prompt(req: PromptGenerate):
    db = get_db()
    seed = await generate_seed_from_prompt(req.prompt, req.domain)
    seed['id'] = str(uuid.uuid4())
    await db.seeds.insert_one(seed_to_doc(seed))
    return seed


# ─── Mutation ──────────────────────────────────────────────────────────────────
@api.post("/seeds/{seed_id}/mutate")
async def mutate(seed_id: str, req: MutateRequest):
    db = get_db()
    doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Seed not found")
    seed = doc_to_seed(doc)
    child = mutate_seed(seed, rate=req.rate)
    child['id'] = str(uuid.uuid4())
    child['$lineage']['timestamp'] = datetime.now(timezone.utc).isoformat()
    await db.seeds.insert_one(seed_to_doc(child))
    return child


# ─── Breeding ─────────────────────────────────────────────────────────────────
@api.post("/seeds/breed")
async def breed(req: BreedRequest):
    db = get_db()
    doc_a = await db.seeds.find_one({"id": req.parent_a_id}, {"_id": 0})
    doc_b = await db.seeds.find_one({"id": req.parent_b_id}, {"_id": 0})
    if not doc_a or not doc_b:
        raise HTTPException(404, "One or both parents not found")
    child = breed_seeds(doc_to_seed(doc_a), doc_to_seed(doc_b))
    child['id'] = str(uuid.uuid4())
    child['$lineage']['timestamp'] = datetime.now(timezone.utc).isoformat()
    await db.seeds.insert_one(seed_to_doc(child))
    return child


# ─── Evolution ─────────────────────────────────────────────────────────────────
@api.post("/seeds/{seed_id}/evolve")
async def evolve(seed_id: str, req: EvolveRequest):
    db = get_db()
    doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Seed not found")
    seed = doc_to_seed(doc)
    population = run_evolution(
        seed,
        algorithm=req.algorithm,
        population_size=min(req.population_size, 50),
        generations=min(req.generations, 20)
    )
    results = []
    for s in population:
        s['id'] = str(uuid.uuid4())
        s['$lineage']['timestamp'] = datetime.now(timezone.utc).isoformat()
        await db.seeds.insert_one(seed_to_doc(s))
        results.append(s)
    return {"population": results, "count": len(results)}


# ─── Gene Editing ──────────────────────────────────────────────────────────────
@api.put("/seeds/{seed_id}/genes")
async def update_gene(seed_id: str, req: GeneUpdate):
    db = get_db()
    doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Seed not found")
    seed = doc_to_seed(doc)
    if req.gene_type not in GENE_TYPE_NAMES:
        raise HTTPException(400, f"Invalid gene type: {req.gene_type}")
    if not validate_gene(req.gene_type, req.value):
        raise HTTPException(400, f"Invalid value for gene type: {req.gene_type}")
    seed['genes'][req.gene_name] = {'type': req.gene_type, 'value': req.value}
    old_hash = seed.get('$hash', '')
    seed['$lineage'] = {
        'parents': [old_hash],
        'operation': 'mutate',
        'generation': seed.get('$lineage', {}).get('generation', 0) + 1,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    seed.pop('$sovereignty', None)
    seed['$hash'] = content_hash(seed)
    seed['$fitness'] = evaluate_fitness(seed)
    await db.seeds.replace_one({"id": seed_id}, seed_to_doc(seed))
    return seed


# ─── Engine: Grow ──────────────────────────────────────────────────────────────
@api.post("/seeds/{seed_id}/grow")
async def grow(seed_id: str):
    db = get_db()
    doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Seed not found")
    seed = doc_to_seed(doc)
    artifact = grow_seed(seed)
    return artifact


# ─── Sovereignty ───────────────────────────────────────────────────────────────
@api.post("/keys/generate")
async def gen_keys():
    private_key, public_key = generate_keypair()
    return {"private_key": private_key, "public_key": public_key}


@api.post("/seeds/{seed_id}/sign")
async def sign(seed_id: str, req: SignRequest):
    db = get_db()
    doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Seed not found")
    seed = doc_to_seed(doc)
    sovereignty = sign_seed(seed, req.private_key)
    seed['$sovereignty'] = sovereignty
    await db.seeds.replace_one({"id": seed_id}, seed_to_doc(seed))
    return {"sovereignty": sovereignty, "verified": verify_seed(seed)}


@api.post("/seeds/{seed_id}/verify")
async def verify(seed_id: str):
    db = get_db()
    doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Seed not found")
    seed = doc_to_seed(doc)
    return {"verified": verify_seed(seed), "hash": seed.get('$hash', '')}


# ─── Domain & Gene Info ───────────────────────────────────────────────────────
@api.get("/domains")
async def list_domains():
    return {"domains": DOMAINS, "count": len(DOMAINS)}


@api.get("/gene-types")
async def list_gene_types():
    return {"types": get_gene_type_info(), "count": 17}


# ─── Platform Stats ───────────────────────────────────────────────────────────
@api.get("/stats")
async def platform_stats():
    db = get_db()
    total_seeds = await db.seeds.count_documents({})
    domain_counts = {}
    for d in ['character', 'sprite', 'music', 'visual2d', 'procedural']:
        domain_counts[d] = await db.seeds.count_documents({"domain": d})
    return {
        "total_seeds": total_seeds,
        "domains": len(DOMAINS),
        "gene_types": 17,
        "domain_counts": domain_counts,
        "platform_version": "1.0.0"
    }


# ─── GSPL Language Parser ──────────────────────────────────────────────────────
class GSPLSource(BaseModel):
    source: str

@api.post("/gspl/parse")
async def gspl_parse(req: GSPLSource):
    return parse_gspl(req.source)

@api.post("/gspl/execute")
async def gspl_execute(req: GSPLSource):
    db = get_db()
    result = parse_gspl(req.source)
    seeds_created = []
    if result.get('ast') and result['ast'].get('declarations'):
        for decl in result['ast']['declarations']:
            if decl.get('kind') == 'SeedDecl':
                genes = {}
                for gname, gval in (decl.get('genes') or {}).items():
                    if isinstance(gval, dict) and gval.get('kind') == 'Literal':
                        v = gval.get('value')
                        if isinstance(v, (int, float)):
                            genes[gname] = {'type': 'scalar', 'value': v}
                        elif isinstance(v, str):
                            genes[gname] = {'type': 'categorical', 'value': v}
                    elif isinstance(gval, dict) and gval.get('kind') == 'Array':
                        vals = [e.get('value', 0) for e in (gval.get('elements') or []) if isinstance(e, dict)]
                        genes[gname] = {'type': 'vector', 'value': vals}
                seed = {
                    'id': str(uuid.uuid4()), '$gst': '1.0',
                    '$domain': decl.get('domain', 'character'),
                    '$name': decl.get('name', 'GSPL Seed'),
                    '$lineage': {'parents': [], 'operation': 'primordial', 'generation': 0, 'timestamp': datetime.now(timezone.utc).isoformat()},
                    'genes': genes,
                    '$metadata': {'source': 'gspl', 'signed': decl.get('is_signed', False)},
                }
                valid, reason = validate_seed_genes(seed['genes'])
                if not valid:
                    raise HTTPException(status_code=400, detail=f"Invalid GSPL gene: {reason}")
                seed['$hash'] = content_hash(seed)
                seed['$fitness'] = evaluate_fitness(seed)
                await db.seeds.insert_one(seed_to_doc(seed))
                seeds_created.append(seed)
    result['seeds'] = seeds_created
    result['stats']['seeds_created'] = len(seeds_created)
    return result


# ─── Cross-Domain Composition ─────────────────────────────────────────────────
class ComposeRequest(BaseModel):
    target_domain: str

@api.post("/seeds/{seed_id}/compose")
async def compose(seed_id: str, req: ComposeRequest):
    db = get_db()
    doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Seed not found")
    seed = doc_to_seed(doc)
    result = compose_seed(seed, req.target_domain)
    if result is None:
        raise HTTPException(400, f"No composition path from {seed.get('$domain')} to {req.target_domain}")
    result['id'] = str(uuid.uuid4())
    if result.get('$lineage'):
        result['$lineage']['timestamp'] = datetime.now(timezone.utc).isoformat()
    await db.seeds.insert_one(seed_to_doc(result))
    path = find_composition_path(seed.get('$domain', ''), req.target_domain)
    return {"seed": result, "path": {"path": path} if path is not None else {"path": None}}

@api.get("/composition/graph")
async def composition_graph():
    return get_composition_graph()

@api.get("/composition/path")
async def composition_path(source: str, target: str):
    path = find_composition_path(source, target)
    return {"path": path, "source": source, "target": target, "exists": path is not None}


# ─── Seed Library ──────────────────────────────────────────────────────────────
class LibraryImport(BaseModel):
    seed_hash: str

@api.get("/library")
async def get_library():
    db = get_db()
    return {"seeds": get_all_library_seeds(), "stats": get_library_stats()}

@api.get("/library/{domain}")
async def get_library_domain(domain: str):
    return {"seeds": get_library_seeds_by_domain(domain), "domain": domain}

@api.post("/library/import")
async def import_from_library(req: LibraryImport):
    db = get_db()
    all_seeds = get_all_library_seeds()
    found = next((s for s in all_seeds if s.get('$hash') == req.seed_hash), None)
    if not found:
        raise HTTPException(404, "Seed not found in library")
    import copy
    seed = copy.deepcopy(found)
    seed['id'] = str(uuid.uuid4())
    await db.seeds.insert_one(seed_to_doc(seed))
    return seed


# ─── Pipeline & Compilation ───────────────────────────────────────────────────
import pipeline as pipeline_module
import sprite_blueprint
import audio_synthesis
import behavior_compiler
import sdf_detail

class CompileRequest(BaseModel):
    concept: str
    domain: str = "character"
    options: Optional[Dict[str, Any]] = None

@api.post("/compile")
async def compile_entity(req: CompileRequest):
    """End-to-end compile: concept → CompiledEntity"""
    try:
        entity = await pipeline_module.compile_entity(req.concept, req.domain, req.options)
        return entity.to_dict()
    except Exception as e:
        raise HTTPException(500, f"Compilation failed: {str(e)}")


@api.get("/pipeline/status")
async def pipeline_status():
    """Get pipeline component status"""
    return {
        "sprite_blueprint": "ready",
        "audio_synthesis": "ready",
        "behavior_compiler": "ready",
        "pipeline": "ready"
    }


# ─── Audio Synthesis ───────────────────────────────────────────────────────────
class AudioRequest(BaseModel):
    seed_id: Optional[str] = None
    seed_data: Optional[Dict[str, Any]] = None
    action: str = "attack"

@api.post("/audio/synthesize")
async def synthesize_audio(req: AudioRequest):
    """Generate audio for a seed or concept"""
    try:
        seed = None
        
        # Get seed from ID if provided
        if req.seed_id:
            db = get_db()
            doc = await db.seeds.find_one({"id": req.seed_id}, {"_id": 0})
            if doc:
                seed = doc_to_seed(doc)
        
        # Use provided seed data if no ID
        if not seed and req.seed_data:
            seed = req.seed_data
        
        if not seed:
            raise HTTPException(400, "No seed provided")
        
        # Generate audio
        audio = audio_synthesis.generate_sound(seed, req.action)
        return audio
    except Exception as e:
        raise HTTPException(500, f"Audio synthesis failed: {str(e)}")


@api.post("/audio/profile")
async def audio_profile(seed_id: str):
    """Generate complete audio profile for a seed"""
    try:
        db = get_db()
        doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Seed not found")
        
        seed = doc_to_seed(doc)
        profile = audio_synthesis.generate_audio_profile(seed)
        
        # Remove samples from response to reduce size
        return {k: v for k, v in profile.items() if k != 'samples'}
    except Exception as e:
        raise HTTPException(500, f"Audio profile failed: {str(e)}")


# ─── Behavior Compilation ─────────────────────────────────────────────────────
@api.post("/behavior/compile")
async def compile_behavior(seed_id: str):
    """Compile seed genes into behavior tree"""
    try:
        db = get_db()
        doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Seed not found")
        
        seed = doc_to_seed(doc)
        behavior = behavior_compiler.compile_behavior(seed)
        return behavior
    except Exception as e:
        raise HTTPException(500, f"Behavior compilation failed: {str(e)}")


@api.post("/behavior/decide")
async def behavior_decide(seed_id: str, context: Dict[str, Any]):
    """Make a decision given the context"""
    try:
        db = get_db()
        doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Seed not found")
        
        seed = doc_to_seed(doc)
        behavior = behavior_compiler.compile_behavior(seed)
        maker = behavior_compiler.create_decision_maker(behavior)
        decision = maker.evaluate(context)
        
        return {"decision": decision, "context": context}
    except Exception as e:
        raise HTTPException(500, f"Behavior decision failed: {str(e)}")


# ─── Quality Validation ─────────────────────────────────────────────────────────
@api.get("/quality/{seed_id}")
async def get_quality(seed_id: str):
    """Get quality score for a seed"""
    try:
        db = get_db()
        doc = await db.seeds.find_one({"id": seed_id}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Seed not found")
        
        seed = doc_to_seed(doc)
        
        # Create a minimal entity for scoring
        entity = pipeline_module.CompiledEntity(
            seed=seed,
            concept=seed.get('$name', ''),
            sprite={},
            behavior_tree={},
            audio_profile={}
        )
        
        validator = pipeline_module.QualityValidator()
        score = validator.score(entity)
        
        return score
    except Exception as e:
        raise HTTPException(500, f"Quality assessment failed: {str(e)}")


# ─── Engine Info ───────────────────────────────────────────────────────────────
@api.get("/engines")
async def list_engines():
    return {"engines": sorted(ENGINES.keys()), "count": len(ENGINES)}


@api.get("/")
async def root():
    return {"message": "Paradigm GSPL Engine v1.0", "layers": 7, "domains": 26, "gene_types": 17, "engines": len(ENGINES), "functors": len(FUNCTOR_REGISTRY), "pipeline": "v2.0"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins or ['*'],
    allow_methods=["*"],
    allow_headers=["*"],
)
