/**
 * Biomedical Generator — produces biomedical device designs
 * Implants, prosthetics, diagnostic devices, wearables
 * $0.5T market: Biomedical Devices
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface BiomedicalParams {
  deviceType: 'implant' | 'prosthetic' | 'diagnostic' | 'wearable';
  application: string;
  fdaClass: 'I' | 'II' | 'III';
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateBiomedical(seed: Seed, outputPath: string): Promise<{ filePath: string; specPath: string; deviceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    biomedical: { deviceType: params.deviceType, application: params.application, fdaClass: params.fdaClass, quality: params.quality },
    design: generateDesign(params, rng),
    biocompatibility: { material: ['titanium', 'silicone', 'peek', 'stainless_steel'][rng.nextInt(0, 3)], tests: ['cytotoxicity', 'sensitization', 'irritation'].slice(0, Math.floor(rng.nextF64() * 3) + 1) },
    regulatory: { fda: true, ce: rng.nextF64() > 0.5, iso10993: true, timeline: rng.nextF64() * 5 + 1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_biomedical.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const specPath = outputPath.replace(/\.json$/, '_spec.txt');
  fs.writeFileSync(specPath, `Device: ${params.deviceType}\nApplication: ${params.application}\nFDA Class: ${params.fdaClass}\n\nParadigm GSPL — Biomedical`);

  return { filePath: jsonPath, specPath, deviceType: params.deviceType };
}

function generateDesign(params: BiomedicalParams, rng: Xoshiro256StarStar): any {
  return {
    dimensions: { length: rng.nextF64() * 0.2 + 0.01, width: rng.nextF64() * 0.1 + 0.005, height: rng.nextF64() * 0.05 + 0.005 },
    weight: rng.nextF64() * 0.5 + 0.01, // kg
    batteryLife: params.deviceType === 'wearable' ? rng.nextF64() * 168 + 24 : 0, // hours
    connectivity: ['bluetooth', 'wifi', 'nfc', 'none'][rng.nextInt(0, 3)]
  };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): BiomedicalParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const applications = ['cardiology', 'orthopedics', 'neurology', 'dermatology', 'ophthalmology'];
  return {
    deviceType: seed.genes?.deviceType?.value || ['implant', 'prosthetic', 'diagnostic', 'wearable'][rng.nextInt(0, 3)],
    application: seed.genes?.application?.value || applications[rng.nextInt(0, applications.length - 1)],
    fdaClass: seed.genes?.fdaClass?.value || ['I', 'II', 'III'][rng.nextInt(0, 2)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
