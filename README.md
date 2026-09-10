# AjirMed Attendance (Vinext / Cloudflare Workers)

Rebuild of the PHP attendance app. The original PHP tree stays at `../attendance`. MariaDB on Cloudways is unchanged.

## Local development

1. Copy `.dev.vars` (already gitignored) and set:
   - `SESSION_SECRET` — long random string
   - `PASSWORD_PEPPER` — same value as PHP `$obe`
   - `DATABASE_URL` — `mysql://user:password@host:port/database` (local WAMP or Cloudways public host)
2. `npm install`
3. `npm run dev`

Run `npm run check` before deploying. It type-checks the app, builds the generated
Worker entry point, and validates the final Worker bundle with Wrangler.

Open the printed local URL. Enter the facility passcode (company `id`), then QR or email/phone login.

## Hyperdrive (Cloudways MariaDB)

Hyperdrive needs the **public** Cloudways host, TLS enabled, and remote MySQL allowed.

```bash
npx wrangler login
npx wrangler hyperdrive create attendance-mariadb --connection-string="mysql://USER:PASSWORD@PUBLIC_HOST:3306/DATABASE"
```

Put the returned id in `wrangler.jsonc` under `hyperdrive[0].id`. Then:

```bash
npx wrangler types
npx wrangler secret put SESSION_SECRET
npx wrangler secret put PASSWORD_PEPPER
npm run deploy
```

Production uses Hyperdrive id `25941e25a10f4290b01888a241f26147` (`env.HYPERDRIVE`). Local `npm run dev` still uses `DATABASE_URL` in `.dev.vars` when Hyperdrive’s host is localhost.

## GitHub and Cloudflare

This app is meant to deploy from GitHub with [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

The Worker entry file is created by Vinext. If Cloudflare only runs `npx wrangler deploy`, you will get:

`The entry-point file at "vinext/server/fetch-handler" was not found.`

In the Worker → **Settings** → **Build**:

| Setting | Value |
| --- | --- |
| Build command | *(leave empty)* |
| Deploy command | `npm run deploy` |
| Non-production deploy | `npm run deploy -- --skip-build` is not needed; use `npx wrangler versions upload --config dist/server/wrangler.json` only if you first set **Build command** to `npm run build` |

Recommended: empty build command, deploy command **`npm run deploy`**. That runs Vinext’s build, then Wrangler with `dist/server/wrangler.json`.

Do **not** put the Vinext npm version in Worker settings. Vinext is installed from `package.json` during `npm install`.

Optional in **Settings → Build → Build variables**: `NODE_VERSION=22` (the repo already has `.node-version` with `22`).

Do not enable Worker **Cache** in the dashboard. This app is cookie-session HTML; caching the passcode page is what sent signed-in staff back to `/passcode`.

**Turn Hyperdrive query caching off** for this config. Hyperdrive does not invalidate cached `SELECT`s after check-in `INSERT` or check-out `UPDATE`, so Mark Attendance can still show “Check-in” after the row exists (or “Check-out” after checkout). Connection pooling still works with caching disabled:

```bash
npx wrangler hyperdrive update 25941e25a10f4290b01888a241f26147 --caching-disabled
```

In the dashboard: Hyperdrive → this config → Caching → Off. Attendance `SELECT`s in the app also include a `NOW()` comment so they are treated as uncacheable if caching is left on.

The Worker name in `wrangler.jsonc` is **`attendance`**, matching the GitHub-connected Worker.

### Secrets (Build variables vs Worker secrets)

Wrangler needs **`SESSION_SECRET`** and **`PASSWORD_PEPPER`** on the Worker at deploy time. They are **not** the same as plain environment variables unless you upload them during deploy.

For **Workers Builds**, add both under **Build** → **Build variables** (as you already did). `npm run deploy` reads them from the build environment and passes them to Wrangler with `--secrets-file`.

Alternatively, set them once under the Worker → **Settings** → **Variables and Secrets** → **Secrets** (Production). That also works for manual `wrangler deploy`.

Optional locally only: `DATABASE_URL` in `.dev.vars` (Hyperdrive handles production DB access).

Do not commit `.dev.vars` or database passwords. The Hyperdrive origin password stays in the Cloudflare Hyperdrive config, not in git.

## Routes

- `/passcode` facility gate
- `/scan` QR login
- `/signin` password login
- `/` home
- `/verification` face check-in/out
- `/staff` staff list (Admin/CEO)
- `/staff/[friendly]` face registration
- `/dashboard` reports
- `/qrcodes` staff QR cards
