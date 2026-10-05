---
name: undo
description: Take back a change that's already live on YNABB by sending a reversing change through the normal route. Use for /undo, "undo that", "roll it back" or "put it back how it was".
---

# Undo a live change

The A6 already rolls back by itself when a new version won't start. This is for changes that start fine but are wrong.

1. **Which change?** List recent ones with `gh pr list --state merged --limit 8 --json number,title,mergedAt,author`. Default to the most recent.
   - Confirm in one plain sentence before doing anything, e.g. "Undo 'Bigger budget font' from Dani, two hours ago?", unless they named it exactly.
2. **Reverse it.**
   - Run `git fetch origin` and `git switch -c <first name>/undo-<number> origin/main`.
   - Run `git revert --no-edit <sha>`, taking the sha from `gh pr view <number> --json mergeCommit -q .mergeCommit.oid`.
   - If later changes built on it and the revert conflicts, explain which ones and ask before going further.
3. **Ship it** with `npm test` then `/ship` steps 6 to 10, titled "Undo: <original title>".
4. **Budget data isn't code.** Undoing a code change doesn't undo edits to the budget itself. For those, point to ⌘Z in the app, or say the server's change log can put a document back.
