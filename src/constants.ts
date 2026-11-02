export const COMPANY_DETAILS = {
  name: 'Newon',
  address: 'I-9 Markaz',
  city: 'Islamabad',
  state: 'Federal',
  zip: '44000',
  phone: '+92 343 9227883',
  email: 'info@newon.pk',
  website: 'https://newon.pk/'
};

export const PAYMENT_DETAILS = {
  BANK_NAME: 'BAHL (Bank Al-Habib Ltd.), I-9 Markaz branch, Islamabad.',
  ACCOUNT_NUMBER: '02470095010759013',
  IBAN: 'PK62BAHL0247009501075901'
};

export const INVOICE_TERMS_AND_CONDITIONS = [
  'All prices are exclusive of taxes.',
  'No shipping charges included in above prices.'
];

export const DEFAULT_QUOTATION_TERMS = [
  "All prices are exclusive of taxes.",
  "Mentioned material supply and installation included.",
  "Any extra material/work needed will be charged as per market rate.",
  "70% payment needed for order confirmation and remaining before completion.",
  "Completion time 10-15 working days after order confirmation.",
]

export const OTC_CUSTOMER = {
  id: 'otc',
  customerId: 'OTC-001',
  name: 'Over the Counter customer',
  email: 'otc@cash.sale',
  company: 'OTC',
  phone: '0000000000',
  address: 'N/A',
  city: 'N/A',
  state: 'N/A',
  zip: '00000'
};

// Cutoff date for invoice/quotation editing - invoices/quotations before this date cannot be edited
// Using a more recent date to ensure system stability and safety
export const INVOICE_EDIT_CUTOFF_DATE = new Date('2026-03-10');
