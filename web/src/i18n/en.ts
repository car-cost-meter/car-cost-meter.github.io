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
    settings: 'Settings'
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
