# Spendora

Spendora is an expenditure management app with a Next.js frontend and the Go REST API in `go-api`, backed by PostgreSQL.

## Local setup

Requirements: Node.js 20.9 or newer, Go 1.22 or newer, and Docker Desktop (or a reachable PostgreSQL database).

1. In `go-api`, create a local environment file and set a private session secret:

   ```powershell
   Push-Location .\go-api
   Copy-Item .env.example .env
   # Edit .env and replace JWT_SECRET with a random secret of at least 32 characters.
   docker compose up -d
   go mod tidy
   go run ./cmd/api
   ```

   Leave this terminal open. The API runs on `http://localhost:8080` and applies its database migrations at startup. If you already have PostgreSQL, set `DATABASE_URL` in `go-api/.env` to that database instead of starting the bundled database.

2. In a second terminal, start the frontend:

   ```powershell
   Push-Location .\frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`. Next.js proxies `/api` to `http://localhost:8080` by default, so the browser uses the API through the frontend's same origin.

The frontend uses an HttpOnly, SameSite session cookie; authentication tokens are not stored in browser local storage. Each account owns its own expenditures and categories. The previous Express/Prisma API source remains in `server`, but the frontend is now connected to the Go API. The Go API uses its own PostgreSQL tables; existing Express/Prisma records are not automatically migrated or shared.

## Deployment configuration

### Deploy the Go API and database to Render

1. Push this project to a GitHub repository if it is not there already. In Render, choose **New → Blueprint**, connect that repository, and deploy the checked-in [`render.yaml`](./render.yaml). It creates the Go web service and PostgreSQL database; Render generates `JWT_SECRET` for you.
2. After the first deploy finishes, open the `spendora-api` service in Render and copy its public URL, for example `https://spendora-api.onrender.com`. Check `https://YOUR-RENDER-URL/api/health`; it should return `{"status":"ok"}`.
3. In Vercel, import the same GitHub repository. Set the project **Root Directory** to `frontend` and add `SPENDORA_API_URL` with the Render URL as its value (no trailing slash). Add it for the environments you deploy, then redeploy so Next.js rebuilds its `/api` proxy to Render.
4. Leave `NEXT_PUBLIC_API_URL` unset in Vercel. The browser should call the Vercel `/api` path, which proxies requests to Render; this keeps the HttpOnly session cookie on the frontend's origin. Go API migrations run automatically when the Render service starts.

The Render Blueprint uses free plans to make initial setup cost-free. Free Render services can sleep when idle, and free PostgreSQL databases are temporary; upgrade the database to a persistent paid plan before relying on it for production data. Render and Vercel both need access to the GitHub repository to deploy updates.

For a direct browser-to-API deployment instead of the Vercel proxy, configure `CORS_ORIGIN` in Render with the exact Vercel origin(s), and use a custom domain setup that keeps the frontend and API on the same site so session cookies work. `CORS_ORIGIN` accepts comma-separated exact origins.

Do not put production database credentials or the session signing secret in this repository. A deployed application also needs a reachable PostgreSQL instance.

## Implemented backend features

- Account registration, login, current-session lookup, and logout
- Password hashing, HttpOnly session cookies, and password changes
- Per-user profile and preference persistence
- Per-user categories and sub-categories, with safe handling of in-use records
- Expenditure create, read, update, delete, search, category/date filters, and pagination
- Dashboard totals and charts based on saved records and the selected display currency
- Authenticated CSV export, compatible with Excel

Receipt file storage and email-based password recovery are not enabled; neither external file storage nor an email delivery provider is configured.
