#!/usr/bin/env python3
"""
Paradigm Genetic Computing Platform - Backend API Testing
Tests all API endpoints for the genetic computing platform.
"""
import requests
import sys
import json
from datetime import datetime

class ParadigmAPITester:
    def __init__(self, base_url="https://breeding-ground.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_seed_id = None
        self.test_keys = None

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if endpoint else f"{self.base_url}/api"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test GET /api/ - should return platform info"""
        success, response = self.run_test(
            "Root API Info",
            "GET",
            "",
            200
        )
        if success:
            expected_keys = ['layers', 'domains', 'gene_types']
            for key in expected_keys:
                if key not in response:
                    print(f"   ⚠️  Missing expected key: {key}")
                else:
                    print(f"   ✓ {key}: {response[key]}")
        return success

    def test_domains_endpoint(self):
        """Test GET /api/domains - should return 26 domains"""
        success, response = self.run_test(
            "List Domains",
            "GET",
            "domains",
            200
        )
        if success and 'domains' in response:
            domain_count = len(response['domains'])
            print(f"   ✓ Found {domain_count} domains")
            if domain_count != 26:
                print(f"   ⚠️  Expected 26 domains, got {domain_count}")
        return success

    def test_gene_types_endpoint(self):
        """Test GET /api/gene-types - should return 17 gene types"""
        success, response = self.run_test(
            "List Gene Types",
            "GET",
            "gene-types",
            200
        )
        if success and 'types' in response:
            gene_count = len(response['types'])
            print(f"   ✓ Found {gene_count} gene types")
            if gene_count != 17:
                print(f"   ⚠️  Expected 17 gene types, got {gene_count}")
        return success

    def test_create_seed(self):
        """Test POST /api/seeds - create a test seed"""
        test_data = {
            "domain": "character",
            "name": "Test Warrior API",
            "genes": {
                "strength": {"type": "scalar", "value": 0.8},
                "archetype": {"type": "categorical", "value": "warrior"}
            }
        }
        success, response = self.run_test(
            "Create Seed",
            "POST",
            "seeds",
            200,
            data=test_data
        )
        if success and 'id' in response:
            self.test_seed_id = response['id']
            print(f"   ✓ Created seed with ID: {self.test_seed_id}")
            print(f"   ✓ Seed hash: {response.get('$hash', 'N/A')}")
            print(f"   ✓ Seed fitness: {response.get('$fitness', {}).get('overall', 'N/A')}")
        return success

    def test_list_seeds(self):
        """Test GET /api/seeds - list seeds"""
        success, response = self.run_test(
            "List Seeds",
            "GET",
            "seeds",
            200
        )
        if success and isinstance(response, list):
            print(f"   ✓ Found {len(response)} seeds in gallery")
            if len(response) > 0:
                print(f"   ✓ First seed: {response[0].get('$name', 'Unnamed')}")
        return success

    def test_get_seed(self):
        """Test GET /api/seeds/{id} - get specific seed"""
        if not self.test_seed_id:
            print("   ⚠️  No test seed ID available, skipping")
            return False
            
        success, response = self.run_test(
            "Get Seed by ID",
            "GET",
            f"seeds/{self.test_seed_id}",
            200
        )
        if success:
            print(f"   ✓ Retrieved seed: {response.get('$name', 'Unnamed')}")
            print(f"   ✓ Domain: {response.get('$domain', 'N/A')}")
        return success

    def test_generate_seed_from_prompt(self):
        """Test POST /api/seeds/generate - generate seed from prompt"""
        test_data = {
            "prompt": "a fierce dragon warrior with emerald scales",
            "domain": "character"
        }
        success, response = self.run_test(
            "Generate Seed from Prompt",
            "POST",
            "seeds/generate",
            200,
            data=test_data,
            timeout=45  # LLM generation might take longer
        )
        if success and 'id' in response:
            print(f"   ✓ Generated seed: {response.get('$name', 'Unnamed')}")
            print(f"   ✓ Domain: {response.get('$domain', 'N/A')}")
            # Store this for further tests if we don't have a test seed
            if not self.test_seed_id:
                self.test_seed_id = response['id']
        return success

    def test_mutate_seed(self):
        """Test POST /api/seeds/{id}/mutate - mutate a seed"""
        if not self.test_seed_id:
            print("   ⚠️  No test seed ID available, skipping")
            return False
            
        test_data = {"rate": 0.2}
        success, response = self.run_test(
            "Mutate Seed",
            "POST",
            f"seeds/{self.test_seed_id}/mutate",
            200,
            data=test_data
        )
        if success and 'id' in response:
            print(f"   ✓ Created mutated child: {response.get('$name', 'Unnamed')}")
            print(f"   ✓ Generation: {response.get('$lineage', {}).get('generation', 'N/A')}")
        return success

    def test_update_gene(self):
        """Test PUT /api/seeds/{id}/genes - update a gene value"""
        if not self.test_seed_id:
            print("   ⚠️  No test seed ID available, skipping")
            return False
            
        test_data = {
            "gene_name": "agility",
            "gene_type": "scalar",
            "value": 0.9
        }
        success, response = self.run_test(
            "Update Gene",
            "PUT",
            f"seeds/{self.test_seed_id}/genes",
            200,
            data=test_data
        )
        if success:
            print(f"   ✓ Updated gene in seed: {response.get('$name', 'Unnamed')}")
            print(f"   ✓ New hash: {response.get('$hash', 'N/A')}")
        return success

    def test_grow_seed(self):
        """Test POST /api/seeds/{id}/grow - grow seed into artifact"""
        if not self.test_seed_id:
            print("   ⚠️  No test seed ID available, skipping")
            return False
            
        success, response = self.run_test(
            "Grow Seed",
            "POST",
            f"seeds/{self.test_seed_id}/grow",
            200
        )
        if success:
            print(f"   ✓ Generated artifact with keys: {list(response.keys()) if isinstance(response, dict) else 'Non-dict'}")
        return success

    def test_evolve_seed(self):
        """Test POST /api/seeds/{id}/evolve - evolve seed population"""
        if not self.test_seed_id:
            print("   ⚠️  No test seed ID available, skipping")
            return False
            
        test_data = {
            "algorithm": "map_elites",
            "population_size": 6,
            "generations": 2
        }
        success, response = self.run_test(
            "Evolve Seed",
            "POST",
            f"seeds/{self.test_seed_id}/evolve",
            200,
            data=test_data,
            timeout=60  # Evolution might take longer
        )
        if success and 'population' in response:
            pop_size = len(response['population'])
            print(f"   ✓ Generated population of {pop_size} seeds")
        return success

    def test_generate_keys(self):
        """Test POST /api/keys/generate - generate ECDSA keypair"""
        success, response = self.run_test(
            "Generate ECDSA Keys",
            "POST",
            "keys/generate",
            200
        )
        if success and 'private_key' in response and 'public_key' in response:
            self.test_keys = response
            print(f"   ✓ Generated keypair")
            print(f"   ✓ Public key length: {len(response['public_key'])}")
        return success

    def test_sign_seed(self):
        """Test POST /api/seeds/{id}/sign - sign seed with private key"""
        if not self.test_seed_id or not self.test_keys:
            print("   ⚠️  No test seed ID or keys available, skipping")
            return False
            
        test_data = {"private_key": self.test_keys['private_key']}
        success, response = self.run_test(
            "Sign Seed",
            "POST",
            f"seeds/{self.test_seed_id}/sign",
            200,
            data=test_data
        )
        if success and 'sovereignty' in response:
            print(f"   ✓ Signed seed successfully")
            print(f"   ✓ Verified: {response.get('verified', 'N/A')}")
        return success

    def test_verify_seed(self):
        """Test POST /api/seeds/{id}/verify - verify seed signature"""
        if not self.test_seed_id:
            print("   ⚠️  No test seed ID available, skipping")
            return False
            
        success, response = self.run_test(
            "Verify Seed Signature",
            "POST",
            f"seeds/{self.test_seed_id}/verify",
            200
        )
        if success:
            print(f"   ✓ Verification result: {response.get('verified', 'N/A')}")
        return success

    def test_breed_seeds(self):
        """Test POST /api/seeds/breed - breed two seeds"""
        # First get available seeds
        success, seeds = self.run_test("Get Seeds for Breeding", "GET", "seeds", 200)
        if not success or len(seeds) < 2:
            print("   ⚠️  Need at least 2 seeds for breeding, skipping")
            return False
            
        parent_a = seeds[0]['id']
        parent_b = seeds[1]['id']
        
        test_data = {
            "parent_a_id": parent_a,
            "parent_b_id": parent_b
        }
        success, response = self.run_test(
            "Breed Seeds",
            "POST",
            "seeds/breed",
            200,
            data=test_data
        )
        if success and 'id' in response:
            print(f"   ✓ Created child seed: {response.get('$name', 'Unnamed')}")
            print(f"   ✓ Generation: {response.get('$lineage', {}).get('generation', 'N/A')}")
        return success

def main():
    print("🧬 PARADIGM Genetic Computing Platform - Backend API Testing")
    print("=" * 60)
    
    tester = ParadigmAPITester()
    
    # Test sequence - order matters for dependencies
    tests = [
        tester.test_root_endpoint,
        tester.test_domains_endpoint,
        tester.test_gene_types_endpoint,
        tester.test_list_seeds,
        tester.test_create_seed,
        tester.test_get_seed,
        tester.test_generate_seed_from_prompt,
        tester.test_update_gene,
        tester.test_mutate_seed,
        tester.test_grow_seed,
        tester.test_evolve_seed,
        tester.test_breed_seeds,
        tester.test_generate_keys,
        tester.test_sign_seed,
        tester.test_verify_seed,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())