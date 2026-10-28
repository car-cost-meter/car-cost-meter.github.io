# car-cost-meter

Une application web (Desktop et mobile) pour calculer les coûts réels de propriété d'un véhicule : acquisition, entretien, contrôles techniques, assurance, carburant/électricité — avec la consommation, le coût au kilomètre et le coût total de possession annuel, corrigés de l'inflation (indices INSEE).

Application en TypeScript pur (sans framework), installable comme PWA. Les données vivent dans un fichier `car-cost-meter.json` sur l'espace de stockage cloud de l'utilisateur (Dropbox ou Microsoft OneDrive), synchronisées hors-ligne et multi-appareils via [ts-cloud-storage-manager](https://github.com/fathzer/ts-cloud-storage-manager). Un mode démo en lecture seule permet d'essayer l'application sans compte.

Le cahier des charges est dans [APPLICATION.md](APPLICATION.md), la roadmap dans [PLAN.md](PLAN.md).

## Notes développeurs

### Lancer l'application en local

L'application est écrite en TypeScript et doit être compilée avant d'être servie.
Le projet utilise [Bun](https://bun.sh/) comme gestionnaire de paquets et pour les tests.

La dépendance `ts-cloud-storage-manager` est attendue dans un dépôt frère (`../ts-cloud-storage-manager`, typiquement via un lien symbolique à la racine du repo) — comme dans mon-patrimoine.

```bash
cd web
bun install
bun run dev
```

Puis ouvrir http://localhost:5500 dans votre navigateur (`/app/` pour l'application).

`bun run dev` lance `tsc --watch` (recompilation automatique) et un serveur HTTP statique sur le port 5500.

### Tests

```bash
cd web
bun test
```

### Typecheck

```bash
cd web
bun run typecheck
```

### Données de démonstration

`bun scripts/make_demo_data.ts` génère `demo/demo.json` — une flotte fictive réaliste (Golf TDI avec période de prêt et appoint sans volume, Zoe électrique, Captur E-Tech hybride) — et sa copie `web/demo.json` utilisée comme repli.

Le premier fichier est destiné à être publié sur un Gist public dont l'URL *raw* alimente le **mode démo** (`DEMO_GIST_URL` dans `web/src/core/AppStore.ts` — placeholder `TODO-demo-gist` tant que le Gist n'est pas créé). En attendant, ou si le Gist est inaccessible, l'application retombe sur la copie embarquée `demo.json`.

Le bouton « ou tester Car Cost Meter en mode démo » de l'écran de connexion charge ces données via un `ReadOnlyProvider` — les modifications ne sont pas sauvegardées (bandeau orange en haut d'écran).

### Dropbox

L'intégration Dropbox utilise un flow OAuth2 par redirection avec PKCE (client public, sans secret applicatif). Pour déclarer l'application dans la [console Dropbox](https://www.dropbox.com/developers/console/apps) :

1. Créez une application avec l'API **Dropbox API**, le type d'accès **App folder** (ce choix est définitif) et le nom de votre choix.
2. Dans l'onglet **Settings** :
   - Activez l'option **Allow public clients (PKCE)** — l'application est un client public JavaScript.
   - Ajoutez chaque URL de retour dans **Redirect URIs**, en correspondance exacte avec `<origine>/app/?connect=dropbox`, par exemple :
     - `http://localhost:5500/app/?connect=dropbox` pour le serveur de développement
     - `https://mon-domaine.com/app/?connect=dropbox` pour un hébergement en ligne
   - Attention : Dropbox refuse les query strings non « form-urlencoded » dans ces URIs — une URI se terminant par `?connect` (sans `=`) est refusée, d'où le `?connect=dropbox` qui identifie en prime le provider au retour.
3. Dans l'onglet **Permissions**, cochez `account_info.read`, `files.content.read` et `files.content.write`.
4. Reportez l'**App key** (pas le secret) dans `web/src/main.ts` (`DROPBOX_APP_KEY` — placeholder `TODO-dropbox-app-key`).

En statut *Development*, seul le compte du développeur peut lier l'application par défaut ; le bouton **Enable additional users** porte la limite à 500 comptes.

### Microsoft OneDrive

L'intégration OneDrive utilise un flow OAuth2 par redirection avec PKCE (client public, sans secret applicatif), via l'endpoint `consumers` — l'application ne cible que les comptes Microsoft personnels (OneDrive Personal). Pour déclarer l'application dans le [portail Microsoft Entra](https://entra.microsoft.com/) (*App registrations*) :

1. Créez une application avec les types de comptes **Personal Microsoft accounts only** (ou incluant les comptes personnels).
2. Ajoutez une plateforme de type **Single-page application** — c'est ce type de plateforme qui autorise le flow code + PKCE sans secret.
   - Déclarez chaque URL de retour, en correspondance exacte avec `<origine>/app/`, par exemple :
     - `http://localhost:5500/app/` pour le serveur de développement
     - `https://mon-domaine.com/app/` pour un hébergement en ligne
   - Attention : Microsoft interdit les query strings dans les URIs de redirection SPA — pas de `?connect=onedrive` (le nom du provider est transporté par le paramètre `state` à la place).
3. Dans **API permissions**, ajoutez les autorisations déléguées Microsoft Graph `Files.ReadWrite.AppFolder`, `User.Read` et `offline_access`.
4. Reportez l'**Application (client) ID** dans `web/src/main.ts` (`ONEDRIVE_CLIENT_ID` — placeholder `TODO-onedrive-client-id`).

### Déploiement

Le workflow `.github/workflows/deploy.yml` compile l'application (avec la librairie `ts-cloud-storage-manager` clonée depuis son dépôt) et publie le site sur GitHub Pages à chaque push sur `main`. Les chemins sont relatifs — le site fonctionne quel que soit le base path.
