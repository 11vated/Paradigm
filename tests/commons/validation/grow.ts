// seed-commons/validation/grow.ts
//
// Check 3 of 6: grow round-trip.
// Compiles a .gspl source, validates the payload against the seed schema,
// and asserts no non-kernel gene types appear.

import { grow, GrowOptions } from "./_shared/gspl.ts";

const KERNEL_GENE_TYPES = new Set([
  "scalar", "categorical", "vector", "expression", "struct", "array",
  "graph", "topology", "temporal", "regulatory", "field", "symbolic",
  "quantum", "gematria", "resonance", "dimensional", "sovereignty",
]);

interface GrowReport {
  check: "grow";
  path: string;
  pass: boolean;
  imports_used?: string[];
  errors: string[];
}

async function main() {
  const path = Deno.args[0];
  if (!path) {
    console.error("usage: grow.ts <path-to-.gspl>");
    Deno.exit(2);
  }

  const report: GrowReport = { check: "grow", path, pass: true, errors: [] };
  const opts: GrowOptions = {
    rngSeed: path.replace(/\.gspl$/, "").replaceAll("/", ".") + ":v1",
    moduleRoots: ["seed-commons/"],
    pure: true,
  };

  try {
    const result = await grow(path, opts);
    report.imports_used = result.importsUsed;

    // Assert every gene in the gene_manifest is a kernel gene type.
    const payload = result.payload as { gene_manifest?: Record<string, unknown> };
    if (payload.gene_manifest) {
      for (const key of Object.keys(payload.gene_manifest)) {
        if (!KERNEL_GENE_TYPES.has(key)) {
          report.pass = false;
          report.errors.push(
            `non-kernel gene type "${key}" in payload.gene_manifest (must be one of the 17 kernel types)`,
          );
        }
      }
    }

    // Assert no import escapes the commons + Std.
    for (const imp of result.importsUsed) {
      if (
        !imp.startsWith("Std.") &&
        !imp.startsWith("seed_commons.")
      ) {
        report.pass = false;
        report.errors.push(`disallowed import: ${imp}`);
      }
    }
  } catch (err) {
    report.pass = false;
    report.errors.push((err as Error).message);
  }

  console.log(JSON.stringify(report));
  Deno.exit(report.pass ? 0 : 1);
}

if (import.meta.main) await main();
