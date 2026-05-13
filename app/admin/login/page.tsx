"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(searchParams.get("next") ?? "/admin");
      } else {
        setError("Invalid password.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="fade-in" style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Admin Login</h1>
        <p className="text-muted text-sm" style={{ marginTop: 4 }}>Conference Lead Scanner</p>
      </div>

      <div className="card fade-in" style={{ width: "100%", maxWidth: 360 }}>
        <form onSubmit={handleSubmit} className="stack">
          <div>
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading || !password}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
