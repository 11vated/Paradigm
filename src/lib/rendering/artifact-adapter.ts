/**
 * Artifact Adapter Layer
 * 
 * Transforms API artifact format → viewport-compatible format
 * Handles all 27 canonical domains with proper data extraction
 */

export interface MeshData {
  vertices: number[];
  indices?: number[];
  normals?: number[];
  uvs?: number[];
  colors?: number[];
}

export interface TextureData {
  albedo?: string | number;
  normal?: string | number;
  roughness?: string | number;
  metallic?: string | number;
}

export interface AudioData {
  melody?: number[];
  tempo?: number;
  key?: string;
  scale?: string;
  duration?: number;
}

export interface ImageData {
  url?: string;
  base64?: string;
  width?: number;
  height?: number;
}

export interface ViewportArtifact {
  domain: string;
  name?: string;
  seedHash?: string;
  generation?: number;
  meshData?: MeshData | null;
  textures?: TextureData | null;
  svgContent?: string | null;
  audioData?: AudioData | null;
  imageData?: ImageData | null;
  code?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Main adapter function - routes to domain-specific adapters
 */
export function adaptArtifactForViewport(artifact: any): ViewportArtifact {
  if (!artifact) {
    return { domain: 'unknown', meshData: null };
  }

  const domain = artifact.domain || artifact.$domain || 'unknown';
  const name = artifact.name || artifact.$name || 'Unnamed';
  const seedHash = artifact.seed_hash || artifact.$hash || '';
  const generation = artifact.generation || artifact.$lineage?.generation || 1;

  const base: ViewportArtifact = {
    domain,
    name,
    seedHash,
    generation,
  };

  // Route to domain-specific adapter
  switch (domain) {
    case 'character':
    case 'agent':
    case 'friend':
      return { ...base, ...adaptCharacterArtifact(artifact) };
    
    case 'music':
    case 'audio':
      return { ...base, ...adaptMusicArtifact(artifact) };
    
    case 'visual2d':
    case 'sprite':
      return { ...base, ...adaptVisual2DArtifact(artifact) };
    
    case 'geometry3d':
    case 'architecture':
    case 'vehicle':
    case 'furniture':
    case 'robotics':
      return { ...base, ...adaptGeometry3DArtifact(artifact) };
    
    case 'shader':
    case 'particle':
      return { ...base, ...adaptShaderArtifact(artifact) };
    
    case 'narrative':
    case 'typography':
      return { ...base, ...adaptTextArtifact(artifact) };
    
    case 'animation':
    case 'choreography':
      return { ...base, ...adaptAnimationArtifact(artifact) };
    
    case 'game':
    case 'fullgame':
      return { ...base, ...adaptGameArtifact(artifact) };
    
    case 'ui':
      return { ...base, ...adaptUIArtifact(artifact) };
    
    case 'physics':
    case 'field':
      return { ...base, ...adaptPhysicsArtifact(artifact) };
    
    case 'ecosystem':
    case 'alife':
    case 'world':
      return { ...base, ...adaptEcosystemArtifact(artifact) };
    
    case 'procedural':
      return { ...base, ...adaptProceduralArtifact(artifact) };
    
    case 'fashion':
      return { ...base, ...adaptFashionArtifact(artifact) };
    
    case 'circuit':
      return { ...base, ...adaptCircuitArtifact(artifact) };
    
    case 'food':
      return { ...base, ...adaptFoodArtifact(artifact) };
    
    default:
      return { ...base, meshData: null, metadata: artifact };
  }
}

/**
 * Character Domain Adapter
 * Extracts mesh data (vertices, indices, UVs) and texture references
 */
function adaptCharacterArtifact(artifact: any): Partial<ViewportArtifact> {
  const mesh = artifact.form?.mesh;
  
  if (!mesh || !mesh.vertices) {
    return { meshData: null };
  }

  const meshData: MeshData = {
    vertices: Array.isArray(mesh.vertices) ? mesh.vertices : Array.from(mesh.vertices || []),
    indices: mesh.indices ? (Array.isArray(mesh.indices) ? mesh.indices : Array.from(mesh.indices)) : undefined,
    normals: mesh.normals ? (Array.isArray(mesh.normals) ? mesh.normals : Array.from(mesh.normals)) : undefined,
    uvs: mesh.uvs ? (Array.isArray(mesh.uvs) ? mesh.uvs : Array.from(mesh.uvs)) : undefined,
  };

  const textures: TextureData = {
    albedo: artifact.form?.textures?.albedoRes,
    normal: artifact.form?.textures?.normalRes,
    roughness: artifact.form?.textures?.roughnessRes,
    metallic: artifact.form?.textures?.metallicRes,
  };

  return {
    meshData,
    textures,
    metadata: {
      triangleCount: mesh.triangleCount,
      lodLevels: mesh.lodLevels,
      blendshapeCount: mesh.blendshapeCount,
      hairStrandCount: artifact.form?.hair?.strandCount,
      animationCount: artifact.animationLibrarySize,
    },
  };
}

/**
 * Music Domain Adapter
 * Extracts melody, tempo, key, scale for audio synthesis
 */
function adaptMusicArtifact(artifact: any): Partial<ViewportArtifact> {
  const genes = artifact.genes || {};
  
  const audioData: AudioData = {
    melody: genes.melody?.value || artifact.melody || [],
    tempo: genes.tempo?.value || artifact.tempo || 120,
    key: genes.key?.value || artifact.key || 'C',
    scale: genes.scale?.value || artifact.scale || 'major',
    duration: artifact.duration || 4.0,
  };

  return {
    audioData,
    metadata: {
      bpm: audioData.tempo,
      timeSignature: artifact.timeSignature || '4/4',
      instruments: artifact.instruments || [],
    },
  };
}

/**
 * Visual2D Domain Adapter
 * Extracts SVG content or image data
 */
function adaptVisual2DArtifact(artifact: any): Partial<ViewportArtifact> {
  // Check for SVG content
  const svgContent = artifact.svgContent || 
                     artifact.artifact?.svgContent || 
                     artifact.phenotype?.portraitSvg ||
                     artifact.artifact?.phenotype?.portraitSvg;

  if (svgContent) {
    return { svgContent };
  }

  // Check for image data
  const imageUrl = artifact.imageUrl || artifact.artifact?.filePath;
  if (imageUrl) {
    return {
      imageData: {
        url: imageUrl,
        width: artifact.width,
        height: artifact.height,
      },
    };
  }

  return { svgContent: null, imageData: null };
}

/**
 * Geometry3D Domain Adapter
 * Similar to character but for non-character 3D objects
 */
function adaptGeometry3DArtifact(artifact: any): Partial<ViewportArtifact> {
  const mesh = artifact.mesh || artifact.geometry || artifact.form?.mesh;
  
  if (!mesh || !mesh.vertices) {
    return { meshData: null };
  }

  return {
    meshData: {
      vertices: Array.from(mesh.vertices || []),
      indices: mesh.indices ? Array.from(mesh.indices) : undefined,
      normals: mesh.normals ? Array.from(mesh.normals) : undefined,
      uvs: mesh.uvs ? Array.from(mesh.uvs) : undefined,
    },
    textures: mesh.textures || null,
  };
}

/**
 * Shader Domain Adapter
 * Extracts shader code (GLSL/WGSL/HLSL)
 */
function adaptShaderArtifact(artifact: any): Partial<ViewportArtifact> {
  const code = artifact.glslCode || artifact.wgslCode || artifact.hlslCode || artifact.code;
  
  return {
    code: typeof code === 'string' ? code : JSON.stringify(code, null, 2),
    metadata: {
      glslPath: artifact.glslPath,
      wgslPath: artifact.wgslPath,
      hlslPath: artifact.hlslPath,
      shaderType: artifact.shaderType || 'fragment',
    },
  };
}

/**
 * Text Domain Adapter (Narrative, Typography)
 * Extracts text content
 */
function adaptTextArtifact(artifact: any): Partial<ViewportArtifact> {
  const text = artifact.text || artifact.content || artifact.narrative;
  
  return {
    code: text,
    metadata: {
      wordCount: artifact.wordCount,
      language: artifact.language || 'en',
      style: artifact.style,
    },
  };
}

/**
 * Animation Domain Adapter
 * Extracts animation data
 */
function adaptAnimationArtifact(artifact: any): Partial<ViewportArtifact> {
  return {
    metadata: {
      frameCount: artifact.frameCount,
      fps: artifact.fps || 30,
      duration: artifact.duration,
      keyframes: artifact.keyframes,
    },
  };
}

/**
 * Game Domain Adapter
 * Extracts game scene data
 */
function adaptGameArtifact(artifact: any): Partial<ViewportArtifact> {
  return {
    metadata: {
      sceneGraph: artifact.sceneGraph,
      entities: artifact.entities,
      rules: artifact.rules,
    },
  };
}

/**
 * UI Domain Adapter
 * Extracts UI component data
 */
function adaptUIArtifact(artifact: any): Partial<ViewportArtifact> {
  return {
    code: artifact.html || artifact.jsx || artifact.code,
    metadata: {
      components: artifact.components,
      layout: artifact.layout,
    },
  };
}

/**
 * Physics Domain Adapter
 * Extracts physics simulation data
 */
function adaptPhysicsArtifact(artifact: any): Partial<ViewportArtifact> {
  return {
    metadata: {
      particles: artifact.particles,
      forces: artifact.forces,
      constraints: artifact.constraints,
    },
  };
}

/**
 * Ecosystem Domain Adapter
 * Extracts ecosystem/world data
 */
function adaptEcosystemArtifact(artifact: any): Partial<ViewportArtifact> {
  return {
    metadata: {
      entities: artifact.entities,
      relationships: artifact.relationships,
      environment: artifact.environment,
    },
  };
}

/**
 * Procedural Domain Adapter
 * Extracts procedural generation parameters
 */
function adaptProceduralArtifact(artifact: any): Partial<ViewportArtifact> {
  return {
    metadata: {
      algorithm: artifact.algorithm,
      parameters: artifact.parameters,
      seed: artifact.seed,
    },
  };
}

/**
 * Fashion Domain Adapter
 * Similar to character but focused on clothing
 */
function adaptFashionArtifact(artifact: any): Partial<ViewportArtifact> {
  return adaptCharacterArtifact(artifact);
}

/**
 * Circuit Domain Adapter
 * Extracts circuit diagram data
 */
function adaptCircuitArtifact(artifact: any): Partial<ViewportArtifact> {
  return {
    metadata: {
      components: artifact.components,
      connections: artifact.connections,
      schematic: artifact.schematic,
    },
  };
}

/**
 * Food Domain Adapter
 * Extracts food/recipe data
 */
function adaptFoodArtifact(artifact: any): Partial<ViewportArtifact> {
  return {
    metadata: {
      ingredients: artifact.ingredients,
      recipe: artifact.recipe,
      nutrition: artifact.nutrition,
    },
  };
}

/**
 * Helper: Check if artifact has valid mesh data
 */
export function hasValidMeshData(artifact: ViewportArtifact): boolean {
  return !!(
    artifact.meshData &&
    artifact.meshData.vertices &&
    artifact.meshData.vertices.length > 0
  );
}

/**
 * Helper: Check if artifact has valid audio data
 */
export function hasValidAudioData(artifact: ViewportArtifact): boolean {
  return !!(
    artifact.audioData &&
    artifact.audioData.melody &&
    artifact.audioData.melody.length > 0
  );
}

/**
 * Helper: Check if artifact has valid visual data
 */
export function hasValidVisualData(artifact: ViewportArtifact): boolean {
  return !!(
    artifact.svgContent ||
    artifact.imageData?.url ||
    artifact.imageData?.base64
  );
}

// Made with Bob
