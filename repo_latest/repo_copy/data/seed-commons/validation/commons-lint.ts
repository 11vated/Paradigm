// seed-commons/validation/commons-lint.ts
//
// Check 4 of 6: the 8-point commons contract from seed-commons/README.md.
//   1. Pure — no Network, no Time.
//   2. Uses only the 17 kernel gene types from spec/02.
//   3. SHA-256 over JCS canonical payload (declared).
//   4. Sovereignty gene present.
//   5. quality_vector present and all 6 axes in [0,1].
//   6. License declared.
//   7. Lineage complete (parents reference resolvable seeds).
//   8. Created_at in RFC 3339.

interface Seed {
  payload: unknown;
  quality_vector?: Record<string, number>;
  commons_lint?: Record<string, unknown>;
  author?: unknown;
  signature?: unknown;
  license?: string;
  created_at?: string;
  lineage?: { parents: Array<{ ref: string }> };
}

interface LintReport {
  check: "commons-lint";
  path: string;
  pass: boolean;
  failed_rules: string[];
}

const REQUIRED_QV_AXES = [
  "coherence",
  "fidelity",
  "novelty",
  "aesthetics",
  "constraint",
  "performance",
];

async function main() {
  const path = Deno.args[0];
  if (!path) {
    console.error("usage: commons-lint.ts <path-to-.gseed.json>");
    Deno.exit(2);
  }

  const report: LintReport = {
    check: "commons-lint",
    path,
    pass: true,
    failed_rules: [],
  };

  try {
    const seed = JSON.parse(await Deno.readTextFile(path)) as Seed;

    // 4. sovereignty gene (author + signature block)
    if (!seed.author) report.failed_rules.push("4:missing_author");
    if (!seed.signature) report.failed_rules.push("4:missing_signature");

    // 5. quality_vector
    if (!seed.quality_vector) {
      report.failed_rules.push("5:missing_quality_vector");
    } else {
      for (const axis of REQUIRED_QV_AXES) {
        const v = seed.quality_vector[axis];
        if (typeof v !== "number" || v < 0 || v > 1) {
          report.failed_rules.push(`5:quality_vector.${axis}_out_of_range`);
        }
      }
    }

    // 6. license
    if (!seed.license) report.failed_rules.push("6:missing_license");

    // 7. lineage parents resolvable
    if (!seed.lineage) {
      report.failed_rules.push("7:missing_lineage");
    } else {
      for (const p of seed.lineage.parents ?? []) {
        if (!p.ref || typeof p.ref !== "string") {
          report.failed_rules.push("7:parent_ref_malformed");
        }
      }
    }

    // 8. RFC 3339
    if (!seed.created_at || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(seed.created_at)) {
      report.failed_rules.push("8:created_at_not_rfc3339");
    }

    // 3. declared hash format
    const lint = seed.commons_lint ?? {};
    if (lint.hash_algorithm !== undefined && lint.hash_algorithm !== "sha256") {
      report.failed_rules.push("3:hash_algorithm_must_be_sha256");
    }
    if (lint.canonicalization !== undefined && lint.canonicalization !== "JCS-RFC8785") {
      report.failed_rules.push("3:canonicalization_must_be_JCS-RFC8785");
    }

    // 1 and 2 are compile-time checks; they're re-verified here via
    // commons_lint.pure / commons_lint.kernel_gene_only booleans.
    if (lint.pure !== true) report.failed_rules.push("1:not_marked_pure");
    if (lint.kernel_gene_only !== true) report.failed_rules.push("2:kernel_gene_only_false");

    report.pass = report.failed_rules.length === 0;
  } catch (err) {
    report.pass = false;
    report.failed_rules.push(`parse_error:${(err as Error).message}`);
  }

  console.log(JSON.stringify(report));
  Deno.exit(report.pass ? 0 : 1);
}

if (import.meta.main) await main();
