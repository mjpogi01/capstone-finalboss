const express = require('express');
const fs = require('fs');
const path = require('path');
const { supabase } = require('../lib/db');
const { executeSql } = require('../lib/sqlClient');
const { authenticateSupabaseToken, requireAdminOrOwner } = require('../middleware/supabaseAuth');
const router = express.Router();

router.use(authenticateSupabaseToken);
router.use(requireAdminOrOwner);

const SERVICE_AREA_BOUNDS = {
  minLat: 12.7,
  maxLat: 14.7,
  minLng: 120,
  maxLng: 122.5
};

const ALLOWED_PROVINCES = new Set(['BATANGAS', 'ORIENTAL MINDORO']);

const CITY_PROVINCE_OVERRIDES = {
  ROSARIO: { city: 'Rosario', province: 'Batangas' },
  'SAN PASCUAL': { city: 'San Pascual', province: 'Batangas' },
  'SAN JOSE DEL MONTE CITY': { city: 'San Jose del Monte City', province: 'Bulacan', block: true },
  'QUEZON CITY': { city: 'Quezon City', province: 'Metro Manila', block: true },
  'CEBU CITY': { city: 'Cebu City', province: 'Cebu', block: true },
  'DAVAO CITY': { city: 'Davao City', province: 'Davao del Sur', block: true },
  'ILOILO CITY': { city: 'Iloilo City', province: 'Iloilo', block: true },
  'BAGUIO CITY': { city: 'Baguio City', province: 'Benguet', block: true }
};

const SALES_FORECAST_RANGE_LABELS = {
  nextMonth: 'Next Month',
  restOfYear: 'Rest of Year',
  nextYear: 'Next 12 Months'
};

let barangayGeoCache = null;

const MAX_FORECAST_HISTORY_MONTHS = 36;

function titleCase(value) {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeValue(value) {
  if (!value) {
    return null;
  }
  return value
    .toString()
    .trim()
    .replace(/^CITY OF\s+/i, '')
    .replace(/^MUNICIPALITY OF\s+/i, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeBarangayName(value) {
  if (!value) {
    return null;
  }
  return value
    .toString()
    .trim()
    // Remove common prefixes like "brgy.", "barangay", "bgy."
    .replace(/^(brgy\.?|barangay|bgy\.?)\s*/i, '')
    // Normalize spaces and hyphens
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .toUpperCase();
}

function determineProductGroup(item = {}) {
  // Check apparel_type first for custom design orders
  const rawApparelType = (item.apparel_type || '').toString().toLowerCase();
  if (rawApparelType) {
    if (rawApparelType === 'basketball_jersey') return 'Basketball Jerseys';
    if (rawApparelType === 'volleyball_jersey') return 'Volleyball Jerseys';
    if (rawApparelType === 'hoodie') return 'Hoodies';
    if (rawApparelType === 'tshirt') return 'T-shirts';
    if (rawApparelType === 'longsleeves') return 'Long Sleeves';
    if (rawApparelType === 'uniforms') return 'Uniforms';
  }
  
  const rawCategory = (item.category || item.product_type || '').toString().toLowerCase();
  const rawName = (item.name || '').toString().toLowerCase();
  // Also check cut_type and fabric_option/fabric fields for additional context
  const rawCutType = (item.cutType || item.cut_type || '').toString().toLowerCase();
  const rawFabric = (item.fabricOption || item.fabric_option || item.fabric || '').toString().toLowerCase();
  const rawSport = (item.sport || '').toString().toLowerCase();

  // Check for T-shirts (handle various formats: t-shirt, tshirt, t-shirts, tshirts)
  // Also check cut_type and fabric fields for additional context
  if (rawCategory.includes('t-shirt') || rawCategory.includes('tshirt') || 
      rawName.includes('t-shirt') || rawName.includes('tshirt') ||
      rawCutType.includes('t-shirt') || rawFabric.includes('t-shirt')) {
    return 'T-shirts';
  }

  // Check for Long Sleeves (handle various formats: long sleeve, longsleeve, long sleeves, longsleeves)
  // Also check cut_type and fabric fields for additional context
  if (rawCategory.includes('long sleeve') || rawCategory.includes('longsleeve') ||
      rawName.includes('long sleeve') || rawName.includes('longsleeve') ||
      rawCutType.includes('long sleeve') || rawFabric.includes('long sleeve')) {
    return 'Long Sleeves';
  }

  // Check for Uniforms (handle various formats)
  // Also check cut_type and fabric fields for additional context
  if (rawCategory.includes('uniform') || rawName.includes('uniform') ||
      rawCutType.includes('uniform') || rawFabric.includes('uniform')) {
    return 'Uniforms';
  }

  // For jersey category products, check the product name, sport field, cut_type, and fabric to differentiate basketball vs volleyball
  if (rawCategory === 'jerseys' || rawCategory === 'jersey') {
    const combinedText = `${rawName} ${rawSport} ${rawCutType} ${rawFabric}`;
    
    if (combinedText.includes('basketball') || rawSport === 'basketball') {
      return 'Basketball Jerseys';
    }
    if (combinedText.includes('volleyball') || rawSport === 'volleyball') {
      return 'Volleyball Jerseys';
    }
    // If it's a jersey but name doesn't specify, default to generic
    return 'Custom Jerseys';
  }

  // Combine all fields for comprehensive matching
  const text = `${rawCategory} ${rawName} ${rawCutType} ${rawFabric} ${rawSport}`;

  if (text.includes('basketball')) {
    return 'Basketball Jerseys';
  }

  if (text.includes('volleyball')) {
    return 'Volleyball Jerseys';
  }

  if (text.includes('hoodie')) {
    return 'Hoodies';
  }

  if (text.includes('jersey')) {
    return 'Custom Jerseys';
  }

  if (text.includes('ball')) {
    return 'Sports Balls';
  }

  if (text.includes('troph')) {
    return 'Trophies';
  }

  if (text.includes('medal')) {
    return 'Medals';
  }

  return 'Other Products';
}

function canonicalizeCityProvince(city, province) {
  // Clean up city name - remove common suffixes like "(capital)", "(Capital)", etc.
  let cleanedCity = (city || '').toString().trim();
  cleanedCity = cleanedCity.replace(/\s*\(capital\)/i, '');
  cleanedCity = cleanedCity.replace(/\s*\(Capital\)/i, '');
  cleanedCity = cleanedCity.replace(/\s*\(CAPITAL\)/i, '');
  
  const normalizedCity = normalizeValue(cleanedCity);
  const normalizedProvince = normalizeValue(province);

  if (!normalizedCity) {
    return {
      city: 'Unknown',
      province: normalizedProvince ? titleCase(normalizedProvince) : 'Unknown',
      normalizedCity: 'UNKNOWN',
      normalizedProvince: normalizedProvince || 'UNKNOWN',
      blocked: false
    };
  }

  const override = CITY_PROVINCE_OVERRIDES[normalizedCity];
  if (override) {
    return {
      city: override.city,
      province: override.province,
      normalizedCity,
      normalizedProvince: normalizeValue(override.province),
      blocked: override.block === true
    };
  }

  return {
    city: titleCase(normalizedCity),
    province: normalizedProvince ? titleCase(normalizedProvince) : 'Unknown',
    normalizedCity,
    normalizedProvince: normalizedProvince || 'UNKNOWN',
    blocked: false
  };
}

function isWithinServiceArea(lat, lng) {
  return Number.isFinite(lat)
    && Number.isFinite(lng)
    && lat >= SERVICE_AREA_BOUNDS.minLat
    && lat <= SERVICE_AREA_BOUNDS.maxLat
    && lng >= SERVICE_AREA_BOUNDS.minLng
    && lng <= SERVICE_AREA_BOUNDS.maxLng;
}

function ensureBarangayGeo() {
  if (barangayGeoCache) {
    return barangayGeoCache;
  }

  try {
    // Try multiple possible paths for the CSV file (prioritize the new comprehensive file)
    const possibleCsvPaths = [
      path.join(__dirname, '..', 'scripts', 'data', 'barangay-centroids-all.csv'),
      path.join(__dirname, '..', '..', 'server', 'scripts', 'data', 'barangay-centroids-all.csv'),
      path.join(process.cwd(), 'server', 'scripts', 'data', 'barangay-centroids-all.csv'),
      // Fallback to old file if new one doesn't exist
      path.join(__dirname, 'data', 'barangay-centroids.csv'),
      path.join(__dirname, '..', 'scripts', 'data', 'barangay-centroids.csv'),
      path.join(__dirname, '..', '..', 'server', 'scripts', 'data', 'barangay-centroids.csv'),
      path.join(process.cwd(), 'server', 'scripts', 'data', 'barangay-centroids.csv')
    ];
    
    // Try to find location-data.json (comprehensive location data)
    const possibleJsonPaths = [
      path.join(__dirname, '..', '..', 'src', 'data', 'location-data.json'),
      path.join(process.cwd(), 'src', 'data', 'location-data.json'),
      // Fallback to old JSON file
      path.join(__dirname, 'data', 'barangays-calabarzon-oriental-mindoro.json'),
      path.join(__dirname, '..', 'scripts', 'data', 'barangays-calabarzon-oriental-mindoro.json'),
      path.join(__dirname, '..', '..', 'server', 'scripts', 'data', 'barangays-calabarzon-oriental-mindoro.json'),
      path.join(process.cwd(), 'server', 'scripts', 'data', 'barangays-calabarzon-oriental-mindoro.json')
    ];
    
    let csvPath = null;
    let jsonPath = null;
    let csvContent = null;
    let barangayDataset = null;
    
    // Find CSV file
    for (const possiblePath of possibleCsvPaths) {
      if (fs.existsSync(possiblePath)) {
        csvPath = possiblePath;
        break;
      }
    }
    
    // Find JSON file (optional - we can work without it)
    for (const possiblePath of possibleJsonPaths) {
      if (fs.existsSync(possiblePath)) {
        jsonPath = possiblePath;
        break;
      }
    }
    
    if (!csvPath) {
      console.error('❌ ERROR: barangay centroids CSV file not found!');
      console.error('   Searched paths:', possibleCsvPaths);
      console.error('   Current __dirname:', __dirname);
      console.error('   Current process.cwd():', process.cwd());
      throw new Error('barangay centroids CSV file not found');
    }
    
    console.log(`✅ Loading CSV from: ${csvPath}`);
    csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Load JSON if available (for structure), but we can work without it
    if (jsonPath) {
      console.log(`✅ Loading JSON from: ${jsonPath}`);
      barangayDataset = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } else {
      console.log('⚠️  JSON location data not found, will build structure from CSV only');
      barangayDataset = { provinces: [] };
    }

    const cityByCode = new Map();
    const provinceByCode = new Map();
    const cityBarangays = new Map();
    const barangayByCode = new Map();
    const barangayByNameKey = new Map();
    const cityProvinceByCode = new Map();
    let totalBarangays = 0;

    // Build lookup maps from JSON dataset if available
    if (barangayDataset && barangayDataset.provinces) {
      barangayDataset.provinces.forEach(province => {
        const normalizedProvince = normalizeValue(province.name);
        provinceByCode.set(province.code, {
          name: province.name,
          normalizedProvince,
          regionCode: province.regionCode,
          regionName: province.regionName
        });
        
        province.citiesAndMunicipalities.forEach(city => {
          const normalizedCity = normalizeValue(city.name);
          const cityKey = `${normalizedProvince}|${normalizedCity}`;
          const cityEntry = {
            name: city.name,
            province: province.name,
            normalizedCity,
            normalizedProvince,
            cityKey,
            code: city.code
          };
          cityByCode.set(city.code, cityEntry);
          cityProvinceByCode.set(city.code, {
            normalizedCity,
            normalizedProvince
          });
          if (!cityBarangays.has(cityKey)) {
            cityBarangays.set(cityKey, []);
          }
          
          if (city.barangays) {
            city.barangays.forEach(barangay => {
              const normalizedBarangay = normalizeBarangayName(barangay.name);
              const barangayEntry = {
                code: barangay.code,
                name: barangay.name,
                normalizedBarangay,
                normalizedCity,
                normalizedProvince,
                city: city.name,
                province: province.name,
                latitude: null,
                longitude: null
              };
              cityBarangays.get(cityKey).push(barangayEntry);
              if (barangay.code) {
                barangayByCode.set(barangay.code, barangayEntry);
              }
              if (normalizedBarangay) {
                const nameKey = `${cityKey}|${normalizedBarangay}`;
                barangayByNameKey.set(nameKey, barangayEntry);
              }
              totalBarangays += 1;
            });
          }
        });
      });
    }

    console.log(`📊 Parsing CSV file (${csvPath})...`);
    const lines = csvContent.split(/\r?\n/);
    console.log(`📊 Total lines in CSV: ${lines.length}`);
    
    // Check if it's the new format (barangay-centroids-all.csv) or old format
    const isNewFormat = csvPath.includes('barangay-centroids-all.csv');
    const headerLine = lines[0] || '';
    const hasRegionColumn = headerLine.includes('region_psgc');
    
    let csvCodesLoaded = 0;
    let csvCodesWithCoords = 0;
    
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line || line.trim() === '') {
        continue;
      }
      
      // Parse CSV line (handle quoted fields)
      const parts = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim()); // Add last part
      
      if (parts.length < 6) {
        continue;
      }
      
      // New format: region_psgc,province_psgc,city_muni_psgc,barangay_psgc,barangay_name,latitude,longitude
      // Old format: region_psgc,province_psgc,city_muni_psgc,barangay_psgc,barangay_name,latitude,longitude (same!)
      let regionCode, provinceCode, cityCode, barangayCode, rawBarangayName, latStr, lngStr;
      
      if (hasRegionColumn && parts.length >= 7) {
        [regionCode, provinceCode, cityCode, barangayCode, rawBarangayName, latStr, lngStr] = parts;
      } else if (parts.length >= 7) {
        // Assume new format even without header check
        [regionCode, provinceCode, cityCode, barangayCode, rawBarangayName, latStr, lngStr] = parts;
      } else {
        // Old format fallback
        [, , cityCode, barangayCode, rawBarangayName, latStr, lngStr] = parts;
        regionCode = '';
        provinceCode = '';
      }
      
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lngStr);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        continue;
      }

      const normalizedBarangay = normalizeBarangayName(rawBarangayName);
      let entry = barangayByCode.get(barangayCode);
      
      if (!entry) {
        // Try to find city metadata from JSON or create from CSV
        const cityMeta = cityByCode.get(cityCode);
        const provinceMeta = provinceByCode.get(provinceCode);
        let normalizedCity = '';
        let normalizedProvince = '';
        let cityName = '';
        let provinceName = '';
        
        if (cityMeta) {
          normalizedCity = cityMeta.normalizedCity;
          normalizedProvince = cityMeta.normalizedProvince;
          cityName = cityMeta.name;
          provinceName = cityMeta.province;
        } else if (provinceMeta) {
          // We have province info but not city - use province and infer city
          normalizedProvince = provinceMeta.normalizedProvince;
          provinceName = provinceMeta.name;
          normalizedCity = normalizeValue(cityCode);
          cityName = `City ${cityCode}`; // Fallback - we don't have city name
        } else {
          // No metadata available - use codes as fallback
          normalizedCity = normalizeValue(cityCode);
          normalizedProvince = normalizeValue(provinceCode);
          cityName = `City ${cityCode}`; // Fallback
          provinceName = `Province ${provinceCode}`; // Fallback
        }
        
        entry = {
          code: barangayCode,
          name: titleCase(normalizedBarangay || rawBarangayName),
          normalizedBarangay,
          normalizedCity,
          normalizedProvince,
          city: cityName,
          province: provinceName,
          latitude: null,
          longitude: null,
          regionCode: regionCode || null,
          provinceCode: provinceCode || null,
          cityCode: cityCode || null
        };
        barangayByCode.set(barangayCode, entry);
        csvCodesLoaded++;
        
        const cityKey = cityMeta ? cityMeta.cityKey : `${normalizedProvince}|${normalizedCity}`;
        if (!cityBarangays.has(cityKey)) {
          cityBarangays.set(cityKey, []);
        }
        cityBarangays.get(cityKey).push(entry);
      }

      if (entry) {
        entry.latitude = latitude;
        entry.longitude = longitude;
        csvCodesWithCoords++;
        const nameKey = `${entry.normalizedProvince}|${entry.normalizedCity}|${normalizedBarangay}`;
        if (normalizedBarangay) {
          barangayByNameKey.set(nameKey, entry);
        }
      }
    }
    
    console.log(`✅ Loaded ${csvCodesLoaded} barangay codes from CSV`);
    console.log(`✅ ${csvCodesWithCoords} codes have coordinates`);
    console.log(`✅ Total codes in barangayByCode map: ${barangayByCode.size}`);
    console.log(`✅ Total name keys in barangayByNameKey map: ${barangayByNameKey.size}`);

    barangayGeoCache = {
      barangayByCode,
      barangayByNameKey,
      cityBarangays,
      totalBarangays
    };

    console.log(`🗺️ Loaded ${barangayByCode.size} barangay centroids spanning ${cityBarangays.size} cities`);
  } catch (error) {
    console.warn('⚠️ Unable to load barangay centroid dataset, falling back to city coordinates:', error.message);
    barangayGeoCache = {
      barangayByCode: new Map(),
      barangayByNameKey: new Map(),
      cityBarangays: new Map(),
      totalBarangays: 0
    };
  }

  return barangayGeoCache;
}

