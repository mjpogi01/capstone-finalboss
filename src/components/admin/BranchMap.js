import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMap, Tooltip } from 'react-leaflet';
import { FaMap, FaUsers } from 'react-icons/fa';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './BranchMap.css';
import { API_URL } from '../../config/api';
import { authFetch } from '../../services/apiClient';
import 'leaflet.heat';

// Ensure heat layer canvas uses willReadFrequently context for better performance with frequent readbacks
if (L.HeatLayer && typeof L.HeatLayer.prototype._initCanvas === 'function') {
  const originalInitCanvas = L.HeatLayer.prototype._initCanvas;
  L.HeatLayer.prototype._initCanvas = function patchedInitCanvas() {
    originalInitCanvas.call(this);
    if (this._canvas && this._canvas.getContext) {
      const ctx = this._canvas.getContext('2d', { willReadFrequently: true }) || this._canvas.getContext('2d');
      if (ctx) {
        this._ctx = ctx;
      }
    }
  };
}

// Patch _clear method to handle undefined canvas context gracefully
if (L.HeatLayer && typeof L.HeatLayer.prototype._clear === 'function') {
  const originalClear = L.HeatLayer.prototype._clear;
  L.HeatLayer.prototype._clear = function patchedClear() {
    // Ensure canvas exists
    if (!this._canvas) {
      return;
    }
    
    // Ensure context exists - try to get it if missing
    if (!this._ctx) {
      try {
        const ctx = this._canvas.getContext('2d', { willReadFrequently: true }) || this._canvas.getContext('2d');
        if (ctx) {
          this._ctx = ctx;
        } else {
          return; // Can't clear if no context available
        }
      } catch (e) {
        return; // Canvas might not be ready yet
      }
    }
    
    // Double-check context still exists before calling original
    if (!this._ctx || typeof this._ctx.clearRect !== 'function') {
      return;
    }
    
    try {
      originalClear.call(this);
    } catch (error) {
      // Silently fail - this is often a timing issue that resolves itself
      // Don't log to avoid console spam
    }
  };
}

// Patch _redraw method to ensure canvas is initialized
if (L.HeatLayer && typeof L.HeatLayer.prototype._redraw === 'function') {
  const originalRedraw = L.HeatLayer.prototype._redraw;
  L.HeatLayer.prototype._redraw = function patchedRedraw() {
    // Ensure canvas exists
    if (!this._canvas) {
      return;
    }
    
    // Ensure context exists - try to initialize if missing
    if (!this._ctx) {
      if (this._initCanvas) {
        try {
          this._initCanvas();
        } catch (e) {
          // Canvas might not be ready
        }
      }
      
      // Try to get context directly if still missing
      if (!this._ctx) {
        try {
          const ctx = this._canvas.getContext('2d', { willReadFrequently: true }) || this._canvas.getContext('2d');
          if (ctx) {
            this._ctx = ctx;
          } else {
            return; // Can't redraw without context
          }
        } catch (e) {
          return; // Canvas not ready
        }
      }
    }
    
    // Double-check context has required methods
    if (!this._ctx || typeof this._ctx.clearRect !== 'function') {
      return;
    }
    
    try {
      originalRedraw.call(this);
    } catch (error) {
      // Silently fail - this is often a timing issue that resolves itself
      // Don't log to avoid console spam
    }
  };
}

// Fix for default marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to fit map bounds (only on initial load)
function FitBounds({ points, shouldFit }) {
  const map = useMap();
  const hasFittedRef = React.useRef(false);
  
  useEffect(() => {
    // Only fit bounds on initial load when shouldFit is true
    if (shouldFit && !hasFittedRef.current && points && points.length > 0) {
      const bounds = points.map(point => [point[0], point[1]]);
      const boundsGroup = L.latLngBounds(bounds);
      map.fitBounds(boundsGroup, { padding: [50, 50] });
      hasFittedRef.current = true;
    }
  }, [map, points, shouldFit]);
  
  return null;
}

