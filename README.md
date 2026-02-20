# uDown 🌙

> The intimacy app for two. Once a day, we ask the question. Both say yes? We let you know.

A fully free, production-ready PWA built with Next.js, Supabase, and Web Push.

---

## Stack

| Layer | Service | Cost |
|---|---|---|
| Frontend + hosting | Vercel | Free |
| Database + Auth | Supabase | Free |
| Push notifications | Web Push API | Free |
| Cron (daily nudge) | Vercel Cron | Free |

---

## How it Works

1. Couples sign up and link accounts via a 6-character invite code
2. Every evening at 8pm, a push notification goes out to all users: *"u down tonight?"*
3. Each partner responds privately (yes/no) — the other person never knows
4. If **both** say yes → both receive: *"✦ You're both down. Tonight's the night."*
5. If either says no → nothing happens, no awkwardness

---

## Deployment Guide

### Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to **SQL Editor** and paste the contents of `supabase-schema.sql`, then run it
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep this private!)

### Step 2 — Generate VAPID Keys

VAPID keys are required for Web Push to work. Run this once:

```bash
npx web-push generate-vapid-keys
```

Save the public and private keys — you'll need them in Step 3.

### Step 3 — Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repo
3. Add these **Environment Variables** in Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL         → your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    → your Supabase anon key
SUPABASE_SERVICE_ROLE_KEY        → your Supabase service role key
NEXT_PUBLIC_VAPID_PUBLIC_KEY     → your VAPID public key
VAPID_PRIVATE_KEY                → your VAPID private key
VAPID_EMAIL                      → any email (e.g. hello@udown.app)
CRON_SECRET                      → any random string (run: openssl rand -hex 32)
```

4. Deploy. Vercel will automatically:
   - Build the Next.js app
   - Set up the cron job to fire at 8pm UTC daily (`vercel.json`)

### Step 4 — App Icons

Replace these placeholder files in `/public/` with real icons:
- `icon-192.png` — 192×192px PNG
- `icon-512.png` — 512×512px PNG

Use [favicon.io](https://favicon.io) or design your own. The app uses these for PWA install and push notification badges.

### Step 5 — PWA Install

Once deployed, users on iOS can:
- Open the site in Safari
- Tap Share → Add to Home Screen

On Android:
- Open in Chrome
- Banner will appear, or tap the install icon in the address bar

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env template
cp .env.example .env.local
# Fill in your values in .env.local

# Run dev server
npm run dev
```

---

## Cron Job

The daily nudge is sent by `GET /api/cron`, secured with `CRON_SECRET`.

Vercel runs this at `0 20 * * *` (8pm UTC). Adjust in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 20 * * *"
    }
  ]
}
```

To test it manually:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://yourdomain.vercel.app/api/cron
```

---

## Privacy by Design

- Partners **never** see each other's responses unless there's a mutual yes
- Responses are stored per-user, not shared
- No data sold, no ads, no tracking
- All data lives in your own Supabase project

---

## Project Structure

```
src/
  app/
    page.tsx          ← Full single-page app (landing, auth, home)
    page.module.css   ← All styles
    globals.css       ← Global CSS variables and utilities
    layout.tsx        ← Root layout + PWA metadata
    api/
      signup/         ← User registration
      subscribe/      ← Save push subscription
      couple/         ← Invite code generation + linking
      respond/        ← Record yes/no + trigger match
      cron/           ← Daily push notification sender
  lib/
    supabase.ts       ← Supabase client
    push.ts           ← Push subscription helper
public/
  sw.js               ← Service worker (handles push + offline)
  manifest.json       ← PWA manifest
supabase-schema.sql   ← Database schema (run in Supabase)
vercel.json           ← Cron schedule config
```
