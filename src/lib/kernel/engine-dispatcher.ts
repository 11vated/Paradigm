/**
 * Kernel Engine Dispatcher — Beyond Omega
 * Routes seeds to all 103+ domain generators with deterministic RNG.
 * Each seed's $hash seeds the Xoshiro256StarStar for full determinism.
 */

import { Xoshiro256StarStar, rngFromHash } from './rng.js';
import type { Seed } from '../kernel/engines.js';

// Import all 103+ generators
import { generateUniverse } from './generators/universe.js';
import { generateProtein } from './generators/protein.js';
import { generateMarket } from './generators/market.js';
import { generateDomainGenerator as generateMetaDomain } from './generators/meta-domain.js';
import { generateConsciousness } from './generators/consciousness.js';
import { generateQuantumCircuit } from './generators/quantum-circuit.js';
import { generateReactor } from './generators/reactor.js';
import { generateNanobot } from './generators/nanobot.js';
import { generateCity } from './generators/city.js';
import { generateClimate } from './generators/climate.js';
import { generateMaterial } from './generators/material.js';
import { generateAerospace } from './generators/aerospace.js';
import { generateGenome } from './generators/genome.js';
import { generateRobotics } from './generators/robotics.js';
import { generateAgriculture } from './generators/agriculture.js';
import { generateDrug } from './generators/drug.js';
import { generateBlockchain } from './generators/blockchain.js';
import { generateEducation } from './generators/education.js';
import { generateFinance } from './generators/finance.js';
import { generateHealthcare } from './generators/healthcare.js';
import { generateLogistics } from './generators/logistics.js';
import { generateMedia } from './generators/media.js';
import { generateRealEstate } from './generators/real-estate.js';
import { generateSecurity } from './generators/security.js';
import { generateSpace } from './generators/space.js';
import { generateTransportation } from './generators/transportation.js';
import { generateEnergy } from './generators/energy.js';
import { generateChemical } from './generators/chemical.js';
import { generateAutomotive } from './generators/automotive.js';
import { generateMarine } from './generators/marine.js';
import { generateLegal } from './generators/legal.js';
import { generateInsurance } from './generators/insurance.js';
import { generateTourism } from './generators/tourism.js';
import { generateHospitality } from './generators/hospitality.js';
import { generateSports } from './generators/sports.js';
import { generateGaming } from './generators/gaming.js';
import { generateFashion } from './generators/fashion.js';
import { generateCosmetics } from './generators/cosmetics.js';
import { generateFurniture } from './generators/furniture.js';
import { generateTextiles } from './generators/textiles.js';
import { generateArt } from './generators/art.js';
import { generatePhotography } from './generators/photography.js';
import { generateArchitecture } from './generators/architecture.js';
import { generateInteriorDesign } from './generators/interior-design.js';
import { generateLandscaping } from './generators/landscaping.js';
import { generateLighting } from './generators/lighting.js';
import { generateAcoustics } from './generators/acoustics.js';
import { generateBiomedical } from './generators/biomedical.js';
import { generateNeuroscience } from './generators/neuroscience.js';
import { generateEdTech } from './generators/edtech.js';
import { generateMusic } from './generators/music.js';
import { generateFilm } from './generators/film.js';
import { generateTheater } from './generators/theater.js';
import { generateDance } from './generators/dance.js';
import { generateLiterature } from './generators/literature.js';
import { generateJournalism } from './generators/journalism.js';
import { generatePublishing } from './generators/publishing.js';
import { generateAdvertising } from './generators/advertising.js';
import { generateMarketing } from './generators/marketing.js';
import { generateWine } from './generators/wine.js';
import { generateBeer } from './generators/beer.js';
import { generateSpirits } from './generators/spirits.js';
import { generateCoffee } from './generators/coffee.js';
import { generateTea } from './generators/tea.js';
import { generateEventPlanning } from './generators/event-planning.js';
import { generateFitness } from './generators/fitness.js';
import { generatePetCare } from './generators/pet-care.js';
import { generateGardening } from './generators/gardening.js';
import { generateJewelry } from './generators/jewelry.js';
import { generateElectronics } from './generators/electronics.js';
import { generateSemiconductors } from './generators/semiconductors.js';
import { generateOptics } from './generators/optics.js';
import { generateSensors } from './generators/sensors.js';
import { generateDrones } from './generators/drones.js';
import { generateAR } from './generators/ar.js';
import { generateVR } from './generators/vr.js';
import { generateMetaverse } from './generators/metaverse.js';
import { generateCybersecurity } from './generators/cybersecurity.js';
import { generateCloud } from './generators/cloud.js';
import { generateDevOps } from './generators/devops.js';
import { generateDataScience } from './generators/data-science.js';
import { generateML } from './generators/ml.js';
import { generateRoboticsIndustrial } from './generators/robotics-industrial.js';
import { generateAerospaceDefense } from './generators/aerospace-defense.js';
import { generateBiotechnology } from './generators/biotechnology.js';
import { generateNanotechnology } from './generators/nanotechnology.js';
import { generateRenewableEnergy } from './generators/renewable-energy.js';
import { generateBattery } from './generators/battery.js';
import { generateSmartGrid } from './generators/smart-grid.js';
import { generate5G } from './generators/5g.js';
import { generate6G } from './generators/6g.js';
import { generateQuantumComputing } from './generators/quantum-computing.js';
import { generateSyntheticBiology } from './generators/synthetic-biology.js';
import { generateGenomics } from './generators/genomics.js';
import { generateAgTech } from './generators/agtech.js';
import { generateFoodDelivery } from './generators/food-delivery.js';
import { generateSmartHome } from './generators/smart-home.js';
import { generateWearables } from './generators/wearables.js';
import { generate3DPrinting } from './generators/3d-printing.js';
import { generateDroneDelivery } from './generators/drone-delivery.js';
import { generateAV } from './generators/av.js';
import { generatePersonalizedMedicine } from './generators/personalized-medicine.js';
import { generateSpaceTourism } from './generators/space-tourism.js';

