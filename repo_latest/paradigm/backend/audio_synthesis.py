"""
Audio Synthesis Pipeline

Pure procedural audio synthesis using Web Audio API concepts.
No samples - fully deterministic from seed genes.

Generates:
- Action sounds (attack, footstep, jump, etc.)
- Ambient sounds (breathing, armor clink, etc.)
- Voice profiles (timbre, pitch range)
"""

import math
import random
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import json


class WaveType(Enum):
    """Available oscillator waveforms"""
    SINE = "sine"
    SQUARE = "square"
    SAWTOOTH = "sawtooth"
    TRIANGLE = "triangle"
    NOISE = "noise"


class SoundAction(Enum):
    """Entity action types for sound generation"""
    ATTACK = "attack"
    FOOTSTEP = "footstep"
    JUMP = "jump"
    LAND = "land"
    HIT = "hit"
    DEATH = "death"
    IDLE = "idle"
    ABILITY = "ability"
    AMBIENT = "ambient"
    EQUIPMENT = "equipment"


@dataclass
class ADSREnvelope:
    """
    Attack, Decay, Sustain, Release envelope.
    Shapes the amplitude of a sound over time.
    """
    attack: float = 0.01    # seconds
    decay: float = 0.1      # seconds  
    sustain: float = 0.3    # level (0-1)
    release: float = 0.2    # seconds
    
    def apply(self, samples: list, sample_rate: int) -> list:
        """Apply envelope to audio samples"""
        n = len(samples)
        attack_samples = int(self.attack * sample_rate)
        decay_samples = int(self.decay * sample_rate)
        release_samples = int(self.release * sample_rate)
        
        result = []
        for i, sample in enumerate(samples):
            # Calculate envelope value at this position
            if i < attack_samples:
                # Attack phase: linear ramp from 0 to 1
                env = i / attack_samples
            elif i < attack_samples + decay_samples:
                # Decay phase: exponential from 1 to sustain
                progress = (i - attack_samples) / decay_samples
                env = 1.0 - (1.0 - self.sustain) * progress
            elif i < n - release_samples:
                # Sustain phase
                env = self.sustain
            else:
                # Release phase: exponential to 0
                progress = (i - (n - release_samples)) / release_samples
                env = self.sustain * (1.0 - progress)
            
            result.append(sample * env)
        
        return result


