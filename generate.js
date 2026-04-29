// // generate.js
// // Appelé par GitHub Actions : node generate.js src/components/LoginForm.jsx
// // Lit le composant, appelle Ollama, sauvegarde le guide JSON dans public/docs/

// import { readFileSync, writeFileSync } from "fs";
// import { basename, join } from "path";
// import * as dotenv from "dotenv";

// dotenv.config({ path: ".env.local" });

// const filePath = process.argv[2];

// if (!filePath) {
//   console.error("Usage : node generate.js <chemin/composant.jsx>");
//   process.exit(1);
// }

// const componentName = basename(filePath, ".jsx");
// const outputPath    = join("public", "docs", `${componentName}.json`);

// // ── Lecture du fichier ──────────────────────────────────────
// function readComponent(path) {
//   try {
//     return readFileSync(path, "utf-8");
//   } catch {
//     console.error(`Fichier introuvable : ${path}`);
//     process.exit(1);
//   }
// }

// // ── Sanitisation (bonne pratique même en local) ─────────────
// function sanitize(code) {
//   return code
//     .replace(/sk-[a-zA-Z0-9-]{20,}/g, "[API_KEY_REMOVED]")
//     .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, "Bearer [TOKEN_REMOVED]")
//     .replace(/process\.env\.\w+/g, "process.env.[REDACTED]")
//     .replace(/password\s*[:=]\s*["'][^"']*["']/gi, 'password: "[REDACTED]"');
// }

// // ── Appel Ollama ────────────────────────────────────────────
// async function callOllama(code, name) {
//   const url   = process.env.OLLAMA_URL   || "http://localhost:11434";
//   const model = process.env.OLLAMA_MODEL || "llama3.2:3b";

//   const prompt = `Tu es un rédacteur de documentation utilisateur.
// Génère un guide d'utilisation simple pour le composant React "${name}".

// Code source :
// ${code}

// Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après :
// {
//   "component": "${name}",
//   "generated_at": "${new Date().toISOString()}",
//   "sections": {
//     "description": "une phrase simple expliquant à quoi sert ce composant pour un utilisateur non-technique",
//     "etapes": [
//       "Étape 1 : ...",
//       "Étape 2 : ...",
//       "Étape 3 : ..."
//     ],
//     "erreurs": [
//       {
//         "message": "texte exact du message d'erreur affiché",
//         "explication": "ce que l'utilisateur doit faire"
//       }
//     ]
//   }
// }`;

//   console.log(`  Modèle : ${model}`);
//   console.log(`  Envoi à Ollama...`);

//   const response = await fetch(`${url}/api/generate`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
//   });

//   if (!response.ok) {
//     throw new Error(`Ollama a répondu : ${response.status} ${response.statusText}`);
//   }

//   const data = await response.json();
//   return data.response;
// }

// // ── Parse et sauvegarde ─────────────────────────────────────
// function saveGuide(raw, outputPath) {
//   const clean = raw
//     .replace(/^```json\s*/i, "")
//     .replace(/\s*```$/, "")
//     .trim();
//   const guide = JSON.parse(clean);
//   writeFileSync(outputPath, JSON.stringify(guide, null, 2), "utf-8");
//   return guide;
// }

// // ── Main ────────────────────────────────────────────────────
// async function main() {
//   console.log(`\n📄 Composant : ${componentName}`);
//   console.log(`💾 Sortie    : ${outputPath}\n`);

//   const code      = readComponent(filePath);
//   const sanitized = sanitize(code);

//   console.log("✔ Sanitisation OK");

//   const raw   = await callOllama(sanitized, componentName);
//   const guide = saveGuide(raw, outputPath);

//   console.log(`\n✅ Guide sauvegardé : ${outputPath}`);
//   console.log(`   Description : ${guide.sections.description}`);
//   console.log(`   Étapes      : ${guide.sections.etapes.length}`);
//   console.log(`   Erreurs     : ${guide.sections.erreurs.length}\n`);
// }

// main().catch((err) => {
//   console.error("\n❌ Erreur :", err.message);
//   process.exit(1);
// });

// generate.js
// Appelé par GitHub Actions : node generate.js src/components/LoginForm.jsx
//
// Niveau 1 — Contexte : passe le guide existant au modèle
// Niveau 2 — Précision : envoie le git diff plutôt que le fichier entier
// Niveau 3 — Prompt strict : règles explicites pour éviter les hallucinations

