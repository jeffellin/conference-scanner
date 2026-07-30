"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

type Attendee = { id: string; name: string; company: string; email: string; phone: string };

export default function EditAttendeePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/attendees/${id}`)
      .then(async res => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Not found.");
        return res.json();
      })
      .then(setAttendee)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!attendee) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/attendees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attendee),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed.");
      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete attendee ${attendee?.name}? This also removes any scan records for them.`)) return;
    await fetch(`/api/admin/attendees/${id}`, { method: "DELETE" });
    router.push("/admin");
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }} className="text-muted">Loading…</div>;
  }

  if (!attendee) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>{error || "Attendee not found."}</div>
        <button className="btn btn-secondary" onClick={() => router.push("/admin")}>Back to Admin</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: 24 }}>
      <div className="fade-in" style={{ textAlign: "center", margin: "32px 0" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Edit Attendee</h1>
        <p className="text-muted text-sm mono" style={{ marginTop: 4 }}>{attendee.id}</p>
      </div>

      <div className="card fade-in" style={{ width: "100%", maxWidth: 420 }}>
        <form onSubmit={handleSave} className="stack">
          <div>
            <label>Name</label>
            <input
              className="input"
              value={attendee.name}
              onChange={e => setAttendee({ ...attendee, name: e.target.value })}
              autoFocus
              required
            />
          </div>
          <div>
            <label>Company</label>
            <input
              className="input"
              value={attendee.company ?? ""}
              onChange={e => setAttendee({ ...attendee, company: e.target.value })}
            />
          </div>
          <div>
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={attendee.email ?? ""}
              onChange={e => setAttendee({ ...attendee, email: e.target.value })}
            />
          </div>
          <div>
            <label>Phone</label>
            <input
              className="input"
              value={attendee.phone ?? ""}
              onChange={e => setAttendee({ ...attendee, phone: e.target.value })}
            />
          </div>

          {error && (
            <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving || !attendee.name.trim()}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => router.push("/admin")}>
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div className="card fade-in" style={{ width: "100%", maxWidth: 420, marginTop: 16, borderColor: "var(--danger)" }}>
        <div className="row-between">
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Delete this attendee</div>
            <div className="text-muted text-xs">Also removes any scan records for them. Cannot be undone.</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}
