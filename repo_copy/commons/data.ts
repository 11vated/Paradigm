import { UniversalSeed, GeneType } from '../seeds';

const PARADIGM_COMMONS_SEEDS = [
  { id: 'seed_00001', domain: 'game', name: 'Arcade-Circle-Red', color: [1, 0, 0], shape: 'circle', motion: { velocity: 1, acceleration: 0.5, path: 'linear' } },
  { id: 'seed_00002', domain: 'game', name: 'Arcade-Square-Cyan', color: [0, 1, 1], shape: 'square', motion: { velocity: 0.8, acceleration: 0.8, path: 'ease-out' } },
  { id: 'seed_00003', domain: 'game', name: 'Arcade-Triangle-Blue', color: [0, 0, 1], shape: 'triangle', motion: { velocity: 1.2, acceleration: 0.3, path: 'linear' } },
  { id: 'seed_00004', domain: 'game', name: 'RPG-Polygon-Gold', color: [1, 0.84, 0], shape: 'polygon', motion: { velocity: 0.5, acceleration: 1, path: 'ease-in' } },
  { id: 'seed_00005', domain: 'game', name: 'Shooter-Organic-Purple', color: [0.67, 0.33, 0.97], shape: 'organic', motion: { velocity: 1.5, acceleration: 0.2, path: 'oscillate' } },
  { id: 'seed_00006', domain: 'music', name: 'Bass-Line-808', audio: { volume: 1, frequency: 80, tempo: 120 }, motion: { velocity: 0.5, acceleration: 0, path: 'linear' } },
  { id: 'seed_00007', domain: 'music', name: 'Lead-Synth-High', audio: { volume: 0.8, frequency: 880, tempo: 140 }, motion: { velocity: 1, acceleration: 0.5, path: 'ease-out' } },
  { id: 'seed_00008', domain: 'music', name: 'Pad-Ethereal', audio: { volume: 0.6, frequency: 220, tempo: 80 }, motion: { velocity: 0.3, acceleration: 0.1, path: 'ease-in-out' } },
  { id: 'seed_00009', domain: 'music', name: 'Drum-Breakup', audio: { volume: 0.9, frequency: 440, tempo: 160 }, motion: { velocity: 1, acceleration: 0, path: 'linear' } },
  { id: 'seed_00010', domain: 'music', name: 'Arp-Fast', audio: { volume: 0.7, frequency: 550, tempo: 200 }, motion: { velocity: 1.5, acceleration: 0.8, path: 'linear' } },
  { id: 'seed_00011', domain: 'art', name: 'Abstract-Brights', color: [1, 0.42, 0.42], shape: 'circle', texture: 'smooth', lighting: { ambient: 0.3, directional: 0.7, shadows: false } },
  { id: 'seed_00012', domain: 'art', name: 'Minimal Dark', color: [0.1, 0.1, 0.15], shape: 'square', texture: 'metallic', lighting: { ambient: 0.5, directional: 0.5, shadows: true } },
  { id: 'seed_00013', domain: 'art', name: 'Organic-Nature', color: [0.13, 0.55, 0.13], shape: 'organic', texture: 'fabric', lighting: { ambient: 0.4, directional: 0.6, shadows: false } },
  { id: 'seed_00014', domain: 'art', name: 'Geometric-Tech', color: [0, 0.49, 0.96], shape: 'polygon', texture: 'metallic', lighting: { ambient: 0.2, directional: 0.8, shadows: true } },
  { id: 'seed_00015', domain: 'art', name: 'Retro-Wave', color: [0.95, 0.08, 0.56], shape: 'triangle', texture: 'rough', lighting: { ambient: 0.3, directional: 0.7, shadows: false } },
  { id: 'seed_00016', domain: 'animation', name: 'Bounce-Loop', animation: { keyframes: 24, duration: 1, loop: true, easing: 'ease-out' }, motion: { velocity: 1, acceleration: 1, path: 'bounce' } },
  { id: 'seed_00017', domain: 'animation', name: 'Fade-In', animation: { keyframes: 60, duration: 2, loop: false, easing: 'ease-in' }, motion: { velocity: 0.5, acceleration: 0.5, path: 'ease-in' } },
  { id: 'seed_00018', domain: 'animation', name: 'Spin-360', animation: { keyframes: 120, duration: 4, loop: true, easing: 'linear' }, motion: { velocity: 1, acceleration: 0, path: 'linear' } },
  { id: 'seed_00019', domain: 'animation', name: 'Pulse', animation: { keyframes: 30, duration: 0.5, loop: true, easing: 'ease-in-out' }, motion: { velocity: 2, acceleration: 2, path: 'oscillate' } },
  { id: 'seed_00020', domain: 'animation', name: 'Slide-Left', animation: { keyframes: 20, duration: 0.3, loop: true, easing: 'ease-out' }, motion: { velocity: 1.5, acceleration: 0.5, path: 'linear' } },
  { id: 'seed_00021', domain: 'simulation', name: 'Gravity-Fall', physics: { mass: 1, gravity: 9.8, friction: 0.5, bounce: 0.5 }, motion: { velocity: 0, acceleration: 9.8, path: 'linear' } },
  { id: 'seed_00022', domain: 'simulation', name: 'Low-G-Moon', physics: { mass: 0.5, gravity: 1.62, friction: 0.3, bounce: 0.8 }, motion: { velocity: 0, acceleration: 1.62, path: 'linear' } },
  { id: 'seed_00023', domain: 'simulation', name: 'Space-Drift', physics: { mass: 0.1, gravity: 0, friction: 0.01, bounce: 0.1 }, motion: { velocity: 1, acceleration: 0, path: 'linear' } },
  { id: 'seed_00024', domain: 'simulation', name: 'Slime-Physics', physics: { mass: 2, gravity: 9.8, friction: 0.8, bounce: 0.9 }, motion: { velocity: 0.3, acceleration: 0.5, path: 'ease-out' } },
  { id: 'seed_00025', domain: 'simulation', name: 'Bouncy-Ball', physics: { mass: 0.3, gravity: 9.8, friction: 0.2, bounce: 0.95 }, motion: { velocity: 0, acceleration: 9.8, path: 'bounce' } },
  { id: 'seed_00026', domain: 'ui', name: 'Button-Primary', shape: 'square', color: [0.3, 0.3, 0.9], lighting: { ambient: 0.5, directional: 0.3, shadows: true } },
  { id: 'seed_00027', domain: 'ui', name: 'Card-Rounded', shape: 'circle', color: [0.95, 0.95, 0.95], lighting: { ambient: 0.6, directional: 0.2, shadows: false } },
  { id: 'seed_00028', domain: 'ui', name: 'Modal-Dark', shape: 'square', color: [0.15, 0.15, 0.2], lighting: { ambient: 0.8, directional: 0.1, shadows: true } },
  { id: 'seed_00029', domain: 'ui', name: 'Toggle-On', color: [0.2, 0.8, 0.3], shape: 'circle', motion: { velocity: 0, acceleration: 0, path: 'ease-out' } },
  { id: 'seed_00030', domain: 'ui', name: 'Progress', color: [0.96, 0.64, 0.04], shape: 'polygon', motion: { velocity: 1, acceleration: 0, path: 'linear' } },
  { id: 'seed_00031', domain: 'character', name: 'Humanoid-Basic', behavior: { stateMachine: ['idle', 'walk', 'run', 'jump'], goals: ['survive', 'explore'], reactions: ['attack', 'flee', 'idle'] }, physics: { mass: 1, gravity: 9.8, friction: 0.5, bounce: 0 } },
  { id: 'seed_00032', domain: 'character', name: 'Enemy-Aggressive', behavior: { stateMachine: ['patrol', 'chase', 'attack', 'retreat'], goals: ['defend', 'hunt'], reactions: ['pursue', 'retreat', 'guard'] }, physics: { mass: 1.2, gravity: 9.8, friction: 0.4, bounce: 0 } },
  { id: 'seed_00033', domain: 'character', name: 'NPC-Passive', behavior: { stateMachine: ['idle', 'wander', 'work'], goals: ['survive', 'help'], reactions: ['greet', 'ignore', 'follow'] }, physics: { mass: 0.8, gravity: 9.8, friction: 0.6, bounce: 0 } },
  { id: 'seed_00034', domain: 'character', name: 'Boss-Final', behavior: { stateMachine: ['idle', 'charge', 'attack', 'defend', 'enrage'], goals: ['dominate'], reactions: ['smash', 'teleport', 'summon'] }, physics: { mass: 5, gravity: 9.8, friction: 0.3, bounce: 0 } },
  { id: 'seed_00035', domain: 'character', name: 'Companion-Follow', behavior: { stateMachine: ['idle', 'follow', 'assist'], goals: ['help', 'protect'], reactions: ['follow', 'heal', 'celebrate'] }, physics: { mass: 0.5, gravity: 9.8, friction: 0.7, bounce: 0 } },
  { id: 'seed_00036', domain: 'audio', name: 'SFX-Explosion', audio: { volume: 1, frequency: 100, tempo: 60 }, behavior: { stateMachine: ['play'], goals: ['impact'], reactions: ['shake'] } },
  { id: 'seed_00037', domain: 'audio', name: 'SFX-Jump', audio: { volume: 0.7, frequency: 400, tempo: 120 }, motion: { velocity: 2, acceleration: 0, path: 'ease-out' } },
  { id: 'seed_00038', domain: 'audio', name: 'SFX-Collect', audio: { volume: 0.8, frequency: 880, tempo: 240 }, motion: { velocity: 0, acceleration: 0, path: 'linear' } },
  { id: 'seed_00039', domain: 'audio', name: 'SFX-Hit', audio: { volume: 0.9, frequency: 200, tempo: 180 }, physics: { mass: 1, gravity: 9.8, friction: 0.5, bounce: 0.3 } },
  { id: 'seed_00040', domain: 'audio', name: 'SFX-Win', audio: { volume: 1, frequency: 523, tempo: 200 }, behavior: { stateMachine: ['idle', 'celebrate'], goals: ['victory'], reactions: ['jump', 'glow'] } },
  { id: 'seed_00041', domain: 'visualization', name: 'Data-Graph', color: [0.2, 0.6, 0.9], shape: 'polygon', texture: 'smooth' },
  { id: 'seed_00042', domain: 'visualization', name: 'Network-Map', color: [0.1, 0.8, 0.5], shape: 'circle', texture: 'metallic' },
  { id: 'seed_00043', domain: 'visualization', name: 'Heatmap', color: [1, 0.3, 0.1], shape: 'square', texture: 'rough' },
  { id: 'seed_00044', domain: 'visualization', name: 'Tree-Diagram', color: [0.4, 0.7, 0.3], shape: 'organic', texture: 'fabric' },
  { id: 'seed_00045', domain: 'visualization', name: 'Scatter-3D', color: [0.6, 0.3, 0.8], shape: 'polygon', texture: 'metallic' },
  { id: 'seed_00046', domain: 'game', name: 'Platformer-Basic', physics: { mass: 1, gravity: 9.8, friction: 0.6, bounce: 0 }, motion: { velocity: 1, acceleration: 0.8, path: 'linear' } },
  { id: 'seed_00047', domain: 'game', name: 'Puzzle-Match', color: [1, 0.5, 0], shape: 'circle', behavior: { stateMachine: ['idle', 'search', 'match'], goals: ['solve'], reactions: ['swap', 'destroy'] } },
  { id: 'seed_00048', domain: 'game', name: 'Racing-Line', motion: { velocity: 2, acceleration: 1.5, path: 'linear' }, physics: { mass: 0.8, gravity: 0, friction: 0.2, bounce: 0.1 } },
  { id: 'seed_00049', domain: 'game', name: 'Tower-Defense', behavior: { stateMachine: ['idle', 'target', 'fire'], goals: ['defend'], reactions: ['shoot', 'upgrade'] } },
  { id: 'seed_00050', domain: 'game', name: 'Card-Game', behavior: { stateMachine: ['draw', 'play', 'end'], goals: ['win'], reactions: ['attack', 'defend', 'buff'] } },
  { id: 'seed_00051', domain: 'music', name: 'Ambient-Night', audio: { volume: 0.4, frequency: 110, tempo: 60 }, motion: { velocity: 0.1, acceleration: 0, path: 'ease-in-out' } },
  { id: 'seed_00052', domain: 'music', name: 'EDM-Bass', audio: { volume: 1, frequency: 60, tempo: 128 }, motion: { velocity: 1, acceleration: 0.5, path: 'linear' } },
  { id: 'seed_00053', domain: 'music', name: 'Chill-Hop', audio: { volume: 0.6, frequency: 330, tempo: 90 }, motion: { velocity: 0.5, acceleration: 0.2, path: 'ease-out' } },
  { id: 'seed_00054', domain: 'music', name: 'Orchestral', audio: { volume: 0.8, frequency: 440, tempo: 100 }, motion: { velocity: 0.3, acceleration: 0.1, path: 'linear' } },
  { id: 'seed_00055', domain: 'music', name: 'Chip-Tune', audio: { volume: 0.7, frequency: 1047, tempo: 180 }, motion: { velocity: 2, acceleration: 1, path: 'linear' } },
  { id: 'seed_00056', domain: 'art', name: 'Neon-City', color: [0, 1, 0.8], shape: 'polygon', texture: 'metallic', lighting: { ambient: 0.1, directional: 0.9, shadows: true } },
  { id: 'seed_00057', domain: 'art', name: 'Sunset-Gradient', color: [1, 0.55, 0], shape: 'circle', texture: 'smooth', lighting: { ambient: 0.4, directional: 0.6, shadows: false } },
  { id: 'seed_00058', domain: 'art', name: 'Forest-Mystical', color: [0, 0.5, 0.2], shape: 'organic', texture: 'fabric', lighting: { ambient: 0.3, directional: 0.7, shadows: true } },
  { id: 'seed_00059', domain: 'art', name: 'Cyberpunk', color: [0.9, 0, 0.5], shape: 'square', texture: 'metallic', lighting: { ambient: 0.2, directional: 0.8, shadows: true } },
  { id: 'seed_00060', domain: 'art', name: 'Watercolor', color: [0.4, 0.7, 0.9], shape: 'organic', texture: 'rough', lighting: { ambient: 0.5, directional: 0.5, shadows: false } },
  { id: 'seed_00061', domain: 'animation', name: 'Ease-In-Bounce', animation: { keyframes: 45, duration: 1.5, loop: false, easing: 'ease-in' }, motion: { velocity: 1, acceleration: 0.5, path: 'bounce' } },
  { id: 'seed_00062', domain: 'animation', name: 'Elastic', animation: { keyframes: 60, duration: 1, loop: true, easing: 'ease-out' }, motion: { velocity: 1, acceleration: 2, path: 'oscillate' } },
  { id: 'seed_00063', domain: 'animation', name: 'Smooth-Entry', animation: { keyframes: 30, duration: 0.8, loop: false, easing: 'cubic-bezier' }, motion: { velocity: 0.8, acceleration: 0.3, path: 'ease-out' } },
  { id: 'seed_00064', domain: 'animation', name: 'Rubber-Band', animation: { keyframes: 50, duration: 0.6, loop: true, easing: 'ease-in-out' }, motion: { velocity: 2, acceleration: 3, path: 'oscillate' } },
  { id: 'seed_00065', domain: 'animation', name: 'Twist-In', animation: { keyframes: 40, duration: 1.2, loop: false, easing: 'ease-out' }, motion: { velocity: 0.5, acceleration: 0.2, path: 'linear' } },
  { id: 'seed_00066', domain: 'simulation', name: 'Fluid-Drop', physics: { mass: 0.1, gravity: 9.8, friction: 0.1, bounce: 0.4 }, texture: 'smooth' },
  { id: 'seed_00067', domain: 'simulation', name: 'Sand-Flow', physics: { mass: 0.5, gravity: 9.8, friction: 0.9, bounce: 0 }, texture: 'rough' },
  { id: 'seed_00068', domain: 'simulation', name: 'Gas-Cloud', physics: { mass: 0.01, gravity: 0, friction: 0, bounce: 0 }, motion: { velocity: 0.2, acceleration: 0, path: 'ease-in-out' } },
  { id: 'seed_00069', domain: 'simulation', name: 'Spring-Mass', physics: { mass: 1, gravity: 9.8, friction: 0.3, bounce: 0.8 }, physics: { mass: 1, gravity: 9.8, friction: 0.5, bounce: 0.7 }, motion: { velocity: 0, acceleration: 0, path: 'oscillate' } },
  { id: 'seed_00070', domain: 'simulation', name: 'Pendulum', physics: { mass: 1, gravity: 9.8, friction: 0.01, bounce: 0 }, motion: { velocity: 1, acceleration: 0, path: 'oscillate' } },
  { id: 'seed_00071', domain: 'ui', name: 'Input-Field', shape: 'square', color: [0.98, 0.98, 0.98], lighting: { ambient: 0.6, directional: 0.2, shadows: false }, behavior: { stateMachine: ['idle', 'focus', 'error'], goals: ['input'], reactions: ['validate'] } },
  { id: 'seed_00072', domain: 'ui', name: 'Dropdown-Menu', shape: 'square', color: [1, 1, 1], lighting: { ambient: 0.5, directional: 0.3, shadows: true }, behavior: { stateMachine: ['closed', 'open', 'select'], goals: ['navigate'], reactions: ['expand'] } },
  { id: 'seed_00073', domain: 'ui', name: 'Slider-Theme', color: [0.3, 0.5, 0.9], shape: 'circle', motion: { velocity: 1, acceleration: 0, path: 'linear' } },
  { id: 'seed_00074', domain: 'ui', name: 'Checkbox', color: [0.2, 0.7, 0.3], shape: 'square', behavior: { stateMachine: ['unchecked', 'checked'], goals: ['toggle'], reactions: ['animate'] } },
  { id: 'seed_00075', domain: 'ui', name: 'Tab-Navigation', color: [0.5, 0.5, 0.55], shape: 'square', behavior: { stateMachine: ['tab1', 'tab2', 'tab3'], goals: ['navigate'], reactions: ['switch'] } },
  { id: 'seed_00076', domain: 'character', name: 'Player-Human', behavior: { stateMachine: ['idle', 'walk', 'run', 'jump', 'attack', 'block'], goals: ['survive', 'win'], reactions: ['move', 'act', 'dodge'] }, physics: { mass: 1, gravity: 9.8, friction: 0.5, bounce: 0 } },
  { id: 'seed_00077', domain: 'character', name: 'Skeleton-Enemy', behavior: { stateMachine: ['idle', 'chase', 'attack', 'die'], goals: ['kill'], reactions: ['bone-throw', 'retreat'] }, color: [0.95, 0.95, 0.9] },
  { id: 'seed_00078', domain: 'character', name: 'Dragon-Flying', behavior: { stateMachine: ['hover', 'fly', 'dive', 'breathe'], goals: ['attack'], reactions: ['fly', 'dive', 'fire'] }, physics: { mass: 10, gravity: 0, friction: 0.1, bounce: 0 }, motion: { velocity: 2, acceleration: 0.5, path: 'linear' } },
  { id: 'seed_00079', domain: 'character', name: 'Robot-Tank', behavior: { stateMachine: ['idle', 'aim', 'fire', 'reload'], goals: ['destroy'], reactions: ['shoot', 'move', 'scan'] }, physics: { mass: 5, gravity: 9.8, friction: 0.8, bounce: 0 }, color: [0.4, 0.45, 0.5] },
  { id: 'seed_00080', domain: 'character', name: 'Slime-Ally', behavior: { stateMachine: ['idle', 'bounce', 'absorb'], goals: ['help'], reactions: ['jump', 'eat', 'heal'] }, physics: { mass: 0.5, gravity: 9.8, friction: 0.9, bounce: 0.8 }, texture: 'organic' },
  { id: 'seed_00081', domain: 'audio', name: 'Music-Box', audio: { volume: 0.6, frequency: 523, tempo: 140 }, behavior: { stateMachine: ['intro', 'verse', 'chorus', 'bridge'], goals: ['entertain'] } },
  { id: 'seed_00082', domain: 'audio', name: 'Notification', audio: { volume: 0.8, frequency: 660, tempo: 200 }, behavior: { stateMachine: ['play'], goals: ['alert'], reactions: ['flash'] } },
  { id: 'seed_00083', domain: 'audio', name: 'UI-Click', audio: { volume: 0.5, frequency: 1000, tempo: 300 }, motion: { velocity: 0, acceleration: 0, path: 'linear' } },
  { id: 'seed_00084', domain: 'audio', name: 'Error-Buzzer', audio: { volume: 0.9, frequency: 150, tempo: 100 }, behavior: { stateMachine: ['play'], goals: ['alert'], reactions: ['shake', 'flash-red'] } },
  { id: 'seed_00085', domain: 'audio', name: 'Success-Chime', audio: { volume: 0.7, frequency: 784, tempo: 160 }, behavior: { stateMachine: ['play'], goals: ['confirm'], reactions: ['glow-green'] } },
  { id: 'seed_00086', domain: 'visualization', name: 'Line-Chart', color: [0.3, 0.6, 0.9], shape: 'polygon', animation: { keyframes: 60, duration: 2, loop: true, easing: 'linear' } },
  { id: 'seed_00087', domain: 'visualization', name: 'Pie-Chart', color: [0.9, 0.5, 0.1], shape: 'circle', animation: { keyframes: 30, duration: 1, loop: false, easing: 'ease-out' } },
  { id: 'seed_00088', domain: 'visualization', name: 'Bar-Graph', color: [0.2, 0.8, 0.4], shape: 'square', animation: { keyframes: 45, duration: 1.5, loop: true, easing: 'ease-in' } },
  { id: 'seed_00089', domain: 'visualization', name: 'Area-Map', color: [0.5, 0.3, 0.8], shape: 'organic', animation: { keyframes: 90, duration: 3, loop: true, easing: 'linear' } },
  { id: 'seed_00090', domain: 'visualization', name: 'Radar-Plot', color: [0, 0.7, 0.7], shape: 'polygon', animation: { keyframes: 120, duration: 4, loop: true, easing: 'linear' } },
  { id: 'seed_00091', domain: 'game', name: 'Dungeon-Tile', color: [0.3, 0.25, 0.2], shape: 'square', physics: { mass: 0, gravity: 0, friction: 1, bounce: 0 } },
  { id: 'seed_00092', domain: 'game', name: 'Water-Tile', color: [0.2, 0.5, 0.9], shape: 'square', texture: 'smooth', physics: { mass: 0, gravity: 0, friction: 0.1, bounce: 0 } },
  { id: 'seed_00093', domain: 'game', name: 'Lava-Tile', color: [1, 0.4, 0.1], shape: 'square', texture: 'rough', lighting: { ambient: 0.6, directional: 0.4, shadows: false } },
  { id: 'seed_00094', domain: 'game', name: 'Ice-Tile', color: [0.8, 0.9, 1], shape: 'square', texture: 'metallic', physics: { mass: 0, gravity: 0, friction: 0.05, bounce: 0.1 } },
  { id: 'seed_00095', domain: 'game', name: 'Hole-Tile', color: [0.1, 0.1, 0.1], shape: 'circle', physics: { mass: 0, gravity: 0, friction: 0, bounce: 0 } },
  { id: 'seed_00096', domain: 'music', name: 'Kick-Drum', audio: { volume: 1, frequency: 60, tempo: 60 }, motion: { velocity: 0, acceleration: 0, path: 'linear' } },
  { id: 'seed_00097', domain: 'music', name: 'Snare-Crisp', audio: { volume: 0.9, frequency: 200, tempo: 120 }, motion: { velocity: 0.5, acceleration: 0, path: 'linear' } },
  { id: 'seed_00098', domain: 'music', name: 'Hi-Hat-Sharp', audio: { volume: 0.6, frequency: 8000, tempo: 240 }, motion: { velocity: 1, acceleration: 0, path: 'linear' } },
  { id: 'seed_00099', domain: 'music', name: 'Tom-Low', audio: { volume: 0.8, frequency: 100, tempo: 90 }, motion: { velocity: 0, acceleration: 0, path: 'linear' } },
  { id: 'seed_00100', domain: 'music', name: 'Cymbal-Crash', audio: { volume: 1, frequency: 4000, tempo: 80 }, motion: { velocity: 0.3, acceleration: 0, path: 'ease-out' } }
];

