/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef } from 'react';
import { useMapContext } from '../../context/MapContext';
import { TERRAIN_COLOR_RAMPS } from '../../types/map';

interface TerrainOverlayProps {
  demUrl?: string;
}

export function TerrainOverlay({
  demUrl,
}: TerrainOverlayProps) {
  const { map, isLoaded, terrainOverlay, layerVisibility } = useMapContext();
  const setupRef = useRef(false);

  // Set up terrain sources and layers
  useEffect(() => {
    if (!map || !isLoaded || setupRef.current) return;

    // Add hillshade source if not exists
    if (!map.getSource('hillshade-source')) {
      map.addSource('hillshade-source', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }

    // Add custom DEM source if provided
    if (demUrl && !map.getSource('custom-dem')) {
      map.addSource('custom-dem', {
        type: 'raster-dem',
        url: demUrl,
        tileSize: 512,
      });
    }

    // Add contour source
    if (!map.getSource('contours')) {
      map.addSource('contours', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-terrain-v2',
      });
    }

    // Add hillshade layer
    if (!map.getLayer('hillshade')) {
      map.addLayer(
        {
          id: 'hillshade',
          type: 'hillshade',
          source: 'hillshade-source',
          layout: { visibility: 'none' },
          paint: {
            'hillshade-exaggeration': 0.5,
            'hillshade-shadow-color': '#000000',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-accent-color': '#000000',
          },
        },
        'waterway-label'
      );
    }

    // Add contour lines layer
    if (!map.getLayer('contour-lines')) {
      map.addLayer(
        {
          id: 'contour-lines',
          type: 'line',
          source: 'contours',
          'source-layer': 'contour',
          layout: {
            visibility: 'none',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#873600',
            'line-opacity': 0.5,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12,
              ['case', ['==', ['%', ['get', 'ele'], 100], 0], 1, 0.5],
              16,
              ['case', ['==', ['%', ['get', 'ele'], 100], 0], 2, 1],
            ],
          },
        },
        'waterway-label'
      );
    }

    // Add contour labels
    if (!map.getLayer('contour-labels')) {
      map.addLayer(
        {
          id: 'contour-labels',
          type: 'symbol',
          source: 'contours',
          'source-layer': 'contour',
          filter: ['==', ['%', ['get', 'ele'], 100], 0],
          layout: {
            visibility: 'none',
            'symbol-placement': 'line',
            'text-field': ['concat', ['get', 'ele'], 'm'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
            'text-size': 10,
          },
          paint: {
            'text-color': '#873600',
            'text-halo-color': 'rgba(255, 255, 255, 0.8)',
            'text-halo-width': 1,
          },
        },
        'waterway-label'
      );
    }

    setupRef.current = true;
  }, [map, isLoaded, demUrl]);

  // Update terrain overlay visibility
  useEffect(() => {
    if (!map || !isLoaded) return;

    const showHillshade = terrainOverlay !== 'none';

    // Toggle hillshade
    if (map.getLayer('hillshade')) {
      map.setLayoutProperty('hillshade', 'visibility', showHillshade ? 'visible' : 'none');
    }

    // Toggle 3D terrain
    if (showHillshade) {
      map.setTerrain({ source: 'hillshade-source', exaggeration: 1.5 });
    } else {
      map.setTerrain(null);
    }

    // Update hillshade paint based on overlay type
    if (showHillshade && map.getLayer('hillshade')) {
      const overlayConfig = {
        elevation: {
          'hillshade-exaggeration': 0.7,
          'hillshade-shadow-color': '#22c55e',
          'hillshade-highlight-color': '#dc2626',
        },
        slope: {
          'hillshade-exaggeration': 1.0,
          'hillshade-shadow-color': '#22c55e',
          'hillshade-highlight-color': '#dc2626',
        },
        aspect: {
          'hillshade-exaggeration': 0.5,
          'hillshade-shadow-color': '#3b82f6',
          'hillshade-highlight-color': '#eab308',
        },
      };

      const config = overlayConfig[terrainOverlay as keyof typeof overlayConfig];
      if (config) {
        Object.entries(config).forEach(([prop, value]) => {
          map.setPaintProperty('hillshade', prop, value);
        });
      }
    }
  }, [map, isLoaded, terrainOverlay]);

  // Update contour visibility
  useEffect(() => {
    if (!map || !isLoaded) return;

    const showContours = layerVisibility.contours;

    if (map.getLayer('contour-lines')) {
      map.setLayoutProperty('contour-lines', 'visibility', showContours ? 'visible' : 'none');
    }

    if (map.getLayer('contour-labels')) {
      map.setLayoutProperty('contour-labels', 'visibility', showContours ? 'visible' : 'none');
    }
  }, [map, isLoaded, layerVisibility.contours]);

  return null;
}

// Helper function to generate color stops for terrain raster
export function getTerrainColorExpression(
  type: 'elevation' | 'slope' | 'aspect',
  minValue: number,
  maxValue: number
): mapboxgl.Expression {
  const colorRamp = TERRAIN_COLOR_RAMPS[type];
  const range = maxValue - minValue;

  const stops: (number | string)[] = [];
  colorRamp.forEach(([position, color]) => {
    stops.push(minValue + position * range);
    stops.push(color);
  });

  return ['interpolate', ['linear'], ['raster-value'], ...stops] as mapboxgl.Expression;
}

export default TerrainOverlay;