function getBarangayCoordinate({
  barangayCode,
  barangayName,
  normalizedCity,
  normalizedProvince,
  barangayByCode,
  barangayByNameKey,
  debug = false
}) {
  // Try by code first (most accurate)
  if (barangayCode && barangayByCode.has(barangayCode)) {
    const entry = barangayByCode.get(barangayCode);
    if (Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude)) {
      if (debug) {
        console.log(`  ✅ Found by code: ${barangayCode}`);
      }
      return entry;
    }
  }

  // Try by name
  const normalizedBarangay = normalizeBarangayName(barangayName);
  if (normalizedBarangay) {
    const key = `${normalizedProvince}|${normalizedCity}|${normalizedBarangay}`;
    
    if (debug) {
      console.log(`  🔍 Name lookup attempt:`);
      console.log(`    - Original: "${barangayName}"`);
      console.log(`    - Normalized: "${normalizedBarangay}"`);
      console.log(`    - Search key: "${key}"`);
      console.log(`    - Key exists: ${barangayByNameKey.has(key)}`);
      
      // Try some variations
      const variations = [
        key,
        `${normalizedProvince}|${normalizedCity.toUpperCase()}|${normalizedBarangay}`,
        `${normalizedProvince}|${normalizedCity.toLowerCase()}|${normalizedBarangay}`,
        `${normalizedProvince.toUpperCase()}|${normalizedCity}|${normalizedBarangay}`,
        `${normalizedProvince.toLowerCase()}|${normalizedCity}|${normalizedBarangay}`
      ];
      
      // Check what keys actually exist for this city/province
      const matchingKeys = [];
      for (const [existingKey, value] of barangayByNameKey.entries()) {
        if (existingKey.startsWith(`${normalizedProvince}|${normalizedCity}|`)) {
          matchingKeys.push(existingKey);
        }
      }
      if (matchingKeys.length > 0) {
        console.log(`    - Available keys for ${normalizedProvince}|${normalizedCity}: ${matchingKeys.slice(0, 5).join(', ')}${matchingKeys.length > 5 ? '...' : ''}`);
      }
    }
    
    if (barangayByNameKey.has(key)) {
      const entry = barangayByNameKey.get(key);
      if (Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude)) {
        if (debug) {
          console.log(`  ✅ Found by name lookup`);
        }
        return entry;
      }
    }
    
    // Try case-insensitive variations
    if (!barangayByNameKey.has(key)) {
      for (const [existingKey, value] of barangayByNameKey.entries()) {
        if (existingKey.toLowerCase() === key.toLowerCase()) {
          if (Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
            if (debug) {
              console.log(`  ✅ Found by case-insensitive match: "${existingKey}"`);
            }
            return value;
          }
        }
      }
    }
  }

  return null;
}

async function resolveBranchContext(user) {
  // Owners don't need branch filtering - they see all data
  if (!user || user.role === 'owner') {
    return null;
  }

  // Only admins need branch filtering
  if (user.role !== 'admin') {
    return null;
  }

  if (!user.branch_id) {
    const error = new Error('Admin account is missing branch assignment');
    error.statusCode = 403;
    throw error;
  }

  const branchId = parseInt(user.branch_id, 10);
  if (Number.isNaN(branchId)) {
    const error = new Error('Admin account has invalid branch assignment');
    error.statusCode = 403;
    throw error;
  }
  let branchName = null;

  try {
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', branchId)
      .single();

    if (!branchError && branchData?.name) {
      branchName = branchData.name;
    } else if (branchError) {
      console.warn('⚠️ Unable to resolve branch name for admin:', branchError.message);
    }
  } catch (err) {
    console.warn('⚠️ Error resolving branch name for admin:', err.message);
    // Don't throw - continue with branchId even if name lookup fails
  }

  return { branchId, branchName, normalizedName: normalizeBranchValue(branchName) };
}

function filterOrdersByBranch(orders, branchContext) {
  if (!branchContext) {
    return Array.isArray(orders) ? orders : [];
  }

  const { branchId, normalizedName } = branchContext;
  const normalizedBranchId = Number.isNaN(branchId) ? null : branchId;

  return (orders || []).filter(order => {
    const orderBranchId = order?.pickup_branch_id !== undefined && order?.pickup_branch_id !== null
      ? parseInt(order.pickup_branch_id, 10)
      : order?.branch_id !== undefined && order?.branch_id !== null
        ? parseInt(order.branch_id, 10)
        : null;

    const matchesId = normalizedBranchId !== null && orderBranchId === normalizedBranchId;
    const matchesName = normalizedName ? orderMatchesBranchName(order, normalizedName) : false;

    return matchesId || matchesName;
  });
}

function getBranchDisplayName(order, branchContext) {
  if (branchContext) {
    const contextName = branchContext.branchName || `Branch ${branchContext.branchId}`;
    return canonicalizeBranchName(contextName);
  }
 
  const candidate = order.pickup_location
    || order.branch_name
    || (order.pickup_branch_id ? `Branch ${order.pickup_branch_id}` : 'Online Orders');

  return canonicalizeBranchName(candidate);
}

function handleAnalyticsError(res, error, defaultMessage) {
  const status = error.statusCode || 500;
  const isPermissionError = status === 403;
  const message = isPermissionError ? error.message : defaultMessage;

  if (isPermissionError) {
    console.warn('🚫 Analytics permission error:', message);
  } else {
    console.error(defaultMessage, error);
  }

  return res.status(status).json({
    success: false,
    error: message
  });
}

