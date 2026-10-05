#!/bin/sh
# Fails if anything private is about to go into this public repo: bank files, backups, databases,
# secrets. Run by the GitHub checks on every pull request; safe to run by hand too.
cd "$(dirname "$0")/.." || exit 1
bad=0
files=$(git ls-files)

# files that must never be committed (test-data/ holds the mock bank files and is allowed)
for f in $(printf '%s\n' "$files" | grep -E '^(private-data|context)/|\.(csv|zip|sqlite|sqlite-wal|sqlite-shm|db|ynabb|yabbbak|tmp)$|(^|/)\.env$|(^|/)deploy\.log$' | grep -v '^test-data/'); do
  echo "Private file in the repo: $f"; bad=1
done

# secrets written inside files
if printf '%s\n' "$files" | xargs grep -l -E 'tskey-(auth|client|api)-[A-Za-z0-9]{8,}|BACKUP_KEY=[A-Za-z0-9+/]{40,}={0,2}|-----BEGIN [A-Z ]*PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}' 2>/dev/null; then
  echo "^ these files look like they contain a password, key or token."; bad=1
fi

# a real NAB export has this header row; the mock test files don't
if printf '%s\n' "$files" | grep -v '^test-data/' | xargs grep -l 'Date,Amount,Account Number' 2>/dev/null; then
  echo "^ these files look like a real NAB export."; bad=1
fi

[ $bad = 0 ] && echo "No private data found."
exit $bad
