/**
 * Constraint Engine Types
 *
 * Defines the constraint system for validating asset placements
 * against site boundaries, exclusion zones, slopes, and other requirements.
 */

import type { Polygon, MultiPolygon, Point } from 'geojson';

/**
 * Types of constraints that can be applied
 */
export enum ConstraintType {
  BOUNDARY_SETBACK = 'boundary_setback',
  EXCLUSION_ZONE = 'exclusion_zone',
  SLOPE_LIMIT = 'slope_limit',
  ASPECT_RANGE = 'aspect_range',
  INTER_ASSET_BUFFER = 'inter_asset_buffer',
  ACCESS_REQUIREMENT = 'access_requirement',
  TERRAIN_SUITABILITY = 'terrain_suitability',
  CUSTOM = 'custom',
}

/**
 * Severity levels for constraint violations
 */
export enum ViolationSeverity {
  ERROR = 'error', // Hard constraint - cannot proceed
  WARNING = 'warning', // Soft constraint - can override
  INFO = 'info', // Informational - for user awareness
}

/**
 * Asset types that constraints can apply to
 */
export enum AssetType {
  SOLAR_PANEL = 'solar_panel',
  SOLAR_ARRAY = 'solar_array',
  INVERTER = 'inverter',
  TRANSFORMER = 'transformer',
  SUBSTATION = 'substation',
  ACCESS_ROAD = 'access_road',
  FENCE = 'fence',
  COMBINER_BOX = 'combiner_box',
  WEATHER_STATION = 'weather_station',
  STORAGE_BUILDING = 'storage_building',
  ANY = 'any',
}

/**
 * Base constraint definition
 */
