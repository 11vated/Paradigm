"""
Paradigm Golden Corpus — Python Cross-Stack Module (Phase 2/3)

This module provides the Python-side interface for golden corpus regression,
mirroring the TypeScript contracts and conformance logic.

Usage:
    from server.python.golden_corpus import run_golden_regression, PINNED_FAMILIES

    result = run_golden_regression(strict=True, json_output=True)
    print(result["passed"], result.get("drift", 0))
"""

from typing import Dict, List, Any
import subprocess
import json
from pathlib import Path

# First cohort — must match the TS pinned fixtures
PINNED_FAMILIES: List[str] = ["sprite", "particle", "vehicle"]

def run_golden_regression(strict: bool = True, json_output: bool = False) -> Dict[str, Any]:
    """
    Run the canonical golden corpus regression for the pinned cohort.

    Returns a dict with overall result, per-family details, and raw output.
    Raises on failure if strict=True.
    """
    script = Path(__file__).parent.parent.parent.parent / "scripts" / "golden-corpus-regression.ts"

    args = ["npx", "tsx", str(script)]
    if json_output:
        args.append("--json")
    if strict:
        args.append("--strict")

    result = subprocess.run(
        args,
        capture_output=True,
        text=True,
        cwd=Path(__file__).parent.parent.parent.parent
    )

    output: Dict[str, Any] = {
        "returncode": result.returncode,
        "passed": result.returncode == 0,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }

    # Try to parse JSON if --json was used
    if json_output and result.stdout.strip():
        try:
            parsed = json.loads(result.stdout)
            output["parsed"] = parsed
            output["drift"] = parsed.get("totalDrift", 0)
        except Exception:
            pass

    if strict and result.returncode != 0:
        raise RuntimeError(f"Golden corpus regression failed:\n{result.stdout}\n{result.stderr}")

    return output


def get_pinned_targets(family: str) -> Dict[str, str]:
    """Return the pinned hashes for a given family from the golden fixture."""
    fixture = Path(__file__).parent.parent.parent.parent / "golden" / f"{family}-golden-hashes.json"
    if not fixture.exists():
        raise FileNotFoundError(f"No pinned fixture for {family}")
    with open(fixture, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("targets", {})


if __name__ == "__main__":
    print("Paradigm Golden Corpus Python Interface (functional bridge)")
    print("Pinned families:", PINNED_FAMILIES)

    try:
        res = run_golden_regression(strict=False, json_output=True)
        print("Run result:", res.get("passed"), "drift:", res.get("drift"))
    except Exception as e:
        print("Error running regression:", e)