export function createSeedCommons(): UniversalSeed[] {
  return PARADIGM_COMMONS_SEEDS.map((template, index) => {
    const seed = new UniversalSeed();
    const now = Date.now() - (100 - index) * 86400000;

    seed.setMetadata('id', template.id);
    seed.setMetadata('name', template.name);
    seed.setMetadata('domain', template.domain);
    seed.setMetadata('created', now);
    seed.setMetadata('author', 'Paradigm Commons');
    seed.setMetadata('tags', [template.domain]);
    seed.setMetadata('version', '1.0.0');

    if (template.color) seed.setGene(GeneType.COLOR, template.color);
    if (template.shape) seed.setGene(GeneType.SHAPE, template.shape);
    if (template.texture) seed.setGene(GeneType.TEXTURE, template.texture);
    if (template.motion) seed.setGene(GeneType.MOTION, template.motion);
    if (template.audio) seed.setGene(GeneType.AUDIO, template.audio);
    if (template.physics) seed.setGene(GeneType.PHYSICS, template.physics);
    if (template.behavior) seed.setGene(GeneType.BEHAVIOR, template.behavior);
    if (template.animation) seed.setGene(GeneType.ANIMATION, template.animation);
    if (template.lighting) seed.setGene(GeneType.LIGHTING, template.lighting);

    return seed;
  });
}

export const SEED_COMMONS_MANIFEST = {
  version: '1.0.0',
  name: 'Paradigm Commons',
  description: '100 curated seeds across all domains',
  totalSeeds: 100,
  domains: {
    game: 15,
    music: 15,
    art: 15,
    animation: 10,
    simulation: 10,
    ui: 10,
    character: 10,
    audio: 10,
    visualization: 10
  },
  geneTypes: ['color', 'shape', 'texture', 'motion', 'audio', 'physics', 'behavior', 'animation', 'lighting']
};