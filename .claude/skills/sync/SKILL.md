---
name: sync
description: Bring this computer's copy of YNABB up to date with GitHub, including the other person's changes, and sort out any overlap with work in progress. Use for /sync, "get the latest", "update", or when the session start says main has newer changes.
---

# Get the latest

1. Run `git fetch --prune origin`.
2. **On `main` with no edits:** run `git merge --ff-only origin/main`. Then say what came in, in plain words, from `git log --oneline <old>..HEAD`.
3. **On `main` with edits:** move them onto a branch first (`git switch -c <first name>/<slug>`), then carry on as below.
4. **On a branch:**
   - If the branch's pull request has already merged (`gh pr view --json state`), switch to `main`, pull, and delete the branch.
   - Otherwise, commit any unsaved edits as "Work in progress: …" so nothing can be lost, then run `git merge origin/main`.
5. **If both people changed the same lines,** work out what each side meant (use `git log -p` on each side) and combine them so both changes keep working.
   - Don't just take one side unless the other is clearly replaced.
   - Never drop code that protects money data.
   - Run `node --check` and `npm test` afterwards.
   - If one side's intent isn't clear, stop and ask in plain words, naming who made the other change (`git log --format=%an`).
6. Commit the merge and push the branch (`git push -u origin HEAD`).
7. Say in a sentence or two what came in, and whether anything needed sorting out.
