/**
 * Finance Generator — produces financial models
 * Risk analysis, portfolio optimization, derivatives
 * $1.2T market: FinTech
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface FinanceParams {
  assetClass: 'equity' | 'fixed_income' | 'fx' | 'commodity' | 'crypto';
  model: 'black_scholes' | 'monte_carlo' | 'risk_parity' | 'factor';
  timeHorizon: number; // years
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFinance(seed: Seed, outputPath: string): Promise<{ filePath: string; reportPath: string; assetClass: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate portfolio
  const portfolio = generatePortfolio(params, rng);

  // Generate risk model
  const risk = generateRisk(params, rng);

  // Generate forecast
  const forecast = generateForecast(params, rng);

  const config = {
    finance: {
      assetClass: params.assetClass,
      model: params.model,
      timeHorizon: params.timeHorizon,
      quality: params.quality
    },
    portfolio,
    risk,
    forecast,
    compliance: {
      basel: rng.nextF64() > 0.5,
      mifid: rng.nextF64() > 0.5,
      sec: params.assetClass === 'equity'
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_finance.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write report CSV
  const reportPath = outputPath.replace(/\.json$/, '_returns.csv');
  fs.writeFileSync(reportPath, generateCSV(params, rng));

  return {
    filePath: jsonPath,
    reportPath,
    assetClass: params.assetClass
  };
}

function generatePortfolio(params: FinanceParams, rng: Xoshiro256StarStar): any {
  const assets = Array.from({ length: 10 }, (_, i) => ({
    id: `asset_${i}`,
    name: `Asset ${i + 1}`,
    weight: rng.nextF64(),
    return: rng.nextF64() * 0.2 - 0.05, // -5% to 15%
    volatility: rng.nextF64() * 0.3
  }));

  // Normalize weights
  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);
  assets.forEach(a => a.weight = a.weight / totalWeight);

  return {
    assets,
    expectedReturn: assets.reduce((sum, a) => sum + a.weight * a.return, 0),
    volatility: Math.sqrt(assets.reduce((sum, a) => sum + Math.pow(a.weight * a.volatility, 2), 0)),
    sharpeRatio: 0
  };
}

function generateRisk(params: FinanceParams, rng: Xoshiro256StarStar): any {
  return {
    var: rng.nextF64() * 0.05, // 0-5% VaR
    cvar: rng.nextF64() * 0.08,
    beta: rng.nextF64() * 1.5 + 0.5, // 0.5-2.0
    correlation: rng.nextF64() * 0.8 - 0.4, // -0.4 to 0.4
    stressTest: {
      scenario: '2008_crisis',
      loss: rng.nextF64() * 0.3
    }
  };
}

function generateForecast(params: FinanceParams, rng: Xoshiro256StarStar): any {
  return {
    horizon: params.timeHorizon,
    scenarios: ['base', 'bull', 'bear'].map(s => ({
      name: s,
      probability: s === 'base' ? 0.6 : 0.2,
      return: s === 'bull' ? rng.nextF64() * 0.3 : (s === 'bear' ? -rng.nextF64() * 0.2 : rng.nextF64() * 0.1)
    }))
  };
}

function generateCSV(params: FinanceParams, rng: Xoshiro256StarStar): string {
  const lines = ['Date,Return,Cumulative'];
  let cumulative = 1;
  for (let i = 0; i < 252 * params.timeHorizon; i++) {
    const ret = rng.nextF64() * 0.02 - 0.005;
    cumulative *= (1 + ret);
    if (i % 21 === 0) { // Monthly
      lines.push(`2026-${String(Math.floor(i/21)%12 + 1).padStart(2,'0')}-01,${ret.toFixed(4)},${cumulative.toFixed(4)}`);
    }
  }
  return lines.join('\n');
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): FinanceParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    assetClass: seed.genes?.assetClass?.value || ['equity', 'fixed_income', 'fx', 'commodity', 'crypto'][rng.nextInt(0, 4)],
    model: seed.genes?.model?.value || ['black_scholes', 'monte_carlo', 'risk_parity', 'factor'][rng.nextInt(0, 3)],
    timeHorizon: Math.floor(((seed.genes?.timeHorizon?.value as number || rng.nextF64()) * 29) + 1), // 1-30 years
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

