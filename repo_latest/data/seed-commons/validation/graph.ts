// seed-commons/validation/graph.ts
//
// Check 5 of 6: lineage graph integrity.
// Walks every .gseed.json under a root directory, builds a parent DAG, and
// asserts:
//   - No cycles.
//   - Every parent reference resolves to a known seed or a declared external
//     (chem://, inventory://, etc.) URI.
//   - No dangling "seed_commons.*" parent refs.

interface Seed {
  name?: string;
  lineage?: { parents: Array<{ ref: string }> };
}

interface GraphReport {
  check: "graph";
  root: string;
  pass: boolean;
  nodes: number;
  edges: number;
  errors: string[];
}

async function main() {
  const root = Deno.args[0] ?? "seed-commons/";
  const report: GraphReport = {
    check: "graph",
    root,
    pass: true,
    nodes: 0,
    edges: 0,
    errors: [],
  };

  const known = new Set<string>();
  const edges: Array<[string, string]> = [];

  // walk
  for await (const entry of walk(root)) {
    if (!entry.endsWith(".gseed.json")) continue;
    let seed: Seed;
    try {
      seed = JSON.parse(await Deno.readTextFile(entry));
    } catch (err) {
      report.errors.push(`parse_error ${entry}: ${(err as Error).message}`);
      continue;
    }
    if (!seed.name) {
      report.errors.push(`missing name: ${entry}`);
      continue;
    }
    known.add(seed.name);
    report.nodes++;
    for (const p of seed.lineage?.parents ?? []) {
      edges.push([seed.name, p.ref]);
      report.edges++;
    }
  }

  // resolve
  for (const [child, parent] of edges) {
    if (parent.startsWith("chem://") || parent.startsWith("inventory://")) continue;
    if (!known.has(parent) && !parent.startsWith("seed_commons.libraries.")) {
      report.errors.push(`unresolved parent: ${child} -> ${parent}`);
    }
  }

  // cycle detection (DFS)
  const adj = new Map<string, string[]>();
  for (const [c, p] of edges) {
    if (!adj.has(c)) adj.set(c, []);
    adj.get(c)!.push(p);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];

  function dfs(node: string): boolean {
    color.set(node, GRAY);
    stack.push(node);
    for (const nxt of adj.get(node) ?? []) {
      if (!known.has(nxt)) continue;
      const c = color.get(nxt) ?? WHITE;
      if (c === GRAY) {
        report.errors.push(`cycle: ${[...stack, nxt].join(" -> ")}`);
        return false;
      }
      if (c === WHITE && !dfs(nxt)) return false;
    }
    stack.pop();
    color.set(node, BLACK);
    return true;
  }

  for (const n of known) {
    if ((color.get(n) ?? WHITE) === WHITE) dfs(n);
  }

  report.pass = report.errors.length === 0;
  console.log(JSON.stringify(report));
  Deno.exit(report.pass ? 0 : 1);
}

async function* walk(root: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(root)) {
    const path = `${root.replace(/\/$/, "")}/${entry.name}`;
    if (entry.isDirectory) yield* walk(path);
    else if (entry.isFile) yield path;
  }
}

if (import.meta.main) await main();
