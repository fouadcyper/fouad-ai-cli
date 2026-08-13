<div align="center">

<img src="apps/web/src/assets/fouad-cli-terminal.png" alt="Fouad CLI terminal interface" width="920" />

# Fouad CLI

### A focused AI workspace for builders who live in the terminal.

Build, inspect, and ship with model-assisted workflows, local tools, plugins,
and skills — without leaving your workspace.

<p>
  <a href="https://fouad-cli-platform.fouadzulof26.workers.dev/"><strong>Visit the website</strong></a> ·
  <a href="https://fouad-cli-platform.fouadzulof26.workers.dev/download"><strong>Install Fouad</strong></a> ·
  <a href="https://fouad-cli-platform.fouadzulof26.workers.dev/docs"><strong>Read the docs</strong></a>
</p>

<p>
  <a href="https://github.com/fouadcyper/fouad-ai-cli/stargazers"><img src="https://img.shields.io/github/stars/fouadcyper/fouad-ai-cli?style=flat-square&color=4ade80" alt="GitHub stars" /></a>
  <a href="https://github.com/fouadcyper/fouad-ai-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-4ade80?style=flat-square" alt="Apache 2.0 license" /></a>
  <a href="https://www.npmjs.com/package/fouad-ai"><img src="https://img.shields.io/npm/v/fouad-ai?style=flat-square&logo=npm" alt="npm version" /></a>
  <a href="https://github.com/fouadcyper/fouad-ai-cli/actions"><img src="https://img.shields.io/github/actions/workflow/status/fouadcyper/fouad-ai-cli/ci.yml?style=flat-square&label=checks" alt="CI status" /></a>
</p>

</div>

## The short version

Fouad CLI is an open-source AI coding workspace for the command line. It keeps
the interaction close to your codebase and makes the important boundaries
visible: the active provider, permissions, tools, sessions, and account state.

```bash
npm install -g fouad-ai
fouad
```

|   Local-first workflow    |  Extensible by design  |           Safe hosted gateway            |
| :-----------------------: | :--------------------: | :--------------------------------------: |
| llama.cpp · Ollama · GGUF | plugins · skills · MCP | explicit providers · server-side secrets |

## See it in action

<table>
  <tr>
    <td width="50%"><img src="artifacts/screenshots/redesign-live/home-desktop.png" alt="Fouad CLI homepage" /></td>
    <td width="50%"><img src="artifacts/screenshots/redesign-live/docs-desktop.png" alt="Fouad CLI documentation" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Product overview</sub></td>
    <td align="center"><sub>Developer documentation</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="artifacts/screenshots/redesign-live/download-mobile.png" alt="Fouad CLI download page" /></td>
    <td width="50%"><img src="artifacts/screenshots/redesign-live/admin-desktop.png" alt="Fouad CLI admin workspace" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Install from any device</sub></td>
    <td align="center"><sub>Provider administration</sub></td>
  </tr>
</table>

## Quick start

```bash
# Install globally — available from every project directory
npm install -g fouad-ai
fouad --version
fouad doctor
fouad
```

Connect a CLI device securely:

```bash
fouad login
fouad whoami
```

Download and build the complete project from GitHub:

```bash
git clone https://github.com/fouadcyper/fouad-ai-cli.git
cd fouad-ai-cli
npm install
npm run build
npm link
fouad --version
```

Or use the [ZIP download](https://github.com/fouadcyper/fouad-ai-cli/archive/refs/heads/main.zip).

## Why Fouad CLI

| Capability                  | What it means in practice                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| **Terminal-native**         | Stream responses, run slash commands, inspect diffs, and keep sessions beside your code.            |
| **Provider choice**         | Use Gemini, OpenAI-compatible endpoints, Ollama, llama.cpp, or an explicit custom adapter.          |
| **Local models**            | Local GGUF inference stays on the device and never silently falls back to cloud.                    |
| **Plugins and skills**      | Extend commands and context through permissioned, inspectable packages.                             |
| **Permission boundaries**   | Workspace access, command approvals, path checks, and secret redaction are explicit.                |
| **Browser account linking** | Connect a CLI device with short-lived authorization instead of copying passwords into the terminal. |

## Useful commands

```text
fouad setup       First-run hardware and model setup
fouad chat        Open the interactive terminal workspace
fouad ask "..."   Ask one question and exit
fouad doctor      Diagnose installation and runtime issues
fouad models      List, import, verify, and select models
fouad providers   Inspect configured provider adapters
fouad plugins     Manage permissioned extensions
fouad skills      Manage reusable instruction packages
fouad mcp         Connect and inspect MCP servers
fouad sessions    Resume, export, or manage local sessions
```

## Live links

- **GitHub:** [fouadcyper/fouad-ai-cli](https://github.com/fouadcyper/fouad-ai-cli)
- **Website:** [fouad-cli-platform.fouadzulof26.workers.dev](https://fouad-cli-platform.fouadzulof26.workers.dev/)
- **Download:** [Install Fouad CLI](https://fouad-cli-platform.fouadzulof26.workers.dev/download)
- **Documentation:** [Fouad CLI Docs](https://fouad-cli-platform.fouadzulof26.workers.dev/docs)
- **Sign in:** [Account login](https://fouad-cli-platform.fouadzulof26.workers.dev/login)
- **Dashboard:** [Open dashboard](https://fouad-cli-platform.fouadzulof26.workers.dev/dashboard)
- **Admin:** [Open admin dashboard](https://fouad-cli-platform.fouadzulof26.workers.dev/admin)
- **npm:** [npmjs.com/package/fouad-ai](https://www.npmjs.com/package/fouad-ai)

## Develop locally

```bash
npm install
npm run check
npm run platform:check
npm run web:dev
```

Build and preview the web platform:

```bash
npm run web:build
npm run web:preview
```

Deploy the existing Cloudflare Worker after configuring secrets privately:

```bash
npm run platform:deploy:dry
npm run platform:deploy
```

## Open source and security

Fouad CLI is currently open source under the [Apache-2.0 license](LICENSE).
Contributions, provider adapters, plugins, skills, documentation, and bug
reports are welcome. Read [SECURITY.md](SECURITY.md) before reporting a
security issue.

Never commit API keys, Supabase service-role credentials, Wrangler tokens, or
model weights. Provider keys belong in Worker secrets; the admin UI stores only
the secret name reference.

## Documentation map

- [Architecture](docs/ARCHITECTURE.md)
- [AI provider management](docs/AI_PROVIDER_MANAGEMENT.md)
- [Cloudflare setup](docs/CLOUDFLARE_SETUP.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [CLI authentication flow](docs/CLI_AUTH_FLOW.md)
- [Security model](docs/SECURITY_MODEL.md)
- [Plugins](docs/PLUGINS.md) · [Skills](docs/SKILLS.md) · [MCP](docs/MCP.md)
- [Contributing](CONTRIBUTING.md)

## Verification

The current checkout passes formatting, lint, web and Worker type checks,
production build, and the full Vitest suite.

```text
15 test files passed · 46 tests passed
```

<div align="center">

**Fouad CLI · open source · terminal-first · built for real work**

</div>
