/**
 * Static help pages generator — renders /help/ (French, default language)
 * and /en/help/ chapter pages straight from the i18n dictionaries, so the
 * translations live in exactly one place and crawlers get real content
 * with no runtime JS. Emitted files are gitignored; run by `bun run build`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fr } from '../src/i18n/fr.js';
import { en } from '../src/i18n/en.js';
import { MOTORWAY_ICON, GEO_UNCERTAIN_ICON, dirIcon } from '../src/ui/icons.js';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const SITE = 'https://car-cost-meter.github.io';
const GITHUB_REPO = 'https://github.com/fathzer/car-cost-meter.github.io';
const GITHUB_ISSUES = `${GITHUB_REPO}/issues`;
const INSEE_GIST = 'https://gist.github.com/fathzer/5646b5558f759655717914400cc50a03';

type Dict = typeof fr;

const t = (d: Dict, key: string): string => {
  let node: unknown = d;
  for (const part of key.split('.')) node = (node as Record<string, unknown>)[part];
  if (typeof node !== 'string') throw new Error(`Missing or non-leaf i18n key: ${key}`);
  return node;
};

// Translated texts are plain strings — they must be escaped before being
// injected into HTML (e.g. "<app name>" would be parsed as a tag).
const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string): string =>
  escapeHtml(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** t() for HTML text context. */
const te = (d: Dict, key: string): string => escapeHtml(t(d, key));

/** Full HTML document — depth = path depth below web/ (css, favicon, links).
 *  canonical/altHref are absolute (hreflang convention); altRel is the
 *  relative URL to the other-language page so the switch works locally.
 *  extraHead carries the optional session-probe scripts (index pages). */
const page = (lang: 'fr' | 'en', title: string, desc: string, depth: number,
  canonical: string, altHref: string, altLang: string, altRel: string, body: string,
  extraHead = ''): string => {
  const root = '../'.repeat(depth);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${escapeAttr(desc)}">
<title>${escapeHtml(title)} — Car Cost Meter</title>
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="${root}css/variables.css">
<link rel="stylesheet" href="${root}css/help.css">
<link rel="alternate" hreflang="${lang}" href="${canonical}">
<link rel="alternate" hreflang="${altLang}" href="${altHref}">${extraHead}
</head>
<body>
<header class="help-top">
  <a class="help-home" href="${root}index.html">Car Cost Meter</a>
  <a class="help-lang" href="${altRel}">${altLang.toUpperCase()}</a>
</header>
<main class="help-page">
${body}
</main>
</body>
</html>`;
};

/** Help home — the modal's sections, as a crawlable page. `root` prefixes
 *  the legal links so they resolve from both /help/ and /en/help/. */
const indexBody = (d: Dict, root: string): string => `
<h1>${te(d, 'help.title')}</h1>
<nav class="help-toc">
  <strong>${te(d, 'help.chapters')}</strong>
${CHAPTERS.map(c => `  <a href="${c.slug}/">${te(d, c.titleKey)}</a>`).join('\n')}
</nav>
<h2>${te(d, 'help.securityTitle')}</h2>
<p>${te(d, 'help.securityClientSide')}</p>
<p>${te(d, 'help.securityStorage')}</p>
<h2>${te(d, 'help.faqTitle')}</h2>
<div class="help-faq-card">
  <h3>${te(d, 'help.faqStorageQ')}</h3>
  <p id="help-data-location" hidden><strong>${te(d, 'help.dataLocation')}</strong><code></code></p>
  <p><strong>• Dropbox</strong><br>${te(d, 'help.faqStorageDropbox')}</p>
  <p><strong>• Microsoft OneDrive</strong><br>${te(d, 'help.faqStorageOneDrive')}</p>
</div>
<div class="help-faq-card">
  <h3>${te(d, 'help.faqBugQ')}</h3>
  <p>${te(d, 'help.faqBugIntro')} <a href="${GITHUB_ISSUES}">${te(d, 'help.issuesLink')}</a>.</p>
  <p>${te(d, 'help.faqBugTips')}</p>
</div>
<div class="help-faq-card">
  <h3>${te(d, 'help.faqSourceQ')}</h3>
  <p>${te(d, 'help.faqSourceText')} <a href="${GITHUB_REPO}">${te(d, 'help.githubLink')}</a>.</p>
</div>
<h2>${te(d, 'help.sourcesTitle')}</h2>
<p>${te(d, 'help.sourcesText')}</p>
<p>${te(d, 'help.sourcesGistPre')} <a href="${INSEE_GIST}">${te(d, 'help.gistLink')}</a> ${te(d, 'help.sourcesGistPost')}</p>
<h2>${te(d, 'help.disclaimerTitle')}</h2>
<div class="help-disclaimer"><p>${te(d, 'help.disclaimerText')}</p></div>
<p class="help-links">
  <a href="${root}privacy.html">${te(d, 'help.privacy')}</a> •
  <a href="${root}terms.html">${te(d, 'help.terms')}</a>
</p>`;

/** Chapter pages — root prefixes the "try" link so it also works from a
 *  local dev server. */
const vehiculesBody = (d: Dict, root: string): string => `
<a class="help-back" href="../">${te(d, 'help.back')}</a>
<h1>${te(d, 'help.vehTitle')}</h1>
<p>${te(d, 'help.vehIntro')}</p>
<h2>${te(d, 'help.vehListTitle')}</h2>
<p>${te(d, 'help.vehList')}</p>
<h2>${te(d, 'help.vehTabsTitle')}</h2>
<p>${te(d, 'help.vehTabs')}</p>
<h2>${te(d, 'help.vehCostsTitle')}</h2>
<p>${te(d, 'help.vehCosts')}</p>
<h2>${te(d, 'help.vehAnalysisTitle')}</h2>
<p>${te(d, 'help.vehAnalysis')}</p>
<p class="help-links"><a href="${root}app/veh">${te(d, 'help.vehTry')} →</a></p>`;

const stationsBody = (d: Dict, root: string): string => `
<a class="help-back" href="../">${te(d, 'help.back')}</a>
<h1>${te(d, 'help.stationsTitle')}</h1>
<p>${te(d, 'help.stationsIntro')}</p>
<h2>${te(d, 'help.stationsDataTitle')}</h2>
<p>${te(d, 'help.stationsData')}</p>
<h2>${te(d, 'help.stationsFiltersTitle')}</h2>
<p>${te(d, 'help.stationsFilters')}</p>
<h2>${te(d, 'help.stationsCardsTitle')}</h2>
<p>${te(d, 'help.stationsCards')}</p>
<h3>${te(d, 'help.stationsIconsTitle')}</h3>
<ul class="help-legend">
  <li><span class="icon dir">${dirIcon(45)}</span><p>${te(d, 'help.stationsIconDir')}</p></li>
  <li><span class="icon">${MOTORWAY_ICON}</span><p>${te(d, 'help.stationsIconMotorway')}</p></li>
  <li><span class="icon uncertain">${GEO_UNCERTAIN_ICON}</span><p>${te(d, 'help.stationsIconUncertain')}</p></li>
</ul>
<h2>${te(d, 'help.stationsAccuracyTitle')}</h2>
<p>${te(d, 'help.stationsAccuracy')}</p>
<p class="help-links"><a href="${root}app/fuel">${te(d, 'help.stationsTry')} →</a></p>`;

const simBody = (d: Dict, root: string): string => `
<a class="help-back" href="../">${te(d, 'help.back')}</a>
<h1>${te(d, 'help.simTitle')}</h1>
<p>${te(d, 'help.simIntro')}</p>
<p class="help-todo">${te(d, 'help.simTodo')}</p>
<p class="help-links"><a href="${root}app/calc">${te(d, 'help.simTry')} →</a></p>`;

interface Chapter {
  slug: string;
  titleKey: string;
  introKey: string;
  appPath: string;
  body: (d: Dict, root: string) => string;
}

const CHAPTERS: Chapter[] = [
  { slug: 'vehicules', titleKey: 'help.vehTitle', introKey: 'help.vehIntro', appPath: 'veh', body: vehiculesBody },
  { slug: 'stations', titleKey: 'help.stationsTitle', introKey: 'help.stationsIntro', appPath: 'fuel', body: stationsBody },
  { slug: 'simulateur', titleKey: 'help.simTitle', introKey: 'help.simIntro', appPath: 'calc', body: simBody },
];

const emit = (path: string, html: string): void => {
  mkdirSync(fileURLToPath(new URL(path, `file://${webRoot}/`)), { recursive: true });
  writeFileSync(`${webRoot}/${path}/index.html`, html);
};

