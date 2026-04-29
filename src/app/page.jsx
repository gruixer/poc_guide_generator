"use client";
import { useState } from "react";
import { LoginForm } from "../components/LoginForm";
import { Dashboard } from "../components/Dashboard";
import { HelpSidebar } from "../components/HelpSideBar";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("Kevin");

  if (loggedIn) {
    return (
      <Dashboard
        username={username}
        onLogout={() => setLoggedIn(false)}
      />
    );
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#f8f9fc",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ position: "relative", background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <LoginForm onSuccess={() => setLoggedIn(true)} />
        <HelpSidebar componentName="LoginForm" />
      </div>
    </main>
  );
}