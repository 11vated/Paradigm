#!/usr/bin/env bun
/**
 * Paradigm CLI — Universal Seed Command Line Interface
 *
 * Usage:
 *   paradigm grow <domain> [--genes key=val...] [--out dir]
 *   paradigm mutate <seed-file> [--budget 0.1]
 *   paradigm breed <seed-a> <seed-b> [--out file]
 *   paradigm evolve <domain> --algorithm map-elites --generations 100
 *   paradigm compose <seed-file> --to <domain>
 *   paradigm gspl <file.gspl>
 *   paradigm gspl repl
 *   paradigm play <file.gseed>
 *   paradigm verify <file.gseed>
 *   paradigm sign <seed-file>
 *   paradigm export <seed-id> --format gseed|json|svg|html|wav
 *   paradigm vcs commit <seed-file> --message "..."
 *   paradigm vcs log <seed-file>
 *   paradigm server [--port 3000]
 *   paradigm --version
 *   paradigm --help
 */

import { parseArgs } from 'util';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve, extname, basename } from 'path';
import { createHash }  from 'crypto';
import { Xoshiro256StarStar, rngFromHash } from '../src/lib/kernel/rng';
import { growSeed, ENGINES } from '../src/lib/kernel/engines';
import { GsplLexer }        from '../src/lib/kernel/gspl-lexer';
import { GsplParser }        from '../src/lib/kernel/gspl-parser';
import { GsplInterpreter }   from '../src/lib/kernel/gspl-interpreter';
import { GsplModuleResolver } from '../src/lib/kernel/gspl-module-resolver';

const VERSION = '0.1.0';
const BOLD = '\x1b[1m'; const DIM = '\x1b[2m'; const RESET = '\x1b[0m';
const GREEN = '\x1b[32m'; const CYAN = '\x1b[36m'; const RED = '\x1b[31m'; const YELLOW = '\x1b[33m';

function log(level: 'info' | 'success' | 'warn' | 'error', msg: string) {
  const prefix = { info: `${CYAN}ℹ${RESET}`, success: `${GREEN}✓${RESET}`, warn: `${YELLOW}⚠${RESET}`, error: `${RED}✗${RESET}` }[level];
  console.error(`${prefix} ${msg}`);
}

function printHelp() {
  console.log(`
${BOLD}Paradigm CLI${RESET} v${VERSION} — Universal Digital Creation Substrate

${BOLD}USAGE${RESET}
  paradigm <command> [options]

${BOLD}COMMANDS${RESET}
  ${CYAN}grow${RESET}     <domain> [--genes k=v ...] [--out dir]     Grow a seed into a real artifact
  ${CYAN}mutate${RESET}   <seed.json> [--budget 0.1]                  Mutate a seed
  ${CYAN}breed${RESET}    <seed-a.json> <seed-b.json>                 Breed two seeds
  ${CYAN}evolve${RESET}   <domain> --algorithm <algo> --gen <N>       Run evolution
  ${CYAN}compose${RESET}  <seed.json> --to <domain>                   Cross-domain composition
  ${CYAN}gspl${RESET}     <file.gspl>                                 Execute a GSPL program
  ${CYAN}gspl repl${RESET}                                             Interactive GSPL REPL
  ${CYAN}play${RESET}     <file.gseed>                                 Load and verify a .gseed package
  ${CYAN}verify${RESET}   <file.gseed>                                 Verify sovereignty signature
  ${CYAN}sign${RESET}     <seed.json>                                  Sign with device key
  ${CYAN}export${RESET}   <seed.json> --format <fmt>                   Export to format
  ${CYAN}vcs commit${RESET} <seed.json> --message "..."               Commit to VCS
  ${CYAN}vcs log${RESET}  <seed.json>                                  Show VCS history
  ${CYAN}server${RESET}   [--port 3000]                                Start the Paradigm server
  ${CYAN}domains${RESET}                                               List all registered domains

${BOLD}ALGORITHMS${RESET}
  ga, map-elites, cmaes, poet, nslc, dqd, aurora

${BOLD}DOMAINS${RESET}
  visual2d, sprite, music, character, game, world, website, app, quantum,
  field, molecule, cosmology, narrative, shader, physics, alife, ecosystem,
  circuit, agent, ui, architecture, vehicle, furniture, fashion, +100 more

${BOLD}EXAMPLES${RESET}
  ${DIM}# Grow a website${RESET}
  paradigm grow website --genes aesthetic=cyberpunk purpose=portfolio --out ./out

  ${DIM}# Grow a quantum probability visualization${RESET}
  paradigm grow quantum --genes potentialType=double_well --out ./quantum

  ${DIM}# Evolve a visual2d seed with MAP-Elites${RESET}
  paradigm evolve visual2d --algorithm map-elites --generations 50

  ${DIM}# Execute a GSPL program${RESET}
  paradigm gspl my-program.gspl

  ${DIM}# Interactive GSPL REPL${RESET}
  paradigm gspl repl

  ${DIM}# Compose a world seed into music${RESET}
  paradigm compose world.json --to music
`);
}

// ─── Command Implementations ──────────────────────────────────────────────────

