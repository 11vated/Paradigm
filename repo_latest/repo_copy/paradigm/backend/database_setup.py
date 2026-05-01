"""
MongoDB Index Setup for Paradigm

Creates optimized indexes for:
- content_hash queries (deterministic lookups)
- domain + created_at (pagination and filtering)
- author_pubkey (sovereignty verification)
- lineage.parent_hashes (lineage queries)
"""

import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv


load_dotenv()


async def create_indexes():
    """Create all required indexes for Paradigm"""
    
    # Get MongoDB connection
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB", "paradigm")
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    seeds = db.seeds
    
    print(f"Creating indexes on {db_name}.seeds collection...")
    
    # Index 1: Content hash for deterministic lookups
    # This is critical for reproducibility - same hash always finds same seed
    await seeds.create_index(
        "content_hash",
        name="idx_content_hash",
        unique=True
    )
    print("  ✓ idx_content_hash (unique) - for deterministic lookups")
    
    # Index 2: Domain + created_at for efficient pagination/filtering
    await seeds.create_index(
        [("domain", 1), ("created_at", -1)],
        name="idx_domain_created"
    )
    print("  ✓ idx_domain_created - for filtered queries")
    
    # Index 3: Author pubkey for sovereignty verification
    await seeds.create_index(
        "sovereignty.author_pubkey",
        name="idx_author_pubkey"
    )
    print("  ✓ idx_author_pubkey - for signature verification")
    
    # Index 4: Parent hashes for lineage queries
    await seeds.create_index(
        "lineage.parent_hashes",
        name="idx_parent_hashes"
    )
    print("  ✓ idx_parent_hashes - for ancestry queries")
    
    # Index 5: Name for search
    await seeds.create_index(
        "name",
        name="idx_name"
    )
    print("  ✓ idx_name - for seed search")
    
    # Index 6: Fitness score for evolution sorting
    await seeds.create_index(
        "fitness",
        name="idx_fitness"
    )
    print("  ✓ idx_fitness - for evolution ranking")
    
    # Index 7: Tags for library filtering
    await seeds.create_index(
        "tags",
        name="idx_tags"
    )
    print("  ✓ idx_tags - for library filtering")
    
    # Index 8: Generation for lineage depth
    await seeds.create_index(
        "lineage.generation",
        name="idx_generation"
    )
    print("  ✓ idx_generation - for generation filtering")
    
    print("\nAll indexes created successfully!")
    
    # List all indexes
    print("\nCurrent indexes:")
    async for index in seeds.list_indexes():
        print(f"  - {index['name']}")
    
    client.close()


async def drop_unused_indexes():
    """Remove any unused indexes (run this carefully)"""
    
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB", "paradigm")
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    seeds = db.seeds
    
    # List of indexes to keep (never drop these)
    protected = {
        "idx_content_hash",
        "idx_domain_created", 
        "idx_author_pubkey",
        "idx_parent_hashes",
        "idx_name",
        "idx_fitness",
        "idx_tags",
        "idx_generation",
        "_id_"
    }
    
    print("Checking for unused indexes...")
    async for index in seeds.list_indexes():
        name = index['name']
        if name not in protected:
            print(f"  Found unused index: {name}")
            # Uncomment to drop: await seeds.drop_index(name)
    
    client.close()


async def analyze_collection():
    """Analyze collection for optimization opportunities"""
    
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = os.getenv("MONGO_DB", "paradigm")
    
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    seeds = db.seeds
    
    # Get stats
    stats = await db.command("collStats", "seeds")
    
    print(f"\nCollection Stats:")
    print(f"  Documents: {stats.get('count', 0)}")
    print(f"  Size: {stats.get('size', 0) / 1024 / 1024:.2f} MB")
    print(f"  Avg Doc Size: {stats.get('avgObjSize', 0):.0f} bytes")
    print(f"  Storage Size: {stats.get('storageSize', 0) / 1024 / 1024:.2f} MB")
    
    # Get index stats
    print(f"\nIndex Stats:")
    for index in stats.get('indexSizes', {}).items():
        print(f"  {index[0]}: {index[1] / 1024:.2f} KB")
    
    client.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "analyze":
            asyncio.run(analyze_collection())
        elif sys.argv[1] == "drop":
            asyncio.run(drop_unused_indexes())
        else:
            print("Usage: python database_setup.py [analyze|drop]")
    else:
        asyncio.run(create_indexes())