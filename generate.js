// generate.js — v3 (robuste + anti bullshit + meilleur prompt)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { basename, join } from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// CONFIG
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3:8b';
const OUTPUT_DIR = 'public/docs';

const TIMEOUT_MS = 90000;
const MAX_RETRIES = 3;
const DRY_RUN = process.argv.includes('--dry-run');

// LOGGER
const log = (...a) => console.log('[LOG]', ...a);

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function readComponent(path) {
  if (!existsSync(path)) throw new Error('Fichier introuvable');
  return readFileSync(path, 'utf-8');
}

function sanitize(code) {
  return code.slice(0, 4000);
}

function getDiff(filePath) {
  try {
    const raw = execSync(`git diff HEAD~1 HEAD -- "${filePath}"`, {
      encoding: 'utf-8',
    });

    return raw
      .split('\n')
      .filter(l =>
        l.startsWith('+') &&
        !l.includes('import') &&
        !l.includes('useState') &&
        !l.includes('useEffect')
      )
      .join('\n')
      .slice(0, 2000);

  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// OLLAMA CALL
// ─────────────────────────────────────────────
async function callOllama(prompt) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, prompt, stream: false }),
        signal: controller.signal,
      });

      clearTimeout(t);

      const json = await res.json();
      return JSON.parse(json.response);

    } catch (e) {
      log('retry...', i);
      if (i === MAX_RETRIES - 1) throw e;
    }
  }
}

// ─────────────────────────────────────────────
// VALIDATION QUALITÉ
// ─────────────────────────────────────────────
function isGarbage(etapes) {
  const blacklist = [
    'consultez le code',
    'voir le code',
    'analyse le code',
    'aucune information'
  ];

  return etapes.some(e =>
    blacklist.some(b => e.toLowerCase().includes(b))
  );
}

// ─────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────
function buildPrompt(code, diff, componentName) {
  return `
Tu es un expert UX.

MISSION :
Extraire les actions utilisateur visibles dans un composant React.

IMPORTANT :
Ignore totalement la logique technique.

---

COMPOSANT : ${componentName}

DIFF PRIORITAIRE :
${diff || 'aucun'}

---

CODE :
${code}

---

RÈGLES STRICTES :

- Garde uniquement :
  boutons, inputs, navigation, menus, modals
- Ignore :
  imports, hooks, variables

- Si aucune action → retourne []

- Chaque action :
  commence par un verbe utilisateur

INTERDIT :
- phrases génériques
- mention du code

---

FORMAT STRICT :
{"description":"...","etapes":["..."],"erreurs":[]}
`;
}

// ─────────────────────────────────────────────
// FALLBACK
// ─────────────────────────────────────────────
function fallback(componentName, diff) {
  return {
    component: componentName,
    fallback: true,
    sections: {
      description: `Composant ${componentName} modifié récemment.`,
      etapes: [
        'Vérifiez les nouvelles fonctionnalités dans l’interface.',
        ...(diff ? [`Changements : ${diff.slice(0, 100)}`] : [])
      ],
      erreurs: []
    }
  };
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  const filePath = process.argv[2];
  const componentName = basename(filePath).replace(/\.(jsx|tsx|js)/, '');

  const code = sanitize(readComponent(filePath));
  const diff = getDiff(filePath);

  const prompt = buildPrompt(code, diff, componentName);

  let result;

  try {
    const data = await callOllama(prompt);

    if (!data.etapes || isGarbage(data.etapes)) {
      throw new Error('réponse LLM invalide');
    }

    result = {
      component: componentName,
      fallback: false,
      sections: data
    };

  } catch (e) {
    log('fallback triggered');
    result = fallback(componentName, diff);
  }

  if (DRY_RUN) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(
    join(OUTPUT_DIR, `${componentName}.json`),
    JSON.stringify(result, null, 2)
  );
}

main();