"""
Paradigm Genetic Computing Platform - Backend API Tests
Tests all CRUD operations, GSPL parsing, composition, library, and evolution endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEngineInfo:
    """Test platform info and engine endpoints"""
    
    def test_root_endpoint_returns_engine_info(self):
        """GET /api/ returns engine info with correct structure"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Paradigm GSPL Engine v1.0"
        assert data["layers"] == 7
        assert data["domains"] == 26
        assert data["gene_types"] == 17
        assert "engines" in data
        assert "functors" in data
    
    def test_engines_endpoint_returns_26_engines(self):
        """GET /api/engines returns 26 engines"""
        response = requests.get(f"{BASE_URL}/api/engines")
        assert response.status_code == 200
        data = response.json()
        assert "engines" in data
        assert data["count"] == 26
        assert len(data["engines"]) == 26
    
    def test_domains_endpoint(self):
        """GET /api/domains returns domain list"""
        response = requests.get(f"{BASE_URL}/api/domains")
        assert response.status_code == 200
        data = response.json()
        assert "domains" in data
        assert data["count"] == 26
    
    def test_gene_types_endpoint(self):
        """GET /api/gene-types returns gene type info"""
        response = requests.get(f"{BASE_URL}/api/gene-types")
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        assert data["count"] == 17


