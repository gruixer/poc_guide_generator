"use client";
import { useState, useEffect } from "react";

export function HelpSidebar({ componentName = "LoginForm" }) {
  const [open, setOpen]       = useState(false);
  const [hidden, setHidden]   = useState(false);
  const [guide, setGuide]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!open || guide) return;
    setLoading(true);
    setError("");
    fetch(`/docs/${componentName}.json`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setGuide(data); setLoading(false); })
      .catch(() => { setError("Guide non disponible."); setLoading(false); });
  }, [open, componentName, guide]);

  return (
    <>
      {/*
        hoverZone is ALWAYS present in bottom-right.
        - When hidden=false: shows the button normally
        - When hidden=true:  button is invisible (opacity 0) but zone still
          catches mouseEnter → sets hidden=false → button fades back in
      */}
      <div
        onMouseEnter={() => setHidden(false)}
        style={styles.hoverZone}
      >
        <div style={{
          ...styles.btnWrap,
          opacity: hidden ? 0 : 1,
          pointerEvents: hidden ? "none" : "auto",
          transform: hidden ? "scale(0.7) translateY(6px)" : "scale(1) translateY(0)",
        }}>
          {/* × dismiss badge */}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); setHidden(true); }}
            style={styles.dismissBtn}
            title="Masquer"
          >
            ×
          </button>

          {/* Main ? button */}
          <button
            onClick={() => setOpen(!open)}
            style={{
              ...styles.helpBtn,
              background: open ? "#5a67d8" : "#667eea",
              boxShadow: open
                ? "0 0 0 4px rgba(90,103,216,0.25), 0 4px 14px rgba(90,103,216,0.4)"
                : "0 4px 14px rgba(102,126,234,0.55)",
            }}
            title="Aide"
          >
            ?
          </button>
        </div>
      </div>

      {/* Floating sidebar panel */}
      <div style={{ ...styles.sidebar, width: open ? 280 : 0 }}>
        <div style={styles.inner}>
          <div style={styles.sidebarHeader}>
            <strong style={{ fontSize: 13 }}>📘 Guide d'utilisation</strong>
            <button onClick={() => setOpen(false)} style={styles.closeBtn}>✕</button>
          </div>
          {loading && <p style={styles.muted}>Chargement...</p>}
          {error   && <p style={styles.muted}>{error}</p>}
          {!loading && !error && !guide && (
            <p style={styles.muted}>Guide disponible une fois connecté.</p>
          )}
          {guide && (
            <>
              <Section title="Description">
                <p style={styles.text}>{guide.sections.description}</p>
              </Section>
              <Section title="Étapes">
                <ol style={styles.ol}>
                  {guide.sections.etapes.map((step, i) => (
                    <li key={i} style={styles.text}>{step}</li>
                  ))}
                </ol>
              </Section>
              <Section title="Messages d'erreur">
                {guide.sections.erreurs.map((e, i) => (
                  <div key={i} style={styles.errorBox}>
                    <strong style={{ fontSize: 11 }}>{e.message}</strong>
                    <p style={{ margin: "4px 0 0", fontSize: 10, lineHeight: 1.5 }}>{e.explication}</p>
                  </div>
                ))}
              </Section>
              <p style={styles.version}>
                auto-généré · {new Date(guide.generated_at).toLocaleDateString("fr-CH")}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94a3b8", margin: "0 0 6px" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

const styles = {
  hoverZone: {
    position: "fixed",
    bottom: 12,
    right: 12,
    width: 72,
    height: 72,
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  btnWrap: {
    position: "relative",
    transition: "opacity 0.22s ease, transform 0.22s ease",
  },
  dismissBtn: {
    position: "absolute",
    top: -8,
    left: -8,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#1e293b",
    color: "#fff",
    border: "2px solid #fff",
    fontSize: 15,
    lineHeight: 1,
    cursor: "pointer",
    zIndex: 10,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 5px rgba(0,0,0,0.25)",
  },
  helpBtn: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    color: "#fff",
    border: "none",
    fontWeight: 700,
    fontSize: 20,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s, box-shadow 0.2s",
  },
  sidebar: {
    position: "fixed",
    bottom: 76,
    right: 20,
    maxHeight: "65vh",
    background: "#fff",
    border: "1.5px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
    zIndex: 1099,
  },
  inner:         { width: 280, maxHeight: "65vh", overflowY: "auto", padding: 16 },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e2e8f0" },
  closeBtn:      { width: 22, height: 22, border: "none", background: "#f1f5f9", borderRadius: 5, cursor: "pointer", fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" },
  text:          { fontSize: 12, lineHeight: 1.6, color: "#475569", margin: "0 0 4px" },
  ol:            { paddingLeft: 18, margin: 0 },
  errorBox:      { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "8px 10px", color: "#c2410c", marginBottom: 6 },
  muted:         { fontSize: 12, color: "#94a3b8", lineHeight: 1.6 },
  version:       { fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid #e2e8f0" },
};