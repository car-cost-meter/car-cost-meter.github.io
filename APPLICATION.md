# Application de calcul des coûts de propriété d'un véhicule

Cette application permet de calculer les coûts de propriété d'un véhicule en tenant compte des différents coûts associés à la propriété d'un véhicule (achat, entretien, assurance, carburant, etc.).

## Fonctionnalités

### Suivi véhicule

L'application permet de suivre les informations d'autant de véhicules que l'utilisateur le souhaite.
Chaque véhicule peut être configuré avec ses propres paramètres (type de carburant, etc.).
On peut considérer que les véhicules sont des "objets" fonctionnels distincts.

Lors de la création d'un véhicule, l'utilisateur doit renseigner le nom du véhicule, le type de véhicule (voiture, utilitaire, moto — pour l'icône de la carte), le type d'énergie utilisé (carburant, électrique, ou hybride rechargeable — la seule distinction utile est le(s) flux d'énergie : litres, kWh, ou les deux), le kilométrage initial, la date d'acquisition, et les paramètres du contrôle technique.

L'onglet "Coûts / Acquisition" regroupe tout ce qui concerne le financement du véhicule :
- le **montant initial** versé à l'achat (ancre de la courbe de dépréciation) ;
- une case à cocher **« Crédit / loyer »** qui déclare un échéancier : périodicité (mensuel — par défaut, trimestriel, annuel), montant des échéances, nombre d'échéances et date de la première échéance — les versements sont déduits automatiquement de cet échéancier, pas saisis un par un ;
- la **liste des autres coûts d'acquisition** (carte grise, options, frais de dossier…), saisis comme des coûts datés ordinaires.

### Suivi des coûts

L'application permet de suivre les coûts de propriété d'un véhicule en tenant compte des différents coûts associés à la propriété d'un véhicule. Ces coûts sont classés en plusieurs catégories :
- Acquisition (achat, financement, etc. et, **important** estimation de la valeur de revente)
- Entretien (entretien courant : vidange, pneus, révision, etc.)
- Réparation (pannes, casse, carrosserie, etc.)
- Contrôles (essentiellement les contrôles techniques)
- Assurance
- Carburant (y compris l'électricité pour les véhicules électriques)
- Autres

Note de saisie : **tous les champs montants** (coûts, montants de pleins/charges, prix d'achat, estimations de revente, hypothèses du simulateur) acceptent des expressions arithmétiques avec `+ - * /`, les parenthèses, le `%` et la virgule ou le point décimal — ex. `1000*(1+5%)` ou `23,50+4`.

Note sur la valeur de revente :
**Cette valeur peut fluctuer dans le temps. L'utilisateur doit pour lui donner des valeurs datées.**

**Point important :** On doit pouvoir saisir des périodes de prêt (ou location, ou encore vol). Pendant ces périodes, des appoints de carburant peuvent être faits par des tiers sans être saisis dans l'application. Ces périodes doivent être prises en compte dans le calcul de la consommation.
~~Deux possibilités (à trancher) :~~ **Tranché** : on marque ces périodes comme **"consommation inconnue"** (pas d'extrapolation à partir des périodes encadrantes).

On a exactement le même problème pour des appoints de carburant sans volume (on peut imaginer une déclaration d'un appoint de 50€ sans savoir le volume, ça peut typiquement être le cas pour un historique).

### Calcul de la consommation

L'application calcule la consommation de carburant ou d'électricité en fonction des données saisies par l'utilisateur.

La prise en compte des véhicules électriques et hybrides rechargeables impose de faire un calcul plus complexe qu'un simple "Entre deux pleins" car il est rare de faire le plein sur un véhicule électrique.

**Obsolète :** Les calculs ne peuvent se faire qu'entre des **pleins** de carburant (les apports ponctuels sont pris en compte dans le volume total entre deux pleins, mais, sans plein, on ne peut pas calculer la consommation au kilomètre fiable).
En effet, on peut parfaitement avoir un véhicule, dont on n'a pas noté les appoints de carburant, depuis son achat. Certaines applications ignorent ce cas de figure ce qui leur fait donner des consommations fantaisistes. Dans cette application, on fera attention à bien faire des calculs "entre pleins".

Il y a plusieurs cas de figure suivant le type d'appoint de carburant :
- Le plus simple : L'utilisateur a fait le plein et a noté la quantité consommée.
- //TODO

### Calcul des coûts

L'application calcule les coûts de propriété d'un véhicule en fonction des données saisies par l'utilisateur.

En particulier, elle calcule :
- Les coûts kilométriques (coût par kilomètre) en fonction des coûts et des kilomètres parcourus.
- Le coût total de possession (achat, entretien, assurance, etc.) annuel.

La valeur de revente vient en déduction du coût total de possession.

Ces calculs sont réalisés pour chaque véhicule individuellement, pour chaque année.
On peut exclure certains coûts de ces calculs via un filtrage par catégorie (Acquisition, Entretien, Réparation, Contrôles, Assurance, Carburant, Autres).

On peut afficher des graphiques d'évolution par an pour visualiser les coûts et la consommation.
On peut détailler les coûts par catégorie, pour une période librement définie.

Dans les calculs de coûts l'acquisition est constituée du montant initial versé à l'achat du véhicule, moins sa valeur de revente (dépréciation), plus les échéances de l'éventuel échéancier crédit/loyer et les autres coûts d'acquisition enregistrés. Quand une date ne tombe pas exactement sur une date pour laquelle on a une valeur de revente, on interpole linéairement la valeur de revente entre points connus (c'est une approximation, on marquera ça en TODO).

### Rappel des contrôles techniques

L'application permet de suivre les contrôles techniques des véhicules et d'afficher la date du prochain contrôle technique, en fonction de la date du dernier contrôle technique et de la fréquence de contrôle technique (par défaut tous les 2 ans - modifiable dans les paramètres du véhicule).

### Correction des données

L'application permet de corriger toutes les données saisies par l'utilisateur, y compris les effacer (après confirmation).

### Simulateur de coûts avant achat

L'application permet de simuler les coûts de propriété d'un véhicule en fonction de différentes hypothèses (prix d'achat, valeur de revente à une date donnée, nombre de km parcourus par an, loyer de voiture, montant et durée du crédit, etc.).

### Prise en compte de l'inflation

L'application permet de prendre en compte l'inflation dans tous les calculs de coûts. en utilisant les barêmes publiés par l'INSEE disponible dans le gist https://gist.github.com/fathzer/5646b5558f759655717914400cc50a03.

## Sauvegarde des données

Les données seront sauvegardées grâce à l'API de https://github.com/fathzer/ts-cloud-storage-manager.
Un fichier unique "car-cost-meter.json" sera créé dans le dossier de l'utilisateur.
La réconciliation des données se fera au niveau de chaque véhicule (des conflits sur des modifications simultanées de deux véhicules seront résolus automatiquement).
Les providers proposés sont **Dropbox** et **Microsoft OneDrive**, plus un mode **démo en lecture seule** alimenté par un fichier d'exemple publié sur un Gist.

Les settings, eux, seront sauvegardés dans le localStorage. Ils incluent la langue, le thème, les unités (localisées par défaut : km + L/100km en français, mi + mpg en anglais — modifiables manuellement) et le symbole de devise (pas de conversion de change). La prise en compte de l'inflation s'appuie sur les indices INSEE : c'est une fonctionnalité **spécifique à la France**, affichée comme telle.

### Import/export
Données au format JSON tel que celui sauvegardé dans le cloud.
- Import : chargement d'un fichier JSON dans l'application.
- Export : sauvegarde d'un fichier JSON depuis l'application.

## UI

L'application sera développée en pur TypeScript. Si possible sans framework externe, à l'exception de la librairie de gestion des stockages cloud.

Ce sera une application web responsive (mobile-first) installable comme une application progressive web app (PWA).

Elle aura deux thèmes : clair et sombre (sélectionnés par défaut par le système de l'utilisateur et modifiables manuellement dans les settings).

**TOUS** les textes et libellés seront traduits en français et en anglais dans une structure apte à l'extension future à d'autres langues (permettant, par exemple, l'import export dans Crowdin).

Le design devra être modulaire et éviter au maximum les redondances de code. Il devra maximiser le découpage en composants réutilisables.

## L'hébergement sera effectué sur GitHub Pages
