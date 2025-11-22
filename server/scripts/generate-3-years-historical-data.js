const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Optional data files - script will work without them
let barangayDataset = null;
let barangayCentroidPath = null;
try {
  const barangayJsonPath = path.join(__dirname, 'data', 'barangays-calabarzon-oriental-mindoro.json');
  if (fs.existsSync(barangayJsonPath)) {
    const fileContent = fs.readFileSync(barangayJsonPath, 'utf8');
    barangayDataset = JSON.parse(fileContent);
  }
} catch (e) {
  console.warn('⚠️  Barangay dataset not found, using fallback address generation');
}
try {
  // Try both possible file names
  barangayCentroidPath = path.join(__dirname, 'data', 'barangay-centroids-all.csv');
  if (!fs.existsSync(barangayCentroidPath)) {
    barangayCentroidPath = path.join(__dirname, 'data', 'barangay-centroids.csv');
    if (!fs.existsSync(barangayCentroidPath)) {
      barangayCentroidPath = null;
    }
  }
} catch (e) {
  barangayCentroidPath = null;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) {
    return [];
  }
  const headers = lines.shift().split(',').map(header => header.trim());
  const rows = [];

  for (const line of lines) {
    if (!line || !line.trim()) {
      continue;
    }

    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index].trim() : '';
    });
    rows.push(row);
  }

  return rows;
}

function loadBarangayCentroids(csvPath) {
  try {
    if (!fs.existsSync(csvPath)) {
      console.warn('⚠️ Barangay centroid file not found:', csvPath);
      return new Map();
    }

    const raw = fs.readFileSync(csvPath, 'utf8').trim();
    if (!raw) {
      return new Map();
    }

    const records = parseCsv(raw);
    const map = new Map();

    records.forEach((row) => {
      const code = (row.barangay_psgc || '').trim();
      if (!code) {
        return;
      }
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        return;
      }
      map.set(code, {
        latitude,
        longitude,
        regionCode: (row.region_psgc || '').trim() || null,
        provinceCode: (row.province_psgc || '').trim() || null,
        cityCode: (row.city_muni_psgc || '').trim() || null
      });
    });

    return map;
  } catch (error) {
    console.warn('⚠️ Unable to load barangay centroid data:', error.message);
    return new Map();
  }
}

const BARANGAY_COORDINATES = loadBarangayCentroids(barangayCentroidPath);

// Philippine names
const firstNames = [
  'Maria', 'Juan', 'Jose', 'Rosa', 'Ramon', 'Ana', 'Carlos', 'Isabel',
  'Miguel', 'Mercedes', 'Luis', 'Patricia', 'Roberto', 'Victoria',
  'Alfonso', 'Stephanie', 'Gabriel', 'Angela', 'Rafael', 'Monica',
  'Fernando', 'Carmen', 'Ricardo', 'Dolores', 'Manuel', 'Teresa',
  'Antonio', 'Gloria', 'Francisco', 'Rita', 'Pedro', 'Concepcion',
  'Enrique', 'Rosario', 'Jorge', 'Esperanza', 'Alberto', 'Amparo'
];

const lastNames = [
  'Santos', 'Cruz', 'dela Cruz', 'Reyes', 'Garcia', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Fernandez', 'Ramirez', 'Torres',
  'Rivera', 'Gomez', 'Diaz', 'Navarro', 'Morales', 'Ruiz', 'Ortiz',
  'Villanueva', 'Castillo', 'Ramos', 'Mendoza', 'Flores', 'Bautista',
  'Aquino', 'Castro', 'Dela Rosa', 'Villanueva', 'Perez', 'Ramos'
];

const teamNames = [
  'Manila Dragons', 'Cavite Warriors', 'Batangas Bulls', 'Lemery Phoenix',
  'Calapan Knights', 'Muzon Tigers', 'Rosario Raptors', 'Pinamalayan Panthers',
  'Bauan Badgers', 'Calaca Crushers', 'Metro Hawks', 'Provincial Pride',
  'Thunder Strikers', 'Phoenix Rising', 'Golden Giants', 'Silver Stallions',
  'Emerald Eagles', 'Diamond Dragons', 'Ruby Rebels', 'Sapphire Stars',
  'Batangas City Titans', 'San Pascual Sharks', 'Calaca Cobras', 'Lemery Lions',
  'Rosario Rhinos', 'Muzon Mustangs', 'Calapan Cougars', 'Bauan Bears'
];

const DEFAULT_BARANGAYS = [
  'Poblacion', 'Barangay 1', 'San Roque', 'San Jose', 'San Antonio',
  'San Miguel', 'San Isidro', 'Dalig', 'Balagtas', 'Santa Cruz',
  'Santa Maria', 'Sampaguita', 'Maligaya', 'Centro'
];

