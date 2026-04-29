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

// generate.js
// Stratégie : 3 appels Ollama séparés au lieu d'un seul prompt géant
// Un modèle 3B suit mieux des tâches simples et courtes
//
// Appel 1 → description (1 phrase)
// Appel 2 → étapes (actions visibles dans le code)
// Appel 3 → erreurs (messages copiés exactement depuis le code)

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, join } from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage : node generate.js <chemin/composant.jsx>');
  process.exit(1);
}

const componentName = basename(filePath, '.jsx');
const outputPath = join('public', 'docs', `${componentName}.json`);

// ── Lecture du fichier ──────────────────────────────────────
function readComponent(path) {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    console.error(`Fichier introuvable : ${path}`);
    process.exit(1);
  }
}

// ── Guide existant ──────────────────────────────────────────
function loadExistingGuide(outputPath) {
  if (!existsSync(outputPath)) return null;
  try {
    return JSON.parse(readFileSync(outputPath, 'utf-8'));
  } catch {
    return null;
  }
}

// ── Sanitisation ────────────────────────────────────────────
function sanitize(code) {
  return code
    .replace(/sk-[a-zA-Z0-9-]{20,}/g, '[API_KEY_REMOVED]')
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, 'Bearer [TOKEN_REMOVED]')
    .replace(/process\.env\.\w+/g, 'process.env.[REDACTED]')
    .replace(/password\s*[:=]\s*["'][^"']*["']/gi, 'password: "[REDACTED]"');
}

