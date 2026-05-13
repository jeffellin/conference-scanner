import { sql } from "@vercel/postgres";

export { sql };

// ── Attendees ────────────────────────────────────────────────────────────────

export async function getAttendeeById(id: string, sponsorCode?: string) {
  const { rows } = await sql`
    SELECT
      a.id, a.name, a.company, a.email, a.phone,
      sl.notes AS existing_notes,
      sl.scanned_at AS existing_scanned_at
    FROM attendees a
    LEFT JOIN scan_logs sl
      ON sl.attendee_id = a.id AND sl.sponsor_code = ${sponsorCode ?? ""}
    WHERE a.id = ${id}
  `;
  return rows[0] ?? null;
}

export async function getAllAttendees() {
  const { rows } = await sql`
    SELECT id, name, company, email, phone, created_at
    FROM attendees
    ORDER BY name ASC
  `;
  return rows;
}

export async function upsertAttendees(
  attendees: { id: string; name: string; company: string; email: string; phone: string }[]
) {
  for (const a of attendees) {
    await sql`
      INSERT INTO attendees (id, name, company, email, phone)
      VALUES (${a.id}, ${a.name}, ${a.company}, ${a.email}, ${a.phone})
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            company = EXCLUDED.company,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone
    `;
  }
}

export async function deleteAllAttendees() {
  await sql`DELETE FROM scan_logs`;
  await sql`DELETE FROM attendees`;
}

// ── Sponsor Codes ────────────────────────────────────────────────────────────

export async function getSponsorCodes() {
  const { rows } = await sql`
    SELECT code, company, tier, active, created_at
    FROM sponsor_codes
    ORDER BY created_at DESC
  `;
  return rows;
}

export async function verifySponsorCode(code: string) {
  const { rows } = await sql`
    SELECT code, company, tier
    FROM sponsor_codes
    WHERE code = ${code.toUpperCase()} AND active = TRUE
  `;
  return rows[0] ?? null;
}

export async function createSponsorCode(code: string, company: string, tier: string) {
  await sql`
    INSERT INTO sponsor_codes (code, company, tier)
    VALUES (${code.toUpperCase()}, ${company}, ${tier})
  `;
}

export async function toggleSponsorCode(code: string, active: boolean) {
  await sql`
    UPDATE sponsor_codes SET active = ${active} WHERE code = ${code}
  `;
}

export async function deleteSponsorCode(code: string) {
  await sql`DELETE FROM scan_logs WHERE sponsor_code = ${code}`;
  await sql`DELETE FROM sponsor_codes WHERE code = ${code}`;
}

// ── Scan Logs ────────────────────────────────────────────────────────────────

export async function logScan(sponsorCode: string, attendeeId: string, notes: string) {
  await sql`
    INSERT INTO scan_logs (sponsor_code, attendee_id, notes)
    VALUES (${sponsorCode}, ${attendeeId}, ${notes})
    ON CONFLICT (sponsor_code, attendee_id)
    DO UPDATE SET notes = EXCLUDED.notes, scanned_at = NOW()
  `;
}

export async function getScansForCode(sponsorCode: string) {
  const { rows } = await sql`
    SELECT
      sl.id,
      sl.notes,
      sl.scanned_at,
      a.name,
      a.company,
      a.email,
      a.phone
    FROM scan_logs sl
    JOIN attendees a ON a.id = sl.attendee_id
    WHERE sl.sponsor_code = ${sponsorCode}
    ORDER BY sl.scanned_at DESC
  `;
  return rows;
}

export async function getScanStats() {
  const { rows } = await sql`
    SELECT
      sc.code,
      sc.company,
      sc.tier,
      COUNT(sl.id)::int AS scan_count
    FROM sponsor_codes sc
    LEFT JOIN scan_logs sl ON sl.sponsor_code = sc.code
    GROUP BY sc.code, sc.company, sc.tier
    ORDER BY scan_count DESC
  `;
  return rows;
}

// ── ID Generation ────────────────────────────────────────────────────────────

export function generateShortId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1 to avoid confusion
  let id = "";
  for (let i = 0; i < 7; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
