"""
Behavior Compiler

Compiles seed genes into configured behavior trees.
Automatically generates personality-driven behavior from genetic blueprint.

This transforms genetic information into executable AI behavior.
"""

from dataclasses import dataclass, field
from typing import Optional, Any
from enum import Enum
import random


class BehaviorState(Enum):
    """Core behavior states for all entities"""
    IDLE = "idle"
    PATROL = "patrol"
    ALERT = "alert"
    ENGAGE = "engage"
    FLEE = "flee"
    REST = "rest"
    FOLLOW = "follow"
    ATTACK = "attack"
    DEFEND = "defend"


class Archetype(Enum):
    """Entity archetypes that define base behavior templates"""
    PREDATOR = "predator"
    GUARDIAN = "guardian"
    TRICKSTER = "trickster"
    MERCHANT = "merchant"
    SCOUT = "scout"
    BRAWLER = "brawler"
    MAGE = "mage"
    HEALER = "healer"


@dataclass
class BehaviorNode:
    """A single node in the behavior tree"""
    id: str
    type: str  # "sequence", "selector", "action", "condition"
    children: list = field(default_factory=list)
    params: dict = field(default_factory=dict)
    

@dataclass
class UtilityScore:
    """Utility score for utility-based AI decisions"""
    action: str
    score: float
    considerations: dict = field(default_factory=dict)


class ArchetypeTemplate:
    """
    Base behavior templates for each archetype.
    Defines states, transitions, and utility weights.
    """
    
    TEMPLATES = {
        Archetype.PREDATOR: {
            "states": [BehaviorState.IDLE, BehaviorState.PATROL, BehaviorState.ALERT, 
                      BehaviorState.ENGAGE, BehaviorState.FLEE, BehaviorState.REST],
            "default_state": BehaviorState.PATROL,
            "utility_weights": {
                "hunt": 1.0,
                "rest": 0.2,
                "patrol": 0.8,
                "flee": 0.3
            },
            "perception_range": 15.0,
            "aggression": 0.8
        },
        Archetype.GUARDIAN: {
            "states": [BehaviorState.IDLE, BehaviorState.PATROL, BehaviorState.ALERT,
                      BehaviorState.ENGAGE, BehaviorState.DEFEND, BehaviorState.REST],
            "default_state": BehaviorState.PATROL,
            "utility_weights": {
                "patrol": 1.0,
                "defend": 0.9,
                "alert": 0.8,
                "rest": 0.3
            },
            "perception_range": 10.0,
            "aggression": 0.6
        },
        Archetype.TRICKSTER: {
            "states": [BehaviorState.IDLE, BehaviorState.PATROL, BehaviorState.FLEE,
                      BehaviorState.ENGAGE, BehaviorState.REST],
            "default_state": BehaviorState.PATROL,
            "utility_weights": {
                "evade": 1.0,
                "strike": 0.7,
                "patrol": 0.5,
                "rest": 0.4
            },
            "perception_range": 20.0,
            "aggression": 0.4
        },
        Archetype.MERCHANT: {
            "states": [BehaviorState.IDLE, BehaviorState.PATROL, BehaviorState.FOLLOW, BehaviorState.REST],
            "default_state": BehaviorState.PATROL,
            "utility_weights": {
                "patrol": 0.5,
                "follow": 1.0,
                "rest": 0.8,
                "flee": 0.9
            },
            "perception_range": 8.0,
            "aggression": 0.1
        },
        Archetype.SCOUT: {
            "states": [BehaviorState.IDLE, BehaviorState.PATROL, BehaviorState.ALERT, BehaviorState.FLEE],
            "default_state": BehaviorState.PATROL,
            "utility_weights": {
                "patrol": 1.0,
                "alert": 0.9,
                "flee": 0.8,
                "rest": 0.2
            },
            "perception_range": 25.0,
            "aggression": 0.3
        },
        Archetype.BRAWLER: {
            "states": [BehaviorState.IDLE, BehaviorState.ENGAGE, BehaviorState.ATTACK, BehaviorState.DEFEND, BehaviorState.FLEE],
            "default_state": BehaviorState.ENGAGE,
            "utility_weights": {
                "attack": 1.0,
                "defend": 0.7,
                "flee": 0.4,
                "rest": 0.1
            },
            "perception_range": 8.0,
            "aggression": 1.0
        },
        Archetype.MAGE: {
            "states": [BehaviorState.IDLE, BehaviorState.ALERT, BehaviorState.ENGAGE, BehaviorState.FLEE, BehaviorState.REST],
            "default_state": BehaviorState.IDLE,
            "utility_weights": {
                "engage": 1.0,
                "flee": 0.6,
                "alert": 0.8,
                "rest": 0.5
            },
            "perception_range": 15.0,
            "aggression": 0.5
        },
        Archetype.HEALER: {
            "states": [BehaviorState.IDLE, BehaviorState.FOLLOW, BehaviorState.REST, BehaviorState.FLEE],
            "default_state": BehaviorState.IDLE,
            "utility_weights": {
                "follow": 1.0,
                "rest": 0.8,
                "flee": 0.7,
                "idle": 0.5
            },
            "perception_range": 10.0,
            "aggression": 0.2
        }
    }
    
    @classmethod
    def get_template(cls, archetype: Archetype) -> dict:
        """Get template for an archetype"""
        return cls.TEMPLATES.get(archetype, cls.TEMPLATES[Archetype.PREDATOR])


