const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const OUTPUT_PATH = path.join(DATA_DIR, 'barangays-calabarzon-oriental-mindoro.json');

const DATA_SOURCES = {
  regions: 'https://psgc.gitlab.io/api/regions.json',
  provinces: 'https://psgc.gitlab.io/api/provinces.json',
  municipalities: 'https://psgc.gitlab.io/api/municipalities.json',
  cities: 'https://psgc.gitlab.io/api/cities.json',
  barangays: 'https://psgc.gitlab.io/api/barangays.json'
};

const TARGET_PROVINCE_CODES = new Set([
  '041000000', // Batangas
  '042100000', // Cavite
  '043400000', // Laguna
  '045600000', // Quezon
  '045800000', // Rizal
  '175200000'  // Oriental Mindoro
]);

async function loadJson(url) {
  const response = await fetch(url, { headers: { 'accept': 'application/json' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function normaliseName(name) {
  return name
    .replace(/\s+/g, ' ')
    .trim();
}

function formatBarangaysDataset({
  regions,
  provinces,
  municipalities,
  cities,
  barangays
}) {
  const regionMap = new Map(regions.map((region) => [region.code, region]));
  const provinceMap = new Map(provinces.map((province) => [province.code, province]));

  const localGovernmentMap = new Map();
  municipalities.forEach((municipality) => {
    localGovernmentMap.set(municipality.code, {
      code: municipality.code,
      name: normaliseName(municipality.name),
      isCity: false,
      provinceCode: municipality.provinceCode,
      regionCode: municipality.regionCode
    });
  });

  cities.forEach((city) => {
    localGovernmentMap.set(city.code, {
      code: city.code,
      name: normaliseName(city.name),
      isCity: true,
      provinceCode: city.provinceCode,
      regionCode: city.regionCode
    });
  });

  const grouped = new Map();

  barangays.forEach((barangay) => {
    const provinceCode = barangay.provinceCode || null;
    if (!provinceCode || !TARGET_PROVINCE_CODES.has(provinceCode)) {
      return;
    }

    const province = provinceMap.get(provinceCode);
    if (!province) {
      return;
    }

    const region = regionMap.get(province.regionCode) || null;

    const provinceBucket = grouped.get(province.code) || {
      code: province.code,
      name: normaliseName(province.name),
      regionCode: province.regionCode,
      regionName: region ? normaliseName(region.name) : null,
      citiesAndMunicipalities: new Map()
    };

    const localGovernmentCode = barangay.cityCode || barangay.municipalityCode || null;
    let localGovernment = null;

    if (localGovernmentCode) {
      localGovernment = localGovernmentMap.get(localGovernmentCode);
    }

    const cityBucketKey = localGovernment ? localGovernment.code : `UNKNOWN-${province.code}`;
    const cityBucket = provinceBucket.citiesAndMunicipalities.get(cityBucketKey) || {
      code: localGovernment ? localGovernment.code : null,
      name: localGovernment ? localGovernment.name : 'Unassigned Local Government',
      isCity: localGovernment ? localGovernment.isCity : null,
      barangays: []
    };

    cityBucket.barangays.push({
      code: barangay.code,
      name: normaliseName(barangay.name)
    });

    provinceBucket.citiesAndMunicipalities.set(cityBucketKey, cityBucket);
    grouped.set(province.code, provinceBucket);
  });

  const sortedProvinces = Array.from(grouped.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((province) => ({
      code: province.code,
      name: province.name,
      regionCode: province.regionCode,
      regionName: province.regionName,
      citiesAndMunicipalities: Array.from(province.citiesAndMunicipalities.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((city) => ({
          code: city.code,
          name: city.name,
          isCity: city.isCity,
          barangays: city.barangays
            .sort((a, b) => a.name.localeCompare(b.name))
        }))
    }));

  return {
    generatedAt: new Date().toISOString(),
    source: 'https://psgc.gitlab.io/api/',
    provinces: sortedProvinces
  };
}

async function ensureDataDirectory() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function main() {
  console.log('📥 Fetching PSGC reference data...');
  const [regions, provinces, municipalities, cities, barangays] = await Promise.all([
    loadJson(DATA_SOURCES.regions),
    loadJson(DATA_SOURCES.provinces),
    loadJson(DATA_SOURCES.municipalities),
    loadJson(DATA_SOURCES.cities),
    loadJson(DATA_SOURCES.barangays)
  ]);

  console.log('🔄 Structuring dataset for CALABARZON and Oriental Mindoro...');
  const dataset = formatBarangaysDataset({
    regions,
    provinces,
    municipalities,
    cities,
    barangays
  });

  await ensureDataDirectory();

  console.log(`💾 Writing dataset to ${OUTPUT_PATH}...`);
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(dataset, null, 2), 'utf8');

  console.log('✅ Dataset generation complete.');
}

main().catch((error) => {
  console.error('❌ Failed to generate barangay dataset:', error);
  process.exitCode = 1;
});



