-- Conference Lead Scanner Schema
-- Run this in your Vercel Postgres console after provisioning

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Attendees imported from CSV
CREATE TABLE attendees (
  id          VARCHAR(8) PRIMARY KEY,           -- short ID printed on badge QR
  name        VARCHAR(255) NOT NULL,
  company     VARCHAR(255),
  email       VARCHAR(255),
  phone       VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsor access codes issued by organizer
CREATE TABLE sponsor_codes (
  code        VARCHAR(50) PRIMARY KEY,
  company     VARCHAR(255) NOT NULL,
  tier        VARCHAR(50) DEFAULT 'Standard',   -- Gold, Silver, Standard, etc.
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Every scan a sponsor rep performs. Re-scanning the same attendee inserts
-- an additional row rather than updating the existing one.
CREATE TABLE scan_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_code  VARCHAR(50) NOT NULL REFERENCES sponsor_codes(code),
  attendee_id   VARCHAR(8) NOT NULL REFERENCES attendees(id),
  notes         TEXT,
  scanned_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_scan_logs_sponsor ON scan_logs(sponsor_code);
CREATE INDEX idx_scan_logs_attendee ON scan_logs(attendee_id);
CREATE INDEX idx_attendees_name ON attendees(name);