function normalizeBranchValue(value) {
  if (!value) {
    return null;
  }

  return value
    .toString()
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/branch/g, ' ')
    .replace(/main/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

const BRANCH_NAME_ALIASES = new Map([
  ['batangascity', 'BATANGAS CITY BRANCH']
]);

function canonicalizeBranchName(value) {
  if (!value) {
    return value;
  }

  const normalized = normalizeBranchValue(value);
  if (!normalized) {
    return value;
  }

  const alias = BRANCH_NAME_ALIASES.get(normalized);
  if (alias) {
    return alias;
  }

  return value;
}

function orderMatchesBranchName(order, normalizedBranchName) {
  const normalizedTargets = [
    order?.pickup_location,
    order?.branch_name,
    order?.managing_branch_name
  ]
    .filter(Boolean)
    .map(normalizeBranchValue)
    .filter(Boolean);

  if (normalizedTargets.length === 0) {
    return false;
  }

  return normalizedTargets.includes(normalizedBranchName);
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function buildBranchFilterClause(branchContext, startIndex = 1) {
  if (!branchContext) {
    return { clause: '', params: [] };
  }

  const conditions = [];
  const params = [];
  let index = startIndex;

  // Filter by pickup_branch_id (orders table uses pickup_branch_id, not branch_id)
  if (branchContext.branchId) {
    params.push(branchContext.branchId);
    const branchIdIndex = index;
    index += 1;
    conditions.push(`pickup_branch_id = $${branchIdIndex}`);
  }

  // Also filter by pickup_location name (for compatibility)
  if (branchContext.branchName) {
    const escapedFull = escapeLike(branchContext.branchName);
    params.push(`%${escapedFull}%`);
    const patternIndex = index;
    index += 1;
    conditions.push(`pickup_location ILIKE $${patternIndex} ESCAPE '\\'`);

    const simplified = branchContext.branchName
      .replace(/\(.*?\)/g, ' ')
      .replace(/branch/gi, ' ')
      .replace(/main/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (simplified && simplified.toLowerCase() !== branchContext.branchName.toLowerCase()) {
      params.push(`%${escapeLike(simplified)}%`);
      const simpleIndex = index;
      index += 1;
      conditions.push(`pickup_location ILIKE $${simpleIndex} ESCAPE '\\'`);
    }
  }

  if (conditions.length === 0) {
    return { clause: '', params: [] };
  }

  return {
    clause: ` AND (${conditions.join(' OR ')})`,
    params
  };
}

function addMonthsUTC(date, count) {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  return new Date(Date.UTC(utcYear, utcMonth + count, 1));
}

function startOfMonthUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function formatMonthLabel(date) {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function calculateStandardDeviation(values, mean) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const safeMean = Number.isFinite(mean) ? mean : (values.reduce((sum, value) => sum + value, 0) / values.length || 0);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - safeMean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function roundCurrency(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function generateForecastMonths(rangeKey, startDate) {
  const months = [];
  const safeStart = startOfMonthUTC(startDate);

  if (rangeKey === 'nextMonth') {
    months.push(addMonthsUTC(safeStart, 1));
    return months;
  }

  if (rangeKey === 'restOfYear') {
    let pointer = safeStart;
    const currentYear = safeStart.getUTCFullYear();
    while (pointer.getUTCFullYear() === currentYear) {
      months.push(pointer);
      pointer = addMonthsUTC(pointer, 1);
    }
    if (!months.length) {
      months.push(addMonthsUTC(safeStart, 1));
    }
    return months;
  }

  let pointer = safeStart;
  for (let i = 0; i < 12; i += 1) {
    months.push(pointer);
    pointer = addMonthsUTC(pointer, 1);
  }
  return months;
}

function monthsBetween(startDate, targetDate) {
  return (
    (targetDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (targetDate.getUTCMonth() - startDate.getUTCMonth())
  );
}

function buildFourierFeatures(monthIndex, harmonics = 6) {
  const features = [1, monthIndex];
  for (let k = 1; k <= harmonics; k += 1) {
    const angle = (2 * Math.PI * k * monthIndex) / 12;
    features.push(Math.sin(angle));
    features.push(Math.cos(angle));
  }
  return features;
}

function solveLinearSystem(matrix, vector, epsilon = 1e-6) {
  const n = vector.length;
  const a = matrix.map((row) => row.slice());
  const b = vector.slice();

  for (let i = 0; i < n; i += 1) {
    a[i][i] += epsilon;
  }

  for (let i = 0; i < n; i += 1) {
    let pivot = i;
    for (let row = i + 1; row < n; row += 1) {
      if (Math.abs(a[row][i]) > Math.abs(a[pivot][i])) {
        pivot = row;
      }
    }

    if (Math.abs(a[pivot][i]) < 1e-8) {
      return null;
    }

    if (pivot !== i) {
      [a[i], a[pivot]] = [a[pivot], a[i]];
      [b[i], b[pivot]] = [b[pivot], b[i]];
    }

    const pivotValue = a[i][i];
    for (let j = i; j < n; j += 1) {
      a[i][j] /= pivotValue;
    }
    b[i] /= pivotValue;

    for (let row = 0; row < n; row += 1) {
      if (row === i) continue;
      const factor = a[row][i];
      if (factor === 0) continue;
      for (let col = i; col < n; col += 1) {
        a[row][col] -= factor * a[i][col];
      }
      b[row] -= factor * b[i];
    }
  }

  return b;
}

function seasonalNaiveForecast(series, horizon, seasonLength = 12) {
  if (!Array.isArray(series) || series.length < seasonLength || horizon <= 0) {
    return null;
  }
  const forecast = [];
  for (let h = 1; h <= horizon; h += 1) {
    const index = series.length - seasonLength + ((h - 1) % seasonLength);
    forecast.push(series[index]);
  }
  return forecast;
}

function fitWeightedFourierRegression(points, forecastDates, options = {}) {
  if (!Array.isArray(points) || points.length < 18 || !Array.isArray(forecastDates)) {
    return null;
  }

  const harmonics = options.harmonics ?? 6;
  const recencyDecay = options.recencyDecay ?? 0.55;
  const minWeight = options.minWeight ?? 0.3;
  const baseDate = points[0].monthDate;

  const featureLength = 2 + harmonics * 2;
  const normalMatrix = Array.from({ length: featureLength }, () => Array(featureLength).fill(0));
  const normalVector = Array(featureLength).fill(0);
  const weights = [];
  const logValues = [];

  points.forEach((point, idx) => {
    const monthsIndex = monthsBetween(baseDate, point.monthDate);
    const features = buildFourierFeatures(monthsIndex, harmonics);
    const revenue = Math.max(0, point.revenue);
    const logValue = Math.log(revenue + 1);
    const monthsAgo = points.length - 1 - idx;
    const decayFactor = Math.pow(recencyDecay, monthsAgo / 12);
    const weight = Math.max(minWeight, decayFactor);

    weights.push(weight);
    logValues.push(logValue);

    for (let i = 0; i < featureLength; i += 1) {
      normalVector[i] += weight * features[i] * logValue;
      for (let j = 0; j < featureLength; j += 1) {
        normalMatrix[i][j] += weight * features[i] * features[j];
      }
    }
  });

  const coefficients = solveLinearSystem(normalMatrix, normalVector);
  if (!coefficients) {
    return null;
  }

  const absPercentErrors = [];
  let residualSumSquares = 0;
  let weightSum = 0;

  points.forEach((point, idx) => {
    const monthsIndex = monthsBetween(baseDate, point.monthDate);
    const features = buildFourierFeatures(monthsIndex, harmonics);
    const logPrediction = features.reduce((sum, value, i) => sum + value * coefficients[i], 0);
    const prediction = Math.max(0, Math.exp(logPrediction) - 1);

    const actual = Math.max(0, point.revenue);
    if (actual > 0) {
      absPercentErrors.push(Math.abs((actual - prediction) / actual));
    }

    const weight = weights[idx];
    residualSumSquares += weight * Math.pow(logValues[idx] - logPrediction, 2);
    weightSum += weight;
  });

  const trainingMape = absPercentErrors.length
    ? (absPercentErrors.reduce((sum, value) => sum + value, 0) / absPercentErrors.length) * 100
    : null;
  const residualStd = weightSum > 0 ? Math.sqrt(residualSumSquares / weightSum) : null;

  let baseConfidence = 0.7;
  if (trainingMape !== null) {
    baseConfidence = clamp(1 - Math.min(trainingMape / 120, 0.6), 0.45, 0.92);
  } else if (residualStd !== null) {
    baseConfidence = clamp(1 - Math.min(residualStd, 0.6), 0.45, 0.9);
  }

  const forecastValues = forecastDates.map((date) => {
    const monthsIndex = monthsBetween(baseDate, date);
    const features = buildFourierFeatures(monthsIndex, harmonics);
    const logPrediction = features.reduce((sum, value, i) => sum + value * coefficients[i], 0);
    return Math.max(0, Math.exp(logPrediction) - 1);
  });

  return {
    forecastValues,
    baseConfidence,
    trainingMape
  };
}

function resolveCustomerName(order) {
  if (!order) {
    return null;
  }

  let deliveryAddress = order.delivery_address || order.deliveryAddress || null;
  if (deliveryAddress && typeof deliveryAddress === 'string') {
    try {
      deliveryAddress = JSON.parse(deliveryAddress);
    } catch (parseError) {
      deliveryAddress = null;
    }
  }

  const candidates = [
    order.customer_name,
    order.customerName,
    order.customer_full_name,
    order.customerFullName,
    order.customer?.full_name,
    order.customer?.name,
    deliveryAddress?.receiver,
    deliveryAddress?.receiver_name,
    deliveryAddress?.full_name,
    deliveryAddress?.fullName,
    deliveryAddress?.name,
    deliveryAddress?.contact_name,
    deliveryAddress?.contactName,
    order.user_full_name,
    order.userFullName
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return null;
}

function resolveCustomerEmail(order) {
  if (!order) {
    return null;
  }

  let deliveryAddress = order.delivery_address || order.deliveryAddress || null;
  if (deliveryAddress && typeof deliveryAddress === 'string') {
    try {
      deliveryAddress = JSON.parse(deliveryAddress);
    } catch (parseError) {
      deliveryAddress = null;
    }
  }

  const candidates = [
    order.customer_email,
    order.customerEmail,
    order.email,
    order.user_email,
    order.userEmail,
    deliveryAddress?.email,
    deliveryAddress?.Email,
    deliveryAddress?.contact_email,
    deliveryAddress?.contactEmail
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed.toLowerCase();
      }
    }
  }

  return null;
}

// Get analytics dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const { branch_id } = req.query;
    console.log('📊 Fetching analytics data (optimized)...');
    console.log('📊 User info:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      branch_id: req.user?.branch_id,
      query_branch_id: branch_id
    });

    let branchContext;
    try {
      branchContext = await resolveBranchContext(req.user);
      console.log('📊 Branch context resolved:', branchContext);
      
      // For owners: if branch_id is provided in query, create branch context for that branch
      if (req.user?.role === 'owner' && branch_id) {
        const branchId = parseInt(branch_id, 10);
        if (!Number.isNaN(branchId)) {
          try {
            const { data: branchData, error: branchError } = await supabase
              .from('branches')
              .select('id, name')
              .eq('id', branchId)
              .single();
            
            if (!branchError && branchData) {
              branchContext = {
                branchId: branchData.id,
                branchName: branchData.name,
                normalizedName: normalizeBranchValue(branchData.name)
              };
              console.log('📊 Owner branch context overridden:', branchContext);
            }
          } catch (err) {
            console.warn('⚠️ Error resolving branch for owner:', err.message);
          }
        }
      }
    } catch (branchError) {
      console.error('❌ Error resolving branch context:', branchError);
      console.error('❌ Branch error stack:', branchError.stack);
      return handleAnalyticsError(res, branchError, 'Failed to resolve branch context');
    }

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfCurrentMonthIso = startOfCurrentMonth.toISOString();

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    const statusFilter = buildBranchFilterClause(branchContext, 1);
    const monthlyFilter = buildBranchFilterClause(branchContext, 2);
    const branchSalesFilter = buildBranchFilterClause(branchContext, 2);
    const uniqueCustomersFilter = buildBranchFilterClause(branchContext, 2);
    const recentOrdersFilter = buildBranchFilterClause(branchContext, 2);
    
    console.log('📊 Filter clauses:', {
      statusFilter: { clause: statusFilter.clause, paramCount: statusFilter.params.length },
      monthlyFilter: { clause: monthlyFilter.clause, paramCount: monthlyFilter.params.length },
      branchSalesFilter: { clause: branchSalesFilter.clause, paramCount: branchSalesFilter.params.length }
    });
    
    // Check if DATABASE_URL is configured - if not, use Supabase client fallback
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  DATABASE_URL is not configured! Using Supabase client fallback for analytics.');
      console.warn('⚠️  For better performance, add DATABASE_URL to your server/.env file.');
      console.warn('⚠️  Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
      
      // Use Supabase client to fetch orders and calculate analytics
      try {
        let ordersQuery = supabase
          .from('orders')
          .select('id, order_number, total_amount, status, created_at, user_id, pickup_location, order_items')
          .lt('created_at', startOfCurrentMonthIso);
        
        // Apply branch filter if needed
        if (branchContext?.branchName) {
          ordersQuery = ordersQuery.ilike('pickup_location', `%${branchContext.branchName}%`);
        }
        
        const { data: allOrders, error: ordersError } = await ordersQuery;
        
        if (ordersError) {
          throw ordersError;
        }
        
        // Filter out cancelled orders for calculations
        const validOrders = (allOrders || []).filter(order => {
          const status = (order.status || '').toLowerCase();
          return status !== 'cancelled' && status !== 'canceled';
        });
        
        // Calculate analytics from orders
        const statusCounts = {};
        const monthlySales = new Map();
        const branchSales = new Map();
        const customerSet = new Set();
        const productGroupSales = {};
        const categorySales = {};
        
        validOrders.forEach(order => {
          // Status counts
          const status = (order.status || '').toLowerCase();
          statusCounts[status] = (statusCounts[status] || 0) + 1;
          
          // Monthly sales
          if (order.created_at) {
            const orderDate = new Date(order.created_at);
            const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            const current = monthlySales.get(monthKey) || 0;
            monthlySales.set(monthKey, current + (parseFloat(order.total_amount) || 0));
          }
          
          // Branch sales
          const branch = order.pickup_location || 'Online Orders';
          const branchTotal = branchSales.get(branch) || 0;
          branchSales.set(branch, branchTotal + (parseFloat(order.total_amount) || 0));
          
          // Unique customers
          if (order.user_id) {
            customerSet.add(order.user_id);
          }
          
          // Product and category analysis
          try {
            let items = order.order_items;
            if (typeof items === 'string') {
              items = JSON.parse(items);
            }
            if (Array.isArray(items)) {
              items.forEach(item => {
                const group = determineProductGroup(item);
                const category = item?.category || 'Other';
                const quantity = parseInt(item?.quantity || 0, 10);
                // Try price, pricePerUnit, or totalPrice/quantity as fallback
                const price = parseFloat(item?.price || item?.pricePerUnit || (item?.totalPrice && quantity > 0 ? item.totalPrice / quantity : 0) || 0);
                
                if (!productGroupSales[group]) {
                  productGroupSales[group] = { quantity: 0, revenue: 0, orders: new Set() };
                }
                productGroupSales[group].quantity += quantity;
                productGroupSales[group].revenue += quantity * price;
                productGroupSales[group].orders.add(order.id);
                
                if (!categorySales[category]) {
                  categorySales[category] = { quantity: 0, orders: new Set() };
                }
                categorySales[category].quantity += quantity;
                categorySales[category].orders.add(order.id);
              });
            }
          } catch (e) {
            // Skip invalid order items
          }
        });
        
        // Get recent orders
        let recentQuery = supabase
          .from('orders')
          .select('id, order_number, total_amount, status, created_at, user_id, pickup_location, order_items')
          .gte('created_at', thirtyDaysAgoIso)
          .order('created_at', { ascending: false })
          .limit(1000);
        
        if (branchContext?.branchName) {
          recentQuery = recentQuery.ilike('pickup_location', `%${branchContext.branchName}%`);
        }
        
        const { data: recentOrdersData } = await recentQuery;
        const recentOrdersList = (recentOrdersData || [])
          .filter(order => {
            const status = (order.status || '').toLowerCase();
            return status !== 'cancelled' && status !== 'canceled';
          })
          .slice(0, 10)
          .map(order => ({
            id: order.id,
            order_number: order.order_number,
            total_amount: parseFloat(order.total_amount) || 0,
            status: order.status,
            created_at: order.created_at,
            user_id: order.user_id
          }));
        
        // Build response data
        const totalOrders = validOrders.length;
        const totalRevenue = Array.from(monthlySales.values()).reduce((a, b) => a + b, 0);
        const totalCustomers = customerSet.size;
        
        const CANCELLED_STATUSES = new Set(['cancelled', 'canceled']);
        const COMPLETED_STATUSES = new Set(['completed', 'delivered', 'picked_up_delivered', 'picked_up', 'finished']);
        const PROCESSING_STATUSES = new Set(['processing', 'confirmed', 'layout', 'packing_completing', 'in_production', 'ready_for_pickup', 'ready_for_delivery', 'sizing']);
        const PENDING_STATUSES = new Set(['pending', 'payment_pending', 'awaiting_payment', 'awaiting_confirmation']);
        
        let completedCount = 0;
        let processingCount = 0;
        let pendingCount = 0;
        let cancelledCount = 0;
        
        Object.entries(statusCounts).forEach(([status, count]) => {
          if (CANCELLED_STATUSES.has(status)) {
            cancelledCount += count;
          } else if (COMPLETED_STATUSES.has(status)) {
            completedCount += count;
          } else if (PROCESSING_STATUSES.has(status)) {
            processingCount += count;
          } else if (PENDING_STATUSES.has(status)) {
            pendingCount += count;
          } else {
            pendingCount += count;
          }
        });
        
        const monthlySalesArray = Array.from(monthlySales.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([key, sales]) => {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return {
              key,
              year: parseInt(year),
              month: parseInt(month),
              label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              date: date.toISOString(),
              sales: Math.round(sales),
              granularity: 'monthly'
            };
          });
        
        const yearlySalesMap = new Map();
        monthlySalesArray.forEach(item => {
          yearlySalesMap.set(item.year, (yearlySalesMap.get(item.year) || 0) + item.sales);
        });
        
        const yearlySalesArray = Array.from(yearlySalesMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([year, sales]) => ({
            year,
            label: String(year),
            date: new Date(year, 0, 1).toISOString(),
            sales: Math.round(sales),
            granularity: 'yearly'
          }));
        
        const salesByBranchArray = Array.from(branchSales.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([branch, sales], index) => ({
            branch: branch || 'Unspecified',
            sales: Math.round(sales),
            color: getBranchColor(index)
          }));
        
        const topProductsArray = Object.entries(productGroupSales)
          .map(([group, data]) => ({
            product: group,
            quantity: data.quantity,
            orders: data.orders.size,
            revenue: Math.round(data.revenue)
          }))
          .sort((a, b) => {
            // Sort by quantity, but always put "Other Products" at the end if it exists
            if (a.product === 'Other Products' && b.product !== 'Other Products') return 1;
            if (b.product === 'Other Products' && a.product !== 'Other Products') return -1;
            return b.quantity - a.quantity;
          });
        
        // Separate "Other Products" if it exists
        const otherProductsIndex = topProductsArray.findIndex(item => item.product === 'Other Products');
        let otherProducts = null;
        if (otherProductsIndex >= 0) {
          otherProducts = topProductsArray.splice(otherProductsIndex, 1)[0];
        }
        
        // Get top 6 (or 7 if no "Other Products")
        const top6 = topProductsArray.slice(0, 6);
        
        // Always include "Other Products" at the end if it exists, even if not in top 6
        if (otherProducts && (otherProducts.quantity > 0 || otherProducts.orders > 0)) {
          topProductsArray.splice(0, topProductsArray.length, ...top6, otherProducts);
        } else {
          topProductsArray.splice(0, topProductsArray.length, ...top6);
        }
        
        const topCategoriesArray = Object.entries(categorySales)
          .map(([category, data]) => ({
            category,
            quantity: data.quantity,
            orders: data.orders.size
          }))
          .sort((a, b) => b.quantity - a.quantity);
        
        const denominator = totalOrders > 0 ? totalOrders : 1;
        const orderStatusData = {
          completed: {
            count: completedCount,
            percentage: totalOrders > 0 ? Math.round((completedCount / denominator) * 100) : 0
          },
          processing: {
            count: processingCount,
            percentage: totalOrders > 0 ? Math.round((processingCount / denominator) * 100) : 0
          },
          pending: {
            count: pendingCount,
            percentage: totalOrders > 0 ? Math.round((pendingCount / denominator) * 100) : 0
          },
          cancelled: {
            count: cancelledCount,
            percentage: totalOrders > 0 ? Math.round((cancelledCount / denominator) * 100) : 0
          },
          total: totalOrders
        };
        
        const processedData = {
          salesOverTime: {
            monthly: monthlySalesArray,
            yearly: yearlySalesArray
          },
          salesByBranch: salesByBranchArray,
          orderStatus: orderStatusData,
          topProducts: topProductsArray,
          topCategories: topCategoriesArray,
          summary: {
            totalRevenue,
            totalOrders,
            totalCustomers,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
          },
          recentOrders: recentOrdersList
        };
        
        console.log('✅ Analytics data fetched using Supabase client fallback');
        console.log(`📊 Found ${totalOrders} orders, ${totalCustomers} customers, ${Math.round(totalRevenue)} revenue`);
        
        return res.json({
          success: true,
          data: processedData
        });
      } catch (fallbackError) {
        console.error('❌ Supabase client fallback error:', fallbackError);
        // Return empty data if fallback also fails
        const emptyData = {
          salesOverTime: { monthly: [], yearly: [] },
          salesByBranch: [],
          orderStatus: {
            completed: { count: 0, percentage: 0 },
            processing: { count: 0, percentage: 0 },
            pending: { count: 0, percentage: 0 },
            cancelled: { count: 0, percentage: 0 },
            total: 0
          },
          topProducts: [],
          topCategories: [],
          summary: {
            totalRevenue: 0,
            totalOrders: 0,
            totalCustomers: 0,
            averageOrderValue: 0
          },
          recentOrders: []
        };
        
        return res.json({
          success: true,
          data: emptyData,
          warning: `Analytics error: ${fallbackError.message}`
        });
      }
    }
    
    console.log('📊 DATABASE_URL configured:', process.env.DATABASE_URL ? 'Yes (length: ' + process.env.DATABASE_URL.length + ')' : 'No');
    console.log('📊 Executing SQL queries...');

    const statusQueryPromise = executeSql(
      `
        SELECT LOWER(status) AS status, COUNT(*)::bigint AS total
        FROM orders
        WHERE status IS NOT NULL
        ${statusFilter.clause}
        GROUP BY LOWER(status)
      `,
      statusFilter.params
    );

    const monthlySalesPromise = executeSql(
      `
        SELECT date_trunc('month', created_at) AS month_start,
               SUM(total_amount)::numeric AS sales
        FROM orders
        WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
          AND created_at < $1
        ${monthlyFilter.clause}
        GROUP BY month_start
        ORDER BY month_start;
      `,
      [startOfCurrentMonthIso, ...monthlyFilter.params]
    );

    const salesByBranchPromise = executeSql(
      `
        SELECT COALESCE(pickup_location, 'Online Orders') AS pickup_location,
               SUM(total_amount)::numeric AS sales
        FROM orders
        WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
          AND created_at < $1
        ${branchSalesFilter.clause}
        GROUP BY pickup_location;
      `,
      [startOfCurrentMonthIso, ...branchSalesFilter.params]
    );

    const uniqueCustomersPromise = executeSql(
      `
        SELECT COUNT(DISTINCT user_id)::bigint AS total_customers
        FROM orders
        WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
          AND created_at < $1
        ${uniqueCustomersFilter.clause}
      `,
      [startOfCurrentMonthIso, ...uniqueCustomersFilter.params]
    );

    const recentOrdersPromise = executeSql(
      `
        SELECT id,
               order_number,
               total_amount::numeric AS total_amount,
               status,
               created_at,
               user_id,
               pickup_location,
               order_items
        FROM orders
        WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
          AND created_at >= $1
        ${recentOrdersFilter.clause}
        ORDER BY created_at DESC
        LIMIT 1000;
      `,
      [thirtyDaysAgoIso, ...recentOrdersFilter.params]
    );

    // Query for ALL orders (not just recent) to calculate top products from historical data
    const allOrdersForProductsPromise = executeSql(
      `
        SELECT id,
               order_items
        FROM orders
        WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
          AND created_at < $1
        ${monthlyFilter.clause}
      `,
      [startOfCurrentMonthIso, ...monthlyFilter.params]
    );

    let statusResult, monthlyResult, salesByBranchResult, uniqueCustomersResult, recentOrdersResult, allOrdersForProductsResult;
    
    try {
      [
        statusResult,
        monthlyResult,
        salesByBranchResult,
        uniqueCustomersResult,
        recentOrdersResult,
        allOrdersForProductsResult
      ] = await Promise.all([
        statusQueryPromise,
        monthlySalesPromise,
        salesByBranchPromise,
        uniqueCustomersPromise,
        recentOrdersPromise,
        allOrdersForProductsPromise
      ]);
    } catch (sqlError) {
      console.error('❌ SQL query execution error:', sqlError);
      console.error('❌ SQL error details:', {
        message: sqlError.message,
        code: sqlError.code,
        stack: sqlError.stack,
        originalError: sqlError.originalError ? {
          message: sqlError.originalError.message,
          code: sqlError.originalError.code
        } : null
      });
      
      // Check if it's a connection/configuration error
      if (!process.env.DATABASE_URL || sqlError.message?.includes('Missing DATABASE_URL')) {
        console.warn('⚠️  DATABASE_URL is not configured! Returning empty analytics data.');
        console.warn('⚠️  To enable analytics, add DATABASE_URL to your server/.env file.');
        
        // Return empty/default data structure so dashboard can still load
        const emptyData = {
          salesOverTime: {
            monthly: [],
            yearly: []
          },
          salesByBranch: [],
          orderStatus: {
            completed: { count: 0, percentage: 0 },
            processing: { count: 0, percentage: 0 },
            pending: { count: 0, percentage: 0 },
            cancelled: { count: 0, percentage: 0 },
            total: 0
          },
          topProducts: [],
          topCategories: [],
          summary: {
            totalRevenue: 0,
            totalOrders: 0,
            totalCustomers: 0,
            averageOrderValue: 0
          },
          recentOrders: []
        };
        
        return res.json({
          success: true,
          data: emptyData,
          warning: 'Analytics data unavailable: DATABASE_URL not configured. Dashboard will show empty data.'
        });
      }
      
      // For other database errors, still return empty data instead of crashing
      console.error('❌ Database query error:', sqlError.message);
      console.error('❌ Returning empty analytics data to prevent dashboard crash.');
      
      const emptyData = {
        salesOverTime: {
          monthly: [],
          yearly: []
        },
        salesByBranch: [],
        orderStatus: {
          completed: { count: 0, percentage: 0 },
          processing: { count: 0, percentage: 0 },
          pending: { count: 0, percentage: 0 },
          cancelled: { count: 0, percentage: 0 },
          total: 0
        },
        topProducts: [],
        topCategories: [],
        summary: {
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          averageOrderValue: 0
        },
        recentOrders: []
      };
      
      return res.json({
        success: true,
        data: emptyData,
        warning: `Analytics data unavailable: ${sqlError.message || 'Database query failed'}. Dashboard will show empty data.`
      });
    }

    // Defensive checks for query results
    if (!statusResult || !statusResult.rows) {
      console.error('❌ statusResult is null or missing rows');
      statusResult = { rows: [] };
    }
    if (!monthlyResult || !monthlyResult.rows) {
      console.error('❌ monthlyResult is null or missing rows');
      monthlyResult = { rows: [] };
    }
    if (!salesByBranchResult || !salesByBranchResult.rows) {
      console.error('❌ salesByBranchResult is null or missing rows');
      salesByBranchResult = { rows: [] };
    }
    if (!uniqueCustomersResult || !uniqueCustomersResult.rows) {
      console.error('❌ uniqueCustomersResult is null or missing rows');
      uniqueCustomersResult = { rows: [{ total_customers: 0 }] };
    }
    if (!recentOrdersResult || !recentOrdersResult.rows) {
      console.error('❌ recentOrdersResult is null or missing rows');
      recentOrdersResult = { rows: [] };
    }
    if (!allOrdersForProductsResult || !allOrdersForProductsResult.rows) {
      console.error('❌ allOrdersForProductsResult is null or missing rows');
      allOrdersForProductsResult = { rows: [] };
    }

    const CANCELLED_STATUSES = new Set(['cancelled', 'canceled']);
    const COMPLETED_STATUSES = new Set(['completed', 'delivered', 'picked_up_delivered', 'picked_up', 'finished']);
    const PROCESSING_STATUSES = new Set(['processing', 'confirmed', 'layout', 'packing_completing', 'in_production', 'ready_for_pickup', 'ready_for_delivery', 'sizing']);
    const PENDING_STATUSES = new Set(['pending', 'payment_pending', 'awaiting_payment', 'awaiting_confirmation']);

    let totalOrders = 0;
    let completedCount = 0;
    let processingCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    (statusResult.rows || []).forEach(row => {
      const status = (row.status || '').toString().toLowerCase();
      const count = Number(row.total) || 0;

      if (CANCELLED_STATUSES.has(status)) {
        cancelledCount += count;
        return;
      }

      totalOrders += count;

      if (COMPLETED_STATUSES.has(status)) {
        completedCount += count;
        return;
      }

      if (PROCESSING_STATUSES.has(status)) {
        processingCount += count;
        return;
      }

      if (PENDING_STATUSES.has(status)) {
        pendingCount += count;
        return;
      }

      pendingCount += count;
    });

    const monthlySalesArray = (monthlyResult.rows || [])
      .map(row => {
        const monthDate = new Date(row.month_start);
        if (Number.isNaN(monthDate.getTime())) {
          return null;
        }
        const sales = Number(row.sales) || 0;
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth() + 1;
        const key = `${year}-${String(month).padStart(2, '0')}`;

        return {
          key,
          year,
          month,
          label: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          date: monthDate.toISOString(),
          sales: Math.round(sales),
          granularity: 'monthly'
        };
      })
      .filter(Boolean);

    const yearlySalesMap = new Map();
    monthlySalesArray.forEach(item => {
      yearlySalesMap.set(item.year, (yearlySalesMap.get(item.year) || 0) + item.sales);
    });

    const yearlySalesArray = Array.from(yearlySalesMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, sales]) => ({
        year,
        label: String(year),
        date: new Date(year, 0, 1).toISOString(),
        sales: Math.round(sales),
        granularity: 'yearly'
      }));

    const branchTotals = new Map();
    (salesByBranchResult.rows || []).forEach(row => {
      const branchName = getBranchDisplayName(row, branchContext) || 'Unspecified';
      const sales = Number(row.sales) || 0;
      branchTotals.set(branchName, (branchTotals.get(branchName) || 0) + sales);
    });

    const salesByBranchArray = Array.from(branchTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([branch, sales], index) => ({
        branch,
        sales: Math.round(sales),
        color: getBranchColor(index)
      }));

    const totalRevenue = monthlySalesArray.reduce((sum, item) => sum + item.sales, 0);
    const totalCustomers = Number(uniqueCustomersResult.rows?.[0]?.total_customers) || 0;

    const recentOrdersRows = recentOrdersResult.rows || [];
    const recentOrdersList = recentOrdersRows
      .slice(0, 10)
      .map(order => {
        try {
          return {
            id: order.id,
            order_number: order.order_number,
            total_amount: Number(order.total_amount) || 0,
            status: order.status,
            created_at: order.created_at,
            user_id: order.user_id
          };
        } catch (err) {
          console.warn('Error processing recent order:', err, order);
          return null;
        }
      })
      .filter(Boolean);

    const productGroupSales = {};
    const categorySales = {};

    // Process ALL historical orders for top products (not just recent ones)
    const allOrdersForProductsRows = allOrdersForProductsResult.rows || [];
    console.log(`📊 Processing ${allOrdersForProductsRows.length} historical orders for top products calculation`);
    
    allOrdersForProductsRows.forEach(order => {
      try {
        let orderItems = order.order_items;
        if (!orderItems) {
          return;
        }

        if (typeof orderItems === 'string') {
          try {
            orderItems = JSON.parse(orderItems);
          } catch (parseError) {
            console.warn('Error parsing order_items JSON:', parseError);
            orderItems = [];
          }
        }

        if (!Array.isArray(orderItems)) {
          return;
        }

        orderItems.forEach(item => {
          try {
            let categoryName = item?.category || 'Other';
            if (typeof categoryName === 'string') {
              categoryName = categoryName.trim();
            }
            if (!categoryName) {
              categoryName = 'Other';
            }

            const quantity = parseInt(item?.quantity || 0, 10);
            // Try price, pricePerUnit, or totalPrice/quantity as fallback
            const price = parseFloat(item?.price || item?.pricePerUnit || (item?.totalPrice && quantity > 0 ? item.totalPrice / quantity : 0) || 0);
            const groupName = determineProductGroup(item);

            if (!productGroupSales[groupName]) {
              productGroupSales[groupName] = {
                quantity: 0,
                revenue: 0,
                orders: new Set()
              };
            }
            productGroupSales[groupName].quantity += quantity;
            productGroupSales[groupName].revenue += quantity * price;
            productGroupSales[groupName].orders.add(order.id);

            if (!categorySales[categoryName]) {
              categorySales[categoryName] = {
                quantity: 0,
                orders: new Set()
              };
            }
            categorySales[categoryName].quantity += quantity;
            categorySales[categoryName].orders.add(order.id);
          } catch (itemError) {
            console.warn('Error processing order item:', itemError, item);
            // Continue processing other items
          }
        });
      } catch (orderError) {
        console.warn('Error processing order:', orderError, order);
        // Continue processing other orders
      }
    });

        const topProductsArray = Object.entries(productGroupSales)
          .map(([group, data]) => ({
            product: group,
            quantity: data.quantity,
            orders: data.orders.size,
            revenue: Math.round(data.revenue)
          }))
          .sort((a, b) => {
            // Sort by quantity, but always put "Other Products" at the end if it exists
            if (a.product === 'Other Products' && b.product !== 'Other Products') return 1;
            if (b.product === 'Other Products' && a.product !== 'Other Products') return -1;
            return b.quantity - a.quantity;
          });
        
        // Separate "Other Products" if it exists
        const otherProductsIndex = topProductsArray.findIndex(item => item.product === 'Other Products');
        let otherProducts = null;
        if (otherProductsIndex >= 0) {
          otherProducts = topProductsArray.splice(otherProductsIndex, 1)[0];
        }
        
        // Get top 6 (or 7 if no "Other Products")
        const top6 = topProductsArray.slice(0, 6);
        
        // Always include "Other Products" at the end if it exists, even if not in top 6
        if (otherProducts && (otherProducts.quantity > 0 || otherProducts.orders > 0)) {
          topProductsArray.splice(0, topProductsArray.length, ...top6, otherProducts);
        } else {
          topProductsArray.splice(0, topProductsArray.length, ...top6);
        }

    const topCategoriesArray = Object.entries(categorySales)
      .map(([category, data]) => ({
        category,
        quantity: data.quantity,
        orders: data.orders.size
      }))
      .sort((a, b) => b.quantity - a.quantity);

    const denominator = totalOrders > 0 ? totalOrders : 1;
    const orderStatusData = {
      completed: {
        count: completedCount,
        percentage: totalOrders > 0 ? Math.round((completedCount / denominator) * 100) : 0
      },
      processing: {
        count: processingCount,
        percentage: totalOrders > 0 ? Math.round((processingCount / denominator) * 100) : 0
      },
      pending: {
        count: pendingCount,
        percentage: totalOrders > 0 ? Math.round((pendingCount / denominator) * 100) : 0
      },
      cancelled: {
        count: cancelledCount,
        percentage: totalOrders > 0 ? Math.round((cancelledCount / denominator) * 100) : 0
      },
      total: totalOrders
    };

    const processedData = {
      salesOverTime: {
        monthly: monthlySalesArray,
        yearly: yearlySalesArray
      },
      salesByBranch: salesByBranchArray,
      orderStatus: orderStatusData,
      topProducts: topProductsArray,
      topCategories: topCategoriesArray,
      summary: {
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      },
      recentOrders: recentOrdersList
    };

    console.log('📊 [DEBUG] Optimized analytics response:', {
      totalOrders: processedData.summary.totalOrders,
      totalRevenue: processedData.summary.totalRevenue,
      totalCustomers: processedData.summary.totalCustomers
    });

    console.log('✅ Dashboard analytics data processed successfully');
    
    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('❌ Dashboard analytics error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error stack:', error.stack);
    
    // Log more details if available
    if (error.originalError) {
      console.error('❌ Original error:', error.originalError);
    }
    if (error.details) {
      console.error('❌ Error details:', error.details);
    }
    
    return handleAnalyticsError(res, error, 'Failed to fetch analytics data');
  }
});

