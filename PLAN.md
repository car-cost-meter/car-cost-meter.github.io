# Car Cost Meter — megaplan de l'application

Roadmap complète par étapes pour construire l'application : PWA en TypeScript pur (architecture calquée sur mon-patrimoine) de suivi des coûts de possession de véhicules, avec stockage Dropbox/OneDrive + démo read-only via ts-cloud-storage-manager, coûts kilométriques et TCO avec revente interpolée, rappels de contrôle technique, simulateur avant achat, inflation INSEE (France), i18n FR/EN, landing + mode démo — moteur de consommation reporté en fin de roadmap, sa conception restant à discuter.

## Contexte et décisions arrêtées

Référence architecturale : `mon-patrimoine` (même stack : TS pur sans bundler, Bun, `ts-cloud-storage-manager` vendored, GitHub Pages, PWA, `tsc` → `dist/` + importmap).

Décisions prises avec l'utilisateur :

- **Providers cloud** : Dropbox + OneDrive uniquement (pas Google Drive) + provider **démo read-only** alimenté par un fichier d'exemple publié sur un Gist.
- **Périodes de prêt/location/vol et appoints sans volume** → tranches de **consommation inconnue** (pas d'extrapolation).
- **Type d'énergie** : `fuel | electric | hybrid` — la seule distinction utile est le(s) flux d'énergie (litres, kWh, les deux). Pas de sous-type essence/diesel/GPL ; un `fuelLabel` libre optionnel (essence/diesel/GPL/E85…) peut être gardé à titre purement informatif.
- **Hybride** : deux métriques séparées — L/100km et kWh/100km ; le coût au km agrège les deux.
- **Unités** : localisées par défaut selon la langue (FR → km + L/100km ; EN → mi + mpg) **et** configurables dans les settings.
- **Devise** : symbole configurable dans les settings (pas de conversion). L'inflation repose sur les indices INSEE → fonctionnalité **explicitement étiquetée France / €** dans l'UI et les docs.
- **Landing + mode démo** comme dans mon-patrimoine.
- **Données de démo produites tôt** (dès le modèle fixé) pour visibiliser l'IHM ; **rappel CT avancé** (besoin personnel) ; **moteur de consommation reporté** — sa conception fera l'objet d'une discussion dédiée (« entre pleins » jugé non optimal, notamment pour les EV).
- **Livrables** : `PLAN.md` versionné dans le repo, implémentation par étapes.

## Architecture cible

```text
car-cost-meter.github.io/
  APPLICATION.md            # spec (complétée : décisions ci-dessus)
  PLAN.md                   # ce plan, versionné
  README.md                 # présentation + notes dev (tenu à jour)
  demo/demo.json            # dataset démo généré, publié sur Gist
  scripts/make_demo_data.ts # générateur du dataset démo
  scripts/vendor-csm.sh     # vendoring de la lib (copié de mon-patrimoine)
  .github/workflows/deploy.yml
  web/
    index.html              # landing statique indexable (aucun CSS/JS inline)
    app/index.html          # shell de l'app (<base href="../">, importmap)
    privacy.html, terms.html
    favicon.svg, manifest.json, sw.template.js
    css/main.css            # design tokens, thèmes clair/sombre, utilitaires
    package.json            # dep "ts-cloud-storage-manager": "file:../ts-cloud-storage-manager"
    tsconfig.json, tsconfig.test.json   # copiés de mon-patrimoine
    vendor/ts-cloud-storage-manager/    # dist .js vendored (bun run vendor)
    src/
      main.ts               # boot landing vs app, config providers, SW
      core/    AppStore.ts, EventBus.ts, I18n.ts, settings.ts, units.ts,
               inflation.ts, dates.ts
      domain/  Vehicle.ts, events.ts (types + helpers datés),
               consumption.ts, costs.ts, mergePolicy.ts, payload.ts
      i18n/    fr.ts, en.ts
      ui/      composants autonomes (classe TS ; markup + CSS encapsulés
               dans le fichier — jamais de CSS/JS dans index.html)
    tests/                  # tests hors src/
```

Points d'architecture repris de mon-patrimoine : `EventBus` typé, `AppStore` (état + hydrate/export + save via `storageManager.save`), `SyncBanner`, `ConfirmDialog`, `datedInput`, Service Worker `sw.template.js` avec `BUILD_HASH` injecté par le workflow, `deploy.yml` qui checkout `fathzer/ts-cloud-storage-manager` (branche `first`), le build, puis assemble `_site/` (dist aplati, `dist/main.js`→`main.js`, vendor, css, pages, sw avec hash, `.nojekyll`).

## Modèle de données — `car-cost-meter.json`

```jsonc
{
  "version": "1.0",
  "vehicles": [{
    "id": "uuid",
    "name": "...",
    "energyType": "fuel" | "electric" | "hybrid", // = flux litres | kWh | les deux
    "fuelLabel": "Diesel",                          // optionnel, purement informatif
    "acquisitionDate": "YYYY-MM-DD",
    "initialOdometerKm": 0,            // km — unité canonique de stockage
    "purchasePrice": 12345,
    "inspectionPeriodMonths": 24,      // défaut 24, modifiable
    "resaleValues": [{ "date", "value" }],           // estimations datées
    "fuelUps": [{ "id", "date", "odometerKm"?, "volumeLitres"?, "amount"?, "full": true }],
    "charges":  [{ "id", "date", "odometerKm"?, "kwh"?, "amount"?, "full"?: true }], // electric/hybrid
    "loanPeriods": [{ "id", "from", "to", "note"? }], // prêt/location/vol
    "costs": [{ "id", "date", "category": "acquisition|maintenance|inspection|insurance|fuel|other",
                "amount", "comment"?, "odoKm"? }],
    "updatedAt": "ISO"                 // horodatage pour le merge par grains
  }]
}
```

- Le **grain de merge = le véhicule** (spec : réconciliation par véhicule). La `MergePolicy` ({ base, local, remote } → merged | UNRECONCILABLE) apparie les véhicules par `id` : modifié d'un seul côté → ce côté gagne ; des deux côtés → **merge intra-véhicule** : union des collections d'événements par `id` (événements traités comme immuables — une édition = nouveau contenu sous même id, l'écart scalaire tranché par `updatedAt`) ; conflit uniquement sur les scalaires du véhicule (nom, params) modifiés des deux côtés → UNRECONCILABLE → UI de résolution (reprendre le pattern SyncBanner + dialogue de mon-patrimoine).
- **Settings hors fichier** : `localStorage` (langue, thème, unités, devise, série INSEE choisie, provider préféré).

## Étapes

### Étape 0 — Socle du repo

- `package.json` (bun, typescript, `file:` dep vers `../ts-cloud-storage-manager`, scripts `dev/build/test/typecheck/vendor` + `postinstall`), `tsconfig*.json` copiés, `.gitignore`, `scripts/vendor-csm.sh`.
- `APPLICATION.md` complété avec les décisions tranchées ; `README.md` amorcé.
- Vérif : `bun install` + `bun run build` compilent un `main.ts` trivial.

### Étape 1 — Landing, shell applicatif, i18n, thème, settings, unités

- `index.html` landing statique (cartes de présentation, boutons « Se connecter » / « Tester la démo », footer aide/CGU/confidentialité) — contenu lisible sans JS.
- `app/index.html` : `<base href="../">`, importmap `ts-cloud-storage-manager` → `./vendor/...`, `<div id="app-root">`, `dist/main.js`.
- `core/I18n.ts` : version **multi-langue** de celle de mon-patrimoine — dictionnaires `fr.ts`/`en.ts` imbriqués (format compatible export Crowdin), détection `navigator.language`, override settings, `t()`, `formatDate()` localisé. `lang="fr|en"` posé sur `<html>`.
- `core/settings.ts` : petit store localStorage typé (langue, thème, unités, devise, série CPI).
- Thèmes clair/sombre : `prefers-color-scheme` par défaut + override settings ; tokens CSS custom properties sur `:root`/`body.light-theme|dark-theme`.
- `core/units.ts` : distance km/mi, volume L/gal, consommation L/100km ↔ mpg, kWh/100km ↔ kWh/mi ; formatage `I18n`-aware ; conversions au **formatage uniquement** (stockage toujours métrique).
- Vérif : tests `bun test` (i18n fallback, conversions mpg↔L/100km), rendu landing en FR et EN.

### Étape 2 — Modèle de domaine + AppStore

- `domain/events.ts` : types des collections datées + helpers (`sortByDate`, `recordById`, tombstones éventuels), `compareDates`, `todayString` (généraliser `DatedHistory` de mon-patrimoine).
- `domain/Vehicle.ts` : classe par véhicule (ajout/édition/suppression d'événements, dernier CT = dernière entrée de coût catégorie `inspection`, prochain CT = +`inspectionPeriodMonths`).
- `domain/payload.ts` : `ExportPayload`, `_getDefaultData()`, hydrate/migration `version`.
- `core/AppStore.ts` + `EventBus` : état `vehicles[]`, `state:changed`, `save:error`, save → `storageManager.save(exportPayload)` ; `loginDemo()` via `ReadOnlyProvider`.
- Vérif : tests unitaires modèle (sérialisation round-trip, tri, édition rétroactive).

### Étape 3 — Données de démo (avancée — dès le modèle fixé)

- `scripts/make_demo_data.ts` : génère `demo/demo.json` — dataset riche (ex. véhicule thermique avec période de prêt, un EV, un hybride, historiques et reventes datées) ; publication manuelle sur Gist → `DEMO_DATA_URL`.
- Câblage `ReadOnlyProvider(DEMO_DATA_URL)` + bandeau « Mode démo — modifications non sauvegardées » piloté par `provider.isReadOnly()` ; entrée `app/?demo` depuis la landing.
- **Intérêt** : toute l'UI suivante se développe et se vérifie sur données réelles.
- Vérif : chargement du gist en mode démo, read-only effectif.

### Étape 4 — Stockage cloud + sync + merge par véhicule

- `main.ts` : `STORAGE_CONFIG = { fileName: 'car-cost-meter.json', dropbox: { appKey }, oneDrive: { clientId }, sync: { policy: mergePolicy, eagerPull: false } }` — déclarer les apps Dropbox/OneDrive (PKCE) et documenter les consoles dans README (copier les sections de mon-patrimoine ; URIs de redirect `<origine>/app/`).
- `domain/mergePolicy.ts` : merge par véhicule décrit plus haut + tests (véhicules disjoints auto-merge, conflit scalaire → UNRECONCILABLE).
- Picker provider (Dropbox/OneDrive/démo) — flow redirect+PKCE géré par la lib (`authenticate`/`resumeAuth`).
- Vérif : tests mergePolicy ; `bun test` vert ; parcours auth Dropbox en local.

### Étape 5 — UI véhicules (CRUD)

- `ui/DashboardView.ts` : liste des véhicules (carte par véhicule : nom, type d'énergie, km total), bouton ajouter.
- `ui/VehicleEditor.ts` : formulaire création/édition (nom, énergie, label carburant optionnel, date d'acquisition, km initial, prix d'achat, périodicité CT) — composant autonome, markup + CSS dans le fichier.
- Suppression véhicule et de toute donnée via `ConfirmDialog` (spec : effacement après confirmation) ; `ui/icons.ts`.
- Vérif : parcours manuel complet sur données démo + tests store.

### Étape 6 — Rappel de contrôle technique (avancé — facile, besoin personnel)

- Prochain CT = dernier coût catégorie `inspection` + `inspectionPeriodMonths` ; pastille d'échéance sur la carte véhicule (vert/orange/rouge selon proximité), date dans le détail.
- Vérif : tests dates limites (aucun CT, CT récent, CT proche, CT dépassé) ; affichage mobile sur données démo.

### Étape 7 — Saisie des événements

- `ui/VehicleDetailView.ts` : onglets/listes par type d'événement, triées par date, édition/suppression (confirm).
- Éditeurs : `FuelUpEditor`/`ChargeEditor` (odo optionnel, volume/kWh optionnel, montant, flag « plein/charge complète »), `CostEditor` (catégorie, montant, date, commentaire, odo optionnel), `ResaleValueEditor` (estimations datées), `LoanPeriodEditor` (from/to/note).
- Vérif : saisie multi-types, correction rétroactive, persistance + sync.

### Étape 8 — Moteur de coûts + vues

`domain/costs.ts` :

- Valeur de revente à une date = interpolation linéaire entre points `resaleValues` (1er point = prix d'achat à `acquisitionDate`) — approximation marquée TODO comme demandé.
- **TCO annuel** par véhicule : Σ coûts de l'année (hors acquisition brute) + dépréciation de l'année = `valeurRevente(début) − valeurRevente(fin)`.
- **Coût au km** : coûts filtrés / km parcourus sur la période (km dérivés des odomètres connus ; période sans odomètres → km indisponible, affiché comme tel).
- Vues : `ui/CostsView.ts` — tableau annuel par véhicule, filtre par catégories (checkboxes), détail par catégorie sur période libre (deux dates), graphes SVG d'évolution annuelle (pattern `HistoryChartView` de mon-patrimoine).
- Vérif : tests d'interpolation, TCO, €/km, filtres.

### Étape 9 — Inflation (INSEE, France/€)

- `core/inflation.ts` : fetch des séries du Gist INSEE (mêmes `insee-<idbank>.json` que mon-patrimoine), cache mémoire, conversion montant(date)→montant constant.
- Toggle « euros constants » dans les vues de coûts ; libellé précisant que l'indice est français (INSEE) — badge « France ».
- Vérif : tests de conversion, état sans réseau.

### Étape 10 — Simulateur avant achat

- `ui/SimulatorView.ts` : formulaire d'hypothèses (prix d'achat, revente à date, km/an, loyer, crédit montant+durée+taux, conso estimée, prix énergie) → coût annuel projeté et coût/km ; indépendant des véhicules saisis, calcul via `domain/costs.ts`/`consumption.ts` réutilisés.
- Vérif : tests du calcul de crédit (annuités) et du scénario complet.

### Étape 11 — Moteur de consommation — ⚠ conception à discuter avant implémentation

- **Session de design préalable requise** : l'approche « uniquement entre deux pleins » est jugée non optimale (cas typique des EV qui ne font jamais le plein) ; le modèle n'est pas encore arrêté. Pistes à explorer ensemble : fenêtres bornées par les odomètres quel que soit le type d'appoint, niveau de confiance connu/estimé/inconnu, traitement des charges partielles…
- `domain/consumption.ts` implémentée ensuite selon la conception retenue, pure et testée ; tranches « inconnues » pour périodes de prêt et appoints sans volume (décision déjà arrêtée).
- UI : tuile consommation dans la fiche véhicule + graphe d'évolution par segments ; hybride : L/100km **et** kWh/100km.
- Vérif : jeu de tests conséquent couvrant les cas limites retenus.

### Étape 12 — Finitions PWA + polish + déploiement

- `manifest.json` (icônes maskable), `sw.template.js` (network-first comme mon-patrimoine), vérif installabilité (Chrome/Android + iOS).
- Responsive mobile-first, revue contrastes des deux thèmes, `robots noindex` sur `app/` ; landing complétée (textes FR/EN, liens `app/?connect` / `app/?demo`), `privacy.html`/`terms.html`.
- Workflow `deploy.yml` adapté (même squelette que mon-patrimoine, sans Google) ; README complet (dev, tests, consoles Dropbox/OneDrive, Gist démo, INSEE).

## Fichiers principaux

- Ce repo — tout à créer (squelette ci-dessus).
- Repo `ts-cloud-storage-manager` — **consommé tel quel** (aucune modif prévue ; `ReadOnlyProvider`, `SyncEngine`, providers Dropbox/OneDrive existent déjà).
- Réutilisation par **copie/adaptation** depuis mon-patrimoine : `EventBus`, patron `AppStore`, `SyncBanner`, `ConfirmDialog`, `datedInput`, `icons`, patron de charts SVG, `vendor-csm.sh`, `deploy.yml`, `tsconfig*`, `sw.template.js`.

## Vérification

- [ ] `bun test` vert à chaque étape (tests colocalisés `*.test.ts` + `tests/`, typecheck via `tsconfig.test.json`)
- [ ] `bun run typecheck` (`tsc --noEmit` + projet test)
- [ ] Parcours manuels en `bun run dev` : auth Dropbox/OneDrive, démo, hors-ligne → sync, conflit multi-appareils (PC+téléphone, spec)
- [ ] Build + `deploy.yml` : site servi sur `fathzer.github.io/car-cost-meter.github.io/` (chemins relatifs — fonctionne quel que soit le base path)

## Risques / points ouverts

- **Spec partielle** : la section « calcul de la consommation » contient un `//TODO` et l'approche « entre pleins » est remise en question — l'étape 11 démarre par une **session de conception dédiée** ; `APPLICATION.md` sera mis à jour au fil des décisions.
- **Conflit intra-véhicule** : le merge unionne les événements par `id` ; un conflit de scalaires parque chez l'utilisateur (UNRECONCILABLE) — cohérent avec la lib.
- **Interpolation de revente** : approximation assumée par la spec (TODO conservé dans le code + doc).
- **CT = dernière entrée catégorie « Contrôles »** : simple, sans double saisie ; si une entrée de cette catégorie n'est pas un CT, la date de rappel peut être faussée → à confirmer.
- **Multi-onglets** : `BroadcastChannel`/Web Locks non implémentés dans la lib aujourd'hui — hors scope v1.
- Les identifiants OAuth (Dropbox app key, OneDrive client id) devront être créés dans les consoles respectives (étape 4).
