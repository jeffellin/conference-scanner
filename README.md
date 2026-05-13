# Conference Lead Scanner

A sponsor lead capture PWA built on Next.js + Neon Postgres. Sponsors scan attendee badge QR codes on their own phones — no app install required.

---

## Stack

- **Next.js 14** (App Router)
- **Neon Postgres** — attendees, sponsor codes, scan logs
- **Next.js Middleware** — cookie-based password protection for `/admin`
- **BarcodeDetector API** (iOS 17+ / Chrome) with **jsQR** fallback — in-browser QR scanning
- **PWA** — installable on iOS/Android, works offline for previously loaded pages

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd conference-scanner
npm install
```

### 2. Create Vercel project

```bash
npx vercel link
```

### 3. Provision Neon Postgres

1. Go to [neon.tech](https://neon.tech) and create a free project
2. Copy the **pooled connection string**
3. In Vercel project settings → **Environment Variables**, add `POSTGRES_URL` with that value

Alternatively, use the Vercel Marketplace to connect Neon — it will add the env var automatically.

### 4. Run the schema

In the Neon SQL Editor, run `schema.sql` in two batches:

**First:**
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

**Then:**
```sql
CREATE TABLE attendees ( ... );
CREATE TABLE sponsor_codes ( ... );
CREATE TABLE scan_logs ( ... );
-- (see schema.sql for full contents)
```

### 5. Set environment variables

In Vercel project settings → **Environment Variables**:

| Variable | Value | Notes |
|---|---|---|
| `POSTGRES_URL` | Neon pooled connection string | Added automatically if using Marketplace |
| `ADMIN_SECRET` | A strong random string | Admin login password |

Generate a good secret: `openssl rand -hex 32`

> **Note:** `NEXT_PUBLIC_ADMIN_SECRET` is no longer used and should not be set.

### 6. Deploy

```bash
npx vercel --prod
```

---

## Usage

### As Organizer (Admin)

1. Go to `https://yourapp.vercel.app/admin` — you will be redirected to `/admin/login`
2. Enter your `ADMIN_SECRET` password
3. **Import attendees**: Upload CSV with columns `name, company, email, phone`
4. **Export Badge QR data**: Downloads a CSV with `id, name, company, qr_content` — send this to your badge printer. The `qr_content` column contains the full scan URL for each attendee.
5. **Create sponsor codes**: Add a code, company name, and tier for each sponsor
6. **Monitor**: View scan counts per sponsor in the Stats tab
7. **Post-event**: Export each sponsor's lead CSV from the Sponsors tab

### As Sponsor (Rep)

1. Open `https://yourapp.vercel.app` on your phone
2. Enter your sponsor code
3. Tap **Enter Scanner** → allow camera access
4. Point camera at attendee badge QR code — detection is automatic, no tap needed
5. Attendee info appears — add optional notes
6. Tap **Save Lead**
7. Tap **My Leads** to review, edit notes, and export your captures

---

## CSV Format

### Attendee Import

```csv
name,company,email,phone
Jane Smith,Acme Corp,jane@acme.com,555-0101
John Doe,Beta Ltd,john@beta.io,555-0102
```

- Header row is required
- `name` is the only required field
- Column names are flexible: `name` or `full name`, `company` or `organization`, `phone` or `mobile`

### Badge QR Export

After import, export the badge data CSV:

```csv
id,name,company,qr_content
A3F9K2M,Jane Smith,Acme Corp,https://yourapp.vercel.app/scan/A3F9K2M
```

Give this to your badge printer. They encode `qr_content` as a QR code on each badge.

---

## ID Format

Attendee IDs are 7-character alphanumeric codes using an unambiguous character set (no I, O, 0, 1). Example: `A3F9K2M`.

These are safe to also print as human-readable text under the QR code on badges, allowing manual entry as a fallback.

---

## Security Model

| Layer | Protection |
|---|---|
| Admin UI | Cookie-based login — password checked against `ADMIN_SECRET` server-side |
| Admin APIs | Next.js middleware verifies signed `httpOnly` cookie before any `/api/admin/*` request |
| Attendee lookup | Requires valid active sponsor code (`x-sponsor-code` header) |
| Scan logging | Requires valid active sponsor code |
| Cross-sponsor data | Impossible — each export query is scoped to a single sponsor code |
| Raw PII in QR | None — QR only contains an opaque 7-char ID |

The admin session cookie is `httpOnly`, `sameSite: lax`, and `secure` in production. The `ADMIN_SECRET` is never exposed to the browser.

---

## Local Development

```bash
# Pull env vars from Vercel
npx vercel env pull .env.local

# Run dev server
npm run dev
```

The app will be at `http://localhost:3000`.

---

## Duplicate Scan Handling

If a sponsor scans an attendee they have already captured:
- The card shows an **"Already scanned"** badge
- The notes field is pre-populated with their previous notes
- Saving updates the existing record's notes

Sponsors can also tap any lead in **My Leads** to edit notes inline.

---

## Extending

- **Email delivery**: Add a post-event cron job using Vercel Cron + Resend/SendGrid to auto-email each sponsor their CSV
- **Scan limits**: Add a `scan_limit` column to `sponsor_codes` and enforce in the scan API route
- **Tier-based data**: Return different fields based on sponsor tier (e.g., Silver gets name/company only, Gold gets email/phone)
- **Real-time dashboard**: Use Vercel's streaming or polling to show live scan counts during the event