// Get sales trends
router.get('/sales-trends', async (req, res) => {
  try {
    const { period = '30', branch_id } = req.query;
    const daysAgo = parseInt(period);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'cancelled')
      .gte('created_at', startDate.toISOString());
 
    if (error) throw error;
 
    // For owners: if branch_id is provided in query, create branch context for that branch
    // For admins: use resolveBranchContext (automatically filters by their branch)
    let branchContext = await resolveBranchContext(req.user);
    
    // If owner provided branch_id query param, override branch context
    if (req.user?.role === 'owner' && branch_id) {
      const branchId = parseInt(branch_id, 10);
      if (!Number.isNaN(branchId)) {
        try {
          const { data: branchData, error: branchError } = await supabase
            .from('branches')
            .select('id, name')
            .eq('id', branchId)
            .single();
          
          if (!branchError && branchData) {
            branchContext = {
              branchId: branchData.id,
              branchName: branchData.name,
              normalizedName: normalizeBranchValue(branchData.name)
            };
          }
        } catch (err) {
          console.warn('⚠️ Error resolving branch for owner:', err.message);
        }
      }
    }
    
    const scopedOrders = filterOrdersByBranch(orders, branchContext);
    // Group by day
    const dailyData = {};
    scopedOrders.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          sales: 0,
          orders: 0
        };
      }
      dailyData[date].sales += parseFloat(order.total_amount || 0);
      dailyData[date].orders += 1;
    });

    const trends = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        orders: data.orders
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    return handleAnalyticsError(res, error, 'Failed to fetch sales trends');
  }
});

