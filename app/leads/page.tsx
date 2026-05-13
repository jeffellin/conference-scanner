"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Lead = {
  id: string;
  attendee_id: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function startEdit(lead: Lead) {
    setEditingId(lead.id);
    setEditNotes(lead.notes ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNotes("");
  }

  async function saveEdit(lead: Lead) {
    if (!sponsor) return;
    setSaving(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorCode: sponsor.code, attendeeId: lead.attendee_id, notes: editNotes }),
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, notes: editNotes } : l));
        setEditingId(null);
      }
    } finally {
      setSaving(false);
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
          {leads.map(lead => {
            const isEditing = editingId === lead.id;
            return (
              <div
                key={lead.id}
                className="card fade-in"
                onClick={() => !isEditing && startEdit(lead)}
                style={{ cursor: isEditing ? "default" : "pointer", transition: "border-color 0.15s",
                  borderColor: isEditing ? "var(--accent)" : "var(--border)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{lead.name}</div>
                    <div style={{ color: "var(--accent2)", fontSize: 13 }}>{lead.company}</div>
                  </div>
                  {!isEditing && (
                    <span className="text-muted text-xs" style={{ paddingTop: 2 }}>Edit</span>
                  )}
                </div>

                {(lead.email || lead.phone) && (
                  <div className="stack" style={{ gap: 4, marginBottom: 8 }}>
                    {lead.email && <div className="text-sm text-muted">{lead.email}</div>}
                    {lead.phone && <div className="text-sm text-muted">{lead.phone}</div>}
                  </div>
                )}

                {isEditing ? (
                  <div className="stack" style={{ gap: 8 }} onClick={e => e.stopPropagation()}>
                    <textarea
                      className="textarea"
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="Add notes…"
                      rows={3}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                        onClick={() => saveEdit(lead)}
                        disabled={saving}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
