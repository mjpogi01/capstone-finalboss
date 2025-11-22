// Location data utility for loading and accessing Philippine location data
import locationData from '../data/location-data.json';

/**
 * Get all provinces
 * @returns {Array} Array of province objects with name and code
 */
export const getProvinces = () => {
  if (!locationData || !locationData.provinces) {
    return [];
  }
  return locationData.provinces.map(province => ({
    code: province.code,
    name: province.name,
    regionCode: province.regionCode,
    regionName: province.regionName
  }));
};

/**
 * Get cities and municipalities for a specific province
 * @param {string} provinceName - Name of the province
 * @returns {Array} Array of city/municipality objects
 */
export const getCitiesByProvince = (provinceName) => {
  if (!provinceName || !locationData || !locationData.provinces) {
    return [];
  }
  
  const province = locationData.provinces.find(
    p => p.name.toLowerCase() === provinceName.toLowerCase()
  );
  
  if (!province || !province.citiesAndMunicipalities) {
    return [];
  }
  
  return province.citiesAndMunicipalities.map(city => ({
    code: city.code,
    name: city.name,
    isCity: city.isCity
  }));
};

/**
 * Get barangays for a specific city/municipality in a province
 * @param {string} provinceName - Name of the province
 * @param {string} cityName - Name of the city/municipality
 * @returns {Array} Array of barangay objects
 */
export const getBarangaysByCity = (provinceName, cityName) => {
  if (!provinceName || !cityName || !locationData || !locationData.provinces) {
    return [];
  }
  
  const province = locationData.provinces.find(
    p => p.name.toLowerCase() === provinceName.toLowerCase()
  );
  
  if (!province || !province.citiesAndMunicipalities) {
    return [];
  }
  
  const city = province.citiesAndMunicipalities.find(
    c => c.name.toLowerCase() === cityName.toLowerCase()
  );
  
  if (!city || !city.barangays) {
    return [];
  }
  
  return city.barangays.map(barangay => ({
    code: barangay.code,
    name: barangay.name
  }));
};

/**
 * Check if a province exists
 * @param {string} provinceName - Name of the province
 * @returns {boolean}
 */
export const provinceExists = (provinceName) => {
  if (!provinceName || !locationData || !locationData.provinces) {
    return false;
  }
  return locationData.provinces.some(
    p => p.name.toLowerCase() === provinceName.toLowerCase()
  );
};

/**
 * Check if a city exists in a province
 * @param {string} provinceName - Name of the province
 * @param {string} cityName - Name of the city/municipality
 * @returns {boolean}
 */
export const cityExists = (provinceName, cityName) => {
  if (!provinceName || !cityName || !locationData || !locationData.provinces) {
    return false;
  }
  
  const province = locationData.provinces.find(
    p => p.name.toLowerCase() === provinceName.toLowerCase()
  );
  
  if (!province || !province.citiesAndMunicipalities) {
    return false;
  }
  
  return province.citiesAndMunicipalities.some(
    c => c.name.toLowerCase() === cityName.toLowerCase()
  );
};

/**
 * Check if a barangay exists in a city
 * @param {string} provinceName - Name of the province
 * @param {string} cityName - Name of the city/municipality
 * @param {string} barangayName - Name of the barangay
 * @returns {boolean}
 */
export const barangayExists = (provinceName, cityName, barangayName) => {
  if (!provinceName || !cityName || !barangayName || !locationData || !locationData.provinces) {
    return false;
  }
  
  const province = locationData.provinces.find(
    p => p.name.toLowerCase() === provinceName.toLowerCase()
  );
  
  if (!province || !province.citiesAndMunicipalities) {
    return false;
  }
  
  const city = province.citiesAndMunicipalities.find(
    c => c.name.toLowerCase() === cityName.toLowerCase()
  );
  
  if (!city || !city.barangays) {
    return false;
  }
  
  return city.barangays.some(
    b => b.name.toLowerCase() === barangayName.toLowerCase()
  );
};