@dataclass 
class SoundTemplate:
    """
    Template for sound generation.
    Maps entity characteristics to sound parameters.
    """
    wave_type: WaveType
    freq_min: float        # Hz
    freq_max: float        # Hz
    adsr: ADSREnvelope
    duration_min: float    # seconds
    duration_max: float    # seconds
    filter_type: str = "lowpass"
    filter_freq: float = 2000.0
    
    @classmethod
    def from_action(cls, action: SoundAction, size: str = "medium") -> 'SoundTemplate':
        """
        Get default template for an action.
        
        Size affects pitch range: small = higher, large = lower
        """
        size_multipliers = {
            "tiny": 2.0,
            "small": 1.5,
            "medium": 1.0,
            "large": 0.75,
            "huge": 0.5
        }
        mult = size_multipliers.get(size, 1.0)
        
        templates = {
            SoundAction.ATTACK: cls(
                wave_type=WaveType.SAWTOOTH,
                freq_min=200 * mult,
                freq_max=800 * mult,
                adsr=ADSREnvelope(attack=0.01, decay=0.1, sustain=0.3, release=0.2),
                duration_min=0.1,
                duration_max=0.3
            ),
            SoundAction.FOOTSTEP: cls(
                wave_type=WaveType.NOISE,
                freq_min=100 * mult,
                freq_max=300 * mult,
                adsr=ADSREnvelope(attack=0.01, decay=0.05, sustain=0, release=0.1),
                duration_min=0.05,
                duration_max=0.15
            ),
            SoundAction.JUMP: cls(
                wave_type=WaveType.SINE,
                freq_min=200 * mult,
                freq_max=600 * mult,
                adsr=ADSREnvelope(attack=0.02, decay=0.1, sustain=0.2, release=0.1),
                duration_min=0.1,
                duration_max=0.2
            ),
            SoundAction.HIT: cls(
                wave_type=WaveType.SQUARE,
                freq_min=100 * mult,
                freq_max=400 * mult,
                adsr=ADSREnvelope(attack=0.005, decay=0.05, sustain=0, release=0.1),
                duration_min=0.05,
                duration_max=0.15
            ),
            SoundAction.DEATH: cls(
                wave_type=WaveType.SAWTOOTH,
                freq_min=50 * mult,
                freq_max=200 * mult,
                adsr=ADSREnvelope(attack=0.05, decay=0.3, sustain=0, release=0.5),
                duration_min=0.3,
                duration_max=0.8
            ),
            SoundAction.IDLE: cls(
                wave_type=WaveType.SINE,
                freq_min=50 * mult,
                freq_max=150 * mult,
                adsr=ADSREnvelope(attack=0.1, decay=0.2, sustain=0.1, release=0.3),
                duration_min=0.5,
                duration_max=2.0
            ),
            SoundAction.ABILITY: cls(
                wave_type=WaveType.SINE,
                freq_min=400 * mult,
                freq_max=1200 * mult,
                adsr=ADSREnvelope(attack=0.1, decay=0.2, sustain=0.5, release=0.3),
                duration_min=0.3,
                duration_max=0.6
            ),
            SoundAction.EQUIPMENT: cls(
                wave_type=WaveType.TRIANGLE,
                freq_min=800 * mult,
                freq_max=2000 * mult,
                adsr=ADSREnvelope(attack=0.005, decay=0.02, sustain=0, release=0.05),
                duration_min=0.02,
                duration_max=0.1
            )
        }
        
        return templates.get(action, templates[SoundAction.IDLE])


