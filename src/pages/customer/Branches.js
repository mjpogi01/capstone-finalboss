import React from 'react';
import { createPortal } from 'react-dom';
import './Branches.css';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMapMarkerAlt, 
  faWalking, 
  faBicycle, 
  faMotorcycle, 
  faCar, 
  faShip,
  faStore,
  faRoute,
  faPhone,
  faClock,
  faTimes,
  faCheckCircle,
  faSync,
  faCrosshairs
} from '@fortawesome/free-solid-svg-icons';

const createGMapsLink = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const branches = [
  {
    id: 1,
    name: 'SAN PASCUAL (MAIN BRANCH)',
    address: 'Villa Maria Subdivision Sambat, San Pascual, 4204 Batangas',
    position: { lat: 13.8037077, lng: 121.0132160 },
    gmaps: createGMapsLink('Villa Maria Subdivision Sambat, San Pascual, 4204 Batangas'),
    phone: '+63 917 123 4567',
    email: 'sanpascual@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Design Services', 'Bulk Orders', 'Rush Orders']
  },
  {
    id: 2,
    name: 'CALAPAN BRANCH',
    address: 'Unit 2, Ground Floor Basa Bldg., Infantado Street, Brgy. San Vicente West Calapan City, 5200 Oriental Mindoro',
    position: { lat: 13.4123794, lng: 121.1765920 },
    gmaps: createGMapsLink('Infantado Street, Brgy. San Vicente West Calapan City, 5200 Oriental Mindoro'),
    phone: '+63 917 234 5678',
    email: 'calapan@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Design Services', 'Bulk Orders']
  },
  {
    id: 3,
    name: 'MUZON BRANCH',
    address: 'Barangay Muzon, San Luis, 4226 Batangas',
    position: { lat: 13.8558908, lng: 120.9405255 },
    gmaps: createGMapsLink('Barangay Muzon, San Luis, 4226 Batangas'),
    phone: '+63 917 345 6789',
    email: 'muzon@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Bulk Orders']
  },
  {
    id: 4,
    name: 'LEMERY BRANCH',
    address: 'Miranda Bldg, Illustre Ave., Brgy. District III 4209 Lemery Batangas',
    position: { lat: 13.8832266, lng: 120.9139464 },
    gmaps: createGMapsLink('Miranda Bldg, Illustre Ave., Brgy. District III 4209 Lemery Batangas'),
    phone: '+63 917 456 7890',
    email: 'lemery@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Design Services', 'Bulk Orders']
  },
  {
    id: 5,
    name: 'BATANGAS CITY BRANCH',
    address: 'Unit 1 Casa Buena Building, P.Burgos ST. EXT Calicanto, 4200 Batangas',
    position: { lat: 13.7648295, lng: 121.0557838 },
    gmaps: createGMapsLink('Unit 1 Casa Buena Building, P.Burgos ST. EXT Calicanto, 4200 Batangas'),
    phone: '+63 917 567 8901',
    email: 'batangascity@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Design Services', 'Bulk Orders', 'Rush Orders']
  },
  {
    id: 6,
    name: 'BAUAN BRANCH',
    address: 'J.P Rizal St. Poblacion, Bauan Batangas',
    position: { lat: 13.7917841, lng: 121.0072838 },
    gmaps: createGMapsLink('J.P Rizal St. Poblacion, Bauan Batangas'),
    phone: '+63 917 678 9012',
    email: 'bauan@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Bulk Orders']
  },
  {
    id: 7,
    name: 'CALACA BRANCH',
    address: 'Block D-8 Calaca Public Market, Poblacion 4, Calaca City, Philippines',
    position: { lat: 13.9288950, lng: 120.8113147 },
    gmaps: createGMapsLink('Block D-8 Calaca Public Market, Poblacion 4, Calaca City, Philippines'),
    phone: '+63 917 789 0123',
    email: 'calaca@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Bulk Orders']
  },
  {
    id: 8,
    name: 'PINAMALAYAN BRANCH',
    address: 'Mabini St. Brgy. Marfrancisco, Pinamalayan, Oriental Mindoro, Philippines',
    position: { lat: 13.0350, lng: 121.4847 },
    gmaps: createGMapsLink('Mabini St. Brgy. Marfrancisco, Pinamalayan, Oriental Mindoro, Philippines'),
    phone: '+63 917 890 1234',
    email: 'pinamalayan@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Bulk Orders']
  },
  {
    id: 9,
    name: 'ROSARIO BRANCH',
    address: 'Brgy. D, Rosario, Batangas, Rosario, Philippines',
    position: { lat: 13.8478, lng: 121.2039 },
    gmaps: createGMapsLink('Brgy. D, Rosario, Batangas, Rosario, Philippines'),
    phone: '+63 917 901 2345',
    email: 'rosario@yohannsportswear.com',
    hours: 'Mon-Sat: 8:30 AM - 5:30 PM\nSunday: Closed',
    services: ['Custom Jerseys', 'T-Shirts', 'Long Sleeves', 'Uniforms', 'Bulk Orders']
  }
];

