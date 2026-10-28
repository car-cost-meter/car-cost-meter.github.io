export const fr = {
  app: {
    title: 'Car Cost Meter',
    tagline: 'Application gratuite et open source pour calculer le coût réel de vos véhicules — achat, entretien, assurance, carburant — et suivre leur consommation.'
  },
  landing: {
    connect: 'Connexion',
    tryDemo: 'ou tester Car Cost Meter en mode démo',
    card1Title: 'Centralisez tous les coûts de vos véhicules',
    card1Text: 'Achat, entretien, contrôles techniques, assurance, carburant ou électricité : chaque dépense est enregistrée, par véhicule, avec son historique complet.',
    card2Title: 'Une consommation fiable',
    card2Text: 'La consommation n\'est calculée que sur des périodes où toutes les données sont connues — jamais de chiffres fantaisistes quand des appoints de carburant manquent (prêt, location, saisie incomplète).',
    card3Title: 'Coût au kilomètre et coût total',
    card3Text: 'Coût kilométrique et coût total de possession annuel par véhicule, valeur de revente déduite, affichables en euros constants grâce aux indices INSEE.',
    footerHelp: 'Aide',
    footerPrivacy: 'Confidentialité',
    footerTerms: 'Conditions'
  },
  demo: {
    banner: 'Mode démo — vos modifications ne sont pas sauvegardées'
  },
  auth: {
    chooseProvider: 'Choisissez votre espace de stockage',
    connecting: 'Connexion en cours…',
    connectFailed: 'La connexion a échoué. Réessayez.',
    demoButton: 'Mode démo'
  },
  energy: {
    fuel: 'Carburant (Essence, Diesel, GPL…)',
    electric: 'Électrique',
    hybrid: 'Hybride rechargeable'
  },
  vehicleType: {
    car: 'Voiture',
    utility: 'Utilitaire',
    motorcycle: 'Moto'
  },
  syncBanner: {
    conflict: 'Des modifications sur un autre appareil sont en conflit avec les vôtres. Que faut-il garder ?',
    keepLocal: 'Garder mes modifications',
    keepCloud: 'Garder la version du cloud',
    savePending: 'Sauvegarde en attente — nouvelle tentative {time}',
    retryAt: 'à {time}',
    retrySoon: 'bientôt',
    remoteUpdate: 'Une nouvelle version de vos données est disponible.',
    update: 'Mettre à jour'
  },
  vehicles: {
    empty: 'Aucun véhicule pour le moment.',
    add: 'Ajouter un véhicule',
    logout: 'Déconnexion',
    newTitle: 'Nouveau véhicule',
    editTitle: 'Modifier le véhicule',
    name: 'Nom',
    energyType: 'Type d\'énergie',
    vehicleType: 'Type de véhicule',
    firstInspection: 'Date du premier contrôle technique',
    inspectionExempt: 'Dispensé de contrôle technique',
    acquisitionDate: 'Date d\'acquisition',
    initialOdometer: 'Kilométrage initial',
    purchasePrice: 'Montant versé',
    inspectionPeriod: 'Périodicité du contrôle technique (mois)',
    deleteConfirm: 'Supprimer ce véhicule et toutes ses données ?',
    declareInspection: 'Déclarer un contrôle technique',
    inspection: {
      none: 'Aucun contrôle technique enregistré',
      due: 'Prochain CT : {date}',
      overdue: 'CT dépassé depuis le {date}'
    }
  },
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    close: 'Fermer',
    confirm: 'Confirmer',
    add: 'Ajouter',
    edit: 'Modifier'
  },
  alerts: {
    loadError: 'Impossible de charger vos données. Vérifiez votre connexion puis rechargez la page.',
    importError: 'Fichier invalide — import impossible.'
  },
  tools: {
    import: 'Importer les données',
    export: 'Exporter les données',
    importConfirm: 'Remplacer toutes les données actuelles par le contenu du fichier ?',
    settings: 'Paramètres'
  },
  settings: {
    title: 'Paramètres',
    language: 'Langue',
    languageAuto: 'Automatique (navigateur)',
    theme: 'Thème',
    themeSystem: 'Système',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    units: 'Unités',
    unitsAuto: 'Automatique (selon la langue)',
    unitsMetric: 'Métriques (km, L/100km)',
    unitsImperial: 'Impériales (mi, mpg)',
    currency: 'Devise'
  },
  nav: {
    vehicles: 'Véhicules'
  },
  detail: {
    editVehicle: 'Modifier',
    empty: 'Aucune entrée pour le moment.',
    tabs: {
      costs: 'Coûts',
      resale: 'Revente',
      analysis: 'Synthèse',
      consumption: 'Consommation'
    },
    notImplemented: 'Non encore implémenté',
    purchasePriceReadonly: 'Prix d\'achat',
    addFuelUp: 'Ajouter un plein',
    addCharge: 'Ajouter une charge'
  },
  analysis: {
    year: 'Année',
    costs: 'Coûts',
    depreciation: 'Dépréciation',
    tco: 'Coût total',
    costPerKm: 'Coût/km',
    constantEuros: 'Euros constants',
    constantEurosHint: 'Montants exprimés en euros d\'aujourd\'hui via les indices de prix INSEE — fonctionnalité française',
    constantEurosNote: 'Montants en euros constants (INSEE, base {month})',
    franceBadge: 'INSEE 🇫🇷'
  },
  categories: {
    acquisition: 'Acquisition',
    maintenance: 'Entretien',
    repair: 'Réparation',
    inspection: 'Contrôles',
    insurance: 'Assurance',
    fuel: 'Carburant',
    other: 'Autres',
    fuelUps: 'Pleins',
    charges: 'Charges'
  },
  sim: {
    button: 'Simulateur',
    title: 'Simulateur de coûts avant achat',
    purchasePrice: 'Prix d\'achat',
    resaleDate: 'Date de revente estimée',
    resaleValue: 'Valeur de revente estimée',
    kmPerYear: 'Distance parcourue par an',
    yearlyCosts: 'Coûts annuels',
    loanMonthly: 'Mensualité crédit / loyer',
    energy: 'Énergie',
    consumption: 'Consommation moyenne',
    energyPrice: 'Prix de l\'énergie',
    run: 'Calculer',
    depreciationYear: 'Dépréciation / an',
    energyYear: 'Énergie / an',
    fixedYear: 'Frais fixes / an',
    annualTotal: 'Coût total / an',
    monthlyTotal: 'Coût total / mois',
    perDistance: 'Coût / {unit}'
  },
  events: {
    date: 'Date',
    odometer: 'Kilométrage',
    volume: 'Volume',
    amount: 'Montant',
    category: 'Catégorie',
    comment: 'Commentaire',
    note: 'Note',
    from: 'Du',
    to: 'Au',
    fullTank: 'Plein complet',
    fullCharge: 'Charge complète',
    resaleValue: 'Valeur estimée',
    odoRegression: 'Kilométrage incohérent avec :',
    deleteConfirm: 'Supprimer cette entrée ?',
    fuelUp: { newTitle: 'Nouveau plein', editTitle: 'Modifier le plein' },
    charge: { newTitle: 'Nouvelle charge', editTitle: 'Modifier la charge' },
    cost: { newTitle: 'Nouveau coût', editTitle: 'Modifier le coût' },
    resale: { newTitle: 'Nouvelle estimation', editTitle: 'Modifier l\'estimation' },
    loan: { newTitle: 'Nouvelle période de prêt', editTitle: 'Modifier la période' }
  }
};
