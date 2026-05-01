/**
 * Circuit Generator — produces interactive circuit simulator
 * Enhanced with SPICE netlist generation and simulation
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface CircuitParams {
  circuitType: string;
  componentCount: number;
  isDigital: boolean;
  hasSimulation: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCircuitInteractive(seed: Seed, outputPath: string): Promise<{ filePath: string; netlistPath: string; simPath: string; componentCount: number }> {
  const params = extractParams(seed);

  // Generate circuit diagram (SVG)
  const svg = generateCircuitSVG(params);

  // Generate SPICE netlist
  const netlist = generateSPICENetlist(params);

  // Generate simulation script
  const simulation = generateSimulation(params);

  // Generate interactive HTML
  const html = generateInteractiveHTML(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write SVG file
  const svgPath = outputPath.replace(/\.json$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  // Write SPICE netlist
  const netlistPath = outputPath.replace(/\.json$/, '.cir');
  fs.writeFileSync(netlistPath, netlist);

  // Write simulation script
  const simPath = outputPath.replace(/\.json$/, '_sim.js');
  fs.writeFileSync(simPath, simulation);

  // Write interactive HTML
  const htmlPath = outputPath.replace(/\.json$/, '_interactive.html');
  fs.writeFileSync(htmlPath, html);

  // Write metadata JSON
  const jsonPath = outputPath.replace(/\.json$/, '_enhanced.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    circuit: {
      circuitType: params.circuitType,
      componentCount: params.componentCount,
      isDigital: params.isDigital,
      hasSimulation: params.hasSimulation,
      quality: params.quality
    },
    files: {
      svg: path.basename(svgPath),
      netlist: path.basename(netlistPath),
      simulation: path.basename(simPath),
      interactive: path.basename(htmlPath)
    }
  }, null, 2));

  return {
    filePath: jsonPath,
    netlistPath,
    simPath,
    componentCount: params.componentCount
  };
}

function generateCircuitSVG(params: CircuitParams): string {
  const width = 800;
  const height = 600;
  const components = generateComponents(params);

  const componentElements = components.map((comp, i) => {
    const x = 100 + (i % 4) * 150;
    const y = 100 + Math.floor(i / 4) * 150;
    
    switch (comp.type) {
      case 'resistor':
        return `<rect x="${x}" y="${y}" width="100" height="30" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
                <text x="${x + 50}" y="${y + 20}" text-anchor="middle" font-size="12">R${i} (${comp.value}Ω)</text>`;
      case 'capacitor':
        return `<line x1="${x}" y1="${y + 15}" x2="${x + 30}" y2="${y + 15}" stroke="#333" stroke-width="2"/>
                <line x1="${x + 30}" y1="${y}" x2="${x + 30}" y2="${y + 30}" stroke="#333" stroke-width="3"/>
                <line x1="${x + 70}" y1="${y}" x2="${x + 70}" y2="${y + 30}" stroke="#333" stroke-width="3"/>
                <line x1="${x + 70}" y1="${y + 15}" x2="${x + 100}" y2="${y + 15}" stroke="#333" stroke-width="2"/>
                <text x="${x + 50}" y="${y + 45}" text-anchor="middle" font-size="12">C${i} (${comp.value}F)</text>`;
      case 'inductor':
        return `<path d="M${x},${y + 15} q25,-20 50,0 q25,20 50,0" fill="none" stroke="#333" stroke-width="2"/>
                <text x="${x + 50}" y="${y + 45}" text-anchor="middle" font-size="12">L${i} (${comp.value}H)</text>`;
      case 'voltage_source':
        return `<circle cx="${x + 50}" cy="${y + 15}" r="40" fill="#ffe0e0" stroke="#333" stroke-width="2"/>
                <line x1="${x + 50}" y1="${y - 25}" x2="${x + 50}" y2="${y + 55}" stroke="#333" stroke-width="2"/>
                <text x="${x + 50}" y="${y + 15}" text-anchor="middle" dominant-baseline="middle" font-size="12">${comp.value}V</text>`;
      case 'ground':
        return `<line x1="${x + 50}" y1="${y}" x2="${x + 50}" y2="${y + 20}" stroke="#333" stroke-width="2"/>
                <line x1="${x + 30}" y1="${y + 20}" x2="${x + 70}" y2="${y + 20}" stroke="#333" stroke-width="2"/>
                <line x1="${x + 37}" y1="${y + 30}" x2="${x + 63}" y2="${y + 30}" stroke="#333" stroke-width="2"/>
                <line x1="${x + 43}" y1="${y + 40}" x2="${x + 57}" y2="${y + 40}" stroke="#333" stroke-width="2"/>`;
      default:
        return `<rect x="${x}" y="${y}" width="100" height="40" fill="#f0f0f0" stroke="#333" stroke-width="2"/>
                <text x="${x + 50}" y="${y + 25}" text-anchor="middle" font-size="12">${comp.type}_${i}</text>`;
    }
  }).join('\n  ');

  // Add wires
  const wires = [];
  for (let i = 0; i < components.length - 1; i++) {
    const x1 = 100 + (i % 4) * 150 + 100;
    const y1 = 100 + Math.floor(i / 4) * 150 + 15;
    const x2 = 100 + ((i + 1) % 4) * 150;
    const y2 = 100 + Math.floor((i + 1) / 4) * 150 + 15;
    wires.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="1"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="white"/>
  <text x="50%" y="30" text-anchor="middle" font-size="20" font-weight="bold">${params.circuitType} Circuit</text>
  ${wires.join('\n  ')}
  ${componentElements}
</svg>`;
}

function generateComponents(params: CircuitParams): any[] {
  const components = [];
  const types = params.isDigital 
    ? ['logic_gate', 'flip_flop', 'multiplexer', 'register']
    : ['resistor', 'capacitor', 'inductor', 'voltage_source', 'ground'];

  for (let i = 0; i < params.componentCount; i++) {
    components.push({
      id: `comp_${i}`,
      type: types[i % types.length],
      value: ['resistor', 'capacitor', 'inductor'].includes(types[i % types.length]) 
        ? Math.random() * 1000 + 10 
        : Math.random() * 5 + 1,
      position: [Math.floor(i / 4), i % 4]
    });
  }

  return components;
}

function generateSPICENetlist(params: CircuitParams): string {
  const components = generateComponents(params);
  let netlist = `* SPICE Netlist for ${params.circuitType} Circuit\n`;
  netlist += `.title ${params.circuitType} Circuit Simulation\n\n`;

  components.forEach((comp, i) => {
    const node1 = i + 1;
    const node2 = i + 2;
    
    switch (comp.type) {
      case 'resistor':
        netlist += `R${i} ${node1} ${node2} ${comp.value}\n`;
        break;
      case 'capacitor':
        netlist += `C${i} ${node1} ${node2} ${comp.value}\n`;
        break;
      case 'inductor':
        netlist += `L${i} ${node1} ${node2} ${comp.value}\n`;
        break;
      case 'voltage_source':
        netlist += `V${i} ${node1} ${node2} DC ${comp.value}\n`;
        break;
      case 'ground':
        netlist += `G${i} ${node1} 0\n`;
        break;
      default:
        netlist += `R${i} ${node1} ${node2} 1000\n`; // Default resistor
    }
  });

  netlist += `\n.control\n`;
  netlist += `tran 1ms 100ms\n`;
  netlist += `plot v(1)\n`;
  netlist += `.endc\n`;
  netlist += `.end\n`;

  return netlist;
}

function generateSimulation(params: CircuitParams): string {
  return `/**
 * Circuit Simulation — JavaScript-based circuit simulator
 * Simulates voltage/current over time using basic circuit laws
 */

