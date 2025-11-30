/**
 * Exclusion Zone Types (Frontend)
 */

import type { Polygon, MultiPolygon, Feature, FeatureCollection } from 'geojson';

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

export interface ZoneTypeOption {
  value: ExclusionZoneType;
  label: string;
  color: string;
  defaultBuffer: number;
}

export interface ExclusionZone {
  id: string;
  siteId: string;
  name: string;
  type: ExclusionZoneType;
  description?: string;
  geometry: Polygon | MultiPolygon;
  bufferDistance: number;
  bufferedGeometry?: Polygon | MultiPolygon;
  area: number;
  bufferedArea?: number;
  properties: Record<string, unknown>;
  source: 'drawn' | 'imported' | 'generated';
  sourceFile?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateExclusionZoneInput {
  siteId: string;
  name: string;
  type: ExclusionZoneType;
  description?: string;
  geometry: Polygon | MultiPolygon;
  bufferDistance?: number;
  properties?: Record<string, unknown>;
}

export interface UpdateExclusionZoneInput {
  name?: string;
  type?: ExclusionZoneType;
  description?: string;
  geometry?: Polygon | MultiPolygon;
  bufferDistance?: number;
  properties?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ZoneValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  withinBoundary: boolean;
  overlapPercentage?: number;
  intersectingZones?: string[];
}

export interface ExclusionZoneSummary {
  siteId: string;
  totalZones: number;
  activeZones: number;
  totalExcludedArea: number;
  totalBufferedArea: number;
  excludedPercentage: number;
  byType: Record<ExclusionZoneType, {
    count: number;
    area: number;
  }>;
}

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

export interface BuildableAreaResult {
  siteId: string;
  buildableGeometry: Polygon | MultiPolygon | null;
  buildableArea: number;
  excludedArea: number;
  buildablePercentage: number;
}

export type ExclusionZoneFeature = Feature<Polygon | MultiPolygon, {
  id: string;
  name: string;
  type: ExclusionZoneType;
  bufferDistance: number;
  area: number;
  isActive: boolean;
  isBuffered?: boolean;
}>;

export type ExclusionZoneFeatureCollection = FeatureCollection<Polygon | MultiPolygon>;

// Helper functions
export function formatArea(areaMeters: number): string {
  const acres = areaMeters / 4046.86;
  if (acres < 1) {
    return `${(areaMeters * 10.764).toFixed(0)} sq ft`;
  }
  if (acres >= 640) {
    return `${(acres / 640).toFixed(2)} sq mi`;
  }
  return `${acres.toFixed(2)} acres`;
}

export function getZoneColor(type: ExclusionZoneType): string {
  const colors: Record<ExclusionZoneType, string> = {
    [ExclusionZoneType.WETLAND]: '#1E90FF',
    [ExclusionZoneType.SETBACK]: '#FF6347',
    [ExclusionZoneType.EASEMENT]: '#FFD700',
    [ExclusionZoneType.ENVIRONMENTAL]: '#32CD32',
    [ExclusionZoneType.CULTURAL]: '#9370DB',
    [ExclusionZoneType.INFRASTRUCTURE]: '#808080',
    [ExclusionZoneType.SLOPE]: '#FF8C00',
    [ExclusionZoneType.FLOOD]: '#4169E1',
    [ExclusionZoneType.CUSTOM]: '#A0522D',
  };
  return colors[type] || '#808080';
}

export function getZoneLabel(type: ExclusionZoneType): string {
  const labels: Record<ExclusionZoneType, string> = {
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
  return labels[type] || 'Unknown';
}
