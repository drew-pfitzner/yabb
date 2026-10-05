# YNABB to-do list

How this works: ask Claude to "add X to the todo list", or edit this file. When a job starts, it moves to **Now** with who's on it. When the change ships, Claude moves it to **Done** with the date.

## Now

- [ ] **Self-host on the A6:** steps below, in order (Drew)
- [ ] **Test-open one iCloud backup on the Mac** with the key from the password manager (`node server/backup.js decrypt`), to prove a restore works away from the A6.

## Next

1. [ ] **Git autopilot:** `/ship`, `/sync` and `/undo` commands, a pull-on-start hook, GitHub checks, auto-merge
2. [ ] **Set Dani up:** GitHub account, collaborator invite, clone, one-page guide
3. [ ] **Move the real budget:** backup from the live artifact, restore on the A6, copy the receipts across, retire the artifacts

## Ideas

- After 12 Oct 2026: delete the old Docker volumes `yabb_yabb-data` and `yabb_tailscale-state` on the A6 (kept as a safety net after the rename). Never start them again: the Tailscale one is the same device as `ynabb`.

- Two-factor login codes
- Rules screen as its own page, with more powers
- Unit tests for `engine.js`
- PDF receipts show as a broken image in the receipt viewer (it only shows pictures)
- Serve Google Fonts locally (no outside calls)

## Done

- 2026-10-05: **Renamed YNABB** ("Yikes Not Another Bloody Budget"): app, pages, docs, repo, containers, folders and the web address (https://ynabb.tail8c1464.ts.net). Kept for compatibility: the backup format id `zero-line`, old backup files (still read and rotated), and `tag:yabb` in Tailscale.
- 2026-10-05: Backup key saved in the password manager.
- 2026-10-05: **Auto-deploy.** The A6 checks GitHub `main` every 2 minutes, installs anything new, checks it's healthy, and rolls back if not. The admin page shows the live version and the last update. (A "Deploy now" button wasn't worth it at 2 minutes.)
- 2026-10-05: **Backups running.** Every night at 2am (catching up if the A6 was off): encrypted copy to `C:\YNABB-backups` and iCloud (`JARVIS/Family/YNABB`), kept 14 daily, 8 weekly, 12 monthly; receipts kept forever; weekly restore check; status and "Back up now" on the admin page. First backup taken, restore-checked and confirmed in iCloud on the Mac.
- 2026-10-05: **Live on the A6 at https://ynabb.tail8c1464.ts.net.** Docker plus a Tailscale Funnel container tagged `tag:yabb`, which the tailnet policy blocks from every other device. Tested from the public internet: HTTPS, sign-in, live sync, and the sign-in log shows real addresses. Runbook: `deploy/README.md`.
- 2026-10-05: **Backend built and tested on the Mac.** Node + SQLite server with logins (lockouts, rate limits, sign-in log), separate budgets, an account and admin page, live sync, receipts, and a change log that keeps every edit. `store.js` talks to it. The money box no longer uses eval, so the page can run under a strict security policy. Empty budgets can now restore a backup.
- 2026-10-05: Repo set up and on GitHub; private data kept out; test data scrubbed; self-hosting page fixes (charset, `[hidden]`)
