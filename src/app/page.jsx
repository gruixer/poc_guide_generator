"use client";
import { LoginForm } from "@/components/LoginForm";
import { HelpSidebar } from "@/components/HelpSidebar";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8f9fc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ position: "relative", background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <LoginForm onSuccess={() => alert("Connexion réussie !")} />
        <HelpSidebar componentName="LoginForm" />
      </div>
    </main>
  );
}