# Running YABB on the A6

The A6 runs two containers from `docker-compose.yml`:

- **`yabb-tailscale`** joins the tailnet as `yabb` (tagged `tag:yabb`). It publishes **https://yabb.tail8c1464.ts.net** to the internet with Tailscale Funnel, so nobody needs the Tailscale app.
- **`yabb-app`** is the app. It shares the Tailscale container's network, so it has no ports open on the home network.

`tag:yabb` has no access to the rest of the tailnet. If YABB were ever broken into, it still couldn't reach the A6, FarmOS or Home Assistant.

## Where things live on the A6

| What | Where |
|---|---|
| Code | `C:\YABB`, a clone of this repo |
| Secrets | `C:\YABB\.env`: `TS_AUTHKEY` (first start only). Never in git. |
| Budget data | Docker volume `yabb_yabb-data`: `yabb.sqlite` and `blobs/` (receipts) |
| Tailscale identity | Docker volume `yabb_tailscale-state` |

## One-time Tailscale setup (admin console)

1. **DNS:** check that **HTTPS Certificates** is enabled.
2. **Access controls:** the policy needs three things:
   - `"tagOwners": {"tag:yabb": ["autogroup:admin"]}`
   - `"nodeAttrs": [{"target": ["tag:yabb"], "attr": ["funnel"]}]`
   - Rules that let people reach devices use `"src": ["autogroup:member"]`, not `"*"`. With `"*"`, tagged devices like YABB could reach everything.
3. **Keys:** generate an auth key with **Pre-approved** on, **Reusable** off and **Tags** set to `tag:yabb`. Put it in `C:\YABB\.env` as `TS_AUTHKEY=...`. It's used once, on first start. After that the identity lives in the `tailscale-state` volume, and tagged devices don't expire.

## Commands (run in `C:\YABB`)

```bat
docker compose ps                                   :: status
docker compose logs --tail 50 yabb tailscale        :: logs
docker compose up -d --build                        :: start, or rebuild after a code change
docker compose exec yabb node server/server.js add-admin <username> <Name>   :: first admin (prints a password)
docker compose exec yabb node server/server.js reset-password <username>      :: emergency
```

Updates install themselves (below). Never edit files in `C:\YABB` by hand: auto-deploy refuses to update over a hand edit.

## Updates (auto-deploy)

The scheduled task **"YABB Auto Deploy"** runs `deploy\auto-deploy.ps1` every 2 minutes. When GitHub's `main` has moved on, it:

1. fast-forwards `C:\YABB` to it (and refuses if someone edited files by hand);
2. rebuilds with `docker compose up -d --build`;
3. waits for the app to answer with the new version;
4. if it doesn't, rolls back to the previous version and skips the broken one until a newer one arrives.

`C:\YABB\deploy.log` has the history. The admin page (Updates) shows the live version and whether the last update worked.

So **to ship a change, merge it into `main` on GitHub.** It's live within about 3 minutes. To undo a change, revert it on GitHub, and that installs the same way.

Install or reinstall the task (from a prompt on the A6):

```bat
schtasks /Create /TN "YABB Auto Deploy" /SC MINUTE /MO 2 /F /TR "conhost.exe --headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\YABB\deploy\auto-deploy.ps1"
```

It runs as `drewp` while signed in, which the A6 always is (auto-login).

## Power cuts

These containers use the same recovery chain as FarmOS (`restart: unless-stopped`, Docker Desktop starts on sign-in, Windows auto-login, BIOS restore on AC power). They come back by themselves.

## Backups

Built into the server (`server/backup.js`). Nothing to schedule in Windows.

- **Every night at 2am** (or as soon as the A6 is back on, if it was off), YABB takes a consistent copy of the database. It encrypts the copy with `BACKUP_KEY` and saves it to `C:\YABB-backups`, then copies it to iCloud at `C:\Users\drewp\iCloudDrive\JARVIS\Family\YNABB`.
- **Kept:** 14 daily, 8 weekly (Sundays) and 12 monthly (the 1st) copies, deleted by count only. Each receipt is copied once to `blobs/` and never deleted.
- **Once a week**, the newest copy is opened and compared with the live database.
- **Status:** `/account` → Backups shows **OK**, **Not in iCloud**, **Failed** or **Not running**. "Not running" means nothing has worked for 36 hours (7+ days for the restore check), and it's the one to act on.

**`BACKUP_KEY` lives only in `C:\YABB\.env` and the password manager.** Without it, no backup can be opened.

### Restore after losing the A6

1. Set up a box with Docker, clone the repo to `C:\YABB`, and recreate `.env` (`BACKUP_KEY` from the password manager, and the two paths).
2. Decrypt the newest backup from iCloud: `BACKUP_KEY=... node server/backup.js decrypt <file>.yabbbak yabb.sqlite`
3. Put it in place before first start:
   - `docker compose create yabb`
   - `docker cp yabb.sqlite yabb-app:/data/yabb.sqlite`
4. Receipts: decrypt each `blobs/<id>.yabbbak` the same way into `/data/blobs/<id>` (same name, no extension).
5. `docker compose up -d`. You'll need a new Tailscale auth key, because the Tailscale identity isn't in the backup.
