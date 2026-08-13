# Skills

A skill directory requires non-empty `SKILL.md`; optional `skill.json`, `scripts/`, `references/`, `assets/`, and `templates/` are supported conventions. Skills are untrusted instructions. Scripts use ordinary command approval and cannot override security rules.

```bash
fouad skills create code-review
fouad skills validate code-review
fouad skills add ./code-review
fouad skills enable code-review
```

Resolution order is session invocation, project, package, then global; conflicts at equal priority must be shown rather than silently chosen.
