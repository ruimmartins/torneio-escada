# AGENTS.md

## Project Overview

Padel tournament ladder/ranking management system ("Torneio de Padel - Modo Escada").
Full-stack vanilla JavaScript application with Express.js backend, MongoDB (Mongoose) for
persistence, and a single-page frontend (no framework, no bundler). Deployed to Vercel
as serverless functions. All UI text, comments, and domain variables are in Portuguese.

## Architecture

| Layer    | Technology                    | Key Files                          |
|----------|-------------------------------|------------------------------------|
| Frontend | Vanilla HTML/CSS/JS (no framework) | `index.html`, `app.js`, `style.css` |
| Backend  | Node.js + Express.js          | `api/index.js`, `server-local.js`  |
| Database | MongoDB + Mongoose (Atlas)    | Schemas inline in `api/index.js`   |
| Auth     | JWT (HTTP-only cookies) + bcrypt | `api/index.js`                   |
| Push     | Web Push API + VAPID (`web-push`) | `api/index.js`, `service-worker.js` |
| PWA      | Service Worker + Manifest     | `service-worker.js`, `manifest.webmanifest` |
| Deploy   | Vercel serverless             | `vercel.json`, `api/[...all].js`   |

All backend logic (routes, models, auth, push) lives in `api/index.js` (single file).
All frontend logic lives in `app.js` (single file, no modules). All CSS in `style.css`.
Mongoose schemas are duplicated in `api/index.js`, `seed-db.js`, and `scripts/update-player-auth.js`.

## Build / Run / Test Commands

There is **no build step** -- raw JS files are served directly.

```bash
# Install dependencies
npm install

# Start local development server (Express serves static + API)
npm start          # or: npm run dev

# Update player credentials (CLI utility)
npm run user:update -- <jogador_id> <username> <password>

# Seed database with sample data
node seed-db.js
```

### Testing

There is **no test framework** configured. No test files exist. If tests are added,
they should be run with:
```bash
npm test                    # run full suite
npx jest path/to/file.test.js   # run single test (if jest is adopted)
npx vitest run path/to/file.test.ts  # run single test (if vitest is adopted)
```

### Linting / Formatting

There is **no linter or formatter** configured (no ESLint, no Prettier).
Follow the existing code style conventions documented below.

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Required:
- `MONGODB_URI` -- MongoDB Atlas connection string
- `JWT_SECRET` -- Secret key for JWT signing

Optional:
- `PORT` -- Local server port (default: 3000)
- `NODE_ENV` -- `development` or `production`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_EMAIL` -- For push notifications
- `AUTH_COOKIE_MAX_AGE_MS` -- Cookie expiry (default: 1 year)

**Never commit `.env`, `passwords.txt`, or `player-auth-credentials.csv`.**

## Code Style Guidelines

### Language

- **Plain JavaScript** (CommonJS). No TypeScript, no ES modules.
- Target **Node.js 24.x** (see `engines` in `package.json`).
- Frontend JS runs in the browser -- no `import`/`export`, no bundler.

### Imports (Backend)

- Use `require()` for all imports (CommonJS).
- Group imports: built-in modules first, then third-party packages, then local modules.
- `dotenv` is loaded at the top of each entry point: `require('dotenv').config();`

```js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const express = require('express');
const mongoose = require('mongoose');
```

### Formatting

- **4-space indentation** throughout (JS, HTML, CSS).
- **Single quotes** for strings in JavaScript.
- **Semicolons** required at end of statements.
- **Trailing commas** are NOT used.
- Opening braces on the same line (`function foo() {`).
- Spaces inside parentheses: none. Spaces around operators: yes.
- Lines kept reasonably short but no strict max-width enforced.

### Naming Conventions

- **Variables and functions**: `camelCase` in English for generic code,
  Portuguese `camelCase` for domain-specific terms (`jogador`, `dupla`, `desafio`).
- **Domain terms** (keep in Portuguese, do NOT translate):
  - `jogador` (player), `dupla` (team/pair), `desafio` (challenge)
  - `pontos` (points), `resultado` (result), `nome` (name), `ativo` (active)
- **Mongoose models**: PascalCase (`Jogador`, `Dupla`, `Desafio`, `PushSubscription`).
- **Database collections**: snake_case plural Portuguese (`jogadores`, `duplas`, `desafios`, `push_subscriptions`).
- **API routes**: kebab-case, prefixed with `/api/` (e.g., `/api/desafios/:id/data-jogo`).
- **CSS classes**: kebab-case (`auth-loading-screen`, `push-notification-prompt`).
- **CSS variables**: kebab-case with `--` prefix (`--primary-color`, `--text-color`).
- **Constants**: `UPPER_SNAKE_CASE` for env-derived values (`JWT_SECRET`, `VAPID_PUBLIC_KEY`).
- **Unused parameters**: prefix with underscore (`_req`, `_error`).

### Functions

- Prefer `async/await` over `.then()` chains for backend code.
- Frontend code uses a mix: `async/await` for data-fetching, `.then()` for service worker registration.
- Use named `function` declarations (not arrow functions) for top-level functions.
- Arrow functions are acceptable for callbacks and inline handlers.

### Error Handling

- Backend routes: wrap async logic in `try/catch`, return appropriate HTTP status codes.
  - `400` for validation errors, `401` for auth failures, `403` for permission denied,
    `404` for not found, `409` for conflicts, `500` for internal errors.
  - Return `{ error: 'message' }` JSON on failure.
  - Return `{ status: 'ok', ...data }` JSON on success.
- Frontend: use `try/catch` around `fetch` calls. Show errors via `alert()` or `console.error()`.
- Use `console.error()` with descriptive Portuguese messages for logging errors.
- Log success/status with `console.log()` using emoji prefixes (`console.log('...')`).

### API Patterns

- Every async route handler calls `await connectDB()` at the top (lazy MongoDB connection).
- Auth-protected routes use the `requireAuth` middleware.
- Response format: `res.json({ status: 'ok', ... })` for success.
- Error format: `res.status(code).json({ error: 'message' })`.

### Frontend Patterns

- DOM manipulation via `document.getElementById()` and `document.createElement()`.
- Show/hide elements by toggling the `hidden` CSS class.
- Global state stored in module-level variables (`jogadores`, `duplas`, `desafios`, `currentUser`).
- Data fetched from `/api/*` endpoints using `fetch()`.
- Section separators: `// ==================== SECTION NAME ====================`

### CSS

- Mobile-first responsive design with CSS custom properties (`:root` variables).
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`
- `.hidden { display: none; }` pattern for visibility toggling.
- Semantic class names in kebab-case.

## Deployment

- **Vercel**: `api/[...all].js` re-exports the Express app. `vercel.json` rewrites
  `/api/*` to the catch-all serverless function.
- Static files (`index.html`, `app.js`, `style.css`, `images/`) are served by Vercel's CDN.
- MongoDB Atlas as the database (connection string in `MONGODB_URI` env var).

## File Organization

```
torneio-escada/
  api/
    index.js          # Express app: all routes, models, auth, push
    [...all].js       # Vercel catch-all (re-exports index.js)
  scripts/
    update-player-auth.js   # CLI: update player credentials
  images/                   # Static assets
  app.js              # All frontend JavaScript
  style.css           # All CSS
  index.html          # Single HTML page
  server-local.js     # Local dev server
  seed-db.js          # Database seeding script
  service-worker.js   # PWA service worker
  manifest.webmanifest # PWA manifest
  vercel.json         # Vercel config
  package.json        # Dependencies and scripts
```
