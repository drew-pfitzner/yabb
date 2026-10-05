# Instructions for the next agent

You're picking up YNABB, a zero-based budgeting web app (a YNAB replacement) built for one Australian family. Read `README.md`, then `docs/PROJECT-CONTEXT.md` and `docs/ARCHITECTURE.md`, before changing anything.

## The owner

- Not a programmer. Uses a Mac with Chrome, often with the app in half the screen and sometimes full screen.
- Banks with NAB (Australia), so dates are dd/mm and money is AUD. Shares the budget with their partner, Drew.
- Explains wants in plain, quick messages (often with typos). Work out what they mean from the app's behaviour, and don't ask unless it truly changes what you'd build.
- Wants changes made and shipped, not proposals. After each change, say in a few plain sentences what changed and how to use it.

## How they like the app

- **The goal:** import bank transactions, then a couple of clicks gives a reliably reconciled budget. No hours of scrubbing data by hand.
- **Prefer one-click fixes** that the app works out itself over lists the owner has to interpret.
- **Working tools go on the page,** not in pop-up dialogs that block the page. (Small menus and the side sheet are fine.)
- **Plain wording:** short, friendly, Australian English. The owner has pushed back on "clunky" wording several times, so read labels aloud.
- **Layout:** spread evenly, not crammed to the left. Dropdown arrows need breathing room. Check both under and over 920px wide.
- **Undo matters:** every bulk action should be one ⌘Z step (`S.newStep()` before and after).
- **Never silently delete or change money data.** An early bug almost deleted 30 real transactions. Anything automatic that removes or merges should be restricted tightly and explained.

## Working rules

- No build step: edit `app/*.js` and `app/index.html` directly. Keep the existing style (2-space indent, `const`, arrow functions, short comments that say *why*).
- Syntax-check JavaScript before shipping. On macOS without Node: `osascript -l JavaScript -e 'ObjC.import("Foundation"); var s=$.NSString.stringWithContentsOfFileEncodingError("app.js",4,null).js; new Function(s); "ok"'`. With Node, use `node --check app.js`.
- Test in a browser (`python3 -m http.server` in `app/`) before telling the owner it works, and say honestly what you did and didn't check.
- Test bank import and reconcile changes against real NAB CSVs (in `private-data/`, or ask for newer ones) and the mock data in `test-data/`.
- Money is stored as **integer cents** everywhere. Dates are ISO `YYYY-MM-DD` strings. Months are `YYYY-MM`.
- The backup format's `app: 'zero-line'` id must stay as it is, so old backups keep restoring.

## Git and the to-do list

- **This repo is public.** Never commit real financial data: no bank files, YNAB exports, backups or screenshots of the real budget. `private-data/` and `context/` are gitignored; keep it that way. Test with `test-data/` only.
- Drew and Dani both work here, and neither drives git by hand. Claude does the git work: pull before starting, one branch per job, small commits, then a pull request to `main`.
- `TODO.md` is the shared to-do list. Move a job to **Now** when starting it, and to **Done** (with the date) in the same change that finishes it.