// Get product performance
router.get('/product-performance', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'cancelled')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    const branchContext = await resolveBranchContext(req.user);
    const scopedOrders = filterOrdersByBranch(orders, branchContext);

    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const filteredOrders = scopedOrders.filter(order => {
      const createdAt = new Date(order.created_at);
      return Number.isFinite(createdAt.getTime()) && createdAt < startOfCurrentMonth;
    });

    // Process product performance
    const productStats = {};
    filteredOrders.forEach(order => {
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach(item => {
          const name = item.name || 'Unknown';
          const category = item.category || 'Unknown';
          const key = `${name}-${category}`;
          
          if (!productStats[key]) {
            productStats[key] = {
              name,
              category,
              totalSold: 0,
              totalRevenue: 0,
              orders: new Set(),
              quantities: []
            };
          }
          
          const quantity = parseInt(item.quantity || 0);
          const price = parseFloat(item.price || 0);
          
          productStats[key].totalSold += quantity;
          productStats[key].totalRevenue += quantity * price;
          productStats[key].orders.add(order.id);
          productStats[key].quantities.push(quantity);
        });
      }
    });

    const performance = Object.values(productStats)
      .map(stat => ({
        name: stat.name,
        category: stat.category,
        totalSold: stat.totalSold,
        totalRevenue: stat.totalRevenue,
        orderCount: stat.orders.size,
        avgQuantityPerOrder: stat.quantities.length > 0 
          ? stat.quantities.reduce((a, b) => a + b, 0) / stat.quantities.length 
          : 0
      }))
      .sort((a, b) => b.totalSold - a.totalSold);

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    return handleAnalyticsError(res, error, 'Failed to fetch product performance');
  }
});

// Get customer analytics
router.get('/customer-analytics', async (req, res) => {
  try {
    // Fetch ALL orders (paginated to avoid Supabase default limit of 1000 rows)
    let allOrders = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .neq('status', 'cancelled')
        .neq('status', 'canceled')
        .range(from, to);

      if (error) throw error;

      if (orders && orders.length > 0) {
        allOrders = allOrders.concat(orders);
        hasMore = orders.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }

    console.log(`📊 Fetched ${allOrders.length} orders for customer analytics (paginated across ${page} pages)`);

    const branchContext = await resolveBranchContext(req.user);
    const scopedOrders = filterOrdersByBranch(allOrders, branchContext);
 
    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const ordersExcludingCurrentMonth = scopedOrders.filter(order => {
      const createdAt = new Date(order.created_at);
      return Number.isFinite(createdAt.getTime()) && createdAt < startOfCurrentMonth;
    });
 
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Calculate customer statistics from ALL orders (not just excluding current month)
    // This ensures we count all customers who have ever placed an order
    const customerStats = {};
    let newCustomers = new Set();

    // Process ALL orders to get accurate total customer count
    scopedOrders.forEach(order => {
      const userId = order.user_id;
      if (!customerStats[userId]) {
        customerStats[userId] = {
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          name: null,
          email: null,
          firstOrderDate: null
        };
      }
      
      customerStats[userId].orderCount += 1;
      customerStats[userId].totalSpent += parseFloat(order.total_amount || 0);
      
      const orderDate = new Date(order.created_at);
      if (!customerStats[userId].lastOrderDate || orderDate > customerStats[userId].lastOrderDate) {
        customerStats[userId].lastOrderDate = orderDate;
      }
      if (!customerStats[userId].firstOrderDate || orderDate < customerStats[userId].firstOrderDate) {
        customerStats[userId].firstOrderDate = orderDate;
      }
      
      // Check if customer is "new" (first order within last 30 days)
      if (customerStats[userId].firstOrderDate && customerStats[userId].firstOrderDate >= thirtyDaysAgo) {
        newCustomers.add(userId);
      }

      const resolvedName = resolveCustomerName(order);
      if (resolvedName) {
        customerStats[userId].name = resolvedName;
      }

      const resolvedEmail = resolveCustomerEmail(order);
      if (resolvedEmail) {
        customerStats[userId].email = resolvedEmail;
      }
    });

    // Total customers includes ALL customers who have placed orders (including current month)
    const totalCustomers = Object.keys(customerStats).length;
    const avgOrdersPerCustomer = totalCustomers > 0 
      ? Object.values(customerStats).reduce((sum, c) => sum + c.orderCount, 0) / totalCustomers 
      : 0;
    const avgSpentPerCustomer = totalCustomers > 0 
      ? Object.values(customerStats).reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers 
      : 0;

    // Get top 10 customers
    const topCustomers = Object.entries(customerStats)
      .map(([userId, stats]) => ({
        userId,
        customerName: stats.name || null,
        customerEmail: stats.email || null,
        orderCount: stats.orderCount,
        totalSpent: stats.totalSpent,
        lastOrderDate: stats.lastOrderDate
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        summary: {
          totalCustomers,
          newCustomers: newCustomers.size,
          avgOrdersPerCustomer: parseFloat(avgOrdersPerCustomer.toFixed(2)),
          avgSpentPerCustomer: Math.round(avgSpentPerCustomer)
        },
        topCustomers
      }
    });
  } catch (error) {
    return handleAnalyticsError(res, error, 'Failed to fetch customer analytics');
  }
});

