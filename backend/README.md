# Ricky Salim Art - API

Express API that sits between the website and Firestore. The browser never
talks to Firebase directly.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | `{ ok: true }` |
| GET | `/api/artworks` | Optional `?collection=Carrot Cards&status=available`. Returns `{ artworks }` in catalog order |
| GET | `/api/artworks/:id` | Returns `{ artwork }` or 404 |
| POST | `/api/enquiries` | Body `{ name, email, message, artwork? }`. Returns 201 `{ ok: true }`, 400 with `fields` on bad input, 429 after 5 per hour per IP |

The enquiry form should include a hidden `website` input. Real visitors leave
it empty; bots that fill it get a fake success and nothing is saved.

## Run locally

```bash
pnpm install
cp env.example .env      # then edit it
pnpm seed --dry          # check the catalog
pnpm seed                # write the catalog to Firestore
pnpm dev                 # http://localhost:8080
pnpm test
```

## Deploy (example: Render)

- Root directory: `backend`
- Build command: `pnpm install` (use `npm install` if your host doesn't support pnpm)
- Start command: `pnpm start`
- Environment: `FIREBASE_SERVICE_ACCOUNT` (the whole key JSON) and
  `CORS_ORIGINS` (your site origins, comma separated)

Then build the frontend with `VITE_API_URL` set to the API's address.

## Accounts and admin endpoints

Requests may carry `Authorization: Bearer <Firebase ID token>`. Invalid or missing tokens are
treated as a visitor.

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/api/me` | signed in | `{ user: { uid, email, name, role, emailVerified } }`; upserts `users/{uid}` |
| GET | `/api/admin/enquiries` | admin | newest 200 |
| PATCH | `/api/admin/enquiries/:id` | admin | `{ handled }` |
| PATCH | `/api/admin/artworks/:id` | admin | any of `price, status, title, description, prophetic_word, scripture_reference, medium, size, year, image_url` |

Scripts: `pnpm set-admin <email> [--remove]`, `pnpm upload-images [--dry]`.
Deploy env also needs `FIREBASE_STORAGE_BUCKET` (only used by upload-images today).
