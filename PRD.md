# Spendora Product Requirements Document

**Status:** Current product baseline  
**Last updated:** 13 October 2026

## 1. Product summary

Spendora is a web application for recording and reviewing expenditures. It lets an individual account holder keep categorized transaction records, view spending summaries, manage account preferences, and download records in a spreadsheet-compatible CSV format.

This document describes the product that exists in the repository today. It is a baseline for product and engineering decisions, not a commitment to unimplemented features.

## 2. Problem and opportunity

People who track operational spending in ad hoc notes or spreadsheets can lose consistent categorization and have difficulty reviewing totals or preparing records for reporting. Spendora provides a central, searchable record of expenditures, with dashboard summaries and export for further analysis.

## 3. Product goals

- Make it straightforward to create and maintain expenditure records.
- Keep records organized with user-managed categories and sub-categories.
- Help users understand spending by period, currency, and category.
- Let users retrieve filtered records and export them for use in spreadsheet software.
- Protect account information and keep each user's records private to that account.

## 4. Users and use cases

### Primary user

An individual who records personal, organizational, or business operating expenditures and needs a simple way to review and export them.

### Core use cases

1. Create an account and sign in securely.
2. Record an expenditure with its date, category, sub-category, amount, currency, and payment method.
3. Add context such as vendor/payee, reference, or description.
4. Find, filter, edit, or remove an existing expenditure.
5. Review spending summaries and recent activity.
6. Maintain categories and sub-categories to fit the user's bookkeeping structure.
7. Export all records or records from a supported period to CSV.
8. Update profile, password, display currency, appearance, and notification preference.

## 5. Product scope

### In scope today

- Public landing page, account registration, login, logout, and session restoration.
- Per-account expenditure and category data.
- Expenditure create, read, update, and delete.
- Search across vendor, reference, description, category, and sub-category; category and date-period filters; paginated results.
- Dashboard summaries, monthly trend, category breakdown, and recent expenditures.
- Category and sub-category management.
- CSV export for all records, this month, last three months, or this year.
- Profile and password updates; saved appearance, notification, and preferred-currency settings.
- Responsive application navigation and layouts.

### Out of scope / not currently implemented

- Receipt uploads or attachment storage.
- Email-based password recovery or email verification.
- Shared workspaces, organizations, roles, or multi-user approvals.
- Budgets, forecasts, recurring transactions, or accounting integrations.
- Bank or card syncing, payment initiation, or foreign-exchange conversion.
- Real notification delivery; the notification setting currently stores a preference only.
- Native mobile applications.

## 6. Functional requirements

### 6.1 Account and access

- A visitor can register with a name, email, and password. Email addresses are normalized and unique; passwords must be at least eight characters.
- A registered user can sign in and sign out.
- A signed-in user can view and update their name and email, and change their password after supplying the current password.
- Protected pages and API operations require a valid session. An unauthenticated visitor is directed to sign in.
- Session credentials are held in an HttpOnly cookie and are not stored in browser local storage.

### 6.2 Expenditure records

- A signed-in user can create an expenditure with date, category, sub-category, positive amount, supported currency, and payment method.
- Vendor/payee, reference, and description are optional.
- Supported currencies are NGN, USD, GBP, and EUR. Supported payment methods are Bank Transfer, Cash, Card, Mobile Money, and Other.
- Category and sub-category selections must belong to the current user and to one another.
- A user can view a paginated list, search records, and filter by category and date range/period.
- A user can update or delete their own records. A user cannot access another account's records.
- Amounts are stored as decimal values and retained in the currency recorded on the expenditure. Spendora does not convert currencies.

### 6.3 Dashboard and reporting

- The dashboard shows total recorded expenditure in the selected display currency, current-month amount and count, overall record count, and year record count.
- It shows a monthly trend and category breakdown for the selected current or previous calendar year, plus the five most recent expenditures.
- A month-over-month amount change is shown when a previous-month comparison amount is available.
- Dashboard totals include records whose stored currency matches the selected display currency; they are not converted or combined across currencies.
- The expenditure list provides filtered record counts and totals grouped by currency.

### 6.4 Categories

- Each account receives a starter set of categories and sub-categories at registration.
- A user can create and edit categories and their sub-categories, and remove categories when permitted by data relationships.
- Category and sub-category names are unique within their parent scope.
- Existing expenditures must not be silently reassigned or deleted when a category is in use.