// Session probe (index pages only): the importmap mirrors index.html's, and
// dist/help.js is rewritten to help.js at deploy like dist/main.js is.
const sessionJs = (root: string): string => `
<script type="importmap">{"imports":{"ts-cloud-storage-manager":"${root}vendor/ts-cloud-storage-manager/index.js"}}</script>
<script type="module" src="${root}dist/help.js"></script>`;

// Help index: French at /help/ (depth 1), English at /en/help/ (depth 2).
emit('help', page('fr', t(fr, 'help.title'), t(fr, 'app.tagline'), 1,
  `${SITE}/help/`, `${SITE}/en/help/`, 'en', '../en/help/', indexBody(fr, '../'), sessionJs('../')));
emit('en/help', page('en', t(en, 'help.title'), t(en, 'app.tagline'), 2,
  `${SITE}/en/help/`, `${SITE}/help/`, 'fr', '../../help/', indexBody(en, '../../'), sessionJs('../../')));

// Chapters: /help/<slug>/ (FR, depth 2) and /en/help/<slug>/ (EN, depth 3).
for (const ch of CHAPTERS) {
  for (const lang of ['fr', 'en'] as const) {
    const d = lang === 'fr' ? fr : en;
    const prefix = lang === 'fr' ? 'help' : 'en/help';
    const other = lang === 'fr' ? 'en/help' : 'help';
    const depth = prefix.split('/').length + 1;
    emit(`${prefix}/${ch.slug}`, page(lang, t(d, ch.titleKey), t(d, ch.introKey), depth,
      `${SITE}/${prefix}/${ch.slug}/`, `${SITE}/${other}/${ch.slug}/`,
      lang === 'fr' ? 'en' : 'fr',
      `${'../'.repeat(depth)}${other}/${ch.slug}/`,
      ch.body(d, '../'.repeat(depth))));
  }
}

console.log(`Help pages generated: help/ + ${CHAPTERS.length} chapters × 2 languages`);
