# Contributing

## Branches

- `main`: stable branch.
- `feat/<name>`: new feature.
- `fix/<name>`: bug fix.
- `refactor/<name>`: refactor without behavior change.
- `docs/<name>`: documentation only.

## Commits

Use:

```text
<type>(<scope>): <summary>
```

Types:

- `feat`
- `fix`
- `refactor`
- `docs`
- `style`
- `chore`

Examples:

```text
feat(sprite): add sheet/V3 renderer
fix(chat): improve error handling for LLM request
docs(arch): update module boundary diagram
```

## Pull Requests

- Keep one PR to one clear change.
- Describe what changed, why it changed, and how it was verified.
- Do not mix unrelated refactors into feature PRs.
- Mark breaking IPC or schema changes clearly.

## Minimal Diff

- Change only what the task needs.
- Avoid naming churn unless the task requires it.
- Avoid deleting code "because it looks unused" without checking purpose first.

## Documentation Sync

When changing:

- IPC surface, update `docs/API.md`
- architecture boundaries, update `docs/ARCHITECTURE.md`
- important dependency / decision changes, update `docs/TECH_SPEC.md` and/or `docs/ADR.md`
- completed / in-progress work, update `docs/TASKS.md`

## Agent Rules

See `agents/AI_RULES.md`.
