"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Sponsor = { code: string; company: string; tier: string };
type Attendee = { id: string; name: string; company: string; email: string; phone: string };
type ScanResult = { attendee: Attendee; saved: boolean };

export default function ScanPage() {
  const router = useRouter();
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [scanCount, setScanCount] = useState(0);
  const [error, setError] = useState("");

  const scannerRef = useRef<any>(null);
  const sponsorRef = useRef<Sponsor | null>(null);
  const lastScannedRef = useRef<string>("");
  const [debugLog, setDebugLog] = useState<string[]>([]);

  function dbg(msg: string) {
    setDebugLog(prev => [...prev.slice(-6), `${new Date().toISOString().slice(11,19)} ${msg}`]);
  }

  useEffect(() => {
    const raw = sessionStorage.getItem("sponsor");
    if (!raw) { router.push("/"); return; }
    const s = JSON.parse(raw);
    setSponsor(s);
    sponsorRef.current = s;
  }, [router]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current.clear();
    }
    scannerRef.current = null;
  }, []);

  useEffect(() => {
    if (!scanning) return;

    let cancelled = false;

    dbg("importing html5-qrcode…");
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      dbg("creating scanner");
      const scanner = new Html5Qrcode("qr-scanner-container");
      scannerRef.current = scanner;

      dbg("starting camera…");
      scanner.start(
        { facingMode: "environment" },
        { fps: 10 },
        (decodedText: string) => {
          dbg(`QR detected: ${decodedText.slice(0, 30)}`);
          if (decodedText !== lastScannedRef.current) {
            lastScannedRef.current = decodedText;
            handleQRData(decodedText);
          }
        },
        (err: any) => { dbg(`scan err: ${String(err).slice(0, 40)}`); }
      ).then(() => {
        dbg("camera started OK");
      }).catch((err: any) => {
        dbg(`start failed: ${String(err).slice(0, 50)}`);
        if (!cancelled) setError("Camera access denied. Please allow camera permissions and reload.");
      });
    }).catch((err: any) => {
      dbg(`import failed: ${String(err).slice(0, 50)}`);
    });

    return () => {
      cancelled = true;
      stopScanner();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  async function handleQRData(raw: string) {
    const id = raw.includes("/") ? raw.split("/").pop()! : raw;
    const currentSponsor = sponsorRef.current;
    if (!id || !currentSponsor) return;

    await stopScanner();
    setScanning(false);
    setResult(null);
    setNotes("");
    setSaveMsg("");

    try {
      const res = await fetch(`/api/attendee/${id}`, {
        headers: { "x-sponsor-code": currentSponsor.code },
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Attendee not found.");
        return;
      }
      const attendee: Attendee = await res.json();
      setResult({ attendee, saved: false });
    } catch {
      setError("Failed to look up attendee. Try again.");
    }
  }

  async function saveLead() {
    if (!result || !sponsor) return;
    setSaving(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorCode: sponsor.code, attendeeId: result.attendee.id, notes }),
      });
      if (res.ok) {
        setResult(r => r ? { ...r, saved: true } : null);
        setScanCount(c => c + 1);
        setSaveMsg("Lead saved ✓");
      } else {
        setSaveMsg("Save failed — try again.");
      }
    } catch {
      setSaveMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  function resetScanner() {
    setResult(null);
    setNotes("");
    setSaveMsg("");
    setError("");
    lastScannedRef.current = "";
    setScanning(true);
  }

  if (!sponsor) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{sponsor.company}</div>
          <div className="text-muted text-xs mono">{sponsor.code}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent2)" }}>{scanCount}</div>
            <div className="text-muted text-xs">scans</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push("/leads")}>
            My Leads
          </button>
        </div>
      </div>

      <div className="container" style={{ flex: 1, padding: "20px 16px" }}>

        {/* Scanner view */}
        {scanning && (
          <div className="fade-in stack">
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000", aspectRatio: "4/3" }}>
              <div id="qr-scanner-container" style={{ width: "100%", height: "100%" }} />
              {/* Corner brackets */}
              {(["tl","tr","bl","br"] as const).map(pos => (
                <div key={pos} style={{
                  position: "absolute", width: 32, height: 32,
                  borderColor: "var(--accent2)", borderStyle: "solid", borderWidth: 0, zIndex: 2,
                  ...(pos === "tl" ? { top: 24, left: 24, borderTopWidth: 3, borderLeftWidth: 3 } : {}),
                  ...(pos === "tr" ? { top: 24, right: 24, borderTopWidth: 3, borderRightWidth: 3 } : {}),
                  ...(pos === "bl" ? { bottom: 24, left: 24, borderBottomWidth: 3, borderLeftWidth: 3 } : {}),
                  ...(pos === "br" ? { bottom: 24, right: 24, borderBottomWidth: 3, borderRightWidth: 3 } : {}),
                }} />
              ))}
              {/* Animated scan line */}
              <div style={{
                position: "absolute", left: "10%", right: "10%", height: 2, zIndex: 2,
                background: "linear-gradient(90deg, transparent, var(--accent2), transparent)",
                animation: "scanLine 2s ease-in-out infinite",
                boxShadow: "0 0 8px var(--accent2)",
              }} />
            </div>
            <p className="text-muted text-sm" style={{ textAlign: "center" }}>
              Point camera at attendee badge QR code
            </p>
            <p className="text-muted text-xs" style={{ textAlign: "center" }}>v4 — html5-qrcode</p>
            <div style={{
              background: "#0a0a1a", border: "1px solid var(--border2)",
              borderRadius: 8, padding: "8px 10px", fontFamily: "monospace", fontSize: 11, color: "#86efac",
            }}>
              {debugLog.length === 0 ? "waiting…" : debugLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            {error && (
              <div style={{ background: "#450a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 13 }}>
                {error}
                <button className="btn btn-secondary btn-sm" onClick={() => setError("")} style={{ marginLeft: 8 }}>Dismiss</button>
              </div>
            )}
          </div>
        )}

        {/* Attendee result */}
        {result && !scanning && (
          <div className="fade-in stack">
            <div className="card" style={{ borderColor: result.saved ? "var(--success)" : "var(--border)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{result.attendee.name}</h2>
                  <div style={{ color: "var(--accent2)", fontWeight: 500, marginTop: 2 }}>{result.attendee.company}</div>
                </div>
                {result.saved && <span className="badge badge-active">Saved</span>}
              </div>
              <div className="divider" style={{ margin: "12px 0" }} />
              <div className="stack" style={{ gap: 8 }}>
                {result.attendee.email && (
                  <div className="row">
                    <span style={{ fontSize: 16 }}>✉️</span>
                    <a href={`mailto:${result.attendee.email}`} style={{ color: "var(--text)", textDecoration: "none", fontSize: 14 }}>
                      {result.attendee.email}
                    </a>
                  </div>
                )}
                {result.attendee.phone && (
                  <div className="row">
                    <span style={{ fontSize: 16 }}>📞</span>
                    <a href={`tel:${result.attendee.phone}`} style={{ color: "var(--text)", textDecoration: "none", fontSize: 14 }}>
                      {result.attendee.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label>Notes</label>
              <textarea
                className="textarea"
                placeholder="Add notes about this lead…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {saveMsg && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, fontSize: 13,
                background: saveMsg.includes("✓") ? "#14532d" : "#450a0a",
                color: saveMsg.includes("✓") ? "#86efac" : "#fca5a5",
                border: `1px solid ${saveMsg.includes("✓") ? "#166534" : "#7f1d1d"}`,
              }}>
                {saveMsg}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveLead} disabled={saving}>
                {saving ? "Saving…" : result.saved ? "Update Notes" : "Save Lead"}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={resetScanner}>
                Scan Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