class OscillatorBank:
    """
    Pure synthesis oscillators.
    No samples - all generated from mathematical functions.
    """
    
    SAMPLE_RATE = 44100  # Standard audio sample rate
    
    def sine(self, freq: float, duration: float, phase: float = 0.0) -> list:
        """Generate sine wave"""
        n = int(duration * self.SAMPLE_RATE)
        return [math.sin(2 * math.pi * freq * t / self.SAMPLE_RATE + phase) 
                for t in range(n)]
    
    def square(self, freq: float, duration: float) -> list:
        """Generate square wave"""
        n = int(duration * self.SAMPLE_RATE)
        result = []
        for t in range(n):
            sample = 1.0 if math.sin(2 * math.pi * freq * t / self.SAMPLE_RATE) >= 0 else -1.0
            result.append(sample)
        return result
    
    def sawtooth(self, freq: float, duration: float) -> list:
        """Generate sawtooth wave"""
        n = int(duration * self.SAMPLE_RATE)
        result = []
        for t in range(n):
            phase = (freq * t / self.SAMPLE_RATE) % 1.0
            result.append(2 * phase - 1.0)
        return result
    
    def triangle(self, freq: float, duration: float) -> list:
        """Generate triangle wave"""
        n = int(duration * self.SAMPLE_RATE)
        result = []
        for t in range(n):
            phase = (freq * t / self.SAMPLE_RATE) % 1.0
            result.append(2 * abs(2 * phase - 1.0) - 1.0)
        return result
    
    def noise(self, duration: float, color: str = "white") -> list:
        """Generate noise (white, pink, or brown)"""
        import random
        n = int(duration * self.SAMPLE_RATE)
        
        if color == "white":
            return [random.uniform(-1.0, 1.0) for _ in range(n)]
        elif color == "pink":
            # Simple pink noise approximation
            b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
            result = []
            for _ in range(n):
                white = random.uniform(-1.0, 1.0)
                b0 = 0.99886 * b0 + white * 0.0555179
                b1 = 0.99332 * b1 + white * 0.0750759
                b2 = 0.96900 * b2 + white * 0.1538520
                b3 = 0.86650 * b3 + white * 0.3104856
                b4 = 0.55000 * b4 + white * 0.5329522
                b5 = -0.7616 * b5 - white * 0.0168980
                result.append((b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11)
                b6 = white * 0.115926
            return result
        else:  # brown
            last = 0.0
            result = []
            for _ in range(n):
                white = random.uniform(-1.0, 1.0)
                last = (last + (0.02 * white)) / 1.02
                result.append(last * 3.5)
            return result
    
    def generate(self, wave_type: WaveType, freq: float, duration: float) -> list:
        """Generate wave based on type"""
        if wave_type == WaveType.SINE:
            return self.sine(freq, duration)
        elif wave_type == WaveType.SQUARE:
            return self.square(freq, duration)
        elif wave_type == WaveType.SAWTOOTH:
            return self.sawtooth(freq, duration)
        elif wave_type == WaveType.TRIANGLE:
            return self.triangle(freq, duration)
        elif wave_type == WaveType.NOISE:
            return self.noise(duration, "white")
        else:
            return self.sine(freq, duration)


class AudioProfileCompiler:
    """
    Compiles seed genes into complete audio profile.
    
    Input: UniversalSeed
    Output: AudioProfile with all action sounds
    """
    
    def __init__(self):
        self.oscillator = OscillatorBank()
    
    def compile(self, seed: dict) -> dict:
        """
        Compile seed into audio profile.
        
        Returns dict mapping action -> audio samples
        """
        genes = seed.get('genes', {})
        
        # Extract characteristics that affect sound
        size = genes.get('size', {}).get('value', 0.5)
        element = genes.get('element', {}).get('value', 'none')
        archetype = genes.get('archetype', {}).get('value', 'warrior')
        
        # Map size to string
        size_map = {0.2: "tiny", 0.4: "small", 0.6: "medium", 0.8: "large", 1.0: "huge"}
        size_str = size_map.get(round(size * 2) / 2, "medium")
        
        # Generate sounds for each action
        profile = {}
        
        for action in SoundAction:
            try:
                audio = self._generate_action_sound(
                    action, 
                    size_str,
                    element,
                    archetype
                )
                profile[action.value] = audio
            except Exception as e:
                print(f"Warning: Failed to generate {action.value} sound: {e}")
                profile[action.value] = []
        
        # Add element-specific ambient sounds
        if element != 'none':
            profile[f"{element}_ambient"] = self._generate_element_ambient(element, size_str)
        
        return profile
    
    def _generate_action_sound(
        self, 
        action: SoundAction, 
        size: str,
        element: str,
        archetype: str
    ) -> dict:
        """Generate sound for a specific action"""
        # Get template
        template = SoundTemplate.from_action(action, size)
        
        # Choose frequency within range
        freq = (template.freq_min + template.freq_max) / 2
        
        # Adjust based on element
        if element != 'none' and action in [SoundAction.ABILITY, SoundAction.ATTACK]:
            freq = self._apply_element_pitch(element, freq)
        
        # Choose duration
        duration = (template.duration_min + template.duration_max) / 2
        
        # Generate base waveform
        base_wave = self.oscillator.generate(template.wave_type, freq, duration)
        
        # Apply ADSR envelope
        envelope = ADSREnvelope()
        audio = envelope.apply(base_wave, self.oscillator.SAMPLE_RATE)
        
        # Convert to dict format
        return {
            'samples': audio,
            'sample_rate': self.oscillator.SAMPLE_RATE,
            'duration': duration,
            'wave_type': template.wave_type.value,
            'frequency': freq
        }
    
    def _apply_element_pitch(self, element: str, base_freq: float) -> float:
        """Apply element-specific pitch modifier"""
        pitch_modifiers = {
            'fire': 1.1,      # Higher, more energetic
            'ice': 0.9,       # Lower, crisp
            'lightning': 1.3, # Very high
            'nature': 0.85,   # Deep, earthy
            'dark': 0.8,      # Deep, ominous
            'light': 1.2      # Bright, high
        }
        return base_freq * pitch_modifiers.get(element, 1.0)
    
    def _generate_element_ambient(self, element: str, size: str) -> dict:
        """Generate ambient sound for element"""
        size_multipliers = {"tiny": 2.0, "small": 1.5, "medium": 1.0, "large": 0.75, "huge": 0.5}
        mult = size_multipliers.get(size, 1.0)
        
        element_freqs = {
            'fire': (100, 300),
            'ice': (200, 400),
            'lightning': (300, 600),
            'nature': (50, 150),
            'dark': (30, 100),
            'light': (400, 800)
        }
        
        freq_range = element_freqs.get(element, (200, 400))
        freq = (freq_range[0] + freq_range[1]) / 2 * mult
        
        # Generate noise-based ambient
        duration = 2.0
        noise = self.oscillator.noise(duration, "pink")
        
        # Simple low-pass effect (just take subset for now)
        audio = [s * 0.3 for s in noise[:int(duration * self.oscillator.SAMPLE_RATE * 0.5)]]
        
        return {
            'samples': audio,
            'sample_rate': self.oscillator.SAMPLE_RATE,
            'duration': duration,
            'wave_type': 'noise',
            'frequency': freq,
            'type': f'{element}_ambient'
        }


def generate_audio_profile(seed: dict) -> dict:
    """
    Main entry point for audio generation.
    
    Usage:
        seed = get_seed_from_db(seed_id)
        profile = audio_synthesis.generate_audio_profile(seed)
        # profile now has keys: 'attack', 'footstep', 'jump', etc.
    """
    compiler = AudioProfileCompiler()
    return compiler.compile(seed)


def generate_sound(seed: dict, action: str) -> dict:
    """
    Generate a specific sound for an action.
    
    Usage:
        sound = audio_synthesis.generate_sound(seed, "attack")
    """
    compiler = AudioProfileCompiler()
    
    try:
        action_enum = SoundAction(action)
    except ValueError:
        action_enum = SoundAction.IDLE
    
    genes = seed.get('genes', {})
    size = genes.get('size', {}).get('value', 0.5)
    element = genes.get('element', {}).get('value', 'none')
    archetype = genes.get('archetype', {}).get('value', 'warrior')
    
    size_map = {0.2: "tiny", 0.4: "small", 0.6: "medium", 0.8: "large", 1.0: "huge"}
    size_str = size_map.get(round(size * 2) / 2, "medium")
    
    return compiler._generate_action_sound(action_enum, size_str, element, archetype)


# Export to WAV format (for file export)
def samples_to_wav(samples: list, sample_rate: int = 44100) -> bytes:
    """
    Convert audio samples to WAV format.
    
    Returns raw WAV bytes that can be saved to file.
    """
    import struct
    import wave
    
    # Ensure samples are in valid range
    samples = [max(-1.0, min(1.0, s)) for s in samples]
    
    # Convert to 16-bit integers
    int_samples = [int(s * 32767) for s in samples]
    
    # Create WAV file in memory
    import io
    buffer = io.BytesIO()
    
    with wave.open(buffer, 'wb') as wav:
        wav.setnchannels(1)  # Mono
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(sample_rate)
        wav.writeframes(bytes(int_samples))
    
    return buffer.getvalue()


# Example usage:
if __name__ == "__main__":
    # Test with sample seed
    test_seed = {
        'genes': {
            'size': {'value': 0.6},
            'element': {'value': 'fire'},
            'archetype': {'value': 'warrior'}
        }
    }
    
    # Generate full profile
    profile = generate_audio_profile(test_seed)
    print(f"Generated audio profile with {len(profile)} sound types")
    for key in profile.keys():
        if profile[key]:
            print(f"  - {key}: {profile[key].get('duration', 0):.2f}s")
    
    # Generate specific sound
    attack_sound = generate_sound(test_seed, "attack")
    print(f"\nAttack sound: {attack_sound.get('duration', 0):.2f}s, {attack_sound.get('wave_type', 'unknown')}")
    
    # Export to WAV
    if attack_sound.get('samples'):
        wav_bytes = samples_to_wav(attack_sound['samples'], attack_sound['sample_rate'])
        print(f"WAV size: {len(wav_bytes)} bytes")