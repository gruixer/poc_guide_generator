"use client";
import { useState } from "react";
import { HelpSidebar } from "./HelpSideBar";

// ── Icons (inline SVG — pas de dépendance externe) ──────────
const Icons = {
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  chart: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
  star: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

const NAV_ITEMS = [
  { icon: Icons.home,     label: "Tableau de bord", active: true  },
  { icon: Icons.chart,    label: "Statistiques",    active: false },
  { icon: Icons.users,    label: "Utilisateurs",    active: false },
  { icon: Icons.settings, label: "Paramètres",      active: false },
];

export function Dashboard({ username = "Kevin", onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState(0);

  return (
    <div style={styles.root}>

      {/* ── Header ─────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={styles.menuBtn}
            title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            {Icons.menu}
          </button>
          <div style={styles.logo}>
            <div style={styles.logoDot} />
            <span style={styles.logoText}>MyApp</span>
          </div>
        </div>

        <div style={styles.headerRight}>
          <button style={styles.iconBtn} title="Notifications">
            {Icons.bell}
            <span style={styles.notifDot} />
          </button>
          <div style={styles.avatar}>
            {username.charAt(0).toUpperCase()}
          </div>
          <span style={styles.headerUsername}>{username}</span>
          <button style={{ ...styles.iconBtn, color: "#ef4444" }} onClick={onLogout} title="Déconnexion">
            {Icons.logout}
          </button>
        </div>
      </header>

      <div style={styles.body}>

        {/* ── Sidebar ──────────────────────────────────────── */}
        <aside style={{ ...styles.sidebar, width: collapsed ? 64 : 220 }}>
          <nav style={styles.nav}>
            {NAV_ITEMS.map((item, i) => (
              <button
                key={i}
                onClick={() => setActiveNav(i)}
                style={{
                  ...styles.navItem,
                  background: activeNav === i ? "rgba(99,102,241,0.12)" : "transparent",
                  color: activeNav === i ? "#6366f1" : "#64748b",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                title={collapsed ? item.label : ""}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <span style={styles.navLabel}>{item.label}</span>
                )}
                {!collapsed && activeNav === i && (
                  <span style={styles.navActive} />
                )}
              </button>
            ))}
          </nav>

          {/* Toggle arrow en bas */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              ...styles.collapseBtn,
              transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
            }}
            title={collapsed ? "Agrandir" : "Réduire"}
          >
            {Icons.chevron}
          </button>
        </aside>

        {/* ── Main content ─────────────────────────────────── */}
        <main style={styles.main}>

          {/* Widget Bienvenue */}
          <div style={styles.welcomeCard}>
            <div style={styles.welcomeGlow} />
            <div style={styles.welcomeInner}>
              <div style={styles.welcomeStars}>
                {[...Array(3)].map((_, i) => (
                  <span key={i} style={{ ...styles.star, opacity: 0.4 + i * 0.3 }}>
                    {Icons.star}
                  </span>
                ))}
              </div>
              <h1 style={styles.welcomeTitle}>
                Bienvenue, <span style={styles.welcomeName}>{username}</span> 👋
              </h1>
              <p style={styles.welcomeSub}>
                Content de te revoir. Voici un résumé de ton activité du jour.
              </p>
            </div>
            <div style={styles.welcomeIllustration}>
              <div style={styles.orbit}>
                <div style={styles.orbitDot1} />
                <div style={styles.orbitDot2} />
                <div style={styles.orbitDot3} />
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div style={styles.statsGrid}>
            {[
              { label: "Sessions aujourd'hui", value: "24",  delta: "+12%", color: "#6366f1" },
              { label: "Documents générés",    value: "8",   delta: "+3",   color: "#10b981" },
              { label: "Composants suivis",    value: "5",   delta: "actif", color: "#f59e0b" },
              { label: "Dernière génération",  value: "2min", delta: "il y a", color: "#3b82f6" },
            ].map((stat, i) => (
              <div key={i} style={styles.statCard}>
                <div style={{ ...styles.statAccent, background: stat.color }} />
                <div style={styles.statValue}>{stat.value}</div>
                <div style={styles.statLabel}>{stat.label}</div>
                <div style={{ ...styles.statDelta, color: stat.color }}>{stat.delta}</div>
              </div>
            ))}
          </div>

          {/* Bouton ? */}
          <div>
            <HelpSidebar componentName="Dashboard" />
          </div>

        </main>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={styles.footer}>
        <span>© 2026 MyApp — Module 245 · EPSIC</span>
        <span style={styles.footerRight}>
          Guide auto-généré par Ollama ·
          <span style={{ color: "#3a9778", marginLeft: 6 }}>● En ligne</span>
        </span>
      </footer>

    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = {
  root: {
    display: "flex", flexDirection: "column",
    minHeight: "100vh", background: "#f8fafc",
    fontFamily: "'Syne', system-ui, sans-serif",
  },

  // Header
  header: {
    height: 60, background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px", flexShrink: 0,
    position: "sticky", top: 0, zIndex: 100,
    boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
  },
  headerLeft:  { display: "flex", alignItems: "center", gap: 16 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  menuBtn: {
    width: 36, height: 36, borderRadius: 8,
    border: "none", background: "#f1f5f9",
    color: "#475569", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.2s",
  },
  logo:     { display: "flex", alignItems: "center", gap: 8 },
  logoDot:  { width: 10, height: 10, borderRadius: "50%", background: "#6366f1" },
  logoText: { fontWeight: 800, fontSize: 16, color: "#1e293b", letterSpacing: "-0.3px" },
  iconBtn: {
    width: 34, height: 34, borderRadius: 8,
    border: "none", background: "transparent",
    color: "#64748b", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute", top: 6, right: 6,
    width: 7, height: 7, borderRadius: "50%",
    background: "#ef4444", border: "1.5px solid #fff",
  },
  avatar: {
    width: 32, height: 32, borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff", fontWeight: 700, fontSize: 13,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  headerUsername: { fontSize: 13, fontWeight: 600, color: "#1e293b" },

  // Body
  body: { display: "flex", flex: 1, overflow: "hidden" },

  // Sidebar
  sidebar: {
    background: "#fff",
    borderRight: "1px solid #e2e8f0",
    display: "flex", flexDirection: "column",
    transition: "width 0.25s ease",
    overflow: "hidden", flexShrink: 0,
    position: "sticky", top: 60,
    height: "calc(100vh - 60px - 44px)",
  },
  nav:     { flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 12px", borderRadius: 8,
    border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600,
    transition: "all 0.15s", width: "100%",
    position: "relative", whiteSpace: "nowrap",
    fontFamily: "'Syne', system-ui, sans-serif",
  },
  navLabel:  { flex: 1, textAlign: "left" },
  navActive: {
    width: 4, height: 4, borderRadius: "50%",
    background: "#6366f1",
  },
  collapseBtn: {
    margin: "8px", padding: "8px",
    border: "none", background: "#f8fafc",
    color: "#94a3b8", cursor: "pointer",
    borderRadius: 8, transition: "transform 0.25s ease",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  // Main
  main: {
    flex: 1, padding: 28, overflowY: "auto",
    display: "flex", flexDirection: "column", gap: 24,
  },

  // Welcome card
  welcomeCard: {
    background: "linear-gradient(135deg, #1e293b 0%, #312e81 100%)",
    borderRadius: 16, padding: "28px 32px",
    display: "flex", justifyContent: "space-between",
    alignItems: "center", position: "relative",
    overflow: "hidden", minHeight: 140,
  },
  welcomeGlow: {
    position: "absolute", top: -40, right: 80,
    width: 200, height: 200, borderRadius: "50%",
    background: "rgba(99,102,241,0.25)", filter: "blur(40px)",
    pointerEvents: "none",
  },
  welcomeInner: { zIndex: 1 },
  welcomeStars: { display: "flex", gap: 4, marginBottom: 12 },
  star:         { color: "#fbbf24" },
  welcomeTitle: {
    margin: 0, fontSize: 26, fontWeight: 800,
    color: "#fff", letterSpacing: "-0.5px",
  },
  welcomeName: { color: "#a5b4fc" },
  welcomeSub:  { margin: "8px 0 0", fontSize: 13, color: "#94a3b8", lineHeight: 1.6 },
  welcomeIllustration: {
    zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  },
  orbit: {
    width: 90, height: 90, borderRadius: "50%",
    border: "1.5px dashed rgba(165,180,252,0.3)",
    position: "relative", display: "flex",
    alignItems: "center", justifyContent: "center",
    animation: "spin 12s linear infinite",
  },
  orbitDot1: {
    position: "absolute", top: -5, left: "50%",
    width: 10, height: 10, borderRadius: "50%",
    background: "#6366f1", transform: "translateX(-50%)",
  },
  orbitDot2: {
    position: "absolute", bottom: -5, left: "50%",
    width: 7, height: 7, borderRadius: "50%",
    background: "#a5b4fc", transform: "translateX(-50%)",
  },
  orbitDot3: {
    position: "absolute", top: "50%", right: -5,
    width: 8, height: 8, borderRadius: "50%",
    background: "#818cf8", transform: "translateY(-50%)",
  },

  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
  },
  statCard: {
    background: "#c32020", borderRadius: 12,
    padding: "20px", border: "1px solid #e2e8f0",
    position: "relative", overflow: "hidden",
  },
  statAccent: {
    position: "absolute", top: 0, left: 0,
    width: "100%", height: 3, borderRadius: "12px 12px 0 0",
  },
  statValue: { fontSize: 28, fontWeight: 800, color: "#1e293b", lineHeight: 1, marginBottom: 6 },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: 500 },
  statDelta: { fontSize: 11, fontWeight: 700, marginTop: 8 },

  // Footer
  footer: {
    height: 44, background: "#fff",
    borderTop: "1px solid #e2e8f0",
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px", flexShrink: 0,
    fontSize: 11, color: "#94a3b8",
  },
  footerRight: { display: "flex", alignItems: "center", gap: 4 },
};