# Application de calcul des coûts de propriété d'un véhicule

Cette application permet de calculer les coûts de propriété d'un véhicule en tenant compte des différents coûts associés à la propriété d'un véhicule (achat, entretien, assurance, carburant, etc.).

## Fonctionnalités

### Suivi véhicule

L'application permet de suivre les informations d'autant de véhicules que l'utilisateur le souhaite.
Chaque véhicule peut être configuré avec ses propres paramètres (type de carburant, etc.).
On peut considérer que les véhicules sont des "objets" fonctionnels distincts.

Lors de la création d'un véhicule, l'utilisateur doit renseigner le nom du véhicule, le type de carburant utilisé (essence/diesel/GPL, électrique, ou hybride rechargeable), le kilométrage initial, la date d'acquisition, et le montant versé.

Les mensualités de crédit, ou loyer sont saisis dans la catégorie "Acquisition" (voir chapitre suivant).

### Suivi des coûts

L'application permet de suivre les coûts de propriété d'un véhicule en tenant compte des différents coûts associés à la propriété d'un véhicule. Ces coûts sont classés en plusieurs catégories :
- Acquisition (achat, financement, etc. et, **important** estimation de la valeur de revente)
- Entretien (entretien, réparations, etc.)
- Contrôles (essentiellement les contrôles techniques)
- Assurance
- Carburant (y compris l'électricité pour les véhicules électriques)
- Autres

Note sur la valeur de revente :
**Cette valeur peut fluctuer dans le temps. L'utilisateur doit la mettre à jour périodiquement.**

### Calcul de la consommation

L'application calcule la consommation de carburant ou d'électricité en fonction des données saisies par l'utilisateur.

Les calculs ne peuvent se faire qu'entre des **pleins** de carburant (les apports ponctuels sont pris en compte dans le volume total entre deux pleins,mais sans plein, on ne peut pas calculer la consommation au kilomètre fiable).
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
On peut exclure certains coûts de ces calculs via un filtrage par catégorie (Acquisition, Entretien, Contrôles, Assurance, Carburant, Autres).

On peut afficher des graphiques d'évolution par an pour visualiser les coûts et la consommation.
On peut détailler les coûts par catégorie, pour une période librement définie.

Dans les calculs de coûts l'acquisition est constituée du prix d'achat du véhicule, moins sa valeur de revente. Quand une date ne tombe pas exactement sur une date pour laquelle on a une valeur de revente, on interpole linéairement la valeur de revente entre points connus (c'est une approximation, on marquera ça en TODO).

### Rappel des contrôles techniques

L'application permet de suivre les contrôles techniques des véhicules et d'afficher la date du prochain contrôle technique, en fonction de la date du dernier contrôle technique et de la fréquence de contrôle technique (par défaut tous les 2 ans - modifiable dans les paramètres du véhicule).

### Correction des données

L'application permet de corriger toutes les données saisies par l'utilisateur, y compris les effacer (après confirmation).

### Simulateur de coûts avant achat

L'application permet de simuler les coûts de propriété d'un véhicule en fonction de différentes hypothèses (prix d'achat, valeur de revente à une date donnée, nombre de km parcourus par an, loyer de voiture, montant et durée du crédit, etc.).

### Prise en compte de l'inflation

L'application permet de prendre en compte l'inflation dans tous les calculs de coûts. en utilisant les barêmes publiés par l'INSEE disponible dans le gist https://gist.github.com/fathzer/5646b5558f759655717914400cc50a03.

## Sauvegarde des données

//TODO
