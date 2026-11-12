// All 36 Punjab districts with common aliases for court-field matching
const DISTRICT_ALIASES: [string, string][] = [
  ['multan', 'Multan'],
  ['lahore', 'Lahore'],
  ['rawalpindi', 'Rawalpindi'],
  ['faisalabad', 'Faisalabad'],
  ['gujranwala', 'Gujranwala'],
  ['sialkot', 'Sialkot'],
  ['bahawalpur', 'Bahawalpur'],
  ['sargodha', 'Sargodha'],
  ['sheikhupura', 'Sheikhupura'],
  ['rahim yar khan', 'Rahim Yar Khan'],
  ['r.y. khan', 'Rahim Yar Khan'],
  ['ry khan', 'Rahim Yar Khan'],
  ['jhang', 'Jhang'],
  ['kasur', 'Kasur'],
  ['gujrat', 'Gujrat'],
  ['sahiwal', 'Sahiwal'],
  ['okara', 'Okara'],
  ['chiniot', 'Chiniot'],
  ['mandi bahauddin', 'Mandi Bahauddin'],
  ['m.b. din', 'Mandi Bahauddin'],
  ['mb din', 'Mandi Bahauddin'],
  ['narowal', 'Narowal'],
  ['hafizabad', 'Hafizabad'],
  ['nankana', 'Nankana Sahib'],
  ['pakpattan', 'Pakpattan'],
  ['khanewal', 'Khanewal'],
  ['muzaffargarh', 'Muzaffargarh'],
  ['layyah', 'Layyah'],
  ['bhakkar', 'Bhakkar'],
  ['mianwali', 'Mianwali'],
  ['khushab', 'Khushab'],
  ['toba tek singh', 'Toba Tek Singh'],
  ['t.t. singh', 'Toba Tek Singh'],
  ['tt singh', 'Toba Tek Singh'],
  ['vehari', 'Vehari'],
  ['lodhran', 'Lodhran'],
  ['bahawalnagar', 'Bahawalnagar'],
  ['attock', 'Attock'],
  ['jhelum', 'Jhelum'],
  ['chakwal', 'Chakwal'],
  ['dera ghazi khan', 'Dera Ghazi Khan'],
  ['d.g. khan', 'Dera Ghazi Khan'],
  ['dg khan', 'Dera Ghazi Khan'],
  ['rajanpur', 'Rajanpur'],
];

/**
 * Extracts the Punjab district name from a court field string.
 * Returns null if no known district is found.
 * Examples:
 *   "ATC, Multan"             → "Multan"
 *   "Sessions Court, Lahore"  → "Lahore"
 *   "LHC, Multan Bench"       → "Multan"
 *   "D.G. Khan Sessions"      → "Dera Ghazi Khan"
 */
export function extractDistrict(court: string): string | null {
  if (!court?.trim()) return null;
  const lower = court.toLowerCase();
  for (const [alias, district] of DISTRICT_ALIASES) {
    if (lower.includes(alias)) return district;
  }
  return null;
}
