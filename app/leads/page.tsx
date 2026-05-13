"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  scanned_at: string;
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sponsor, setSponsor] = useState<{ code: string; company: string } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("sponsor");
    if (!raw) { router.push("/"); return; }
    const s = JSON.parse(raw);
    setSponsor(s);
    fetchLeads(s.code);
  }, [router]);

  async function fetchLeads(code: string) {
    try {
      const res = await fetch(`/api/export/${code}`, {
        headers: { "x-sponsor-code": code },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function downloadCSV() {
    if (!leads.length || !sponsor) return;
    const header = ["Name", "Company", "Email", "Phone", "Notes", "Scanned At"];
    const rows = leads.map(l => [
      l.name, l.company, l.email, l.phone,
      (l.notes ?? "").replace(/,/g, ";"),
      new Date(l.scanned_at).toLocaleString(),
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${sponsor.code}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push("/scan")}>
            ← Scanner
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>My Leads</div>
            <div className="text-muted text-xs">{leads.length} captured</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={downloadCSV} disabled={!leads.length}>
          Export CSV
        </button>
      </div>

      <div className="container" style={{ padding: "20px 16px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>Loading…</div>
        )}

        {!loading && leads.length === 0 && (
          <div style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No leads yet</div>
            <p className="text-muted text-sm">Scan your first badge to get started.</p>
          </div>
        )}

        <div className="stack">
          {leads.map(lead => (
            <div key={lead.id} className="card fade-in">
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{lead.name}</div>
                <div style={{ color: "var(--accent2)", fontSize: 13 }}>{lead.company}</div>
              </div>
              {(lead.email || lead.phone) && (
                <div className="stack" style={{ gap: 4, marginBottom: 8 }}>
                  {lead.email && <div className="text-sm text-muted">{lead.email}</div>}
                  {lead.phone && <div className="text-sm text-muted">{lead.phone}</div>}
                </div>
              )}
              {lead.notes && (
                <div style={{
                  background: "var(--surface2)", borderRadius: 6, padding: "8px 10px",
                  fontSize: 13, color: "var(--text)", marginBottom: 8,
                }}>
                  {lead.notes}
                </div>
              )}
              <div className="text-xs text-muted">
                {new Date(lead.scanned_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
