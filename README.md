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

No CLI or local machine required — this can be done entirely from the Vercel and Neon web dashboards.

### 1. Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in (GitHub login is easiest).
2. Click **Import** next to this repo. If it's not listed, grant Vercel's GitHub App access to it first.
3. Leave the framework preset as **Next.js** (auto-detected).
4. Expand **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `ADMIN_SECRET` | A strong random string — this is the admin login password |

   Generate one with `openssl rand -hex 32`, or any password generator.

   > **Note:** `NEXT_PUBLIC_ADMIN_SECRET` is not used and should not be set — it would expose the secret to the browser.

5. Click **Deploy**. The build will succeed, but any page that hits the database will error until the next step is done — that's expected.

### 2. Create the Postgres database

1. Open the new project → **Storage** tab (left sidebar) → **Create Database**.
2. Choose **Neon** (Postgres) from the marketplace, give it a name, pick a region, and confirm.
3. Vercel automatically connects it to the project and adds a `POSTGRES_URL` environment variable — no copy/pasting a connection string.
4. **Redeploy the project** so it picks up the new variable: go to the **Deployments** tab, open the latest deployment, click the **⋯** menu → **Redeploy**. Env vars only take effect on deployments created after they're added, so the deploy from step 1 won't have `POSTGRES_URL` until you do this.

### 3. Run the schema

1. From the **Storage** tab, click into the database — it links out to the **Neon console**.
2. Open the **SQL Editor** there.
3. If you see the error `cannot execute ... in a read-only transaction`, the database has a read-only toggle enabled — find it in the Neon console (project/branch settings) and disable it, then continue.
4. Run the following statements **one at a time** (paste one, click Run, then move to the next). The Neon SQL Editor can't run multiple semicolon-separated statements in a single execution — pasting the whole file at once fails with `cannot insert multiple commands into a prepared statement`.

   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```
   ```sql
   CREATE TABLE attendees (
     id          VARCHAR(8) PRIMARY KEY,
     name        VARCHAR(255) NOT NULL,
     company     VARCHAR(255),
     email       VARCHAR(255),
     phone       VARCHAR(50),
     created_at  TIMESTAMPTZ DEFAULT NOW()
   );
   ```
   ```sql
   CREATE TABLE sponsor_codes (
     code        VARCHAR(50) PRIMARY KEY,
     company     VARCHAR(255) NOT NULL,
     tier        VARCHAR(50) DEFAULT 'Standard',
     active      BOOLEAN DEFAULT TRUE,
     created_at  TIMESTAMPTZ DEFAULT NOW()
   );
   ```
   ```sql
   CREATE TABLE scan_logs (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     sponsor_code  VARCHAR(50) NOT NULL REFERENCES sponsor_codes(code),
     attendee_id   VARCHAR(8) NOT NULL REFERENCES attendees(id),
     notes         TEXT,
     scanned_at    TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(sponsor_code, attendee_id)
   );
   ```
   ```sql
   CREATE INDEX idx_scan_logs_sponsor ON scan_logs(sponsor_code);
   ```
   ```sql
   CREATE INDEX idx_scan_logs_attendee ON scan_logs(attendee_id);
   ```
   ```sql
   CREATE INDEX idx_attendees_name ON attendees(name);
   ```

**Prefer the command line?** If you have `psql` installed and the database's direct (non-pooled) connection string, you can run the whole file in one shot instead of pasting statements individually:
```bash
psql "<direct-connection-string>" -f schema.sql
```

### 4. Verify

Visit `https://<your-project>.vercel.app/admin`, log in with the `ADMIN_SECRET` from step 1, and try importing a test attendee CSV to confirm everything is wired up.

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