async function computeSalesForecast({ requestedRange, branchContext }) {
  try {
    const allowedRanges = Object.keys(SALES_FORECAST_RANGE_LABELS);
    const range = allowedRanges.includes(requestedRange) ? requestedRange : 'restOfYear';
    const rangeLabel = SALES_FORECAST_RANGE_LABELS[range];

    const monthlyFilter = buildBranchFilterClause(branchContext, 2);

    const now = new Date();
    const startOfCurrentMonthUTC = startOfMonthUTC(new Date(now));
    const firstAllowedMonthUTC = new Date(Date.UTC(2022, 0, 1)); // January 1, 2022 - exclude December 2021 and earlier

    console.log('📈 Computing sales forecast for range:', range);
    console.log('📈 Branch context:', branchContext);
    console.log('📈 Filter clause:', monthlyFilter.clause, 'Params:', monthlyFilter.params.length);

    let rows;
    try {
      const result = await executeSql(
    `
      SELECT
        date_trunc('month', created_at) AS month_start,
        SUM(total_amount)::numeric AS revenue,
        COUNT(*)::int AS orders
      FROM orders
      WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
        AND created_at >= $1
        AND created_at < $2
      ${monthlyFilter.clause}
      GROUP BY month_start
      ORDER BY month_start;
    `,
      [firstAllowedMonthUTC.toISOString(), startOfCurrentMonthUTC.toISOString(), ...monthlyFilter.params]
      );
      rows = result.rows || [];
      console.log('📈 SQL query executed successfully, found', rows.length, 'rows');
    } catch (sqlError) {
      console.error('❌ SQL error in computeSalesForecast:', sqlError);
      console.error('❌ SQL error details:', {
        message: sqlError.message,
        code: sqlError.code,
        stack: sqlError.stack
      });
      throw sqlError;
    }

  const historicalRaw = rows
    .map((row) => {
      const rawDate = row.month_start instanceof Date ? row.month_start : new Date(row.month_start);
      if (Number.isNaN(rawDate.getTime())) {
        return null;
      }
      const monthDate = startOfMonthUTC(rawDate);
      return {
        monthDate,
        label: formatMonthLabel(monthDate),
        revenue: Number.parseFloat(row.revenue) || 0,
        orders: Number.parseInt(row.orders, 10) || 0
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());

  // Filter out December 2021 and any months before January 2022
  const firstAllowedMonth = new Date(Date.UTC(2022, 0, 1)); // January 1, 2022
  const fullHistorical = historicalRaw.filter((item) => {
    return item.monthDate >= firstAllowedMonth;
  });

  const monthKey = (date) => date.toISOString().slice(0, 7);

  const buildDisplayHistorical = () => {
    const firstDesiredMonth = new Date(Date.UTC(2022, 0, 1));

    if (!fullHistorical.length) {
      return [
        {
          monthDate: firstDesiredMonth,
          label: formatMonthLabel(firstDesiredMonth),
          revenue: 0,
          orders: 0
        }
      ];
    }

    const firstHistoricalMonth = fullHistorical[0].monthDate;
    const lastHistoricalMonth = fullHistorical[fullHistorical.length - 1].monthDate;

    const pointerStart =
      firstDesiredMonth < firstHistoricalMonth ? new Date(firstDesiredMonth) : new Date(firstHistoricalMonth);

    const dataMap = new Map(fullHistorical.map((item) => [monthKey(item.monthDate), item]));

    const display = [];
    let pointer = new Date(pointerStart);
    while (pointer <= lastHistoricalMonth) {
      const key = monthKey(pointer);
      const existing = dataMap.get(key);
      if (existing) {
        display.push(existing);
      } else {
        display.push({
          monthDate: new Date(pointer),
          label: formatMonthLabel(pointer),
          revenue: 0,
          orders: 0
        });
      }
      pointer = addMonthsUTC(pointer, 1);
    }

    return display;
  };

  const displayHistorical = buildDisplayHistorical();

  const historicalPoints = displayHistorical.map((item) => ({
    month: item.label,
    monthIso: item.monthDate.toISOString(),
    label: item.label,
    revenue: roundCurrency(item.revenue),
    orders: item.orders,
    type: 'historical'
  }));

  const revenueValues = displayHistorical.map((item) => item.revenue);
  const positiveRevenues = revenueValues.filter((value) => value > 0);
  const totalHistoricalRevenue = revenueValues.reduce((sum, value) => sum + value, 0);
  const totalHistoricalOrders = displayHistorical.reduce((sum, item) => sum + (item.orders || 0), 0);
  const averageRevenue =
    (positiveRevenues.length > 0
      ? positiveRevenues.reduce((sum, value) => sum + value, 0) / positiveRevenues.length
      : (revenueValues.length > 0 ? totalHistoricalRevenue / revenueValues.length : 0)) || 0;
  const averageOrderValue = totalHistoricalOrders > 0 ? totalHistoricalRevenue / totalHistoricalOrders : 0;

  const recentAverageRevenue = (() => {
    const slice = displayHistorical.slice(-12);
    if (!slice.length) {
      return averageRevenue;
    }
    const sum = slice.reduce((acc, item) => acc + item.revenue, 0);
    return sum / slice.length;
  })();

  const forecastMonths = generateForecastMonths(range, startOfCurrentMonthUTC);

  let forecastPoints = [];
  let baseConfidence = 0.65;
  let trainingMape = null;
  let modelType = 'seasonal_naive';
  let fallbackUsed = false;

  if (forecastMonths.length > 0) {
    const regressionResult = fitWeightedFourierRegression(displayHistorical, forecastMonths, {
      harmonics: 6,
      recencyDecay: 0.55,
      minWeight: 0.35
    });

    if (regressionResult && Array.isArray(regressionResult.forecastValues)) {
      baseConfidence = regressionResult.baseConfidence ?? baseConfidence;
      trainingMape = regressionResult.trainingMape ?? null;
      modelType = 'weighted_fourier_regression';
      const forecastValues = regressionResult.forecastValues;
      let previousRevenue = displayHistorical.length
        ? displayHistorical[displayHistorical.length - 1].revenue
        : forecastValues[0] || 0;

      forecastPoints = forecastMonths.map((monthDate, index) => {
        const revenueRaw = Math.max(0, forecastValues[index] ?? 0);
        const revenue = roundCurrency(revenueRaw);
        const projectedOrders = averageOrderValue > 0 ? Math.max(0, Math.round(revenueRaw / averageOrderValue)) : 0;
        const distanceFactor =
          forecastMonths.length > 1 ? index / Math.max(forecastMonths.length - 1, 1) : 0;
        const rawConfidence = baseConfidence - distanceFactor * 0.12;
        const pointConfidence = clamp(Math.round(rawConfidence * 100), 45, 95);
        const growthRate =
          previousRevenue > 0 ? roundCurrency(((revenueRaw - previousRevenue) / previousRevenue) * 100) : null;
        previousRevenue = revenueRaw;

        return {
          month: formatMonthLabel(monthDate),
          monthIso: monthDate.toISOString(),
          label: formatMonthLabel(monthDate),
          revenue,
          orders: projectedOrders,
          confidence: pointConfidence,
          type: 'forecast',
          growthRate,
          seasonalFactor: null
        };
      });
    }
  }

  if (!forecastPoints.length && forecastMonths.length > 0) {
    const fallbackValues =
      seasonalNaiveForecast(revenueValues, forecastMonths.length, 12) || new Array(forecastMonths.length).fill(averageRevenue);
    baseConfidence = 0.55;
    fallbackUsed = true;
    let previousRevenue = displayHistorical.length
      ? displayHistorical[displayHistorical.length - 1].revenue
      : fallbackValues[0] || averageRevenue;

    forecastPoints = forecastMonths.map((monthDate, index) => {
      const revenueRaw = Math.max(0, fallbackValues[index] ?? previousRevenue);
      const revenue = roundCurrency(revenueRaw);
      const projectedOrders = averageOrderValue > 0 ? Math.max(0, Math.round(revenueRaw / averageOrderValue)) : 0;
      const distanceFactor =
        forecastMonths.length > 1 ? index / Math.max(forecastMonths.length - 1, 1) : 0;
      const pointConfidence = clamp(Math.round((baseConfidence - distanceFactor * 0.1) * 100), 40, 85);
      const growthRate =
        previousRevenue > 0 ? roundCurrency(((revenueRaw - previousRevenue) / previousRevenue) * 100) : null;
      previousRevenue = revenueRaw;

      return {
        month: formatMonthLabel(monthDate),
        monthIso: monthDate.toISOString(),
        label: formatMonthLabel(monthDate),
        revenue,
        orders: projectedOrders,
        confidence: pointConfidence,
        type: 'forecast',
        growthRate,
        seasonalFactor: null
      };
    });
  }

  const combinedSeries = [
    ...historicalPoints.map((point) => ({
      month: point.label,
      label: point.label,
      revenue: point.revenue,
      type: 'historical'
    })),
    ...forecastPoints.map((point) => ({
      month: point.label,
      label: point.label,
      revenue: point.revenue,
      type: 'forecast'
    }))
  ];

  const projectedRevenueTotal = roundCurrency(forecastPoints.reduce((sum, point) => sum + point.revenue, 0));
  const projectedOrdersTotal = forecastPoints.reduce((sum, point) => sum + (point.orders || 0), 0);
  const baselineRevenue = roundCurrency((recentAverageRevenue || averageRevenue) * forecastPoints.length);
  const expectedGrowthRate =
    baselineRevenue > 0
      ? roundCurrency(((projectedRevenueTotal - baselineRevenue) / baselineRevenue) * 100)
      : null;
  const averageConfidence = forecastPoints.length
    ? Math.round(forecastPoints.reduce((sum, point) => sum + (point.confidence || 0), 0) / forecastPoints.length)
    : null;

  const summary = {
    range,
    rangeLabel,
    months: forecastPoints.length,
    projectedRevenue: projectedRevenueTotal,
    projectedOrders: projectedOrdersTotal,
    averageMonthlyRevenue: roundCurrency(recentAverageRevenue || averageRevenue),
    baselineRevenue,
    expectedGrowthRate,
    confidence: averageConfidence
  };

  const modelInfo = {
    type: modelType,
    harmonics: 6,
    recencyDecay: 0.55,
    minWeight: 0.35,
    trainingMape,
    fallbackUsed,
    description: modelType === 'weighted_fourier_regression'
      ? 'Recency-weighted Fourier regression on log revenue with seasonal harmonics.'
      : 'Seasonal naïve projection mirroring last year\'s revenue when the regression model is unavailable.'
  };

  const trainingWindow = {
    start: historicalPoints[0]?.monthIso ?? null,
    end: historicalPoints[historicalPoints.length - 1]?.monthIso ?? null
  };

    return {
      range,
      rangeLabel,
      generatedAt: new Date().toISOString(),
      historical: historicalPoints,
      forecast: forecastPoints,
      combined: combinedSeries,
      summary,
      model: modelInfo,
      trainingWindow
    };
  } catch (error) {
    console.error('❌ Error in computeSalesForecast:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      originalError: error.originalError ? {
        message: error.originalError.message,
        code: error.originalError.code
      } : null
    });
    
    // Wrap database connection errors with more helpful messages
    if (error.message?.includes('Missing DATABASE_URL')) {
      const helpfulError = new Error('Database connection not configured. Please check server/.env file for DATABASE_URL.');
      helpfulError.originalError = error;
      throw helpfulError;
    }
    
    throw error;
  }
}

router.get('/sales-forecast', async (req, res) => {
  try {
    console.log('📈 Fetching sales forecast...');
    console.log('📈 User info:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      branch_id: req.user?.branch_id
    });
    
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL is not configured!');
      return res.status(500).json({
        success: false,
        error: 'Database connection not configured. Please check server/.env file for DATABASE_URL.'
      });
    }
    
    console.log('📈 DATABASE_URL configured:', process.env.DATABASE_URL ? 'Yes (length: ' + process.env.DATABASE_URL.length + ')' : 'No');
    
    let branchContext;
    try {
      branchContext = await resolveBranchContext(req.user);
      console.log('📈 Branch context resolved:', branchContext);
    } catch (branchError) {
      console.error('❌ Error resolving branch context for sales forecast:', branchError);
      return handleAnalyticsError(res, branchError, 'Failed to resolve branch context');
    }

    const data = await computeSalesForecast({
      requestedRange: typeof req.query.range === 'string' ? req.query.range : '',
      branchContext
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Sales forecast error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      originalError: error.originalError ? {
        message: error.originalError.message,
        code: error.originalError.code
      } : null
    });
    
    // Provide more specific error message
    let errorMessage = 'Failed to fetch sales forecast.';
    if (error.message?.includes('Missing DATABASE_URL') || error.message?.includes('Database connection not configured')) {
      errorMessage = 'Database connection not configured. Please check server/.env file for DATABASE_URL.';
    } else if (error.message?.includes('password authentication failed')) {
      errorMessage = 'Database password authentication failed. Please check your DATABASE_URL password in server/.env';
    } else if (error.message?.includes('Tenant or user not found')) {
      errorMessage = 'Database connection failed. Please check your DATABASE_URL connection string in server/.env';
    } else if (error.message) {
      errorMessage = `Sales forecast error: ${error.message}`;
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Get geographic distribution
router.get('/geographic-distribution', async (req, res) => {
  try {
    console.log('🌍 Fetching geographic distribution data...');
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'cancelled');

    if (error) throw error;

    const branchContext = await resolveBranchContext(req.user);
    const scopedOrders = filterOrdersByBranch(orders, branchContext);
 
    // Process geographic data from delivery addresses
    const locationData = {};
    
    scopedOrders.forEach(order => {
      // Get city from delivery_address
      let city = 'Unknown Location';
      if (order.delivery_address && typeof order.delivery_address === 'object') {
        city = order.delivery_address.city || order.delivery_address.City || 'Unknown Location';
      } else if (typeof order.delivery_address === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsedAddress = JSON.parse(order.delivery_address);
          city = parsedAddress.city || parsedAddress.City || 'Unknown Location';
        } catch (e) {
          // If parsing fails, try to extract city from address string
          const cityMatch = order.delivery_address.match(/City:\s*([^,\n]+)/i);
          if (cityMatch) {
            city = cityMatch[1].trim();
          }
        }
      }
      
      // Initialize location data if not exists
      if (!locationData[city]) {
        locationData[city] = {
          orders: 0,
          revenue: 0,
          customers: new Set(),
          products: {}
        };
      }
      
      // Increment statistics
      locationData[city].orders += 1;
      locationData[city].revenue += parseFloat(order.total_amount || 0);
      locationData[city].customers.add(order.user_id);
      
      // Track products
      if (order.order_items && Array.isArray(order.order_items)) {
        order.order_items.forEach(item => {
          const productName = item.name || 'Unknown';
          locationData[city].products[productName] = 
            (locationData[city].products[productName] || 0) + parseInt(item.quantity || 0);
        });
      }
    });

    // Calculate total orders for percentage calculation
    const totalOrders = scopedOrders.length;
    
    // Convert to array and add additional metrics
    const geoDistribution = Object.entries(locationData)
      .map(([city, data]) => {
        // Get top 3 products for this location
        const topProducts = Object.entries(data.products)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name);
        
        return {
          location: city,
          orders: data.orders,
          revenue: Math.round(data.revenue),
          customers: data.customers.size,
          percentage: totalOrders > 0 ? parseFloat(((data.orders / totalOrders) * 100).toFixed(1)) : 0,
          avgOrderValue: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0,
          topProducts
        };
      })
      .sort((a, b) => b.orders - a.orders);

    console.log(`🌍 Found ${geoDistribution.length} unique locations`);

    res.json({
      success: true,
      data: geoDistribution
    });
  } catch (error) {
    return handleAnalyticsError(res, error, 'Failed to fetch geographic distribution');
  }
});

