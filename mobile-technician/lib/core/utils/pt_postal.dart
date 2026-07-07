// Shared Portuguese postal-code → "City, District" lookup.
// Used by the booking location page and the address form.

const Map<String, String> kPtPostalPrefixes = {
  '1000': 'Lisboa, Lisboa',
  '1100': 'Lisboa, Lisboa',
  '1200': 'Lisboa, Lisboa',
  '1250': 'Lisboa, Lisboa',
  '1300': 'Lisboa, Lisboa',
  '1400': 'Lisboa, Lisboa',
  '1500': 'Lisboa, Lisboa',
  '1600': 'Lisboa, Lisboa',
  '1700': 'Lisboa, Lisboa',
  '1800': 'Lisboa, Lisboa',
  '1900': 'Lisboa, Lisboa',
  '1990': 'Lisboa, Lisboa',
  '2000': 'Santarém, Santarém',
  '2100': 'Coruche, Santarém',
  '2600': 'Vila Franca de Xira, Lisboa',
  '2700': 'Amadora, Lisboa',
  '2800': 'Almada, Setúbal',
  '2830': 'Barreiro, Setúbal',
  '2840': 'Seixal, Setúbal',
  '2850': 'Moita, Setúbal',
  '2860': 'Moita, Setúbal',
  '2870': 'Montijo, Setúbal',
  '2880': 'Alcochete, Setúbal',
  '2890': 'Samouco, Alcochete',
  '2900': 'Setúbal, Setúbal',
  '3000': 'Coimbra, Coimbra',
  '4000': 'Porto, Porto',
  '4100': 'Porto, Porto',
  '4150': 'Porto, Porto',
  '4200': 'Porto, Porto',
  '4250': 'Porto, Porto',
  '4300': 'Porto, Porto',
  '4400': 'Vila Nova de Gaia, Porto',
  '4430': 'Vila Nova de Gaia, Porto',
  '4450': 'Matosinhos, Porto',
  '4460': 'Matosinhos, Porto',
  '4470': 'Maia, Porto',
  '4480': 'Vila do Conde, Porto',
  '4700': 'Braga, Braga',
  '4710': 'Braga, Braga',
  '4800': 'Guimarães, Braga',
  '5000': 'Vila Real, Vila Real',
  '6000': 'Castelo Branco, Castelo Branco',
  '7000': 'Évora, Évora',
  '8000': 'Faro, Faro',
  '8100': 'Loulé, Faro',
  '8200': 'Albufeira, Faro',
  '8500': 'Portimão, Faro',
  '9000': 'Funchal, Madeira',
  '9500': 'Ponta Delgada, Açores',
};

/// Returns "City, District" for a postal code (or 4+ digit prefix), or null.
String? lookupPostalDisplay(String raw) {
  final clean = raw.replaceAll('-', '').replaceAll(' ', '');
  if (clean.length < 4) return null;
  final prefix = clean.substring(0, 4);
  final exact = kPtPostalPrefixes[prefix];
  if (exact != null) return exact;
  // Try progressively shorter prefixes.
  for (var len = prefix.length - 1; len >= 1; len--) {
    final sub = prefix.substring(0, len);
    for (final entry in kPtPostalPrefixes.entries) {
      if (entry.key.startsWith(sub)) return entry.value;
    }
  }
  return null;
}

/// Returns separate city / district parts for a postal code, or null.
({String city, String district})? lookupPostalParts(String raw) {
  final display = lookupPostalDisplay(raw);
  if (display == null) return null;
  final parts = display.split(',').map((s) => s.trim()).toList();
  final city = parts.isNotEmpty ? parts[0] : '';
  final district = parts.length > 1 ? parts[1] : city;
  return (city: city, district: district);
}