class PersonalityProcessor:
    """
    Converts personality genes into utility function weights.
    
    Input: regulatory genes (personality traits)
    Output: utility weights that adjust base template
    """
    
    def __init__(self):
        # Personality dimension ranges
        self.dimensions = {
            'aggression': (0.0, 1.0),
            'bravery': (0.0, 1.0),
            'sociability': (0.0, 1.0),
            'curiosity': (0.0, 1.0),
            'patience': (0.0, 1.0)
        }
    
    def process(self, personality_genes: dict, base_template: dict) -> dict:
        """
        Process personality into utility weights.
        
        Args:
            personality_genes: dict of gene name -> {'value': float}
            base_template: template from ArchetypeTemplate
            
        Returns:
            Adjusted utility weights
        """
        weights = base_template.get('utility_weights', {}).copy()
        
        # Get personality values with defaults
        aggression = personality_genes.get('aggression', {}).get('value', 0.5)
        bravery = personality_genes.get('bravery', {}).get('value', 0.5)
        sociability = personality_genes.get('sociability', {}).get('value', 0.5)
        
        # Adjust weights based on personality
        # More aggressive = higher attack/flee weights
        if 'attack' in weights:
            weights['attack'] *= (0.5 + aggression)
        if 'flee' in weights:
            weights['flee'] *= (1.0 - aggression * 0.5)  # Less likely to flee if aggressive
        
        # Bravery affects alert/engage vs flee
        if 'alert' in weights:
            weights['alert'] *= (0.5 + bravery)
        if 'flee' in weights:
            weights['flee'] *= (1.0 - bravery * 0.7)
        
        # Sociability affects follow vs patrol
        if 'follow' in weights:
            weights['follow'] *= (0.5 + sociability)
        if 'patrol' in weights:
            weights['patrol'] *= (1.0 - sociability * 0.3)
        
        return weights
    
    def get_default_personality(self) -> dict:
        """Get default personality if none provided"""
        return {
            'aggression': {'value': 0.5},
            'bravery': {'value': 0.5},
            'sociability': {'value': 0.5},
            'curiosity': {'value': 0.5},
            'patience': {'value': 0.5}
        }


class ActionSetGenerator:
    """
    Generates available actions based on entity abilities.
    
    Input: ability genes
    Output: list of available actions with parameters
    """
    
    def generate(self, ability_genes: dict, archetype: Archetype) -> list:
        """
        Generate action set from abilities.
        
        Args:
            ability_genes: dict of ability genes
            archetype: entity archetype
            
        Returns:
            List of available actions
        """
        actions = []
        
        # Get base actions from archetype template
        template = ArchetypeTemplate.get_template(archetype)
        states = template.get('states', [])
        
        # Add abilities as actions
        abilities = ability_genes.get('abilities', {}).get('value', [])
        if isinstance(abilities, list):
            for ability in abilities:
                actions.append({
                    'name': ability,
                    'type': 'ability',
                    'cooldown': 5.0,
                    'range': 10.0,
                    'cost': 20.0
                })
        
        # Add default actions based on archetype
        for state in states:
            actions.append({
                'name': state.value,
                'type': 'movement',
                'params': {}
            })
        
        return actions


