import { countries } from 'country-data-list';

/**
 * Shared helpers for resolving ISO 3166-1 country data.
 *
 * Kept in lib (not in the country-dropdown component) so server components
 * can resolve display names without pulling in the client-only dropdown.
 */
export interface Country {
  alpha2: string;
  alpha3: string;
  countryCallingCodes: string[];
  currencies: string[];
  emoji?: string;
  ioc: string;
  languages: string[];
  name: string;
  status: string;
}

// ISO 3166-1 alpha-2 code of the default country (Pakistan).
export const DEFAULT_COUNTRY_CODE = 'PK';

// Resolve a country display name from an ISO alpha-2 code. Unknown codes fall
// back to the raw code so a bad value never renders as blank.
export function getCountryName(alpha2?: string | null): string {
  if (!alpha2) return '';
  const country = countries.all.find(
    (c: Country) => c.alpha2.toUpperCase() === alpha2.toUpperCase()
  );
  return country?.name ?? alpha2.toUpperCase();
}