// Helper functions
function getBranchColor(index) {
  const colors = [
    '#1e3a8a', '#0d9488', '#166534', '#0284c7', '#0f766e',
    '#0369a1', '#7c3aed', '#64748b', '#15803d'
  ];
  return colors[index % colors.length];
}


// Get customer locations for heatmap
router.get('/customer-locations', async (req, res) => {
  try {
    console.log('📍 Fetching customer locations for heatmap...');
    
    const {
      barangayByCode,
      barangayByNameKey,
      cityBarangays,
      totalBarangays
    } = ensureBarangayGeo();
    const barangayCoverageSet = new Set();
    const fallbackBarangayIndex = new Map();

    // Get all user addresses (unique customers) - include barangay for coordinate lookup
    const { data: addresses, error: addressesError } = await supabase
      .from('user_addresses')
      .select('city, province, user_id, barangay, barangay_code, full_name, street_address')
      .not('city', 'is', null);

    if (addressesError) {
      console.error('❌ Error fetching addresses:', addressesError);
    }

    // Get user email for mjmonday01@gmail.com to find their user_id
    let targetUserId = null;
    try {
      // Try admin API first
      const { data: targetUser } = await supabase.auth.admin.getUserByEmail('mjmonday01@gmail.com');
      if (targetUser && targetUser.user) {
        targetUserId = targetUser.user.id;
        console.log(`🔍 Found target user ID for mjmonday01@gmail.com: ${targetUserId}`);
      }
    } catch (err) {
      // Fallback: query auth.users directly via RPC or direct query
      try {
        const { data: users, error: userError } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', 'mjmonday01@gmail.com')
          .limit(1);
        
        if (!userError && users && users.length > 0) {
          targetUserId = users[0].id;
          console.log(`🔍 Found target user ID for mjmonday01@gmail.com (via direct query): ${targetUserId}`);
        } else {
          console.log('⚠️ Could not find user by email - will check addresses by matching email pattern');
        }
      } catch (fallbackErr) {
        console.log('⚠️ Could not find user by email (may need admin access):', err.message);
        // Last resort: check if any address has a matching pattern
        console.log('⚠️ Will check all addresses and look for mjmonday01 pattern');
      }
    }

    // Debug: Log all user addresses
    console.log(`\n📋 DEBUG: Total user_addresses found: ${addresses?.length || 0}`);
    if (addresses && addresses.length > 0) {
      addresses.forEach((addr, idx) => {
        const isTarget = targetUserId && addr.user_id === targetUserId;
        const marker = isTarget ? '🎯' : '  ';
        console.log(`${marker} Address ${idx + 1}:`, {
          user_id: addr.user_id,
          is_target_user: isTarget,
          full_name: addr.full_name,
          street_address: addr.street_address,
          barangay: addr.barangay,
          barangay_code: addr.barangay_code,
          city: addr.city,
          province: addr.province
        });
      });
    }

    // Also get delivery addresses from orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('user_id, delivery_address, pickup_location, shipping_method')
      .not('delivery_address', 'is', null);
 
    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
    }

    const branchContext = await resolveBranchContext(req.user);
    const scopedOrders = filterOrdersByBranch(orders, branchContext);
    const allowedUserIds = branchContext
      ? new Set(scopedOrders.map(order => order.user_id).filter(Boolean))
      : null;
 
    // Aggregate customers by city using SQL
    // Get city stats from SQL query that fetches cities from customer addresses
    let cityStatsFromSQL = [];
    try {
      // Build branch filter if needed
      let branchFilter = '';
      let userAddressFilter = '';
      const queryParams = [];
      
      if (branchContext && branchContext.branchName) {
        branchFilter = `AND o.pickup_location = $1`;
        // For user_addresses, only include users who have orders from this branch
        userAddressFilter = `
          AND ua.user_id IN (
            SELECT DISTINCT user_id 
            FROM orders 
            WHERE pickup_location = $1 
              AND LOWER(status) NOT IN ('cancelled', 'canceled')
          )
        `;
        queryParams.push(branchContext.branchName);
      }
      
      const cityStatsQuery = `
        WITH customer_cities AS (
          -- Get cities from user_addresses (primary source)
          SELECT DISTINCT
            ua.user_id,
            TRIM(ua.city) as city,
            TRIM(ua.province) as province
          FROM user_addresses ua
          WHERE ua.city IS NOT NULL 
            AND TRIM(ua.city) != ''
            AND ua.province IS NOT NULL
            AND TRIM(ua.province) != ''
            AND ua.province IN ('Batangas', 'Oriental Mindoro')
            ${userAddressFilter}
        )
        SELECT 
          city,
          province,
          COUNT(DISTINCT user_id)::int as customer_count
        FROM customer_cities
        WHERE city != ''
          AND province != ''
        GROUP BY city, province
        ORDER BY customer_count DESC
      `;
      
      const result = await executeSql(cityStatsQuery, queryParams);
      cityStatsFromSQL = result.rows || [];
      
      console.log(`✅ Fetched ${cityStatsFromSQL.length} cities from SQL`);
      
      // Debug: Log top cities to verify counts
      const topCities = cityStatsFromSQL.slice(0, 10);
      console.log('🔍 Top cities from SQL (before normalization):');
      topCities.forEach((stat, idx) => {
        console.log(`  ${idx + 1}. ${stat.city}, ${stat.province}: ${stat.customer_count} customers`);
      });
    } catch (sqlError) {
      console.warn('⚠️ SQL query failed, falling back to JavaScript aggregation:', sqlError.message);
      cityStatsFromSQL = [];
    }
    
    // Convert SQL results to cityCounts format
    // IMPORTANT: Group by raw city name from SQL to prevent incorrect aggregation
    // Only normalize for display purposes, not for grouping
    const cityCounts = {};
    const rawCityToNormalized = new Map(); // Map raw city names to normalized for display
    
    cityStatsFromSQL.forEach(stat => {
      // Use RAW city and province as the primary key to prevent incorrect grouping
      // This ensures each unique raw city name is counted separately
      const rawCityKey = `${stat.city}|${stat.province}`;
      
      // Normalize for display and validation only
      const location = canonicalizeCityProvince(stat.city, stat.province);
      if (location.blocked || !ALLOWED_PROVINCES.has(location.normalizedProvince)) {
        return; // Skip blocked cities or provinces
      }
      
      // Store the normalized name for this raw city
      rawCityToNormalized.set(rawCityKey, {
        city: location.city,
        province: location.province,
        normalizedCity: location.normalizedCity,
        normalizedProvince: location.normalizedProvince
      });
      
      // Use RAW city key for grouping to prevent incorrect aggregation
      // This ensures "Calaca" and "Calaca City" are counted separately
      if (!cityCounts[rawCityKey]) {
        cityCounts[rawCityKey] = {
          count: 0,
          city: location.city, // Use normalized city name for display
          province: location.province,
          normalizedCity: location.normalizedCity,
          normalizedProvince: location.normalizedProvince,
          locationKey: `${location.normalizedProvince}|${location.normalizedCity}`,
          rawCity: stat.city // Keep original for debugging
        };
      }
      
      // Ensure count is a number, not a string
      const count = typeof stat.customer_count === 'number' 
        ? stat.customer_count 
        : parseInt(stat.customer_count, 10) || 0;
      cityCounts[rawCityKey].count += count;
    });
    
    // Now group by normalized city name for final display
    // This combines cities with the same normalized name (e.g., "Calaca" and "Calaca City")
    const finalCityCounts = {};
    Object.keys(cityCounts).forEach(rawKey => {
      const cityData = cityCounts[rawKey];
      const displayKey = `${cityData.city}, ${cityData.province}`;
      
      if (!finalCityCounts[displayKey]) {
        finalCityCounts[displayKey] = {
          count: 0,
          city: cityData.city,
          province: cityData.province,
          normalizedCity: cityData.normalizedCity,
          normalizedProvince: cityData.normalizedProvince,
          locationKey: cityData.locationKey
        };
      }
      
      // Add the count from this raw city
      finalCityCounts[displayKey].count += cityData.count;
    });
    
    // Replace cityCounts with the final grouped version
    Object.keys(cityCounts).forEach(key => delete cityCounts[key]);
    Object.assign(cityCounts, finalCityCounts);
    
    // Debug: Log final city counts after normalization
    const finalTopCities = Object.keys(cityCounts)
      .map(key => ({ key, ...cityCounts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    console.log('🔍 Top cities after normalization:');
    finalTopCities.forEach((stat, idx) => {
      console.log(`  ${idx + 1}. ${stat.city}, ${stat.province}: ${stat.count} customers`);
    });
    
    const preciseHeatmapPoints = [];
    const cityRejected = new Map();
    console.log(`🧮 Raw records — addresses: ${addresses?.length || 0}, orders: ${orders?.length || 0}, scoped orders: ${scopedOrders.length}`);
    
    // Count from user_addresses and try to get precise coordinates (for heatmap points only)
    if (addresses && addresses.length > 0) {
      addresses.forEach(addr => {
        const isTarget = targetUserId && addr.user_id === targetUserId;
        const marker = isTarget ? '🎯' : '';
        
        if (isTarget) {
          console.log(`\n${marker} PROCESSING TARGET USER (mjmonday01@gmail.com):`);
          console.log(`  User ID: ${addr.user_id}`);
          console.log(`  Address: ${addr.street_address}, ${addr.barangay}, ${addr.city}, ${addr.province}`);
          console.log(`  Barangay Code: ${addr.barangay_code || 'MISSING'}`);
        }
        
        if (allowedUserIds && !allowedUserIds.has(addr.user_id)) {
          if (isTarget) {
            console.log(`  ❌ REJECTED: User not in allowed user IDs (branch filtering)`);
          }
          return;
        }
        
        const location = canonicalizeCityProvince(addr.city, addr.province);
        if (location.blocked) {
          if (isTarget) {
            console.log(`  ❌ REJECTED: City is blocked: ${location.normalizedCity}`);
          }
          cityRejected.set(location.normalizedCity, (cityRejected.get(location.normalizedCity) || 0) + 1);
          return;
        }

        if (!ALLOWED_PROVINCES.has(location.normalizedProvince)) {
          if (isTarget) {
            console.log(`  ❌ REJECTED: Province not allowed: ${location.normalizedProvince}`);
          }
          cityRejected.set(location.normalizedCity, (cityRejected.get(location.normalizedCity) || 0) + 1);
          return;
        }

        const cityKey = `${location.city}, ${location.province}`;
        // Initialize cityCounts entry if it doesn't exist (for heatmap coordinate lookup)
        // But don't increment count here - we're using SQL for city stats
        if (!cityCounts[cityKey]) {
          cityCounts[cityKey] = {
            count: 0, // Will be set from SQL results
            city: location.city,
            province: location.province,
            normalizedCity: location.normalizedCity,
            normalizedProvince: location.normalizedProvince,
            locationKey: `${location.normalizedProvince}|${location.normalizedCity}`
          };
        }
        // Don't increment count - SQL already provides accurate counts

        if (isTarget) {
          console.log(`  ✅ Passed filters - counting in city: ${cityKey}`);
        }

        // Try to get precise coordinates from barangay if available
        if (addr.barangay) {
          const hasBarangayCode = !!(addr.barangay_code || addr.barangayCode || addr.barangay_psgc);
          
          if (isTarget || hasBarangayCode) {
            console.log(`  🔍 Looking up coordinates for barangay: "${addr.barangay}"`);
            console.log(`  🔍 Using barangay_code: ${addr.barangay_code || addr.barangayCode || addr.barangay_psgc || 'NONE'}`);
            console.log(`  🔍 Normalized city: ${location.normalizedCity}, province: ${location.normalizedProvince}`);
            
            // Debug code lookup
            if (hasBarangayCode) {
              const code = addr.barangay_code || addr.barangayCode || addr.barangay_psgc;
              const codeExists = barangayByCode.has(code);
              console.log(`  🔍 Code lookup: "${code}" exists in map: ${codeExists}`);
              if (codeExists) {
                const entry = barangayByCode.get(code);
                console.log(`  🔍 Code entry:`, {
                  hasLatitude: Number.isFinite(entry?.latitude),
                  hasLongitude: Number.isFinite(entry?.longitude),
                  latitude: entry?.latitude,
                  longitude: entry?.longitude
                });
              } else {
                // Check if code exists with different format
                console.log(`  🔍 Checking code variations...`);
                const codeVariations = [
                  code,
                  code.toString().padStart(9, '0'),
                  code.toString().trim(),
                  code.toString().replace(/^0+/, ''),
                  String(code).padStart(9, '0'),
                  String(code).trim()
                ];
                let foundVariant = false;
                for (const variant of codeVariations) {
                  if (barangayByCode.has(variant)) {
                    console.log(`  ✅ Found code variant: "${variant}"`);
                    foundVariant = true;
                  }
                }
                
                if (!foundVariant) {
                  // Show sample of codes that DO exist in the map (for debugging)
                  const sampleCodes = Array.from(barangayByCode.keys()).slice(0, 10);
                  console.log(`  ⚠️ Code "${code}" not found. Sample codes in map:`, sampleCodes);
                  console.log(`  ⚠️ Total codes in map: ${barangayByCode.size}`);
                }
              }
            }
          }
          
          const barangayCoordinate = getBarangayCoordinate({
            barangayCode: addr.barangay_code || addr.barangayCode || addr.barangay_psgc,
            barangayName: addr.barangay,
            normalizedCity: location.normalizedCity,
            normalizedProvince: location.normalizedProvince,
            barangayByCode,
            barangayByNameKey,
            debug: isTarget || hasBarangayCode // Enable debug for target user or addresses with codes
          });

          if (barangayCoordinate && Number.isFinite(barangayCoordinate.latitude) && Number.isFinite(barangayCoordinate.longitude)) {
            const lat = barangayCoordinate.latitude;
            const lng = barangayCoordinate.longitude;
            
            if (isTarget) {
              console.log(`  ✅ Found coordinates: [${lat}, ${lng}]`);
            }
            
            // Check if within service area
            if (isWithinServiceArea(lat, lng)) {
              const latOffset = (Math.random() - 0.5) * 0.004;
              const lngOffset = (Math.random() - 0.5) * 0.004;
              const customerName = addr.full_name || 'Customer';
              preciseHeatmapPoints.push({
                lat: lat + latOffset,
                lng: lng + lngOffset,
                intensity: 1,
                customerName: customerName
              });
              
              if (isTarget) {
                console.log(`  ✅✅✅ PLOTTED ON MAP at [${lat + latOffset}, ${lng + lngOffset}]`);
              } else {
                console.log(`✅ Found coordinates for ${addr.barangay}, ${location.city}: [${lat}, ${lng}]`);
              }
            } else {
              if (isTarget) {
                console.log(`  ❌ REJECTED: Coordinates outside service area: [${lat}, ${lng}]`);
              } else {
                console.log(`⚠️ Coordinates for ${addr.barangay}, ${location.city} are outside service area: [${lat}, ${lng}]`);
              }
            }
          } else {
            if (isTarget) {
              console.log(`  ❌ REJECTED: No coordinates found for barangay`);
              console.log(`  🔍 Searched with:`);
              console.log(`    - barangay_code: ${addr.barangay_code || 'NONE'}`);
              console.log(`    - barangay_name: "${addr.barangay}"`);
              console.log(`    - city: "${location.normalizedCity}"`);
              console.log(`    - province: "${location.normalizedProvince}"`);
            } else {
              console.log(`⚠️ No coordinates found for barangay: ${addr.barangay}, city: ${location.city}, province: ${location.province}`);
            }
          }
        } else {
          if (isTarget) {
            console.log(`  ⚠️ No barangay specified in address`);
          }
        }
        
        if (isTarget) {
          console.log(`\n`);
        }
      });
    }
 
    // Count from order delivery addresses
    if (scopedOrders && scopedOrders.length > 0) {
      scopedOrders.forEach(order => {
        if (order.delivery_address && typeof order.delivery_address === 'object') {
          const address = order.delivery_address;
          const cityValue = address.city || address.City;
          const provinceValue = address.province || address.Province;
          const location = canonicalizeCityProvince(cityValue, provinceValue);

          if (location.blocked) {
            cityRejected.set(location.normalizedCity, (cityRejected.get(location.normalizedCity) || 0) + 1);
            return;
          }

          if (!ALLOWED_PROVINCES.has(location.normalizedProvince)) {
            cityRejected.set(location.normalizedCity, (cityRejected.get(location.normalizedCity) || 0) + 1);
            return;
          }

          const cityKey = `${location.city}, ${location.province}`;
          // Initialize cityCounts entry if it doesn't exist (for heatmap coordinate lookup)
          // But don't increment count here - we're using SQL for city stats
          if (!cityCounts[cityKey]) {
            cityCounts[cityKey] = {
              count: 0, // Will be set from SQL results
              city: location.city,
              province: location.province,
              normalizedCity: location.normalizedCity,
              normalizedProvince: location.normalizedProvince,
              locationKey: `${location.normalizedProvince}|${location.normalizedCity}`
            };
          }
          // Don't increment count - SQL already provides accurate counts

          const latitudeCandidates = [
            address.latitude,
            address.lat,
            address.latitudeDegrees,
            address?.coordinates?.latitude,
            address?.coordinates?.lat
          ];
          const longitudeCandidates = [
            address.longitude,
            address.lng,
            address.longitudeDegrees,
            address?.coordinates?.longitude,
            address?.coordinates?.lng
          ];

          let latitude = latitudeCandidates
            .map(value => (typeof value === 'string' ? parseFloat(value) : value))
            .find(value => Number.isFinite(value));
          let longitude = longitudeCandidates
            .map(value => (typeof value === 'string' ? parseFloat(value) : value))
            .find(value => Number.isFinite(value));

          const barangayCoordinate = getBarangayCoordinate({
            barangayCode: address.barangay_code || address.barangayCode || address.barangay_psgc,
            barangayName: address.barangay || address.barangay_name || address.barangayName,
            normalizedCity: location.normalizedCity,
            normalizedProvince: location.normalizedProvince,
            barangayByCode,
            barangayByNameKey
          });

          if ((!Number.isFinite(latitude) || !Number.isFinite(longitude)) && barangayCoordinate) {
            latitude = barangayCoordinate.latitude;
            longitude = barangayCoordinate.longitude;
          }

          if (barangayCoordinate) {
            const barangayKey = `${location.normalizedProvince}|${location.normalizedCity}|${barangayCoordinate.normalizedBarangay}`;
            barangayCoverageSet.add(barangayKey);
          } else if (address.barangay || address.barangay_name) {
            const barangayKey = `${location.normalizedProvince}|${location.normalizedCity}|${normalizeBarangayName(address.barangay || address.barangay_name)}`;
            barangayCoverageSet.add(barangayKey);
          }

          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            if (!isWithinServiceArea(latitude, longitude) && barangayCoordinate) {
              latitude = barangayCoordinate.latitude;
              longitude = barangayCoordinate.longitude;
            }

            if (isWithinServiceArea(latitude, longitude)) {
              const latOffset = (Math.random() - 0.5) * 0.004;
              const lngOffset = (Math.random() - 0.5) * 0.004;
              const customerName = address.full_name || address.receiver || address.receiver_name || address.name || 'Customer';
              preciseHeatmapPoints.push({
                lat: latitude + latOffset,
                lng: longitude + lngOffset,
                intensity: 1,
                customerName: customerName
              });
            }
          }
        }
      });
    }

    // City coordinates mapping (approximate for Batangas and Oriental Mindoro area)
    const cityCoordinates = {
      'Batangas City': [13.7563, 121.0583],
      'Bauan': [13.7918, 121.0073],
      'Calaca': [13.9289, 120.8113],
      'Calapan': [13.4124, 121.1766],
      'Lemery': [13.8832, 120.9139],
      'San Luis': [13.8559, 120.9405],
      'San Pascual': [13.8037, 121.0132],
      'Rosario': [13.8460, 121.2070],
      'Pinamalayan': [13.0350, 121.4847],
      'Lipa': [13.9411, 121.1631],
      'Tanauan': [14.0886, 121.1494],
      'Santo Tomas': [14.1069, 121.1392],
      'Alitagtag': [13.8789, 121.0033],
      'Taal': [13.8797, 120.9231],
      'Balayan': [13.9367, 120.7325],
      'Nasugbu': [14.0678, 120.6319],
      'Taysan': [13.8422, 121.0561],
      'Lobo': [13.6547, 121.2528],
      'Mabini': [13.7150, 120.9369],
      'Tingloy': [13.7033, 120.8797]
    };

    // Only use real customer data - no demo/mock data
    const hasRealData = Object.keys(cityCounts).length > 0;
    
    if (!hasRealData) {
      console.log('ℹ️ No customer location data found in database');
    } else {
      console.log(`✅ Found real customer data for ${Object.keys(cityCounts).length} cities`);
    }

    // Convert to heatmap data points
    let heatmapData = [];
    const fallbackCityPoints = [];

    if (preciseHeatmapPoints.length > 0) {
      console.log(`📌 Using ${preciseHeatmapPoints.length} precise delivery coordinates for heatmap`);
      heatmapData = preciseHeatmapPoints;
    } else {
      console.log('🧭 Falling back to city-level heatmap points (no precise coordinates found)');
    }

    Object.keys(cityCounts).forEach(cityKey => {
      const cityInfo = cityCounts[cityKey];
      const cityName = cityInfo.city;
      const coords = cityCoordinates[cityName] || cityCoordinates[cityName?.split(' ')[0]];
      const cityLocationKey = cityInfo.locationKey;
      const barangays = cityBarangays.get(cityLocationKey) || [];
      const sanitizedBarangays = barangays.filter(entry => Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude));

      if (sanitizedBarangays.length > 0) {
        let startIndex = fallbackBarangayIndex.get(cityLocationKey) || 0;
        for (let i = 0; i < cityInfo.count; i += 1) {
          const barangayEntry = sanitizedBarangays[(startIndex + i) % sanitizedBarangays.length];
          if (!barangayEntry) {
            continue;
          }
          const latOffset = (Math.random() - 0.5) * 0.0035;
          const lngOffset = (Math.random() - 0.5) * 0.0035;
          const candidateLat = barangayEntry.latitude + latOffset;
          const candidateLng = barangayEntry.longitude + lngOffset;
          if (isWithinServiceArea(candidateLat, candidateLng)) {
            fallbackCityPoints.push({
              lat: candidateLat,
              lng: candidateLng,
              intensity: 1,
              customerName: `Customer ${i + 1}`
            });
            const barangayKey = `${cityInfo.normalizedProvince}|${cityInfo.normalizedCity}|${barangayEntry.normalizedBarangay}`;
            barangayCoverageSet.add(barangayKey);
          }
        }
        fallbackBarangayIndex.set(cityLocationKey, startIndex + cityInfo.count);
      } else if (coords) {
        const baseRadiusJitter = preciseHeatmapPoints.length > 0 ? 0.006 : 0.02;
        for (let i = 0; i < cityInfo.count; i++) {
          const latOffset = (Math.random() - 0.5) * baseRadiusJitter;
          const lngOffset = (Math.random() - 0.5) * baseRadiusJitter;
          fallbackCityPoints.push({
            lat: coords[0] + latOffset,
            lng: coords[1] + lngOffset,
            intensity: 1,
            customerName: `Customer ${i + 1}`
          });
        }
      } else {
        console.log(`⚠️ No coordinates found for city: ${cityName}`);
      }
    });

    let usedFallback = false;
    const MIN_HEATMAP_POINTS = 15;

    if (heatmapData.length >= MIN_HEATMAP_POINTS) {
      console.log(`🔥 Heatmap using ${heatmapData.length} precise points (threshold ${MIN_HEATMAP_POINTS})`);
    } else {
      usedFallback = true;
      const combined = [...heatmapData, ...fallbackCityPoints];
      console.log(`🌡️ Augmenting heatmap data: precise=${heatmapData.length}, fallback=${fallbackCityPoints.length}, combined=${combined.length}`);
      heatmapData = combined;
    }

    console.log(`✅ Generated ${heatmapData.length} heatmap points from ${Object.keys(cityCounts).length} cities`);
    
    // Convert to array format for heatmap, but keep object format for markers
    const heatmapDataArray = heatmapData.map(point => 
      typeof point === 'object' ? [point.lat, point.lng, point.intensity || 1] : point
    );
    
    res.json({
      success: true,
      data: heatmapDataArray, // Array format for heatmap library
      markers: heatmapData, // Object format with customer names for markers
      cityStats: Object.keys(cityCounts).map(key => ({
        city: cityCounts[key].city,
        province: cityCounts[key].province,
        count: cityCounts[key].count
      })).sort((a, b) => b.count - a.count), // Sort by count descending
      meta: {
        precisePoints: preciseHeatmapPoints.length,
        fallbackPoints: fallbackCityPoints.length,
        combinedPoints: heatmapData.length,
        usedFallback,
        scopedOrdersCount: scopedOrders.length,
        totalOrdersCount: orders?.length || 0,
        addressCount: addresses?.length || 0,
        uniqueCities: Object.keys(cityCounts).length,
        rejectedOutsideServiceArea: Array.from(cityRejected.entries()).map(([city, count]) => ({
          city,
          count
        })),
        barangaysCovered: barangayCoverageSet.size,
        totalBarangays,
        barangayCoverageRatio: totalBarangays > 0 ? parseFloat(((barangayCoverageSet.size / totalBarangays) * 100).toFixed(1)) : null
      }
    });
  } catch (error) {
    if (error.statusCode === 403) {
      return handleAnalyticsError(res, error, 'Failed to fetch customer locations');
    }

    console.error('❌ Error fetching customer locations:', error);
    
    // Return empty data on error - no demo/mock data
    res.json({
      success: false,
      error: 'Failed to fetch customer locations',
      data: [],
      cityStats: []
    });
  }
});


module.exports = router;
module.exports.computeSalesForecast = computeSalesForecast;
module.exports.resolveBranchContext = resolveBranchContext;
module.exports.SALES_FORECAST_RANGE_LABELS = SALES_FORECAST_RANGE_LABELS;
