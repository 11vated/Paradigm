// Comprehensive browser-safe stub for all heavy generator implementations.
// These real modules (fs, canvas, large binary writers, etc.) must never run in the browser.
const noop = async () => ({});
const handler: ProxyHandler<Record<string, unknown>> = {
  get(_target, prop) {
    if (typeof prop === 'string' && !prop.startsWith('_')) {
      return noop;
    }
    return undefined;
  }
};

const stub = new Proxy({}, handler);

// Explicit named exports for everything domain-config, engine-dispatcher, contracts etc. may import
export const generateCharacter = noop;
export const generateCharacterV3 = noop;
export const generateSprite = noop;
export const generateSpriteV3 = noop;
export const generateMusic = noop;
export const generateMusicV3 = noop;
export const generateVisual2D = noop;
export const generateVisual2DV3 = noop;
export const generateNarrative = noop;
export const generateNarrativeV3 = noop;
export const generateUI = noop;
export const generateUIV3 = noop;
export const generateGame = noop;
export const generateGameV3 = noop;
export const generateCardGame = noop;
export const generateCardGames = noop;
export const generateBoardGame = noop;
export const generateBoardGames = noop;
export const generateGeometry3D = noop;
export const generateGeometry3DV4 = noop;
export const generateAnimation = noop;
export const generateAnimationV3 = noop;
export const generateShader = noop;
export const generateShaderV3 = noop;
export const generateParticle = noop;
export const generateParticleV3 = noop;
export const generateEcosystem = noop;
export const generateEcosystemV3 = noop;
export const generateProcedural = noop;
export const generateProceduralV3 = noop;
export const generateFullGame = noop;
export const generateFullGameV3 = noop;
export const generateTypography = noop;
export const generateTypographyV3 = noop;
export const generateArchitecture = noop;
export const generateArchitectureV3 = noop;
export const generateVehicle = noop;
export const generateVehicleV3 = noop;
export const generateFurniture = noop;
export const generateFurnitureV3 = noop;
export const generateFashion = noop;
export const generateFashionV3 = noop;
export const generateRobotics = noop;
export const generateRoboticsV3 = noop;
export const generateCircuit = noop;
export const generateCircuitV3 = noop;
export const generateFood = noop;
export const generateFoodV3 = noop;
export const generateChoreography = noop;
export const generateChoreographyV3 = noop;
export const generateAlife = noop;
export const generateALifeV3 = noop;
export const generateAgent = noop;
export const generateAgentV3 = noop;
export const generatePhysics = noop;
export const generatePhysicsV3 = noop;
export const generateAudio = noop;
export const generateAudioV3 = noop;
export const generateWebsite = noop;
export const generateField = noop;
export const generateQuantum = noop;
export const generateMolecule = noop;
export const generateCosmology = noop;
export const generateWorld = noop;
export const generateApp = noop;

// Re-export the proxy so any unexpected named import gets a noop
export default stub;

console.debug('[paradigm-stub] All heavy generators stubbed for browser (safe no-ops)');
