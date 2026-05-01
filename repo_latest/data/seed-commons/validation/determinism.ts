// seed-commons/validation/determinism.ts
//
// Check 1 of 6: grow-twice determinism.
// Runs `grow` on the given .gspl source twice with identical RNG seed and
// asserts byte-identical canonicalized payloads.

import { canonicalize } from "./_shared/canonical.ts";
import { grow, GrowOptions } from "./_shared/gspl.ts";

interface DeterminismReport {
  check: "determinism";
  path: string;
  rng_seed: string;
  pass: boolean;
  first_hash?: string;
  second_hash?: string;
  error?: string;
}

async function main() {
  const path = Deno.args[0];
  if (!path) {
    console.error("usage: determinism.ts <path-to-.gspl>");
    Deno.exit(2);
  }

  const rngSeed = deriveRngSeed(path);
  const opts: GrowOptions = {
    rngSeed,
    moduleRoots: ["seed-commons/"],
    pure: true,
  };

  const report: DeterminismReport = {
    check: "determinism",
    path,
    rng_seed: rngSeed,
    pass: false,
  };

  try {
    const a = await grow(path, opts);
    const b = await grow(path, opts);
    const ca = canonicalize(a.payload);
    const cb = canonicalize(b.payload);
    report.first_hash = await sha256Hex(ca);
    report.second_hash = await sha256Hex(cb);
    report.pass = ca === cb;
  } catch (err) {
    report.error = (err as Error).message;
  }

  console.log(JSON.stringify(report));
  Deno.exit(report.pass ? 0 : 1);
}

function deriveRngSeed(path: string): string {
  // Convention: rng_seed == module path without extension + ":v1"
  const noExt = path.replace(/\.gspl$/, "");
  return noExt.replaceAll("/", ".") + ":v1";
}

async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

if (import.meta.main) await main();
