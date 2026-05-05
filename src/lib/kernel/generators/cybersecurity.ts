/**
 * Cybersecurity Generator — produces cybersecurity systems
 * Firewalls, IDS/IPS, encryption, penetration testing
 * $0.5T market: Cybersecurity
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface CybersecurityParams {
  systemType: 'firewall' | 'ids_ips' | 'encryption' | 'pentest';
  threatLevel: number; // 0-1
  compliance: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCybersecurity(seed: Seed, outputPath: string): Promise<{ filePath: string; reportPath: string; systemType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    cybersecurity: { systemType: params.systemType, threatLevel: params.threatLevel, compliance: params.compliance, quality: params.quality },
    protection: { attacks: ['ddos', 'phishing', 'malware', 'ransomware'].slice(0, Math.floor(rng.nextF64() * 4) + 1), detectionRate: rng.nextF64() * 0.3 + 0.7, responseTime: rng.nextF64() * 60 + 5 },
    encryption: { algorithm: ['AES-256', 'RSA-2048', 'ECC'][rng.nextInt(0, 2)], keyMgmt: rng.nextF64() > 0.5, pki: rng.nextF64() > 0.3 },
    economics: { licenseCost: rng.nextF64() * 100000 + 10000, soc: rng.nextF64() > 0.5, insurance: rng.nextF64() * 1e6 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_cybersecurity.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const reportPath = outputPath.replace(/\.json$/, '_report.pdf');
  fs.writeFileSync(reportPath, `Cybersecurity Report: ${params.systemType}\nThreat Level: ${params.threatLevel}\n\nParadigm GSPL — Cybersecurity`);

  return { filePath: jsonPath, reportPath, systemType: params.systemType };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): CybersecurityParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    systemType: seed.genes?.systemType?.value || ['firewall', 'ids_ips', 'encryption', 'pentest'][rng.nextInt(0, 3)],
    threatLevel: (seed.genes?.threatLevel?.value as number || rng.nextF64()),
    compliance: (seed.genes?.compliance as string[]) || ['ISO27001', 'SOC2', 'GDPR', 'HIPAA'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
