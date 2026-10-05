#!/bin/sh
# Claude Code runs this when a session starts in this project (see .claude/settings.json).
# It brings this computer up to date with GitHub, and tells Claude where things stand.
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

if ! git fetch -q --prune origin 2>/dev/null; then
  echo "Git: couldn't reach GitHub (offline?). Working on this computer's copy; run /sync once back online."
  exit 0
fi

branch=$(git rev-parse --abbrev-ref HEAD)
dirty=$(git status --porcelain)

# a branch whose pull request has merged is finished: go back to main
if [ "$branch" != main ] && [ -z "$dirty" ]; then
  state=$(gh pr view "$branch" --json state -q .state 2>/dev/null)
  if [ "$state" = MERGED ]; then
    git switch -q main && git branch -q -D "$branch" 2>/dev/null
    echo "Git: the change on '$branch' has been merged and is live, so switched back to main."
    branch=main
  fi
fi

if [ "$branch" = main ]; then
  if [ -z "$dirty" ]; then
    git merge -q --ff-only origin/main 2>/dev/null
    echo "Git: on main, up to date with GitHub ($(git log -1 --format='%h %s'))."
  else
    git merge -q --ff-only origin/main 2>/dev/null
    echo "Git: on main with unsaved edits. Before changing anything else, move them onto a new branch (git switch -c <name>/<what>); main only accepts pull requests."
  fi
else
  behind=$(git rev-list --count HEAD..origin/main)
  pr=$(gh pr view "$branch" --json url,state -q '.state + " " + .url' 2>/dev/null)
  echo "Git: working on branch '$branch'${pr:+ (pull request $pr)}. main has $behind newer change(s) from GitHub$( [ "$behind" -gt 0 ] && echo '; run /sync before carrying on')."
  [ -n "$dirty" ] && echo "Git: there are unsaved edits on this branch."
fi

# what's being worked on, from the shared to-do list
sed -n '/^## Now/,/^## Next/p' TODO.md 2>/dev/null | grep '^- ' | sed 's/^- \[.\] /In progress: /'
exit 0
