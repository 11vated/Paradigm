// seed-commons/validation/_shared/canonical.ts
//
// JCS canonicalization (RFC 8785) + SHA-256 digest helpers shared by every
// commons validator. Matches the algorithm pinned by ADR-009 and spec/05.
//
// Deno-only. No third-party dependencies.

/**
 * Canonicalize a JSON value per RFC 8785 (JSON Canonicalization Scheme).
 *
 * Rules:
 *  - Object keys are sorted lexicographically (UTF-16 code unit order).
 *  - Numbers follow ECMAScript 2019 Number.prototype.toString (JCS §3.2.2.3).
 *  - Strings are serialized with the minimal JSON string escape set.
 *  - No insignificant whitespace.
 *  - Arrays preserve order.
 *
 * Returns a UTF-8 byte string suitable for hashing or signing.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CanonicalizationError(`non-finite number: ${value}`);
    }
    return canonicalNumber(value);
  }
  if (typeof value === "string") return canonicalString(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort(compareUtf16);
    return "{" + keys
      .map((k) => canonicalString(k) + ":" + canonicalize(obj[k]))
      .join(",") + "}";
  }
  throw new CanonicalizationError(`unsupported type: ${typeof value}`);
}

/** SHA-256 of the canonicalized UTF-8 bytes, hex-encoded with "sha256:" prefix. */
export async function canonicalHash(value: unknown): Promise<string> {
  const canonical = canonicalize(value);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + bytesToHex(new Uint8Array(digest));
}

export class CanonicalizationError extends Error {}

// ---------- private ----------

function canonicalNumber(n: number): string {
  // ECMA-262 ToString is spec-identical to JCS §3.2.2.3 for Number.
  if (Object.is(n, -0)) return "0";
  return n.toString();
}

function canonicalString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code === 0x22) out += '\\"';
    else if (code === 0x5c) out += "\\\\";
    else if (code === 0x08) out += "\\b";
    else if (code === 0x0c) out += "\\f";
    else if (code === 0x0a) out += "\\n";
    else if (code === 0x0d) out += "\\r";
    else if (code === 0x09) out += "\\t";
    else if (code < 0x20) out += "\\u" + code.toString(16).padStart(4, "0");
    else out += s[i];
  }
  out += '"';
  return out;
}

function compareUtf16(a: string, b: string): number {
  // Lexicographic in UTF-16 code unit order (JCS §3.2.3).
  return a < b ? -1 : a > b ? 1 : 0;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}
