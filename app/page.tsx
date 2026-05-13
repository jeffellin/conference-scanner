"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sponsor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid sponsor code.");
      } else {
        // Store in sessionStorage — good enough for a conference day
        sessionStorage.setItem("sponsor", JSON.stringify(data));
        router.push("/scan");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>

      {/* Logo / branding */}
      <div className="fade-in" style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "linear-gradient(135deg, #6366f1, #818cf8)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px", fontSize: 28,
        }}>
          🔍
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" }}>Lead Scanner</h1>
        <p className="text-muted text-sm" style={{ marginTop: 4 }}>Enter your sponsor code to begin scanning</p>
      </div>

      {/* Code entry card */}
      <div className="card fade-in" style={{ width: "100%", maxWidth: 380, animationDelay: "0.1s" }}>
        <form onSubmit={handleSubmit} className="stack">
          <div>
            <label>Sponsor Code</label>
            <input
              className="input mono"
              placeholder="e.g. GOLD2026"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              style={{ fontSize: 18, letterSpacing: 2, textAlign: "center" }}
            />
          </div>

          {error && (
            <div style={{
              background: "#450a0a", border: "1px solid #7f1d1d",
              borderRadius: 8, padding: "10px 14px",
              color: "#fca5a5", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !code.trim()}
            style={{ width: "100%", padding: "12px", fontSize: 15 }}
          >
            {loading ? "Verifying…" : "Enter Scanner"}
          </button>
        </form>
      </div>

      <p className="text-muted text-xs" style={{ marginTop: 32, textAlign: "center" }}>
        Don't have a code? Contact the event organizer.
      </p>
    </div>
  );
}
