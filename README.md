# Conference Lead Scanner

A sponsor lead capture PWA built on Next.js + Vercel Postgres. Sponsors scan attendee badge QR codes on their own phones — no app install required.

---

## Stack

- **Next.js 14** (App Router)
- **Vercel Postgres** (Neon) — attendees, sponsor codes, scan logs
- **Vercel Password Protection** — gates the `/admin` route
- **jsQR** — in-browser QR scanning via device camera
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

### 3. Provision Vercel Postgres

1. Go to your Vercel project → **Storage** tab
2. Create a new **Postgres** database
3. Click **Connect** to link it to your project
4. This automatically adds `POSTGRES_URL` and related env vars

### 4. Run the schema

In the Vercel Postgres console (Storage → your DB → Query tab), paste and run the contents of `schema.sql`.

### 5. Set environment variables

In Vercel project settings → **Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `ADMIN_SECRET` | A strong random string | Used to authenticate admin API calls |
| `NEXT_PUBLIC_ADMIN_SECRET` | Same value as above | Exposed to admin frontend (admin is already password protected) |

Generate a good secret: `openssl rand -hex 32`

### 6. Enable Vercel Password Protection (Admin)

In Vercel project settings → **Security** → **Password Protection**:
- Enable for **Preview** and/or **Production**
- Set the path to `/admin` only (if your plan supports path-level protection)
- Or enable site-wide and share the password only with your team

> **Note:** Path-level password protection requires a Pro plan. On free tier, you can protect the entire site or rely solely on the `ADMIN_SECRET` header for API security.

### 7. Deploy

```bash
npx vercel --prod
```

---

## Usage

### As Organizer (Admin)

1. Go to `https://yourapp.vercel.app/admin`
2. Enter your Vercel password protection password
3. **Import attendees**: Upload CSV with columns `name, company, email, phone`
4. **Export Badge QR data**: Downloads a CSV with `id, name, company, qr_content` — send this to your badge printer. The `qr_content` column contains the full scan URL for each attendee.
5. **Create sponsor codes**: Add a code, company name, and tier for each sponsor
6. **Monitor**: View scan counts per sponsor in the Stats tab
7. **Post-event**: Export each sponsor's lead CSV from the Sponsors tab

### As Sponsor (Rep)

1. Open `https://yourapp.vercel.app` on your phone
2. Enter your sponsor code
3. Tap **Enter Scanner** → allow camera access
4. Point camera at attendee badge QR code
5. Attendee info appears — add optional notes
6. Tap **Save Lead**
7. Tap **My Leads** to review and export your captures

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
| Admin UI | Vercel Password Protection |
| Admin APIs | `x-admin-secret` header check |
| Attendee lookup | Requires valid active sponsor code (`x-sponsor-code` header) |
| Scan logging | Requires valid active sponsor code |
| Cross-sponsor data | Impossible — each export query is scoped to a single sponsor code |
| Raw PII in QR | None — QR only contains an opaque 7-char ID |

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

## Extending

- **Email delivery**: Add a post-event cron job using Vercel Cron + Resend/SendGrid to auto-email each sponsor their CSV
- **Scan limits**: Add a `scan_limit` column to `sponsor_codes` and enforce in the scan API route
- **Tier-based data**: Return different fields based on sponsor tier (e.g., Silver gets name/company only, Gold gets email/phone)
- **Real-time dashboard**: Use Vercel's streaming or polling to show live scan counts during the event
