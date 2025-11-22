# Customer Location Saving and Plotting Flow

## Overview
This document explains exactly how customer locations are saved to the database and then plotted on the map visualization.

---

## Part 1: Saving Customer Locations

### 1.1 When Customer Adds an Address

**Location:** `src/services/userService.js` → `saveUserAddress()`

**Flow:**
1. Customer fills out address form in checkout or profile
2. Address data is saved to `user_addresses` table in Supabase:

```javascript
{
  user_id: user.id,
  full_name: addressData.fullName,
  phone: addressData.phone,
  street_address: addressData.streetAddress,
  barangay: addressData.barangay,        // Barangay name
  city: addressData.city,                // City name
  province: addressData.province,        // Province name
  postal_code: addressData.postalCode,
  address: fullAddressString,
  is_default: true
}
```

**Database Table:** `user_addresses`
- Stores: `city`, `province`, `barangay`, `user_id`
- **Note:** Does NOT store coordinates directly - only text fields

---

### 1.2 When Customer Places an Order

**Location:** `src/components/customer/CheckoutModal.js` → `handleConfirmOrder()`

**Flow:**
1. Customer selects delivery address or enters new one
2. Order is created with `delivery_address` as JSON object:

```javascript
{
  deliveryAddress: {
    address: "123 Street, Barangay, City, Province",
    receiver: "John Doe",
    phone: "09123456789",
    province: "Batangas",
    city: "Batangas City",
    barangay: "Poblacion",
    postalCode: "4200",
    streetAddress: "123 Main Street",
    // Optional: Precise coordinates if available
    latitude: 13.7563,
    longitude: 121.0583,
    barangay_code: "041005001"  // PSGC code
  }
}
```

**Database Table:** `orders`
- Column: `delivery_address` (JSONB type)
- Stores complete address object including optional coordinates

---

## Part 2: Plotting Customer Locations

### 2.1 Backend API Endpoint

**Location:** `server/routes/analytics.js` → `GET /api/analytics/customer-locations`

**Step 1: Fetch Data Sources**

```javascript
// 1. Get all user addresses
const { data: addresses } = await supabase
  .from('user_addresses')
  .select('city, province, user_id')
  .not('city', 'is', null);

// 2. Get all orders with delivery addresses
const { data: orders } = await supabase
  .from('orders')
  .select('user_id, delivery_address, pickup_location, shipping_method')
  .not('delivery_address', 'is', null);
```

**Step 2: Process User Addresses**

For each address in `user_addresses`:
1. Normalize city/province names (handle variations like "Batangas City" vs "Batangas")
2. Filter by allowed provinces (Batangas, Oriental Mindoro)
3. Count customers per city
4. **Note:** User addresses don't have coordinates, so they're counted but not plotted precisely yet

```javascript
addresses.forEach(addr => {
  const location = canonicalizeCityProvince(addr.city, addr.province);
  const cityKey = `${location.city}, ${location.province}`;
  cityCounts[cityKey].count += 1;  // Just counting, no coordinates yet
});
```

**Step 3: Process Order Delivery Addresses**

For each order's `delivery_address`:
1. Extract city, province, barangay
2. **Try to get precise coordinates** in this order:

```javascript
// Priority 1: Check if coordinates exist in delivery_address
let latitude = address.latitude || address.lat || 
               address.coordinates?.latitude || address.coordinates?.lat;
let longitude = address.longitude || address.lng || 
                address.coordinates?.longitude || address.coordinates?.lng;

// Priority 2: Get barangay centroid coordinates
const barangayCoordinate = getBarangayCoordinate({
  barangayCode: address.barangay_code,
  barangayName: address.barangay,
  normalizedCity: location.normalizedCity,
  normalizedProvince: location.normalizedProvince,
  barangayByCode,      // Map of PSGC codes → coordinates
  barangayByNameKey    // Map of names → coordinates
});

// If no direct coordinates, use barangay centroid
if (!latitude && barangayCoordinate) {
  latitude = barangayCoordinate.latitude;
  longitude = barangayCoordinate.longitude;
}
```

**Step 4: Generate Heatmap Points**

**A. Precise Points (from orders with coordinates):**
```javascript
if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
  // Add small random offset to prevent overlapping points
  const latOffset = (Math.random() - 0.5) * 0.004;  // ~400m spread
  const lngOffset = (Math.random() - 0.5) * 0.004;
  preciseHeatmapPoints.push([
    latitude + latOffset, 
    longitude + lngOffset, 
    1  // Intensity
  ]);
}
```

**B. Fallback Points (from city counts):**

For cities with customer counts but no precise coordinates:

```javascript
// Try to use barangay centroids within the city
const barangays = cityBarangays.get(cityLocationKey) || [];
if (barangays.length > 0) {
  // Distribute customers across barangays in the city
  for (let i = 0; i < cityInfo.count; i++) {
    const barangay = barangays[i % barangays.length];
    const latOffset = (Math.random() - 0.5) * 0.0035;
    const lngOffset = (Math.random() - 0.5) * 0.0035;
    fallbackCityPoints.push([
      barangay.latitude + latOffset,
      barangay.longitude + lngOffset,
      1
    ]);
  }
} else {
  // Last resort: Use city center coordinates
  const cityCoords = cityCoordinates[cityName];  // e.g., [13.7563, 121.0583]
  for (let i = 0; i < cityInfo.count; i++) {
    const latOffset = (Math.random() - 0.5) * 0.02;  // ~2km spread
    const lngOffset = (Math.random() - 0.5) * 0.02;
    fallbackCityPoints.push([
      cityCoords[0] + latOffset,
      cityCoords[1] + lngOffset,
      1
    ]);
  }
}
```

**Step 5: Combine and Return**

```javascript
// Combine precise and fallback points
const heatmapData = [...preciseHeatmapPoints, ...fallbackCityPoints];

res.json({
  success: true,
  data: heatmapData,  // Array of [lat, lng, intensity]
  cityStats: [
    { city: "Batangas City", province: "Batangas", count: 45 },
    { city: "Lipa", province: "Batangas", count: 32 },
    // ...
  ]
});
```

---

### 2.2 Barangay Coordinate Lookup

**Location:** `server/routes/analytics.js` → `getBarangayCoordinate()`

**Data Source:** Barangay centroids CSV file
- Contains PSGC codes and coordinates for all barangays
- Loaded into memory as Maps for fast lookup:
  - `barangayByCode`: PSGC code → {latitude, longitude, name, ...}
  - `barangayByNameKey`: "Province|City|Barangay" → {latitude, longitude, ...}

**Lookup Process:**
```javascript
function getBarangayCoordinate({ barangayCode, barangayName, ... }) {
  // Try by PSGC code first (most accurate)
  if (barangayCode && barangayByCode.has(barangayCode)) {
    return barangayByCode.get(barangayCode);
  }
  
  // Fallback to name lookup
  const key = `${normalizedProvince}|${normalizedCity}|${normalizedBarangay}`;
  if (barangayByNameKey.has(key)) {
    return barangayByNameKey.get(key);
  }
  
  return null;  // No coordinates found
}
```

---

### 2.3 Frontend Map Display

**Location:** `src/components/admin/BranchMap.js`

**Step 1: Fetch Data**
```javascript
const response = await authFetch(`${API_URL}/api/analytics/customer-locations`);
const data = await response.json();
const points = data.data;  // Array of [lat, lng, intensity]
```

**Step 2: Render Heatmap**
```javascript
<HeatmapLayer 
  points={heatmapPoints}  // Converted to [lat, lng, intensity] format
  visible={showHeatmap}
/>
```

**Step 3: Render Red Dot Markers**
```javascript
{heatmapData.map((point, index) => (
  <CircleMarker
    key={index}
    center={[point[0], point[1]]}  // [latitude, longitude]
    radius={4}
    pathOptions={{
      fillColor: '#ef4444',
      color: '#dc2626',
      fillOpacity: 0.8
    }}
  />
))}
```

**Step 4: Auto-Refresh**
```javascript
// Refresh every 30 seconds to show new customers
useEffect(() => {
  fetchCustomerLocations();
  const interval = setInterval(() => {
    fetchCustomerLocations();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## Coordinate Resolution Priority

When plotting a customer location, coordinates are determined in this order:

1. **Direct coordinates** from `delivery_address.latitude/longitude` (if saved during checkout)
2. **Barangay centroid** from PSGC code lookup (if `barangay_code` exists)
3. **Barangay centroid** from name lookup (if barangay name matches)
4. **City center** with random offset (fallback for city-level data)

---

## Data Accuracy Levels

1. **Most Accurate:** Orders with precise GPS coordinates in `delivery_address`
2. **Very Accurate:** Orders with barangay PSGC codes (barangay centroid)
3. **Accurate:** Orders with barangay names (barangay centroid lookup)
4. **Approximate:** User addresses or orders with only city (city center with spread)

---

## Summary

**Saving:**
- Addresses saved as text (city, province, barangay) in `user_addresses`
- Orders save complete address object (including optional coordinates) in `delivery_address` JSONB

**Plotting:**
- Backend aggregates customers by city
- Resolves coordinates using: direct coordinates → barangay centroids → city centers
- Returns array of [latitude, longitude, intensity] points
- Frontend displays as heatmap overlay and red dot markers
- Auto-refreshes every 30 seconds to show new customers immediately






