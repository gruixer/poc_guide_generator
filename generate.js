// generate.js
// Appelé par GitHub Actions : node generate.js src/components/LoginForm.jsx
// Lit le composant, appelle Ollama, sauvegarde le guide JSON dans public/docs/

import { readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage : node generate.js <chemin/composant.jsx>");
  process.exit(1);
}

const componentName = basename(filePath, ".jsx");
const outputPath    = join("public", "docs", `${componentName}.json`);

// ── Lecture du fichier ──────────────────────────────────────
function readComponent(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    console.error(`Fichier introuvable : ${path}`);
    process.exit(1);
  }
}

// ── Sanitisation (bonne pratique même en local) ─────────────
function sanitize(code) {
  return code
    .replace(/sk-[a-zA-Z0-9-]{20,}/g, "[API_KEY_REMOVED]")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, "Bearer [TOKEN_REMOVED]")
    .replace(/process\.env\.\w+/g, "process.env.[REDACTED]")
    .replace(/password\s*[:=]\s*["'][^"']*["']/gi, 'password: "[REDACTED]"');
}

// ── Appel Ollama ────────────────────────────────────────────
async function callOllama(code, name) {
  const url   = process.env.OLLAMA_URL   || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2:3b";

  const prompt = `Tu es un rédacteur de documentation utilisateur.
Génère un guide d'utilisation simple pour le composant React "${name}".

Code source :
${code}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après :
{
  "component": "${name}",
  "generated_at": "${new Date().toISOString()}",
  "sections": {
    "description": "une phrase simple expliquant à quoi sert ce composant pour un utilisateur non-technique",
    "etapes": [
      "Étape 1 : ...",
      "Étape 2 : ...",
      "Étape 3 : ..."
    ],
    "erreurs": [
      {
        "message": "texte exact du message d'erreur affiché",
        "explication": "ce que l'utilisateur doit faire"
      }
    ]
  }
}`;

  console.log(`  Modèle : ${model}`);
  console.log(`  Envoi à Ollama...`);

  const response = await fetch(`${url}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
  });

  if (!response.ok) {
    throw new Error(`Ollama a répondu : ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

// ── Parse et sauvegarde ─────────────────────────────────────
function saveGuide(raw, outputPath) {
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const guide = JSON.parse(clean);
  writeFileSync(outputPath, JSON.stringify(guide, null, 2), "utf-8");
  return guide;
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log(`\n📄 Composant : ${componentName}`);
  console.log(`💾 Sortie    : ${outputPath}\n`);

  const code      = readComponent(filePath);
  const sanitized = sanitize(code);

  console.log("✔ Sanitisation OK");

  const raw   = await callOllama(sanitized, componentName);
  const guide = saveGuide(raw, outputPath);

  console.log(`\n✅ Guide sauvegardé : ${outputPath}`);
  console.log(`   Description : ${guide.sections.description}`);
  console.log(`   Étapes      : ${guide.sections.etapes.length}`);
  console.log(`   Erreurs     : ${guide.sections.erreurs.length}\n`);
}

main().catch((err) => {
  console.error("\n❌ Erreur :", err.message);
  process.exit(1);
});