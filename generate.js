// generate.js — v2
// Stratégie : 3 appels Ollama séparés + timeout + retry + validation + fallback
//
// Usage :
//   node generate.js <chemin/composant.jsx>          → génération normale
//   node generate.js <chemin/composant.jsx> --dry-run → preview sans écrire
//   GUIDE_COMMIT=abc123 node generate.js <fichier>   → rejouer un commit précis

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { basename, join } from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════
const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434';
const MODEL        = process.env.OLLAMA_MODEL  || 'llama3.2:3b';
const OUTPUT_DIR   = 'public/docs';
const TIMEOUT_MS   = 90_000;   // 90s par appel
const MAX_RETRIES  = 3;
const MIN_SCORE    = 4;         // sur 6 — en dessous : fallback template
const MAX_CODE_LEN = 4_000;    // tronque le code envoyé au modèle
const MAX_DIFF_LEN = 3_000;    // tronque le diff envoyé au modèle

const DRY_RUN = process.argv.includes('--dry-run');

// ══════════════════════════════════════════════════════════════
// LOGGER
// ══════════════════════════════════════════════════════════════
function makeLogger() {
  const ts = () => new Date().toISOString();
  return {
    info:  (...a) => console.log(`[${ts()}] ✔`, ...a),
    warn:  (...a) => console.warn(`[${ts()}] ⚠`, ...a),
    error: (...a) => console.error(`[${ts()}] ✗`, ...a),
    step:  (n, t, l) => console.log(`[${ts()}] [${n}/${t}] ${l}`),
  };
}
const log = makeLogger();

// ══════════════════════════════════════════════════════════════
// UTILS — Lecture / Sanitisation / Diff
// ══════════════════════════════════════════════════════════════
function readComponent(path) {
  if (!existsSync(path)) {
    log.error(`Fichier introuvable : ${path}`);
    process.exit(1);
  }
  return readFileSync(path, 'utf-8');
}

function sanitize(code) {
  return code
    .replace(/sk-[a-zA-Z0-9-]{20,}/g,              '[API_KEY_REMOVED]')
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/g,           'Bearer [TOKEN_REMOVED]')
    .replace(/process\.env\.\w+/g,                  'process.env.[REDACTED]')
    .replace(/password\s*[:=]\s*["'][^"']*["']/gi,  'password: "[REDACTED]"');
}

function loadExistingGuide(outputPath) {
  if (!existsSync(outputPath)) return null;
  try {
    return JSON.parse(readFileSync(outputPath, 'utf-8'));
  } catch {
    return null;
  }
}