function normaliseKey(value) {
  if (!value) {
    return '';
  }
  return value.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function buildBarangayLookups(dataset) {
  const cityLookup = new Map();
  const provinceLookup = new Map();
  const cityProvinceLookup = new Map();

  if (!dataset || !Array.isArray(dataset.provinces)) {
    return { cityLookup, provinceLookup, cityProvinceLookup };
  }

  dataset.provinces.forEach((province) => {
    const provinceKey = normaliseKey(province.name);
    if (!provinceLookup.has(provinceKey)) {
      provinceLookup.set(provinceKey, new Map());
    }
    const provinceBucket = provinceLookup.get(provinceKey);

    province.citiesAndMunicipalities
      .filter(Boolean)
      .forEach((localGovernment) => {
        const barangayEntries = (localGovernment.barangays || [])
          .filter(Boolean)
          .map((barangay) => {
            const code = barangay.code || null;
            const centroid = code ? BARANGAY_COORDINATES.get(barangay.code) : null;
            return {
              code,
              name: barangay.name,
              cityCode: localGovernment.code || null,
              provinceCode: province.code || null,
              regionCode: province.regionCode || null,
              latitude: centroid?.latitude ?? null,
              longitude: centroid?.longitude ?? null
            };
          })
          .filter((entry) => entry.name);

        barangayEntries.forEach((entry) => {
          const key = entry.code || `${entry.name}:${localGovernment.code}`;
          provinceBucket.set(key, entry);
        });

        const namesToIndex = new Set([
          localGovernment.name,
          localGovernment.name.replace(/^City of\s+/i, ''),
          localGovernment.name.replace(/\s+City$/i, ''),
          localGovernment.name.replace(/^Municipality of\s+/i, '')
        ]);

        namesToIndex.forEach((nameVariant) => {
          const key = normaliseKey(nameVariant);
          if (!key) {
            return;
          }

          const combinedKey = `${provinceKey}|${key}`;
          if (!cityProvinceLookup.has(combinedKey)) {
            cityProvinceLookup.set(combinedKey, new Map());
          }
          const combinedBucket = cityProvinceLookup.get(combinedKey);
          const entryPairs = barangayEntries.map((entry) => {
            const entryKey = entry.code || `${entry.name}:${localGovernment.code}`;
            combinedBucket.set(entryKey, entry);
            return [entryKey, entry];
          });

          const existing = cityLookup.get(key);
          if (!existing) {
            cityLookup.set(key, {
              province: province.name,
              region: province.regionName,
              barangays: new Map(entryPairs)
            });
          } else {
            entryPairs.forEach(([entryKey, entry]) => {
              existing.barangays.set(entryKey, entry);
            });
          }
        });
      });
  });

  return {
    cityLookup,
    provinceLookup,
    cityProvinceLookup
  };
}

const {
  cityLookup: BARANGAY_CITY_LOOKUP,
  provinceLookup: BARANGAY_PROVINCE_LOOKUP,
  cityProvinceLookup: BARANGAY_CITY_PROVINCE_LOOKUP
} =
  buildBarangayLookups(barangayDataset);

const CITY_DATA = [
  {
    city: 'Batangas City',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4200,
    lat: 13.7565,
    lng: 121.0583,
    barangays: [
      'Alangilan',
      'Balagtas',
      'Barangay 1 (Poblacion)',
      'Barangay 2 (Poblacion)',
      'Barangay 3 (Poblacion)',
      'Barangay 4 (Poblacion)',
      'Bolbok',
      'Concepcion',
      'Gulod Labac',
      'Kumintang Ibaba',
      'Kumintang Ilaya',
      'Malitam',
      'Pallocan West',
      'San Agapito',
      'San Isidro'
    ]
  },
  {
    city: 'San Pascual',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4204,
    lat: 13.8011,
    lng: 121.016,
    barangays: [
      'Antipolo',
      'Banaba',
      'Ilat North',
      'Ilat South',
      'Mabini',
      'Mataas na Lupa',
      'Natunuan North',
      'Natunuan South',
      'Payapa',
      'Poblacion',
      'San Antonio',
      'San Mateo',
      'Santa Cruz',
      'Santo Niño',
      'Tilos'
    ]
  },
  {
    city: 'San Luis',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4210,
    lat: 13.822,
    lng: 120.918,
    barangays: [
      'Abelo',
      'Aplaya',
      'Bagong Tubig',
      'Balite',
      'Banoyo',
      'Boboy',
      'Bolbok',
      'Calumpang',
      'Calumpit',
      'Cumba',
      'Durungao',
      'Hugom',
      'Mahabang Parang',
      'Muzon',
      'Nagsaulay',
      'San Antonio',
      'San Isidro',
      'San Jose',
      'San Martin',
      'San Miguel',
      'San Nicolas',
      'San Pedro',
      'San Roque',
      'San Vicente',
      'Talaga',
      'Ticalan'
    ]
  },
  {
    city: 'Lemery',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4209,
    lat: 13.9445,
    lng: 120.9139,
    barangays: [
      'Bagong Sikat',
      'Barangay 1 (Poblacion)',
      'Barangay 2 (Poblacion)',
      'Barangay 3 (Poblacion)',
      'Barangay 4 (Poblacion)',
      'Bucal',
      'Cahilan 1',
      'Cahilan 2',
      'District I (Poblacion)',
      'Maguihan',
      'Mataas na Bayan',
      'Morong',
      'Palanas',
      'Sangalang',
      'Wawa'
    ]
  },
  {
    city: 'Bauan',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4201,
    lat: 13.7894,
    lng: 121.0084,
    barangays: [
      'Aplaya',
      'Apacay',
      'Bolo',
      'Cupang',
      'Gulibay',
      'Ilihan',
      'Locloc',
      'Manghinao Proper',
      'Manghinao Uno',
      'Poblacion 1',
      'Poblacion 2',
      'Poblacion 3',
      'Poblacion 4',
      'Sampaguita',
      'San Andres Proper'
    ]
  },
  {
    city: 'Calaca',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4212,
    lat: 13.9324,
    lng: 120.8134,
    barangays: [
      'Baclas',
      'Bagong Pook',
      'Balimbing',
      'Barangay 1 (Poblacion)',
      'Barangay 2 (Poblacion)',
      'Barangay 3 (Poblacion)',
      'Calantas',
      'Camastilisan',
      'Dacanlao',
      'Lumbang Calzada',
      'Lumbang Nazaret',
      'Madalunot',
      'Munting Coral',
      'Pantay',
      'Talisay'
    ]
  },
  {
    city: 'Rosario',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4225,
    lat: 13.846,
    lng: 121.2058,
    barangays: [
      'Antipolo',
      'Bagong Pook',
      'Balibago',
      'Bayawang',
      'Calantas',
      'Itlugan',
      'Lumbangan',
      'Maalas-as',
      'Malaya',
      'Masaya',
      'Namuco',
      'Poblacion A',
      'Poblacion B',
      'San Carlos',
      'Tiquiwan'
    ]
  },
  {
    city: 'Lipa',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4217,
    lat: 13.9411,
    lng: 121.1631,
    barangays: [
      'Adya',
      'Anilao Proper',
      'Balintawak',
      'Banaybanay',
      'Bo. Obrero (Poblacion)',
      'Dagatan',
      'Latag',
      'Mataas na Lupa',
      'Sabang',
      'San Carlos',
      'San Celestino',
      'San Jose',
      'San Salvador',
      'Santo Toribio',
      'Barangay 7 (Poblacion)'
    ]
  },
  {
    city: 'Tanauan',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4232,
    lat: 14.0866,
    lng: 121.1495,
    barangays: [
      'Bagumbayan',
      'Balele',
      'Bilogo',
      'Darasa',
      'Gonzales',
      'Laurel',
      'Poblacion 1',
      'Poblacion 3',
      'Sala',
      'Sampalukan',
      'Sulpoc',
      'Talaga',
      'Tinurik',
      'Ulango',
      'Wawa'
    ]
  },
  {
    city: 'Calapan',
    province: 'Oriental Mindoro',
    region: 'MIMAROPA',
    postalCode: 5200,
    lat: 13.41,
    lng: 121.18,
    barangays: [
      'Bayanan I',
      'Bayanan II',
      'Balite',
      'Balingayan',
      'Baruyan',
      'Calero',
      'Camansihan',
      'Guinobatan',
      'Ibaba East',
      'Ibaba West',
      'Lalud',
      'Lumangbayan',
      'Navotas',
      'Pachoca',
      'San Vicente'
    ]
  },
  {
    city: 'Pinamalayan',
    province: 'Oriental Mindoro',
    region: 'MIMAROPA',
    postalCode: 5208,
    lat: 13.0007,
    lng: 121.4166,
    barangays: [
      'Buli',
      'Cacawan',
      'Guinhawa',
      'Malaya',
      'Maligaya',
      'Maningcol',
      'Marfrancisco',
      'Pacheco',
      'Panggulayan',
      'Poblacion I',
      'Poblacion II',
      'Ranzo',
      'Rosario',
      'Santa Maria',
      'Sto. Niño'
    ]
  },
  {
    city: 'San Jose del Monte City',
    province: 'Bulacan',
    region: 'Central Luzon',
    postalCode: 3023,
    lat: 14.8133,
    lng: 121.0459,
    barangays: [
      'Bagong Buhay I',
      'Bagong Buhay II',
      'Bagong Buhay III',
      'Citrus',
      'Graceville',
      'Minuyan Proper',
      'Muzon',
      'San Manuel',
      'San Martin I',
      'San Martin II',
      'San Martin III',
      'San Martin IV',
      'San Pedro',
      'Santo Cristo',
      'Sapang Palay Proper'
    ]
  },
  {
    city: 'Santa Rosa',
    province: 'Laguna',
    region: 'CALABARZON',
    postalCode: 4026,
    lat: 14.3122,
    lng: 121.1119,
    barangays: ['Balibago', 'Tagapo', 'Malusak', 'Dila', 'Santo Domingo']
  },
  {
    city: 'Calamba',
    province: 'Laguna',
    region: 'CALABARZON',
    postalCode: 4027,
    lat: 14.2117,
    lng: 121.1652,
    barangays: ['Poblacion 1', 'Pansol', 'Looc', 'Canlubang', 'Makiling']
  },
  {
    city: 'Nasugbu',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4231,
    lat: 14.0676,
    lng: 120.6307,
    barangays: ['Poblacion 2', 'Wawa', 'Looc', 'Biliran', 'Calayaan']
  },
  {
    city: 'Balayan',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4213,
    lat: 13.9377,
    lng: 120.7321,
    barangays: ['Barangay 1', 'Dacanlao', 'Calzada', 'Magabe', 'Palikpikan']
  },
  {
    city: 'Sto. Tomas',
    province: 'Batangas',
    region: 'CALABARZON',
    postalCode: 4234,
    lat: 14.1086,
    lng: 121.1419,
    barangays: ['Poblacion Barangay 1', 'San Roque', 'Santa Teresita', 'San Pedro', 'San Miguel']
  }
];

const FAR_CITY_DATA = [
  {
    city: 'Quezon City',
    province: 'Metro Manila',
    region: 'NCR',
    postalCode: 1100,
    lat: 14.676,
    lng: 121.0437,
    barangays: ['Project 4', 'Batasan Hills', 'Cubao', 'Talipapa', 'Matandang Balara']
  },
  {
    city: 'Cebu City',
    province: 'Cebu',
    region: 'Central Visayas',
    postalCode: 6000,
    lat: 10.3157,
    lng: 123.8854,
    barangays: ['Lahug', 'Guadalupe', 'Banilad', 'Mabolo', 'Apas']
  },
  {
    city: 'Davao City',
    province: 'Davao del Sur',
    region: 'Davao Region',
    postalCode: 8000,
    lat: 7.1907,
    lng: 125.4553,
    barangays: ['Buhangin', 'Talomo', 'Toril', 'Agdao', 'Baguio']
  },
  {
    city: 'Iloilo City',
    province: 'Iloilo',
    region: 'Western Visayas',
    postalCode: 5000,
    lat: 10.7202,
    lng: 122.5621,
    barangays: ['Jaro', 'La Paz', 'Mandurriao', 'Molo', 'City Proper']
  },
  {
    city: 'Baguio City',
    province: 'Benguet',
    region: 'CAR',
    postalCode: 2600,
    lat: 16.4023,
    lng: 120.596,
    barangays: ['Irisan', 'Loakan', 'Aurora Hill', 'Camp 7', 'Legarda']
  }
];

const CITY_LOOKUP = new Map(CITY_DATA.map(city => [city.city.toUpperCase(), city]));
const FAR_CITY_LOOKUP = new Map(FAR_CITY_DATA.map(city => [city.city.toUpperCase(), city]));

function generateYearlyCustomerTargets() {
  // Target ~900 total customers with orders, maintaining growth pattern
  // Distribution: ~200 (2022), ~250 (2023), ~300 (2024), ~250 (2025 - 10 months through October)
  return [
    getRandomInt(180, 220),  // 2022 foundation year (~200)
    getRandomInt(230, 270),  // 2023 growth (~250)
    getRandomInt(280, 320),  // 2024 expansion (~300)
    getRandomInt(230, 270)   // 2025 partial year through October (~250, proportional to 10 months)
  ];
}

const YEARLY_CUSTOMER_TARGETS = generateYearlyCustomerTargets();
const YEARS_TO_GENERATE = YEARLY_CUSTOMER_TARGETS.length;
const TOTAL_CUSTOMER_TARGET = YEARLY_CUSTOMER_TARGETS.reduce((sum, value) => sum + value, 0);
const CUSTOMER_CREATION_DELAY_MS = 50;
const LOYAL_SHARE = 0.12;
const ENGAGED_SHARE = 0.38;
const BRANCH_PRIORITY_WEIGHTS = {
  'BATANGAS CITY BRANCH': 1.8,
  'SAN PASCUAL (MAIN BRANCH)': 1.6,
  'CALAPAN BRANCH': 1.35,
  'LEMERY BRANCH': 1.3,
  'BAUAN BRANCH': 1.28,
  'CALACA BRANCH': 1.28,
  'PINAMALAYAN BRANCH': 1.25,
  'ROSARIO BRANCH': 1.25,
  'MUZON BRANCH': 1.55,
  'SAN LUIS BRANCH': 1.55
};

const BRANCH_TO_CITY = new Map(
  [
    ['BATANGAS CITY BRANCH', 'BATANGAS CITY'],
    ['BATANGAS CITY', 'BATANGAS CITY'],
    ['SAN PASCUAL (MAIN BRANCH)', 'SAN PASCUAL'],
    ['SAN PASCUAL BRANCH', 'SAN PASCUAL'],
    ['CALAPAN BRANCH', 'CALAPAN'],
    ['LEMERY BRANCH', 'LEMERY'],
    ['BAUAN BRANCH', 'BAUAN'],
    ['CALACA BRANCH', 'CALACA'],
    ['PINAMALAYAN BRANCH', 'PINAMALAYAN'],
    ['ROSARIO BRANCH', 'ROSARIO'],
    ['MUZON BRANCH', 'SAN LUIS'],
    ['SAN LUIS BRANCH', 'SAN LUIS']
  ].map(([branch, city]) => [branch.toUpperCase(), city.toUpperCase()])
);

const BRANCH_FOCUS_BARANGAYS = new Map(
  [
    ['MUZON BRANCH', ['Muzon', 'San Antonio', 'San Jose', 'San Nicolas', 'Calumpit']],
    ['SAN LUIS BRANCH', ['Muzon', 'San Antonio', 'San Martin', 'San Roque']]
  ].map(([branch, barangays]) => [normaliseKey(branch), barangays])
);

const CUSTOMER_JERSEY_DESIGNS = new Map();
const GLOBAL_JERSEY_DESIGNS = new Set();
let syntheticProductCounter = 0;
const COVID_RECOVERY_END = new Date(2022, 6, 1);

// Product categories and prices
const productCategories = {
  sublimation: {
    basketball: { kids: 850, adult: 1050, upper_kids: 450, upper_adult: 650 },
    volleyball: { kids: 850, adult: 1050, upper_kids: 450, upper_adult: 650 }
  },
  hoodie: { kids: 700, adult: 900 },
  sports_materials: {
    ball: { basketball: 450, volleyball: 380, football: 420 },
    medal: { gold: 150, silver: 120, bronze: 100 },
    trophy: { small: 800, medium: 1200, large: 1800 }
  }
};

const sizes = {
  kids: ['S6', 'S8', 'S10', 'S12', 'S14'],
  adult: ['S', 'M', 'L', 'XL', 'XXL']
};

const CATEGORY_MAP = {
  'jerseys': 'jerseys',
  'hoodies': 'hoodies',
  'uniforms': 'uniforms',
  't-shirts': 'tshirts',
  'tshirts': 'tshirts',
  'long sleeves': 'longsleeves',
  'long sleeve': 'longsleeves',
  'balls': 'balls',
  'trophies': 'trophies'
};

const APPAREL_CATEGORY_KEYS = ['jerseys', 'hoodies', 'uniforms', 'tshirts', 'longsleeves'];

const BALL_BRANDS = ['Molten', 'Spalding', 'Wilson', 'Yohanns', 'Mikasa', 'Meteor'];
const BALL_MATERIALS = ['Composite Leather', 'Synthetic Leather', 'Rubber', 'Microfiber', 'PU Leather'];
const BALL_SIZES = ['4', '5', '6', '7'];

const TROPHY_TYPES = ['Championship', 'MVP', 'Best Setter', 'Best Spiker', 'Champion', 'Runner-Up', 'Top Scorer'];
const TROPHY_SIZES = ['Small', 'Medium', 'Large'];
const TROPHY_MATERIALS = ['Acrylic', 'Wood', 'Metal', 'Crystal'];
const TROPHY_OCCASIONS = ['Intramurals', 'Regional Cup', 'Corporate League', 'Friendly Match', 'All-Star Tournament'];

let PRODUCT_CATALOG = null;

function createEmptyCatalog() {
  return {
    jerseys: [],
    hoodies: [],
    uniforms: [],
    tshirts: [],
    longsleeves: [],
    balls: [],
    trophies: [],
    others: [],
    apparel: [],
    all: []
  };
}

async function loadProductCatalog() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,category,price,main_image,jersey_prices');

    if (error) {
      console.warn('⚠️ Unable to load products from Supabase:', error.message);
      return createEmptyCatalog();
    }

    const catalog = createEmptyCatalog();
    (data || []).forEach((product) => {
      if (!product) {
        return;
      }

      const categoryKey = CATEGORY_MAP[(product.category || '').trim().toLowerCase()] || 'others';
      if (!catalog[categoryKey]) {
        catalog[categoryKey] = [];
      }

      catalog[categoryKey].push(product);
      catalog.all.push(product);
    });

    catalog.apparel = APPAREL_CATEGORY_KEYS
      .flatMap((key) => catalog[key] || [])
      .filter(Boolean);

    return catalog;
  } catch (error) {
    console.warn('⚠️ Failed to load product catalog:', error.message);
    return createEmptyCatalog();
  }
}

function ensureProductCatalog() {
  if (!PRODUCT_CATALOG) {
    throw new Error('Product catalog not loaded');
  }
}

function pickProductFromCatalog(primaryKeys, fallbackKeys = []) {
  ensureProductCatalog();

  const keys = Array.isArray(primaryKeys) ? primaryKeys : [primaryKeys];
  for (const key of keys) {
    const list = PRODUCT_CATALOG[key];
    if (list && list.length > 0) {
      return getRandomElement(list);
    }
  }

  const fallbackList = Array.isArray(fallbackKeys) ? fallbackKeys : [fallbackKeys];
  for (const key of fallbackList) {
    const list = PRODUCT_CATALOG[key];
    if (list && list.length > 0) {
      return getRandomElement(list);
    }
  }

  if (keys.some((key) => APPAREL_CATEGORY_KEYS.includes(key)) && PRODUCT_CATALOG.apparel.length > 0) {
    return getRandomElement(PRODUCT_CATALOG.apparel);
  }

  if (PRODUCT_CATALOG.all.length > 0) {
    return getRandomElement(PRODUCT_CATALOG.all);
  }

  return null;
}

function parsePrice(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return fallback;
}

