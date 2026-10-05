# YABB to-do list

How this works: ask Claude to "add X to the todo list", or edit this file. When a job starts, it moves to **Now** with who's on it. When the change ships, Claude moves it to **Done** with the date.

## Now

- [ ] **Self-host on the A6:** steps below, in order (Drew)

## Next

1. [ ] **Backend:** a small Node + SQLite server for the API in `docs/SELF-HOSTING.md` (load, merge-patch, live updates, receipts), plus a change log that keeps every edit
2. [ ] **Separate budgets:** each login belongs to a budget (family, sister), and the super admin sees all of them
3. [ ] **Logins:** password logins, rate limiting and lockout, sessions that time out, security headers, sign-in log
4. [ ] **Super-admin page:** add people, reset passwords, disable logins, show backup status, "Deploy now" button
5. [ ] **`store.js`:** a third backend that talks to the server (the rest of the app unchanged)
6. [ ] **Test on the Mac:** mock data, two browsers editing the same month at once
7. [ ] **Run on the A6:** Docker container plus Tailscale Funnel for a public HTTPS link (no app needed)
8. [ ] **Backups:** nightly database and receipts kept 14 daily, 8 weekly, 12 monthly; encrypted copy to iCloud; weekly restore test
9. [ ] **Auto-deploy:** the A6 checks GitHub every few minutes and pulls new changes; the app footer shows the live version
10. [ ] **Git autopilot:** `/ship`, `/sync` and `/undo` commands, a pull-on-start hook, GitHub checks, auto-merge
11. [ ] **Set Dani up:** GitHub account, collaborator invite, clone, one-page guide
12. [ ] **Move the real budget:** backup from the live artifact, restore on the A6, copy the receipts across, retire the artifacts

## Ideas

- Two-factor login codes
- Rules screen as its own page, with more powers
- Unit tests for `engine.js`
- Serve Google Fonts locally (no outside calls)

## Done

- 2026-10-05: Repo set up and on GitHub; private data kept out; test data scrubbed; self-hosting page fixes (charset, `[hidden]`)