async function cmdGrow(args: string[]) {
  const domain = args[0];
  if (!domain) { log('error', 'Usage: paradigm grow <domain> [--genes k=v ...] [--out dir]'); process.exit(1); }

  const outDir = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : './paradigm-out'; })();
  mkdirSync(resolve(outDir), { recursive: true });

  const genes: Record<string, unknown> = {};
  let i = 1;
  while (i < args.length) {
    if (args[i] === '--genes') { i++; continue; }
    if (args[i] === '--out')   { i += 2; continue; }
    if (args[i].includes('=')) {
      const [k, v] = args[i].split('=');
      const num = parseFloat(v);
      genes[k] = { value: isNaN(num) ? v : num };
    }
    i++;
  }

  const hash = createHash('sha256').update(domain + JSON.stringify(genes)).digest('hex');
  const seed = { $domain: domain, $hash: hash, genes };

  log('info', `Growing ${BOLD}${domain}${RESET} seed...`);
  const t0 = Date.now();

  try {
    const result = await growSeed(seed as any);
    const elapsed = Date.now() - t0;
    log('success', `Grown in ${elapsed}ms`);
    const outFile = join(resolve(outDir), `${domain}-${hash.slice(0, 8)}.json`);
    writeFileSync(outFile, JSON.stringify({ seed, result }, null, 2));
    console.log(outFile);
  } catch (e: any) {
    log('error', `Growth failed: ${e.message}`);
    process.exit(1);
  }
}

async function cmdGspl(args: string[]) {
  if (args[0] === 'repl') {
    await cmdGsplRepl();
    return;
  }
  const file = args[0];
  if (!file || !existsSync(file)) { log('error', `File not found: ${file}`); process.exit(1); }
  const source = readFileSync(file, 'utf8');
  log('info', `Executing ${file}...`);
  try {
    const lexer   = new GsplLexer(source);
    const tokens  = lexer.tokenize();
    const parser  = new GsplParser(tokens);
    const ast     = parser.parse();
    const interp  = new GsplInterpreter();
    const result  = await interp.evaluate(ast, {});
    console.log(JSON.stringify(result, null, 2));
  } catch (e: any) {
    log('error', `GSPL error: ${e.message}`);
    process.exit(1);
  }
}

async function cmdGsplRepl() {
  const { createInterface } = await import('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: `${CYAN}gspl>${RESET} ` });
  const interp = new GsplInterpreter();
  console.log(`${BOLD}Paradigm GSPL REPL${RESET} v${VERSION}  ${DIM}(type .exit to quit, .help for help)${RESET}`);
  rl.prompt();
  let buffer = '';
  rl.on('line', async (line) => {
    if (line.trim() === '.exit') { console.log('Bye.'); process.exit(0); }
    if (line.trim() === '.help') {
      console.log('  .exit       Quit\n  .help       This message\n  .clear      Clear context\n  .domains    List domains');
      rl.prompt(); return;
    }
    if (line.trim() === '.domains') {
      console.log(Object.keys(ENGINES).join(', ')); rl.prompt(); return;
    }
    buffer += line + '\n';
    // Try to evaluate on complete expressions (simple heuristic: balanced braces)
    const open = (buffer.match(/\{/g) || []).length;
    const close = (buffer.match(/\}/g) || []).length;
    if (open === close && buffer.trim()) {
      try {
        const lexer  = new GsplLexer(buffer);
        const tokens = lexer.tokenize();
        const parser = new GsplParser(tokens);
        const ast    = parser.parse();
        const result = await interp.evaluate(ast, {});
        if (result !== undefined && result !== null) console.log(`${GREEN}→${RESET}`, JSON.stringify(result, null, 2));
      } catch (e: any) {
        console.log(`${RED}!${RESET}`, e.message);
      }
      buffer = '';
    }
    rl.prompt();
  });
}

async function cmdDomains() {
  const domains = Object.keys(ENGINES).sort();
  console.log(`\n${BOLD}${domains.length} registered domains:${RESET}\n`);
  const cols = 4;
  for (let i = 0; i < domains.length; i += cols) {
    console.log(domains.slice(i, i + cols).map(d => d.padEnd(22)).join(''));
  }
  console.log();
}

async function cmdPlay(args: string[]) {
  const file = args[0];
  if (!file || !existsSync(file)) { log('error', `File not found: ${file}`); process.exit(1); }
  log('info', `Loading ${file}...`);
  const { ParadigmPlayer } = await import('../src/lib/player/index');
  const buf = readFileSync(file);
  try {
    const player = new ParadigmPlayer();
    const result = await player.play(buf);
    log(result.verified ? 'success' : 'warn', `Signature: ${result.verified ? 'VERIFIED' : 'UNVERIFIED'}`);
    log('info', `Domain: ${result.domain}`);
    log('info', `Hash:   ${result.seedHash}`);
    if (result.royalty) log('info', `Royalty: ${result.royalty.bps / 100}% to ${result.royalty.creator.slice(0, 16)}...`);
    if (result.provenance) log('info', `Author: ${result.provenance.author}`);
    console.log(JSON.stringify({ mimeType: result.artifact.mimeType, size: result.artifact.data.length }, null, 2));
  } catch (e: any) {
    log('error', `Player error: ${e.message}`);
    process.exit(1);
  }
}

// ─── Entry ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
if (!argv.length || argv[0] === '--help' || argv[0] === '-h') { printHelp(); process.exit(0); }
if (argv[0] === '--version' || argv[0] === '-v') { console.log(`Paradigm CLI v${VERSION}`); process.exit(0); }

const [command, ...rest] = argv;

switch (command) {
  case 'grow':    await cmdGrow(rest);    break;
  case 'gspl':    await cmdGspl(rest);    break;
  case 'domains': await cmdDomains();     break;
  case 'play':    await cmdPlay(rest);    break;
  case 'help':    printHelp();            break;
  default:
    log('error', `Unknown command: ${command}. Run 'paradigm --help' for usage.`);
    process.exit(1);
}
