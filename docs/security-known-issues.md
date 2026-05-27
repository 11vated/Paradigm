# Security: Known Issues

**Last updated:** May 26, 2026

## Tracked dev-dependency vulnerabilities

These affect only the development toolchain (hardhat, mocha, @xenova/transformers) and are not reachable from production runtime code.

| Package | Severity | Dependency chain | Fix |
|---------|----------|-----------------|-----|
| protobufjs@6.11.6 | CRITICAL | @xenova/transformers → onnxruntime-web → onnx-proto → protobufjs | Requires upstream onnxruntime-web update |
| lodash@4.17.21 | HIGH | @nomicfoundation/ignition-core → lodash | Awaiting hardhat-toolbox update |
| serialize-javascript | HIGH | mocha → serialize-javascript | Awaiting hardhat update to newer mocha |
| tmp | HIGH | solc → tmp | Awaiting hardhat solc update |
| undici | HIGH | hardhat → undici | Awaiting hardhat update |

All tracked via `npm audit --audit-level=high` in CI (non-failing, informational).
