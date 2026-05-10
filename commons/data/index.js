class CommonsSeed {
  constructor(domain, index) {
    this.id = `commons_${String(index).padStart(3, '0')}`;
    this.metadata = { domain, name: `Commons ${domain} ${index}` };
    this.genes = new Map([['color', { type: 'color', value: [index / 100, 0.5, 1 - index / 100] }]]);
  }

  getMetadata() {
    return this.metadata;
  }

  getGeneValue(type) {
    return this.genes.get(type)?.value;
  }
}

function createSeedCommons() {
  const domains = ['game', 'music', 'art', 'animation', 'simulation', 'ui', 'character', 'audio', 'visualization', 'vfx'];
  return Array.from({ length: 100 }, (_, index) => new CommonsSeed(domains[index % domains.length], index + 1));
}

module.exports = { createSeedCommons };
