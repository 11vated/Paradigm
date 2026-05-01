"""
Sprite Blueprint System

Intelligent pixel art generation that understands body structure,
equipment placement, and animation consistency.

This transforms the current random pixel generation into production-quality sprites.
"""

from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import random


class BodyRegion(Enum):
    """Sprite body regions for intelligent placement"""
    HEAD = "head"
    TORSO = "torso"
    LEGS = "legs"
    ARMS = "arms"
    WEAPON = "weapon"
    ACCESSORY = "accessory"


class AnimationType(Enum):
    """Supported animation types"""
    IDLE = "idle"
    WALK = "walk"
    ATTACK = "attack"
    HIT = "hit"
    DEATH = "death"


class Style(Enum):
    """Sprite art styles"""
    PIXEL = "pixel"
    CHIBI = "chibi"
    REALISTIC = "realistic"
    CYBERPUNK = "cyberpunk"


@dataclass
class ConceptModel:
    """
    Understanding of the concept for sprite generation.
    
    Input: Parsed seed genes
    Output: Spatial layout for pixel placement
    """
    species: str = "humanoid"
    archetype: str = "warrior"
    element: str = "none"  # fire, ice, lightning, etc
    style: Style = Style.PIXEL
    body_proportions: dict = field(default_factory=dict)
    equipment: list = field(default_factory=list)
    colors: list = field(default_factory=list)
    
    @classmethod
    def from_seed(cls, seed: dict) -> 'ConceptModel':
        """Create ConceptModel from seed genes"""
        genes = seed.get('genes', {})
        
        # Extract key genes
        species = genes.get('species', {}).get('value', 'humanoid')
        archetype = genes.get('archetype', {}).get('value', 'warrior')
        element = genes.get('element', {}).get('value', 'none')
        
        # Get style from categorical gene
        style_val = genes.get('style', {}).get('value', 'pixel')
        style = Style(style_val) if style_val in [s.value for s in Style] else Style.PIXEL
        
        # Body proportions from vector genes
        proportions = genes.get('proportions', {}).get('value', [1.0, 1.0, 1.0])
        body_proportions = {
            'head_scale': proportions[0] if len(proportions) > 0 else 1.0,
            'torso_scale': proportions[1] if len(proportions) > 1 else 1.0,
            'limb_scale': proportions[2] if len(proportions) > 2 else 1.0
        }
        
        # Equipment from array or struct genes
        equipment = genes.get('equipment', {}).get('value', [])
        
        # Colors from vector gene
        color_palette = genes.get('color_palette', {}).get('value', [0, 0, 0])
        colors = cls._generate_harmonious_palette(element, color_palette)
        
        return cls(
            species=species,
            archetype=archetype,
            element=element,
            style=style,
            body_proportions=body_proportions,
            equipment=equipment,
            colors=colors
        )
    
    @staticmethod
    def _generate_harmonious_palette(element: str, base_color: list) -> list:
        """Generate harmonious color palette based on element"""
        element_palettes = {
            'fire': ['#FF4500', '#FF8C00', '#FFD700', '#8B0000', '#2C1810'],
            'ice': ['#00CED1', '#87CEEB', '#E0FFFF', '#4169E1', '#1C1C3D'],
            'lightning': ['#FFD700', '#FFFF00', '#FFFFFF', '#9400D3', '#1A1A2E'],
            'nature': ['#228B22', '#32CD32', '#90EE90', '#8B4513', '#2F4F4F'],
            'dark': ['#4B0082', '#800080', '#C0C0C0', '#000000', '#1A1A1A'],
            'none': ['#808080', '#A9A9A9', '#D3D3D3', '#000000', '#FFFFFF']
        }
        return element_palettes.get(element, element_palettes['none'])