export type GeneratorFn = (seed: Seed, outputPath: string) => Promise<{ filePath: string; [key: string]: any }>;

// Domain → generator mapping (103+ domains)
const DOMAIN_MAP: Record<string, GeneratorFn> = {
  universe: generateUniverse,
  protein: generateProtein,
  market: generateMarket,
  'meta-domain': generateMetaDomain,
  consciousness: generateConsciousness,
  'quantum-circuit': generateQuantumCircuit,
  reactor: generateReactor,
  nanobot: generateNanobot,
  city: generateCity,
  climate: generateClimate,
  material: generateMaterial,
  aerospace: generateAerospace,
  genome: generateGenome,
  robotics: generateRobotics,
  agriculture: generateAgriculture,
  drug: generateDrug,
  blockchain: generateBlockchain,
  education: generateEducation,
  finance: generateFinance,
  healthcare: generateHealthcare,
  logistics: generateLogistics,
  media: generateMedia,
  'real-estate': generateRealEstate,
  security: generateSecurity,
  space: generateSpace,
  transportation: generateTransportation,
  energy: generateEnergy,
  chemical: generateChemical,
  automotive: generateAutomotive,
  marine: generateMarine,
  legal: generateLegal,
  insurance: generateInsurance,
  tourism: generateTourism,
  hospitality: generateHospitality,
  sports: generateSports,
  gaming: generateGaming,
  fashion: generateFashion,
  cosmetics: generateCosmetics,
  furniture: generateFurniture,
  textiles: generateTextiles,
  art: generateArt,
  photography: generatePhotography,
  architecture: generateArchitecture,
  'interior-design': generateInteriorDesign,
  landscaping: generateLandscaping,
  lighting: generateLighting,
  acoustics: generateAcoustics,
  biomedical: generateBiomedical,
  neuroscience: generateNeuroscience,
  edtech: generateEdTech,
  music: generateMusic,
  film: generateFilm,
  theater: generateTheater,
  dance: generateDance,
  literature: generateLiterature,
  journalism: generateJournalism,
  publishing: generatePublishing,
  advertising: generateAdvertising,
  marketing: generateMarketing,
  wine: generateWine,
  beer: generateBeer,
  spirits: generateSpirits,
  coffee: generateCoffee,
  tea: generateTea,
  'event-planning': generateEventPlanning,
  fitness: generateFitness,
  'pet-care': generatePetCare,
  gardening: generateGardening,
  jewelry: generateJewelry,
  electronics: generateElectronics,
  semiconductors: generateSemiconductors,
  optics: generateOptics,
  sensors: generateSensors,
  drones: generateDrones,
  ar: generateAR,
  vr: generateVR,
  metaverse: generateMetaverse,
  cybersecurity: generateCybersecurity,
  cloud: generateCloud,
  devops: generateDevOps,
  'data-science': generateDataScience,
  ml: generateML,
  'robotics-industrial': generateRoboticsIndustrial,
  'aerospace-defense': generateAerospaceDefense,
  biotechnology: generateBiotechnology,
  nanotechnology: generateNanotechnology,
  'renewable-energy': generateRenewableEnergy,
  battery: generateBattery,
  'smart-grid': generateSmartGrid,
  '5g': generate5G,
  '6g': generate6G,
  'quantum-computing': generateQuantumComputing,
  'synthetic-biology': generateSyntheticBiology,
  genomics: generateGenomics,
  'agtech': generateAgTech,
  'food-delivery': generateFoodDelivery,
  'smart-home': generateSmartHome,
  wearables: generateWearables,
  '3d-printing': generate3DPrinting,
  'drone-delivery': generateDroneDelivery,
  av: generateAV,
  'personalized-medicine': generatePersonalizedMedicine,
  'space-tourism': generateSpaceTourism,
};

/**
 * Generate an artifact from a seed using the appropriate domain generator.
 * RNG is seeded from seed.$hash for full determinism.
 */
export async function dispatch(seed: Seed, outputPath: string): Promise<{ domain: string; result: any }> {
  const rng = rngFromHash(seed.$hash || '');
  const domain = seed.$domain || 'meta-domain';
  const generator = DOMAIN_MAP[domain];

  if (!generator) {
    throw new Error(`Unknown domain: ${domain}. Available: ${Object.keys(DOMAIN_MAP).join(', ')}`);
  }

  const result = await generator(seed, outputPath);

  return { domain, result };
}

/**
 * Get list of all available domains (103+).
 */
export function getDomains(): string[] {
  return Object.keys(DOMAIN_MAP);
}

/**
 * Check if a domain is supported.
 */
export function hasDomain(domain: string): boolean {
  return domain in DOMAIN_MAP;
}

export { DOMAIN_MAP };