class CircuitSimulator {
  constructor(components) {
    this.components = components;
    this.time = 0;
    this.voltage = new Array(components.length).fill(0);
    this.current = new Array(components.length).fill(0);
  }

  step(deltaTime) {
    this.time += deltaTime;
    
    // Simple simulation: update voltages based on component values
    this.components.forEach((comp, i) => {
      if (comp.type === 'voltage_source') {
        this.voltage[i] = comp.value * Math.sin(this.time * 2 * Math.PI * 60); // 60Hz AC
      } else if (comp.type === 'resistor') {
        this.current[i] = this.voltage[i] / comp.value;
        this.voltage[i] = this.current[i] * comp.value;
      } else if (comp.type === 'capacitor') {
        // Simplified capacitor behavior
        this.current[i] = comp.value * 0.001; // dV/dt approximation
        this.voltage[i] += this.current[i] * deltaTime;
      }
    });
  }

  getMeasurements() {
    return {
      time: this.time,
      voltages: [...this.voltage],
      currents: [...this.current]
    };
  }
}

// Initialize and run simulation
const components = ${JSON.stringify(generateComponents(params))};
const sim = new CircuitSimulator(components);

const measurements = [];
for (let i = 0; i < 1000; i++) {
  sim.step(0.001); // 1ms steps
  measurements.push(sim.getMeasurements());
}

