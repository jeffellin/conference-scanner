"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Attendee = { id: string; name: string; company: string; email: string; phone: string };
type SponsorCode = { code: string; company: string; tier: string; active: boolean; scan_count?: number };

function adminHeaders() {
  return { "Content-Type": "application/json" };
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"attendees" | "sponsors" | "stats">("attendees");
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [codes, setCodes] = useState<SponsorCode[]>([]);
  const [stats, setStats] = useState<SponsorCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // New code form
  const [newCode, setNewCode] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newTier, setNewTier] = useState("Standard");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [aRes, cRes, sRes] = await Promise.all([
        fetch("/api/admin/attendees", { headers: adminHeaders() }),
        fetch("/api/admin/codes", { headers: adminHeaders() }),
        fetch("/api/admin/stats", { headers: adminHeaders() }),
      ]);
      if (aRes.ok) setAttendees(await aRes.json());
      if (cRes.ok) setCodes(await cRes.json());
      if (sRes.ok) setStats(await sRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ csv: text }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg(`✓ Imported ${d.count} attendees`);
        loadData();
      } else {
        setMsg(`Error: ${d.error}`);
      }
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function clearAttendees() {
    if (!confirm("Delete ALL attendees and scan logs? This cannot be undone.")) return;
    await fetch("/api/admin/attendees", { method: "DELETE", headers: adminHeaders() });
    setMsg("All attendees cleared.");
    loadData();
  }

  async function addCode() {
    if (!newCode.trim() || !newCompany.trim()) return;
    const res = await fetch("/api/admin/codes", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ code: newCode, company: newCompany, tier: newTier }),
    });
    if (res.ok) {
      setNewCode(""); setNewCompany(""); setNewTier("Standard");
      setMsg("✓ Sponsor code created");
      loadData();
    } else {
      const d = await res.json();
      setMsg(`Error: ${d.error}`);
    }
  }

  async function toggleCode(code: string, active: boolean) {
    await fetch("/api/admin/codes", {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ code, active }),
    });
    loadData();
  }

  async function deleteCode(code: string) {
    if (!confirm(`Delete code ${code} and all its scan data?`)) return;
    await fetch(`/api/admin/codes?code=${code}`, { method: "DELETE", headers: adminHeaders() });
    setMsg(`Code ${code} deleted.`);
    loadData();
  }

  async function downloadSponsorCSV(code: string) {
    const res = await fetch(`/api/export/${code}`, { headers: adminHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const leads = data.leads ?? [];
    if (!leads.length) { alert("No scans for this code yet."); return; }
    const header = ["Name", "Company", "Email", "Phone", "Notes", "Scanned At"];
    const rows = leads.map((l: any) => [
      l.name, l.company, l.email, l.phone,
      (l.notes ?? "").replace(/,/g, ";"),
      new Date(l.scanned_at).toLocaleString(),
    ]);
    const csv = [header, ...rows].map((r: string[]) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-${code}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportBadgeCSV() {
    const header = ["id", "name", "company", "qr_content"];
    const baseUrl = window.location.origin;
    const rows = attendees.map(a => [
      a.id, a.name, a.company, `${baseUrl}/scan/${a.id}`,
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "badge-qr-data.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const tierClass = (tier: string) =>
    tier === "Gold" ? "badge-gold" : tier === "Silver" ? "badge-silver" : "badge-default";

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Admin Dashboard</h1>
          <div className="text-muted text-xs">Conference Lead Scanner</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            window.location.href = "/admin/login";
          }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 20px", display: "flex", gap: 0 }}>
        {(["attendees", "sponsors", "stats"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: tab === t ? "var(--accent2)" : "var(--muted)",
              fontFamily: "inherit", fontWeight: 600, fontSize: 13,
              padding: "12px 16px", textTransform: "capitalize",
              borderBottom: tab === t ? "2px solid var(--accent2)" : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="container-lg" style={{ padding: "24px 20px" }}>
        {msg && (
          <div style={{
            background: msg.startsWith("✓") ? "#14532d" : "#450a0a",
            border: `1px solid ${msg.startsWith("✓") ? "#166534" : "#7f1d1d"}`,
            color: msg.startsWith("✓") ? "#86efac" : "#fca5a5",
            borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 20,
          }}>
            {msg}
            <button onClick={() => setMsg("")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", marginLeft: 8, fontSize: 16 }}>×</button>
          </div>
        )}

        {/* ── ATTENDEES TAB ── */}
        {tab === "attendees" && (
          <div className="stack">
            <div className="card">
              <div className="row-between" style={{ marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700 }}>Attendees</h2>
                  <div className="text-muted text-sm">{attendees.length} imported</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
                    Import CSV
                  </button>
                  {attendees.length > 0 && (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={exportBadgeCSV}>
                        Badge QR Export
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={clearAttendees}>
                        Clear All
                      </button>
                    </>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSVImport} />
              <div className="text-muted text-xs" style={{ marginBottom: 12 }}>
                CSV format: <span className="mono">name, company, email, phone</span> (header row required)
              </div>

              {attendees.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["ID", "Name", "Company", "Email", "Phone", ""].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "var(--muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendees.slice(0, 100).map(a => (
                        <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 12px" }} className="mono text-muted text-xs">{a.id}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 500 }}>{a.name}</td>
                          <td style={{ padding: "8px 12px" }} className="text-muted">{a.company}</td>
                          <td style={{ padding: "8px 12px" }} className="text-muted">{a.email}</td>
                          <td style={{ padding: "8px 12px" }} className="text-muted">{a.phone}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/admin/attendees/${a.id}`)}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {attendees.length > 100 && (
                    <div className="text-muted text-xs" style={{ padding: "8px 12px" }}>
                      Showing first 100 of {attendees.length} attendees
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
                  No attendees imported yet. Upload a CSV to get started.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SPONSORS TAB ── */}
        {tab === "sponsors" && (
          <div className="stack">
            {/* Add code form */}
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Add Sponsor Code</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px auto", gap: 10, alignItems: "flex-end" }}>
                <div>
                  <label>Code</label>
                  <input className="input mono" placeholder="GOLD2026" value={newCode}
                    onChange={e => setNewCode(e.target.value.toUpperCase())} style={{ letterSpacing: 1 }} />
                </div>
                <div>
                  <label>Company</label>
                  <input className="input" placeholder="Acme Corp" value={newCompany}
                    onChange={e => setNewCompany(e.target.value)} />
                </div>
                <div>
                  <label>Tier</label>
                  <select className="input" value={newTier} onChange={e => setNewTier(e.target.value)}
                    style={{ background: "var(--surface)" }}>
                    <option>Gold</option>
                    <option>Silver</option>
                    <option>Standard</option>
                  </select>
                </div>
                <button className="btn btn-primary" onClick={addCode}
                  disabled={!newCode.trim() || !newCompany.trim()} style={{ marginTop: 0 }}>
                  Add
                </button>
              </div>
            </div>

            {/* Codes list */}
            <div className="card">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sponsor Codes ({codes.length})</h2>
              {codes.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}>No codes yet.</div>
              ) : (
                <div className="stack">
                  {codes.map(c => (
                    <div key={c.code} style={{
                      background: "var(--surface2)", borderRadius: 10, padding: "14px 16px",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span className="mono" style={{ fontWeight: 700, fontSize: 15 }}>{c.code}</span>
                          <span className={`badge ${tierClass(c.tier)}`}>{c.tier}</span>
                          <span className={`badge ${c.active ? "badge-active" : "badge-inactive"}`}>
                            {c.active ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <div className="text-muted text-sm">{c.company}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => downloadSponsorCSV(c.code)}>
                          Export
                        </button>
                        <button
                          className={`btn btn-sm ${c.active ? "btn-secondary" : "btn-success"}`}
                          onClick={() => toggleCode(c.code, !c.active)}
                        >
                          {c.active ? "Disable" : "Enable"}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCode(c.code)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STATS TAB ── */}
        {tab === "stats" && (
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Scan Activity</h2>
            {stats.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}>No scan data yet.</div>
            ) : (
              <div className="stack">
                {stats.map(s => (
                  <div key={s.code} style={{
                    background: "var(--surface2)", borderRadius: 10, padding: "14px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span className="mono" style={{ fontWeight: 700 }}>{s.code}</span>
                        <span className={`badge ${tierClass(s.tier)}`}>{s.tier}</span>
                      </div>
                      <div className="text-muted text-sm">{s.company}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent2)" }}>{s.scan_count ?? 0}</div>
                      <div className="text-muted text-xs">leads</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
