// Mappe le nom de catégorie Winamax (en français) vers un code ISO-2.
// Utilisé par le globe 3D pour faire scintiller les pays des matchs.
const MAP: Record<string, string> = {
  france: "FR", angleterre: "GB", "royaume-uni": "GB", "grande-bretagne": "GB",
  espagne: "ES", italie: "IT", allemagne: "DE", portugal: "PT", "pays-bas": "NL",
  belgique: "BE", suisse: "CH", autriche: "AT", turquie: "TR", grece: "GR", "grèce": "GR",
  pologne: "PL", russie: "RU", ukraine: "UA", roumanie: "RO", "republique tcheque": "CZ",
  "république tchèque": "CZ", danemark: "DK", suede: "SE", "suède": "SE", norvege: "NO",
  "norvège": "NO", finlande: "FI", irlande: "IE", ecosse: "SC", "écosse": "SC",
  croatie: "HR", serbie: "RS", hongrie: "HU", bulgarie: "BG",
  "etats-unis": "US", "états-unis": "US", canada: "CA", mexique: "MX",
  bresil: "BR", "brésil": "BR", argentine: "AR", chili: "CL", colombie: "CO",
  uruguay: "UY", perou: "PE", "pérou": "PE", equateur: "EC", "équateur": "EC",
  paraguay: "PY", venezuela: "VE", bolivie: "BO",
  japon: "JP", coree: "KR", "corée": "KR", "coree du sud": "KR", "corée du sud": "KR",
  chine: "CN", "arabie saoudite": "SA", emirats: "AE", "émirats": "AE",
  qatar: "QA", iran: "IR", irak: "IQ", inde: "IN", australie: "AU",
  maroc: "MA", algerie: "DZ", "algérie": "DZ", tunisie: "TN", egypte: "EG", "égypte": "EG",
  senegal: "SN", "sénégal": "SN", "cote d'ivoire": "CI", "côte d'ivoire": "CI",
  cameroun: "CM", nigeria: "NG", ghana: "GH", "afrique du sud": "ZA",
  europe: "EU", monde: "EU", international: "EU",
  "ligue des champions": "EU", "europa league": "EU", "conference league": "EU",
  "coupe du monde": "EU", "euro": "EU",
};

export function categoryToIso(category?: string | null): string | null {
  if (!category) return null;
  const k = category.toLowerCase().normalize("NFC").trim();
  if (MAP[k]) return MAP[k];
  // partial match — "Angleterre - Premier League" → "Angleterre"
  for (const key of Object.keys(MAP)) {
    if (k.startsWith(key) || k.includes(key)) return MAP[key];
  }
  return null;
}