function generateAlphaNumericToken(length = 5) {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function createSyntheticProduct(category, options = {}) {
  syntheticProductCounter += 1;
  const token = generateAlphaNumericToken(4);
  const baseId = `SYN-${category.toUpperCase()}-${syntheticProductCounter}-${token}`;
  const teamLabel = (options.teamName || 'Elite Squad').toString().trim();

  switch (category) {
    case 'jersey': {
      const sport = options.sportType || 'Sports';
      const fullSetPrice = options.fullSetPrice || getRandomInt(1180, 1420);
      const shirtOnlyPrice = options.shirtOnlyPrice || Math.max(680, Math.round(fullSetPrice * 0.68));
      const shortsOnlyPrice = options.shortsOnlyPrice || Math.max(520, Math.round(fullSetPrice * 0.48));
      return {
        id: baseId,
        name: `Custom ${sport} Jersey - ${teamLabel} ${token}`,
        category: 'jerseys',
        price: fullSetPrice,
        jersey_prices: {
          fullSet: fullSetPrice,
          shirtOnly: shirtOnlyPrice,
          shortsOnly: shortsOnlyPrice
        },
        main_image: null
      };
    }
    case 'hoodies':
    case 'uniforms':
    case 'tshirts':
    case 'longsleeves': {
      const price = options.basePrice || getRandomInt(780, 1220);
      const label = category.replace(/s$/, '');
      return {
        id: baseId,
        name: `${teamLabel} ${label.charAt(0).toUpperCase()}${label.slice(1)} Set ${token}`,
        category,
        price,
        main_image: null
      };
    }
    case 'ball': {
      const ballType = options.ballType || 'basketball';
      const price = options.basePrice || getRandomInt(1650, 2250);
      return {
        id: baseId,
        name: `${ballType.charAt(0).toUpperCase()}${ballType.slice(1)} Velocity Ball ${token}`,
        category: 'Balls',
        price,
        main_image: null
      };
    }
    case 'trophy': {
      const size = options.size || getRandomElement(['Small', 'Medium', 'Large']);
      const price = options.basePrice || getRandomInt(820, 1450);
      return {
        id: baseId,
        name: `${size} Victory Trophy ${token}`,
        category: 'Trophies',
        price,
        main_image: null
      };
    }
    case 'medal': {
      const medalType = options.medalType || getRandomElement(['Gold', 'Silver', 'Bronze']);
      const price = options.basePrice || getRandomInt(95, 190);
      return {
        id: baseId,
        name: `${medalType} Achievement Medal ${token}`,
        category: 'Medals',
        price,
        main_image: null
      };
    }
    default: {
      const price = options.basePrice || getRandomInt(650, 1100);
      return {
        id: baseId,
        name: `${teamLabel} Custom Gear ${token}`,
        category: category || 'apparel',
        price,
        main_image: null
      };
    }
  }
}

function buildTeamMembers(teamName, teamSize, sizeType, variantKey = 'fullSet') {
  const normalisedSizeType = sizeType === 'kids' ? 'kids' : 'adult';
  const sizePool = normalisedSizeType === 'kids' ? sizes.kids : sizes.adult;
  const normalisedVariant = typeof variantKey === 'string' && variantKey.length > 0
    ? variantKey
    : 'fullSet';
  const members = [];

  for (let i = 0; i < teamSize; i += 1) {
    const firstName = getRandomElement(firstNames);
    const surname = getRandomElement(lastNames);
    const jerseySize = normalisedVariant === 'shortsOnly' ? null : getRandomElement(sizePool);
    let shortsSize = null;

    if (normalisedVariant === 'shirtOnly') {
      shortsSize = null;
    } else if (normalisedVariant === 'fullSet') {
      shortsSize = jerseySize;
    } else {
      shortsSize = getRandomElement(sizePool);
    }
    const jerseyNumber = getRandomInt(1, 99);
    let baseSize = null;

    if (normalisedVariant === 'fullSet') {
      baseSize = jerseySize || getRandomElement(sizePool);
    } else if (normalisedVariant === 'shirtOnly') {
      baseSize = jerseySize;
    } else if (normalisedVariant === 'shortsOnly') {
      baseSize = null;
    }

    const member = {
      teamName,
      team_name: teamName,
      firstName,
      surname,
      number: jerseyNumber,
      jerseyNo: jerseyNumber,
      jerseyNumber,
      sizingType: normalisedSizeType,
      size: baseSize
    };

    if (jerseySize !== null) {
      member.jerseySize = jerseySize;
    } else {
      member.jerseySize = null;
    }

    if (shortsSize !== null) {
      member.shortsSize = shortsSize;
    } else {
      member.shortsSize = null;
    }

    members.push(member);
  }

  return members;
}

function buildSingleOrderDetails(teamName, sizeType, variantKey = 'fullSet') {
  const normalisedSizeType = sizeType === 'kids' ? 'kids' : 'adult';
  const sizePool = normalisedSizeType === 'kids' ? sizes.kids : sizes.adult;
  const normalisedVariant = typeof variantKey === 'string' && variantKey.length > 0
    ? variantKey
    : 'fullSet';
  const surname = getRandomElement(lastNames);
  const jerseySize = normalisedVariant === 'shortsOnly' ? null : getRandomElement(sizePool);
  let shortsSize = null;

  if (normalisedVariant === 'shirtOnly') {
    shortsSize = null;
  } else if (normalisedVariant === 'shortsOnly') {
    shortsSize = getRandomElement(sizePool);
  } else {
    shortsSize = jerseySize;
  }
  const jerseyNumber = getRandomInt(1, 99);
  let baseSize = null;

  if (normalisedVariant === 'shirtOnly') {
    baseSize = jerseySize;
  } else if (normalisedVariant === 'shortsOnly') {
    baseSize = null;
  } else {
    baseSize = jerseySize || getRandomElement(sizePool);
  }

  const details = {
    teamName,
    surname,
    number: jerseyNumber,
    jerseyNo: jerseyNumber,
    jerseyNumber,
    sizingType: normalisedSizeType,
    size: baseSize
  };

  if (jerseySize !== null) {
    details.jerseySize = jerseySize;
  } else {
    details.jerseySize = null;
  }

  if (shortsSize !== null) {
    details.shortsSize = shortsSize;
  } else {
    details.shortsSize = null;
  }

  return details;
}

function buildBallDetails(productName = '') {
  const lowerName = productName.toLowerCase();
  let sportType = 'Basketball';
  if (lowerName.includes('volley')) {
    sportType = 'Volleyball';
  } else if (lowerName.includes('foot')) {
    sportType = 'Football';
  }

  const brandCandidate = productName.split(' ').find((part) => /^[a-z0-9]/i.test(part));
  const brand = brandCandidate ? brandCandidate.replace(/[^a-z0-9]/gi, '') : getRandomElement(BALL_BRANDS);

  return {
    sportType,
    brand,
    ballSize: getRandomElement(BALL_SIZES),
    material: getRandomElement(BALL_MATERIALS)
  };
}

function buildTrophyDetails(productName = '', teamName = '') {
  const trophyType = TROPHY_TYPES.find((type) => productName.toLowerCase().includes(type.toLowerCase())) || getRandomElement(TROPHY_TYPES);
  const engravingName = teamName || productName.split(' ')[0] || 'Champion';
  return {
    trophyType,
    size: getRandomElement(TROPHY_SIZES),
    material: getRandomElement(TROPHY_MATERIALS),
    engravingText: `Congratulations ${engravingName}!`,
    occasion: getRandomElement(TROPHY_OCCASIONS)
  };
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePlayerName() {
  return `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
}

function generatePhoneNumber() {
  const prefixes = ['0917', '0927', '0937', '0947', '0957', '0967', '0977', '0987', '0997'];
  return `${getRandomElement(prefixes)}${getRandomInt(1000000, 9999999)}`;
}

function assignUniqueJerseyDesigns(orderItems, userId, orderDate) {
  if (!Array.isArray(orderItems) || !userId) {
    return orderItems;
  }

  const existingDesigns = CUSTOMER_JERSEY_DESIGNS.get(userId) || new Set();
  const yearSegment = orderDate instanceof Date ? orderDate.getFullYear() : null;

  const updatedItems = orderItems.map((item) => {
    if (!item) {
      return item;
    }

    const productType = (item.product_type || '').toString().toLowerCase();
    const categoryType = (item.category || '').toString().toLowerCase();
    const isJerseyProduct = productType.includes('jersey')
      || productType.includes('sublimation')
      || categoryType.includes('jersey')
      || categoryType.includes('sublimation');

    if (!isJerseyProduct) {
      return item;
    }

    const baseTeamName =
      item.teamName
      || item.team_name
      || item.singleOrderDetails?.teamName
      || item.single_order_details?.teamName
      || 'Custom';

    let designName;
    let attempts = 0;

    do {
      const token = generateAlphaNumericToken(4 + (attempts % 2));
      const yearPart = yearSegment ? `${yearSegment}` : '';
      const baseLabel = `${baseTeamName} ${yearPart}`.trim();
      designName = baseLabel ? `${baseLabel} ${token}` : `Custom Design ${token}`;
      attempts += 1;
    } while ((existingDesigns.has(designName) || GLOBAL_JERSEY_DESIGNS.has(designName)) && attempts < 6);

    while (existingDesigns.has(designName) || GLOBAL_JERSEY_DESIGNS.has(designName)) {
      designName = `${designName}-${generateAlphaNumericToken(2)}`;
    }

    existingDesigns.add(designName);
    GLOBAL_JERSEY_DESIGNS.add(designName);

    const updated = { ...item };
    updated.jerseyDesignName = designName;
    updated.design_name = designName;
    updated.name = `Custom ${(updated.sport || 'Team')} Jersey - ${designName}`;
    return updated;
  });

  CUSTOMER_JERSEY_DESIGNS.set(userId, existingDesigns);
  return updatedItems;
}

function getBarangaysForLocation(cityName, provinceName) {
  const cityKey = normaliseKey(cityName);
  const provinceKey = normaliseKey(provinceName);

  if (cityKey && provinceKey) {
    const combinedKey = `${provinceKey}|${cityKey}`;
    if (BARANGAY_CITY_PROVINCE_LOOKUP.has(combinedKey)) {
      const entries = Array.from(BARANGAY_CITY_PROVINCE_LOOKUP.get(combinedKey).values());
      if (entries.length > 0) {
        return entries;
      }
    }
  }

  if (cityKey && BARANGAY_CITY_LOOKUP.has(cityKey)) {
    const entries = Array.from(BARANGAY_CITY_LOOKUP.get(cityKey).barangays.values());
    if (provinceKey) {
      const filtered = entries.filter((entry) => {
        if (!entry?.provinceCode) {
          return true;
        }
        const provinceBucket = BARANGAY_PROVINCE_LOOKUP.get(provinceKey);
        if (!provinceBucket) {
          return true;
        }
        const entryKey = entry.code || `${entry.name}:${entry.cityCode || ''}`;
        return provinceBucket.has(entryKey);
      });
      if (filtered.length > 0) {
        return filtered;
      }
    }
    return entries;
  }

  if (provinceKey && BARANGAY_PROVINCE_LOOKUP.has(provinceKey)) {
    return Array.from(BARANGAY_PROVINCE_LOOKUP.get(provinceKey).values());
  }

  return null;
}

function toBarangayObject(entry, fallback = {}) {
  if (!entry) {
    return {
      code: null,
      name: 'Poblacion',
      cityCode: fallback.cityCode || null,
      provinceCode: fallback.provinceCode || null,
      regionCode: fallback.regionCode || null,
      latitude: null,
      longitude: null
    };
  }

  if (typeof entry === 'string') {
    return {
      code: null,
      name: entry,
      cityCode: fallback.cityCode || null,
      provinceCode: fallback.provinceCode || null,
      regionCode: fallback.regionCode || null,
      latitude: null,
      longitude: null
    };
  }

  return {
    code: entry.code || null,
    name: entry.name || entry.barangay_name || 'Poblacion',
    cityCode: entry.cityCode || entry.city_muni_psgc || fallback.cityCode || null,
    provinceCode: entry.provinceCode || fallback.provinceCode || null,
    regionCode: entry.regionCode || fallback.regionCode || null,
    latitude: entry.latitude ?? null,
    longitude: entry.longitude ?? null
  };
}

function generateAddress(branchName) {
  const cityData = selectCityForBranch(branchName);
  const enrichedBarangays = getBarangaysForLocation(cityData.city, cityData.province);
  const fallbackBarangays = (cityData.barangays && cityData.barangays.length
    ? cityData.barangays
    : DEFAULT_BARANGAYS).map((entry) => toBarangayObject(entry, {
    provinceCode: null,
    cityCode: null,
    regionCode: null
  }));

  const resolvedBarangays = Array.isArray(enrichedBarangays) && enrichedBarangays.length
    ? enrichedBarangays.map((entry) => toBarangayObject(entry, {
      provinceCode: entry?.provinceCode || null,
      cityCode: entry?.cityCode || null,
      regionCode: entry?.regionCode || null
    }))
    : fallbackBarangays;

  const focusBarangays = BRANCH_FOCUS_BARANGAYS.get(normaliseKey(branchName)) || null;
  let selectionPool = resolvedBarangays;

  if (focusBarangays && focusBarangays.length) {
    const focusSet = new Set(focusBarangays.map(normaliseKey));
    const prioritized = resolvedBarangays.filter(entry =>
      entry && entry.name && focusSet.has(normaliseKey(entry.name))
    );
    if (prioritized.length > 0) {
      // Strong bias towards focus barangays while keeping global coverage
      if (Math.random() < 0.75) {
        selectionPool = prioritized;
      } else {
        selectionPool = prioritized.concat(resolvedBarangays);
      }
    }
  }

  const selectedBarangay = selectionPool.length > 0
    ? getRandomElement(selectionPool)
    : getRandomElement(resolvedBarangays);

  const barangayEntry = toBarangayObject(selectedBarangay, {
    provinceCode: null,
    cityCode: null,
    regionCode: null
  });
  const streetNumber = getRandomInt(1, 999);
  const streetName = getRandomElement(['Rizal', 'Bonifacio', 'Aguinaldo', 'Luna', 'Mabini', 'Del Pilar', 'Burgos', 'Gomez']);
  const postalCode = cityData.postalCode ? cityData.postalCode + getRandomInt(0, 12) : getRandomInt(4000, 4500);
  const fullAddress = `${streetNumber} ${streetName} STREET, ${barangayEntry.name}, ${cityData.city}, ${cityData.province} ${postalCode}`;
  const centroidFromLookup = barangayEntry.code ? BARANGAY_COORDINATES.get(barangayEntry.code) : null;
  const latitudeBase = centroidFromLookup?.latitude ?? barangayEntry.latitude;
  const longitudeBase = centroidFromLookup?.longitude ?? barangayEntry.longitude;
  const jitter = cityData.region === 'CALABARZON' || cityData.region === 'MIMAROPA' ? 0.004 : 0.02;
  const latitude = (
    latitudeBase ?? (cityData.lat + (Math.random() - 0.5) * jitter)
  ).toFixed(6);
  const longitude = (
    longitudeBase ?? (cityData.lng + (Math.random() - 0.5) * jitter)
  ).toFixed(6);

  return {
    address: fullAddress,
    street: `${streetNumber} ${streetName} STREET`,
    barangay: barangayEntry.name,
    barangay_code: barangayEntry.code,
    city: cityData.city,
    province: cityData.province,
    postal_code: postalCode.toString(),
    phone: generatePhoneNumber(),
    receiver: generatePlayerName(),
    latitude: Number(latitude),
    longitude: Number(longitude),
    coordinates: null,
    region: cityData.region
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFabricType(category, productType) {
  // Use the actual fabric types from the system
  // Fabric options: Polydex (default, 0), Microcool (100), Aircool (100), Drifit (100), Square Mesh (100)
  const fabricTypes = ['Polydex', 'Microcool', 'Aircool', 'Drifit', 'Square Mesh'];
  
  // Weighted selection: 60% Polydex (default), 40% others (10% each)
  const roll = Math.random();
  if (roll < 0.6) {
    return 'Polydex'; // Default, most common
  } else if (roll < 0.7) {
    return 'Microcool';
  } else if (roll < 0.8) {
    return 'Aircool';
  } else if (roll < 0.9) {
    return 'Drifit';
  } else {
    return 'Square Mesh';
  }
}

function getCutType(category, productType) {
  // Use the actual cut types from the system
  // Cut type options: Normal Cut (default, 0), NBA Cut (100)
  // Weighted selection: 80% Normal Cut (default), 20% NBA Cut
  const roll = Math.random();
  return roll < 0.8 ? 'Normal Cut' : 'NBA Cut';
}

function generatePersonIdentity() {
  return {
    first: getRandomElement(firstNames),
    last: getRandomElement(lastNames)
  };
}

function buildCustomerEmail(first, last) {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const base = `${first}.${last}.${timestamp}${randomSuffix}`.toLowerCase();
  const sanitized = base.replace(/[^a-z0-9.]/g, '');
  return `${sanitized}@mail.yohanns.com`;
}

async function createCustomerAccount() {
  const { first, last } = generatePersonIdentity();
  const email = buildCustomerEmail(first, last);
  const password = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const fullName = `${first} ${last}`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      role: 'customer',
      full_name: fullName
    }
  });

  if (error) {
    throw error;
  }

  return { id: data.user.id, fullName };
}

async function saveUserAddress(userId, fullName, deliveryAddress) {
  try {
    // Check if address already exists
    const { data: existing, error: checkError } = await supabase
      .from('user_addresses')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.warn(`⚠️  Error checking existing address for user ${userId}:`, checkError.message);
      return false;
    }

    if (existing && existing.length > 0) {
      // Address already exists, skip
      return true;
    }

    // Insert new address
    const { error: insertError } = await supabase
      .from('user_addresses')
      .insert({
        user_id: userId,
        full_name: fullName || deliveryAddress.receiver || 'Customer',
        phone: deliveryAddress.phone || generatePhoneNumber(),
        street_address: deliveryAddress.street || deliveryAddress.streetAddress || '',
        barangay: deliveryAddress.barangay || '',
        city: deliveryAddress.city || '',
        province: deliveryAddress.province || '',
        postal_code: deliveryAddress.postal_code || deliveryAddress.postalCode || '',
        address: deliveryAddress.address || '',
        is_default: true
      });

    if (insertError) {
      console.warn(`⚠️  Error saving address for user ${userId}:`, insertError.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`⚠️  Exception saving address for user ${userId}:`, error.message);
    return false;
  }
}

function findCityData(cityName) {
  if (!cityName) {
    return null;
  }
  const upper = cityName.toUpperCase();
  return CITY_LOOKUP.get(upper) || FAR_CITY_LOOKUP.get(upper) || null;
}

function selectCityForBranch(branchName) {
  const upperBranch = (branchName || '').toUpperCase();
  const preferredCityName = BRANCH_TO_CITY.get(upperBranch);
  const baseCity = findCityData(preferredCityName);
  const roll = Math.random();

  if (baseCity) {
    if (roll < 0.72) {
      return baseCity;
    }
    const sameProvince = CITY_DATA.filter(city => city.city !== baseCity.city && city.province === baseCity.province);
    if (roll < 0.92 && sameProvince.length) {
      return getRandomElement(sameProvince);
    }
  }

  if (roll > 0.97) {
    return getRandomElement(FAR_CITY_DATA);
  }

  return getRandomElement(CITY_DATA);
}

async function loadExistingCustomers() {
  const perPage = 1000;
  let page = 1;
  const customerUsers = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('   Error fetching existing customers:', error.message);
      break;
    }

    const users = data?.users || [];
    for (const user of users) {
      if ((user.user_metadata?.role || '').toLowerCase() === 'customer') {
        customerUsers.push({
          id: user.id,
          fullName: user.user_metadata?.full_name || generatePlayerName()
        });
      }
    }

    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  return customerUsers;
}

async function prepareCustomers(targetCount) {
  const existingCustomers = await loadExistingCustomers();
  const customers = existingCustomers.map(customer => ({
    id: customer.id,
    fullName: customer.fullName,
    segment: null,
    yearBucket: null
  }));

  let createdCount = 0;
  const createdCustomerIds = [];
  while (customers.length < targetCount) {
    try {
      const newCustomer = await createCustomerAccount();
      customers.push({
        id: newCustomer.id,
        fullName: newCustomer.fullName,
        segment: null,
        yearBucket: null
      });
      createdCount += 1;
      createdCustomerIds.push(newCustomer.id);
      if (createdCount % 100 === 0) {
        console.log(`   Created ${createdCount} new customer accounts...`);
      }
    } catch (error) {
      console.error('   Customer creation error:', error.message);
    }
    await delay(CUSTOMER_CREATION_DELAY_MS);
  }

  return {
    customers,
    existingCount: existingCustomers.length,
    createdCount,
    createdCustomerIds
  };
}

async function removeCustomersWithoutOrders(customerIds = []) {
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return { removed: 0, skipped: [], failures: [] };
  }

  let removed = 0;
  const skipped = [];
  const failures = [];

  for (const customerId of customerIds) {
    try {
      const { count, error: countError } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', customerId);

      if (countError) {
        failures.push({ customerId, reason: countError.message });
        continue;
      }

      if ((count ?? 0) > 0) {
        skipped.push(customerId);
        continue;
      }

      const { error: deleteError } = await supabase.auth.admin.deleteUser(customerId);
      if (deleteError) {
        failures.push({ customerId, reason: deleteError.message });
      } else {
        removed += 1;
      }
    } catch (error) {
      failures.push({ customerId, reason: error.message });
    }

    await delay(CUSTOMER_CREATION_DELAY_MS);
  }

  return { removed, skipped, failures };
}

function configureCustomers(customers, yearTargets) {
  const shuffled = [...customers];
  shuffled.sort(() => Math.random() - 0.5);

  const total = shuffled.length;
  const loyalCount = Math.max(1, Math.floor(total * LOYAL_SHARE));
  const engagedCount = Math.max(1, Math.floor(total * ENGAGED_SHARE));

  shuffled.forEach((customer, index) => {
    if (index < loyalCount) {
      customer.segment = 'loyal';
    } else if (index < loyalCount + engagedCount) {
      customer.segment = 'engaged';
    } else {
      customer.segment = 'casual';
    }
  });

  let pointer = 0;
  yearTargets.forEach((target, yearIndex) => {
    const allocation = yearIndex === yearTargets.length - 1
      ? total - pointer
      : Math.min(target, total - pointer);
    for (let i = 0; i < allocation && pointer < total; i += 1, pointer += 1) {
      shuffled[pointer].yearBucket = yearIndex;
    }
  });
  while (pointer < total) {
    shuffled[pointer].yearBucket = yearTargets.length - 1;
    pointer += 1;
  }
}

function buildBranchPicker(branches) {
  if (!Array.isArray(branches) || branches.length === 0) {
    return () => 'BATANGAS CITY BRANCH';
  }

  const entries = branches.map(name => {
    const weight = BRANCH_PRIORITY_WEIGHTS[name.toUpperCase()] || 1;
    return { name, weight };
  });

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let cumulative = 0;
  const distribution = entries.map(entry => {
    cumulative += entry.weight / totalWeight;
    return { name: entry.name, threshold: cumulative };
  });

  return () => {
    const roll = Math.random();
    return distribution.find(entry => roll <= entry.threshold)?.name || distribution[distribution.length - 1].name;
  };
}

function buildCustomerSelector(customers, requiredPerYear, startYear) {
  const customerMap = new Map(customers.map(customer => [customer.id, customer]));
  const allCustomerIds = customers.map(customer => customer.id);
  const perYearRequirements = Array.isArray(requiredPerYear)
    ? requiredPerYear
    : Array.from({ length: YEARS_TO_GENERATE }, () => requiredPerYear);
  const getRequiredForYear = (index) =>
    perYearRequirements[Math.min(index, perYearRequirements.length - 1)];

  const segmentPools = {
    loyal: customers.filter(customer => customer.segment === 'loyal').map(customer => customer.id),
    engaged: customers.filter(customer => customer.segment === 'engaged').map(customer => customer.id),
    casual: customers.filter(customer => customer.segment === 'casual').map(customer => customer.id)
  };

  const yearNewQueues = Array.from({ length: YEARS_TO_GENERATE }, () => []);
  customers.forEach(customer => {
    if (typeof customer.yearBucket === 'number' && yearNewQueues[customer.yearBucket]) {
      yearNewQueues[customer.yearBucket].push(customer.id);
    } else {
      yearNewQueues[yearNewQueues.length - 1].push(customer.id);
    }
  });
  yearNewQueues.forEach(queue => queue.sort(() => Math.random() - 0.5));

  const yearCustomerSets = Array.from({ length: YEARS_TO_GENERATE }, () => new Set());
  const yearOrderCounts = Array.from({ length: YEARS_TO_GENERATE }, () => 0);
  const customerOrderCounts = new Map();

  const loyalRepeatPool = new Set();
  const engagedRepeatPool = new Set();
  const segmentOrders = { loyal: 0, engaged: 0, casual: 0 };

  function pickFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function registerSelection(customerId, yearIndex) {
    const customer = customerMap.get(customerId);
    const safeYearIndex = Math.max(0, Math.min(yearIndex, YEARS_TO_GENERATE - 1));

    yearCustomerSets[safeYearIndex].add(customerId);
    yearOrderCounts[safeYearIndex] += 1;

    const currentCount = customerOrderCounts.get(customerId) || 0;
    customerOrderCounts.set(customerId, currentCount + 1);

    segmentOrders[customer.segment] += 1;

    if (customer.segment === 'loyal') {
      loyalRepeatPool.add(customerId);
    } else if (customer.segment === 'engaged' && currentCount + 1 >= 2) {
      engagedRepeatPool.add(customerId);
    }
  }

  function selectBySegment() {
    const randomValue = Math.random();

    if (segmentPools.loyal.length && randomValue < 0.23) {
      if (loyalRepeatPool.size && Math.random() < 0.55) {
        return pickFromArray(Array.from(loyalRepeatPool));
      }
      return pickFromArray(segmentPools.loyal);
    }

    if (segmentPools.engaged.length && randomValue < 0.6) {
      if (engagedRepeatPool.size && Math.random() < 0.3) {
        return pickFromArray(Array.from(engagedRepeatPool));
      }
      return pickFromArray(segmentPools.engaged);
    }

    if (segmentPools.casual.length) {
      return pickFromArray(segmentPools.casual);
    }

    if (segmentPools.engaged.length) {
      return pickFromArray(segmentPools.engaged);
    }

    if (segmentPools.loyal.length) {
      return pickFromArray(segmentPools.loyal);
    }

    return null;
  }

  return {
    select(date) {
      const orderYear = date.getFullYear();
      let yearIndex = orderYear - startYear;
      yearIndex = Math.max(0, Math.min(yearIndex, YEARS_TO_GENERATE - 1));

      let customerId = null;

      if (yearCustomerSets[yearIndex].size < getRequiredForYear(yearIndex) && yearNewQueues[yearIndex].length) {
        customerId = yearNewQueues[yearIndex].shift();
      }

      if (!customerId) {
        customerId = selectBySegment();
      }

      if (!customerId) {
        customerId = pickFromArray(allCustomerIds);
      }

      registerSelection(customerId, yearIndex);
      return customerId;
    },
    getStats() {
      return {
        yearlyUniqueCounts: yearCustomerSets.map(set => set.size),
        yearlyOrderCounts: [...yearOrderCounts],
        segmentOrderCounts: { ...segmentOrders },
        totalCustomers: customers.length
      };
    },
    allCustomerIds
  };
}

// Calculate growth trend (business grows over 3 years)
function getGrowthMultiplier(yearIndex, monthIndex) {
  const monthsSinceStart = yearIndex * 12 + monthIndex;
  // Start at 0.6x, grow to 1.2x over 36 months
  return 0.6 + (monthsSinceStart / 36) * 0.6;
}

// Peak seasons: Summer (March-May), Intramurals (varies), Youth Week (August)
function isPeakSeason(date) {
  const month = date.getMonth() + 1; // 1-12
  // Summer: March-May, Youth Week: August
  return month >= 3 && month <= 5 || month === 8;
}

// Calculate target jerseys per day based on production capacity
function getTargetJerseysPerDay(date, growthMultiplier) {
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isPeak = isPeakSeason(date);
  
  // Base production: 1000-1200 jerseys/month = ~33-40 jerseys/day
  // Peak production: 2000+ jerseys/month = ~66+ jerseys/day
  let baseJerseys = isPeak ? 66 : 36; // Average of range
  
  // Apply growth multiplier (starts at 0.6x, grows to 1.2x)
  baseJerseys = Math.round(baseJerseys * growthMultiplier);
  
  if (date < COVID_RECOVERY_END) {
    const monthsFromStart = (date.getFullYear() - 2022) * 12 + date.getMonth();
    const recoveryProgress = Math.min(1, Math.max(0, monthsFromStart / 6));
    const covidMultiplier = 0.45 + (0.55 * recoveryProgress);
    baseJerseys = Math.max(1, Math.round(baseJerseys * covidMultiplier));
  }

  // Weekend reduction (less production on weekends)
  if (isWeekend) baseJerseys = Math.round(baseJerseys * 0.6);
  
  // Add some variance (±20%)
  const variance = baseJerseys * 0.2;
  baseJerseys = Math.round(baseJerseys + (Math.random() - 0.5) * variance * 2);
  
  return Math.max(1, baseJerseys);
}

function generateOrdersForDate(date, growthMultiplier) {
  const targetJerseys = getTargetJerseysPerDay(date, growthMultiplier);
  const orders = [];
  let totalJerseysGenerated = 0;
  const maxAttempts = 50; // Prevent infinite loops
  let attempts = 0;
  
  // Generate orders until we reach target jersey count
  // Average order: 8-15 jerseys = ~11.5 jerseys per order
  while ((totalJerseysGenerated < targetJerseys || orders.length === 0) && attempts < maxAttempts) {
    attempts++;
    const order = generateSingleOrder(date);
    const orderJerseys = order.totalItems;
    
    // Check if adding this order would exceed target significantly
    if (totalJerseysGenerated + orderJerseys > targetJerseys * 1.3) {
      // If we're close to target, stop (but ensure at least one order)
      if (totalJerseysGenerated >= targetJerseys * 0.8 && orders.length > 0) {
        break;
      }
    }
    
    orders.push(order);
    totalJerseysGenerated += orderJerseys;
    
    // Safety limit: don't generate more than 2x target
    if (totalJerseysGenerated > targetJerseys * 2) {
      break;
    }
  }
  
  return orders;
}

function generateSingleOrderLegacy(date) {
  // Most orders are team orders (8-15 jerseys per order)
  const isTeamOrder = Math.random() < 0.85; // 85% team orders
  const orderType = Math.random();
  
  // Get available branches (set in generateAndInsertData)
  const branches = global.availableBranches || [
    'SAN PASCUAL (MAIN BRANCH)', 'CALAPAN BRANCH', 'MUZON BRANCH',
    'LEMERY BRANCH', 'BATANGAS CITY BRANCH', 'BAUAN BRANCH',
    'CALACA BRANCH', 'PINAMALAYAN BRANCH', 'ROSARIO BRANCH'
  ];
  
  let orderItems = [];
  let totalAmount = 0;
  let totalItems = 0;
  
  // 80% sublimation jerseys, 10% hoodies, 10% sports materials
  if (orderType < 0.80) {
    // Sublimation jersey order - main product
    const sport = Math.random() < 0.55 ? 'basketball' : 'volleyball';
    
    // Jersey type: Full Set (60%), Shirt Only (25%), Short Only (15%)
    const jerseyTypeRoll = Math.random();
    let jerseyType, isFullSet, isShirtOnly, isShortOnly;
    
    if (jerseyTypeRoll < 0.50) {
      isFullSet = true;
      isShirtOnly = false;
      isShortOnly = false;
      jerseyType = 'Full Set';
    } else if (jerseyTypeRoll < 0.80) {
      isFullSet = false;
      isShirtOnly = true;
      isShortOnly = false;
      jerseyType = 'Shirt Only';
    } else {
      isFullSet = false;
      isShirtOnly = false;
      isShortOnly = true;
      jerseyType = 'Short Only';
    }
    
    // Team size: 8-15 jerseys per order (as specified)
    const teamSize = isTeamOrder ? getRandomInt(8, 15) : getRandomInt(1, 5);
    
    const players = [];
    for (let j = 0; j < teamSize; j++) {
      const isKids = isTeamOrder ? Math.random() < 0.7 : Math.random() < 0.6;
      const playerSizes = isKids ? sizes.kids : sizes.adult;
      const size = getRandomElement(playerSizes);
      
      players.push({
        playerName: generatePlayerName(),
        jerseyNo: j + 1,
        size: size
      });
    }
    
    const isKidsSizeFirst = sizes.kids.includes(players[0].size);
    
    // Pricing: Full set uses full price, shirt/short only uses upper price
    let pricePerUnit;
    if (isFullSet) {
      pricePerUnit = isKidsSizeFirst 
        ? productCategories.sublimation[sport].kids 
        : productCategories.sublimation[sport].adult;
    } else {
      // Shirt only or short only - use upper pricing
      pricePerUnit = isKidsSizeFirst 
        ? productCategories.sublimation[sport].upper_kids 
        : productCategories.sublimation[sport].upper_adult;
    }
    
    const itemTotal = pricePerUnit * teamSize;
    totalAmount += itemTotal;
    totalItems += teamSize;
    
    orderItems.push({
      product_type: 'sublimation',
      name: `Sublimation Jersey (${jerseyType}) - ${sport}`,
      category: 'sublimation',
      sport: sport,
      quantity: teamSize,
      pricePerUnit: pricePerUnit,
      totalPrice: itemTotal,
      team_members: players,
      jersey_type: jerseyType.toLowerCase().replace(/\s+/g, '_'),
      is_full_set: isFullSet,
      is_shirt_only: isShirtOnly,
      is_short_only: isShortOnly,
      fabric_type: getFabricType('sublimation', 'jersey'),
      cut_type: getCutType('sublimation', 'jersey')
    });
  } else if (orderType < 0.90) {
    // Hoodie order
    const quantity = isTeamOrder ? getRandomInt(8, 15) : getRandomInt(1, 5);
    const isKids = Math.random() < 0.3;
    const pricePerUnit = isKids ? productCategories.hoodie.kids : productCategories.hoodie.adult;
    const itemTotal = pricePerUnit * quantity;
    
    totalAmount += itemTotal;
    totalItems += quantity;
    
    orderItems.push({
      product_type: 'hoodie',
      name: 'Hoodie',
      category: 'hoodie',
      quantity: quantity,
      pricePerUnit: pricePerUnit,
      totalPrice: itemTotal,
      fabric_type: getFabricType('hoodie', 'hoodie'),
      cut_type: getCutType('hoodie', 'hoodie')
    });
  } else {
    // Sports materials order
    const materialType = Math.random();
    if (materialType < 0.4) {
      // Balls
      const ballType = getRandomElement(['basketball', 'volleyball', 'football']);
      const quantity = getRandomInt(5, 20);
      const pricePerUnit = productCategories.sports_materials.ball[ballType];
      const itemTotal = pricePerUnit * quantity;
      
      totalAmount += itemTotal;
      totalItems += quantity;
      
      orderItems.push({
        product_type: 'sports_material',
        name: `${ballType.charAt(0).toUpperCase() + ballType.slice(1)} Ball`,
        category: 'sports_materials',
        material_type: 'ball',
        ball_type: ballType,
        quantity: quantity,
        pricePerUnit: pricePerUnit,
        totalPrice: itemTotal
      });
    } else if (materialType < 0.7) {
      // Medals
      const medalType = getRandomElement(['gold', 'silver', 'bronze']);
      const quantity = getRandomInt(10, 50);
      const pricePerUnit = productCategories.sports_materials.medal[medalType];
      const itemTotal = pricePerUnit * quantity;
      
      totalAmount += itemTotal;
      totalItems += quantity;
      
      orderItems.push({
        product_type: 'sports_material',
        name: `${medalType.charAt(0).toUpperCase() + medalType.slice(1)} Medal`,
        category: 'sports_materials',
        material_type: 'medal',
        medal_type: medalType,
        quantity: quantity,
        pricePerUnit: pricePerUnit,
        totalPrice: itemTotal
      });
    } else {
      // Trophies
      const trophySize = getRandomElement(['small', 'medium', 'large']);
      const quantity = getRandomInt(1, 10);
      const pricePerUnit = productCategories.sports_materials.trophy[trophySize];
      const itemTotal = pricePerUnit * quantity;
      
      totalAmount += itemTotal;
      totalItems += quantity;
      
      orderItems.push({
        product_type: 'sports_material',
        name: `${trophySize.charAt(0).toUpperCase() + trophySize.slice(1)} Trophy`,
        category: 'sports_materials',
        material_type: 'trophy',
        trophy_size: trophySize,
        quantity: quantity,
        pricePerUnit: pricePerUnit,
        totalPrice: itemTotal
      });
    }
  }
  
  // Pickup location - distributed across all branches with weighted priority
  const pickupLocation = global.pickBranch ? global.pickBranch() : getRandomElement(branches);

  // Historical status distribution: fulfilled vs cancelled
  const orderStatus = Math.random() < 0.97 ? 'picked_up_delivered' : 'cancelled';

  // Walk-in orders only (store pickup)
  const shippingMethod = 'pickup';

  // Generate delivery address for ALL orders (needed for heatmapping customer density)
  const deliveryAddress = generateAddress(pickupLocation);

  // Historical walk-in orders have no shipping charges
  const shippingCost = 0;
  
  return {
    orderDate: new Date(date),
    status: orderStatus,
    shippingMethod: shippingMethod,
    pickupLocation: pickupLocation,
    deliveryAddress: deliveryAddress,
    orderNotes: isTeamOrder ? `Team order for ${getRandomElement(teamNames)}` : 'Individual order',
    subtotalAmount: totalAmount,
    shippingCost: shippingCost,
    totalAmount: totalAmount + shippingCost,
    totalItems: totalItems,
    orderItems: orderItems
  };
}

function generateSingleOrder(date) {
  if (!PRODUCT_CATALOG) {
    return generateSingleOrderLegacy(date);
  }

  let orderItems = [];
  let totalAmount = 0;
  let totalItems = 0;
  let isTeamOrder = false;
  let orderTeamName = null;

  const teamName = getRandomElement(teamNames);
  const orderCategoryRoll = Math.random();

  // Product distribution: 32% Basketball, 22% Volleyball, 13% T-shirts, 13% Hoodies, 
  // 10% Long Sleeves, 11% Uniforms, 3% Trophies, 6% Medals, 3% Balls
  // Using exact percentages as cumulative thresholds (they sum to 113%, treating as proportions):
  // Basketball: 0 to 0.32 (32%)
  // Volleyball: 0.32 to 0.54 (22%)
  // T-shirts: 0.54 to 0.67 (13%)
  // Hoodies: 0.67 to 0.80 (13%)
  // Long Sleeves: 0.80 to 0.90 (10%)
  // Uniforms: 0.90 to 1.01 (11%) - but Math.random() max is 1.0, so we use 0.90 to 1.0
  // For the remaining 12% (Trophies 3%, Medals 6%, Balls 3%), we'll use the remaining 10% of range
  // and scale proportionally: Trophies 3/12, Medals 6/12, Balls 3/12 of the 0.90-1.0 range
  if (orderCategoryRoll < 0.32) {
    // Basketball: 32% of orders
    const sportType = 'Basketball';
    let product = pickProductFromCatalog('jerseys', APPAREL_CATEGORY_KEYS);
    isTeamOrder = Math.random() < 0.85;
    const variantRoll = Math.random();
    let variantKey = 'fullSet';
    let variantLabel = 'Full Set';

    if (variantRoll >= 0.50 && variantRoll < 0.80) {
      variantKey = 'shirtOnly';
      variantLabel = 'Shirt Only';
    } else if (variantRoll >= 0.80) {
      variantKey = 'shortsOnly';
      variantLabel = 'Short Only';
    }

    if (!product) {
      product = createSyntheticProduct('jersey', {
        sportType,
        teamName,
        fullSetPrice: getRandomInt(1180, 1420),
        shirtOnlyPrice: getRandomInt(690, 890),
        shortsOnlyPrice: getRandomInt(520, 680)
      });
    }

      const jerseyPrices = product.jersey_prices || {};
      let pricePerUnit = parsePrice(jerseyPrices[variantKey], parsePrice(product.price, 1000));
      const sizeType = isTeamOrder
        ? (Math.random() < 0.7 ? 'kids' : 'adult')
        : (Math.random() < 0.6 ? 'kids' : 'adult');
      const sportKey = sportType.toLowerCase();

      if (sizeType === 'kids' && productCategories.sublimation[sportKey]) {
        const pricing = productCategories.sublimation[sportKey];
        if (variantKey === 'fullSet') {
          pricePerUnit = pricing.kids;
        } else if (variantKey === 'shirtOnly') {
          pricePerUnit = pricing.upper_kids;
        } else if (variantKey === 'shortsOnly') {
          pricePerUnit = Math.max(400, Math.round(pricing.kids * 0.45));
        }
      } else if (sizeType === 'adult' && productCategories.sublimation[sportKey]) {
        const pricing = productCategories.sublimation[sportKey];
        if (variantKey === 'fullSet') {
          pricePerUnit = pricing.adult;
        } else if (variantKey === 'shirtOnly') {
          pricePerUnit = pricing.upper_adult;
        } else if (variantKey === 'shortsOnly') {
          pricePerUnit = Math.max(520, Math.round(pricing.adult * 0.5));
        }
      }

    if (isTeamOrder) {
      const teamSize = getRandomInt(8, 15);
      const teamMembers = buildTeamMembers(teamName, teamSize, sizeType, variantKey);
      const quantity = teamMembers.length;
      orderTeamName = teamName;
      totalAmount += pricePerUnit * quantity;
      totalItems += quantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity,
        totalPrice: pricePerUnit * quantity,
        product_type: 'jersey',
        jerseyType: variantLabel,
        sport: sportType,
        isTeamOrder: true,
        teamName,
        team_name: teamName,
        teamMembers,
        team_members: teamMembers,
        sizeType,
        fabric_type: getFabricType(product.category, 'jersey'),
        cut_type: getCutType(product.category, 'jersey')
      });
    } else {
      // Individual orders: 1-3 jerseys (15% of orders)
      const individualQuantity = getRandomInt(1, 3);
      const teamMembers = [];
      for (let i = 0; i < individualQuantity; i++) {
        const singleDetails = buildSingleOrderDetails(teamName, sizeType, variantKey);
        teamMembers.push({
          ...singleDetails,
          firstName: singleDetails.firstName || getRandomElement(firstNames),
          surname: singleDetails.surname || getRandomElement(lastNames)
        });
      }
      orderTeamName = teamName;
      totalAmount += pricePerUnit * individualQuantity;
      totalItems += individualQuantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity: individualQuantity,
        totalPrice: pricePerUnit * individualQuantity,
        product_type: 'jersey',
        jerseyType: variantLabel,
        sport: sportType,
        isTeamOrder: false,
        teamName,
        team_name: teamName,
        teamMembers,
        team_members: teamMembers,
        sizeType,
        fabric_type: getFabricType(product.category, 'jersey'),
        cut_type: getCutType(product.category, 'jersey')
      });
    }
  } else if (orderCategoryRoll < 0.54) {
    // Volleyball: 22% of orders (0.32 to 0.54)
    const sportType = 'Volleyball';
    let product = pickProductFromCatalog('jerseys', APPAREL_CATEGORY_KEYS);
    isTeamOrder = Math.random() < 0.85;
    const variantRoll = Math.random();
    let variantKey = 'fullSet';
    let variantLabel = 'Full Set';

    if (variantRoll >= 0.50 && variantRoll < 0.80) {
      variantKey = 'shirtOnly';
      variantLabel = 'Shirt Only';
    } else if (variantRoll >= 0.80) {
      variantKey = 'shortsOnly';
      variantLabel = 'Short Only';
    }

    if (!product) {
      product = createSyntheticProduct('jersey', {
        sportType,
        teamName,
        fullSetPrice: getRandomInt(1180, 1420),
        shirtOnlyPrice: getRandomInt(690, 890),
        shortsOnlyPrice: getRandomInt(520, 680)
      });
    }

      const jerseyPrices = product.jersey_prices || {};
      let pricePerUnit = parsePrice(jerseyPrices[variantKey], parsePrice(product.price, 1000));
      const sizeType = isTeamOrder
        ? (Math.random() < 0.7 ? 'kids' : 'adult')
        : (Math.random() < 0.6 ? 'kids' : 'adult');
      const sportKey = sportType.toLowerCase();

      if (sizeType === 'kids' && productCategories.sublimation[sportKey]) {
        const pricing = productCategories.sublimation[sportKey];
        if (variantKey === 'fullSet') {
          pricePerUnit = pricing.kids;
        } else if (variantKey === 'shirtOnly') {
          pricePerUnit = pricing.upper_kids;
        } else if (variantKey === 'shortsOnly') {
          pricePerUnit = Math.max(400, Math.round(pricing.kids * 0.45));
        }
      } else if (sizeType === 'adult' && productCategories.sublimation[sportKey]) {
        const pricing = productCategories.sublimation[sportKey];
        if (variantKey === 'fullSet') {
          pricePerUnit = pricing.adult;
        } else if (variantKey === 'shirtOnly') {
          pricePerUnit = pricing.upper_adult;
        } else if (variantKey === 'shortsOnly') {
          pricePerUnit = Math.max(520, Math.round(pricing.adult * 0.5));
        }
      }

    if (isTeamOrder) {
      const teamSize = getRandomInt(8, 15);
      const teamMembers = buildTeamMembers(teamName, teamSize, sizeType, variantKey);
      const quantity = teamMembers.length;
      orderTeamName = teamName;
      totalAmount += pricePerUnit * quantity;
      totalItems += quantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity,
        totalPrice: pricePerUnit * quantity,
        product_type: 'jersey',
        jerseyType: variantLabel,
        sport: sportType,
        isTeamOrder: true,
        teamName,
        team_name: teamName,
        teamMembers,
        team_members: teamMembers,
        sizeType,
        fabric_type: getFabricType(product.category, 'jersey'),
        cut_type: getCutType(product.category, 'jersey')
      });
    } else {
      // Individual orders: 1-3 jerseys (15% of orders)
      const individualQuantity = getRandomInt(1, 3);
      const teamMembers = [];
      for (let i = 0; i < individualQuantity; i++) {
        const singleDetails = buildSingleOrderDetails(teamName, sizeType, variantKey);
        teamMembers.push({
          ...singleDetails,
          firstName: singleDetails.firstName || getRandomElement(firstNames),
          surname: singleDetails.surname || getRandomElement(lastNames)
        });
      }
      orderTeamName = teamName;
      totalAmount += pricePerUnit * individualQuantity;
      totalItems += individualQuantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity: individualQuantity,
        totalPrice: pricePerUnit * individualQuantity,
        product_type: 'jersey',
        jerseyType: variantLabel,
        sport: sportType,
        isTeamOrder: false,
        teamName,
        team_name: teamName,
        teamMembers,
        team_members: teamMembers,
        sizeType,
        fabric_type: getFabricType(product.category, 'jersey'),
        cut_type: getCutType(product.category, 'jersey')
      });
    }
  } else if (orderCategoryRoll < 0.67) {
    // T-shirts: 13% of orders (0.54 to 0.67)
    let apparelCategory = 'tshirts';
    let fallbackCategory = 'tshirts';
    const apparelCategories = [apparelCategory];
    let product = pickProductFromCatalog(apparelCategories, APPAREL_CATEGORY_KEYS);

    if (!product) {
      product = createSyntheticProduct(fallbackCategory, {
        teamName,
        basePrice: getRandomInt(720, 1080)
      });
    }

    isTeamOrder = Math.random() < 0.7;
    const sizeType = isTeamOrder
      ? (Math.random() < 0.65 ? 'kids' : 'adult')
      : (Math.random() < 0.55 ? 'kids' : 'adult');

    let pricePerUnit = parsePrice(product.price, sizeType === 'kids' ? 700 : 900);
    if (sizeType === 'kids') {
      const cap = fallbackCategory === 'uniforms' ? 780 : 640;
      pricePerUnit = Math.min(pricePerUnit, cap);
    } else if (fallbackCategory === 'uniforms') {
      pricePerUnit = Math.max(pricePerUnit, 920);
    }

    if (isTeamOrder) {
      const teamSize = getRandomInt(6, 12);
      const teamMembers = buildTeamMembers(teamName, teamSize, sizeType);
      const quantity = teamMembers.length;
      orderTeamName = teamName;
      totalAmount += pricePerUnit * quantity;
      totalItems += quantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity,
        totalPrice: pricePerUnit * quantity,
        product_type: (product.category || fallbackCategory).toLowerCase(),
        isTeamOrder: true,
        teamName,
        team_name: teamName,
        teamMembers,
        team_members: teamMembers,
        sizeType,
        fabric_type: getFabricType(product.category || fallbackCategory, product.product_type),
        cut_type: getCutType(product.category || fallbackCategory, product.product_type)
      });
    } else {
      const singleDetails = buildSingleOrderDetails(teamName, sizeType);
      orderTeamName = singleDetails.teamName || teamName;
      totalAmount += pricePerUnit;
      totalItems += 1;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity: 1,
        totalPrice: pricePerUnit,
        product_type: (product.category || fallbackCategory).toLowerCase(),
        isTeamOrder: false,
        teamName: singleDetails.teamName,
        team_name: singleDetails.teamName,
        singleOrderDetails: singleDetails,
        single_order_details: singleDetails,
        sizeType,
        fabric_type: getFabricType(product.category || fallbackCategory, product.product_type),
        cut_type: getCutType(product.category || fallbackCategory, product.product_type)
      });
    }
  } else if (orderCategoryRoll < 0.80) {
    // Hoodies: 13% of orders (0.67 to 0.80)
    let apparelCategory = 'hoodies';
    let fallbackCategory = 'hoodies';
    const apparelCategories = [apparelCategory];
    let product = pickProductFromCatalog(apparelCategories, APPAREL_CATEGORY_KEYS);

    if (!product) {
      product = createSyntheticProduct(fallbackCategory, {
        teamName,
        basePrice: getRandomInt(720, 1080)
      });
    }

    isTeamOrder = Math.random() < 0.7;
    const sizeType = isTeamOrder
      ? (Math.random() < 0.65 ? 'kids' : 'adult')
      : (Math.random() < 0.55 ? 'kids' : 'adult');

    let pricePerUnit = parsePrice(product.price, sizeType === 'kids' ? 700 : 900);
    if (sizeType === 'kids') {
      const cap = fallbackCategory === 'uniforms' ? 780 : 640;
      pricePerUnit = Math.min(pricePerUnit, cap);
    } else if (fallbackCategory === 'uniforms') {
      pricePerUnit = Math.max(pricePerUnit, 920);
    }

    if (isTeamOrder) {
      const teamSize = getRandomInt(6, 12);
      const teamMembers = buildTeamMembers(teamName, teamSize, sizeType);
      const quantity = teamMembers.length;
      orderTeamName = teamName;
      totalAmount += pricePerUnit * quantity;
      totalItems += quantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity,
        totalPrice: pricePerUnit * quantity,
        product_type: (product.category || fallbackCategory).toLowerCase(),
        isTeamOrder: true,
        teamName,
        team_name: teamName,
        teamMembers,
        team_members: teamMembers,
        sizeType,
        fabric_type: getFabricType(product.category || fallbackCategory, product.product_type),
        cut_type: getCutType(product.category || fallbackCategory, product.product_type)
      });
    } else {
      const singleDetails = buildSingleOrderDetails(teamName, sizeType);
      orderTeamName = singleDetails.teamName || teamName;
      totalAmount += pricePerUnit;
      totalItems += 1;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity: 1,
        totalPrice: pricePerUnit,
        product_type: (product.category || fallbackCategory).toLowerCase(),
        isTeamOrder: false,
        teamName: singleDetails.teamName,
        team_name: singleDetails.teamName,
        singleOrderDetails: singleDetails,
        single_order_details: singleDetails,
        sizeType,
        fabric_type: getFabricType(product.category || fallbackCategory, product.product_type),
        cut_type: getCutType(product.category || fallbackCategory, product.product_type)
      });
    }
  } else if (orderCategoryRoll < 0.90) {
    // Long Sleeves: 10% of orders (0.80 to 0.90)
    let apparelCategory = 'longsleeves';
    let fallbackCategory = 'longsleeves';
    const apparelCategories = [apparelCategory];
    let product = pickProductFromCatalog(apparelCategories, APPAREL_CATEGORY_KEYS);

    if (!product) {
      product = createSyntheticProduct(fallbackCategory, {
        teamName,
        basePrice: getRandomInt(720, 1080)
      });
    }

    isTeamOrder = Math.random() < 0.7;
    const sizeType = isTeamOrder
      ? (Math.random() < 0.65 ? 'kids' : 'adult')
      : (Math.random() < 0.55 ? 'kids' : 'adult');

    let pricePerUnit = parsePrice(product.price, sizeType === 'kids' ? 700 : 900);
    if (sizeType === 'kids') {
      const cap = fallbackCategory === 'uniforms' ? 780 : 640;
      pricePerUnit = Math.min(pricePerUnit, cap);
    } else if (fallbackCategory === 'uniforms') {
      pricePerUnit = Math.max(pricePerUnit, 920);
    }

    if (isTeamOrder) {
      const teamSize = getRandomInt(6, 12);
      const teamMembers = buildTeamMembers(teamName, teamSize, sizeType);
      const quantity = teamMembers.length;
      orderTeamName = teamName;
      totalAmount += pricePerUnit * quantity;
      totalItems += quantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity,
        totalPrice: pricePerUnit * quantity,
        product_type: (product.category || fallbackCategory).toLowerCase(),
        isTeamOrder: true,
        teamName,
        team_name: teamName,
        teamMembers,
        team_members: teamMembers,
        sizeType,
        fabric_type: getFabricType(product.category || fallbackCategory, product.product_type),
        cut_type: getCutType(product.category || fallbackCategory, product.product_type)
      });
    } else {
      const singleDetails = buildSingleOrderDetails(teamName, sizeType);
      orderTeamName = singleDetails.teamName || teamName;
      totalAmount += pricePerUnit;
      totalItems += 1;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category,
        price: pricePerUnit,
        pricePerUnit,
        quantity: 1,
        totalPrice: pricePerUnit,
        product_type: (product.category || fallbackCategory).toLowerCase(),
        isTeamOrder: false,
        teamName: singleDetails.teamName,
        team_name: singleDetails.teamName,
        singleOrderDetails: singleDetails,
        single_order_details: singleDetails,
        sizeType,
        fabric_type: getFabricType(product.category || fallbackCategory, product.product_type),
        cut_type: getCutType(product.category || fallbackCategory, product.product_type)
      });
    }
  } else if (orderCategoryRoll < 1.0) {
    // Remaining 10% of range (0.90 to 1.0) contains Uniforms 11%, Trophies 3%, Medals 6%, Balls 3% = 23% total
    // We need to scale these to fit in the 10% range proportionally
    // Uniforms: 11/23 of remaining = 11/23 * 0.10 = 0.0478, so 0.90 to 0.9478
    // Trophies: 3/23 of remaining = 3/23 * 0.10 = 0.0130, so 0.9478 to 0.9608
    // Medals: 6/23 of remaining = 6/23 * 0.10 = 0.0261, so 0.9608 to 0.9869
    // Balls: 3/23 of remaining = 3/23 * 0.10 = 0.0131, so 0.9869 to 1.0
    const remainingRoll = (orderCategoryRoll - 0.90) / 0.10; // Normalize 0.90-1.0 to 0-1
    
    if (remainingRoll < 11/23) {
      // Uniforms: 11% of total orders
      let apparelCategory = 'uniforms';
      let fallbackCategory = 'uniforms';
      const apparelCategories = [apparelCategory];
      let product = pickProductFromCatalog(apparelCategories, APPAREL_CATEGORY_KEYS);

      if (!product) {
        product = createSyntheticProduct(fallbackCategory, {
          teamName,
          basePrice: getRandomInt(720, 1080)
        });
      }

      isTeamOrder = Math.random() < 0.7;
      const sizeType = isTeamOrder
        ? (Math.random() < 0.65 ? 'kids' : 'adult')
        : (Math.random() < 0.55 ? 'kids' : 'adult');

      let pricePerUnit = parsePrice(product.price, sizeType === 'kids' ? 700 : 900);
      if (sizeType === 'kids') {
        const cap = fallbackCategory === 'uniforms' ? 780 : 640;
        pricePerUnit = Math.min(pricePerUnit, cap);
      } else if (fallbackCategory === 'uniforms') {
        pricePerUnit = Math.max(pricePerUnit, 920);
      }

      if (isTeamOrder) {
        const teamSize = getRandomInt(6, 12);
        const teamMembers = buildTeamMembers(teamName, teamSize, sizeType);
        const quantity = teamMembers.length;
        orderTeamName = teamName;
        totalAmount += pricePerUnit * quantity;
        totalItems += quantity;
        orderItems.push({
          id: product.id,
          name: product.name,
          image: product.main_image,
          category: product.category,
          price: pricePerUnit,
          pricePerUnit,
          quantity,
          totalPrice: pricePerUnit * quantity,
          product_type: (product.category || fallbackCategory).toLowerCase(),
          isTeamOrder: true,
          teamName,
          team_name: teamName,
          teamMembers,
          team_members: teamMembers,
          sizeType,
          fabric_type: getFabricType(product.category || fallbackCategory, product.product_type),
          cut_type: getCutType(product.category || fallbackCategory, product.product_type)
        });
      } else {
        const singleDetails = buildSingleOrderDetails(teamName, sizeType);
        orderTeamName = singleDetails.teamName || teamName;
        totalAmount += pricePerUnit;
        totalItems += 1;
        orderItems.push({
          id: product.id,
          name: product.name,
          image: product.main_image,
          category: product.category,
          price: pricePerUnit,
          pricePerUnit,
          quantity: 1,
          totalPrice: pricePerUnit,
          product_type: (product.category || fallbackCategory).toLowerCase(),
          isTeamOrder: false,
          teamName: singleDetails.teamName,
          team_name: singleDetails.teamName,
          singleOrderDetails: singleDetails,
          single_order_details: singleDetails,
          sizeType,
          fabric_type: getFabricType(product.category || fallbackCategory, product.product_type),
          cut_type: getCutType(product.category || fallbackCategory, product.product_type)
        });
      }
    } else if (remainingRoll < 14/23) {
      // Trophies: 3% of total orders
      let product = pickProductFromCatalog('trophies', 'others');
      if (!product) {
        product = createSyntheticProduct('trophy', {
          teamName,
          basePrice: getRandomInt(820, 1450)
        });
      }
      const quantity = getRandomInt(3, 8);
      const pricePerUnit = parsePrice(product.price, 900);
      const trophyDetails = buildTrophyDetails(product.name, teamName);
      totalAmount += pricePerUnit * quantity;
      totalItems += quantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category || 'Trophies',
        price: pricePerUnit,
        pricePerUnit,
        quantity,
        totalPrice: pricePerUnit * quantity,
        product_type: 'trophy',
        trophyDetails,
        trophy_details: trophyDetails
      });
    } else if (remainingRoll < 20/23) {
      // Medals: 6% of total orders
      const medalType = getRandomElement(['gold', 'silver', 'bronze']);
      const quantity = getRandomInt(10, 50);
      const pricePerUnit = productCategories.sports_materials.medal[medalType];
      const itemTotal = pricePerUnit * quantity;
      
      totalAmount += itemTotal;
      totalItems += quantity;
      orderItems.push({
        product_type: 'sports_material',
        name: `${medalType.charAt(0).toUpperCase() + medalType.slice(1)} Medal`,
        category: 'sports_materials',
        material_type: 'medal',
        medal_type: medalType,
        quantity: quantity,
        pricePerUnit: pricePerUnit,
        totalPrice: itemTotal
      });
    } else {
      // Balls: 3% of total orders
      let product = pickProductFromCatalog('balls', 'others');
      if (!product) {
        const ballType = getRandomElement(['basketball', 'volleyball', 'football']);
        product = createSyntheticProduct('ball', {
          ballType,
          basePrice: getRandomInt(1650, 2250)
        });
      }
      const quantity = getRandomInt(3, 12);
      const pricePerUnit = parsePrice(product.price, 1800);
      const ballDetails = buildBallDetails(product.name);
      totalAmount += pricePerUnit * quantity;
      totalItems += quantity;
      orderItems.push({
        id: product.id,
        name: product.name,
        image: product.main_image,
        category: product.category || 'Balls',
        price: pricePerUnit,
        pricePerUnit,
        quantity,
        totalPrice: pricePerUnit * quantity,
        product_type: 'ball',
        ballDetails,
        ball_details: ballDetails
      });
    }
  }

  if (orderItems.length === 0) {
    return generateSingleOrderLegacy(date);
  }

  const pickupLocation = global.pickBranch
    ? global.pickBranch()
    : getRandomElement(global.availableBranches || [
      'SAN PASCUAL (MAIN BRANCH)', 'CALAPAN BRANCH', 'MUZON BRANCH',
      'LEMERY BRANCH', 'BATANGAS CITY BRANCH', 'BAUAN BRANCH',
      'CALACA BRANCH', 'PINAMALAYAN BRANCH', 'ROSARIO BRANCH'
    ]);

  const orderStatus = Math.random() < 0.97 ? 'picked_up_delivered' : 'cancelled';
  const shippingMethod = 'pickup';
  const deliveryAddress = generateAddress(pickupLocation);
  const shippingCost = 0;

  let orderNotes = 'Individual order';
  if (isTeamOrder && orderTeamName) {
    orderNotes = `Team order for ${orderTeamName}`;
  } else if (isTeamOrder) {
    orderNotes = 'Team order';
  } else if (orderItems.some(item => (item.category || '').toLowerCase() === 'trophies')) {
    orderNotes = 'Trophy order';
  } else if (orderItems.some(item => (item.category || '').toLowerCase() === 'balls')) {
    orderNotes = 'Sports equipment order';
  }

  return {
    orderDate: new Date(date),
    status: orderStatus,
    shippingMethod,
    pickupLocation,
    deliveryAddress,
    orderNotes,
    subtotalAmount: totalAmount,
    shippingCost,
    totalAmount: totalAmount + shippingCost,
    totalItems,
    orderItems
  };
}

async function generateAndInsertData() {
  console.log('🚀 Generating 3 years of order history...\n');
  
  const startDate = new Date(2022, 0, 1);
  const endDate = new Date(2025, 9, 31, 23, 59, 59, 999);
  
  console.log(`📅 Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}\n`);
  
  // Fetch branches from database
  console.log('🏪 Fetching branches from database...');
  const { data: branchesData, error: branchesError } = await supabase
    .from('branches')
    .select('name')
    .order('name');
  
  let availableBranches = [
    'SAN PASCUAL (MAIN BRANCH)', 'CALAPAN BRANCH', 'MUZON BRANCH',
    'LEMERY BRANCH', 'BATANGAS CITY BRANCH', 'BAUAN BRANCH',
    'CALACA BRANCH', 'PINAMALAYAN BRANCH', 'ROSARIO BRANCH'
  ];
  
  if (!branchesError && branchesData && branchesData.length > 0) {
    availableBranches = branchesData.map(b => b.name);
    console.log(`   ✅ Found ${availableBranches.length} branches`);
  } else {
    console.log(`   ⚠️  Using default branches (${availableBranches.length} branches)`);
  }
  
  // Configure branch selector for weighted distribution
  global.availableBranches = availableBranches;
  global.pickBranch = buildBranchPicker(availableBranches);

  console.log('🛍️  Loading product catalog from database...');
  PRODUCT_CATALOG = await loadProductCatalog();
  console.log(`   ✅ Products loaded: ${PRODUCT_CATALOG.all.length} total (jerseys: ${PRODUCT_CATALOG.jerseys.length}, apparel: ${PRODUCT_CATALOG.apparel.length}, balls: ${PRODUCT_CATALOG.balls.length}, trophies: ${PRODUCT_CATALOG.trophies.length})`);
  
  // Ensure a sufficient pool of real customer accounts
  console.log('👥 Preparing customer accounts...');
  const { customers, existingCount, createdCount, createdCustomerIds } = await prepareCustomers(TOTAL_CUSTOMER_TARGET);
  configureCustomers(customers, YEARLY_CUSTOMER_TARGETS);
  const customerSelector = buildCustomerSelector(customers, YEARLY_CUSTOMER_TARGETS, startDate.getFullYear());
  const allCustomerIds = customerSelector.allCustomerIds;
  console.log(`✅ Customer accounts ready: ${customers.length} (existing: ${existingCount}, new: ${createdCount})`);
  console.log('🎯 Yearly customer targets:', YEARLY_CUSTOMER_TARGETS
    .map((count, index) => `${startDate.getFullYear() + index}: ${count}`)
    .join(' | '), '\n');
  
  let totalOrders = 0;
  const allOrders = [];
  const branchOrderCounts = new Map();
  const customersWithAddresses = new Set(); // Track which customers have addresses saved
  
  const currentDate = new Date(startDate);
  let yearIndex = 0;
  let monthIndex = startDate.getMonth(); // Initialize with start month
  let lastMonth = currentDate.getMonth();
  let orderCounter = 0; // Counter for unique order numbers
  
  console.log('📊 Generating orders...');
  
  while (currentDate <= endDate) {
    const currentMonth = currentDate.getMonth();
    if (currentMonth !== lastMonth) {
      monthIndex++;
      lastMonth = currentMonth;
      if (monthIndex >= 12) {
        yearIndex++;
        monthIndex = 0;
      }
    }
    
    const growthMultiplier = getGrowthMultiplier(yearIndex, monthIndex);
    const ordersForDate = generateOrdersForDate(new Date(currentDate), growthMultiplier);
    
    for (const order of ordersForDate) {
      const selectedCustomerId = customerSelector.select(order.orderDate);
      const userId = selectedCustomerId || getRandomElement(allCustomerIds);
      // Generate unique order number with counter and random string
      const orderNumber = `ORD-${currentDate.getTime()}-${orderCounter++}-${Math.random().toString(36).substring(7)}`;
      
      const enrichedOrderItems = assignUniqueJerseyDesigns(order.orderItems, userId, order.orderDate);

      // Save customer address to user_addresses if not already saved
      if (!customersWithAddresses.has(userId) && order.deliveryAddress) {
        const customer = customers.find(c => c.id === userId);
        const fullName = customer?.fullName || order.deliveryAddress.receiver || 'Customer';
        const saved = await saveUserAddress(userId, fullName, order.deliveryAddress);
        if (saved) {
          customersWithAddresses.add(userId);
        }
      }

      allOrders.push({
        user_id: userId,
        order_number: orderNumber,
        status: order.status,
        shipping_method: order.shippingMethod,
        pickup_location: order.pickupLocation,
        delivery_address: order.deliveryAddress,
        order_notes: order.orderNotes,
        subtotal_amount: order.subtotalAmount.toString(),
        shipping_cost: order.shippingCost.toString(),
        total_amount: order.totalAmount.toString(),
        total_items: order.totalItems,
        order_items: enrichedOrderItems,
        created_at: order.orderDate.toISOString(),
        updated_at: order.orderDate.toISOString(),
        design_files: []
      });

      branchOrderCounts.set(
        order.pickupLocation,
        (branchOrderCounts.get(order.pickupLocation) || 0) + 1
      );
    }
    
    totalOrders += ordersForDate.length;
    currentDate.setDate(currentDate.getDate() + 1);
    
    // Progress update every 3 months
    if (currentDate.getDate() === 1 && currentDate.getMonth() % 3 === 0) {
      console.log(`   Generated ${totalOrders} orders up to ${currentDate.toLocaleDateString()}...`);
    }
  }
  
  const customerStats = customerSelector.getStats();
  console.log('🧑‍🤝‍🧑 Unique customers per year:');
  customerStats.yearlyUniqueCounts.forEach((count, index) => {
    const calendarYear = startDate.getFullYear() + index;
    const target = YEARLY_CUSTOMER_TARGETS[Math.min(index, YEARLY_CUSTOMER_TARGETS.length - 1)];
    console.log(`   ${calendarYear}: ${count} unique customers (target ≥ ${target})`);
  });
  console.log(`   Loyal segment orders: ${customerStats.segmentOrderCounts.loyal}`);
  console.log(`   Engaged segment orders: ${customerStats.segmentOrderCounts.engaged}`);
  console.log(`   Casual segment orders: ${customerStats.segmentOrderCounts.casual}\n`);
  
  // Calculate jersey production statistics
  const totalJerseys = allOrders.reduce((sum, o) => sum + o.total_items, 0);
  const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
  const totalMonths = ((endDate.getFullYear() - startDate.getFullYear()) * 12) + (endDate.getMonth() - startDate.getMonth()) + 1;
  const avgJerseysPerMonth = Math.round(totalJerseys / totalMonths);
  const avgOrdersPerMonth = Math.round(totalOrders / totalMonths);
  const avgJerseysPerOrder = (totalJerseys / totalOrders).toFixed(1);
  
  console.log(`\n✅ Generated ${totalOrders} orders over 3 years`);
  console.log(`👕 Total jerseys produced: ${totalJerseys.toLocaleString()}`);
  console.log(`📊 Average orders per month: ${avgOrdersPerMonth}`);
  console.log(`👕 Average jerseys per month: ${avgJerseysPerMonth}`);
  console.log(`📦 Average jerseys per order: ${avgJerseysPerOrder}`);
  console.log(`📈 Total revenue: ₱${totalRevenue.toLocaleString()}\n`);
  
  // Insert orders in batches
  console.log('💾 Inserting orders into database...');
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < allOrders.length; i += batchSize) {
    const batch = allOrders.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('orders')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.ceil(i / batchSize)}:`, error.message);
      // Try inserting one by one to identify problematic records
      for (const order of batch) {
        const { error: singleError } = await supabase
          .from('orders')
          .insert(order);
        if (singleError) {
          console.error(`   Failed order: ${order.order_number}`, singleError.message);
        } else {
          inserted++;
        }
      }
    } else {
      inserted += batch.length;
      if (inserted % 500 === 0 || inserted === allOrders.length) {
        console.log(`   ✅ Inserted ${inserted}/${allOrders.length} orders (${Math.round(inserted / allOrders.length * 100)}%)`);
      }
    }
  }
  
  // Calculate final statistics
  const finalTotalJerseys = allOrders.slice(0, inserted).reduce((sum, o) => sum + o.total_items, 0);
  const finalTotalRevenue = allOrders.slice(0, inserted).reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
  
  console.log(`\n🎉 Successfully inserted ${inserted} orders!`);
  console.log('📈 Order history generation complete!');
  console.log('\n📊 Summary:');
  console.log(`   - Total Orders: ${inserted}`);
  console.log(`   - Total Jerseys: ${finalTotalJerseys.toLocaleString()}`);
  console.log(`   - Average Jerseys/Month: ${Math.round(finalTotalJerseys / totalMonths)}`);
  console.log(`   - Average Orders/Month: ${Math.round(inserted / totalMonths)}`);
  console.log(`   - Average Jerseys/Order: ${(finalTotalJerseys / inserted).toFixed(1)}`);
  console.log(`   - Total Revenue: ₱${finalTotalRevenue.toLocaleString()}`);
  console.log(`   - Customer Accounts Used: ${customers.length}`);
  console.log(`   - Unique Customers per Year: ${customerStats.yearlyUniqueCounts.map((count, index) => `Year ${index + 1}: ${count}`).join(' | ')}`);
  const sortedBranchCounts = Array.from(branchOrderCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sortedBranchCounts.length) {
    console.log('   - Branch Order Distribution:');
    sortedBranchCounts.forEach(([name, count]) => {
      console.log(`     • ${name}: ${count} orders`);
    });
  }
  const usedCustomerIds = new Set(allOrders.map(order => order.user_id));
  
  // Ensure ALL customers have at least one order (not just newly created ones)
  const allCustomerIdList = customers.map(c => c.id);
  const customersWithoutOrders = allCustomerIdList.filter((id) => !usedCustomerIds.has(id));
  
  if (customersWithoutOrders.length > 0) {
    console.log(`\n⚠️  Found ${customersWithoutOrders.length} customers without orders. Creating orders for them...`);
    
    // Create orders for customers without orders, distributing them across the date range
    const ordersToAdd = [];
    const dateRangeDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)); // days
    const datesPerCustomer = Math.max(1, Math.floor(dateRangeDays / Math.max(customersWithoutOrders.length, 1)));
    
    for (let i = 0; i < customersWithoutOrders.length; i++) {
      const customerId = customersWithoutOrders[i];
      // Distribute orders evenly across the date range
      const daysOffset = Math.floor(i * datesPerCustomer);
      const orderDate = new Date(startDate);
      orderDate.setDate(orderDate.getDate() + daysOffset);
      orderDate.setHours(8 + (i % 12), (i % 60), 0, 0); // Vary time throughout the day
      
      // Generate a simple order for this customer
      const generatedOrder = generateSingleOrder(new Date(orderDate));
      
      // Find customer info for address
      const customer = customers.find(c => c.id === customerId);
      const customerFullName = customer?.fullName || 'Customer';
      
      // Get or create delivery address
      let deliveryAddress = generatedOrder.deliveryAddress;
      if (!deliveryAddress || !deliveryAddress.city) {
        const branchName = generatedOrder.pickupLocation || availableBranches[0];
        const cityData = selectCityForBranch(branchName);
        deliveryAddress = {
          receiver: customerFullName,
          phone: generatePhoneNumber(),
          street: `${Math.floor(Math.random() * 999)} Street`,
          barangay: cityData?.barangay || '',
          city: cityData?.city || 'Calaca',
          province: cityData?.province || 'Batangas',
          postalCode: '1234'
        };
      }
      
      // Generate unique order number
      const orderNumber = `ORD-${orderDate.getTime()}-${orderCounter++}-${Math.random().toString(36).substring(7)}`;
      
      // Create order in the same format as the main generation loop
      const enrichedOrderItems = assignUniqueJerseyDesigns(generatedOrder.orderItems, customerId, orderDate);
      
      // Save customer address to user_addresses if not already saved
      if (!customersWithAddresses.has(customerId)) {
        const saved = await saveUserAddress(customerId, customerFullName, deliveryAddress);
        if (saved) {
          customersWithAddresses.add(customerId);
        }
      }
      
      const orderToInsert = {
        user_id: customerId,
        order_number: orderNumber,
        status: generatedOrder.status,
        shipping_method: generatedOrder.shippingMethod,
        pickup_location: generatedOrder.pickupLocation,
        delivery_address: deliveryAddress,
        order_notes: generatedOrder.orderNotes,
        subtotal_amount: generatedOrder.subtotalAmount.toString(),
        shipping_cost: generatedOrder.shippingCost.toString(),
        total_amount: generatedOrder.totalAmount.toString(),
        total_items: generatedOrder.totalItems,
        order_items: enrichedOrderItems,
        created_at: orderDate.toISOString(),
        updated_at: orderDate.toISOString(),
        design_files: []
      };
      
      ordersToAdd.push(orderToInsert);
    }
    
    console.log(`   ✅ Generated ${ordersToAdd.length} orders for customers without orders`);
    
    // Insert these orders
    const batchSize = 100;
    let insertedCount = 0;
    for (let i = 0; i < ordersToAdd.length; i += batchSize) {
      const batch = ordersToAdd.slice(i, i + batchSize);
      const { error } = await supabase
        .from('orders')
        .insert(batch);
      
      if (error) {
        console.error(`   ❌ Error inserting batch: ${error.message}`);
        // Try one by one
        for (const order of batch) {
          const { error: singleError } = await supabase
            .from('orders')
            .insert(order);
          if (!singleError) {
            insertedCount++;
            allOrders.push(order);
          }
        }
      } else {
        insertedCount += batch.length;
        allOrders.push(...batch);
      }
    }
    
    console.log(`   ✅ Successfully inserted ${insertedCount} orders`);
    console.log(`\n✅ All ${customers.length} customers now have at least one order.`);
  } else {
    console.log(`\n✅ All ${customers.length} customers already have at least one order.`);
  }
  
  // Verify final count
  const finalUsedCustomerIds = new Set(allOrders.map(order => order.user_id));
  const finalCustomersWithoutOrders = allCustomerIdList.filter((id) => !finalUsedCustomerIds.has(id));
  
  if (finalCustomersWithoutOrders.length > 0) {
    console.log(`\n⚠️  WARNING: ${finalCustomersWithoutOrders.length} customers still have no orders after cleanup.`);
    console.log(`   This may indicate an issue with order generation or insertion.`);
  } else {
    console.log(`\n✅ VERIFIED: All ${customers.length} customers have at least one order.`);
  }

  console.log(`   - Date Range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
}

generateAndInsertData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});