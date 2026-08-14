# dsh-project-memory

Human-owned project memory for DeepSeek Harness.

Written by an AI agent on behalf of `199084`; the repository contents were reviewed by the account owner before publication.

> **The model can remember your project without becoming the owner of its memory.**

Put a `MEMORY.md` file at a workspace root. The plugin injects it as clearly labeled runtime context and offers a `project_memory` lookup tool. It never lets a model silently write long-term memory: the agent can propose an edit, and a person reviews it in Git like any other project change. Every injection includes the source path and modification time; lookups include matching line numbers.

## Why this exists

The useful part of durable agent memory is not an opaque vector database. It is durable, reviewable project decisions that travel with the repository. This plugin follows that boundary: `MEMORY.md` is the source of truth, every injected fact states its file source, model writes are intentionally absent, and the active workspace is the isolation boundary.

## How it differs

| Approach | What happens | Main risk |
| --- | --- | --- |
| Automatic memory database | The agent extracts and stores facts for you | Stale or wrong facts can become invisible authority |
| Vector memory | Similar text is recalled by embeddings | Hard to review, debug, or reproduce from Git |
| `CLAUDE.md` alone | Excellent hand-written instructions | No focused lookup tool or explicit memory provenance |
| `dsh-project-memory` | Hand-written Markdown, labeled injection, line-cited lookup | You must approve edits yourself, by design |

This is deliberately closer to a versioned project notebook than a black-box memory warehouse.

## Lazy mode

Lazy mode is enabled by default. At the end of a turn it captures new messages whose source is the user and writes at most 20 short proposals to `.dsh-memory-candidates.md` in the current workspace. Plugin-generated runtime context and model output are excluded.

It never edits `MEMORY.md`. Review candidates and move only the durable ones into `MEMORY.md`; commit that file normally. This gives the agent automation without giving it authority over project truth.

Memory is bounded: the injected `MEMORY.md` is capped at 6,000 characters by default, candidate storage is capped at 20 entries or 6,000 characters, and every workspace has its own files. Long-running sessions therefore do not cause unbounded prompt or RAM growth, and one project's rules do not leak into another project.

## Install locally

```sh
dsh plugin --profile web add /absolute/path/to/dsh-project-memory
```

Create a workspace file:

```md
# Project Memory

- Product: mobile-first task manager.
- Stack: React, TypeScript, SQLite.
- Decision: preserve offline support; do not add a cloud dependency without approval.
```

Restart `dsh web`, select that workspace, and start a session.
