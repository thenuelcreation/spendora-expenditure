# Spendora

Spendora is an expenditure management app with a React/Vite frontend and an Express API in `server`, backed by PostgreSQL and Prisma.

## Local setup

Requirements: Node.js 20.19 or newer and PostgreSQL 14 or newer.

1. Create a PostgreSQL database named `spendora`.
2. Copy `server/.env.example` to `server/.env`. Set `DATABASE_URL` to your local PostgreSQL connection string and replace `JWT_SECRET` with a private random secret of at least 32 characters. Do not commit `.env`.
3. Install and prepare both apps:

   ```powershell
   Push-Location .\server
   npm ci
   npm run db:generate
   npm run db:deploy
   Pop-Location
   Push-Location .\frontend
   npm ci
   Pop-Location
   ```

4. Start the API and frontend together from the project root:

   ```powershell
   npm run dev
   ```

Open `http://localhost:5173`. The API checks its PostgreSQL connection before listening on port 4000; if the database is unavailable, the terminal reports the connection error. Vite shows an explicit API-offline message instead of a generic failed request. The frontend uses an HttpOnly, SameSite session cookie; authentication tokens are not stored in browser local storage. Each account owns its own expenditures and categories.

If your local PostgreSQL server asks for a password, use that account's connection details in `DATABASE_URL`, for example `postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/spendora`. Create the `spendora` database first if it does not already exist. The root development command checks for the backend configuration before starting either app.

## Deployment: Render API and Vercel frontend

### Deploy the API and database to Render

1. Push this project to a GitHub repository.
2. In Render, choose **New → Blueprint**, connect the repository, and deploy the checked-in `render.yaml`. It creates a Node web service rooted at `server` and a PostgreSQL database. Render generates a private `JWT_SECRET`; Prisma migrations run when the API starts.
3. Wait for the service to deploy. Copy its public URL and check `https://YOUR-RENDER-URL/api/health`; it should return `{"status":"ok"}`.

### Deploy the frontend to Vercel

1. Import the same repository into Vercel and set **Root Directory** to `frontend`.
2. In `frontend/vercel.json`, replace `https://spendora-api.onrender.com` with the exact Render service URL if it differs.
3. Deploy the Vercel project. Vercel serves the static Vite app and proxies `/api` to Render; browser refreshes on app routes are rewritten to the SPA entry page.
4. In Render, set `CORS_ORIGIN` to the exact Vercel origin shown in the browser (for example, `https://your-project.vercel.app`, without a trailing slash). Add your custom frontend origin too if you use one, then save so Render restarts the API.

The proxy keeps the HttpOnly session cookie on the frontend's origin. Free Render web services can sleep when idle, and free PostgreSQL databases are temporary; upgrade the database before relying on it for production data. Never commit production database credentials or the session signing secret.

## Implemented backend features

- Account registration, login, current-session lookup, and logout
- Password hashing, HttpOnly session cookies, and password changes
- Per-user profile and preference persistence
- Per-user categories and sub-categories, with safe handling of in-use records
- Expenditure create, read, update, delete, search, category/date filters, and pagination
- Dashboard totals and charts based on saved records and the selected display currency
- Authenticated CSV export, compatible with Excel

Receipt file storage and email-based password recovery are not enabled; neither external file storage nor an email delivery provider is configured.
