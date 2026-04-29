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
// Appelé par GitHub Actions : node generate.js src/components/Dashboard.jsx
//
// Logique claire et sans ambiguïté :
// 1. Lit TOUJOURS le fichier complet (source de vérité)
// 2. Calcule le diff SÉPARÉMENT pour le contexte uniquement
// 3. Choisit le bon prompt selon la situation
// 4. Valide strictement la cohérence du guide généré

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

// ══════════════════════════════════════════════════════════════
// ÉTAPE 1 — Lecture du composant (TOUJOURS le fichier complet)
// Le fichier complet est LA source de vérité.
// Le diff est utilisé uniquement comme contexte supplémentaire.
// ══════════════════════════════════════════════════════════════
function readComponent(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    console.error(`Fichier introuvable : ${path}`);
    process.exit(1);
  }
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 2 — Diff (contexte uniquement, jamais la source principale)
// On filtre STRICTEMENT sur le fichier demandé avec -- filePath
// ══════════════════════════════════════════════════════════════
function getDiff(filePath) {
  try {
    const diff = execSync(`git diff HEAD~1 HEAD -- ${filePath}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    if (diff.trim()) {
      console.log("  Diff : changements détectés sur ce fichier");
      return diff;
    }
  } catch {
    // Pas de commit précédent
  }
  console.log("  Diff : aucun (nouveau fichier ou premier commit)");
  return null;
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 3 — Guide existant
// ══════════════════════════════════════════════════════════════
function loadExistingGuide(outputPath) {
  if (!existsSync(outputPath)) return null;
  try {
    return JSON.parse(readFileSync(outputPath, "utf-8"));
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 4 — Sanitisation
// ══════════════════════════════════════════════════════════════
function sanitize(code) {
  return code
    .replace(/sk-[a-zA-Z0-9-]{20,}/g, "[API_KEY_REMOVED]")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, "Bearer [TOKEN_REMOVED]")
    .replace(/process\.env\.\w+/g, "process.env.[REDACTED]")
    .replace(/password\s*[:=]\s*["'][^"']*["']/gi, 'password: "[REDACTED]"');
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 5 — Persona
// ══════════════════════════════════════════════════════════════
const PERSONA = `Tu es une combinaison de trois experts :

1. DEV SENIOR (10 ans d'expérience React)
   - Tu lis et comprends parfaitement le code React
   - Tu identifies ce qui est visible par l'utilisateur final vs logique interne
   - Tu ne te bases QUE sur le code fourni, jamais sur des suppositions

2. UX WRITER
   - Tu écris des guides clairs, concis, sans jargon technique
   - Tu penses du point de vue de l'utilisateur final non-technique
   - Tu décris uniquement ce que l'utilisateur voit et peut faire

3. EXPERT QUALITÉ
   - Tu garantis la cohérence entre le code et le guide
   - Tu ne génères JAMAIS de contenu qui ne soit pas dans le code
   - Tu valides que chaque étape correspond à une vraie action visible`;

// ══════════════════════════════════════════════════════════════
// ÉTAPE 6 — Construction du prompt (4 cas distincts)
// ══════════════════════════════════════════════════════════════
function buildPrompt({ componentName, fullCode, diff, existingGuide }) {

  const rules = `RÈGLES ABSOLUES :
1. JSON valide uniquement — aucun texte avant ou après, aucun backtick
2. Base-toi EXCLUSIVEMENT sur le CODE SOURCE COMPLET fourni
3. Description : une seule phrase, max 15 mots, ce que l'utilisateur voit à l'écran
4. Étapes : uniquement les actions que l'utilisateur peut faire (clics, saisies, navigations)
5. Erreurs : copie les messages EXACTEMENT tels qu'ils apparaissent dans le code
6. INTERDIT : inventer, supposer, extrapoler hors du code fourni`;

  const jsonStructure = `{
  "component": "${componentName}",
  "generated_at": "${new Date().toISOString()}",
  "sections": {
    "description": "Ce que fait ce composant en une phrase pour un utilisateur.",
    "etapes": [
      "Action 1 que l'utilisateur peut faire.",
      "Action 2 que l'utilisateur peut faire."
    ],
    "erreurs": [
      {
        "message": "Texte exact du message d'erreur dans le code",
        "explication": "Ce que l'utilisateur doit faire pour résoudre le problème."
      }
    ]
  }
}`;

  // CAS 1 : Premier guide, pas de diff
  if (!existingGuide && !diff) {
    return `${PERSONA}

${rules}

COMPOSANT : ${componentName}
SITUATION : Première documentation de ce composant.

CODE SOURCE COMPLET (source de vérité) :
\`\`\`jsx
${fullCode}
\`\`\`

Génère le guide JSON en te basant UNIQUEMENT sur ce code :
${jsonStructure}`;
  }

  // CAS 2 : Mise à jour (guide existant + diff)
  if (existingGuide && diff) {
    return `${PERSONA}

${rules}
7. Compare le guide existant avec le code actuel
8. Modifie UNIQUEMENT ce qui a changé dans l'expérience utilisateur visible
9. Si le diff est purement technique (refactor, style interne), retourne le guide IDENTIQUE

COMPOSANT : ${componentName}
SITUATION : Mise à jour — des changements ont été détectés.

CODE SOURCE COMPLET (source de vérité — prioritaire sur tout) :
\`\`\`jsx
${fullCode}
\`\`\`

CHANGEMENTS DÉTECTÉS (contexte) :
\`\`\`diff
${diff}
\`\`\`

GUIDE ACTUEL (à mettre à jour si nécessaire) :
${JSON.stringify(existingGuide.sections, null, 2)}

Retourne le JSON complet mis à jour :
${jsonStructure}`;
  }

  // CAS 3 : Guide existant mais pas de diff (vérification cohérence)
  if (existingGuide && !diff) {
    return `${PERSONA}

${rules}
7. Un guide existe déjà — vérifie sa cohérence avec le code actuel
8. Corrige uniquement ce qui est incorrect ou manquant
9. Conserve le style et la structure existants si corrects

COMPOSANT : ${componentName}
SITUATION : Vérification de cohérence.

CODE SOURCE COMPLET (source de vérité) :
\`\`\`jsx
${fullCode}
\`\`\`

GUIDE ACTUEL (à vérifier) :
${JSON.stringify(existingGuide.sections, null, 2)}

Retourne le JSON complet corrigé si nécessaire, ou identique si cohérent :
${jsonStructure}`;
  }

  // CAS 4 : Nouveau composant avec diff (nouveau fichier ajouté)
  return `${PERSONA}

${rules}

COMPOSANT : ${componentName}
SITUATION : Nouveau composant ajouté au projet.

CODE SOURCE COMPLET (source de vérité) :
\`\`\`jsx
${fullCode}
\`\`\`

Génère le guide JSON en te basant UNIQUEMENT sur ce code :
${jsonStructure}`;
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 7 — Appel Ollama avec retry
// ══════════════════════════════════════════════════════════════
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
        body: JSON.stringify({ model, prompt, stream: false, format: "json" }),
      });

      if (!response.ok) {
        throw new Error(`Ollama : ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;

    } catch (err) {
      console.log(`  Tentative ${attempt} échouée : ${err.message}`);
      if (attempt === retries) throw err;
      console.log(`  Nouvelle tentative dans 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 8 — Parse + validation de cohérence
// ══════════════════════════════════════════════════════════════
function parseAndValidate(raw, componentName, fullCode) {
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const guide = JSON.parse(clean);

  // Validation structure
  if (!guide.sections)
    throw new Error("JSON invalide : 'sections' manquant");
  if (!guide.sections.description)
    throw new Error("JSON invalide : 'description' manquante");
  if (!Array.isArray(guide.sections.etapes) || guide.sections.etapes.length === 0)
    throw new Error("JSON invalide : 'etapes' vide ou absent");
  if (!Array.isArray(guide.sections.erreurs))
    throw new Error("JSON invalide : 'erreurs' absent");

  // Validation cohérence : détecte si le modèle a confondu avec LoginForm
  // On vérifie que la description parle de termes présents dans le code
  const descLower = guide.sections.description.toLowerCase();
  const codeLower = fullCode.toLowerCase();

  const loginTerms = ["e-mail", "email", "mot de passe", "password", "connexion", "connecter", "identifiant"];
  const descHasLoginTerms = loginTerms.some(t => descLower.includes(t));
  const codeHasLoginTerms = loginTerms.some(t => codeLower.includes(t));

  if (descHasLoginTerms && !codeHasLoginTerms) {
    throw new Error(
      `Guide incohérent détecté : la description parle de connexion/email ` +
      `mais ${componentName} n'en contient pas. ` +
      `Le modèle a confondu avec un autre composant.`
    );
  }

  // Force les valeurs correctes
  guide.component    = componentName;
  guide.generated_at = new Date().toISOString();

  return guide;
}

function saveGuide(guide, outputPath) {
  writeFileSync(outputPath, JSON.stringify(guide, null, 2), "utf-8");
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n📄 Composant : ${componentName}`);
  console.log(`📁 Fichier   : ${filePath}`);
  console.log(`💾 Sortie    : ${outputPath}\n`);

  // 1. Fichier complet — source de vérité
  const fullCode = sanitize(readComponent(filePath));
  console.log("✔ Fichier lu");

  // 2. Diff — contexte uniquement, filtré sur CE fichier
  const diff = getDiff(filePath);

  // 3. Guide existant
  const existingGuide = loadExistingGuide(outputPath);
  console.log(existingGuide
    ? "✔ Guide existant chargé"
    : "  Aucun guide existant — première génération"
  );

  // 4. Cas détecté
  const cas = !existingGuide && !diff ? "1 — nouveau composant"
    : existingGuide && diff            ? "2 — mise à jour"
    : existingGuide && !diff           ? "3 — vérification cohérence"
    :                                    "4 — ajout avec diff";
  console.log(`  Cas : ${cas}`);

  // 5. Prompt adapté
  const prompt = buildPrompt({ componentName, fullCode, diff, existingGuide });

  // 6. Génération
  const raw = await callOllama(prompt);
  console.log("✔ Réponse reçue");

  // 7. Validation
  const guide = parseAndValidate(raw, componentName, fullCode);
  console.log("✔ Guide validé");

  // 8. Sauvegarde
  saveGuide(guide, outputPath);

  console.log(`\n✅ ${outputPath}`);
  console.log(`   Description : ${guide.sections.description}`);
  console.log(`   Étapes      : ${guide.sections.etapes.length}`);
  console.log(`   Erreurs     : ${guide.sections.erreurs.length}\n`);
}

main().catch((err) => {
  console.error("\n❌ Erreur :", err.message);
  process.exit(1);
});