class TestSeedsCRUD:
    """Test seed CRUD operations"""
    
    def test_list_seeds(self):
        """GET /api/seeds returns seed list"""
        response = requests.get(f"{BASE_URL}/api/seeds", params={"limit": 50})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_seed_and_verify_persistence(self):
        """POST /api/seeds creates seed and GET verifies persistence"""
        # Create seed
        create_payload = {
            "domain": "character",
            "name": "TEST_Pytest Warrior",
            "genes": {"strength": {"type": "scalar", "value": 0.8}},
            "metadata": {"tags": ["test"]}
        }
        create_response = requests.post(f"{BASE_URL}/api/seeds", json=create_payload)
        assert create_response.status_code == 200
        
        created_seed = create_response.json()
        assert created_seed["$domain"] == "character"
        assert created_seed["$name"] == "TEST_Pytest Warrior"
        assert "id" in created_seed
        assert "$hash" in created_seed
        
        seed_id = created_seed["id"]
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/seeds/{seed_id}")
        assert get_response.status_code == 200
        fetched_seed = get_response.json()
        assert fetched_seed["$name"] == "TEST_Pytest Warrior"
        assert fetched_seed["$domain"] == "character"
    
    def test_get_nonexistent_seed_returns_404(self):
        """GET /api/seeds/{id} returns 404 for nonexistent seed"""
        response = requests.get(f"{BASE_URL}/api/seeds/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_delete_seed(self):
        """DELETE /api/seeds/{id} removes seed"""
        # First create a seed
        create_response = requests.post(f"{BASE_URL}/api/seeds", json={
            "domain": "character",
            "name": "TEST_ToDelete",
            "genes": {}
        })
        seed_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/seeds/{seed_id}")
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/seeds/{seed_id}")
        assert get_response.status_code == 404


class TestGSPL:
    """Test GSPL parsing and execution"""
    
    def test_gspl_parse_valid_code(self):
        """POST /api/gspl/parse parses GSPL code correctly"""
        gspl_code = '''seed "Test Hero" in character {
  strength: 0.8
  agility: 0.6
}'''
        response = requests.post(f"{BASE_URL}/api/gspl/parse", json={"source": gspl_code})
        assert response.status_code == 200
        data = response.json()
        assert "ast" in data
        assert "stats" in data
        assert data["stats"]["tokens"] > 0
        assert data["stats"]["declarations"] >= 1
    
    def test_gspl_execute_creates_seed(self):
        """POST /api/gspl/execute creates seeds from GSPL"""
        gspl_code = '''seed "TEST_GSPL Hero" in character {
  strength: 0.9
  agility: 0.7
}'''
        response = requests.post(f"{BASE_URL}/api/gspl/execute", json={"source": gspl_code})
        assert response.status_code == 200
        data = response.json()
        assert "seeds" in data
        assert data["stats"]["seeds_created"] >= 1
        if data["seeds"]:
            assert data["seeds"][0]["$name"] == "TEST_GSPL Hero"


class TestComposition:
    """Test cross-domain composition"""
    
    def test_composition_graph_returns_functor_graph(self):
        """GET /api/composition/graph returns functor graph"""
        response = requests.get(f"{BASE_URL}/api/composition/graph")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "edges" in data
        assert len(data["edges"]) > 0
    
    def test_composition_path_character_to_music(self):
        """GET /api/composition/path returns path from character to music"""
        response = requests.get(f"{BASE_URL}/api/composition/path", params={
            "source": "character",
            "target": "music"
        })
        assert response.status_code == 200
        data = response.json()
        assert "path" in data
        assert data["source"] == "character"
        assert data["target"] == "music"
        assert data["exists"] == True
    
    def test_compose_seed_to_new_domain(self):
        """POST /api/seeds/{id}/compose composes seed to new domain"""
        # First create a character seed to ensure we have a composable source
        create_response = requests.post(f"{BASE_URL}/api/seeds", json={
            "domain": "character",
            "name": "TEST_ComposeSource",
            "genes": {"strength": {"type": "scalar", "value": 0.7}}
        })
        assert create_response.status_code == 200
        seed_id = create_response.json()["id"]
        
        # Compose character to sprite (direct functor exists)
        response = requests.post(f"{BASE_URL}/api/seeds/{seed_id}/compose", json={
            "target_domain": "sprite"
        })
        assert response.status_code == 200
        data = response.json()
        assert "seed" in data
        assert data["seed"]["$domain"] == "sprite"


class TestLibrary:
    """Test seed library endpoints"""
    
    def test_library_returns_seeds(self):
        """GET /api/library returns seed library with 20+ seeds"""
        response = requests.get(f"{BASE_URL}/api/library")
        assert response.status_code == 200
        data = response.json()
        assert "seeds" in data
        assert "stats" in data
        assert len(data["seeds"]) >= 20
        assert data["stats"]["total_seeds"] >= 20
    
    def test_library_import_seed(self):
        """POST /api/library/import imports seed from library"""
        # Get library seeds
        lib_response = requests.get(f"{BASE_URL}/api/library")
        lib_data = lib_response.json()
        
        if not lib_data["seeds"]:
            pytest.skip("No seeds in library")
        
        seed_hash = lib_data["seeds"][0]["$hash"]
        
        # Import seed
        response = requests.post(f"{BASE_URL}/api/library/import", json={
            "seed_hash": seed_hash
        })
        assert response.status_code == 200
        imported = response.json()
        assert "id" in imported
        assert imported["$hash"] == seed_hash


class TestEvolution:
    """Test evolution and mutation endpoints"""
    
    def test_mutate_seed(self):
        """POST /api/seeds/{id}/mutate creates mutated child"""
        # Get a seed
        seeds_response = requests.get(f"{BASE_URL}/api/seeds", params={"limit": 1})
        seeds = seeds_response.json()
        if not seeds:
            pytest.skip("No seeds available for mutation test")
        
        seed_id = seeds[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/seeds/{seed_id}/mutate", json={
            "rate": 0.1
        })
        assert response.status_code == 200
        child = response.json()
        assert "id" in child
        assert child["$lineage"]["operation"] == "mutate"
        assert child["$lineage"]["generation"] > 0
    
    def test_evolve_seed(self):
        """POST /api/seeds/{id}/evolve runs evolution"""
        # Get a seed
        seeds_response = requests.get(f"{BASE_URL}/api/seeds", params={"limit": 1})
        seeds = seeds_response.json()
        if not seeds:
            pytest.skip("No seeds available for evolution test")
        
        seed_id = seeds[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/seeds/{seed_id}/evolve", json={
            "algorithm": "map_elites",
            "population_size": 4,
            "generations": 2
        })
        assert response.status_code == 200
        data = response.json()
        assert "population" in data
        assert data["count"] > 0
    
    def test_breed_seeds(self):
        """POST /api/seeds/breed breeds two seeds"""
        # Get two seeds
        seeds_response = requests.get(f"{BASE_URL}/api/seeds", params={"limit": 10})
        seeds = seeds_response.json()
        if len(seeds) < 2:
            pytest.skip("Need at least 2 seeds for breeding test")
        
        response = requests.post(f"{BASE_URL}/api/seeds/breed", json={
            "parent_a_id": seeds[0]["id"],
            "parent_b_id": seeds[1]["id"]
        })
        assert response.status_code == 200
        child = response.json()
        assert "id" in child
        assert child["$lineage"]["operation"] == "breed"