export interface Constraint {
  id: string;
  name: string;
  type: ConstraintType;
  description?: string;
  enabled: boolean;
  priority: number; // Higher = more important (1-100)
  severity: ViolationSeverity;
  appliesToAssets: AssetType[];
  parameters: ConstraintParameters;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Union type for constraint-specific parameters
 */
export type ConstraintParameters =
  | BoundarySetbackParams
  | ExclusionZoneParams
  | SlopeLimitParams
  | AspectRangeParams
  | InterAssetBufferParams
  | AccessRequirementParams
  | TerrainSuitabilityParams
  | CustomConstraintParams;

/**
 * Boundary setback constraint parameters
 */
export interface BoundarySetbackParams {
  type: 'boundary_setback';
  minDistance: number; // meters from boundary
  boundaryType?: 'all' | 'property' | 'road' | 'neighbor';
}

/**
 * Exclusion zone avoidance parameters
 */
export interface ExclusionZoneParams {
  type: 'exclusion_zone';
  zoneTypes?: string[]; // If empty, applies to all zone types
  includeBuffer: boolean; // Whether to include the buffer zone
  allowPartialOverlap: boolean;
  maxOverlapPercentage?: number; // 0-100, only if allowPartialOverlap
}

/**
 * Slope limit constraint parameters
 */
export interface SlopeLimitParams {
  type: 'slope_limit';
  maxSlope: number; // degrees or percentage
  slopeUnit: 'degrees' | 'percentage';
  checkMethod: 'average' | 'maximum' | 'any_point';
}

/**
 * Aspect range constraint parameters (for solar optimization)
 */
export interface AspectRangeParams {
  type: 'aspect_range';
  minAspect: number; // 0-360 degrees
  maxAspect: number; // 0-360 degrees
  preferredAspect?: number; // Optimal direction
  tolerance?: number; // Acceptable deviation from preferred
}

/**
 * Inter-asset buffer distance parameters
 */
export interface InterAssetBufferParams {
  type: 'inter_asset_buffer';
  fromAssetType: AssetType;
  toAssetType: AssetType;
  minDistance: number; // meters
  maxDistance?: number; // meters (for access requirements)
}

/**
 * Access requirement parameters
 */
export interface AccessRequirementParams {
  type: 'access_requirement';
  requireRoadAccess: boolean;
  maxDistanceToRoad: number; // meters
  minRoadWidth?: number; // meters
  requireEmergencyAccess?: boolean;
}

/**
 * Terrain suitability parameters
 */
export interface TerrainSuitabilityParams {
  type: 'terrain_suitability';
  maxElevationChange: number; // meters within asset footprint
  requireFlat: boolean;
  flatnessTolerance?: number; // meters
}

/**
 * Custom constraint parameters
 */
export interface CustomConstraintParams {
  type: 'custom';
  expression: string; // Custom validation expression
  variables: Record<string, unknown>;
}

/**
 * Asset placement to validate
 */
export interface AssetPlacement {
  id: string;
  assetType: AssetType;
  geometry: Point | Polygon | MultiPolygon;
  footprint?: Polygon; // Bounding polygon for the asset
  properties: Record<string, unknown>;
  rotation?: number; // degrees
  elevation?: number; // meters
}

/**
 * Constraint violation details
 */
export interface ConstraintViolation {
  constraintId: string;
  constraintName: string;
  constraintType: ConstraintType;
  severity: ViolationSeverity;
  assetId: string;
  assetType: AssetType;
  message: string;
  details: ViolationDetails;
  geometry?: Polygon | MultiPolygon; // Area of violation
  suggestedFix?: SuggestedFix;
}

/**
 * Details specific to violation type
 */
export type ViolationDetails =
  | BoundaryViolationDetails
  | ExclusionZoneViolationDetails
  | SlopeViolationDetails
  | AspectViolationDetails
  | BufferViolationDetails
  | AccessViolationDetails;

export interface BoundaryViolationDetails {
  type: 'boundary';
  currentDistance: number;
  requiredDistance: number;
  violatingEdge?: [number, number][];
}

export interface ExclusionZoneViolationDetails {
  type: 'exclusion_zone';
  zoneId: string;
  zoneName: string;
  zoneType: string;
  overlapArea: number;
  overlapPercentage: number;
}

export interface SlopeViolationDetails {
  type: 'slope';
  currentSlope: number;
  maxAllowedSlope: number;
  slopeUnit: 'degrees' | 'percentage';
  violationArea?: Polygon;
}

export interface AspectViolationDetails {
  type: 'aspect';
  currentAspect: number;
  allowedRange: [number, number];
}

export interface BufferViolationDetails {
  type: 'buffer';
  conflictingAssetId: string;
  conflictingAssetType: AssetType;
  currentDistance: number;
  requiredDistance: number;
}

export interface AccessViolationDetails {
  type: 'access';
  nearestRoadDistance: number;
  requiredDistance: number;
  nearestRoadId?: string;
}

/**
 * Suggested fix for a violation
 */
export interface SuggestedFix {
  description: string;
  action: 'move' | 'resize' | 'rotate' | 'remove' | 'modify_constraint';
  suggestedPosition?: [number, number];
  suggestedRotation?: number;
  estimatedCost?: number; // Relative cost of the fix
}

/**
 * Result of constraint validation
 */
export interface ValidationResult {
  valid: boolean;
  violations: ConstraintViolation[];
  warnings: ConstraintViolation[];
  info: ConstraintViolation[];
  checkedConstraints: number;
  passedConstraints: number;
  failedConstraints: number;
  timestamp: Date;
  validationTimeMs: number;
}

/**
 * Batch validation result for multiple assets
 */
export interface BatchValidationResult {
  overallValid: boolean;
  assetResults: Map<string, ValidationResult>;
  summary: {
    totalAssets: number;
    validAssets: number;
    invalidAssets: number;
    totalViolations: number;
    violationsByType: Record<ConstraintType, number>;
    violationsBySeverity: Record<ViolationSeverity, number>;
  };
  timestamp: Date;
  validationTimeMs: number;
}

/**
 * Constraint set - a collection of constraints for a project
 */
export interface ConstraintSet {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  constraints: Constraint[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Default constraint configurations by asset type
 */
export const DEFAULT_ASSET_CONSTRAINTS: Record<AssetType, Partial<Constraint>[]> = {
  [AssetType.SOLAR_PANEL]: [
    {
      type: ConstraintType.SLOPE_LIMIT,
      parameters: {
        type: 'slope_limit',
        maxSlope: 15,
        slopeUnit: 'degrees',
        checkMethod: 'average',
      },
      priority: 80,
      severity: ViolationSeverity.ERROR,
    },
    {
      type: ConstraintType.BOUNDARY_SETBACK,
      parameters: { type: 'boundary_setback', minDistance: 15 },
      priority: 70,
      severity: ViolationSeverity.ERROR,
    },
  ],
  [AssetType.SOLAR_ARRAY]: [
    {
      type: ConstraintType.SLOPE_LIMIT,
      parameters: {
        type: 'slope_limit',
        maxSlope: 10,
        slopeUnit: 'degrees',
        checkMethod: 'maximum',
      },
      priority: 85,
      severity: ViolationSeverity.ERROR,
    },
    {
      type: ConstraintType.EXCLUSION_ZONE,
      parameters: { type: 'exclusion_zone', includeBuffer: true, allowPartialOverlap: false },
      priority: 90,
      severity: ViolationSeverity.ERROR,
    },
  ],
  [AssetType.INVERTER]: [
    {
      type: ConstraintType.SLOPE_LIMIT,
      parameters: {
        type: 'slope_limit',
        maxSlope: 5,
        slopeUnit: 'degrees',
        checkMethod: 'average',
      },
      priority: 75,
      severity: ViolationSeverity.ERROR,
    },
    {
      type: ConstraintType.ACCESS_REQUIREMENT,
      parameters: { type: 'access_requirement', requireRoadAccess: true, maxDistanceToRoad: 50 },
      priority: 60,
      severity: ViolationSeverity.WARNING,
    },
  ],
  [AssetType.TRANSFORMER]: [
    {
      type: ConstraintType.SLOPE_LIMIT,
      parameters: {
        type: 'slope_limit',
        maxSlope: 3,
        slopeUnit: 'degrees',
        checkMethod: 'maximum',
      },
      priority: 80,
      severity: ViolationSeverity.ERROR,
    },
    {
      type: ConstraintType.BOUNDARY_SETBACK,
      parameters: { type: 'boundary_setback', minDistance: 30 },
      priority: 75,
      severity: ViolationSeverity.ERROR,
    },
  ],
  [AssetType.SUBSTATION]: [
    {
      type: ConstraintType.SLOPE_LIMIT,
      parameters: {
        type: 'slope_limit',
        maxSlope: 2,
        slopeUnit: 'degrees',
        checkMethod: 'maximum',
      },
      priority: 90,
      severity: ViolationSeverity.ERROR,
    },
    {
      type: ConstraintType.ACCESS_REQUIREMENT,
      parameters: {
        type: 'access_requirement',
        requireRoadAccess: true,
        maxDistanceToRoad: 30,
        requireEmergencyAccess: true,
      },
      priority: 85,
      severity: ViolationSeverity.ERROR,
    },
  ],
  [AssetType.ACCESS_ROAD]: [
    {
      type: ConstraintType.SLOPE_LIMIT,
      parameters: {
        type: 'slope_limit',
        maxSlope: 12,
        slopeUnit: 'percentage',
        checkMethod: 'any_point',
      },
      priority: 80,
      severity: ViolationSeverity.ERROR,
    },
  ],
  [AssetType.FENCE]: [
    {
      type: ConstraintType.BOUNDARY_SETBACK,
      parameters: { type: 'boundary_setback', minDistance: 1 },
      priority: 50,
      severity: ViolationSeverity.WARNING,
    },
  ],
  [AssetType.COMBINER_BOX]: [
    {
      type: ConstraintType.SLOPE_LIMIT,
      parameters: {
        type: 'slope_limit',
        maxSlope: 10,
        slopeUnit: 'degrees',
        checkMethod: 'average',
      },
      priority: 60,
      severity: ViolationSeverity.WARNING,
    },
  ],
  [AssetType.WEATHER_STATION]: [
    {
      type: ConstraintType.INTER_ASSET_BUFFER,
      parameters: {
        type: 'inter_asset_buffer',
        fromAssetType: AssetType.WEATHER_STATION,
        toAssetType: AssetType.SOLAR_ARRAY,
        minDistance: 20,
      },
      priority: 50,
      severity: ViolationSeverity.WARNING,
    },
  ],
  [AssetType.STORAGE_BUILDING]: [
    {
      type: ConstraintType.SLOPE_LIMIT,
      parameters: {
        type: 'slope_limit',
        maxSlope: 3,
        slopeUnit: 'degrees',
        checkMethod: 'maximum',
      },
      priority: 75,
      severity: ViolationSeverity.ERROR,
    },
    {
      type: ConstraintType.ACCESS_REQUIREMENT,
      parameters: { type: 'access_requirement', requireRoadAccess: true, maxDistanceToRoad: 20 },
      priority: 70,
      severity: ViolationSeverity.ERROR,
    },
  ],
  [AssetType.ANY]: [],
};

/**
 * Helper function to get slope limit by asset type
 */
export function getDefaultSlopeLimit(assetType: AssetType): number {
  const constraints = DEFAULT_ASSET_CONSTRAINTS[assetType];
  const slopeConstraint = constraints?.find((c) => c.type === ConstraintType.SLOPE_LIMIT);
  if (slopeConstraint?.parameters && 'maxSlope' in slopeConstraint.parameters) {
    return (slopeConstraint.parameters as SlopeLimitParams).maxSlope;
  }
  return 15; // Default max slope
}

/**
 * Helper function to get setback distance by asset type
 */
export function getDefaultSetback(assetType: AssetType): number {
  const constraints = DEFAULT_ASSET_CONSTRAINTS[assetType];
  const setbackConstraint = constraints?.find((c) => c.type === ConstraintType.BOUNDARY_SETBACK);
  if (setbackConstraint?.parameters && 'minDistance' in setbackConstraint.parameters) {
    return (setbackConstraint.parameters as BoundarySetbackParams).minDistance;
  }
  return 10; // Default setback
}
