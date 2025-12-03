import { useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { useMapContext } from '../../context/MapContext';
import type { DrawingMode } from '../../types/map';
import './Map.css';

// Mapbox access token - should be set via environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MapProps {
  className?: string;
  onFeatureCreate?: (feature: GeoJSON.Feature) => void;
  onFeatureUpdate?: (feature: GeoJSON.Feature) => void;
  onFeatureDelete?: (featureIds: string[]) => void;
  onFeatureSelect?: (featureId: string | null) => void;
}

export function Map({
  className = '',
  onFeatureCreate,
  onFeatureUpdate,
  onFeatureDelete,
  onFeatureSelect,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const {
    setMap,
    setDraw,
    setIsLoaded,
    setViewState,
    viewState,
    drawingMode,
    setDrawingMode,
    setSelectedFeatureId,
  } = useMapContext();

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    if (!MAPBOX_TOKEN) {
      console.warn('Mapbox token not set. Add VITE_MAPBOX_TOKEN to your .env file.');
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
      accessToken: MAPBOX_TOKEN,
      attributionControl: true,
      preserveDrawingBuffer: true,
    });

    // Add navigation controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.addControl(new mapboxgl.ScaleControl({ unit: 'imperial' }), 'bottom-left');
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );

    // Initialize drawing tools
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: false,
        line_string: false,
        point: false,
        trash: false,
      },
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill - inactive
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.3,
          },
        },
        // Polygon fill - active
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#f97316',
            'fill-opacity': 0.4,
          },
        },
        // Polygon stroke - inactive
        {
          id: 'gl-draw-polygon-stroke-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          paint: {
            'line-color': '#ef4444',
            'line-width': 2,
          },
        },
        // Polygon stroke - active
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'line-color': '#f97316',
            'line-width': 3,
          },
        },
        // Line - inactive
        {
          id: 'gl-draw-line-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString']],
          paint: {
            'line-color': '#3b82f6',
            'line-width': 3,
          },
        },
        // Line - active
        {
          id: 'gl-draw-line-active',
          type: 'line',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'LineString']],
          paint: {
            'line-color': '#6366f1',
            'line-width': 4,
          },
        },
        // Vertex point
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 6,
            'circle-color': '#ffffff',
            'circle-stroke-color': '#3b82f6',
            'circle-stroke-width': 2,
          },
        },
        // Midpoint
        {
          id: 'gl-draw-midpoint',
          type: 'circle',
          filter: ['all', ['==', 'meta', 'midpoint'], ['==', '$type', 'Point']],
          paint: {
            'circle-radius': 4,
            'circle-color': '#3b82f6',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          },
        },
        // Standalone Point - inactive (entry points, markers)
        {
          id: 'gl-draw-point-inactive',
          type: 'circle',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
          paint: {
            'circle-radius': 8,
            'circle-color': '#f59e0b',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        },
        // Standalone Point - active
        {
          id: 'gl-draw-point-active',
          type: 'circle',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Point'], ['==', 'meta', 'feature']],
          paint: {
            'circle-radius': 10,
            'circle-color': '#ea580c',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 3,
          },
        },
      ],
    });

    map.addControl(draw as unknown as mapboxgl.IControl);
    drawRef.current = draw;
    setDraw(draw as unknown as import('../../types/map').MapboxDrawInstance);

    // Map load event
    map.on('load', () => {
      setIsLoaded(true);
      setMap(map);

      // Add terrain source for 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    });

    // Track view state changes
    map.on('moveend', () => {
      const center = map.getCenter();
      setViewState({
        longitude: center.lng,
        latitude: center.lat,
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      });
    });

    // Drawing events
    map.on('draw.create', (e) => {
      if (onFeatureCreate && e.features.length > 0) {
        onFeatureCreate(e.features[0]);
      }
    });

    map.on('draw.update', (e) => {
      if (onFeatureUpdate && e.features.length > 0) {
        onFeatureUpdate(e.features[0]);
      }
    });

    map.on('draw.delete', (e) => {
      if (onFeatureDelete && e.features.length > 0) {
        onFeatureDelete(e.features.map((f: GeoJSON.Feature) => f.id as string));
      }
    });

    map.on('draw.selectionchange', (e) => {
      const selectedId = e.features.length > 0 ? (e.features[0].id as string) : null;
      setSelectedFeatureId(selectedId);
      onFeatureSelect?.(selectedId);
    });

    // Store map reference
    mapRef.current = map;

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
      setMap(null);
      setDraw(null);
      setIsLoaded(false);
    };
  }, [viewState, setMap, setDraw, setIsLoaded, setViewState, setSelectedFeatureId, onFeatureCreate, onFeatureUpdate, onFeatureDelete, onFeatureSelect]);

  // Update drawing mode
  useEffect(() => {
    if (!drawRef.current) return;

    const modeMap: Record<DrawingMode, string> = {
      simple_select: 'simple_select',
      draw_polygon: 'draw_polygon',
      draw_line_string: 'draw_line_string',
      draw_point: 'draw_point',
      static: 'static',
    };

    try {
      drawRef.current.changeMode(modeMap[drawingMode]);
    } catch {
      // Mode change may fail if no features selected
    }
  }, [drawingMode]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawingMode('simple_select');
        drawRef.current?.changeMode('simple_select');
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (drawRef.current) {
          const selectedIds = drawRef.current.getSelectedIds();
          if (selectedIds.length > 0) {
            drawRef.current.delete(selectedIds);
            onFeatureDelete?.(selectedIds);
          }
        }
      }
    },
    [setDrawingMode, onFeatureDelete]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={`map-container ${className}`}>
      <div ref={mapContainerRef} className="map" />
    </div>
  );
}

export default Map;
