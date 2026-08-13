# Architecture

The executable routes commands through Commander. Configuration is schema-validated and atomically persisted. Provider adapters emit normalized asynchronous chunks. The local adapter targets llama.cpp's loopback OpenAI-compatible API. TUI state is isolated in React Ink. Tools, plugins, skills, MCP, permissions, sessions, downloads, and hardware selection are separate modules with dependency-friendly interfaces.

Trust boundaries: user input → command parser; repository → safe path resolver; model → validated tool registry; plugin/skill/MCP → explicit permissions; remote provider → privacy boundary; downloader → partial file and checksum boundary.