// ── Extraction du diff ──────────────────────────────────────
function getDiff(filePath) {
  try {
    const diff = execSync(`git diff HEAD~1 HEAD -- ${filePath}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    if (diff.trim()) return diff;
  } catch {}
  return null;
}

// ══════════════════════════════════════════════════════════════
// Appel Ollama générique avec retry
// ══════════════════════════════════════════════════════════════
async function callOllama(prompt, retries = 3) {
  const url = process.env.OLLAMA_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.2:3b';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
      });
      if (!response.ok) throw new Error(`Ollama : ${response.status}`);
      const data = await response.json();
      return data.response;
    } catch (err) {
      console.log(`  Tentative ${attempt}/${retries} échouée : ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// ══════════════════════════════════════════════════════════════
// APPEL 1 — Description
// Tâche simple : une seule phrase qui décrit ce que voit l'utilisateur
// ══════════════════════════════════════════════════════════════
async function generateDescription(code, componentName, existingDesc) {
  console.log('  [1/3] Génération de la description...');

  const context = existingDesc
    ? `Description actuelle (à conserver si toujours correcte) : "${existingDesc}"\n`
    : '';

  const prompt = `Tu es un UX writer. Lis ce code React et écris UNE seule phrase (maximum 15 mots) qui décrit ce que l'utilisateur voit et peut faire dans ce composant.

${context}
COMPOSANT : ${componentName}

CODE :
${code}

Réponds avec ce JSON exact (remplace uniquement la valeur) :
{"description": "Ta phrase ici."}

RÈGLES :
- Exactement une phrase, max 15 mots
- Décris ce que l'UTILISATEUR voit à l'écran, pas le code
- Mentionne les fonctionnalités visibles (menus, boutons, sections)
- INTERDIT de copier le template : "Ce que fait ce composant en une phrase"`;

  const raw = await callOllama(prompt);
  const json = JSON.parse(
    raw
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim(),
  );

  // Vérifie que c'est pas le template
  if (
    !json.description ||
    json.description.includes('Ce que fait ce composant')
  ) {
    throw new Error('Description invalide : le modèle a retourné le template');
  }

  return json.description;
}

// ══════════════════════════════════════════════════════════════
// APPEL 2 — Étapes
// Tâche simple : liste les actions que l'utilisateur peut faire
// ══════════════════════════════════════════════════════════════
async function generateEtapes(code, componentName, existingEtapes) {
  console.log('  [2/3] Génération des étapes...');

  const context = existingEtapes
    ? `Étapes actuelles (à mettre à jour si nécessaire) : ${JSON.stringify(existingEtapes)}\n`
    : '';

  const prompt = `Tu es un UX writer. Lis ce code React et liste les actions que l'utilisateur peut faire dans ce composant.

${context}
COMPOSANT : ${componentName}

CODE :
${code}

Réponds avec ce JSON exact :
{"etapes": ["Action 1.", "Action 2.", "Action 3."]}

RÈGLES :
- Liste UNIQUEMENT les actions visibles dans le code (clics sur boutons, navigation, interactions)
- Une action par étape, formulée du point de vue de l'utilisateur
- Commence chaque étape par un verbe d'action (Cliquez, Saisissez, Naviguez, Consultez...)
- INTERDIT d'inventer des actions absentes du code
- Si le composant a un menu de navigation, liste chaque élément du menu comme une action possible`;

  const raw = await callOllama(prompt);
  const json = JSON.parse(
    raw
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim(),
  );

  if (!Array.isArray(json.etapes) || json.etapes.length === 0) {
    throw new Error('Étapes invalides : tableau vide ou absent');
  }

  return json.etapes;
}

// ══════════════════════════════════════════════════════════════
// APPEL 3 — Erreurs
// Tâche simple : trouve les messages d'erreur dans le code
// ══════════════════════════════════════════════════════════════
async function generateErreurs(code, componentName, existingErreurs) {
  console.log('  [3/3] Génération des erreurs...');

  const context = existingErreurs
    ? `Erreurs actuelles (à conserver si toujours correctes) : ${JSON.stringify(existingErreurs)}\n`
    : '';

  const prompt = `Tu es un développeur senior. Lis ce code React et trouve UNIQUEMENT les messages d'erreur explicitement écrits dans le code (dans des chaînes de caractères, des états d'erreur, des alertes).

${context}
COMPOSANT : ${componentName}

CODE :
${code}

Réponds avec ce JSON exact :
{"erreurs": [{"message": "Texte exact du message dans le code", "explication": "Ce que l'utilisateur doit faire."}]}

RÈGLES ABSOLUES :
- Copie les messages d'erreur MOT POUR MOT depuis le code
- Si le code ne contient AUCUN message d'erreur visible, retourne : {"erreurs": []}
- INTERDIT d'inventer des messages qui ne sont pas dans le code
- INTERDIT de mettre des messages liés à d'autres composants (ex: login si c'est un dashboard)`;

  const raw = await callOllama(prompt);
  const json = JSON.parse(
    raw
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/, '')
      .trim(),
  );

  if (!Array.isArray(json.erreurs)) {
    throw new Error('Erreurs invalides : doit être un tableau');
  }

  return json.erreurs;
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n📄 Composant : ${componentName}`);
  console.log(`📁 Fichier   : ${filePath}`);
  console.log(`💾 Sortie    : ${outputPath}\n`);

  const fullCode = sanitize(readComponent(filePath));
  const diff = getDiff(filePath);
  const existingGuide = loadExistingGuide(outputPath);

  console.log(`✔ Fichier lu (${fullCode.length} caractères)`);
  console.log(diff ? '  Diff : changements détectés' : '  Diff : aucun');
  console.log(
    existingGuide ? '✔ Guide existant chargé' : '  Première génération\n',
  );

  // Si guide existant et PAS de diff → rien à faire
  if (existingGuide && !diff) {
    console.log('✅ Aucun changement détecté — guide conservé tel quel');
    return;
  }

  const description = await generateDescription(
    fullCode,
    componentName,
    existingGuide?.sections?.description,
  );
  const etapes = await generateEtapes(
    fullCode,
    componentName,
    existingGuide?.sections?.etapes,
  );
  const erreurs = await generateErreurs(
    fullCode,
    componentName,
    existingGuide?.sections?.erreurs,
  );

  const guide = {
    component: componentName,
    generated_at: new Date().toISOString(),
    sections: { description, etapes, erreurs },
  };

  writeFileSync(outputPath, JSON.stringify(guide, null, 2), 'utf-8');

  console.log(`\n✅ Guide sauvegardé : ${outputPath}`);
  console.log(`   Description : ${description}`);
  console.log(`   Étapes      : ${etapes.length}`);
  console.log(`   Erreurs     : ${erreurs.length}\n`);
}

main().catch((err) => {
  console.error('\n❌ Erreur :', err.message);
  process.exit(1);
});
