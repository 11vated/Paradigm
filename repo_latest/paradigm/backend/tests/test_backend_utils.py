"""Unit tests for core backend utilities."""
import pytest
import sys
import os

# Add current directory (backend) to path for imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

import kernel
import gspl_parser
import gene_system


def test_canonicalize_ordering_is_deterministic():
    data = {'b': 1, 'a': 2, 'nested': {'z': 3, 'y': 4}}
    first = kernel.canonicalize(data)
    second = kernel.canonicalize({'nested': {'y': 4, 'z': 3}, 'a': 2, 'b': 1})
    assert first == second
    assert first.startswith('{"a":2')


def test_content_hash_excludes_hash_field_and_signature():
    seed = {
        '$gst': '1.0',
        '$domain': 'character',
        '$name': 'Test',
        '$hash': 'sha256:dummy',
        '$sovereignty': {'author_pubkey': 'pub', 'signature': 'signed'},
        'genes': {'strength': {'type': 'scalar', 'value': 0.5}},
    }
    result = kernel.content_hash(seed)
    assert result.startswith('sha256:')
    assert 'dummy' not in result


def test_gspl_parser_parses_seed_declaration():
    source = 'seed "Hero" in character { strength: 0.8 }'
    result = gspl_parser.parse_gspl(source)
    assert result['ast']['declarations'][0]['kind'] == 'SeedDecl'
    assert result['ast']['declarations'][0]['domain'] == 'character'
    assert 'strength' in result['ast']['declarations'][0]['genes']


def test_validate_gene_type_scalar():
    assert gene_system.validate_gene('scalar', 0.75)
    assert not gene_system.validate_gene('scalar', 'wrong')


def test_validate_gene_type_categorical_choices():
    assert gene_system.validate_gene('categorical', 'red', {'choices': ['red', 'blue']})
    assert not gene_system.validate_gene('categorical', 'green', {'choices': ['red', 'blue']})
