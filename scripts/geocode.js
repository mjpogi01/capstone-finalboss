const addresses = [
  { name: 'SAN PASCUAL (MAIN BRANCH)', queries: [
    'Villa Maria Subdivision, Sambat, San Pascual, Batangas, Philippines',
    'Sambat, San Pascual, Batangas, Philippines'
  ]},
  { name: 'CALAPAN BRANCH', queries: [
    'Infantado Street, San Vicente West, Calapan City, Oriental Mindoro, Philippines',
    'Basa Building, Infantado Street, Calapan City, Oriental Mindoro, Philippines',
    'San Vicente West, Calapan City, Oriental Mindoro, Philippines'
  ]},
  { name: 'MUZON BRANCH', queries: [
    'Barangay Muzon, San Luis, Batangas, Philippines'
  ]},
  { name: 'LEMERY BRANCH', queries: [
    'Illustre Ave, District III, Lemery, Batangas, Philippines',
    'Miranda Building, Illustre Ave, Lemery, Batangas, Philippines',
    'District III, Lemery, Batangas, Philippines'
  ]},
  { name: 'BATANGAS CITY BRANCH', queries: [
    'P. Burgos Street Extension, Calicanto, Batangas City, Batangas, Philippines',
    'Casa Buena Building, P. Burgos St Ext, Batangas City, Philippines',
    'Calicanto, Batangas City, Batangas, Philippines'
  ]},
  { name: 'BAUAN BRANCH', queries: [
    'J.P. Rizal Street, Poblacion, Bauan, Batangas, Philippines',
    'Poblacion, Bauan, Batangas, Philippines'
  ]},
  { name: 'CALACA BRANCH', queries: [
    'Calaca Public Market, Poblacion 4, Calaca City, Batangas, Philippines',
    'Poblacion 4, Calaca City, Batangas, Philippines'
  ]}
];

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'YohannsCapstone/1.0 (contact@example.com)'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data[0] || null;
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  for (const item of addresses) {
    let found = null;
    for (const q of item.queries) {
      try {
        const result = await geocode(q);
        if (result) {
          found = { q, lat: result.lat, lon: result.lon, display: result.display_name };
          break;
        }
      } catch (_) {}
      await delay(1000);
    }
    if (found) {
      console.log(`${item.name}\t${found.lat}\t${found.lon}\t${found.q}`);
    } else {
      console.log(`${item.name}\tNOT_FOUND`);
    }
    await delay(500);
  }
})(); 