console.log('Simulation complete', measurements.length, 'data points');
export { CircuitSimulator, measurements };
`;
}

function generateInteractiveHTML(params: CircuitParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.circuitType} Circuit Simulator</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .circuit { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .controls { background: white; padding: 20px; border-radius: 8px; }
    canvas { border: 1px solid #ccc; border-radius: 4px; margin-top: 10px; }
    button { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer; }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${params.circuitType} Circuit Simulator</h1>
    
    <div class="circuit">
      <h2>Circuit Diagram</h2>
      <img src="${path.basename(params.circuitType)}.svg" alt="Circuit Diagram" style="max-width: 100%;">
    </div>
    
    <div class="controls">
      <h2>Simulation Controls</h2>
      <button onclick="startSimulation()">Start</button>
      <button onclick="stopSimulation()">Stop</button>
      <button onclick="resetSimulation()">Reset</button>
      
      <div>
        <label>Simulation Speed: </label>
        <input type="range" min="1" max="100" value="50" id="speed" oninput="updateSpeed(this.value)">
        <span id="speed-value">50</span>
      </div>
      
      <canvas id="waveform" width="800" height="300"></canvas>
    </div>
  </div>
  
  <script>
    let simulationRunning = false;
    let simulationInterval;
    let speed = 50;
    
    function startSimulation() {
      if (simulationRunning) return;
      simulationRunning = true;
      simulationInterval = setInterval(updateWaveform, 1000 / speed);
    }
    
    function stopSimulation() {
      simulationRunning = false;
      clearInterval(simulationInterval);
    }
    
    function resetSimulation() {
      stopSimulation();
      const canvas = document.getElementById('waveform');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    function updateSpeed(value) {
      speed = value;
      document.getElementById('speed-value').textContent = value;
      if (simulationRunning) {
        stopSimulation();
        startSimulation();
      }
    }
    
    function updateWaveform() {
      const canvas = document.getElementById('waveform');
      const ctx = canvas.getContext('2d');
      
      // Simple waveform drawing
      const time = Date.now() / 1000;
      const voltage = Math.sin(time * 2 * Math.PI * 60) * 5; // 60Hz
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = 'blue';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      for (let x = 0; x < canvas.width; x++) {
        const t = time + x / canvas.width;
        const v = Math.sin(t * 2 * Math.PI * 60) * 100;
        ctx.lineTo(x, canvas.height / 2 - v);
      }
      ctx.stroke();
    }
  </script>
</body>
</html>`;
}

function extractParams(seed: Seed): CircuitParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let componentCount = seed.genes?.componentCount?.value || 5;
  if (typeof componentCount === 'number' && componentCount <= 1) componentCount = Math.max(3, Math.floor(componentCount * 20));

  return {
    circuitType: seed.genes?.circuitType?.value || 'amplifier',
    componentCount,
    isDigital: seed.genes?.isDigital?.value === true,
    hasSimulation: seed.genes?.hasSimulation?.value !== false,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
