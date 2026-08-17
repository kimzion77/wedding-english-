# Woo Seonggyu ♥ Kim Jieun — Mobile Wedding Invitation (English)

English edition of the mobile wedding invitation, translated from the
[Korean original](https://github.com/kimzion77/wedding). Built with
Next.js + Tailwind + Supabase (+ Cloudflare R2 for media).

The guest-facing invitation is the static `public/invite.html`
(+ `public/assets/app.js`); the Next.js app serves `/admin` and the API
routes. The admin console remains in Korean by design.

```bash
npm install
npm run dev      # http://localhost:3000
```

See [CLAUDE.md](./CLAUDE.md) for structure, setup, and environment
variables (`.env.local` — Supabase, R2, `ADMIN_PASSWORD`).

> Note: RSVP option values sent to the API (e.g. `신랑측`, `참석`) are kept
> in Korean intentionally — the admin console and database expect them.
