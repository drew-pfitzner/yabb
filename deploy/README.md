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

Until auto-deploy exists (see `TODO.md`), an update is: `git pull`, then `docker compose up -d --build`.

## Power cuts

These containers use the same recovery chain as FarmOS (`restart: unless-stopped`, Docker Desktop starts on sign-in, Windows auto-login, BIOS restore on AC power). They come back by themselves.
