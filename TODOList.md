# TODO List

## Synthèse (onglet Analyse) — revue complète à faire

La synthèse « ne fonctionne absolument pas » (retour utilisateur) — points
probables à investiguer : valeurs TCO/dépréciation/€·km⁻¹, km interpolés sur
périodes sans odomètres, filtres par catégorie, euros constants INSEE,
graphe SVG. Faire une passe de vérification des calculs + de l'affichage
avec des données réelles, décider des corrections.

## Connexion Dropbox instable

La connexion à Dropbox fonctionne mais plante parfois — non reproductible pour
l'instant. À investiguer quand un cas de reproduction apparaît (journaliser la
console / le `state` OAuth au retour si ça se reproduit).

## Settings

- Langue, thème, unités et devise sont dans le modal des paramètres (toolbar).
  Reste éventuellement : choix de la série INSEE, provider préféré.
