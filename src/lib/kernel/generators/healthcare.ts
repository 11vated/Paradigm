/**
 * Healthcare Generator — produces healthcare systems
 * Hospital design, telemedicine, patient monitoring
 * $4T market: Healthcare
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface HealthcareParams {
  facilityType: 'hospital' | 'clinic' | 'telemedicine' | 'research_lab';
  bedCount: number;
  specialty: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateHealthcare(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; facilityType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate facility design
  const design = generateDesign(params, rng);

  // Generate equipment list
  const equipment = generateEquipment(params, rng);

  // Generate patient flow
  const flow = generateFlow(params, rng);

  const config = {
    healthcare: {
      facilityType: params.facilityType,
      bedCount: params.bedCount,
      specialty: params.specialty,
      quality: params.quality
    },
    design,
    equipment,
    flow,
    compliance: {
      hipaa: true,
      jointCommission: rng.nextF64() > 0.5,
      fda: params.facilityType === 'research_lab'
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_healthcare.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write layout SVG
  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateLayoutSVG(params, rng));

  return {
    filePath: jsonPath,
    layoutPath,
    facilityType: params.facilityType
  };
}

function generateDesign(params: HealthcareParams, rng: Xoshiro256StarStar): any {
  return {
    floors: params.facilityType === 'hospital' ? Math.floor(rng.nextF64() * 10) + 3 : 1,
    totalArea: params.bedCount * (100 + rng.nextF64() * 50), // sq meters
    departments: ['ER', 'ICU', 'Surgery', 'Radiology', 'Lab'].slice(0, Math.floor(rng.nextF64() * 5) + 1),
    parkingSpaces: params.bedCount * 2
  };
}

function generateEquipment(params: HealthcareParams, rng: Xoshiro256StarStar): any {
  const equipmentList = ['MRI', 'CT', 'X-ray', 'Ultrasound', 'Ventilator', 'Monitor'];
  return {
    items: equipmentList.slice(0, Math.floor(rng.nextF64() * 6) + 1).map(e => ({
      name: e,
      count: Math.floor(rng.nextF64() * 10) + 1,
      cost: rng.nextF64() * 1e6
    })),
    totalValue: rng.nextF64() * 50e6
  };
}

function generateFlow(params: HealthcareParams, rng: Xoshiro256StarStar): any {
  return {
    dailyPatients: params.bedCount * 2,
    avgStay: params.facilityType === 'hospital' ? rng.nextF64() * 10 + 2 : 0, // days
    erWaitTime: rng.nextF64() * 60 + 15, // minutes
    triage: ['fast_track', 'standard', 'comprehensive'][rng.nextInt(0, 2)]
  };
}

function generateLayoutSVG(params: HealthcareParams, rng: Xoshiro256StarStar): string {
  const width = 800;
  const height = 600;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#e8f4f8"/>
  <text x="50%" y="30" text-anchor="middle" font-size="20" fill="#333">${params.facilityType} — ${params.specialty}</text>
  
  ${Array.from({ length: Math.min(params.bedCount / 10, 20) }, (_, i) => {
    const x = (i % 5) * 150 + 50;
    const y = Math.floor(i / 5) * 150 + 80;
    return `<rect x="${x}" y="${y}" width="120" height="120" fill="#4af" opacity="0.6" stroke="#333" stroke-width="1"/>
    <text x="${x + 60}" y="${y + 60}" text-anchor="middle" fill="white" font-size="10">Room ${i + 1}</text>`;
  }).join('\n  ')}
  
  <text x="50%" y="${height - 30}" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Healthcare ${params.bedCount} beds</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): HealthcareParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const specialties = ['cardiology', 'oncology', 'neurology', 'orthopedics', 'pediatrics'];

  return {
    facilityType: seed.genes?.facilityType?.value || ['hospital', 'clinic', 'telemedicine', 'research_lab'][rng.nextInt(0, 3)],
    bedCount: Math.floor(((seed.genes?.bedCount?.value as number || rng.nextF64()) * 9900) + 100), // 100-10000
    specialty: seed.genes?.specialty?.value || specialties[rng.nextInt(0, specialties.length - 1)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