function getDiff(filePath) {
  try {
    // Permet de rejouer un commit précis via GUIDE_COMMIT=abc123
    const ref = process.env.GUIDE_COMMIT
      ? `${process.env.GUIDE_COMMIT}~1 ${process.env.GUIDE_COMMIT}`
      : 'HEAD~1 HEAD';
    const raw = execSync(`git diff ${ref} -- "${filePath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    // Nettoie le diff : conserve seulement les lignes utiles
    const cleaned = raw
      .split('\n')
      .filter(l => {
        if (l.startsWith('diff --git'))  return false;
        if (l.startsWith('index '))      return false;
        if (l.match(/^@@.*@@/))          return true;
        if (l.startsWith('+') || l.startsWith('-')) return true;
        return false;
      })
      .join('\n');
    return cleaned.trim() || null;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// UTILS — Extraction JSON robuste depuis réponse LLM
// ══════════════════════════════════════════════════════════════
function extractJSON(raw) {
  // 1. Tentative directe
  try { return JSON.parse(raw.trim()); } catch {}

  // 2. Retire les balises ```json ... ```
  const stripped = raw
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try { return JSON.parse(stripped); } catch {}

  // 3. Extrait le premier objet JSON dans la chaîne
  const match = raw.match(/(\{[\s\S]+\})/);
  if (match) {
    try { return JSON.parse(match[1]); } catch {}
  }

  throw new Error(`JSON invalide retourné par le modèle : ${raw.slice(0, 200)}`);
}

// ══════════════════════════════════════════════════════════════
// APPEL OLLAMA — avec timeout + retry + backoff
// ══════════════════════════════════════════════════════════════
async function callOllama(prompt, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model: MODEL, prompt, stream: false, format: 'json' }),
        signal:  controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.response;

    } catch (err) {
      clearTimeout(timer);
      const reason = err.name === 'AbortError' ? `Timeout (${TIMEOUT_MS / 1000}s)` : err.message;
      log.warn(`Tentative ${attempt}/${retries} échouée : ${reason}`);
      if (attempt === retries) throw new Error(`Ollama indisponible après ${retries} tentatives`);
      await new Promise(r => setTimeout(r, 2_000 * attempt)); // backoff exponentiel
    }
  }
}

// ══════════════════════════════════════════════════════════════
// APPEL 1 — Description (1 phrase, max 15 mots)
// ══════════════════════════════════════════════════════════════
async function generateDescription(code, componentName, existingDesc) {
  const context = existingDesc
    ? `Description actuelle (conserve-la si toujours correcte) : "${existingDesc}"\n`
    : '';

  const prompt = `Tu es un UX writer. Lis ce code React et écris UNE seule phrase (maximum 15 mots) qui décrit ce que l'utilisateur voit et peut faire dans ce composant.

${context}COMPOSANT : ${componentName}

CODE :
${code.slice(0, MAX_CODE_LEN)}

Réponds avec ce JSON exact (remplace uniquement la valeur) :
{"description": "Ta phrase ici."}

RÈGLES ABSOLUES :
- Exactement une phrase, max 15 mots
- Décris ce que l'UTILISATEUR voit à l'écran, pas le code
- Mentionne les fonctionnalités visibles (menus, boutons, sections)
- INTERDIT de retourner le template littéral comme réponse`;

  const raw = await callOllama(prompt);
  const json = extractJSON(raw);

  if (!json.description || json.description.includes('Ta phrase ici')) {
    throw new Error('Description invalide : le modèle a retourné le template');
  }

  return json.description.trim();
}

// ══════════════════════════════════════════════════════════════
// APPEL 2 — Étapes (actions visibles dans le code)
// ══════════════════════════════════════════════════════════════
async function generateEtapes(code, componentName, existingEtapes, diff) {
  const context = existingEtapes?.length
    ? `Étapes actuelles (mets à jour si le diff le justifie) : ${JSON.stringify(existingEtapes)}\n`
    : '';

  const diffBlock = diff
    ? `\nDIFF DES CHANGEMENTS RÉCENTS :\n${diff.slice(0, MAX_DIFF_LEN)}\n`
    : '';

  const prompt = `Tu es un UX writer. Lis ce code React et liste les actions que l'utilisateur peut faire.

${context}COMPOSANT : ${componentName}
${diffBlock}
CODE :
${code.slice(0, MAX_CODE_LEN)}

Réponds avec ce JSON exact :
{"etapes": ["Action 1.", "Action 2.", "Action 3."]}

RÈGLES ABSOLUES :
- Liste UNIQUEMENT les actions visibles dans le code (clics, navigation, saisie)
- Une action par étape, du point de vue de l'utilisateur
- Commence chaque étape par un verbe (Cliquez, Saisissez, Naviguez, Consultez...)
- INTERDIT d'inventer des actions absentes du code
- Si menu de navigation : liste chaque élément comme action possible`;

  const raw = await callOllama(prompt);
  const json = extractJSON(raw);

  if (!Array.isArray(json.etapes) || json.etapes.length === 0) {
    throw new Error('Étapes invalides : tableau vide ou absent');
  }

  return json.etapes.map(e => String(e).trim());
}

// ══════════════════════════════════════════════════════════════
// APPEL 3 — Erreurs (messages copiés depuis le code)
// ══════════════════════════════════════════════════════════════
async function generateErreurs(code, componentName, existingErreurs) {
  const context = existingErreurs?.length
    ? `Erreurs actuelles (conserve si toujours dans le code) : ${JSON.stringify(existingErreurs)}\n`
    : '';

  const prompt = `Tu es un développeur senior. Trouve UNIQUEMENT les messages d'erreur explicitement écrits dans ce code React (dans des chaînes, des états, des alertes).

${context}COMPOSANT : ${componentName}

CODE :
${code.slice(0, MAX_CODE_LEN)}

Réponds avec ce JSON exact :
{"erreurs": [{"message": "Texte exact du message dans le code", "explication": "Ce que l'utilisateur doit faire."}]}

RÈGLES ABSOLUES :
- Copie les messages d'erreur MOT POUR MOT depuis le code
- Si AUCUN message d'erreur dans le code → {"erreurs": []}
- INTERDIT d'inventer des messages
- INTERDIT de mettre des messages d'autres composants`;

  const raw = await callOllama(prompt);
  const json = extractJSON(raw);

  if (!Array.isArray(json.erreurs)) {
    throw new Error('Erreurs invalides : doit être un tableau');
  }

  return json.erreurs;
}

// ══════════════════════════════════════════════════════════════
// VALIDATION — Score qualité du guide généré
// ══════════════════════════════════════════════════════════════
function scoreGuide({ sections }) {
  const { description, etapes, erreurs } = sections;

  const checks = {
    description_presente:     typeof description === 'string' && description.length > 10,
    description_pas_template: !description?.includes('Ta phrase ici'),
    etapes_presentes:         Array.isArray(etapes) && etapes.length > 0,
    etapes_verbes:            etapes?.some(e => /^(Cliquez|Saisissez|Naviguez|Consultez|Sélectionnez|Ouvrez|Fermez)/i.test(e)),
    erreurs_valides:          Array.isArray(erreurs),
    pas_de_placeholder:       !JSON.stringify(sections).includes('[INSERT'),
  };

  const score = Object.values(checks).filter(Boolean).length;
  return { score, max: Object.keys(checks).length, checks };
}

// ══════════════════════════════════════════════════════════════
// FALLBACK — Guide minimal si la génération échoue
// ══════════════════════════════════════════════════════════════
function generateFallback(componentName, diff) {
  const changedLines = (diff || '')
    .split('\n')
    .filter(l => l.startsWith('+') && !l.startsWith('+++'))
    .slice(0, 8)
    .map(l => l.slice(1).trim())
    .filter(Boolean);

  log.warn('Utilisation du guide fallback (génération LLM échouée)');

  return {
    component:    componentName,
    generated_at: new Date().toISOString(),
    fallback:     true,
    sections: {
      description: `Composant ${componentName} récemment modifié.`,
      etapes: [
        'Consultez le code source pour les actions disponibles.',
        ...(changedLines.length ? [`Changements récents : ${changedLines.slice(0, 3).join(', ')}`] : []),
      ],
      erreurs: [],
    },
  };
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  const filePath = process.argv.find(a => a.endsWith('.jsx') || a.endsWith('.js') || a.endsWith('.tsx'));

  if (!filePath) {
    log.error('Usage : node generate.js <chemin/composant.jsx> [--dry-run]');
    process.exit(1);
  }

  const componentName = basename(filePath, '.jsx').replace(/\.(js|tsx)$/, '');
  const outputPath    = join(OUTPUT_DIR, `${componentName}.json`);

  console.log(`\n📄 Composant : ${componentName}`);
  console.log(`📁 Fichier   : ${filePath}`);
  console.log(`💾 Sortie    : ${outputPath}`);
  if (DRY_RUN) console.log('🔍 Mode      : DRY RUN (rien ne sera écrit)\n');

  const fullCode     = sanitize(readComponent(filePath));
  const diff         = getDiff(filePath);
  const existingGuide = loadExistingGuide(outputPath);

  log.info(`Fichier lu (${fullCode.length} caractères)`);
  log.info(diff ? `Diff détecté (${diff.length} caractères)` : 'Pas de diff (première génération ou commit unique)');
  if (existingGuide) log.info('Guide existant chargé');

  // Court-circuit : aucun changement et guide déjà présent
  if (existingGuide && !diff && !process.env.GUIDE_COMMIT) {
    log.info('Aucun changement détecté — guide conservé tel quel');
    return;
  }

  let guide;

  try {
    log.step(1, 3, 'Génération de la description...');
    const description = await generateDescription(fullCode, componentName, existingGuide?.sections?.description);

    log.step(2, 3, 'Génération des étapes...');
    const etapes = await generateEtapes(fullCode, componentName, existingGuide?.sections?.etapes, diff);

    log.step(3, 3, 'Génération des erreurs...');
    const erreurs = await generateErreurs(fullCode, componentName, existingGuide?.sections?.erreurs);

    guide = {
      component:    componentName,
      generated_at: new Date().toISOString(),
      model:        MODEL,
      fallback:     false,
      sections:     { description, etapes, erreurs },
    };

    // Validation qualité
    const { score, max, checks } = scoreGuide(guide);
    log.info(`Score qualité : ${score}/${max}`);

    if (score < MIN_SCORE) {
      log.warn(`Score insuffisant (${score}/${max}) — basculement sur le fallback`);
      log.warn('Détail :', JSON.stringify(checks, null, 2));
      guide = generateFallback(componentName, diff);
    }

  } catch (err) {
    log.error(`Erreur de génération : ${err.message}`);
    log.warn('Basculement sur le guide fallback...');
    guide = generateFallback(componentName, diff);
  }

  // Affichage dry-run
  if (DRY_RUN) {
    console.log('\n══════════════════ DRY RUN — RÉSULTAT ══════════════════\n');
    console.log(JSON.stringify(guide, null, 2));
    console.log('\n═══════════════════════════════════════════════════════\n');
    return;
  }

  // Écriture
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(outputPath, JSON.stringify(guide, null, 2), 'utf-8');

  console.log(`\n✅ Guide sauvegardé : ${outputPath}`);
  console.log(`   Description : ${guide.sections.description}`);
  console.log(`   Étapes      : ${guide.sections.etapes.length}`);
  console.log(`   Erreurs     : ${guide.sections.erreurs.length}`);
  console.log(`   Fallback    : ${guide.fallback}\n`);
}

main().catch(err => {
  log.error('Erreur fatale :', err.message);
  process.exit(1);
});