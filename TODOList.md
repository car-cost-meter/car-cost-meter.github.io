# TODO List

## Synthèse (onglet Analyse) — revue complète à faire

Points probables à investiguer :
- Valeurs  de dépréciation en euros constants INSEE
- Graphe SVG
- Récapitualtif final qui semble incomplet. Peut-être que la plage de date pourrait aussi filtrer le reste de la page.

## Connexion Dropbox instable

La connexion à Dropbox fonctionne mais plante parfois — non reproductible pour
l'instant. À investiguer quand un cas de reproduction apparaît (journaliser la
console / le `state` OAuth au retour si ça se reproduit).

Il faut aussi vérifier si la re-connexion via `app/?connect=dropbox` fonctionne en automatique (pas de
dialogue de connexion), une fois l'application passée en production.  
Actuellement, le comportement est différent de celui de mon-patrimoine : On passe par le dialogue de validation de Dropbox.
Mais c'est peut-être dû au statut *développement* de l'application.

## Settings

- Langue, thème, unités et devise sont dans le modal des paramètres (toolbar).
  Reste éventuellement : choix de la série INSEE, provider préféré.
