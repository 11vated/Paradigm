/**
 * Shader Generator — produces compiled GLSL shaders
 * Enhanced with multiple techniques and quality tiers
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

export async function generateShaderEnhanced(seed: Seed, outputPath: string): Promise<{ filePath: string; shaderCount: number }> {
  const params = extractParams(seed);

  // Generate vertex shader
  const vertexShader = generateVertexShader(params);

  // Generate fragment shader based on technique
  const fragmentShader = generateFragmentShaderEnhanced(params);

  // Generate compute shader for photorealistic quality
  const computeShader = params.quality === 'photorealistic' ? generateComputeShader(params) : null;

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write shader files
  const baseName = path.basename(outputPath, path.extname(outputPath));
  const outDir = path.dirname(outputPath);

  const vertPath = `${outDir}/${baseName}.vert`;
  const fragPath = `${outDir}/${baseName}.frag`;
  fs.writeFileSync(vertPath, vertexShader);
  fs.writeFileSync(fragPath, fragmentShader);

  let shaderCount = 2;

  if (computeShader) {
    const compPath = `${outDir}/${baseName}.comp`;
    fs.writeFileSync(compPath, computeShader);
    shaderCount = 3;
  }

  // Write metadata JSON
  const metaPath = `${outDir}/${baseName}_meta.json`;
  fs.writeFileSync(metaPath, JSON.stringify({
    shaderType: params.shaderType,
    technique: params.technique,
    iterations: params.iterations,
    epsilon: params.epsilon,
    quality: params.quality,
    files: {
      vertex: path.basename(vertPath),
      fragment: path.basename(fragPath),
      compute: computeShader ? path.basename(compPath) : null
    },
    description: getTechniqueDescription(params.technique)
  }, null, 2));

  // Return primary shader path
  const primaryPath = params.shaderType === 'compute' && computeShader ? compPath : fragPath;

  return { filePath: primaryPath, shaderCount };
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

function generateFragmentShaderEnhanced(params: ShaderParams): string {
  const technique = params.technique;

  if (technique === 'raymarching') {
    return generateRaymarchingShader(params);
  } else if (technique === 'pbr') {
    return generatePBRShader(params);
  } else if (technique === 'toon') {
    return generateToonShader(params);
  } else {
    return generateBasicShader(params);
  }
}

function generateRaymarchingShader(params: ShaderParams): string {
  const iterations = params.iterations;
  const epsilon = params.epsilon;

  return `#version 300 es
precision highp float;

in vec3 vNormal;
in vec2 vUV;
out vec4 fragColor;

uniform float uTime;
uniform vec3 uCameraPos;

float scene(vec3 p) {
  // Signed distance function for a sphere
  return length(p) - 1.0;
}

vec3 getNormal(vec3 p) {
  vec2 e = vec2(${epsilon}, 0.0);
  return normalize(vec3(
    scene(p + e.xyy) - scene(p - e.xyy),
    scene(p + e.yxy) - scene(p - e.yxy),
    scene(p + e.yyx) - scene(p - e.yyx)
  ));
}

void main() {
  vec3 ro = uCameraPos;
  vec3 rd = normalize(vec3(vUV - 0.5, -1.0));

  float t = 0.0;
  int steps = ${iterations};

  for (int i = 0; i < steps; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p);
    if (d < ${epsilon}) {
      vec3 normal = getNormal(p);
      vec3 light = normalize(vec3(1.0, 1.0, 1.0));
      float diff = max(dot(normal, light), 0.0);
      float spec = pow(max(dot(reflect(-light, normal), rd), 32.0);
      fragColor = vec4(vec3(diff + spec * 0.5), 1.0);
      return;
    }
    t += d;
    if (t > 100.0) break;
  }

  fragColor = vec4(0.05, 0.05, 0.1, 1.0);
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
uniform vec3 uLightDir;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vec3(0.0, 0.0, 1.0));
  vec3 L = normalize(uLightDir);
  vec3 H = normalize(L + V);

  // Cook-Torrance BRDF (simplified)
  float NdotL = max(dot(N, L), 0.0);
  float NdotH = max(dot(N, H), 0.0);
  float NdotV = max(dot(N, V), 0.0);

  // Fresnel (Schlick)
  vec3 F0 = mix(vec3(0.04), uAlbedo, uMetallic);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - NdotH, 5.0);

  // Distribution (GGX)
  float alpha = uRoughness * uRoughness;
  float D = alpha * alpha / (3.14159 * pow(NdotH * NdotH * (alpha * alpha - 1.0) + 1.0, 2.0);

  // Geometry (Smith)
  float G = min(1.0, min(2.0 * NdotH * NdotV / NdotH, 2.0 * NdotH * NdotL / NdotH));

  vec3 specular = (F * D * G) / (4.0 * NdotV * NdotL + 0.001);

  vec3 diffuse = uAlbedo * (1.0 - uMetallic) / 3.14159;

  vec3 color = (diffuse + specular) * NdotL * vec3(1.0, 1.0, 1.0);
  fragColor = vec4(color, 1.0);
}
`;
}

function generateToonShader(params: ShaderParams): string {
  return `#version 300 es
precision highp float;

in vec3 vNormal;
in vec2 vUV;
out vec4 fragColor;

uniform vec3 uColor;
uniform vec3 uLightDir;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uLightDir);

  float NdotL = dot(N, L);

  // Toon shading: discretize lighting
  float light = floor(NdotL * 3.0) / 3.0;
  light = max(light, 0.2); // Ambient

  fragColor = vec4(uColor * light, 1.0);
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

function generateComputeShader(params: ShaderParams): string {
  return `#version 310 es
precision highp float;

layout(local_size_x = 16, local_size_y = 16) in;
layout(rgba32f, binding = 0) uniform image2D uOutput;

uniform vec3 uCameraPos;
uniform float uTime;

void main() {
  ivec2 pixelCoord = ivec2(gl_GlobalInvocationID.xy);
  vec2 uv = (vec2(pixelCoord) + 0.5) / vec2(imageSize(uOutput));

  // Raymarching in compute shader for photorealistic rendering
  vec3 ro = uCameraPos;
  vec3 rd = normalize(vec3(uv - 0.5, -1.0));

  // ... raymarching logic ...

  vec4 color = vec4(1.0, 0.5, 0.0, 1.0); // Placeholder
  imageStore(uOutput, pixelCoord, color);
}
`;
}

function getTechniqueDescription(technique: string): string {
  const descriptions: Record<string, string> = {
    'raymarching': 'Distance-based ray marching with SDF primitives',
    'pbr': 'Physical Based Rendering with Cook-Torrance BRDF',
    'toon': 'Cel-shading with discrete lighting levels',
    'basic': 'Simple Lambertian diffuse shading'
  };
  return descriptions[technique] || 'Standard shading technique';
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
