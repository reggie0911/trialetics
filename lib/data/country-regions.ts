/**
 * Curated first-level subdivisions for common clinical-trial geographies.
 * Values are human-readable names stored in `region` text columns (no migration).
 */

const US: string[] = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'District of Columbia',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

const CA: string[] = [
  'Alberta',
  'British Columbia',
  'Manitoba',
  'New Brunswick',
  'Newfoundland and Labrador',
  'Northwest Territories',
  'Nova Scotia',
  'Nunavut',
  'Ontario',
  'Prince Edward Island',
  'Quebec',
  'Saskatchewan',
  'Yukon',
];

const GB: string[] = ['England', 'Northern Ireland', 'Scotland', 'Wales'];

const AU: string[] = [
  'Australian Capital Territory',
  'New South Wales',
  'Northern Territory',
  'Queensland',
  'South Australia',
  'Tasmania',
  'Victoria',
  'Western Australia',
];

const DE: string[] = [
  'Baden-Württemberg',
  'Bavaria',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hesse',
  'Lower Saxony',
  'Mecklenburg-Vorpommern',
  'North Rhine-Westphalia',
  'Rhineland-Palatinate',
  'Saarland',
  'Saxony',
  'Saxony-Anhalt',
  'Schleswig-Holstein',
  'Thuringia',
];

const FR: string[] = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Brittany',
  'Centre-Val de Loire',
  'Corsica',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandy',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Côte d'Azur",
];

const ES: string[] = [
  'Andalusia',
  'Aragon',
  'Asturias',
  'Balearic Islands',
  'Basque Country',
  'Canary Islands',
  'Cantabria',
  'Castile and León',
  'Castilla-La Mancha',
  'Catalonia',
  'Ceuta',
  'Extremadura',
  'Galicia',
  'La Rioja',
  'Madrid',
  'Melilla',
  'Murcia',
  'Navarre',
  'Valencia',
];

const IT: string[] = [
  'Abruzzo',
  'Aosta Valley',
  'Apulia',
  'Basilicata',
  'Calabria',
  'Campania',
  'Emilia-Romagna',
  'Friuli-Venezia Giulia',
  'Lazio',
  'Liguria',
  'Lombardy',
  'Marche',
  'Molise',
  'Piedmont',
  'Sardinia',
  'Sicily',
  'Trentino-South Tyrol',
  'Tuscany',
  'Umbria',
  'Veneto',
];

const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  US,
  CA,
  GB,
  AU,
  DE,
  FR,
  ES,
  IT,
};

export function regionsForCountry(countryCode: string): { name: string }[] {
  const code = countryCode.trim().toUpperCase();
  const list = REGIONS_BY_COUNTRY[code];
  if (!list?.length) return [];
  return list.map((name) => ({ name }));
}
