# Plugin SDK

Every plugin contains `fouad.plugin.json` and an ESM entrypoint. Required metadata and requested permissions are validated before use. Local, Git and npm are source concepts; no registry is claimed. Installation scripts are never run silently and new plugins remain disabled.

```bash
fouad plugins create hello-plugin
fouad plugins inspect hello-plugin
fouad plugins install ./hello-plugin
fouad plugins enable hello-plugin
```

The manifest supports commands, tools, providers, hooks, themes/context/export capabilities and settings schema. Production loading should use a worker/process boundary and capability RPC; the current release validates/scaffolds manifests but does not execute third-party plugin code.
