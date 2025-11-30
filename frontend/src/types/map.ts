// Map-related TypeScript types

import type { Map as MapboxMap, LngLatBoundsLike } from 'mapbox-gl';
import type { GeoJSON } from 'geojson';

// Layer visibility configuration
export interface LayerVisibility {
  boundary: boolean;
  exclusionZones: boolean;
  terrain: boolean;
  slope: boolean;
  aspect: boolean;
  assets: boolean;
  roads: boolean;
  entryPoints: boolean;
  contours: boolean;
}

// Terrain overlay types
export type TerrainOverlayType = 'elevation' | 'slope' | 'aspect' | 'none';

// Drawing mode types
export type DrawingMode =
  | 'simple_select'
  | 'draw_polygon'
  | 'draw_line_string'
  | 'draw_point'
  | 'static';

// Map view state
export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

// Site boundary data
export interface SiteBoundary {
  id: string;
  name: string;
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
  area: number;
}

// Exclusion zone data
export interface ExclusionZoneData {
  id: string;
  name: string;
  type: 'wetland' | 'setback' | 'easement' | 'environmental' | 'custom';
  geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon;
  buffer: number;
}

// Asset placement data
export interface AssetPlacementData {
  id: string;
  name: string;
  type: string;
  geometry: GeoJSON.Polygon;
  centroid: GeoJSON.Point;
  elevation?: {
    min: number;
    max: number;
    avg: number;
  };
}

// Road segment data
export interface RoadSegmentData {
  id: string;
  type: 'access' | 'internal' | 'emergency';
  geometry: GeoJSON.LineString;
  length: number;
  maxGrade: number;
}

// Entry point data
export interface EntryPointData {
  id: string;
  geometry: GeoJSON.Point;
  name?: string;
}

// Elevation profile point
export interface ElevationProfilePoint {
  distance: number;
  elevation: number;
  longitude: number;
  latitude: number;
}

// Map context state
export interface MapContextState {
  map: MapboxMap | null;
  isLoaded: boolean;
  viewState: MapViewState;
  layerVisibility: LayerVisibility;
  terrainOverlay: TerrainOverlayType;
  drawingMode: DrawingMode;
  selectedFeatureId: string | null;
  isDrawing: boolean;
}

// Map context actions
export interface MapContextActions {
  setMap: (map: MapboxMap | null) => void;
  setIsLoaded: (loaded: boolean) => void;
  setViewState: (viewState: Partial<MapViewState>) => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setLayerVisibility: (visibility: Partial<LayerVisibility>) => void;
  setTerrainOverlay: (overlay: TerrainOverlayType) => void;
  setDrawingMode: (mode: DrawingMode) => void;
  setSelectedFeatureId: (id: string | null) => void;
  flyTo: (center: [number, number], zoom?: number) => void;
  fitBounds: (bounds: LngLatBoundsLike, padding?: number) => void;
}

// Combined map context
export interface MapContextValue extends MapContextState, MapContextActions {}

// Layer style configuration
export interface LayerStyle {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
}

// Default layer styles
export const DEFAULT_LAYER_STYLES: Record<string, LayerStyle> = {
  boundary: {
    fillColor: '#3b82f6',
    fillOpacity: 0.1,
    strokeColor: '#3b82f6',
    strokeWidth: 3,
    strokeOpacity: 1,
  },
  exclusionZone: {
    fillColor: '#ef4444',
    fillOpacity: 0.3,
    strokeColor: '#ef4444',
    strokeWidth: 2,
    strokeOpacity: 1,
  },
  asset: {
    fillColor: '#22c55e',
    fillOpacity: 0.5,
    strokeColor: '#16a34a',
    strokeWidth: 2,
    strokeOpacity: 1,
  },
  road: {
    strokeColor: '#78716c',
    strokeWidth: 4,
    strokeOpacity: 0.8,
  },
  entryPoint: {
    fillColor: '#f59e0b',
    strokeColor: '#d97706',
    strokeWidth: 2,
  },
};

// Terrain color ramps
export const TERRAIN_COLOR_RAMPS = {
  elevation: [
    [0, '#22c55e'], // Low - Green
    [0.25, '#84cc16'], // Lime
    [0.5, '#eab308'], // Yellow
    [0.75, '#f97316'], // Orange
    [1, '#dc2626'], // High - Red
  ],
  slope: [
    [0, '#22c55e'], // Flat - Green (good)
    [0.05, '#84cc16'], // 0-5% - Lime
    [0.1, '#eab308'], // 5-10% - Yellow
    [0.15, '#f97316'], // 10-15% - Orange
    [0.2, '#dc2626'], // >15% - Red (bad)
  ],
  aspect: [
    [0, '#3b82f6'], // North - Blue
    [0.25, '#22c55e'], // East - Green
    [0.5, '#eab308'], // South - Yellow
    [0.75, '#ef4444'], // West - Red
    [1, '#3b82f6'], // North - Blue (wrap)
  ],
};

// Exclusion zone type colors
export const EXCLUSION_ZONE_COLORS: Record<string, string> = {
  wetland: '#06b6d4',
  setback: '#f59e0b',
  easement: '#8b5cf6',
  environmental: '#22c55e',
  custom: '#6b7280',
};

// Asset type colors
export const ASSET_TYPE_COLORS: Record<string, string> = {
  bess_container: '#3b82f6',
  bess_array: '#6366f1',
  substation: '#ef4444',
  om_building: '#f97316',
  parking: '#78716c',
  laydown: '#a3a3a3',
  transformer: '#eab308',
  inverter: '#84cc16',
  solar_array: '#22c55e',
  custom: '#ec4899',
};