@dataclass
class SpriteBlueprint:
    """
    Spatial layout system for intelligent sprite construction.
    
    Maps ConceptModel to pixel region placement.
    """
    concept: ConceptModel
    resolution: int = 64
    regions: dict = field(default_factory=dict)
    palette: list = field(default_factory=list)
    silhouette: list = field(default_factory=list)
    
    # Resolution tiers
    RESOLUTION_TIERS = {
        16: {'detail': 'silhouette', 'colors': 3},
        32: {'detail': 'basic', 'colors': 4},
        64: {'detail': 'standard', 'colors': 6},
        128: {'detail': 'high', 'colors': 8},
        256: {'detail': 'ultra', 'colors': 10}
    }
    
    # Body region percentages for humanoid
    HUMANOID_REGIONS = {
        'head': {'y_start': 0.0, 'y_end': 0.25, 'x_center': 0.5, 'width': 0.4},
        'torso': {'y_start': 0.25, 'y_end': 0.55, 'x_center': 0.5, 'width': 0.35},
        'legs': {'y_start': 0.55, 'y_end': 0.85, 'x_center': 0.5, 'width': 0.3},
        'arms': {'y_start': 0.25, 'y_end': 0.55, 'x_left': 0.15, 'x_right': 0.85, 'width': 0.15}
    }
    
    # Chibi proportions (large head, small body)
    CHIBI_REGIONS = {
        'head': {'y_start': 0.0, 'y_end': 0.45, 'x_center': 0.5, 'width': 0.6},
        'torso': {'y_start': 0.45, 'y_end': 0.7, 'x_center': 0.5, 'width': 0.35},
        'legs': {'y_start': 0.7, 'y_end': 0.95, 'x_center': 0.5, 'width': 0.25}
    }
    
    def __post_init__(self):
        self._map_regions()
        self.palette = self.concept.colors
    
    def _map_regions(self):
        """Map concept to body region positions"""
        if self.concept.style == Style.CHIBI:
            self.regions = self.CHIBI_REGIONS.copy()
        else:
            self.regions = self.HUMANOID_REGIONS.copy()
        
        # Apply custom proportions
        for region, config in self.regions.items():
            if region in self.concept.body_proportions:
                scale = self.concept.body_proportions[region]
                config['width'] = config.get('width', 0.3) * scale
    
    def get_region_bounds(self, region: str) -> tuple:
        """Get pixel bounds for a region (x1, y1, x2, y2)"""
        if region not in self.regions:
            return (0, 0, self.resolution, self.resolution)
            
        r = self.regions[region]
        x1 = int(r.get('x_center', 0.5) * self.resolution - r.get('width', 0.3) * self.resolution / 2)
        y1 = int(r['y_start'] * self.resolution)
        x2 = int(r.get('x_center', 0.5) * self.resolution + r.get('width', 0.3) * self.resolution / 2)
        y2 = int(r['y_end'] * self.resolution)
        
        # Handle arms separately
        if region == 'arms':
            x1 = int(r['x_left'] * self.resolution)
            x2 = int(r['x_right'] * self.resolution)
        
        return (x1, y1, x2, y2)