import { readFileSync, writeFileSync, existsSync } from "fs";
import { basename, join } from "path";
import { execSync } from "child_process";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage : node generate.js <chemin/composant.jsx>");
  process.exit(1);
}

const componentName = basename(filePath, ".jsx");
const outputPath    = join("public", "docs", `${componentName}.json`);

// ── Sanitisation ────────────────────────────────────────────
function sanitize(code) {
  return code
    .replace(/sk-[a-zA-Z0-9-]{20,}/g, "[API_KEY_REMOVED]")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, "Bearer [TOKEN_REMOVED]")
    .replace(/process\.env\.\w+/g, "process.env.[REDACTED]")
    .replace(/password\s*[:=]\s*["'][^"']*["']/gi, 'password: "[REDACTED]"');
}

// ── Niveau 2 — Git diff ─────────────────────────────────────
// Retourne uniquement les lignes modifiées si possible
// Sinon retourne le fichier entier (nouveau fichier / premier commit)
function getCodeOrDiff(filePath) {
  try {
    const diff = execSync(`git diff HEAD~1 -- ${filePath}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });

    if (diff.trim()) {
      console.log("  Mode : git diff (lignes modifiées uniquement)");
      return { content: diff, isDiff: true };
    }
  } catch {
    // Pas de commit précédent — normal au premier run
  }

  // Pas de diff → nouveau fichier ou premier commit → fichier entier
  console.log("  Mode : fichier complet (nouveau composant)");
  const content = readFileSync(filePath, "utf-8");
  return { content, isDiff: false };
}

// ── Niveau 1 — Guide existant ───────────────────────────────
// Charge le guide actuel s'il existe pour le passer en contexte
function loadExistingGuide(outputPath) {
  if (!existsSync(outputPath)) return null;
  try {
    const raw = readFileSync(outputPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Persona / Skills ────────────────────────────────────────
// Donne un rôle précis au modèle pour améliorer la qualité du contenu
const PERSONA = `Tu es une combinaison de trois experts :

1. DEV SENIOR (10 ans d'expérience)
   - Tu lis et comprends parfaitement le code React
   - Tu identifies instantanément ce qui impacte ou non l'utilisateur final
   - Tu sais distinguer un changement technique interne d'un changement visible

2. UX WRITER / DESIGNER
   - Tu écris des guides clairs, concis, sans jargon technique
   - Tu penses toujours du point de vue de l'utilisateur final non-technique
   - Tu utilises un vocabulaire simple et des formulations cohérentes
   - Tu sais qu'une bonne documentation ne dit que ce qui est nécessaire

3. EXPERT QUALITÉ DOCUMENTATION
   - Tu garantis la cohérence du style entre chaque version du guide
   - Tu ne modifies jamais ce qui n'a pas besoin d'être modifié
   - Tu valides que chaque étape correspond à une vraie action utilisateur dans le code`;

// ── Niveau 3 — Prompt strict ────────────────────────────────
// Deux prompts selon qu'un guide existe déjà ou non
function buildPrompt(componentName, codeOrDiff, isDiff, existingGuide) {

  const codeBlock = isDiff
    ? `GIT DIFF (lignes modifiées — + ajouté, - supprimé) :\n${codeOrDiff}`
    : `CODE SOURCE COMPLET :\n${codeOrDiff}`;

  const strictRules = `RÈGLES ABSOLUES — respecte-les sans exception :
1. Réponds UNIQUEMENT avec du JSON valide — aucun texte avant ou après, aucun backtick
2. La description : UNE seule phrase simple, maximum 15 mots, pour un utilisateur non-technique
3. Format des étapes : numéros simples uniquement — "1.", "2.", "3." — jamais "Étape 1 :"
   Exemple correct   : "Saisissez votre adresse e-mail."
   Exemple interdit  : "Étape 1 : Saisissez votre adresse e-mail."
   Exemple interdit  : "1. Étape 1 : Saisissez votre adresse e-mail."
4. Les messages d'erreur : copie-les EXACTEMENT depuis le code source, mot pour mot
5. Ne jamais inventer de fonctionnalités absentes du code
6. Ne jamais changer le style rédactionnel entre deux générations`;

  // Premier guide — génération from scratch
  if (!existingGuide) {
    return `${PERSONA}

${strictRules}

COMPOSANT : ${componentName}

${codeBlock}

Génère le guide en JSON avec cette structure exacte :
{
  "component": "${componentName}",
  "generated_at": "${new Date().toISOString()}",
  "sections": {
    "description": "une phrase simple max 15 mots",
    "etapes": [
      "Saisissez votre adresse e-mail.",
      "Entrez votre mot de passe.",
      "Cliquez sur Se connecter."
    ],
    "erreurs": [
      {
        "message": "texte exact du message d'erreur dans le code",
        "explication": "ce que l'utilisateur doit faire"
      }
    ]
  }
}`;
  }

  // Guide existant — mise à jour ciblée
  return `${PERSONA}

${strictRules}
7. Si le changement n'impacte PAS l'expérience utilisateur visible : retourne le guide IDENTIQUE
8. Si le changement impacte l'expérience utilisateur : modifie UNIQUEMENT la ou les sections concernées
9. Ne jamais réécrire une section qui n'est pas touchée par le diff

GUIDE ACTUEL (référence — modifie seulement ce qui est nécessaire) :
${JSON.stringify(existingGuide, null, 2)}

COMPOSANT : ${componentName}

${codeBlock}

Retourne le JSON complet mis à jour (ou identique si aucun changement utilisateur détecté) :
{
  "component": "${componentName}",
  "generated_at": "${new Date().toISOString()}",
  "sections": {
    "description": "...",
    "etapes": [
      "Saisissez votre adresse e-mail.",
      "Entrez votre mot de passe.",
      "Cliquez sur Se connecter."
    ],
    "erreurs": [
      { "message": "...", "explication": "..." }
    ]
  }
}`;
}

// ── Appel Ollama ────────────────────────────────────────────
async function callOllama(prompt, retries = 3) {
  const url   = process.env.OLLAMA_URL   || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2:3b";

  console.log(`  Modèle : ${model}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Envoi à Ollama... (tentative ${attempt}/${retries})`);

      const response = await fetch(`${url}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          format: "json",
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama a répondu : ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;

    } catch (err) {
      console.log(`  ⚠ Tentative ${attempt} échouée : ${err.message}`);

      if (attempt === retries) throw err;

      // Attend 5 secondes avant de réessayer
      console.log(`  Nouvelle tentative dans 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ── Parse et validation ─────────────────────────────────────
function parseAndValidate(raw, componentName) {
  // Nettoyage au cas où le modèle ajoute des backticks malgré le format:json
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const guide = JSON.parse(clean);

  // Validation minimale de la structure
  if (!guide.sections) throw new Error("JSON invalide : clé 'sections' manquante");
  if (!guide.sections.description) throw new Error("JSON invalide : 'description' manquante");
  if (!Array.isArray(guide.sections.etapes)) throw new Error("JSON invalide : 'etapes' doit être un tableau");
  if (!Array.isArray(guide.sections.erreurs)) throw new Error("JSON invalide : 'erreurs' doit être un tableau");

  // Force le bon component name (le modèle peut se tromper)
  guide.component = componentName;
  guide.generated_at = new Date().toISOString();

  return guide;
}

function saveGuide(guide, outputPath) {
  writeFileSync(outputPath, JSON.stringify(guide, null, 2), "utf-8");
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log(`\n📄 Composant    : ${componentName}`);
  console.log(`💾 Sortie       : ${outputPath}\n`);

  // Niveau 2 : diff ou fichier entier
  const { content, isDiff } = getCodeOrDiff(filePath);
  const sanitized = sanitize(content);
  console.log("✔ Sanitisation OK");

  // Niveau 1 : guide existant
  const existingGuide = loadExistingGuide(outputPath);
  if (existingGuide) {
    console.log("✔ Guide existant chargé — mise à jour ciblée");
  } else {
    console.log("  Aucun guide existant — première génération");
  }

  // Niveau 3 : prompt strict
  const prompt = buildPrompt(componentName, sanitized, isDiff, existingGuide);

  const raw   = await callOllama(prompt);
  const guide = parseAndValidate(raw, componentName);

  saveGuide(guide, outputPath);

  console.log(`\n✅ Guide sauvegardé : ${outputPath}`);
  console.log(`   Description : ${guide.sections.description}`);
  console.log(`   Étapes      : ${guide.sections.etapes.length}`);
  console.log(`   Erreurs     : ${guide.sections.erreurs.length}\n`);
}

main().catch((err) => {
  console.error("\n❌ Erreur :", err.message);
  process.exit(1);
});