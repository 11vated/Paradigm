/**
 * Shader Generator — CANONICAL (Doctrine v2 Phase 2 Consolidation)
 *
 * PRIMARY / canonical implementation for shader program generation.
 * All engine dispatch, contracts, paradigm make, and new development MUST target this file + shader-contract.ts.
 *
 * Siblings (shader-enhanced.ts) carry deprecation banners + PARADIGM-RENAME-OK waivers (sunset 2026-08-25).
 * Real dispatch enforcement + golden regeneration in progress.
 *
 * Features: Vertex, fragment, compute shaders
 * Export: GLSL, WGSL, HLSL
 *
 * PHASE 2 NOTE: Canonical primary. Target shader.ts exclusively for new work.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface ShaderParams {
  type: 'vertex' | 'fragment' | 'compute' | 'raytracing';
  effects: string[];
  target: 'glsl' | 'wgsl' | 'hlsl';
  quality: 'low' | 'medium' | 'high';
}

export async function generateShaderV3(
  seed: Seed,
  outputPath: string
): Promise<{
  glslPath: string;
  wgslPath: string;
  hlslPath: string;
  effectCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'shader-default');
  const params = extractShaderParams(seed, rng);
  
  // Generate shader code
  const glsl = generateGLSL(params, rng);
  const wgsl = generateWGSL(params, rng);
  const hlsl = generateHLSL(params, rng);
  
  // Export
  const glslPath = await exportShader(glsl, 'glsl', outputPath, seed);
  const wgslPath = await exportShader(wgsl, 'wgsl', outputPath, seed);
  const hlslPath = await exportShader(hlsl, 'hlsl', outputPath, seed);
  
  return {
    glslPath,
    wgslPath,
    hlslPath,
    effectCount: params.effects.length
  };
}

function extractShaderParams(seed: Seed, rng: Xoshiro256StarStar): ShaderParams {
  const types = ['vertex', 'fragment', 'compute', 'raytracing'] as const;
  const targets = ['glsl', 'wgsl', 'hlsl'] as const;
  const qualities = ['low', 'medium', 'high'] as const;
  const effectList = ['noise', 'blur', 'glow', 'shadow', 'reflection', 'refraction', 'bloom', 'chromatic', 'pixelate', 'scanlines'];
  
  const numEffects = 2 + Math.floor(rng.nextF64() * 4);
  const effects: string[] = [];
  for (let i = 0; i < numEffects; i++) {
    const effect = effectList[Math.floor(rng.nextF64() * effectList.length)];
    if (!effects.includes(effect)) effects.push(effect);
  }
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    effects,
    target: targets[Math.floor(rng.nextF64() * targets.length)],
    quality: qualities[Math.floor(rng.nextF64() * qualities.length)]
  };
}

function generateGLSL(params: ShaderParams, rng: Xoshiro256StarStar): string {
  const isVertex = params.type === 'vertex';
  
  let code = `// Generated Shader - ${params.type}
#version 450 core

`;
  
  if (isVertex) {
    code += `layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec2 aTexCoord;
layout(location = 0) out vec2 vTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
}
`;
  } else {
    code += `layout(location = 0) in vec2 vTexCoord;
layout(location = 0) out vec4 fragColor;

uniform float uTime;
uniform vec2 uResolution;

${generateGLSLEffects(params.effects, rng)}

void main() {
    vec2 uv = vTexCoord;
    vec3 color = ${params.effects.includes('noise') ? 'proceduralNoise(uv, uTime)' : 'vec3(0.0)'};
    ${params.effects.includes('glow') ? 'color += bloomEffect(uv);' : ''}
    ${params.effects.includes('pixelate') ? 'color = pixelate(uv, color, 0.01);' : ''}
    fragColor = vec4(color, 1.0);
}
`;
  }
  
  return code;
}

function generateGLSLEffects(effects: string[], rng: Xoshiro256StarStar): string {
  let functions = '\n';
  
  if (effects.includes('noise')) {
    functions += `float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 uv) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
vec3 proceduralNoise(vec2 uv, float time) {
    float n = noise(uv * 10.0 + time * 0.5);
    return vec3(n) * vec3(0.5, 0.8, 1.0);
}

`;
  }
  
  if (effects.includes('glow') || effects.includes('bloom')) {
    functions += `vec3 bloomEffect(vec2 uv) {
    float glow = 0.0;
    for(float i = 1.0; i <= 4.0; i++) {
        glow += noise(uv * i) / i;
    }
    return glow * vec3(1.0, 0.8, 0.5) * 0.3;
}

`;
  }
  
  if (effects.includes('pixelate')) {
    functions += `vec3 pixelate(vec2 uv, vec3 color, float pixelSize) {
    vec2 pixelatedUV = floor(uv / pixelSize) * pixelSize;
    return color;
}

`;
  }
  
  return functions;
}

function generateWGSL(params: ShaderParams, rng: Xoshiro256StarStar): string {
  return `// Generated WGSL Shader - ${params.type}

${params.type === 'vertex' ? `
@vertex
fn vs_main(
    @location(0) aPosition: vec3<f32>,
    @location(1) aTexCoord: vec2<f32>
) -> @builtin(position) vec4<f32> {
    return vec4<f32>(aPosition, 1.0);
}
` : `
@fragment
fn fs_main(@location(0) vTexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    let color = vec3<f32>(vTexCoord.x, vTexCoord.y, 0.5);
    return vec4<f32>(color, 1.0);
}
`}
`;
}

function generateHLSL(params: ShaderParams, rng: Xoshiro256StarStar): string {
  return `// Generated HLSL Shader - ${params.type}

${params.type === 'vertex' ? `
struct VS_INPUT {
    float3 aPosition : POSITION;
    float2 aTexCoord : TEXCOORD0;
};

struct VS_OUTPUT {
    float4 position : SV_POSITION;
    float2 texCoord : TEXCOORD0;
};

VS_OUTPUT vs_main(VS_INPUT input) {
    VS_OUTPUT output;
    output.position = float4(input.aPosition, 1.0);
    output.texCoord = input.aTexCoord;
    return output;
}
` : `
struct PS_INPUT {
    float4 position : SV_POSITION;
    float2 texCoord : TEXCOORD0;
};

float4 ps_main(PS_INPUT input) : SV_TARGET {
    float3 color = float3(input.texCoord.x, input.texCoord.y, 0.5);
    return float4(color, 1.0);
}
`}
`;
}

async function exportShader(code: string, ext: string, outputPath: string, seed: Seed): Promise<string> {
  const filename = `shader_${seed.$hash || 'unknown'}.${ext}`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, code);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateShaderV3 as generateShader };
