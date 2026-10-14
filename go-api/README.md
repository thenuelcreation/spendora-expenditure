# Spendora API (Go)

REST backend for Spendora, built from the Spendora PRD. Go 1.22 · `net/http` · PostgreSQL (`pgx`) · JWT in an HttpOnly cookie.

## Run it locally

Prerequisites: Go 1.22+, Docker Desktop (for Postgres).

```powershell
# 1. start Postgres
docker compose up -d

# 2. configure
copy .env.example .env      # then set JWT_SECRET to a long random value

# 3. fetch dependencies (creates go.sum) and run
go mod tidy
go run ./cmd/api
```

The API listens on `http://localhost:8080`. Migrations run automatically at startup.
Check it: `GET http://localhost:8080/api/health`.

Tests (no database needed): `go test ./...`

Try the API: open `requests/spendora.http` in VS Code with the **REST Client** extension (`humao.rest-client`).

## Configuration

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Required. Postgres connection string |
| `JWT_SECRET` | Required. 32+ chars in production |
| `CORS_ORIGIN` | Comma-separated frontend origins (default `http://localhost:3000`) |
| `APP_ENV` | `development` (default) or `production` (turns on `Secure` cookies) |
| `PORT` | Default `8080` |
| `TRUST_PROXY` | `true` only behind a trusted reverse proxy (rate limiting uses `X-Forwarded-For`) |

## Endpoints

All routes except health, signup, login and logout need the session cookie. Errors look like
`{"error":{"code":"validation_error","message":"...","fields":{"amount":"..."}}}`.
Amounts are JSON **strings** in responses (`"15000.50"`) so no precision is lost; send them as numbers or strings.
Frontend `fetch` must use `credentials: "include"`.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | DB check |
| POST | `/api/auth/signup` | `{name,email,password}` → 201 + cookie; 409 if email taken |
| POST | `/api/auth/login` | `{email,password}` → 200 + cookie; 401 on bad credentials |
| POST | `/api/auth/logout` | 204, clears cookie |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/users/me` | `{name?,email?}` |
| PATCH | `/api/users/me/preferences` | `{appearance?,notificationsEnabled?,preferredCurrency?}` |
| PATCH | `/api/users/me/password` | `{currentPassword,newPassword}` |
| GET / POST | `/api/categories` | List (sub-categories nested) / create `{name,description?,subcategories?[]}` |
| PATCH / DELETE | `/api/categories/{id}` | 409 if the category is in use |
| POST | `/api/categories/{id}/subcategories` | `{name}` |
| PATCH / DELETE | `/api/subcategories/{id}` | `{name}`; 409 if in use |
| GET / POST | `/api/expenses` | List / create |
| GET / PATCH / DELETE | `/api/expenses/{id}` | PATCH accepts partial fields |
| GET | `/api/dashboard` | `?year=current\|previous&currency=NGN` |
| GET | `/api/expenses/export` | CSV download, `?period=all\|this_month\|last_3_months\|this_year` |
| GET | `/api/expenses/export/summary` | Same `period`; count + totals per currency for the preview |

`GET /api/expenses` query params: `q`, `category_id`, `currency`, `period` **or** `from`/`to` (YYYY-MM-DD, inclusive), `page`, `page_size` (max 100).
Response: `{items, page, pageSize, totalItems, totalPages, totals:[{currency,total,count}]}`.

Expenditure body: `{date, categoryId, subcategoryId, amount, currency, paymentMethod, vendor?, reference?, description?}`
(currency: NGN/USD/GBP/EUR; paymentMethod: Bank Transfer/Cash/Card/Mobile Money/Other).

## Design notes (PRD mapping)

- **Per-user isolation:** every query is scoped by the user id from the session, never from the request. Other users' records return 404.
- **Category integrity:** the database enforces that a sub-category belongs to its category; the API checks both belong to you. Deleting an in-use category or sub-category returns 409 (`ON DELETE RESTRICT`), nothing is reassigned.
- **Currency integrity:** amounts are `NUMERIC(14,2)` and kept in their original currency. Dashboard figures are filtered to one currency; `otherCurrencies` reports records excluded by that filter. List/export totals are grouped by currency.
- **Dates:** period boundaries use UTC dates. "Last 3 months" = the current month plus the two before it.
- **CSV:** UTF-8 with BOM for Excel; text cells starting with `= + - @` are prefixed with `'` to block formula injection.
- **Security:** bcrypt hashes; JWT (HS256, 7 days) in an HttpOnly, SameSite=Lax cookie (`Secure` in production); 1 MB body cap; unknown JSON fields rejected; non-JSON bodies rejected on writes; 10 req/min/IP limit on signup and login; CORS limited to `CORS_ORIGIN`; internal errors never leak details.
- **Deployment note:** with SameSite=Lax cookies, host the frontend and API on the same site (e.g. `app.example.com` + `api.example.com`, or one domain behind a proxy).
- Sessions are stateless: changing a password does not invalidate other existing sessions until they expire.

## Layout

```
cmd/api/main.go            entrypoint, graceful shutdown
internal/config            env + .env loading
internal/database          pool + embedded SQL migrations (migrations/*.sql)
internal/api               routes, middleware, handlers
requests/spendora.http     ready-to-run API requests
```
