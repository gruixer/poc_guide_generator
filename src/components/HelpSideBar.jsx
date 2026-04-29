"use client";
import { useState, useEffect } from "react";


export function HelpSidebar({ componentName = "LoginForm" }) {
  const [open, setOpen]       = useState(false);
  const [guide, setGuide]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!open || guide) return;
    setLoading(true);
    setError("");

    fetch(`/docs/${componentName}.json`)
      .then((r) => {
        if (!r.ok) throw new Error("Guide non trouvé");
        return r.json();
      })
      .then((data) => { setGuide(data); setLoading(false); })
      .catch(() => {
        setError("Guide non disponible.");
        setLoading(false);
      });
  }, [open, componentName, guide]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{ ...styles.helpBtn, background: open ? "#5a67d8" : "#667eea" }}
        title="Aide"
      >
        ?
      </button>

      <div style={{ ...styles.sidebar, width: open ? 270 : 0 }}>
        <div style={styles.inner}>
          <div style={styles.header}>
            <strong style={{ fontSize: 13 }}>📘 Guide d'utilisation</strong>
            <button onClick={() => setOpen(false)} style={styles.closeBtn}>✕</button>
          </div>

          {loading && <p style={styles.muted}>Chargement...</p>}
          {error   && <p style={styles.muted}>{error}</p>}

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
                    <p style={{ margin: "4px 0 0", fontSize: 10, lineHeight: 1.5 }}>
                      {e.explication}
                    </p>
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
  helpBtn:  { position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  sidebar:  { position: "absolute", top: 0, right: 0, height: "100%", background: "#fff", borderLeft: "1.5px solid #e2e8f0", overflow: "hidden", transition: "width 0.3s ease", borderRadius: "0 8px 8px 0", boxShadow: "-4px 0 20px rgba(0,0,0,0.06)" },
  inner:    { width: 270, height: "100%", overflowY: "auto", padding: 14 },
  header:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #e2e8f0" },
  closeBtn: { width: 20, height: 20, border: "none", background: "#f1f5f9", borderRadius: 4, cursor: "pointer", fontSize: 11, color: "#64748b" },
  text:     { fontSize: 12, lineHeight: 1.6, color: "#475569", margin: "0 0 4px" },
  ol:       { paddingLeft: 18, margin: 0 },
  errorBox: { background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "8px 10px", color: "#c2410c", marginBottom: 6 },
  muted:    { fontSize: 12, color: "#94a3b8", lineHeight: 1.6 },
  version:  { fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid #e2e8f0" },
};