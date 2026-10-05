---
name: ship
description: Ship the current change to YNABB. Saves it on a branch, runs the checks, opens a pull request that merges itself once GitHub's checks pass, then confirms it's live on the A6. Use for /ship, "ship it", "send it", "put it live" or "publish".
---

# Ship it

Drew and Dani don't use git themselves. Do every step, and report in plain words ("saved", "sent to GitHub", "live"), not git terms.

1. **Look first.** Run `git status`, check the branch, read `git diff`. If nothing has changed, say there's nothing to ship.
2. **Be on a branch.** If on `main`, make one: `git switch -c <first name>/<two to four word slug>`. The first name comes from `git config user.name`, lowercased. GitHub refuses changes made straight to `main`.
3. **Bring in the latest.** Run `git fetch origin` and `git merge origin/main`. Resolve any conflicts as `/sync` describes.
4. **Check it works.**
   - Run `node --check` on each changed `.js` file, then `npm test` and `sh scripts/check-private.sh`.
   - For changes to the app itself, follow CLAUDE.md: run it (`npm run dev`) and try the change in a browser, if that hasn't been done yet.
   - Fix anything that fails before going on.
5. **To-do list.** In `TODO.md`, move the job to **Done** with today's date and one plain line. Add it if it wasn't listed.
6. **Save.** Stage only this change's files by name. Never `git add -A` blindly, and never `private-data/`, `context/` or `.env`. Write one commit whose first line says what changed for the people using the app.
7. **Send.**
   - Run `git push -u origin HEAD`.
   - Run `gh pr create`. The title is a plain summary. The body covers what changed, how to use it, and what was tested.
   - Run `gh pr merge --auto --squash --delete-branch`.
8. **Wait for the checks.** Run `gh pr checks --watch`; it takes a few minutes. If a check fails, read `gh run view --log-failed`, fix, commit and push. Auto-merge stays on.
9. **Wait for it to go live.**
   - Once merged, run `git switch main`, `git pull --ff-only`, and `git branch -D <branch>`.
   - The A6 installs `main` within about 2 minutes. Wait until `curl -s https://ynabb.tail8c1464.ts.net/api/health` shows `git rev-parse --short HEAD`, up to 5 minutes.
   - If it doesn't appear, the A6 probably rolled back. Say so and offer to look into why.
10. **Tell them** in two or three plain sentences: what changed, how to use it, and that it's live (reload the page to see it).

If the change is half-done or waiting on the other person, don't ship it. Commit and push it to its branch so it's safe on GitHub, and say that it's saved but not live.
