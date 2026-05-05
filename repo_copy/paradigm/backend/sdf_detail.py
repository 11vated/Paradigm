"""
SDF Detail System

Adds faces, hands, equipment, hair/fur to SDF renders.
This is the signature GSPL visual output.
"""

from dataclasses import dataclass, field
from typing import Optional, Tuple
from enum import Enum
import math


class MaterialType(Enum):
    """Material types for SDF rendering"""
    METAL = "metal"
    CLOTH = "cloth"
    SKIN = "skin"
    FIRE = "fire"
    ICE = "ice"
    WOOD = "wood"
    CRYSTAL = "crystal"


@dataclass
class Vec3:
    """3D vector for SDF operations"""
    x: float
    y: float
    z: float
    
    def __add__(self, other):
        return Vec3(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other):
        return Vec3(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar: float):
        return Vec3(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def length(self) -> float:
        return math.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def normalize(self) -> 'Vec3':
        l = self.length()
        if l > 0:
            return Vec3(self.x/l, self.y/l, self.z/l)
        return Vec3(0, 0, 0)
    
    def dot(self, other: 'Vec3') -> float:
        return self.x * other.x + self.y * other.y + self.z * other.z


def sd_sphere(p: Vec3, radius: float) -> float:
    """Signed distance to sphere"""
    return p.length() - radius


def sd_box(p: Vec3, size: Vec3) -> float:
    """Signed distance to box"""
    q = Vec3(abs(p.x) - size.x, abs(p.y) - size.y, abs(p.z) - size.z)
    return Vec3(
        max(q.x, 0), max(q.y, 0), max(q.z, 0)
    ).length() + min(max(q.x, max(q.y, q.z)), 0)


def sd_capsule(p: Vec3, a: Vec3, b: Vec3, radius: float) -> float:
    """Signed distance to capsule"""
    pa = p - a
    ba = b - a
    h = max(0, min(1, pa.dot(ba) / ba.dot(ba)))
    return (pa - ba * h).length() - radius


def sd_torus(p: Vec3, radii: Tuple[float, float]) -> float:
    """Signed distance to torus"""
    q = Vec3(math.sqrt(p.x**2 + p.z**2) - radii[0], p.y, 0)
    return q.length() - radii[1]


def sd_smooth_union(d1: float, d2: float, k: float) -> float:
    """Smooth union of two SDFs"""
    h = max(k - abs(d1 - d2), 0) / k
    return min(d1, d2) - h * h * k * 0.25


class FaceSDF:
    """
    SDF-based face rendering.
    Creates faces with eyes, nose, mouth.
    """
    
    def __init__(self, species: str = "human"):
        self.species = species
        self._setup_face_params()
    
    def _setup_face_params(self):
        """Setup parameters based on species"""
        species_params = {
            "human": {
                "eye_spacing": 0.3,
                "eye_size": 0.08,
                "nose_length": 0.15,
                "mouth_width": 0.2,
                "head_radius": 0.5
            },
            "elf": {
                "eye_spacing": 0.28,
                "eye_size": 0.07,
                "nose_length": 0.18,
                "mouth_width": 0.15,
                "head_radius": 0.48
            },
            "orc": {
                "eye_spacing": 0.35,
                "eye_size": 0.1,
                "nose_length": 0.2,
                "mouth_width": 0.3,
                "head_radius": 0.6
            },
            "dragon": {
                "eye_spacing": 0.4,
                "eye_size": 0.12,
                "nose_length": 0.25,
                "mouth_width": 0.4,
                "head_radius": 0.7
            }
        }
        self.params = species_params.get(self.species, species_params["human"])
    
    def sdf(self, p: Vec3) -> float:
        """Calculate SDF for face"""
        # Head base
        head = sd_sphere(p, self.params["head_radius"])
        
        # Eye sockets (subtraction)
        eye_y = self.params["head_radius"] * 0.3
        eye_z = self.params["head_radius"] * 0.7
        
        left_eye = sd_sphere(
            Vec3(p.x - self.params["eye_spacing"], p.y - eye_y, p.z - eye_z),
            self.params["eye_size"]
        )
        right_eye = sd_sphere(
            Vec3(p.x + self.params["eye_spacing"], p.y - eye_y, p.z - eye_z),
            self.params["eye_size"]
        )
        
        # Nose (elongated sphere)
        nose_tip = Vec3(p.x, p.y - self.params["nose_length"]*0.3, p.z - self.params["nose_length"])
        nose = sd_capsule(p, Vec3(0, 0, self.params["head_radius"]*0.9), nose_tip, 0.03)
        
        # Mouth (curved line)
        mouth_y = -self.params["head_radius"] * 0.3
        mouth_z = self.params["head_radius"] * 0.85
        mouth = sd_box(
            Vec3(p.x, p.y - mouth_y, p.z - mouth_z),
            Vec3(self.params["mouth_width"], 0.02, 0.05)
        )
        
        # Combine: head minus eyes, plus nose
        face = head
        face = max(face, -left_eye)  # Subtract left eye
        face = max(face, -right_eye)  # Subtract right eye
        face = sd_smooth_union(face, nose, 0.05)  # Add nose smoothly
        face = max(face, -mouth)  # Subtract mouth
        
        return face
    
    def get_eye_positions(self) -> Tuple[Vec3, Vec3]:
        """Get positions for eye rendering"""
        eye_y = self.params["head_radius"] * 0.3
        eye_z = self.params["head_radius"] * 0.7
        return (
            Vec3(-self.params["eye_spacing"], eye_y, eye_z),
            Vec3(self.params["eye_spacing"], eye_y, eye_z)
        )


class HandSDF:
    """
    SDF-based hand rendering.
    Creates hands with fingers, palm, different poses.
    """
    
    def __init__(self, pose: str = "open"):
        self.pose = pose
        self.finger_count = 5
    
    def sdf(self, p: Vec3) -> float:
        """Calculate SDF for hand"""
        # Palm (flattened sphere)
        palm = sd_sphere(Vec3(p.x, p.y, p.z - 0.1), 0.15)
        
        # Finger positions based on pose
        if self.pose == "open":
            finger_angles = [0, -20, -40, -60, -80]
        elif self.pose == "fist":
            finger_angles = [0, 0, 0, 0, 0]
        elif self.pose == "grip":
            finger_angles = [-30, -45, -60, -70, -70]
        else:
            finger_angles = [0, -15, -30, -45, -60]
        
        # Generate fingers
        for i, angle in enumerate(finger_angles):
            x_offset = (i - 2) * 0.06
            angle_rad = math.radians(angle)
            
            # Finger as capsule
            base = Vec3(x_offset, 0.1, 0)
            tip = Vec3(
                x_offset + math.sin(angle_rad) * 0.1,
                0.15 + math.cos(angle_rad) * 0.1,
                -0.05
            )
            finger = sd_capsule(p, base, tip, 0.025)
            palm = sd_smooth_union(palm, finger, 0.02)
        
        return palm
    
    def get_grip_center(self) -> Vec3:
        """Get center point for grip pose"""
        return Vec3(0, 0.1, 0)


class EquipmentSDF:
    """
    SDF-based equipment (weapons, armor).
    Composable overlays on body SDF.
    """
    
    def sword(self, p: Vec3, style: str = "straight") -> float:
        """SDF for sword"""
        if style == "straight":
            # Blade (thin box)
            blade = sd_box(
                Vec3(abs(p.x) - 0.02, p.y, p.z + 0.4),
                Vec3(0.015, 0.5, 0.015)
            )
            
            # Guard (cross bar)
            guard = sd_box(
                Vec3(p.x, p.y - 0.02, p.z + 0.1),
                Vec3(0.1, 0.02, 0.02)
            )
            
            # Grip
            grip = sd_capsule(
                p,
                Vec3(0, -0.02, 0),
                Vec3(0, -0.15, 0.05),
                0.02
            )
            
            # Pommel
            pommel = sd_sphere(Vec3(0, -0.18, 0.05), 0.03)
            
            return sd_smooth_union(
                sd_smooth_union(blade, guard, 0.01),
                sd_smooth_union(grip, pommel, 0.01),
                0.01
            )
        else:  # curved/scimitar
            # Simplified curved blade
            return sd_torus(
                Vec3(p.x, p.y, p.z + 0.3),
                (0.3, 0.02)
            )
    
    def shield(self, p: Vec3, shape: str = "round") -> float:
        """SDF for shield"""
        if shape == "round":
            return sd_sphere(Vec3(p.x, p.y, p.z + 0.05), 0.25)
        elif shape == "kite":
            return sd_box(Vec3(p.x, p.y, p.z + 0.1), Vec3(0.2, 0.3, 0.02))
        else:  # heater
            return sd_box(Vec3(p.x, p.y, p.z + 0.05), Vec3(0.2, 0.25, 0.02))
    
    def armor_chest(self, p: Vec3) -> float:
        """SDF for chest armor"""
        # Main chest plate
        chest = sd_box(
            Vec3(abs(p.x) - 0.15, p.y - 0.1, p.z + 0.08),
            Vec3(0.12, 0.15, 0.04)
        )
        
        # Shoulders (pauldrons)
        left_shoulder = sd_sphere(Vec3(p.x + 0.2, p.y + 0.1, p.z), 0.08)
        right_shoulder = sd_sphere(Vec3(p.x - 0.2, p.y + 0.1, p.z), 0.08)
        
        return sd_smooth_union(
            sd_smooth_union(chest, left_shoulder, 0.02),
            right_shoulder,
            0.02
        )


class HairFurSDF:
    """
    SDF-based hair and fur rendering.
    Uses noise-displaced shell technique.
    """
    
    def __init__(self, hair_type: str = "short"):
        self.hair_type = hair_type
    
    def sdf(self, p: Vec3, base_surface: float) -> float:
        """Calculate SDF for hair/fur overlay"""
        # Shell layers for volume
        if self.hair_type == "short":
            # Spiky short hair
            density = 5
            length = 0.08
        elif self.hair_type == "long":
            # Flowing long hair
            density = 8
            length = 0.25
        elif self.hair_type == "fur":
            # Furry texture
            density = 15
            length = 0.04
        else:  # mohawk
            density = 3
            length = 0.15
        
        # Simple shell approximation
        return base_surface  # Would need noise for full implementation


class SeedformStyle:
    """
    The 7 Seedform pillars - the unique GSPL aesthetic.
    """
    
    # Material properties
    MATERIALS = {
        MaterialType.METAL: {
            "roughness": 0.2,
            "metallic": 1.0,
            "reflectivity": 0.9
        },
        MaterialType.CLOTH: {
            "roughness": 0.8,
            "metallic": 0.0,
            "reflectivity": 0.1
        },
        MaterialType.SKIN: {
            "roughness": 0.6,
            "metallic": 0.0,
            "reflectivity": 0.2
        },
        MaterialType.FIRE: {
            "roughness": 0.0,
            "metallic": 0.0,
            "reflectivity": 0.5,
            "emissive": 1.0
        },
        MaterialType.ICE: {
            "roughness": 0.1,
            "metallic": 0.3,
            "reflectivity": 0.8,
            "transparency": 0.9
        }
    }
    
    @staticmethod
    def apply_growth_lines(p: Vec3, noise_scale: float = 10.0) -> float:
        """Add growth line displacement"""
        import math
        # Simplified noise function
        return math.sin(p.x * noise_scale) * math.sin(p.y * noise_scale) * 0.01
    
    @staticmethod
    def apply_seed_luminescence(p: Vec3, core: Vec3) -> float:
        """Calculate inner glow from seed core"""
        dist = (p - core).length()
        return max(0, 1.0 - dist * 2) * 0.3
    
    @staticmethod
    def apply_blend_zone(sdf1: float, sdf2: float, blend_width: float = 0.05) -> float:
        """Calculate smooth blend between body parts"""
        return sd_smooth_union(sdf1, sdf2, blend_width)


# ============================================================
# GLSL Shader Generation
# ============================================================

def generate_face_sdf_glsl(species: str = "human") -> str:
    """Generate GLSL code for face SDF"""
    face = FaceSDF(species)
    eyes = face.get_eye_positions()
    
    return f"""
float sdFace(vec3 p) {{
    // Species: {species}
    float head = length(p) - 0.5;
    
    // Eyes
    vec3 leftEye = vec3(-{eyes[0].x:.2f}, {eyes[0].y:.2f}, {eyes[0].z:.2f});
    vec3 rightEye = vec3({eyes[1].x:.2f}, {eyes[1].y:.2f}, {eyes[1].z:.2f});
    float eyeRadius = {face.params['eye_size']:.2f};
    
    head = max(head, -(length(p - leftEye) - eyeRadius));
    head = max(head, -(length(p - rightEye) - eyeRadius));
    
    return head;
}}
"""


def generate_equipment_sdf_glsl(equipment: list) -> str:
    """Generate GLSL for equipment SDFs"""
    glsl = "float sdEquipment(vec3 p) {\n"
    glsl += "    float d = 1000.0;\n"
    
    if "sword" in equipment:
        glsl += "    d = min(d, sdSword(p));\n"
    if "shield" in equipment:
        glsl += "    d = min(d, sdShield(p));\n"
    if "armor" in equipment:
        glsl += "    d = min(d, sdArmor(p));\n"
    
    glsl += "    return d;\n}\n"
    return glsl


# ============================================================
# Integration with existing pipeline
# ============================================================

def enhance_with_details(base_seed: dict) -> dict:
    """
    Enhance a seed with detail system parameters.
    
    Adds:
    - face_species: species type for face rendering
    - hand_pose: pose for hands
    - equipment: list of equipment
    - hair_type: type of hair/fur
    - materials: material properties
    """
    genes = base_seed.get('genes', {})
    
    # Add face species based on archetype
    archetype = genes.get('archetype', {}).get('value', 'warrior')
    species_map = {
        'warrior': 'human',
        'mage': 'elf',
        'beast': 'orc',
        'dragon': 'dragon'
    }
    
    # Add detail genes
    genes['face_species'] = {
        'type': 'categorical',
        'value': species_map.get(archetype, 'human'),
        'schema': {'choices': ['human', 'elf', 'orc', 'dragon']}
    }
    
    genes['hand_pose'] = {
        'type': 'categorical',
        'value': 'open',
        'schema': {'choices': ['open', 'fist', 'grip']}
    }
    
    genes['hair_type'] = {
        'type': 'categorical',
        'value': 'short',
        'schema': {'choices': ['short', 'long', 'fur', 'mohawk']}
    }
    
    return base_seed


# Example usage
if __name__ == "__main__":
    # Test face SDF
    face = FaceSDF("human")
    print(f"Face SDF test at origin: {face.sdf(Vec3(0, 0, 0)):.3f}")
    print(f"Face SDF test at surface: {face.sdf(Vec3(0, 0.4, 0.7)):.3f}")
    
    # Test hand SDF
    hand = HandSDF("open")
    print(f"Hand SDF test: {hand.sdf(Vec3(0, 0, 0)):.3f}")
    
    # Test equipment
    equip = EquipmentSDF()
    print(f"Sword SDF test: {equip.sword(Vec3(0, 0, 0)):.3f}")
    print(f"Shield SDF test: {equip.shield(Vec3(0, 0, 0)):.3f}")
    
    # Generate GLSL
    glsl = generate_face_sdf_glsl("human")
    print("\nGenerated GLSL for face:")
    print(glsl[:200] + "...")