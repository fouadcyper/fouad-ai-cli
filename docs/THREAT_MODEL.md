# Threat model

Protected assets include workspace files, credentials, model integrity, session history, and host execution. Threats include traversal and symlink escape, prompt injection in repository instructions, malicious plugins/skills/MCP servers, malformed tool calls, destructive or obfuscated commands, secret leakage, compromised downloads, and cloud exfiltration.

Controls: workspace canonicalization, sensitive-path deny policy, validated schemas, argument-array process execution, default workspace-write mode, explicit destructive approval, bounded output/timeouts/cancellation, redaction, disabled-by-default plugins and cloud providers, minimal MCP environment mapping, SHA-256 verification when a trusted digest exists, atomic downloads/config writes, telemetry off, and no unattended sudo.

Repository instructions and skill text are untrusted context, never authority. Remaining risks: local inference runtimes are third-party binaries; users must verify provenance. Process isolation is platform-dependent. A model can propose harmful steps, so permission enforcement remains outside inference.