### 6.5 Export

- A signed-in user can choose all expenditures, this month, the last three months, or this year and download a CSV file that opens in Excel-compatible spreadsheet software.
- Export includes date, category, sub-category, amount, currency, payment method, vendor, reference, and description.
- The export screen shows the number of matching records and estimated totals by currency before download.
- Exported records belong only to the signed-in user and respect the selected period.

### 6.6 Preferences

- A user can save System, Light, or Dark appearance preference; an on/off notification preference; and a preferred dashboard currency.
- The preferred currency is a display/filter preference and does not change the currency of existing records.

## 7. Key user journeys

### First use

Landing page → sign up → account is created with starter categories → dashboard → add first expenditure.

### Routine tracking

Sign in → add an expenditure → review it in the expenditure list or dashboard → edit or remove it if needed.

### Period review and reporting

Dashboard or expenditure list → select a period/category or search → inspect totals and records → open Export → choose period → download CSV.

### Account maintenance

Settings → update profile/preferences or change password → receive success or actionable validation feedback.

## 8. Data model (user-facing concepts)

- **User:** name, unique email, password credential, appearance, notification preference, preferred currency.
- **Category:** user-owned name and description, with one or more sub-categories.
- **Sub-category:** name belonging to a category.
- **Expenditure:** user-owned date, amount, currency, payment method, category, sub-category, and optional descriptive fields.

## 9. Non-functional requirements

- **Privacy:** every user-scoped read, update, delete, dashboard aggregate, and export must be isolated to the authenticated account.
- **Authentication:** passwords are hashed; session cookies are HttpOnly, SameSite=Lax, and Secure in production; sessions expire after seven days.
- **Transport and configuration:** production deployment should use HTTPS and server-side secrets. API origins are restricted through configured CORS origins.
- **Input handling:** validate user and expenditure input on the API, cap JSON request bodies, and safely encode CSV fields to reduce spreadsheet formula injection risk.
- **Reliability:** database/API errors should return clear error responses without exposing credentials or internal stack details to the client.
- **Usability:** provide clear loading, empty, validation, success, and error states; support narrow/mobile screens as well as desktop.
- **Currency integrity:** preserve original amount and currency. Aggregations must not imply exchange-rate conversion.

## 10. Success measures

The repository does not currently define product analytics or numeric targets. Suggested measures for a future instrumented release:

- Account registration completion rate.
- Percentage of new accounts that create their first expenditure.
- Weekly active accounts that add or review an expenditure.
- Expenditure form completion and validation failure rates.
- Search/filter usage and successful export downloads.
- Error rate for authentication, record save, and export operations.

Targets should be set after baseline usage data and the intended audience are agreed.

## 11. Acceptance criteria for the current baseline

- A new user can register, sign in, and see a dashboard without seeing another user's data.
- A user can create, view, edit, search/filter, and delete an expenditure with valid category/sub-category relationships.
- Dashboard and list summaries use the correct date and currency filters and do not combine unlike currencies.
- A user can create and maintain categories and sub-categories subject to existing-record constraints.
- Export returns a valid CSV for the requested period with the expected fields and only the user's records.
- Profile, password, and preference changes persist and are reflected in the account session/UI.
- Unauthorized requests cannot read or modify protected data.

## 12. Known limitations and open product decisions

- Define whether Spendora is primarily for personal finance, small-business operations, or both; current records are per-user and have no organization/workspace concept.
- Decide whether CSV export should be described in-product as “Excel export” or whether native XLSX output is required.
- Define how time zones and date boundaries should be presented to users; current reporting uses UTC date periods.
- Decide whether stored notification preferences should eventually drive actual notifications.
- Define backup, retention, account deletion, and recovery policies before a production launch.
- Confirm supported browsers, accessibility target, expected account/data scale, and service availability targets.

## 13. Product risks / dependencies

- PostgreSQL availability and correct migration deployment are required for the API to operate.
- Production deployment requires secure values for `DATABASE_URL` and `JWT_SECRET`, plus the correct frontend origin in `CORS_ORIGIN`.
- CSV is suitable for spreadsheet workflows but does not preserve workbook formatting or formulas.
- Users can enter records in multiple currencies; totals are separated by currency and should be clearly labeled to avoid misleading comparisons.