class BehaviorTreeCompiler:
    """
    Main compiler that assembles all components into a behavior tree.
    
    Input: UniversalSeed
    Output: Configured BehaviorTree
    """
    
    def __init__(self):
        self.personality_processor = PersonalityProcessor()
        self.action_generator = ActionSetGenerator()
        self.node_counter = 0
    
    def compile(self, seed: dict) -> dict:
        """
        Compile seed into behavior tree.
        
        Args:
            seed: UniversalSeed dictionary
            
        Returns:
            Behavior tree as dict with nodes and metadata
        """
        genes = seed.get('genes', {})
        
        # Get archetype
        archetype_val = genes.get('archetype', {}).get('value', 'predator')
        try:
            archetype = Archetype(archetype_val)
        except ValueError:
            archetype = Archetype.PREDATOR
        
        # Get template
        template = ArchetypeTemplate.get_template(archetype)
        
        # Get personality genes (from regulatory gene)
        regulatory = genes.get('regulatory', {}).get('value', {})
        personality_genes = regulatory if isinstance(regulatory, dict) else {}
        if not personality_genes:
            personality_genes = self.personality_processor.get_default_personality()
        
        # Process personality into utility weights
        utility_weights = self.personality_processor.process(
            personality_genes, 
            template
        )
        
        # Get abilities
        abilities = genes.get('abilities', {}).get('value', [])
        
        # Generate action set
        actions = self.action_generator.generate(
            {'abilities': {'value': abilities}},
            archetype
        )
        
        # Build behavior tree
        tree = self._build_tree(template, utility_weights, actions)
        
        return {
            'archetype': archetype.value,
            'default_state': template['default_state'].value,
            'perception_range': template['perception_range'],
            'utility_weights': utility_weights,
            'actions': actions,
            'tree': tree,
            'metadata': {
                'source_genes': list(genes.keys()),
                'utility_formula': 'sum(consideration_score * consideration_weight)'
            }
        }
    
    def _build_tree(self, template: dict, utility_weights: dict, actions: list) -> dict:
        """Build the actual behavior tree structure"""
        
        root_id = self._next_node_id()
        
        # Root is a utility-based selector
        root = {
            'id': root_id,
            'type': 'utility_selector',
            'children': []
        }
        
        # Add state nodes as children
        for state in template['states']:
            state_node = self._create_state_node(state, utility_weights, actions)
            root['children'].append(state_node)
        
        return {
            'root': root,
            'nodes': self._collect_nodes(root)
        }
    
    def _create_state_node(self, state: BehaviorState, utility_weights: dict, actions: list) -> dict:
        """Create a behavior node for a state"""
        
        node_id = self._next_node_id()
        
        # Get utility weight for this state
        state_key = state.value
        utility = utility_weights.get(state_key, 0.5)
        
        # Find relevant actions for this state
        state_actions = [a for a in actions if a['name'] == state_key or a['type'] == 'movement']
        
        return {
            'id': node_id,
            'type': 'state',
            'state': state.value,
            'utility_threshold': utility,
            'actions': state_actions[:5],  # Limit to 5 actions per state
            'transitions': self._get_transitions(state)
        }
    
    def _get_transitions(self, state: BehaviorState) -> list:
        """Get transition rules for a state"""
        
        # Define typical transitions
        transitions = {
            BehaviorState.IDLE: [
                {'to': BehaviorState.PATROL, 'condition': 'time_elapsed > 10'},
                {'to': BehaviorState.ALERT, 'condition': 'threat_detected'}
            ],
            BehaviorState.PATROL: [
                {'to': BehaviorState.IDLE, 'condition': 'patrol_complete'},
                {'to': BehaviorState.ALERT, 'condition': 'threat_detected'},
                {'to': BehaviorState.ENGAGE, 'condition': 'enemy_in_range'}
            ],
            BehaviorState.ALERT: [
                {'to': BehaviorState.ENGAGE, 'condition': 'threat_confirmed'},
                {'to': BehaviorState.PATROL, 'condition': 'threat_gone'},
                {'to': BehaviorState.FLEE, 'condition': 'threat_overwhelming'}
            ],
            BehaviorState.ENGAGE: [
                {'to': BehaviorState.DEFEND, 'condition': 'health_low'},
                {'to': BehaviorState.FLEE, 'condition': 'health_critical'},
                {'to': BehaviorState.IDLE, 'condition': 'target_defeated'}
            ],
            BehaviorState.FLEE: [
                {'to': BehaviorState.REST, 'condition': 'safe_distance'},
                {'to': BehaviorState.IDLE, 'condition': 'no_threat'}
            ],
            BehaviorState.REST: [
                {'to': BehaviorState.IDLE, 'condition': 'health_restored'},
                {'to': BehaviorState.ALERT, 'condition': 'threat_detected'}
            ]
        }
        
        return transitions.get(state, [])
    
    def _next_node_id(self) -> str:
        """Generate unique node ID"""
        self.node_counter += 1
        return f"node_{self.node_counter}"
    
    def _collect_nodes(self, node: dict) -> list:
        """Recursively collect all nodes"""
        nodes = [node]
        for child in node.get('children', []):
            nodes.extend(self._collect_nodes(child))
        return nodes


