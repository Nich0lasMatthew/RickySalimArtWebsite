# Ricky Salim Art

React (Vite) website + Express API, backed by Firebase.

```
frontend/   React site, hosted on Firebase Hosting
backend/    Express API (Render or similar). The only thing that touches the database
firestore.rules, storage.rules   lock out direct browser access
```

How the pieces fit:

- **Data**: browser → API → Firestore (Admin SDK). Firestore and Storage rules deny all browser access.
- **Images**: hosted in Firebase Storage. Each artwork has an `image_url` that pages use directly.
- **Accounts**: Firebase Auth in the browser (email/password + Google). The browser sends its ID
  token to the API, which verifies it on every request.

| Role | Who | Can |
|---|---|---|
| Visitor | not signed in | browse, send enquiries |
| Customer | any signed-in user | the above + Account page (orders later) |
| Admin | signed-in user with the `admin` claim | the above + `/admin`: set prices/status, read enquiries |

The UI hides admin links from non-admins, but the API is what enforces roles (`backend/src/middleware/auth.js`).

## One-time Firebase setup

1. **Upgrade to Blaze** (Firebase console → Usage and billing). Storage requires it. Set a budget
   alert (e.g. $5). This catalog fits within the no-cost allowance.
2. **Authentication** → Get started → Sign-in method: enable **Email/Password** and **Google**.
   Under Settings → Authorized domains, add your custom domain when you have one.
   Under **Settings → Password policy**, require at least 8 characters.
3. **Storage** → Get started (production mode; pick the same region as Firestore). Copy the bucket
   name (e.g. `rickysalimart.firebasestorage.app`) into `backend/.env` as `FIREBASE_STORAGE_BUCKET`.
4. **Web app config**: Project settings → Your apps → add a Web app → copy `apiKey`, `authDomain`,
   `projectId`, `appId` into `frontend/.env.local` (see `frontend/.env.example`).
5. **Deploy the rules**: `npx firebase-tools deploy --only firestore:rules,storage`

## Load the catalog and images

From `backend/` (needs `backend/.env`, see `env.example`):

```bash
pnpm seed                 # artworks -> Firestore (safe to re-run)
pnpm upload-images --dry  # preview
pnpm upload-images        # images -> Storage, sets image_url in Firestore and the bundled catalog
```

`upload-images` prints the portrait's URL. Put it in `frontend/.env.local` as `VITE_PORTRAIT_URL`.
Once the site shows the images from Storage, you can delete `frontend/public/artworks/`
(keep a backup of the originals somewhere safe).

## Make yourself admin

1. Run the site, click **Sign in → Create an account** (or Google).
2. `cd backend && pnpm set-admin you@example.com`
3. Sign out and back in. **Admin** appears in the menu.

## Run locally

```bash
pnpm install
pnpm dev        # site on http://localhost:5173, API on :8080 (Vite forwards /api)
pnpm test       # API tests
pnpm lint
```

## Deploy

- **API**: see `backend/README.md` (Render). Set `FIREBASE_SERVICE_ACCOUNT`,
  `FIREBASE_STORAGE_BUCKET`, `CORS_ORIGINS`.
- **Site**: put `VITE_API_URL=https://<your-api>` in `frontend/.env.production.local`, then
  `pnpm build && npx firebase-tools deploy --only hosting`.

## Next: payments (Stripe)

Planned, using the pieces above:

1. `POST /api/checkout` (API): looks up the artwork **price in Firestore** (never trust the browser's
   price), checks it's `available`, marks it `reserved`, creates a Stripe Checkout Session, and
   returns its URL.
2. `POST /api/stripe/webhook`: verifies Stripe's signature (needs the raw body, so mount it before
   `express.json`), writes `orders/{id}` with the `uid`, and marks the artwork `sold`.
   Releases the reservation if the session expires.
3. The Account page lists `orders` where `uid` matches; Admin gets an Orders tab.
