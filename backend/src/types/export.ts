/**
 * Export Types
 *
 * Type definitions for KMZ and GeoJSON export functionality.
 */

import type { Polygon, MultiPolygon, LineString, Point, Feature, FeatureCollection } from 'geojson';

/**
 * Export format options
 */
export enum ExportFormat {
  GEOJSON = 'geojson',
  KMZ = 'kmz',
  KML = 'kml',
}

/**
 * Layer types that can be exported
 */
export enum ExportLayerType {
  BOUNDARY = 'boundary',
  ASSETS = 'assets',
  ROADS = 'roads',
  EXCLUSION_ZONES = 'exclusion_zones',
  CONTOURS = 'contours',
  SLOPE_AREAS = 'slope_areas',
}

/**
 * KML style definition
 */
export interface KMLStyle {
  id: string;
  lineColor: string; // AABBGGRR format
  lineWidth: number;
  fillColor: string; // AABBGGRR format
  labelColor?: string;
  iconHref?: string;
  iconScale?: number;
}

/**
 * Asset export data
 */
export interface ExportAsset {
  id: string;
  type: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  rotation: number;
  footprint: Polygon;
  earthworkVolume?: number;
  cutVolume?: number;
  fillVolume?: number;
}

/**
 * Road segment export data
 */
export interface ExportRoadSegment {
  id: string;
  startPoint: [number, number];
  endPoint: [number, number];
  length: number;
  gradient: number;
  width: number;
  geometry: LineString;
}

/**
 * Road network export data
 */
export interface ExportRoadNetwork {
  entryPoint: Point;
  segments: ExportRoadSegment[];
  totalLength: number;
  maxGradient: number;
}

/**
 * Exclusion zone export data
 */
export interface ExportExclusionZone {
  id: string;
  name: string;
  type: string;
  geometry: Polygon | MultiPolygon;
  buffer?: number;
  reason?: string;
}

/**
 * Full layout export data
 */
export interface LayoutExportData {
  projectId: string;
  projectName: string;
  exportDate: string;
  crs: string;
  boundary: Polygon | MultiPolygon;
  assets: ExportAsset[];
  roads?: ExportRoadNetwork;
  exclusionZones: ExportExclusionZone[];
  metadata: {
    totalArea: number;
    assetCount: number;
    roadLength: number;
    exclusionZoneCount: number;
    [key: string]: unknown;
  };
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  layers: ExportLayerType[];
  includeStyles: boolean;
  coordinatePrecision: number;
  includeMetadata: boolean;
  filename?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename: string;
  size: number;
  data?: Buffer | string;
  url?: string;
  error?: string;
}

/**
 * GeoJSON export properties for assets
 */
export interface GeoJSONAssetProperties {
  id: string;
  type: string;
  name: string;
  layerType: 'asset';
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  rotation: number;
  earthwork?: {
    cutVolume: number;
    fillVolume: number;
    netVolume: number;
  };
}

/**
 * GeoJSON export properties for roads
 */
export interface GeoJSONRoadProperties {
  id: string;
  layerType: 'road';
  segmentIndex: number;
  length: number;
  gradient: number;
  width: number;
}

/**
 * GeoJSON export properties for exclusion zones
 */
export interface GeoJSONExclusionZoneProperties {
  id: string;
  layerType: 'exclusion_zone';
  name: string;
  zoneType: string;
  buffer?: number;
  reason?: string;
}

/**
 * GeoJSON export properties for boundary
 */
export interface GeoJSONBoundaryProperties {
  id: string;
  layerType: 'boundary';
  projectName: string;
  totalArea: number;
}

/**
 * Default KML styles for different layer types
 */
export const DEFAULT_KML_STYLES: Record<ExportLayerType, KMLStyle> = {
  [ExportLayerType.BOUNDARY]: {
    id: 'boundary-style',
    lineColor: 'ff0000ff', // Red
    lineWidth: 3,
    fillColor: '330000ff', // Semi-transparent red
  },
  [ExportLayerType.ASSETS]: {
    id: 'asset-style',
    lineColor: 'ff00ff00', // Green
    lineWidth: 2,
    fillColor: '6600ff00', // Semi-transparent green
  },
  [ExportLayerType.ROADS]: {
    id: 'road-style',
    lineColor: 'ff808080', // Gray
    lineWidth: 4,
    fillColor: '00000000', // Transparent
  },
  [ExportLayerType.EXCLUSION_ZONES]: {
    id: 'exclusion-style',
    lineColor: 'ff0000ff', // Red
    lineWidth: 2,
    fillColor: '44ff0000', // Semi-transparent blue (ABGR)
  },
  [ExportLayerType.CONTOURS]: {
    id: 'contour-style',
    lineColor: 'ff964b00', // Brown
    lineWidth: 1,
    fillColor: '00000000', // Transparent
  },
  [ExportLayerType.SLOPE_AREAS]: {
    id: 'slope-style',
    lineColor: 'ff00ffff', // Yellow
    lineWidth: 1,
    fillColor: '4400ffff', // Semi-transparent yellow
  },
};

/**
 * Asset type specific colors for KML
 */
export const ASSET_KML_COLORS: Record<string, string> = {
  bess: 'ff00ff00',        // Green
  substation: 'ff0080ff',   // Orange
  o_and_m: 'ffff8000',      // Cyan
  parking: 'ff808080',      // Gray
  laydown: 'ff00ffff',      // Yellow
  solar_panel: 'ff0000ff',  // Blue
  inverter: 'ff800080',     // Purple
  transformer: 'ff008080',  // Teal
};