class UtilityDecisionMaker:
    """
    Makes decisions using utility scores.
    Used at runtime to choose best action.
    """
    
    def __init__(self, behavior_tree: dict):
        self.tree = behavior_tree
        self.weights = behavior_tree.get('utility_weights', {})
    
    def evaluate(self, context: dict) -> str:
        """
        Evaluate context and return best action.
        
        Args:
            context: dict with 'health', 'nearby_entities', 'threats', etc.
            
        Returns:
            Best action to take
        """
        scores = []
        
        for action_name, base_weight in self.weights.items():
            score = self._calculate_utility(action_name, base_weight, context)
            scores.append(UtilityScore(action_name, score))
        
        # Sort by score descending
        scores.sort(key=lambda x: x.score, reverse=True)
        
        if scores:
            return scores[0].action
        return 'idle'
    
    def _calculate_utility(self, action: str, base_weight: float, context: dict) -> float:
        """Calculate utility score for an action"""
        
        score = base_weight
        
        # Adjust based on context
        health = context.get('health', 1.0)
        nearby_enemies = context.get('nearby_enemies', 0)
        nearby_allies = context.get('nearby_allies', 0)
        
        if action in ['attack', 'engage']:
            # More likely if enemies nearby and health good
            if nearby_enemies > 0:
                score *= (1.0 + min(nearby_enemies * 0.1, 0.5))
            if health < 0.3:
                score *= 0.1
        
        elif action in ['flee', 'rest']:
            # More likely if health low or overwhelmed
            if health < 0.5:
                score *= (1.0 + (0.5 - health) * 2)
            if nearby_enemies > 3:
                score *= 1.5
        
        elif action == 'patrol':
            # Less likely if many enemies
            if nearby_enemies > 0:
                score *= 0.5
        
        elif action == 'follow':
            # More likely if allies nearby
            if nearby_allies > 0:
                score *= (1.0 + min(nearby_allies * 0.2, 1.0))
        
        return score


# ============================================================
# MAIN API
# ============================================================

def compile_behavior(seed: dict) -> dict:
    """
    Main entry point for behavior compilation.
    
    Usage:
        seed = get_seed_from_db(seed_id)
        behavior = behavior_compiler.compile_behavior(seed)
        # behavior now has tree, utility_weights, actions
    """
    compiler = BehaviorTreeCompiler()
    return compiler.compile(seed)


def create_decision_maker(behavior_tree: dict) -> UtilityDecisionMaker:
    """
    Create a decision maker for runtime use.
    
    Usage:
        behavior = compile_behavior(seed)
        maker = create_decision_maker(behavior)
        action = maker.evaluate({'health': 0.8, 'nearby_enemies': 2})
    """
    return UtilityDecisionMaker(behavior_tree)


# Example usage:
if __name__ == "__main__":
    # Test with sample seed
    test_seed = {
        'genes': {
            'archetype': {'value': 'predator'},
            'regulatory': {
                'value': {
                    'aggression': {'value': 0.8},
                    'bravery': {'value': 0.7},
                    'sociability': {'value': 0.3}
                }
            },
            'abilities': {'value': ['fire_breath', 'claw']},
            'perception': {'value': 15.0}
        }
    }
    
    # Compile behavior
    behavior = compile_behavior(test_seed)
    print(f"Compiled behavior for archetype: {behavior['archetype']}")
    print(f"Default state: {behavior['default_state']}")
    print(f"Perception range: {behavior['perception_range']}")
    print(f"\nUtility weights:")
    for action, weight in behavior['utility_weights'].items():
        print(f"  {action}: {weight:.2f}")
    print(f"\nAvailable actions: {len(behavior['actions'])}")
    
    # Test decision making
    maker = create_decision_maker(behavior)
    
    # Different contexts
    contexts = [
        {'health': 0.9, 'nearby_enemies': 2, 'nearby_allies': 0},
        {'health': 0.2, 'nearby_enemies': 1, 'nearby_allies': 3},
        {'health': 0.5, 'nearby_enemies': 0, 'nearby_allies': 5}
    ]
    
    print("\nDecision making examples:")
    for ctx in contexts:
        action = maker.evaluate(ctx)
        print(f"  Context {ctx} -> {action}")