// Configure default Leaflet marker icons so they render correctly in CRA
const defaultIcon = L.icon({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

// Enhanced red icon for active branch - larger and more visible
const activeRedIcon = L.icon({
  iconUrl:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="46" viewBox="0 0 25 41">
        <defs>
          <filter id="activeShadowFilter" x="-30%" y="-30%" width="160%" height="160%">
            <feOffset result="offOut" in="SourceAlpha" dx="0" dy="2"/>
            <feGaussianBlur result="blurOut" in="offOut" stdDeviation="2.5"/>
            <feColorMatrix result="blurOut" type="matrix" values="1 0 0 0 0.8  0 0.2 0 0 0.2  0 0 0.2 0 0.2  0 0 0 0.7 0"/>
            <feBlend in="SourceGraphic" in2="blurOut" mode="normal"/>
          </filter>
        </defs>
        <g filter="url(#activeShadowFilter)">
          <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 9.375 12.5 28.5 12.5 28.5S25 21.875 25 12.5C25 5.596 19.404 0 12.5 0z" fill="#ff3333"/>
          <circle cx="12.5" cy="12" r="5.5" fill="#ffffff"/>
          <circle cx="12.5" cy="12" r="3.5" fill="#ff3333"/>
        </g>
      </svg>`
    ),
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -42],
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  shadowSize: [41, 41]
});

// Blue icon for user location
const userLocationIcon = L.icon({
  iconUrl:
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0.75  0 0 0 0 1  0 0 0 1 0"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="15" cy="15" r="12" fill="#3b82f6" stroke="#fff" stroke-width="3" filter="url(#glow)"/>
        <circle cx="15" cy="15" r="5" fill="#fff"/>
      </svg>`
    ),
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

const Branches = () => {
  // Load activeId from localStorage on mount to persist across refreshes
  const [activeId, setActiveId] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('branches_activeId');
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  });
  const [selectedBranch, setSelectedBranch] = React.useState(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const mapRef = React.useRef(null);
  const [isRouting, setIsRouting] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState(null);
  const [locationAccuracy, setLocationAccuracy] = React.useState(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = React.useState(false);
  const [routeCoordinates, setRouteCoordinates] = React.useState([]);
  const [travelInfo, setTravelInfo] = React.useState(null);
  
  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance; // Distance in km
  };

  // Calculate travel time based on mode of transport (Google Maps-like estimation)
  const calculateTravelInfo = (userLoc, branchPos) => {
    const distance = calculateDistance(
      userLoc.lat,
      userLoc.lng,
      branchPos.lat,
      branchPos.lng
    );

    // More realistic average speeds (km/h) accounting for real-world conditions
    // These match Google Maps estimates more closely
    const speeds = {
      walking: 4.5,      // 4.5 km/h (includes stops, crossings)
      bicycle: 12,       // 12 km/h (realistic city cycling with traffic)
      motorcycle: 35,    // 35 km/h (city roads with traffic)
      car: 40            // 40 km/h (includes traffic, stops, turns in Philippines)
    };

    const formatTime = (hours) => {
      if (hours < 1) {
        return `${Math.round(hours * 60)} min`;
      } else {
        const hrs = Math.floor(hours);
        const mins = Math.round((hours - hrs) * 60);
        return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
      }
    };

    // Add overhead time for short trips (stops, intersections, etc.)
    const addOverhead = (baseTime, distance) => {
      if (distance < 5) {
        // Short trips: add 15% overhead for traffic lights, turns
        return baseTime * 1.15;
      } else if (distance < 15) {
        // Medium trips: add 10% overhead
        return baseTime * 1.10;
      } else {
        // Long trips: add 8% overhead (highway portions)
        return baseTime * 1.08;
      }
    };

    // Detect water crossing between Batangas and Mindoro
    // Batangas branches: lat > 13.7
    // Mindoro branches: lat < 13.5
    const isBatangas = (lat) => lat > 13.7;
    const isMindoro = (lat) => lat < 13.5;
    
    const crossesWater = (isBatangas(userLoc.lat) && isMindoro(branchPos.lat)) ||
                         (isMindoro(userLoc.lat) && isBatangas(branchPos.lat));

    // Calculate base travel times and add realistic overhead
    const baseWalkingTime = distance / speeds.walking;
    const baseBicycleTime = distance / speeds.bicycle;
    const baseMotorcycleTime = distance / speeds.motorcycle;
    const baseCarTime = distance / speeds.car;

    const travelInfo = {
      distance: distance.toFixed(1),
      walking: formatTime(addOverhead(baseWalkingTime, distance)),
      bicycle: formatTime(addOverhead(baseBicycleTime, distance)),
      motorcycle: formatTime(addOverhead(baseMotorcycleTime, distance)),
      car: formatTime(addOverhead(baseCarTime, distance)),
      crossesWater: crossesWater
    };

    // Add ferry travel time if crossing water
    if (crossesWater) {
      // Ferry from Batangas to Calapan: ~2 hours actual crossing
      // Plus port waiting time (30 min) and land travel to/from ports
      const ferryTime = 2.0; // 2 hours for ferry crossing
      const portWaitTime = 0.5; // 30 minutes buffer for boarding/waiting
      // Estimate 30% of total distance is land travel (to/from ports)
      const estimatedLandDistance = distance * 0.3;
      const landTravelTime = addOverhead(estimatedLandDistance / speeds.car, estimatedLandDistance);
      travelInfo.ferry = formatTime(ferryTime + portWaitTime + landTravelTime);
    }

    return travelInfo;
  };

  const calculateRouteToBranch = React.useCallback(async (branch) => {
    if (!userLocation) {
      // No user location available - can't calculate route
      console.log('No user location available for route calculation');
      return;
    }
    
    try {
      console.log(`Calculating route from user location to ${branch.name}...`);
      // Fetch route data from OSRM API
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${branch.position.lng},${branch.position.lat}?overview=full&geometries=geojson`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
        // Get the route geometry and convert to Leaflet format
        const routeCoords = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        
        // Set route coordinates
        setRouteCoordinates(routeCoords);
        console.log(`Route calculated: ${routeCoords.length} points`);
        
        // Calculate travel information using actual distance from OSRM API
        const actualDistance = data.routes[0].distance / 1000; // Convert meters to km
        
        // Recalculate with actual road distance (more accurate than straight line)
        const speeds = {
          walking: 4.5,
          bicycle: 12,
          motorcycle: 35,
          car: 40
        };
        
        const addOverhead = (baseTime, distance) => {
          if (distance < 5) return baseTime * 1.15;
          else if (distance < 15) return baseTime * 1.10;
          else return baseTime * 1.08;
        };
        
        const formatTime = (hours) => {
          if (hours < 1) {
            return `${Math.round(hours * 60)} min`;
          } else {
            const hrs = Math.floor(hours);
            const mins = Math.round((hours - hrs) * 60);
            return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
          }
        };
        
        const info = {
          distance: actualDistance.toFixed(1),
          walking: formatTime(addOverhead(actualDistance / speeds.walking, actualDistance)),
          bicycle: formatTime(addOverhead(actualDistance / speeds.bicycle, actualDistance)),
          motorcycle: formatTime(addOverhead(actualDistance / speeds.motorcycle, actualDistance)),
          car: formatTime(addOverhead(actualDistance / speeds.car, actualDistance)),
          crossesWater: false // OSRM doesn't provide water routes
        };
        
        setTravelInfo(info);
      } else {
        // Fallback to straight line if routing fails
        console.warn('OSRM API returned no routes, using straight line');
        const route = [
          [userLocation.lat, userLocation.lng],
          [branch.position.lat, branch.position.lng]
        ];
        setRouteCoordinates(route);
        
        // Calculate travel information using Haversine
        const info = calculateTravelInfo(userLocation, branch.position);
        setTravelInfo(info);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // Fallback to straight line - always show a route line
      console.log('Using straight line fallback');
      const route = [
        [userLocation.lat, userLocation.lng],
        [branch.position.lat, branch.position.lng]
      ];
      setRouteCoordinates(route);
      
      const info = calculateTravelInfo(userLocation, branch.position);
      setTravelInfo(info);
    }
  }, [userLocation]); // Recreate function when userLocation changes
  
  // Save activeId to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeId) {
        localStorage.setItem('branches_activeId', activeId.toString());
        // Also set selectedBranch when activeId is restored
        const branch = branches.find(b => b.id === activeId);
        if (branch) {
          setSelectedBranch(branch);
          
          // Calculate route if user location is available
          if (userLocation) {
            // Show straight line immediately
            const straightLine = [
              [userLocation.lat, userLocation.lng],
              [branch.position.lat, branch.position.lng]
            ];
            setRouteCoordinates(straightLine);
            
            // Then calculate proper route
            calculateRouteToBranch(branch).catch((error) => {
              console.error('Error calculating route:', error);
            });
          }
        }
      } else {
        localStorage.removeItem('branches_activeId');
        setSelectedBranch(null);
        setRouteCoordinates([]);
        setTravelInfo(null);
      }
    }
  }, [activeId, userLocation, calculateRouteToBranch]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = document.querySelectorAll('.branches-container .reveal:not(.is-visible)');

    if (!elements.length) return;

    if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.2 }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [activeId, travelInfo]);

  // Get user's current location on component mount with improved accuracy
  React.useEffect(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    let watchId = null;
    let bestLocation = null;
    let bestAccuracy = Infinity;
    let locationUpdateCount = 0;
    const maxUpdates = 10; // Maximum number of location updates to check
    const accuracyThreshold = 50; // Target accuracy in meters (more accurate)
    const maxWatchTime = 15000; // Maximum time to watch for location (15 seconds)
    const startTime = Date.now();

    const updateLocation = (position) => {
      const accuracy = position.coords.accuracy || Infinity;
      const userPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      locationUpdateCount++;

      // Always update if this location is more accurate than the previous best
      if (accuracy < bestAccuracy) {
        bestAccuracy = accuracy;
        bestLocation = userPos;
        setUserLocation(userPos);
        setLocationAccuracy(accuracy);
        setIsUpdatingLocation(false);
        console.log(`📍 Location updated: Accuracy ${accuracy.toFixed(0)}m`);
      }

      // Stop watching if we have a very accurate location (< 50m)
      if (accuracy < accuracyThreshold) {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
          console.log(`✅ Got accurate location: ${accuracy.toFixed(0)}m`);
        }
        return;
      }

      // Stop watching after maximum time or updates
      const elapsed = Date.now() - startTime;
      if (elapsed > maxWatchTime || locationUpdateCount >= maxUpdates) {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
          console.log(`⏱️ Stopped watching after ${elapsed}ms, best accuracy: ${bestAccuracy.toFixed(0)}m`);
        }
        // Use the best location we found, even if not perfect
        if (bestLocation) {
          setUserLocation(bestLocation);
          setLocationAccuracy(bestAccuracy);
          setIsUpdatingLocation(false);
        }
      }
    };

    const handleError = (error) => {
      // Handle timeout errors gracefully - don't log as errors
      // error.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
      if (error.code === 3 || error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        console.log('Geolocation timeout - location service is taking longer than expected');
      } else {
        console.log('Geolocation error:', error.message);
      }
      
      // If we have a best location from previous attempts, use it
      if (bestLocation) {
        setUserLocation(bestLocation);
        setLocationAccuracy(bestAccuracy);
        setIsUpdatingLocation(false);
        return;
      }

      // Fallback: Try getCurrentPosition with longer timeout and better options
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            const accuracy = position.coords.accuracy || Infinity;
            setUserLocation(userPos);
            setLocationAccuracy(accuracy);
            setIsUpdatingLocation(false);
            console.log(`📍 Fallback location: Accuracy ${accuracy.toFixed(0)}m`);
          },
          (fallbackError) => {
            // Silently handle timeout errors in fallback
            // error.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
            if (fallbackError.code !== 3 && !fallbackError.message?.includes('timeout')) {
              console.log('Unable to get user location:', fallbackError.message);
            }
            // Don't set fallback location - let user know location is unavailable
          },
          { 
            enableHighAccuracy: true, 
            timeout: 20000, 
            maximumAge: 0 // Always get fresh location
          }
        );
      } catch (err) {
        // Silently catch any errors from getCurrentPosition call
        console.log('Error calling getCurrentPosition fallback');
      }
    };

    // Use watchPosition for continuous updates and better accuracy
    // This gives us multiple location readings and we can pick the best one
    try {
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        { 
          enableHighAccuracy: true, // Use GPS when available
          timeout: 10000, // 10 second timeout per update
          maximumAge: 0 // Always get fresh location, don't use cached
        }
      );
    } catch (error) {
      console.log('Error starting location watch:', error);
      // Fallback to getCurrentPosition
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        handleError,
        { 
          enableHighAccuracy: true, 
          timeout: 20000, 
          maximumAge: 0 
        }
      );
    }

    // Cleanup watch on unmount
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []); // Run only on mount

  // Function to refresh user location manually
  const refreshUserLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    setIsUpdatingLocation(true);

    let watchId = null;
    let bestLocation = null;
    let bestAccuracy = Infinity;
    let locationUpdateCount = 0;
    const maxUpdates = 8;
    const accuracyThreshold = 50;
    const maxWatchTime = 12000;
    const startTime = Date.now();

    const updateLocation = (position) => {
      const accuracy = position.coords.accuracy || Infinity;
      const userPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      locationUpdateCount++;

      if (accuracy < bestAccuracy) {
        bestAccuracy = accuracy;
        bestLocation = userPos;
        setUserLocation(userPos);
        setLocationAccuracy(accuracy);
        console.log(`📍 Location refreshed: Accuracy ${accuracy.toFixed(0)}m`);
      }

      if (accuracy < accuracyThreshold) {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
        setIsUpdatingLocation(false);
        return;
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > maxWatchTime || locationUpdateCount >= maxUpdates) {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
        if (bestLocation) {
          setUserLocation(bestLocation);
          setLocationAccuracy(bestAccuracy);
        }
        setIsUpdatingLocation(false);
      }
    };

    const handleError = (error) => {
      // Handle timeout errors gracefully - don't log as errors
      // error.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
      if (error.code === 3 || error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        console.log('Location refresh timeout - location service is taking longer than expected');
      } else {
        console.log('Location refresh error:', error.message);
      }
      setIsUpdatingLocation(false);
      
      // Fallback: Try getCurrentPosition
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const accuracy = position.coords.accuracy || Infinity;
            const userPos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(userPos);
            setLocationAccuracy(accuracy);
            setIsUpdatingLocation(false);
          },
          (fallbackError) => {
            // Silently handle timeout errors in fallback
            // error.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
            if (fallbackError.code !== 3 && !fallbackError.message?.includes('timeout')) {
              console.log('Unable to refresh location:', fallbackError.message);
            }
            setIsUpdatingLocation(false);
          },
          { 
            enableHighAccuracy: true, 
            timeout: 15000, 
            maximumAge: 0 
          }
        );
      } catch (err) {
        // Silently catch any errors from getCurrentPosition call
        setIsUpdatingLocation(false);
      }
    };

    try {
      watchId = navigator.geolocation.watchPosition(
        updateLocation,
        handleError,
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      // Cleanup after timeout
      setTimeout(() => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      }, maxWatchTime + 2000);
    } catch (error) {
      console.log('Error refreshing location:', error);
      setIsUpdatingLocation(false);
    }
  };

  const openBranchModal = (branch) => {
    // Set activeId immediately so marker turns red right away
    setActiveId(branch.id);
    setSelectedBranch(branch);
    setIsModalOpen(true);
    focusBranch(branch);
    
    // Always calculate and show route from user location to branch
    if (userLocation) {
      // Show straight line immediately for instant feedback
      const straightLine = [
        [userLocation.lat, userLocation.lng],
        [branch.position.lat, branch.position.lng]
      ];
      setRouteCoordinates(straightLine);
      
      // Then calculate proper route (will replace straight line)
      calculateRouteToBranch(branch).catch((error) => {
        console.error('Error calculating route:', error);
        // Keep the straight line if route calculation fails
      });
    }
    // Keep activeId set so marker stays red
  };

  const closeBranchModal = () => {
    setIsModalOpen(false);
    // Don't clear activeId, route, or travelInfo - keep them visible on map
    // Only close the modal
    setTimeout(() => {
      setSelectedBranch(null);
    }, 300); // Wait for animation to complete
  };

  // Helper function to zoom to highlight branch with smooth animation - centers on branch
  const zoomToBranch = (branchPos, userLoc = null, retryCount = 0) => {
    // Retry up to 5 times if map is not loaded yet (waits up to 500ms)
    if (!mapRef.current) {
      if (retryCount < 5) {
        setTimeout(() => zoomToBranch(branchPos, userLoc, retryCount + 1), 100);
      }
      return;
    }
    
    // Check if map is loaded, if not wait a bit and retry
    if (!mapRef.current._loaded) {
      if (retryCount < 10) {
        setTimeout(() => zoomToBranch(branchPos, userLoc, retryCount + 1), 50);
      }
      return;
    }
    
    try {
      const map = mapRef.current;
      const currentZoom = map.getZoom();
      const targetZoom = 16; // Final zoom level to center on branch
      const zoomOutLevel = 10; // Zoom out to this level first
      
      // Three-step animation for smooth transition:
      // Step 1: Zoom out first
      // Step 2: Pan to branch location while zoomed out
      // Step 3: Zoom in to center the branch
      
      // Step 1: Zoom out first for better visual transition
      map.setView(branchPos, zoomOutLevel, {
        animate: true,
        duration: 0.8,
        easeLinearity: 0.1
      });
      
      // Step 2: Pan to branch location while zoomed out (already centered above, but allow time for zoom out)
      setTimeout(() => {
        map.setView(branchPos, zoomOutLevel, {
          animate: true,
          duration: 0.8,
          easeLinearity: 0.1
        });
        
        // Step 3: Zoom in to center the branch marker more precisely
        setTimeout(() => {
          map.setView(branchPos, targetZoom, {
            animate: true,
            duration: 1.0,
            easeLinearity: 0.05
          });
        }, 800);
      }, 800);
      
    } catch (error) {
      console.error('Error zooming to branch:', error);
      // Retry once more if there was an error
      if (retryCount < 3) {
        setTimeout(() => zoomToBranch(branchPos, userLoc, retryCount + 1), 200);
      }
    }
  };

  // Effect to ensure marker pane has correct z-index when activeId changes
  React.useEffect(() => {
    // Ensure marker pane has correct z-index so markers are visible above modal
    const ensureMarkerPaneZIndex = () => {
      const markerPanes = document.querySelectorAll('.leaflet-marker-pane');
      markerPanes.forEach((pane) => {
        pane.style.setProperty('z-index', '10001', 'important');
        pane.style.position = 'relative';
        pane.style.pointerEvents = 'auto';
      });
    };
    
    // Run immediately and after delays to ensure marker pane is set up correctly
    ensureMarkerPaneZIndex();
    const timeouts = [
      setTimeout(ensureMarkerPaneZIndex, 10),
      setTimeout(ensureMarkerPaneZIndex, 50),
      setTimeout(ensureMarkerPaneZIndex, 100),
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [activeId, isModalOpen]); // Run when activeId or modal state changes

  // Auto-calculate route when userLocation becomes available and a branch is selected
  // This ensures route line is always present when both are available, even after refresh
  React.useEffect(() => {
    if (userLocation && activeId) {
      const selectedBranch = branches.find(b => b.id === activeId);
      if (selectedBranch) {
        // Show straight line immediately for instant feedback
        const straightLine = [
          [userLocation.lat, userLocation.lng],
          [selectedBranch.position.lat, selectedBranch.position.lng]
        ];
        setRouteCoordinates(straightLine);
        
        // Then calculate proper route (will replace straight line)
        // Add retry logic in case network is slow
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptRouteCalculation = async () => {
          try {
            await calculateRouteToBranch(selectedBranch);
          } catch (error) {
            console.log(`Route calculation attempt ${retryCount + 1} failed, retrying...`);
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(attemptRouteCalculation, 2000 * retryCount); // Exponential backoff
            } else {
              console.log('Route calculation failed after retries, keeping straight line');
              // Keep the straight line that was already set
            }
          }
        };
        
        attemptRouteCalculation();
      }
    } else if (!userLocation && activeId) {
      // No user location but branch is selected - clear route
      setRouteCoordinates([]);
      setTravelInfo(null);
    }
    // This effect runs when userLocation, activeId, or calculateRouteToBranch changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, activeId, calculateRouteToBranch]); // routeCoordinates intentionally omitted to avoid infinite loops

  const focusBranch = async (branch) => {
    // Set activeId immediately so marker turns red right away
    // This will also save to localStorage via useEffect
    setActiveId(branch.id);
    
    // Zoom to highlight the branch immediately (works even without userLocation)
    zoomToBranch(branch.position, userLocation);
    
    // Show straight line immediately if user location is available (will be updated to proper route by useEffect)
    if (userLocation) {
      const straightLine = [
        [userLocation.lat, userLocation.lng],
        [branch.position.lat, branch.position.lng]
      ];
      setRouteCoordinates(straightLine);
      
      // Also calculate proper route immediately (useEffect will also handle this, but do it here too for faster response)
      calculateRouteToBranch(branch).catch(error => {
        console.log('Route calculation in focusBranch failed, useEffect will retry');
      });
    } else {
      // No user location - clear route coordinates
      // But keep activeId so when location becomes available, route will be calculated
      setRouteCoordinates([]);
      setTravelInfo(null);
    }
    
    // The useEffect will handle recalculating the route when userLocation becomes available
  };

  const getDirectionsTo = (branch) => {
    setIsRouting(true);

    const dest = `${branch.position.lat},${branch.position.lng}`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;

    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isMobile = isAndroid || isIOS;

    // Mobile deep links: try app first, fallback to web
    if (isMobile) {
      let appUrl = webUrl;
      let fallbackUrl = webUrl;

      if (isAndroid) {
        // Launch Google Maps navigation directly
        appUrl = `google.navigation:q=${encodeURIComponent(dest)}&mode=d`;
        fallbackUrl = webUrl;
      } else if (isIOS) {
        // Prefer Google Maps app; fallback to Apple Maps
        const gmapsUrl = `comgooglemaps://?daddr=${encodeURIComponent(dest)}&directionsmode=driving`;
        const appleMapsUrl = `maps://?daddr=${encodeURIComponent(dest)}&dirflg=d`;
        appUrl = gmapsUrl;
        fallbackUrl = appleMapsUrl;
      }

      // Navigate app URL; if it fails (app missing), after a short delay, open fallback
      const openFallbackTimer = setTimeout(() => {
        // For iOS, attempt Apple Maps first; if that still fails, browser handles webUrl
        window.location.href = fallbackUrl;
        setIsRouting(false);
      }, 1200);

      try {
        window.location.href = appUrl;
      } catch (_) {
        // If immediate error, fallback instantly
        clearTimeout(openFallbackTimer);
        window.location.href = fallbackUrl;
        setIsRouting(false);
      }

      return;
    }

    // Desktop: use web URL and include precise origin if permitted
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
          const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
          window.open(url, '_blank');
          setIsRouting(false);
        },
        (error) => {
          // Silently handle timeout errors - just fallback to web URL without origin
          if (error.code !== 3 && !error.message?.includes('timeout')) {
            console.log('Unable to get location for directions:', error.message);
          }
          window.open(webUrl, '_blank');
          setIsRouting(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      window.open(webUrl, '_blank');
      setIsRouting(false);
    }
  };

  const FitBounds = ({ points }) => {
    const map = useMap();
    React.useEffect(() => {
      if (!map) return;
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { 
        padding: [60, 60], // More padding for better view
        maxZoom: 14 // Maximum zoom level - not too close
      });
    }, [map, points]);
    return null;
  };

  const MapRefSetter = () => {
    const map = useMap();
    React.useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  };

  // Custom Marker component that ensures marker stays visible and updates properly
  const BranchMarker = ({ branch, isActive, onClick }) => {
    const markerRef = React.useRef(null);
    const isActiveRef = React.useRef(isActive);

    // Update ref when isActive changes
    React.useEffect(() => {
      isActiveRef.current = isActive;
    }, [isActive]);

    // Use useEffect to ensure marker icon updates when isActive changes and stays visible
    React.useEffect(() => {
      if (!markerRef.current) return;
      
      let leafletMarker = null;
      let addEventListener = null;
      
      // Function to update marker icon and ensure visibility
      const updateMarker = () => {
        try {
          if (!markerRef.current || !markerRef.current.leafletElement) {
            return false;
          }
          
          leafletMarker = markerRef.current.leafletElement;
          const currentIsActive = isActiveRef.current;
          const newIcon = currentIsActive ? activeRedIcon : defaultIcon;
          
          // Always update icon to ensure it matches the active state
          leafletMarker.setIcon(newIcon);
          leafletMarker.setZIndexOffset(currentIsActive ? 10002 : 0);
          
          // Wait for icon element to be available and update styles
          if (leafletMarker._icon) {
            if (currentIsActive) {
              // Active marker - ensure it's above modal (z-index 10002 > modal 10000)
              leafletMarker._icon.style.setProperty('z-index', '10002', 'important');
              leafletMarker._icon.style.position = 'relative';
              leafletMarker._icon.style.display = 'block';
              leafletMarker._icon.style.visibility = 'visible';
              leafletMarker._icon.style.opacity = '1';
              leafletMarker._icon.classList.add('active-branch-marker');
              
              // Force the marker to be on top
              try {
                leafletMarker.bringToFront();
              } catch (e) {
                // Ignore errors
              }
              
              // Also ensure parent pane is visible
              const markerPane = leafletMarker._icon.closest('.leaflet-marker-pane');
              if (markerPane) {
                markerPane.style.setProperty('z-index', '10001', 'important');
                markerPane.style.position = 'relative';
                markerPane.style.pointerEvents = 'auto';
              }
            } else {
              // Inactive marker - remove active styling
              leafletMarker._icon.style.zIndex = '';
              leafletMarker._icon.classList.remove('active-branch-marker');
            }
            return true; // Successfully updated
          }
          
          return false; // Icon not ready yet
        } catch (error) {
          // Silently handle - marker might not be ready
          return false;
        }
      };

      // Wait for marker to be added to map, then update
      if (markerRef.current && markerRef.current.leafletElement) {
        leafletMarker = markerRef.current.leafletElement;
        
        // If marker is already on map, update immediately
        if (leafletMarker._map) {
          updateMarker();
        } else {
          // Wait for marker to be added to map
          addEventListener = () => {
            updateMarker();
          };
          leafletMarker.on('add', addEventListener);
        }
      }
      
      // Try to update immediately and with delays
      const timers = [
        setTimeout(() => updateMarker(), 0),
        setTimeout(() => updateMarker(), 10),
        setTimeout(() => updateMarker(), 50),
        setTimeout(() => updateMarker(), 100),
        setTimeout(() => updateMarker(), 200),
        setTimeout(() => updateMarker(), 400),
        setTimeout(() => updateMarker(), 800),
      ];
      
      // Also update periodically when active to ensure it stays visible
      let intervalId = null;
      if (isActive) {
        intervalId = setInterval(() => {
          updateMarker();
        }, 1500); // Check every 1.5 seconds to ensure visibility
      }
      
      return () => {
        timers.forEach(clearTimeout);
        if (intervalId) {
          clearInterval(intervalId);
        }
        if (leafletMarker && addEventListener) {
          leafletMarker.off('add', addEventListener);
        }
      };
    }, [isActive, branch.id]); // Run whenever isActive or branch.id changes

    return (
      <Marker
        ref={markerRef}
        position={branch.position}
        icon={isActive ? activeRedIcon : defaultIcon}
        zIndexOffset={isActive ? 10002 : 0}
        eventHandlers={{
          click: () => {
            onClick(branch);
          }
        }}
      />
    );
  };


  // Center map on user location when it's detected
  const CenterOnUserLocation = () => {
    const map = useMap();
    React.useEffect(() => {
      if (userLocation && map && map._loaded && !activeId) {
        // Center map on user location with appropriate zoom (not too close)
        map.setView([userLocation.lat, userLocation.lng], 13, {
          animate: true,
          duration: 1.5
        });
      }
    }, [userLocation, map]);
    return null;
  };

  return (
    <section id="branches" className="branches-container">
      <div className="branches-wrapper">
        <div className="branches-hero reveal">
          <h1 className="branches-title page-title reveal">Our Branches</h1>
          <p className="branches-subtitle reveal reveal-delay-1">Find the nearest Yohann's Sportswear House branch on the map.</p>
        </div>
        
        <div className="branches-content">
          <div className="branches-layout">
          
          {/* Left Column: Map + Travel Info */}
          <div className="branches-map-column reveal">
          <div className="branches-map-wrapper reveal reveal-delay-1">
          <MapContainer
            className="branches-map"
            center={userLocation || branches.find(b => b.name === 'BATANGAS CITY BRANCH')?.position || branches[0].position}
            zoom={userLocation ? 13 : 11}
            scrollWheelZoom={true}
            zoomControl={true}
            minZoom={10}
            maxZoom={18}
          >
            <MapRefSetter />
            <CenterOnUserLocation />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Only fit bounds to branches if user location is not available */}
            {!userLocation && <FitBounds points={branches.map(b => b.position)} />}

            {/* Route line from user location to selected branch - ALWAYS SHOW when branch is selected */}
            {activeId && userLocation && (() => {
              const selectedBranch = branches.find(b => b.id === activeId);
              if (!selectedBranch) return null;
              
              // Always show route line - use calculated route if available, otherwise straight line
              const routePositions = routeCoordinates.length > 0 
                ? routeCoordinates 
                : [
                    [userLocation.lat, userLocation.lng],
                    [selectedBranch.position.lat, selectedBranch.position.lng]
                  ];
              
              return (
                <Polyline
                  key={`route-${activeId}-${routeCoordinates.length > 0 ? 'calculated' : 'straight'}`}
                  positions={routePositions}
                  color="#00bfff"
                  weight={6}
                  opacity={0.85}
                  pathOptions={{
                    color: '#00bfff',
                    weight: 6,
                    opacity: 0.85,
                    dashArray: routeCoordinates.length > 0 ? null : '10, 5',
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              );
            })()}

            {/* User location marker */}
              {userLocation && (
              <Marker
                position={[userLocation.lat, userLocation.lng]}
                icon={userLocationIcon}
              >
                <Popup>
                  <div className="branches-popup-content">
                    <div className="branches-popup-title">Your Location</div>
                    {locationAccuracy && (
                      <div className="branches-popup-accuracy" style={{ fontSize: '0.85rem', color: '#a9d8ff', marginTop: '0.25rem' }}>
                        Accuracy: {locationAccuracy.toFixed(0)}m
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        refreshUserLocation();
                      }}
                      disabled={isUpdatingLocation}
                      className="branches-refresh-location-btn"
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.4rem 0.8rem',
                        background: isUpdatingLocation ? '#444' : 'rgba(0, 191, 255, 0.2)',
                        border: '1px solid rgba(0, 191, 255, 0.4)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        cursor: isUpdatingLocation ? 'not-allowed' : 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        width: '100%',
                        justifyContent: 'center'
                      }}
                    >
                      <FontAwesomeIcon 
                        icon={faSync} 
                        spin={isUpdatingLocation}
                        style={{ fontSize: '0.9rem' }}
                      />
                      {isUpdatingLocation ? 'Updating...' : 'Refresh Location'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            )}

            {branches.map(branch => (
              <BranchMarker
                key={branch.id}
                branch={branch}
                isActive={activeId === branch.id}
                onClick={openBranchModal}
              />
            ))}
          </MapContainer>
          </div>
          {/* End Map Wrapper */}
          </div>
          {/* End Map Column */}

          {/* Right Column: Branch List */}
          <div className="branches-list-wrapper reveal reveal-delay-2">
            {branches.map((branch, index) => (
              <div 
                key={branch.id} 
                className={`branches-item ${activeId === branch.id ? 'branches-item-active' : ''}`}
                onClick={() => openBranchModal(branch)}
              >
                <div className="branches-item-content">
                  <div className="branches-item-name">{branch.name}</div>
                  <div className="branches-item-address">{branch.address}</div>
                </div>
              </div>
            ))}
          </div>
          
          </div>
        </div>
      </div>

      {/* Branch Details Modal */}
      {isModalOpen && selectedBranch && (
        <BranchDetailsModal
          branch={selectedBranch}
          isOpen={isModalOpen}
          onClose={closeBranchModal}
          onGetDirections={() => getDirectionsTo(selectedBranch)}
          isRouting={isRouting}
        />
      )}
    </section>
  );
};

// Branch Details Modal Component
const BranchDetailsModal = ({ branch, isOpen, onClose, onGetDirections, isRouting }) => {
  const modalRef = React.useRef(null);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus trap for accessibility
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Use React Portal to render modal at document body level, ensuring it's above footer
  return createPortal(
    <div 
      className={`branch-modal-overlay ${isOpen ? 'branch-modal-overlay-open' : ''}`}
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        className={`branch-modal ${isOpen ? 'branch-modal-open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="branch-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <div className="branch-modal-header">
          <h2 className="branch-modal-title">
            {isMobile && (branch.name === 'BATANGAS CITY BRANCH' || branch.name === 'PINAMALAYAN BRANCH') ? (
              <>
                {branch.name.replace(' BRANCH', '')}
                <br />
                BRANCH
              </>
            ) : (
              branch.name
            )}
          </h2>
          <div className="branch-modal-badge">
            <FontAwesomeIcon icon={faStore} />
            <span>Yohann's Sportswear House</span>
          </div>
        </div>

        <div className="branch-modal-content">
          <div className="branch-modal-body">
            <div className="branch-modal-section">
              <div className="branch-modal-section-title">
                <FontAwesomeIcon icon={faMapMarkerAlt} />
                <span>Address</span>
              </div>
              <p className="branch-modal-address">{branch.address}</p>
            </div>

            {branch.phone && (
              <div className="branch-modal-section">
                <div className="branch-modal-section-title">
                  <FontAwesomeIcon icon={faPhone} />
                  <span>Contact Number</span>
                </div>
                <a href={`tel:${branch.phone}`} className="branch-modal-link">
                  {branch.phone}
                </a>
              </div>
            )}

            {branch.hours && (
              <div className="branch-modal-section">
                <div className="branch-modal-section-title">
                  <FontAwesomeIcon icon={faClock} />
                  <span>Operating Hours</span>
                </div>
                <div className="branch-modal-hours">
                  {branch.hours.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            {branch.services && branch.services.length > 0 && (
              <div className="branch-modal-section">
                <div className="branch-modal-section-title">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>Available Services</span>
                </div>
                <div className="branch-modal-services">
                  {branch.services.map((service, index) => (
                    <span key={index} className="branch-modal-service-tag">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="branch-modal-footer">
          <button
            onClick={onGetDirections}
            disabled={isRouting}
            className="branch-modal-directions-btn"
          >
            <FontAwesomeIcon icon={faRoute} />
            {isRouting ? 'Getting Directions...' : 'Get Directions'}
          </button>
          <a
            href={branch.gmaps}
            target="_blank"
            rel="noopener noreferrer"
            className="branch-modal-gmaps-btn"
          >
            <FontAwesomeIcon icon={faMapMarkerAlt} />
            View on Google Maps
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Branches;