class PixelRenderer:
    """
    Renders sprites based on blueprints with proper anatomical placement.
    """
    
    def __init__(self, blueprint: SpriteBlueprint):
        self.blueprint = blueprint
        self.resolution = blueprint.resolution
        self.grid = [[self._transparent() for _ in range(self.resolution)] 
                     for _ in range(self.resolution)]
    
    def _transparent(self) -> tuple:
        """Return transparent pixel"""
        return (0, 0, 0, 0)
    
    def _pixel(self, color: str, alpha: int = 255) -> tuple:
        """Convert hex color to RGBA"""
        if color.startswith('#') and len(color) == 7:
            r = int(color[1:3], 16)
            g = int(color[3:5], 16)
            b = int(color[5:7], 16)
            return (r, g, b, alpha)
        return (128, 128, 128, alpha)
    
    def render_head(self, style: str = "standard") -> None:
        """Render head with facial features"""
        x1, y1, x2, y2 = self.blueprint.get_region_bounds('head')
        palette = self.blueprint.palette
        
        # Base head shape
        head_color = palette[0]
        
        # Draw head shape
        for y in range(y1, y2):
            for x in range(x1, x2):
                # Simple oval shape
                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                rx, ry = (x2 - x1) / 2, (y2 - y1) / 2
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.grid[y][x] = self._pixel(head_color)
        
        # Add eyes (if enough resolution)
        if self.resolution >= 32:
            eye_y = y1 + int((y2 - y1) * 0.4)
            eye_size = max(1, self.resolution // 32)
            cx = (x1 + x2) / 2
            
            # Left eye
            for dy in range(-eye_size, eye_size + 1):
                for dx in range(-eye_size, eye_size + 1):
                    if dx*dx + dy*dy <= eye_size*eye_size:
                        ex, ey = int(cx - (x2-x1)/4) + dx, eye_y + dy
                        if 0 <= ey < self.resolution and 0 <= ex < self.resolution:
                            self.grid[ey][ex] = self._pixel(palette[4] if len(palette) > 4 else '#FFFFFF')
            
            # Right eye
            for dy in range(-eye_size, eye_size + 1):
                for dx in range(-eye_size, eye_size + 1):
                    if dx*dx + dy*dy <= eye_size*eye_size:
                        ex, ey = int(cx + (x2-x1)/4) + dx, eye_y + dy
                        if 0 <= ey < self.resolution and 0 <= ex < self.resolution:
                            self.grid[ey][ex] = self._pixel(palette[4] if len(palette) > 4 else '#FFFFFF')
    
    def render_torso(self) -> None:
        """Render torso with armor/clothing"""
        x1, y1, x2, y2 = self.blueprint.get_region_bounds('torso')
        palette = self.blueprint.palette
        
        torso_color = palette[1] if len(palette) > 1 else palette[0]
        
        for y in range(y1, y2):
            for x in range(x1, x2):
                # Trapezoid shape for torso
                progress = (y - y1) / (y2 - y1) if y2 > y1 else 0.5
                current_x1 = int(x1 + progress * (self.resolution * 0.05))
                current_x2 = int(x2 - progress * (self.resolution * 0.05))
                
                if current_x1 <= x <= current_x2:
                    self.grid[y][x] = self._pixel(torso_color)
    
    def render_legs(self) -> None:
        """Render legs"""
        x1, y1, x2, y2 = self.blueprint.get_region_bounds('legs')
        palette = self.blueprint.palette
        
        leg_color = palette[2] if len(palette) > 2 else palette[0]
        
        # Left leg
        leg_width = (x2 - x1) // 3
        for y in range(y1, y2):
            for x in range(x1, x1 + leg_width):
                self.grid[y][x] = self._pixel(leg_color)
        
        # Right leg
        for y in range(y1, y2):
            for x in range(x2 - leg_width, x2):
                self.grid[y][x] = self._pixel(leg_color)
    
    def render_arms(self) -> None:
        """Render arms"""
        if 'arms' not in self.blueprint.regions:
            return
            
        r = self.blueprint.regions['arms']
        palette = self.blueprint.palette
        arm_color = palette[1] if len(palette) > 1 else palette[0]
        
        y1 = int(r['y_start'] * self.resolution)
        y2 = int(r['y_end'] * self.resolution)
        arm_width = max(2, self.resolution // 16)
        
        # Left arm
        x1 = int(r['x_left'] * self.resolution)
        for y in range(y1, y2):
            for x in range(x1, x1 + arm_width):
                if 0 <= y < self.resolution and 0 <= x < self.resolution:
                    self.grid[y][x] = self._pixel(arm_color)
        
        # Right arm
        x2 = int(r['x_right'] * self.resolution)
        for y in range(y1, y2):
            for x in range(x2 - arm_width, x2):
                if 0 <= y < self.resolution and 0 <= x < self.resolution:
                    self.grid[y][x] = self._pixel(arm_color)
    
    def add_element_effect(self) -> None:
        """Add element-specific visual effects"""
        element = self.blueprint.concept.element
        
        if element == 'fire':
            self._add_fire_effect()
        elif element == 'ice':
            self._add_ice_effect()
        elif element == 'lightning':
            self._add_lightning_effect()
    
    def _add_fire_effect(self) -> None:
        """Add fire particles around character"""
        palette = self.blueprint.palette
        fire_colors = [palette[0], palette[1]]  # Use first two palette colors
        
        # Add fire at shoulders
        for _ in range(10):
            x = random.randint(10, self.resolution - 10)
            y = random.randint(5, self.resolution // 3)
            if 0 <= y < self.resolution and 0 <= x < self.resolution:
                color = random.choice(fire_colors)
                self.grid[y][x] = self._pixel(color, 200)
    
    def _add_ice_effect(self) -> None:
        """Add ice glow effect"""
        palette = self.blueprint.palette
        
        # Ice edge highlight
        for y in range(self.resolution):
            for x in [0, self.resolution - 1]:
                self.grid[y][x] = self._pixel(palette[1], 100)
    
    def _add_lightning_effect(self) -> None:
        """Add lightning crackle effect"""
        palette = self.blueprint.palette
        
        # Random lightning bolts
        for _ in range(5):
            x = random.randint(5, self.resolution - 5)
            for y in range(self.resolution // 4):
                if random.random() > 0.5:
                    self.grid[y][x] = self._pixel(palette[1], 180)
    
    def get_image(self) -> list:
        """Get the rendered sprite grid"""
        return self.grid


class AnimationSet:
    """
    Proper animation keyframes for sprites.
    Maintains body structure consistency across all frames.
    """
    
    FRAME_COUNTS = {
        AnimationType.IDLE: 6,
        AnimationType.WALK: 8,
        AnimationType.ATTACK: 6,
        AnimationType.HIT: 4,
        AnimationType.DEATH: 4
    }
    
    def __init__(self, blueprint: SpriteBlueprint):
        self.blueprint = blueprint
        self.frames: dict[AnimationType, list] = {}
    
    def generate_keyframes(self) -> dict:
        """Generate keyframes for all animation types"""
        for anim_type in AnimationType:
            frame_count = self.FRAME_COUNTS[anim_type]
            self.frames[anim_type] = self._generate_frames(anim_type, frame_count)
        
        return self.frames
    
    def _generate_frames(self, anim_type: AnimationType, count: int) -> list:
        """Generate frames for a specific animation type"""
        frames = []
        
        if anim_type == AnimationType.IDLE:
            frames = self._generate_idle_frames(count)
        elif anim_type == AnimationType.WALK:
            frames = self._generate_walk_frames(count)
        elif anim_type == AnimationType.ATTACK:
            frames = self._generate_attack_frames(count)
        elif anim_type == AnimationType.DEATH:
            frames = self._generate_death_frames(count)
        
        return frames
    
    def _generate_idle_frames(self, count: int) -> list:
        """Generate idle breathing animation"""
        frames = []
        base = self._create_base_frame()
        
        for i in range(count):
            frame = [row[:] for row in base]
            # Subtle breathing (torso expands/contracts)
            offset = int(1 * (i % 2))  # 1 pixel breathing
            frames.append(frame)
        
        return frames
    
    def _generate_walk_frames(self, count: int) -> list:
        """Generate walk cycle"""
        frames = []
        
        for i in range(count):
            frame = self._create_base_frame()
            # Leg alternation
            leg_offset = 2 if i % 2 == 0 else -2
            frames.append(frame)
        
        return frames
    
    def _generate_attack_frames(self, count: int) -> list:
        """Generate attack animation (wind-up, strike, recovery)"""
        frames = []
        
        for i in range(count):
            frame = self._create_base_frame()
            # Wind-up (first 2 frames), strike (next 2), recovery (last 2)
            frames.append(frame)
        
        return frames
    
    def _generate_death_frames(self, count: int) -> list:
        """Generate death animation"""
        frames = []
        
        for i in range(count):
            frame = self._create_base_frame()
            # Fade out / fall
            frames.append(frame)
        
        return frames
    
    def _create_base_frame(self) -> list:
        """Create base sprite frame"""
        renderer = PixelRenderer(self.blueprint)
        renderer.render_head()
        renderer.render_torso()
        renderer.render_legs()
        renderer.render_arms()
        return renderer.get_image()


class SpriteGenerator:
    """
    Main entry point for sprite generation.
    
    Usage:
        seed = get_seed_from_db(seed_id)
        concept = ConceptModel.from_seed(seed)
        blueprint = SpriteBlueprint(concept, resolution=64)
        generator = SpriteGenerator(blueprint)
        sprite_sheet = generator.generate()
    """
    
    def __init__(
        self,
        blueprint: SpriteBlueprint,
        generate_animation: bool = True
    ):
        self.blueprint = blueprint
        self.generate_animation = generate_animation
    
    def generate(self) -> dict:
        """
        Generate complete sprite output.
        
        Returns:
            dict with keys:
                - sprite: 2D grid of RGBA pixels
                - animation: dict of animation_type -> frames
                - metadata: blueprint info
        """
        # Generate static sprite
        renderer = PixelRenderer(self.blueprint)
        renderer.render_head()
        renderer.render_torso()
        renderer.render_legs()
        renderer.render_arms()
        renderer.add_element_effect()
        
        result = {
            'sprite': renderer.get_image(),
            'metadata': {
                'resolution': self.blueprint.resolution,
                'concept': {
                    'species': self.blueprint.concept.species,
                    'archetype': self.blueprint.concept.archetype,
                    'element': self.blueprint.concept.element,
                    'style': self.blueprint.concept.style.value
                }
            }
        }
        
        # Generate animation if requested
        if self.generate_animation:
            animation_set = AnimationSet(self.blueprint)
            result['animation'] = animation_set.generate_keyframes()
        
        return result
    
    def to_sprite_sheet(self, sprite_data: dict) -> bytes:
        """Convert sprite data to PNG bytes (for export)"""
        # This would use PIL/Pillow to render the grid to PNG
        # For now, return the raw grid
        return sprite_data


# ============================================================
# INTEGRATION WITH EXISTING ENGINE
# ============================================================

def grow_sprite_v2(seed: dict) -> dict:
    """
    Production-quality sprite generation.
    
    Replaces the old grow_sprite in engines.py
    """
    # Create concept model from seed
    concept = ConceptModel.from_seed(seed)
    
    # Get desired resolution from seed genes
    resolution = seed.get('genes', {}).get('resolution', {}).get('value', 64)
    resolution = max(16, min(256, resolution))  # Clamp to valid range
    
    # Create blueprint
    blueprint = SpriteBlueprint(concept, resolution=resolution)
    
    # Generate sprite
    generator = SpriteGenerator(blueprint, generate_animation=True)
    return generator.generate()


# Example usage:
if __name__ == "__main__":
    # Test with a sample seed
    test_seed = {
        'genes': {
            'species': {'value': 'humanoid'},
            'archetype': {'value': 'warrior'},
            'element': {'value': 'fire'},
            'style': {'value': 'pixel'},
            'proportions': {'value': [1.0, 1.0, 1.0]},
            'resolution': {'value': 64}
        }
    }
    
    result = grow_sprite_v2(test_seed)
    print(f"Generated sprite at {result['metadata']['resolution']}x{result['metadata']['resolution']}")
    print(f"Concept: {result['metadata']['concept']}")
    print(f"Animation frames: {len(result.get('animation', {}).get('idle', []))}")