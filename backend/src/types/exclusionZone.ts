/**
 * Exclusion Zone Types
 *
 * Types and interfaces for exclusion zone management.
 */

import type { Feature, Polygon, MultiPolygon } from 'geojson';

/**
 * Exclusion zone classification types
 */
export enum ExclusionZoneType {
  WETLAND = 'wetland',
  SETBACK = 'setback',
  EASEMENT = 'easement',
  ENVIRONMENTAL = 'environmental',
  CULTURAL = 'cultural',
  INFRASTRUCTURE = 'infrastructure',
  SLOPE = 'slope',
  FLOOD = 'flood',
  CUSTOM = 'custom',
}

/**
 * Default buffer distances for each zone type (in meters)
 */
export const DEFAULT_BUFFER_DISTANCES: Record<ExclusionZoneType, number> = {
  [ExclusionZoneType.WETLAND]: 50,
  [ExclusionZoneType.SETBACK]: 30,
  [ExclusionZoneType.EASEMENT]: 0,
  [ExclusionZoneType.ENVIRONMENTAL]: 100,
  [ExclusionZoneType.CULTURAL]: 50,
  [ExclusionZoneType.INFRASTRUCTURE]: 25,
  [ExclusionZoneType.SLOPE]: 0,
  [ExclusionZoneType.FLOOD]: 0,
  [ExclusionZoneType.CUSTOM]: 0,
};

/**
 * Zone type display colors (for map visualization)
 */
export const ZONE_TYPE_COLORS: Record<ExclusionZoneType, string> = {
  [ExclusionZoneType.WETLAND]: '#1E90FF', // Dodger Blue
  [ExclusionZoneType.SETBACK]: '#FF6347', // Tomato
  [ExclusionZoneType.EASEMENT]: '#FFD700', // Gold
  [ExclusionZoneType.ENVIRONMENTAL]: '#32CD32', // Lime Green
  [ExclusionZoneType.CULTURAL]: '#9370DB', // Medium Purple
  [ExclusionZoneType.INFRASTRUCTURE]: '#808080', // Gray
  [ExclusionZoneType.SLOPE]: '#FF8C00', // Dark Orange
  [ExclusionZoneType.FLOOD]: '#4169E1', // Royal Blue
  [ExclusionZoneType.CUSTOM]: '#A0522D', // Sienna
};

/**
 * Zone type labels for display
 */
export const ZONE_TYPE_LABELS: Record<ExclusionZoneType, string> = {
  [ExclusionZoneType.WETLAND]: 'Wetland',
  [ExclusionZoneType.SETBACK]: 'Property Setback',
  [ExclusionZoneType.EASEMENT]: 'Easement',
  [ExclusionZoneType.ENVIRONMENTAL]: 'Environmental Protection',
  [ExclusionZoneType.CULTURAL]: 'Cultural/Archaeological',
  [ExclusionZoneType.INFRASTRUCTURE]: 'Infrastructure',
  [ExclusionZoneType.SLOPE]: 'Steep Slope',
  [ExclusionZoneType.FLOOD]: 'Flood Zone',
  [ExclusionZoneType.CUSTOM]: 'Custom',
};

/**
 * Exclusion zone data structure
 */
export interface ExclusionZone {
  id: string;
  siteId: string;
  name: string;
  type: ExclusionZoneType;
  description?: string;
  geometry: Polygon | MultiPolygon;
  bufferDistance: number; // in meters
  bufferedGeometry?: Polygon | MultiPolygon;
  area: number; // in square meters
  bufferedArea?: number; // in square meters
  properties: Record<string, unknown>;
  source: 'drawn' | 'imported' | 'generated';
  sourceFile?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Input for creating a new exclusion zone
 */
export interface CreateExclusionZoneInput {
  siteId: string;
  name: string;
  type: ExclusionZoneType;
  description?: string;
  geometry: Polygon | MultiPolygon;
  bufferDistance?: number;
  properties?: Record<string, unknown>;
  source?: 'drawn' | 'imported' | 'generated';
  sourceFile?: string;
}

/**
 * Input for updating an exclusion zone
 */
export interface UpdateExclusionZoneInput {
  name?: string;
  type?: ExclusionZoneType;
  description?: string;
  geometry?: Polygon | MultiPolygon;
  bufferDistance?: number;
  properties?: Record<string, unknown>;
  isActive?: boolean;
}

/**
 * Exclusion zone validation result
 */
export interface ZoneValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  withinBoundary: boolean;
  overlapPercentage?: number;
  intersectingZones?: string[];
}

/**
 * Exclusion zone summary for a site
 */
export interface ExclusionZoneSummary {
  siteId: string;
  totalZones: number;
  activeZones: number;
  totalExcludedArea: number; // in square meters
  totalBufferedArea: number; // in square meters
  excludedPercentage: number;
  byType: Record<
    ExclusionZoneType,
    {
      count: number;
      area: number;
    }
  >;
}

/**
 * Buffer calculation options
 */
export interface BufferOptions {
  distance: number; // in meters
  segments?: number; // number of segments for circular buffers (default 32)
  endCapStyle?: 'round' | 'flat' | 'square';
  joinStyle?: 'round' | 'mitre' | 'bevel';
}

/**
 * GeoJSON Feature for exclusion zone
 */
export type ExclusionZoneFeature = Feature<
  Polygon | MultiPolygon,
  {
    id: string;
    name: string;
    type: ExclusionZoneType;
    bufferDistance: number;
    area: number;
    isActive: boolean;
    isBuffered?: boolean;
  }
>;

/**
 * Import result for batch zone import
 */
export interface ZoneImportResult {
  success: boolean;
  imported: number;
  failed: number;
  zones: ExclusionZone[];
  errors: Array<{
    index: number;
    name?: string;
    error: string;
  }>;
}
