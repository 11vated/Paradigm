/**
 * Shader Generator — produces GLSL shader code
 * Generates fragment/vertex shaders based on seed genes
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ShaderParams {
  shaderType: string;
  technique: string;
  iterations: number;
  epsilon: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateShader(seed: Seed, outputPath: string): Promise<{ filePath: string; shaderCount: number }> {
  const params = extractParams(seed);
  
  // Generate vertex shader
  const vertexShader = generateVertexShader(params);
  
  // Generate fragment shader
  const fragmentShader = generateFragmentShader(params);
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write shader files
  const vertPath = outputPath.replace(/\.gltf$/, '.vert');
  const fragPath = outputPath.replace(/\.gltf$/, '.frag');
  
  fs.writeFileSync(vertPath, vertexShader);
  fs.writeFileSync(fragPath, fragmentShader);
  
  // Write metadata JSON
  const metaPath = outputPath.replace(/\.gltf$/, '_meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    shaderType: params.shaderType,
    technique: params.technique,
    iterations: params.iterations,
    epsilon: params.epsilon,
    files: { vertex: path.basename(vertPath), fragment: path.basename(fragPath) }
  }, null, 2));
  
  return {
    filePath: fragPath,
    shaderCount: 2
  };
}

function generateVertexShader(params: ShaderParams): string {
  return `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aNormal;
in vec2 aUV;

uniform mat4 uModelView;
uniform mat4 uProjection;
uniform mat3 uNormalMatrix;

out vec3 vNormal;
out vec2 vUV;

void main() {
  vNormal = normalize(uNormalMatrix * aNormal);
  vUV = aUV;
  gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
}
`;
}

function generateFragmentShader(params: ShaderParams): string {
  const technique = params.technique;
  
  if (technique === 'raymarching') {
    return generateRaymarchingShader(params);
  } else if (technique === 'pbr') {
    return generatePBRShader(params);
  } else {
    return generateBasicShader(params);
  }
}

function generateRaymarchingShader(params: ShaderParams): string {
  return `#version 300 es
precision highp float;

in vec3 vNormal;
in vec2 vUV;
out vec4 fragColor;

uniform float uTime;
uniform vec3 uCameraPos;
uniform int uMaxSteps;
uniform float uEpsilon;

float scene(vec3 p) {
  // Sphere at origin
  return length(p) - 1.0;
}

vec3 getNormal(vec3 p) {
  float eps = uEpsilon;
  return normalize(vec3(
    scene(vec3(p.x+eps, p.y, p.z)) - scene(vec3(p.x-eps, p.y, p.z)),
    scene(vec3(p.x, p.y+eps, p.z)) - scene(vec3(p.x, p.y-eps, p.z)),
    scene(vec3(p.x, p.y, p.z+eps)) - scene(vec3(p.x, p.y, p.z-eps))
  ));
}

void main() {
  vec3 ro = uCameraPos;
  vec3 rd = normalize(vec3(vUV - 0.5, -1.0));
  
  float t = 0.0;
  int steps = uMaxSteps;
  
  for (int i = 0; i < steps; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p);
    if (d < uEpsilon) {
      vec3 normal = getNormal(p);
      vec3 light = normalize(vec3(1.0, 1.0, 1.0));
      float diff = max(dot(normal, light), 0.0);
      fragColor = vec4(vec3(diff), 1.0);
      return;
    }
    t += d;
    if (t > 100.0) break;
  }
  
  fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;
}

function generatePBRShader(params: ShaderParams): string {
  return `#version 300 es
precision highp float;

in vec3 vNormal;
in vec2 vUV;
out vec4 fragColor;

uniform vec3 uAlbedo;
uniform float uMetallic;
uniform float uRoughness;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = vec3(0.0, 0.0, 1.0); // View direction
  
  // Simplified PBR
  float NdotV = max(dot(N, V), 0.0);
  vec3 diffuse = uAlbedo * (1.0 - uMetallic);
  vec3 specular = mix(vec3(0.04), uAlbedo, uMetallic);
  
  vec3 color = diffuse + specular * pow(NdotV, 1.0 / max(uRoughness, 0.01));
  fragColor = vec4(color, 1.0);
}
`;
}

function generateBasicShader(params: ShaderParams): string {
  return `#version 300 es
precision highp float;

in vec3 vNormal;
in vec2 vUV;
out vec4 fragColor;

uniform vec3 uColor;

void main() {
  vec3 light = normalize(vec3(1.0, 1.0, 1.0));
  float diff = max(dot(normalize(vNormal), light), 0.0);
  fragColor = vec4(uColor * (0.3 + 0.7 * diff), 1.0);
}
`;
}

function extractParams(seed: Seed): ShaderParams {
  const quality = seed.genes?.quality?.value || 'medium';
  
  const qualitySettings: Record<string, { iterations: number; epsilon: number }> = {
    low: { iterations: 32, epsilon: 0.01 },
    medium: { iterations: 64, epsilon: 0.001 },
    high: { iterations: 128, epsilon: 0.0001 },
    photorealistic: { iterations: 256, epsilon: 0.00001 }
  };
  
  const settings = qualitySettings[quality] || qualitySettings.medium;
  
  return {
    shaderType: seed.genes?.shaderType?.value || 'fragment',
    technique: seed.genes?.technique?.value || 'raymarching',
    iterations: seed.genes?.iterations?.value || settings.iterations,
    epsilon: seed.genes?.epsilon?.value || settings.epsilon,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
