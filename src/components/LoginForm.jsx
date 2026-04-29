"use client";
import { useState } from "react";

export function LoginForm({ onSuccess, maxAttempts = 3 }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked]     = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) return;

    const ok = email === "user@test.com" && password === "1234";

    if (!ok) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= maxAttempts) {
        setLocked(true);
        setError("Compte verrouillé. Contactez le support.⚠️");
      } else {
        setError(`Identifiants incorrects.⚠️ Tentative ${next}/${maxAttempts}.`);
      }
    } else {
      setError("");
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h2 style={styles.title}>Connexion</h2>
      <input type="email" placeholder="Adresse e-mail" value={email}
        onChange={(e) => setEmail(e.target.value)} style={styles.input}
        disabled={locked} required />
      <input type="password" placeholder="Mot de passe" value={password}
        onChange={(e) => setPassword(e.target.value)} style={styles.input}
        disabled={locked} required />
      {error && <p style={styles.error}>{error}</p>}
      <button type="submit" disabled={locked} style={styles.btn}>
        Se connecter
      </button>
      <p style={styles.hint}>Test : user@test.com / 1234</p>
    </form>
  );
}

const styles = {
  form:  { display: "flex", flexDirection: "column", gap: 12, width: 300 },
  title: { margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" },
  input: { padding: "10px 12px", borderRadius: 6, border: "1.5px solid #e2e8f0", fontSize: 14 },
  btn:   { padding: "10px 0", background: "#667eea", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 14 },
  error: { color: "#c2410c", fontSize: 13, margin: 0, padding: "8px 12px", background: "#fff7ed", borderRadius: 6, border: "1px solid #fed7aa" },
  hint:  { fontSize: 11, color: "#94a3b8", textAlign: "center", margin: 0 },
};