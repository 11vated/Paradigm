/**
 * gseed-cli — Command-line tool for .gseed files
 *
 * Usage:
 *   npx tsx src/lib/export/gseed-cli.ts create <seed.json> <output.gseed> [options]
 *   npx tsx src/lib/export/gseed-cli.ts info <file.gseed>
 *   npx tsx src/lib/export/gseed-cli.ts verify <file.gseed> [public-key.pem]
 *   npx tsx src/lib/export/gseed-cli.ts extract <file.gseed> <output-dir>
 */

import fs from 'fs';
import path from 'path';
import { encodeGseed, decodeGseed, readGseedFile, writeGseedFile, verifyGseedSignature, type GseedPackage } from '../kernel/binary-format';

const [,, command, ...args] = process.argv;

function usage(): void {
  console.log(`
gseed-cli — .gseed binary format tool

USAGE:
  gseed info <file.gseed>              — Show file info
  gseed create <seed.json> <out.gseed>  — Create from seed JSON
  gseed verify <file.gseed> [key.pem]   — Verify signature
  gseed extract <file.gseed> <out-dir>  — Extract outputs

OPTIONS:
  --author <name>       Set author metadata
  --title <title>       Set title metadata
  --key <key.pem>       Sign with private key
  --no-compress         Disable compression
`);
}

async function main(): Promise<void> {
  switch (command) {
    case 'info': {
      const [file] = args;
      if (!file) return usage();
      const pkg = readGseedFile(file);
      console.log('=== .gseed File Info ===');
      console.log(`Version:     ${pkg.version.major}.${pkg.version.minor}`);
      console.log(`Timestamp:   ${new Date(pkg.timestamp).toISOString()}`);
      console.log(`Seed hash:   ${pkg.seedHash}`);
      console.log(`Compressed:  ${pkg.flags.compressed}`);
      console.log(`C2PA:        ${pkg.flags.hasC2PA}`);
      console.log(`Outputs:     ${pkg.flags.hasOutputs}`);
      console.log(`Royalty:     ${pkg.flags.royaltyEnabled}`);
      console.log(`Signature:   ${pkg.signature ? `${pkg.signature.length} bytes` : 'none'}`);
      if (pkg.metadata) {
        console.log(`\nMetadata:`);
        console.log(`  Author:    ${pkg.metadata.author}`);
        console.log(`  Title:     ${pkg.metadata.title}`);
        console.log(`  Generator: ${pkg.metadata.generator}`);
        console.log(`  License:   ${pkg.metadata.license}`);
        console.log(`  Created:   ${pkg.metadata.created}`);
      }
      if (pkg.outputs) {
        console.log(`\nOutputs (${pkg.outputs.length}):`);
        for (const out of pkg.outputs) {
          const typeName = ['', 'OBJ', 'WAV', 'PNG', 'GLTF', 'MIDI', 'SVG', 'HTML', 'JSON', 'TEXT', 'CODE', 'STORY', 'SIM', 'PREVIEW', 'STATS'][out.type] || `TYPE_${out.type}`;
          console.log(`  [${out.index}] ${typeName} — ${out.data.length} bytes`);
        }
      }
      break;
    }

    case 'create': {
      const [seedJsonPath, outPath] = args;
      if (!seedJsonPath || !outPath) return usage();

      const idx = args.indexOf('--author');
      const author = idx !== -1 ? args[idx + 1] : undefined;
      const idx2 = args.indexOf('--title');
      const title = idx2 !== -1 ? args[idx2 + 1] : undefined;
      const idx3 = args.indexOf('--key');
      const keyPath = idx3 !== -1 ? args[idx3 + 1] : undefined;
      const noCompress = args.includes('--no-compress');

      const seedJson = JSON.parse(fs.readFileSync(seedJsonPath, 'utf-8'));

      const pkg: GseedPackage = {
        version: { major: 1, minor: 1 },
        timestamp: Date.now(),
        flags: {
          hasC2PA: false,
          hasOutputs: false,
          encryptedSeed: false,
          royaltyEnabled: false,
          compressed: !noCompress,
        },
        seedHash: seedJson.hash || seedJson.id || '0000000000000000000000000000000000000000000000000000000000000000',
        metadata: {
          schema: 'https://paradigm.ai/schema/gseed-metadata/v1',
          author: author || seedJson.metadata?.author || 'Anonymous',
          title: title || seedJson.metadata?.title || seedJson.name || 'Untitled Seed',
          generator: seedJson.metadata?.generator || seedJson.domain || 'unknown',
          created: new Date().toISOString(),
          license: seedJson.metadata?.license || 'CC0',
        },
      };

      let result = pkg;

      if (keyPath) {
        const privateKeyPem = fs.readFileSync(keyPath, 'utf-8');
        const { signGseed } = await import('../kernel/binary-format');
        result = signGseed(pkg, privateKeyPem);
      }

      writeGseedFile(outPath, result);
      console.log(`Written ${outPath} (${fs.statSync(outPath).size} bytes)`);
      break;
    }

    case 'verify': {
      const [file, keyFile] = args;
      if (!file) return usage();

      const pkg = readGseedFile(file);

      if (!pkg.signature) {
        console.log('No signature in .gseed file');
        process.exitCode = 1;
        return;
      }

      if (!keyFile) {
        console.log('Signed .gseed file — provide a public key to verify');
        console.log(`Signature: ${pkg.signature.length} bytes`);
        return;
      }

      const publicKeyPem = fs.readFileSync(keyFile, 'utf-8');
      const valid = verifyGseedSignature(pkg, publicKeyPem);
      console.log(valid ? '✓ Signature valid' : '✗ Signature INVALID');
      process.exitCode = valid ? 0 : 1;
      break;
    }

    case 'extract': {
      const [file, outDir] = args;
      if (!file || !outDir) return usage();

      const pkg = readGseedFile(file);
      if (!pkg.outputs || pkg.outputs.length === 0) {
        console.log('No outputs to extract');
        return;
      }

      fs.mkdirSync(outDir, { recursive: true });

      const extMap: Record<number, string> = { 1: '.obj', 2: '.wav', 3: '.png', 4: '.gltf', 5: '.mid' };
      for (const out of pkg.outputs) {
        const ext = extMap[out.type] || '.bin';
        const name = `output_${out.index}${ext}`;
        const outPath = path.join(outDir, name);
        fs.writeFileSync(outPath, Buffer.from(out.data));
        console.log(`Extracted ${outPath} (${out.data.length} bytes)`);
      }
      break;
    }

    default:
      usage();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exitCode = 1;
});