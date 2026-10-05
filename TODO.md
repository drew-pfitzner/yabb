# YABB to-do list

How this works: ask Claude to "add X to the todo list", or edit this file. When a job starts, it moves to **Now** with who's on it. When the change ships, Claude moves it to **Done** with the date.

## Now

- [ ] **Self-host on the A6:** steps below, in order (Drew)

## Next

1. [ ] **Admin page, part 2:** backup status and a "Deploy now" button (the people and budgets part is done)
2. [ ] **Backups (do before real data goes in):** nightly database and receipts kept 14 daily, 8 weekly, 12 monthly; encrypted copy to iCloud; weekly restore test
3. [ ] **Auto-deploy:** the A6 checks GitHub every few minutes and pulls new changes; the app footer shows the live version
4. [ ] **Git autopilot:** `/ship`, `/sync` and `/undo` commands, a pull-on-start hook, GitHub checks, auto-merge
5. [ ] **Set Dani up:** GitHub account, collaborator invite, clone, one-page guide
6. [ ] **Move the real budget:** backup from the live artifact, restore on the A6, copy the receipts across, retire the artifacts

## Ideas

- Two-factor login codes
- Rules screen as its own page, with more powers
- Unit tests for `engine.js`
- PDF receipts show as a broken image in the receipt viewer (it only shows pictures)
- Serve Google Fonts locally (no outside calls)

## Done

- 2026-10-05: **Live on the A6 at https://yabb.tail8c1464.ts.net.** Docker plus a Tailscale Funnel container tagged `tag:yabb`, which the tailnet policy blocks from every other device. Tested from the public internet: HTTPS, sign-in, live sync, and the sign-in log shows real addresses. Runbook: `deploy/README.md`.
- 2026-10-05: **Backend built and tested on the Mac.** Node + SQLite server with logins (lockouts, rate limits, sign-in log), separate budgets, an account and admin page, live sync, receipts, and a change log that keeps every edit. `store.js` talks to it. The money box no longer uses eval, so the page can run under a strict security policy. Empty budgets can now restore a backup.
- 2026-10-05: Repo set up and on GitHub; private data kept out; test data scrubbed; self-hosting page fixes (charset, `[hidden]`)
