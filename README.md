# YNABB: handover package

YNABB "Yikes Not Another Bloody Budget" is a zero-based budgeting web app, built to replace YNAB for one Australian family (NAB bank accounts, two adults who share the budget). It was built with Claude Code on 2–4 October 2026 and currently runs as a claude.ai artifact. **The next goal is to self-host it.**

**Working on it?** See `docs/GETTING-STARTED.md`. The live app is at https://ynabb.tail8c1464.ts.net.

Start here, then read in this order:

1. `CLAUDE.md`: instructions for the next agent (how the owner likes to work, rules to follow).
2. `docs/PROJECT-CONTEXT.md`: who it's for, what it does, the history, what's done and what's next.
3. `docs/ARCHITECTURE.md`: the files, the data model, how the pieces fit.
4. `docs/SELF-HOSTING.md`: what ties it to claude.ai today and a plan to move it to your own server.
5. `docs/TESTING.md`: how to run and test it locally.

## What's in the folder

| Folder | What it holds |
|---|---|
| `app/` | All the app's code: plain HTML, CSS and JavaScript with no build step. `index.html` is the page; it loads `engine.js`, `store.js`, `ynab.js`, `app.js` and `guide.js`. |
| `test-data/` | Mock budgets (YNABB backup files), NAB-style test bank files with traps built in, answer keys, and the scripts that generated them (hidden files starting with `.generator`). |
| `context/full-conversation-transcript.jsonl` | The complete Claude Code conversation that built the app (about 40 MB, one JSON object per line). Search it for the reasoning behind any feature. Local only. |
| `context/claude-memory/` | The notes Claude kept between sessions. Local only. |
| `tools/` | Small helper scripts used while building. They run with macOS `osascript -l JavaScript`, and their file paths point at the old computer's temp folder, so edit the paths before using them. |
| `private-data/`, `context/` | Real financial data and the build transcript. **Kept on the owner's computer only; gitignored, never in this public repo.** |

## Quick start (no server needed)

```sh
cd app
python3 -m http.server 8765
```

Open http://localhost:8765. With no claude.ai runtime present, the app runs in **local mode**: everything saves to that browser's localStorage. It's fully usable that way for one person on one browser. Syncing between devices and people, receipts and a proper download button need a backend (see `docs/SELF-HOSTING.md`).

## Getting the real budget across

The live budget data lives in the claude.ai artifact database, not in these files. To move it:

1. Open the live app (link in `docs/PROJECT-CONTEXT.md`), go to **Settings → Download backup (.json)**.
2. In the self-hosted copy, use **Settings → Restore from backup** and choose that file.

Receipts (photos attached to transactions) are stored separately as artifact assets and are **not** in the backup. See `docs/SELF-HOSTING.md`.
