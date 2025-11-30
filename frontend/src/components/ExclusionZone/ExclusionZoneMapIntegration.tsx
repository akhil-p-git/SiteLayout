import React, { useState, useCallback, useEffect } from 'react';
import { useMapContext } from '../../context/MapContext';
import { useAuth } from '../../context/AuthContext';
import { ExclusionZonePanel } from './ExclusionZonePanel';
import { ZoneForm } from './ZoneForm';
import type { ExclusionZone } from '../../types/exclusionZone';
import type { Polygon, MultiPolygon } from 'geojson';
import { getZoneColor } from '../../types/exclusionZone';
import './ExclusionZoneMapIntegration.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ExclusionZoneMapIntegrationProps {
  siteId: string;
  onZonesChange?: (zones: ExclusionZone[]) => void;
  className?: string;
}

export function ExclusionZoneMapIntegration({
  siteId,
  onZonesChange,
  className = '',
}: ExclusionZoneMapIntegrationProps) {
  const { accessToken } = useAuth();
  const { map, setDrawingMode, layerVisibility } = useMapContext();

  const [zones, setZones] = useState<ExclusionZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ExclusionZone | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ExclusionZone | undefined>(undefined);
  const [drawnGeometry, setDrawnGeometry] = useState<Polygon | MultiPolygon | undefined>(undefined);

  // Source and layer IDs for map
  const ZONES_SOURCE_ID = 'exclusion-zones-source';
  const ZONES_FILL_LAYER_ID = 'exclusion-zones-fill';
  const ZONES_OUTLINE_LAYER_ID = 'exclusion-zones-outline';
  const ZONES_BUFFER_LAYER_ID = 'exclusion-zones-buffer';

  // Fetch zones
  const fetchZones = useCallback(async () => {
    if (!accessToken || !siteId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/exclusion-zones/site/${siteId}?includeInactive=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setZones(data.zones);
        onZonesChange?.(data.zones);
      }
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    }
  }, [accessToken, siteId, onZonesChange]);

  // Add zones to map
  const updateMapLayers = useCallback(() => {
    if (!map) return;

    // Create GeoJSON for zones
    const activeZones = zones.filter((z) => z.isActive);
    const features = activeZones.map((zone) => ({
      type: 'Feature' as const,
      id: zone.id,
      properties: {
        id: zone.id,
        name: zone.name,
        type: zone.type,
        color: getZoneColor(zone.type),
        bufferDistance: zone.bufferDistance,
        isSelected: selectedZone?.id === zone.id,
      },
      geometry: zone.geometry,
    }));

    // Buffer features (if available)
    const bufferFeatures = activeZones
      .filter((z) => z.bufferedGeometry && z.bufferDistance > 0)
      .map((zone) => ({
        type: 'Feature' as const,
        id: `${zone.id}-buffer`,
        properties: {
          id: zone.id,
          color: getZoneColor(zone.type),
        },
        geometry: zone.bufferedGeometry!,
      }));

    const geojson = {
      type: 'FeatureCollection' as const,
      features,
    };

    const bufferGeojson = {
      type: 'FeatureCollection' as const,
      features: bufferFeatures,
    };

    // Update or add source
    const source = map.getSource(ZONES_SOURCE_ID);
    if (source) {
      (source as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource(ZONES_SOURCE_ID, {
        type: 'geojson',
        data: geojson,
      });
    }

    const bufferSource = map.getSource(`${ZONES_SOURCE_ID}-buffer`);
    if (bufferSource) {
      (bufferSource as mapboxgl.GeoJSONSource).setData(bufferGeojson);
    } else {
      map.addSource(`${ZONES_SOURCE_ID}-buffer`, {
        type: 'geojson',
        data: bufferGeojson,
      });
    }

    // Add layers if they don't exist
    if (!map.getLayer(ZONES_BUFFER_LAYER_ID)) {
      map.addLayer({
        id: ZONES_BUFFER_LAYER_ID,
        type: 'fill',
        source: `${ZONES_SOURCE_ID}-buffer`,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.1,
        },
      });
    }

    if (!map.getLayer(ZONES_FILL_LAYER_ID)) {
      map.addLayer({
        id: ZONES_FILL_LAYER_ID,
        type: 'fill',
        source: ZONES_SOURCE_ID,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['case', ['get', 'isSelected'], 0.5, 0.3],
        },
      });
    }

    if (!map.getLayer(ZONES_OUTLINE_LAYER_ID)) {
      map.addLayer({
        id: ZONES_OUTLINE_LAYER_ID,
        type: 'line',
        source: ZONES_SOURCE_ID,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['get', 'isSelected'], 3, 2],
          'line-dasharray': [2, 2],
        },
      });
    }

    // Update visibility
    const visibility = layerVisibility.exclusionZones ? 'visible' : 'none';
    if (map.getLayer(ZONES_FILL_LAYER_ID)) {
      map.setLayoutProperty(ZONES_FILL_LAYER_ID, 'visibility', visibility);
    }
    if (map.getLayer(ZONES_OUTLINE_LAYER_ID)) {
      map.setLayoutProperty(ZONES_OUTLINE_LAYER_ID, 'visibility', visibility);
    }
    if (map.getLayer(ZONES_BUFFER_LAYER_ID)) {
      map.setLayoutProperty(ZONES_BUFFER_LAYER_ID, 'visibility', visibility);
    }
  }, [map, zones, selectedZone, layerVisibility.exclusionZones]);

  // Initial fetch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchZones();
  }, [fetchZones]);

  // Update map when zones change
  useEffect(() => {
    if (map) {
      updateMapLayers();
    }
  }, [map, zones, updateMapLayers]);

  // Handle zone selection
  const handleZoneSelect = useCallback(
    (zone: ExclusionZone) => {
      setSelectedZone(zone);

      // Fly to zone on map
      if (map && zone.geometry) {
        const coords =
          zone.geometry.type === 'Polygon'
            ? zone.geometry.coordinates[0]
            : zone.geometry.coordinates[0][0];

        // Calculate bounds
        let minLng = Infinity,
          maxLng = -Infinity;
        let minLat = Infinity,
          maxLat = -Infinity;

        for (const coord of coords) {
          const [lng, lat] = coord as [number, number];
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }

        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 100, duration: 1000 }
        );
      }
    },
    [map]
  );

  // Handle create zone
  const handleCreateZone = useCallback(() => {
    setEditingZone(undefined);
    setDrawnGeometry(undefined);
    setIsFormOpen(true);
    setDrawingMode('draw_polygon');
  }, [setDrawingMode]);

  // Handle edit zone
  const handleEditZone = useCallback((zone: ExclusionZone) => {
    setEditingZone(zone);
    setDrawnGeometry(undefined);
    setIsFormOpen(true);
  }, []);

  // Handle delete zone
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteZone = useCallback(
    (zoneId: string) => {
      fetchZones();
    },
    [fetchZones]
  );

  // Handle form save
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFormSave = useCallback(
    (zone: ExclusionZone) => {
      setIsFormOpen(false);
      setDrawnGeometry(undefined);
      setEditingZone(undefined);
      setDrawingMode('simple_select');
      fetchZones();
    },
    [fetchZones, setDrawingMode]
  );

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    setIsFormOpen(false);
    setDrawnGeometry(undefined);
    setEditingZone(undefined);
    setDrawingMode('simple_select');
  }, [setDrawingMode]);

  // Handle drawn feature from map
  const handleFeatureDrawn = useCallback((feature: GeoJSON.Feature) => {
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      setDrawnGeometry(feature.geometry as Polygon | MultiPolygon);
    }
  }, []);

  // Expose feature handler for parent component
  useEffect(() => {
    // This allows the parent MapView to pass drawn features to us
    (
      window as { __exclusionZoneFeatureHandler?: typeof handleFeatureDrawn }
    ).__exclusionZoneFeatureHandler = handleFeatureDrawn;

    return () => {
      delete (window as { __exclusionZoneFeatureHandler?: typeof handleFeatureDrawn })
        .__exclusionZoneFeatureHandler;
    };
  }, [handleFeatureDrawn]);

  // Clean up map layers on unmount
  useEffect(() => {
    return () => {
      if (map) {
        if (map.getLayer(ZONES_FILL_LAYER_ID)) map.removeLayer(ZONES_FILL_LAYER_ID);
        if (map.getLayer(ZONES_OUTLINE_LAYER_ID)) map.removeLayer(ZONES_OUTLINE_LAYER_ID);
        if (map.getLayer(ZONES_BUFFER_LAYER_ID)) map.removeLayer(ZONES_BUFFER_LAYER_ID);
        if (map.getSource(ZONES_SOURCE_ID)) map.removeSource(ZONES_SOURCE_ID);
        if (map.getSource(`${ZONES_SOURCE_ID}-buffer`))
          map.removeSource(`${ZONES_SOURCE_ID}-buffer`);
      }
    };
  }, [map]);

  return (
    <div className={`exclusion-zone-map-integration ${className}`}>
      <ExclusionZonePanel
        siteId={siteId}
        selectedZoneId={selectedZone?.id}
        onZoneSelect={handleZoneSelect}
        onZoneCreate={handleCreateZone}
        onZoneEdit={handleEditZone}
        onZoneDelete={handleDeleteZone}
      />

      {/* Zone form modal/overlay */}
      {isFormOpen && (
        <div className="zone-form-overlay">
          <div className="zone-form-container">
            <ZoneForm
              siteId={siteId}
              zone={editingZone}
              geometry={drawnGeometry}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />

            {/* Drawing instructions when creating new zone */}
            {!editingZone && !drawnGeometry && (
              <div className="drawing-instructions">
                <div className="instruction-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                  </svg>
                </div>
                <p>Click on the map to draw the exclusion zone boundary.</p>
                <p className="hint">Click to add points, double-click to complete.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExclusionZoneMapIntegration;
