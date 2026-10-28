export const en = {
  app: {
    title: 'Car Cost Meter',
    tagline: 'A free and open source app to compute the real cost of your vehicles — purchase, maintenance, insurance, fuel — and track their consumption.'
  },
  landing: {
    connect: 'Sign in',
    tryDemo: 'or try Car Cost Meter in demo mode',
    card1Title: 'All your vehicle costs in one place',
    card1Text: 'Purchase, maintenance, inspections, insurance, fuel or electricity: every expense is recorded per vehicle with its full history.',
    card2Title: 'Reliable consumption figures',
    card2Text: 'Consumption is only computed over periods where all data is known — never fanciful figures when fuel fill-ups are missing (loans, rentals, incomplete entries).',
    card3Title: 'Cost per mile and total cost',
    card3Text: 'Per-distance cost and yearly total cost of ownership for each vehicle, resale value deducted, displayable in constant euros using INSEE indices.',
    footerHelp: 'Help',
    footerPrivacy: 'Privacy',
    footerTerms: 'Terms'
  },
  demo: {
    banner: 'Demo mode — your changes are not saved'
  },
  auth: {
    chooseProvider: 'Choose your storage space',
    connecting: 'Connecting…',
    connectFailed: 'Connection failed. Please try again.',
    demoButton: 'Demo mode'
  },
  energy: {
    fuel: 'Fuel (Petrol, Diesel, LPG…)',
    electric: 'Electric',
    hybrid: 'Plug-in hybrid'
  },
  vehicleType: {
    car: 'Car',
    utility: 'Van',
    motorcycle: 'Motorcycle'
  },
  syncBanner: {
    conflict: 'Changes made on another device conflict with yours. Which ones should be kept?',
    keepLocal: 'Keep my changes',
    keepCloud: 'Keep the cloud version',
    savePending: 'Save pending — retrying {time}',
    retryAt: 'at {time}',
    retrySoon: 'soon',
    remoteUpdate: 'A new version of your data is available.',
    update: 'Update'
  },
  vehicles: {
    empty: 'No vehicle yet.',
    add: 'Add a vehicle',
    logout: 'Sign out',
    newTitle: 'New vehicle',
    editTitle: 'Edit vehicle',
    name: 'Name',
    energyType: 'Energy type',
    vehicleType: 'Vehicle type',
    firstInspection: 'First inspection due date',
    inspectionExempt: 'Inspection exempt',
    acquisitionDate: 'Acquisition date',
    initialOdometer: 'Initial odometer',
    purchasePrice: 'Amount paid',
    inspectionPeriod: 'Inspection interval (months)',
    deleteConfirm: 'Delete this vehicle and all its data?',
    declareInspection: 'Record an inspection',
    inspection: {
      none: 'No inspection recorded',
      due: 'Next inspection: {date}',
      overdue: 'Inspection overdue since {date}'
    }
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    close: 'Close',
    confirm: 'Confirm',
    add: 'Add',
    edit: 'Edit'
  },
  alerts: {
    loadError: 'Could not load your data. Check your connection then reload the page.',
    importError: 'Invalid file — import failed.'
  },
  tools: {
    import: 'Import data',
    export: 'Export data',
    importConfirm: 'Replace all current data with the file content?',
    settings: 'Settings',
    help: 'Help & information'
  },
  help: {
    title: 'Help & information',
    securityTitle: '🔒 Security & privacy',
    securityClientSide: 'No intermediate server: this application runs entirely in your browser. No personal data is collected, analysed or sent to any server we operate.',
    securityStorage: 'All your data is saved exclusively and directly on the cloud storage service you chose and authorised.',
    faqTitle: '❓ Frequently asked questions',
    faqStorageQ: 'Where is my data stored?',
    dataLocation: 'Your data location: ',
    faqStorageDropbox: 'Data lives in the car-cost-meter.json file inside the dedicated app folder of your Dropbox ("Applications/<app name>"). The access granted to the app is limited strictly to that folder — it cannot touch the rest of your documents. You may rename the file: the app keeps finding it through its internal id, as long as it stays in that folder.',
    faqStorageOneDrive: 'Same rules: the car-cost-meter.json file lives in the dedicated app folder of your OneDrive (Files.ReadWrite.AppFolder permission). The app cannot access the rest of your documents, and renaming inside that folder is tolerated.',
    faqBugQ: 'How do I report a bug?',
    faqBugIntro: 'Bugs and feature requests are tracked on the project GitHub page:',
    faqBugTips: 'Before filing an issue: check it was not already reported, describe the exact reproduction steps and the expected behaviour.',
    faqSourceQ: 'Where is the source code?',
    faqSourceText: 'The application is 100% open source — inspect or contribute to the code directly on the GitHub repository:',
    sourcesTitle: '📊 Data sources',
    sourcesText: 'The monthly consumer price indices used for the constant-euro display come from INSEE publications (base 2025, all households, France — specific to the France/euro pair). Series: insee-011814630 (all items), insee-011814056 (all items excluding tobacco), insee-011814080 (all items excluding tobacco and alcohol).',
    sourcesGistPre: 'Series are fetched on demand from a',
    gistLink: 'GitHub Gist',
    sourcesGistPost: 'updated automatically on every new INSEE release.',
    disclaimerTitle: '⚠️ Disclaimer',
    disclaimerText: 'This tool is provided for indicative, personal use only. Despite the care put into the calculations, inaccuracies may remain; results do not constitute financial advice. The author accepts no liability for any use of this data or decisions based on it.',
    issuesLink: 'GitHub Issues',
    githubLink: 'github.com/fathzer/car-cost-meter.github.io',
    privacy: 'Privacy policy',
    terms: 'Terms of use'
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageAuto: 'Auto (browser)',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    units: 'Units',
    unitsAuto: 'Auto (from language)',
    unitsMetric: 'Metric (km, L/100km)',
    unitsImperial: 'Imperial (mi, mpg)',
    currency: 'Currency'
  },
  nav: {
    vehicles: 'Vehicles'
  },
  detail: {
    editVehicle: 'Edit',
    empty: 'No entry yet.',
    tabs: {
      costs: 'Costs',
      resale: 'Resale',
      analysis: 'Summary',
      consumption: 'Consumption'
    },
    notImplemented: 'Not implemented yet',
    purchasePriceReadonly: 'Purchase price',
    addFuelUp: 'Add a fill-up',
    addCharge: 'Add a charge'
  },
  analysis: {
    year: 'Year',
    costs: 'Costs',
    depreciation: 'Depreciation',
    tco: 'Total cost',
    costPerKm: 'Cost/km',
    constantEuros: 'Constant euros',
    constantEurosHint: 'Amounts expressed in today\'s euros via INSEE price indices — France-only feature',
    constantEurosNote: 'Amounts in constant euros (INSEE, base {month})',
    franceBadge: 'INSEE 🇫🇷'
  },
  categories: {
    acquisition: 'Acquisition',
    maintenance: 'Maintenance',
    repair: 'Repair',
    inspection: 'Inspections',
    insurance: 'Insurance',
    fuel: 'Fuel',
    other: 'Other',
    fuelUps: 'Fill-ups',
    charges: 'Charges'
  },
  sim: {
    button: 'Simulator',
    title: 'Pre-purchase cost simulator',
    purchasePrice: 'Purchase price',
    resaleDate: 'Estimated resale date',
    resaleValue: 'Estimated resale value',
    kmPerYear: 'Distance driven per year',
    yearlyCosts: 'Yearly costs',
    loanMonthly: 'Loan / lease monthly payment',
    energy: 'Energy',
    consumption: 'Average consumption',
    energyPrice: 'Energy price',
    run: 'Compute',
    depreciationYear: 'Depreciation / year',
    energyYear: 'Energy / year',
    fixedYear: 'Fixed costs / year',
    annualTotal: 'Total cost / year',
    monthlyTotal: 'Total cost / month',
    perDistance: 'Cost / {unit}'
  },
  events: {
    date: 'Date',
    odometer: 'Odometer',
    volume: 'Volume',
    amount: 'Amount',
    category: 'Category',
    comment: 'Comment',
    note: 'Note',
    from: 'From',
    to: 'To',
    fullTank: 'Full tank',
    fullCharge: 'Full charge',
    resaleValue: 'Estimated value',
    odoRegression: 'Odometer inconsistent with:',
    deleteConfirm: 'Delete this entry?',
    fuelUp: { newTitle: 'New fill-up', editTitle: 'Edit fill-up' },
    charge: { newTitle: 'New charge', editTitle: 'Edit charge' },
    cost: { newTitle: 'New cost', editTitle: 'Edit cost' },
    resale: { newTitle: 'New estimate', editTitle: 'Edit estimate' },
    loan: { newTitle: 'New loan period', editTitle: 'Edit period' }
  }
};
