# C-Grade — Cinema Rating & Review Platform

**C-Grade** is a full-stack editorial movie rating, review, and watch-diary platform built with **React (Vite)**, **Express.js**, and **MongoDB (Mongoose)** in modern JavaScript (ES Modules).

## Folder Structure

```text
c-grade/
├── client/                 # React 19 + Vite + Tailwind CSS v4 + TanStack Query
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── api/            # Axios client with silent 401 refresh + domain APIs
│       ├── components/     # ui/, layout/, movies/, reviews/, auth/
│       ├── context/        # AuthContext (in-memory JWT + cookie session restore)
│       ├── hooks/          # useAuth, useDebounce
│       ├── pages/          # Home, Explore, MovieDetail, Lists, Feed, Profile, Settings, Admin, Auth
│       └── utils/          # constants, formatters, validators
├── server/                 # Node.js + Express.js + Mongoose ODM
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/         # db.js, env.js, mailer.js (Gmail SMTP)
│       ├── controllers/    # Thin asyncHandler HTTP handlers
│       ├── middlewares/    # auth, roleGuard, validate, rateLimiter, errorHandler
│       ├── models/         # User, PendingRegistration, Movie, Review, Comment, DiaryItem, MovieList
│       ├── routes/         # Modular /api/v1 routers
│       ├── scripts/        # generateSecrets.js (512-bit JWT secret generator)
│       ├── services/       # Business logic + server-side TMDB proxy & catalog sync
│       ├── utils/          # ApiResponse, AppError, asyncHandler, tokenUtils, ratingStats
│       ├── validators/     # Zod request schemas
│       └── seeds/          # seed.js (Hollywood, Bollywood, Tamil, Telugu, Malayalam, Korean, Japanese)
└── README.md
```

---

## Local Setup

### 1. Install Dependencies

From the standalone `/c-grade` workspaces:

```bash
cd c-grade/server && npm install
cd ../client && npm install
```

### 2. Configure Environment Variables

Copy the example files and set your values:

```bash
cp c-grade/server/.env.example c-grade/server/.env
cp c-grade/client/.env.example c-grade/client/.env
```

Key server variables (`c-grade/server/.env`):
- `MONGODB_URI`: Your MongoDB connection string (e.g., `mongodb://127.0.0.1:27017/c-grade`). If omitted in local development, the server automatically starts an embedded local MongoDB instance via `mongodb-memory-server`.
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Strong random hex strings (`npm run generate:secrets -- --write`).
- `TMDB_API_KEY` *(optional)*: Your TMDB v3 API key for automatic startup catalog enrichment, Admin live search, and one-click film import.
- `GMAIL_USER` & `GMAIL_APP_PASSWORD` *(optional)*: Gmail address and 16-character App Password for Email Verification, Welcome, and Password Reset emails. When empty, previews are logged to stdout and `.logs/mailer-preview.log`.

### 3. Gmail App Password Setup (for Forgot Password Emails)

1. Enable **2-Step Verification** on your Google Account (`myaccount.google.com/security`).
2. Visit **App Passwords** (`myaccount.google.com/apppasswords`).
3. Create a new App Password named **C-Grade Mailer**.
4. Paste your Gmail address into `GMAIL_USER` and the 16-character code into `GMAIL_APP_PASSWORD`.

### 4. Seed World Cinema Catalog & Run

```bash
cd c-grade/server
npm run seed
npm run dev
```

In a second terminal:

```bash
cd c-grade/client
npm run dev
```

### Demo Accounts (Seeded)
- **Admin:** `admin@cgrade.cinema` / `Admin123!` (`@elena_vance`)
- **Critic:** `critic@cgrade.cinema` / `Cinema123!` (`@arjun_mehta`)

---

## API Reference (`/api/v1`)

All endpoints return `{ success, message, data, meta? }`.

### Auth
- `POST /api/v1/auth/register` — Validate signup payload, store pending registration, and email 6-digit verification code (account is not created until verified)
- `POST /api/v1/auth/verify-email` — Verify 6-digit OTP, create `User` account, set `HttpOnly` refresh cookie, and send Welcome email
- `POST /api/v1/auth/resend-verification` — Resend 6-digit verification OTP (60s cooldown)
- `POST /api/v1/auth/login` — Sign in with email or `@username` (`rememberMe`: 7d vs 30d)
- `POST /api/v1/auth/logout` — Revoke stored refresh token hash and clear cookie
- `GET /api/v1/auth/session` — Quietly restore or inspect session on app boot
- `POST /api/v1/auth/refresh` — Silent refresh token rotation
- `POST /api/v1/auth/forgot-password` — Generate SHA-256 15m token and send Gmail SMTP reset email
- `POST /api/v1/auth/reset-password/:token` — Reset password and invalidate active sessions
- `GET /api/v1/auth/me` — Get current authenticated user
- `PATCH /api/v1/auth/change-password` — Change password while signed in

### Movies & Hybrid TMDB
- `GET /api/v1/movies` — Filter (`q`, `genre`, `industry`, `language`, `yearFrom`, `yearTo`, `minRating`, `sort`, `page`, `limit`)
- `GET /api/v1/movies/featured` — Hero spotlight films
- `GET /api/v1/movies/trending` — Trending films
- `GET /api/v1/movies/:slugOrId` — Film details + caller diary/review state
- `GET /api/v1/movies/search/tmdb` *(Admin)* — Server-side TMDB search proxy
- `POST /api/v1/movies/import/tmdb/:tmdbId` *(Admin)* — Import & cache TMDB film into MongoDB
- `POST /api/v1/movies/sync/tmdb` *(Admin)* — Enrich catalog artwork/cast and sync curated world-cinema titles from TMDB
- `POST /api/v1/movies`, `PATCH /api/v1/movies/:id`, `DELETE /api/v1/movies/:id` *(Admin)* — Manual CRUD

### Reviews & Comments
- `GET /api/v1/movies/:movieId/reviews` — Paginated & sorted (`helpful`, `newest`, `highest`, `lowest`)
- `POST /api/v1/movies/:movieId/reviews` — Publish half-star review + atomically recalculate movie stats
- `PATCH /api/v1/reviews/:id`, `DELETE /api/v1/reviews/:id` — Edit or delete own review
- `POST /api/v1/reviews/:id/like` — Toggle Helpful vote
- `POST /api/v1/reviews/:id/report` — Flag review for moderation
- `GET /api/v1/reviews/:reviewId/comments`, `POST /api/v1/reviews/:reviewId/comments`, `DELETE /api/v1/comments/:id` — 1-level nested comment threads

### Diary, Lists, Users & Admin
- `GET /api/v1/diary/me`, `POST /api/v1/diary/:movieId/watchlist`, `POST /api/v1/diary/:movieId/watched`
- `GET /api/v1/lists`, `GET /api/v1/lists/:slug`, `POST /api/v1/lists`, `PATCH /api/v1/lists/:id`, `DELETE /api/v1/lists/:id`, `POST /api/v1/lists/:id/like`
- `GET /api/v1/users/:username`, `PATCH /api/v1/users/me`, `POST /api/v1/users/:id/follow`, `GET /api/v1/feed`
- `GET /api/v1/admin/stats`, `GET /api/v1/admin/reports`, `PATCH /api/v1/admin/reviews/:id/moderate`
