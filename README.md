# AjirMed Attendance (Vinext / Cloudflare Workers)

Rebuild of the PHP attendance app. The original PHP tree stays at `../attendance`. MariaDB on Cloudways is unchanged.

## Local development

1. Copy `.dev.vars` (already gitignored) and set:
   - `SESSION_SECRET` — long random string
   - `PASSWORD_PEPPER` — same value as PHP `$obe`
   - `DATABASE_URL` — `mysql://user:password@host:port/database` (local WAMP or Cloudways public host)
2. `npm install`
3. `npm run dev`

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

`wrangler.jsonc` currently has a placeholder Hyperdrive id. Local queries fall back to `DATABASE_URL` when the Hyperdrive host is empty or `localhost`.

## GitHub and Cloudflare

This app is meant to deploy from GitHub with [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

1. Push this repo to GitHub (private is recommended).
2. In the Cloudflare dashboard go to [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Create** → **Import a repository** → GitHub.
3. Select this repository and branch `main`. The Worker name must stay `attendance-vinext` (same as `wrangler.jsonc`).
4. Set:
   - **Build command:** leave empty
   - **Deploy command:** `npm run deploy`
5. After the first connect, add runtime secrets under the Worker → **Settings** → **Variables and Secrets**:
   - `SESSION_SECRET`
   - `PASSWORD_PEPPER`
6. Replace the placeholder Hyperdrive id in `wrangler.jsonc` with a real Hyperdrive (Cloudways MariaDB), commit, and push. Cloudflare will rebuild on each push to `main`.

Do not commit `.dev.vars` or database passwords.

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
