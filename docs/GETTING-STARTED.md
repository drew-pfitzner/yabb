# Getting started on YNABB (Dani)

You won't need to learn git. Claude Code does it. This page is the one-off setup for your MacBook, plus how day-to-day changes work.

## The quick way

Open Claude Code in any folder and paste:

> Set me up to work on YNABB by following https://github.com/drew-pfitzner/ynabb/blob/main/docs/GETTING-STARTED.md (the "Setup steps" section). Stop and tell me whenever you need me to do something.

Claude will do the steps below and tell you the two or three bits that need you (signing in, clicking accept).

## Setup steps

1. **Accept the invite.** Go to https://github.com/drew-pfitzner/ynabb/invitations signed in as `daniellelpfitzner-alt`, and click **Accept**.
2. **Turn on two-factor login on GitHub.** Go to github.com → your picture → Settings → Password and authentication, and use an authenticator app. Merging a change puts it live for the whole family, so this matters.
3. **Install the tools.**
   - If `brew` isn't installed, install Homebrew from https://brew.sh first.
   - Then run `brew install git gh node`. Node must be 22.13 or newer: check with `node --version`.
4. **Sign in to GitHub from the Mac.** Run `gh auth login` (GitHub.com → HTTPS → "Login with a web browser"), then `gh auth setup-git`. In Claude Code, type it as `! gh auth login` so it runs where you can answer it.
5. **Tell git who you are.**
   - `git config --global user.name "Dani"`
   - `git config --global user.email "<the email on your GitHub account>"`
6. **Get the project.** Run `gh repo clone drew-pfitzner/ynabb ~/Documents/Claude\ Projects/YNABB`.
7. **Open it.** Run `cd ~/Documents/Claude\ Projects/YNABB && claude`. When asked whether to trust the folder, say **yes**.
8. **Check it works.** Ask Claude: *"What's in progress, and is my copy up to date?"*

Your old handover folder (with `private-data/` and the conversation transcript) stays where it is. Those never go on GitHub.

## Day to day

| You want to… | Say |
|---|---|
| Change something | Describe it, like you always have: *"make the Spent column wider"* |
| Put it live | **`/ship`** (or "ship it"). Claude tests it, sends it to GitHub, and tells you when it's live, usually 3–4 minutes. Reload the page to see it. |
| Get Drew's latest changes | **`/sync`** (Claude also checks automatically when you start) |
| Take a change back | **`/undo`**. Claude asks which one first. |
| Add something to the list | *"Add X to the to-do list"* (`TODO.md`) |

- **The live app:** https://ynabb.tail8c1464.ts.net, signed in with your YNABB login.
- **Trying things safely:** Claude can run a private copy on your Mac with mock data (`npm run dev`), so nothing touches the real budget until you ship.
- **Two of you at once is fine.** Each change lives on its own branch until it ships. If you both changed the same lines, `/sync` sorts it out, and asks you if it isn't sure what someone meant.
- **Nothing can break the live app by accident.** GitHub runs checks before anything goes live, and the A6 puts the last working version back if a new one won't start.