class TestSovereignty:
    """Test sovereignty (signing/verification) endpoints"""
    
    def test_generate_keys(self):
        """POST /api/keys/generate creates keypair"""
        response = requests.post(f"{BASE_URL}/api/keys/generate")
        assert response.status_code == 200
        data = response.json()
        assert "private_key" in data
        assert "public_key" in data
    
    def test_sign_and_verify_seed(self):
        """POST /api/seeds/{id}/sign signs seed, POST /api/seeds/{id}/verify verifies"""
        # Get a seed
        seeds_response = requests.get(f"{BASE_URL}/api/seeds", params={"limit": 1})
        seeds = seeds_response.json()
        if not seeds:
            pytest.skip("No seeds available for signing test")
        
        seed_id = seeds[0]["id"]
        
        # Generate keys
        keys_response = requests.post(f"{BASE_URL}/api/keys/generate")
        keys = keys_response.json()
        
        # Sign seed
        sign_response = requests.post(f"{BASE_URL}/api/seeds/{seed_id}/sign", json={
            "private_key": keys["private_key"]
        })
        assert sign_response.status_code == 200
        sign_data = sign_response.json()
        assert "sovereignty" in sign_data
        assert sign_data["verified"] == True
        
        # Verify seed
        verify_response = requests.post(f"{BASE_URL}/api/seeds/{seed_id}/verify")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["verified"] == True


class TestGeneEditing:
    """Test gene editing endpoints"""
    
    def test_update_gene(self):
        """PUT /api/seeds/{id}/genes updates gene value"""
        # Create a seed first
        create_response = requests.post(f"{BASE_URL}/api/seeds", json={
            "domain": "character",
            "name": "TEST_GeneEdit",
            "genes": {"strength": {"type": "scalar", "value": 0.5}}
        })
        seed_id = create_response.json()["id"]
        
        # Update gene
        response = requests.put(f"{BASE_URL}/api/seeds/{seed_id}/genes", json={
            "gene_name": "strength",
            "gene_type": "scalar",
            "value": 0.9
        })
        assert response.status_code == 200
        updated = response.json()
        assert updated["genes"]["strength"]["value"] == 0.9
        assert updated["$lineage"]["operation"] == "mutate"


class TestGrowSeed:
    """Test seed growth/artifact generation"""
    
    def test_grow_seed_returns_artifact(self):
        """POST /api/seeds/{id}/grow generates artifact"""
        # Get a seed
        seeds_response = requests.get(f"{BASE_URL}/api/seeds", params={"limit": 1})
        seeds = seeds_response.json()
        if not seeds:
            pytest.skip("No seeds available for grow test")
        
        seed_id = seeds[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/seeds/{seed_id}/grow")
        assert response.status_code == 200
        artifact = response.json()
        assert "domain" in artifact
        assert "name" in artifact
        assert "seed_hash" in artifact


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