function HeatmapLayer({ points, visible }) {
  const map = useMap();
  const heatLayerRef = React.useRef(null);
  const mapReadyRef = React.useRef(false);

  useEffect(() => {
    if (!map) {
      return undefined;
    }

    // Wait for map to be fully initialized
    const checkMapReady = () => {
      if (map && map.getContainer() && map._loaded) {
        mapReadyRef.current = true;
      } else {
        mapReadyRef.current = false;
      }
    };

    // Check immediately
    checkMapReady();

    // Also listen for map load event
    const onMapReady = () => {
      mapReadyRef.current = true;
    };
    
    map.on('load', onMapReady);
    if (map._loaded) {
      mapReadyRef.current = true;
    }

    const removeLayer = () => {
      const layer = heatLayerRef.current;
      if (!layer) {
        return;
      }
      
      // Clear the heatmap data first
      try {
        if (layer.setLatLngs) {
          layer.setLatLngs([]);
        }
      } catch (e) {
        // Ignore errors when clearing
      }
      
      // Remove from map
      if (map.hasLayer(layer)) {
        try {
        map.removeLayer(layer);
        } catch (e) {
          // Ignore errors when removing
        }
      }
      
      // Hide canvas element if it exists
      try {
        if (layer._canvas && layer._canvas.parentNode) {
          layer._canvas.style.display = 'none';
        }
      } catch (e) {
        // Ignore errors
      }
      
      // Clear the canvas if it exists
      try {
        if (layer._canvas && layer._ctx && typeof layer._ctx.clearRect === 'function') {
          const ctx = layer._ctx;
          ctx.clearRect(0, 0, layer._canvas.width, layer._canvas.height);
        }
      } catch (e) {
        // Ignore errors
      }
      
      heatLayerRef.current = null;
    };

    const ensureLayer = () => {
      if (!heatLayerRef.current) {
        try {
          const layer = L.heatLayer([], {
            radius: 20,
            blur: 28,
            maxZoom: 11,
            minOpacity: 0.35,
            gradient: {
              0.0: '#fee2e2',
              0.45: '#fca5a5',
              0.65: '#f87171',
              0.85: '#ef4444',
              1.0: '#b91c1c'
            }
          });
          heatLayerRef.current = layer;
        } catch (layerError) {
          console.warn('Error creating heat layer:', layerError);
          return null;
        }
      }
      return heatLayerRef.current;
    };

    const updateLayer = () => {
      if (!visible) {
        removeLayer();
        return;
      }
      
      // Wait for map to be ready
      if (!mapReadyRef.current) {
        // Retry after a short delay if map isn't ready
        setTimeout(updateLayer, 100);
        return;
      }
      
      const layer = ensureLayer();
      if (!layer) {
        return;
      }
      
      // Ensure map is ready before adding layer
      if (!map || !map.getContainer()) {
        return;
      }
      
      // Ensure map is fully loaded
      if (!map._loaded && !map._container) {
        // Map not loaded yet, retry later
        setTimeout(updateLayer, 100);
        return;
      }
      
      const latLngs = Array.isArray(points) && points.length > 0 ? points : [];
      
      // Use requestAnimationFrame to ensure canvas is ready
      requestAnimationFrame(() => {
        try {
          // Ensure map container exists and is ready
          const mapContainer = map?.getContainer();
          if (!mapContainer || !mapContainer.parentNode) {
            // Map container not ready, retry later
            setTimeout(updateLayer, 100);
            return;
          }
          
          // Double-check canvas context exists before updating
          if (layer._canvas && (!layer._ctx || !layer._canvas.getContext)) {
            // Reinitialize canvas if needed
            if (layer._initCanvas) {
              layer._initCanvas();
            }
          }
          
          // Make sure canvas is visible when showing
          if (layer._canvas) {
            layer._canvas.style.display = '';
          }
          
          // Only update lat/lngs if layer is already on map, otherwise wait
          if (map.hasLayer(layer)) {
            layer.setLatLngs(latLngs);
          } else {
            // Layer not on map yet - ensure map is fully ready before adding
            if (map._panes && map._panes.overlayPane && map._panes.overlayPane.parentNode) {
              // Double-check that the overlay pane is in the DOM
              try {
                // Verify the pane has a parent (is in DOM) and the map container is visible
                const paneParent = map._panes.overlayPane.parentNode;
                const mapContainer = map.getContainer();
                
                if (paneParent && paneParent.appendChild && mapContainer && mapContainer.offsetParent !== null) {
                  // Map is visible and ready - try to add layer
                  try {
                    layer.setLatLngs(latLngs);
                    layer.addTo(map);
                  } catch (addError) {
                    // If addTo fails, retry after delay
                    if (addError.message && addError.message.includes('appendChild')) {
                      setTimeout(updateLayer, 200);
                    } else {
                      throw addError;
                    }
                  }
                } else {
                  // Map not visible or pane not attached, retry
                  setTimeout(updateLayer, 100);
                }
              } catch (paneError) {
                // Pane check failed, retry
                setTimeout(updateLayer, 100);
              }
            } else {
              // Map panes not ready, retry later
              setTimeout(updateLayer, 100);
            }
          }
        } catch (error) {
          // Silently handle errors - often timing issues that resolve themselves
          // Only retry if it's a critical error
          if (error.message && error.message.includes('appendChild')) {
            // Retry after a short delay
            setTimeout(updateLayer, 200);
          }
        }
      });
    };

    // Delay initial update to ensure map is ready
    const timeoutId = setTimeout(() => {
      updateLayer();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      removeLayer();
      if (map) {
        map.off('load', onMapReady);
      }
    };
  }, [map, points, visible]);

  return null;
}

const BranchMap = ({ onDataLoaded }) => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [markerData, setMarkerData] = useState([]);
  const [cityStats, setCityStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [hasInitialFit, setHasInitialFit] = useState(false);

  const reportData = useCallback((points = [], stats = [], extra = {}) => {
    if (typeof onDataLoaded === 'function') {
      const totalCustomers = Array.isArray(stats)
        ? stats.reduce((sum, item) => sum + (Number(item.count) || 0), 0)
        : 0;
      onDataLoaded({
        points,
        cityStats: stats,
        summary: {
          totalPoints: Array.isArray(points) ? points.length : 0,
          totalCities: Array.isArray(stats) ? stats.length : 0,
          totalCustomers,
          topCity: Array.isArray(stats) && stats.length ? stats[0].city : null,
          ...extra
        }
      });
    }
  }, [onDataLoaded]);

  useEffect(() => {
    fetchCustomerLocations();
    
    // Auto-refresh disabled - customer locations will only load once when component mounts
    // If you want to re-enable auto-refresh, uncomment the code below:
    // const refreshInterval = setInterval(() => {
    //   fetchCustomerLocations();
    // }, 30000); // 30 seconds
    // 
    // return () => {
    //   clearInterval(refreshInterval);
    // };
  }, []);

  const fetchCustomerLocations = async () => {
    try {
      setLoading(true);
      reportData([], [], { status: 'loading' });
      const response = await authFetch(`${API_URL}/api/analytics/customer-locations`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const points = Array.isArray(data.data) ? data.data : [];
          const markers = Array.isArray(data.markers) ? data.markers : [];
          const statsRaw = Array.isArray(data.cityStats) ? data.cityStats : [];
          const stats = [...statsRaw].sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0));
          setHeatmapData(points);
          setCityStats(stats);
          setMarkerData(markers); // Store marker data with customer names
          reportData(points, stats, { status: 'loaded', source: 'api' });
          console.log(`✅ Loaded ${points.length} customer location points from database`);
          
          // Mark initial fit after first successful load
          if (!hasInitialFit && points.length > 0) {
            setHasInitialFit(true);
          }
        } else {
          // No data available - show empty state
          setHeatmapData([]);
          setCityStats([]);
          reportData([], [], { status: 'loaded', source: 'api', empty: true });
          console.log('ℹ️ No customer location data available');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API error fetching customer locations:', errorData);
        setHeatmapData([]);
        setCityStats([]);
        reportData([], [], { status: 'error', source: 'api', error: errorData.error || 'Failed to fetch customer locations' });
      }
    } catch (error) {
      console.error('❌ Error fetching customer locations:', error);
      setHeatmapData([]);
      setCityStats([]);
      reportData([], [], { status: 'error', source: 'api', error: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const heatmapPoints = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) {
      return [];
    }

    return heatmapData.map(point => [
      point[0],
      point[1],
      typeof point[2] === 'number' ? point[2] : 1
    ]);
  }, [heatmapData]);

  if (loading) {
    return (
      <div className="branch-map-loading">
        <div className="loading-spinner"></div>
        <p>Loading map...</p>
      </div>
    );
  }

  // Show empty state if no data
  if (!loading && heatmapData.length === 0 && cityStats.length === 0) {
    return (
      <div className="branch-map-container">
        <div className="branch-map-header">
          <div>
            <h3>
              <FaUsers className="header-icon" />
              Customer Locations
            </h3>
            <p>No customer location data available</p>
          </div>
        </div>
        <div className="branch-map-empty-state">
          <FaMap className="empty-icon" />
          <p>No customer locations found in the database.</p>
          <p className="empty-subtitle">Customer locations will appear here once customers add addresses or place orders.</p>
        </div>
      </div>
    );
  }

  // Calculate map center (centered on Batangas region)
  const mapCenter = [13.7563, 121.0583]; // Batangas City coordinates
  const mapZoom = 9;

  return (
    <div className="branch-map-container">
      <div className="branch-map-header">
        <div>
          <h3>
            <FaUsers className="header-icon" />
            Customer Locations
          </h3>
          <p>Visualize customer density with heatmap and red dot markers</p>
        </div>
        <div className="branch-map-controls">
          <label className="map-toggle">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={() => setShowHeatmap(prev => !prev)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">
              <span className="toggle-text">Heatmap</span>
            </span>
          </label>
          <label className="map-toggle">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={() => setShowMarkers(prev => !prev)}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-label">
              <span className="toggle-text">Red Dots</span>
            </span>
          </label>
        </div>
      </div>
      
      <div className="branch-map-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '600px', width: '100%', borderRadius: '12px' }}
          scrollWheelZoom={true}
          preferCanvas={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <FitBounds points={heatmapData} shouldFit={!hasInitialFit && heatmapData.length > 0} />
          <HeatmapLayer points={heatmapPoints} visible={showHeatmap} />
          
          {/* Render red dots for each customer location */}
          {showMarkers &&
            heatmapData.map((point, index) => {
              // Get customer name from marker data if available
              const marker = markerData[index] || markerData.find(m => 
                m && typeof m === 'object' && 
                Math.abs(m.lat - point[0]) < 0.0001 && 
                Math.abs(m.lng - point[1]) < 0.0001
              );
              const customerName = marker && typeof marker === 'object' ? marker.customerName : null;
              
              return (
              <CircleMarker
                key={index}
                center={[point[0], point[1]]}
                radius={4}
                pathOptions={{
                  fillColor: '#ef4444',
                  color: '#dc2626',
                  fillOpacity: 0.8,
                  weight: 1
                }}
                >
                  {customerName && (
                    <Tooltip permanent={false} direction="top" offset={[0, -10]}>
                      {customerName}
                    </Tooltip>
                  )}
                </CircleMarker>
              );
            })}
          
        </MapContainer>
      </div>
      
      {/* Customer Statistics */}
      <div className="branch-map-legend">
        <h4>Top Customer Cities</h4>
        <div className="legend-items">
          {cityStats.slice(0, 10).map((stat, index) => (
            <div key={index} className="legend-item">
              <div className="legend-marker" style={{
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
              }}></div>
              <span className="legend-city">{stat.city}</span>
              <span className="legend-count">({Number(stat.count || 0).toLocaleString()} customers)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BranchMap;
