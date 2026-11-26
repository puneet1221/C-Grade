# C-Grade — Cinema Rating & Review Platform

**C-Grade** is a full-stack editorial film discovery, rating, review, and watch-diary platform built with **React 19 (Vite + Tailwind CSS v4)**, **Express.js**, and **MongoDB (Mongoose)**.

## Features

- **Hybrid Catalog & Global TMDB Search**: Searches curated local films alongside the global TMDB archive (`Cmd/Ctrl + K` or `/explore`) and automatically imports/caches film metadata, cast portraits, and YouTube trailers on first open.
- **Half-Star Reviews & Pre-Release Lock**: 0.5–5.0 star verdicts with mood tags, spoiler shields, nested discussion threads, and rating histograms. Unreleased films are automatically locked from review submission until their release date.
- **Pre-Account Email Verification & Auth**: JWT access + rotating `HttpOnly` refresh cookies, 6-digit OTP email verification before account creation, and password reset emails via Gmail SMTP.
- **Personal Watch Diary & Curated Lists**: Track Watchlist, Watched history, Rewatches, and reorderable editorial film lists.
- **Admin Moderation**: Manage catalog entries, sync/import from TMDB, and moderate reported reviews.

---

## Prerequisites

- **Node.js** `20+` and **npm**
- **MongoDB** *(optional for local dev)* — if `MONGODB_URI` is left empty, the server automatically starts a local embedded MongoDB instance persisted to `.mongodb-data/`.

---

## Quick Start (Recommended: Unified App on Port `3000`)

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd <your-repo-folder>
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env
```

### 3. Generate JWT secrets

Run the built-in cryptographic secret generator to populate 512-bit random hex keys for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` inside `.env`:

```bash
npm run generate:secrets -- --write
```

### 4. Configure your API keys & credentials in `.env`

Open `.env` and fill in the services you want to enable (never commit `.env` to Git):

```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database (leave blank for automatic embedded local MongoDB)
MONGODB_URI=

# Generated via: npm run generate:secrets -- --write
JWT_ACCESS_SECRET=<generated-hex>
JWT_REFRESH_SECRET=<generated-hex>

# External APIs & Email (see guides below)
TMDB_API_KEY=<your-tmdb-v3-api-key>
GMAIL_USER=<your-gmail-address>
GMAIL_APP_PASSWORD=<your-16-char-gmail-app-password>
```

### 5. Start the application

Development mode (Express API + Vite frontend on `http://localhost:3000`):

```bash
npm run dev
```

Production build & run:

```bash
npm run build
NODE_ENV=production npm start
```

> On first boot, the database automatically seeds starter films, curated lists, and sample critic accounts.

---

## Configuring Your Own Secrets

### 1. TMDB API Key (`TMDB_API_KEY`)

Used strictly on the server (`/api/v1/movies/*`) for global TMDB search, automatic catalog enrichment, posters/backdrops, cast portraits, and YouTube trailer lookups.

1. Sign in or create a free account at [themoviedb.org](https://www.themoviedb.org/).
2. Go to **Settings → API** (`https://www.themoviedb.org/settings/api`) and request a **Developer** API key.
3. Copy the **API Key (v3 auth)** (not the Read Access Token) and paste it into `.env`:
   ```env
   TMDB_API_KEY=your_v3_api_key_here
   ```
> If `TMDB_API_KEY` is omitted, the app still boots with the local seeded catalog, though global TMDB search and auto-import will be skipped.

### 2. Gmail SMTP (`GMAIL_USER` & `GMAIL_APP_PASSWORD`)

Used by `nodemailer` to send 6-digit signup OTP verification codes, welcome emails, and password reset links.

1. Open your Google Account security settings: [myaccount.google.com/security](https://myaccount.google.com/security).
2. Turn on **2-Step Verification** (required by Google before App Passwords can be created).
3. Open **App Passwords**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
4. Create a new app password (e.g., named `C-Grade`) and copy the 16-character code.
5. Set both variables in `.env`:
   ```env
   GMAIL_USER=you@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
> If `GMAIL_USER` or `GMAIL_APP_PASSWORD` is left blank in local development, email OTP codes and reset links are safely logged to the server terminal and `.logs/mailer-preview.log` instead of sending real emails.

### 3. MongoDB URI (`MONGODB_URI`)

- **Local Development**: Leave `MONGODB_URI=` blank to use the built-in local MongoDB instance, or set `MONGODB_URI=mongodb://127.0.0.1:27017/c-grade` if running MongoDB locally.
- **Production / Atlas**: Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas) and paste your connection string into `MONGODB_URI`.

### 4. Production Hosting Checklist

When deploying to production:
- Set `NODE_ENV=production` and `CLIENT_URL=https://your-domain.com`.
- Set `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MONGODB_URI`, `TMDB_API_KEY`, `GMAIL_USER`, and `GMAIL_APP_PASSWORD` in your hosting provider's secret/environment dashboard.
- Never copy `.env` into version control—`.gitignore` already excludes `.env*` (keeping only `.env.example`), `.mongodb-data/`, `.logs/`, `.playwright-cli/`, and `*.pem`/`*.key`.

---

## Standalone Split Mode (`c-grade/server` + `c-grade/client`)

If you prefer running the Express backend (`:5000`) and Vite React client (`:5173`) as separate processes:

```bash
# Backend
cd c-grade/server
npm install
cp .env.example .env
npm run generate:secrets -- --write
# Edit c-grade/server/.env with your MONGODB_URI, TMDB_API_KEY, and Gmail credentials
npm run seed
npm run dev
```

In a second terminal:

```bash
# Frontend
cd c-grade/client
npm install
cp .env.example .env
npm run dev
```

---

## Verification & Utility Scripts

```bash
# Type-check with TypeScript
npm run lint

# Build production frontend bundle
npm run build

# Run backend & shared pure-logic unit tests
npx --yes tsx --test c-grade/server/src/utils/ratingStats.test.ts c-grade/server/src/utils/tokenUtils.test.ts c-grade/server/src/utils/hybridSearch.test.ts
```

For full REST API endpoint documentation, see [`c-grade/README.md`](./c-grade/README.md).
