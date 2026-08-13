# Models and local runtime

Standard profile is Qwen/Qwen3-4B-GGUF Q4_K_M, attributed to Qwen and governed by the exact upstream model card/license. The UI never claims authorship. Because upstream filenames and digests can change, release maintainers must pin a revision, filename, size, SHA-256, and license snapshot in a reviewed signed manifest before publishing.

`fouad setup` downloads only after showing source, license, size, RAM and destination. `.part` files resume with HTTP Range and finalize atomically. If a trusted SHA-256 is configured it is mandatory. Runtime execution expects a separately verified `llama-server` or Ollama installation; automatic third-party binary installation is intentionally withheld until a signed platform manifest is published.

Cloud provider content transfer is opt-in. Set `FOUAD_API_KEY` only for the one invocation using an explicitly selected OpenAI-compatible provider; prefer OS keychain integrations in production deployments.
