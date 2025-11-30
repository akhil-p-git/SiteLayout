/**
 * Constraint Validation Service
 *
 * Validates asset placements against defined constraints including
 * boundary setbacks, exclusion zones, slopes, and inter-asset buffers.
 */

import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, Point, FeatureCollection } from 'geojson';
import {
  type Constraint,
  type ConstraintSet,
  type AssetPlacement,
  type ValidationResult,
  type BatchValidationResult,
  type ConstraintViolation,
  type SuggestedFix,
  ConstraintType,
  ViolationSeverity,
  AssetType,
  type BoundarySetbackParams,
  type ExclusionZoneParams,
  type SlopeLimitParams,
  type AspectRangeParams,
  type InterAssetBufferParams,
  type AccessRequirementParams,
  type TerrainSuitabilityParams,
  type BoundaryViolationDetails,
  type ExclusionZoneViolationDetails,
  type SlopeViolationDetails,
  type BufferViolationDetails,
  type AccessViolationDetails,
  DEFAULT_ASSET_CONSTRAINTS,
} from '../types/constraint';
import type { ExclusionZone } from '../types/exclusionZone';

// In-memory storage for constraint sets
const constraintSetsStore = new Map<string, ConstraintSet>();
const projectConstraintsIndex = new Map<string, Set<string>>();

/**
 * Create a default constraint set for a project
 */
export function createDefaultConstraintSet(projectId: string, userId: string): ConstraintSet {
  const constraints: Constraint[] = [];
  let constraintIndex = 0;

  // Generate constraints from default asset constraints
  for (const [assetType, defaultConstraints] of Object.entries(DEFAULT_ASSET_CONSTRAINTS)) {
    for (const defaultConstraint of defaultConstraints) {
      constraintIndex++;
      const constraint: Constraint = {
        id: `constraint-${projectId}-${constraintIndex}`,
        name: `${assetType} - ${defaultConstraint.type}`,
        type: defaultConstraint.type!,
        description: `Default ${defaultConstraint.type} constraint for ${assetType}`,
        enabled: true,
        priority: defaultConstraint.priority || 50,
        severity: defaultConstraint.severity || ViolationSeverity.WARNING,
        appliesToAssets: [assetType as AssetType],
        parameters: defaultConstraint.parameters!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      constraints.push(constraint);
    }
  }

  // Add global exclusion zone constraint
  constraints.push({
    id: `constraint-${projectId}-global-exclusion`,
    name: 'Global Exclusion Zone Avoidance',
    type: ConstraintType.EXCLUSION_ZONE,
    description: 'Prevent placement of any assets within exclusion zones',
    enabled: true,
    priority: 95,
    severity: ViolationSeverity.ERROR,
    appliesToAssets: [AssetType.ANY],
    parameters: {
      type: 'exclusion_zone',
      includeBuffer: true,
      allowPartialOverlap: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const constraintSet: ConstraintSet = {
    id: `cs-${projectId}-default`,
    projectId,
    name: 'Default Constraints',
    description: 'Standard constraints for solar site development',
    constraints,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: userId,
  };

  constraintSetsStore.set(constraintSet.id, constraintSet);

  if (!projectConstraintsIndex.has(projectId)) {
    projectConstraintsIndex.set(projectId, new Set());
  }
  projectConstraintsIndex.get(projectId)!.add(constraintSet.id);

  return constraintSet;
}

/**
 * Get constraint sets for a project
 */
export function getConstraintSets(projectId: string): ConstraintSet[] {
  const setIds = projectConstraintsIndex.get(projectId);
  if (!setIds) return [];

  return Array.from(setIds)
    .map(id => constraintSetsStore.get(id))
    .filter((cs): cs is ConstraintSet => cs !== undefined);
}

/**
 * Get a specific constraint set
 */
export function getConstraintSet(constraintSetId: string): ConstraintSet | undefined {
  return constraintSetsStore.get(constraintSetId);
}

/**
 * Validate a single asset placement against all applicable constraints
 */
export async function validateAssetPlacement(
  asset: AssetPlacement,
  constraints: Constraint[],
  context: ValidationContext
): Promise<ValidationResult> {
  const startTime = Date.now();
  const violations: ConstraintViolation[] = [];
  const warnings: ConstraintViolation[] = [];
  const info: ConstraintViolation[] = [];

  // Filter constraints that apply to this asset type
  const applicableConstraints = constraints.filter(
    c => c.enabled && (c.appliesToAssets.includes(asset.assetType) || c.appliesToAssets.includes(AssetType.ANY))
  );

  // Sort by priority (higher first)
  applicableConstraints.sort((a, b) => b.priority - a.priority);

  let passedCount = 0;

  for (const constraint of applicableConstraints) {
    const violation = await validateConstraint(asset, constraint, context);

    if (violation) {
      switch (violation.severity) {
        case ViolationSeverity.ERROR:
          violations.push(violation);
          break;
        case ViolationSeverity.WARNING:
          warnings.push(violation);
          break;
        case ViolationSeverity.INFO:
          info.push(violation);
          break;
      }
    } else {
      passedCount++;
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    warnings,
    info,
    checkedConstraints: applicableConstraints.length,
    passedConstraints: passedCount,
    failedConstraints: violations.length,
    timestamp: new Date(),
    validationTimeMs: Date.now() - startTime,
  };
}

/**
 * Validate multiple assets in batch
 */
export async function validateBatch(
  assets: AssetPlacement[],
  constraints: Constraint[],
  context: ValidationContext
): Promise<BatchValidationResult> {
  const startTime = Date.now();
  const assetResults = new Map<string, ValidationResult>();

  let validCount = 0;
  let totalViolations = 0;
  const violationsByType: Record<ConstraintType, number> = {} as Record<ConstraintType, number>;
  const violationsBySeverity: Record<ViolationSeverity, number> = {
    [ViolationSeverity.ERROR]: 0,
    [ViolationSeverity.WARNING]: 0,
    [ViolationSeverity.INFO]: 0,
  };

  // Initialize violation counts
  for (const type of Object.values(ConstraintType)) {
    violationsByType[type] = 0;
  }

  // Add inter-asset constraints to context
  const contextWithAssets = {
    ...context,
    otherAssets: assets,
  };

  for (const asset of assets) {
    const result = await validateAssetPlacement(asset, constraints, contextWithAssets);
    assetResults.set(asset.id, result);

    if (result.valid) {
      validCount++;
    }

    // Aggregate violations
    for (const v of [...result.violations, ...result.warnings, ...result.info]) {
      totalViolations++;
      violationsByType[v.constraintType]++;
      violationsBySeverity[v.severity]++;
    }
  }

  return {
    overallValid: validCount === assets.length,
    assetResults,
    summary: {
      totalAssets: assets.length,
      validAssets: validCount,
      invalidAssets: assets.length - validCount,
      totalViolations,
      violationsByType,
      violationsBySeverity,
    },
    timestamp: new Date(),
    validationTimeMs: Date.now() - startTime,
  };
}

/**
 * Context for validation - provides access to site data
 */
export interface ValidationContext {
  siteBoundary?: Polygon | MultiPolygon;
  exclusionZones?: ExclusionZone[];
  slopeData?: SlopeDataProvider;
  aspectData?: AspectDataProvider;
  roads?: Feature<Polygon | MultiPolygon>[];
  otherAssets?: AssetPlacement[];
}

/**
 * Interface for slope data provider
 */
export interface SlopeDataProvider {
  getSlopeAtPoint(lng: number, lat: number): number | null;
  getSlopeInArea(geometry: Polygon): { min: number; max: number; average: number } | null;
}

/**
 * Interface for aspect data provider
 */
export interface AspectDataProvider {
  getAspectAtPoint(lng: number, lat: number): number | null;
  getAspectInArea(geometry: Polygon): { dominant: number; range: [number, number] } | null;
}

/**
 * Validate a single constraint against an asset
 */
async function validateConstraint(
  asset: AssetPlacement,
  constraint: Constraint,
  context: ValidationContext
): Promise<ConstraintViolation | null> {
  switch (constraint.type) {
    case ConstraintType.BOUNDARY_SETBACK:
      return validateBoundarySetback(asset, constraint, context);

    case ConstraintType.EXCLUSION_ZONE:
      return validateExclusionZone(asset, constraint, context);

    case ConstraintType.SLOPE_LIMIT:
      return validateSlopeLimit(asset, constraint, context);

    case ConstraintType.ASPECT_RANGE:
      return validateAspectRange(asset, constraint, context);

    case ConstraintType.INTER_ASSET_BUFFER:
      return validateInterAssetBuffer(asset, constraint, context);

    case ConstraintType.ACCESS_REQUIREMENT:
      return validateAccessRequirement(asset, constraint, context);

    case ConstraintType.TERRAIN_SUITABILITY:
      return validateTerrainSuitability(asset, constraint, context);

    default:
      return null;
  }
}

/**
 * Validate boundary setback constraint
 */
function validateBoundarySetback(
  asset: AssetPlacement,
  constraint: Constraint,
  context: ValidationContext
): ConstraintViolation | null {
  if (!context.siteBoundary) return null;

  const params = constraint.parameters as BoundarySetbackParams;
  const assetGeometry = getAssetPolygon(asset);

  if (!assetGeometry) return null;

  // Create inward buffer of the boundary (setback line)
  const setbackArea = turf.buffer(
    turf.feature(context.siteBoundary),
    -params.minDistance / 1000, // Convert to km (negative for inward buffer)
    { units: 'kilometers' }
  );

  if (!setbackArea) return null;

  // Check if asset is within setback area
  const assetFeature = turf.feature(assetGeometry);
  const isWithin = turf.booleanWithin(assetFeature, setbackArea);

  if (!isWithin) {
    // Calculate actual distance to boundary
    const boundary = turf.feature(context.siteBoundary);
    const centroid = turf.centroid(assetFeature);
    const nearestPoint = turf.nearestPointOnLine(
      turf.polygonToLine(boundary as Feature<Polygon>),
      centroid
    );
    const distance = turf.distance(centroid, nearestPoint, { units: 'meters' });

    const details: BoundaryViolationDetails = {
      type: 'boundary',
      currentDistance: distance,
      requiredDistance: params.minDistance,
    };

    // Calculate suggested position (move toward center)
    const boundaryCenter = turf.centroid(boundary);
    const assetCenter = turf.centroid(assetFeature);
    const moveDistance = params.minDistance - distance + 5; // Add 5m buffer
    const bearing = turf.bearing(assetCenter, boundaryCenter);
    const newPosition = turf.destination(assetCenter, moveDistance / 1000, bearing, { units: 'kilometers' });

    const suggestedFix: SuggestedFix = {
      description: `Move asset ${moveDistance.toFixed(1)}m toward site center`,
      action: 'move',
      suggestedPosition: newPosition.geometry.coordinates as [number, number],
    };

    return {
      constraintId: constraint.id,
      constraintName: constraint.name,
      constraintType: constraint.type,
      severity: constraint.severity,
      assetId: asset.id,
      assetType: asset.assetType,
      message: `Asset is ${distance.toFixed(1)}m from boundary, minimum setback is ${params.minDistance}m`,
      details,
      suggestedFix,
    };
  }

  return null;
}

/**
 * Validate exclusion zone avoidance constraint
 */
function validateExclusionZone(
  asset: AssetPlacement,
  constraint: Constraint,
  context: ValidationContext
): ConstraintViolation | null {
  if (!context.exclusionZones || context.exclusionZones.length === 0) return null;

  const params = constraint.parameters as ExclusionZoneParams;
  const assetGeometry = getAssetPolygon(asset);

  if (!assetGeometry) return null;

  const assetFeature = turf.feature(assetGeometry);

  for (const zone of context.exclusionZones) {
    if (!zone.isActive) continue;

    // Check zone type filter
    if (params.zoneTypes && params.zoneTypes.length > 0) {
      if (!params.zoneTypes.includes(zone.type)) continue;
    }

    // Use buffered geometry if available and requested
    const zoneGeometry = params.includeBuffer && zone.bufferedGeometry
      ? zone.bufferedGeometry
      : zone.geometry;

    const zoneFeature = turf.feature(zoneGeometry);

    // Check for intersection
    let intersection: Feature<Polygon | MultiPolygon> | null = null;
    try {
      intersection = turf.intersect(
        turf.featureCollection([assetFeature as Feature<Polygon>, zoneFeature as Feature<Polygon>])
      );
    } catch {
      // Intersection calculation failed
      continue;
    }

    if (intersection) {
      const overlapArea = turf.area(intersection);
      const assetArea = turf.area(assetFeature);
      const overlapPercentage = (overlapArea / assetArea) * 100;

      // Check if overlap is allowed
      if (params.allowPartialOverlap && params.maxOverlapPercentage) {
        if (overlapPercentage <= params.maxOverlapPercentage) {
          continue;
        }
      }

      const details: ExclusionZoneViolationDetails = {
        type: 'exclusion_zone',
        zoneId: zone.id,
        zoneName: zone.name,
        zoneType: zone.type,
        overlapArea,
        overlapPercentage,
      };

      // Calculate suggested position (move away from zone)
      const zoneCentroid = turf.centroid(zoneFeature);
      const assetCentroid = turf.centroid(assetFeature);
      const bearing = turf.bearing(zoneCentroid, assetCentroid);
      const moveDistance = Math.sqrt(overlapArea) + 10; // Rough estimate
      const newPosition = turf.destination(assetCentroid, moveDistance / 1000, bearing, { units: 'kilometers' });

      const suggestedFix: SuggestedFix = {
        description: `Move asset away from ${zone.name}`,
        action: 'move',
        suggestedPosition: newPosition.geometry.coordinates as [number, number],
      };

      return {
        constraintId: constraint.id,
        constraintName: constraint.name,
        constraintType: constraint.type,
        severity: constraint.severity,
        assetId: asset.id,
        assetType: asset.assetType,
        message: `Asset overlaps with exclusion zone "${zone.name}" (${overlapPercentage.toFixed(1)}% overlap)`,
        details,
        geometry: intersection.geometry as Polygon | MultiPolygon,
        suggestedFix,
      };
    }
  }

  return null;
}

/**
 * Validate slope limit constraint
 */
function validateSlopeLimit(
  asset: AssetPlacement,
  constraint: Constraint,
  context: ValidationContext
): ConstraintViolation | null {
  if (!context.slopeData) return null;

  const params = constraint.parameters as SlopeLimitParams;
  const assetGeometry = getAssetPolygon(asset);

  if (!assetGeometry) return null;

  const slopeInfo = context.slopeData.getSlopeInArea(assetGeometry);

  if (!slopeInfo) return null;

  let checkValue: number;
  switch (params.checkMethod) {
    case 'average':
      checkValue = slopeInfo.average;
      break;
    case 'maximum':
      checkValue = slopeInfo.max;
      break;
    case 'any_point':
      checkValue = slopeInfo.max; // Use max for any_point
      break;
    default:
      checkValue = slopeInfo.average;
  }

  // Convert if needed
  let maxSlope = params.maxSlope;
  if (params.slopeUnit === 'percentage') {
    // Convert check value from degrees to percentage for comparison
    checkValue = Math.tan(checkValue * Math.PI / 180) * 100;
  }

  if (checkValue > maxSlope) {
    const details: SlopeViolationDetails = {
      type: 'slope',
      currentSlope: checkValue,
      maxAllowedSlope: maxSlope,
      slopeUnit: params.slopeUnit,
    };

    return {
      constraintId: constraint.id,
      constraintName: constraint.name,
      constraintType: constraint.type,
      severity: constraint.severity,
      assetId: asset.id,
      assetType: asset.assetType,
      message: `Slope ${params.checkMethod === 'average' ? 'average' : 'maximum'} is ${checkValue.toFixed(1)}${params.slopeUnit === 'degrees' ? '°' : '%'}, exceeds limit of ${maxSlope}${params.slopeUnit === 'degrees' ? '°' : '%'}`,
      details,
      suggestedFix: {
        description: 'Relocate asset to area with lower slope',
        action: 'move',
      },
    };
  }

  return null;
}

/**
 * Validate aspect range constraint
 */
function validateAspectRange(
  asset: AssetPlacement,
  constraint: Constraint,
  context: ValidationContext
): ConstraintViolation | null {
  if (!context.aspectData) return null;

  const params = constraint.parameters as AspectRangeParams;
  const assetGeometry = getAssetPolygon(asset);

  if (!assetGeometry) return null;

  const aspectInfo = context.aspectData.getAspectInArea(assetGeometry);

  if (!aspectInfo) return null;

  const { dominant } = aspectInfo;

  // Check if aspect is within allowed range
  // Handle wrap-around (e.g., 350-10 degrees)
  let inRange: boolean;
  if (params.minAspect <= params.maxAspect) {
    inRange = dominant >= params.minAspect && dominant <= params.maxAspect;
  } else {
    // Wrap-around case
    inRange = dominant >= params.minAspect || dominant <= params.maxAspect;
  }

  if (!inRange) {
    return {
      constraintId: constraint.id,
      constraintName: constraint.name,
      constraintType: constraint.type,
      severity: constraint.severity,
      assetId: asset.id,
      assetType: asset.assetType,
      message: `Aspect is ${dominant.toFixed(0)}°, outside allowed range ${params.minAspect}°-${params.maxAspect}°`,
      details: {
        type: 'aspect',
        currentAspect: dominant,
        allowedRange: [params.minAspect, params.maxAspect],
      },
      suggestedFix: params.preferredAspect
        ? {
          description: `Rotate or relocate to achieve ${params.preferredAspect}° aspect`,
          action: 'rotate',
          suggestedRotation: params.preferredAspect - dominant,
        }
        : {
          description: 'Relocate asset to area with suitable aspect',
          action: 'move',
        },
    };
  }

  return null;
}

/**
 * Validate inter-asset buffer constraint
 */
function validateInterAssetBuffer(
  asset: AssetPlacement,
  constraint: Constraint,
  context: ValidationContext
): ConstraintViolation | null {
  if (!context.otherAssets || context.otherAssets.length === 0) return null;

  const params = constraint.parameters as InterAssetBufferParams;

  // Check if this constraint applies to this asset
  if (params.fromAssetType !== asset.assetType && params.fromAssetType !== AssetType.ANY) {
    return null;
  }

  const assetGeometry = getAssetPolygon(asset);
  if (!assetGeometry) return null;

  const assetCentroid = turf.centroid(turf.feature(assetGeometry));

  // Find conflicting assets
  for (const otherAsset of context.otherAssets) {
    if (otherAsset.id === asset.id) continue;

    // Check if the other asset type matches
    if (params.toAssetType !== otherAsset.assetType && params.toAssetType !== AssetType.ANY) {
      continue;
    }

    const otherGeometry = getAssetPolygon(otherAsset);
    if (!otherGeometry) continue;

    const otherCentroid = turf.centroid(turf.feature(otherGeometry));
    const distance = turf.distance(assetCentroid, otherCentroid, { units: 'meters' });

    if (distance < params.minDistance) {
      const details: BufferViolationDetails = {
        type: 'buffer',
        conflictingAssetId: otherAsset.id,
        conflictingAssetType: otherAsset.assetType,
        currentDistance: distance,
        requiredDistance: params.minDistance,
      };

      // Calculate direction to move
      const bearing = turf.bearing(otherCentroid, assetCentroid);
      const moveDistance = params.minDistance - distance + 2;
      const newPosition = turf.destination(assetCentroid, moveDistance / 1000, bearing, { units: 'kilometers' });

      return {
        constraintId: constraint.id,
        constraintName: constraint.name,
        constraintType: constraint.type,
        severity: constraint.severity,
        assetId: asset.id,
        assetType: asset.assetType,
        message: `Asset is ${distance.toFixed(1)}m from ${otherAsset.assetType}, minimum buffer is ${params.minDistance}m`,
        details,
        suggestedFix: {
          description: `Move asset ${moveDistance.toFixed(1)}m away`,
          action: 'move',
          suggestedPosition: newPosition.geometry.coordinates as [number, number],
        },
      };
    }

    // Check max distance if specified
    if (params.maxDistance && distance > params.maxDistance) {
      const details: BufferViolationDetails = {
        type: 'buffer',
        conflictingAssetId: otherAsset.id,
        conflictingAssetType: otherAsset.assetType,
        currentDistance: distance,
        requiredDistance: params.maxDistance,
      };

      return {
        constraintId: constraint.id,
        constraintName: constraint.name,
        constraintType: constraint.type,
        severity: constraint.severity,
        assetId: asset.id,
        assetType: asset.assetType,
        message: `Asset is ${distance.toFixed(1)}m from ${otherAsset.assetType}, maximum allowed is ${params.maxDistance}m`,
        details,
        suggestedFix: {
          description: `Move asset closer to ${otherAsset.assetType}`,
          action: 'move',
        },
      };
    }
  }

  return null;
}

/**
 * Validate access requirement constraint
 */
function validateAccessRequirement(
  asset: AssetPlacement,
  constraint: Constraint,
  context: ValidationContext
): ConstraintViolation | null {
  const params = constraint.parameters as AccessRequirementParams;

  if (!params.requireRoadAccess) return null;
  if (!context.roads || context.roads.length === 0) return null;

  const assetGeometry = getAssetPolygon(asset);
  if (!assetGeometry) return null;

  const assetCentroid = turf.centroid(turf.feature(assetGeometry));

  // Find nearest road
  let nearestDistance = Infinity;
  let nearestRoadId: string | undefined;

  for (const road of context.roads) {
    const roadCentroid = turf.centroid(road);
    const distance = turf.distance(assetCentroid, roadCentroid, { units: 'meters' });

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestRoadId = road.id?.toString();
    }
  }

  if (nearestDistance > params.maxDistanceToRoad) {
    const details: AccessViolationDetails = {
      type: 'access',
      nearestRoadDistance: nearestDistance,
      requiredDistance: params.maxDistanceToRoad,
      nearestRoadId,
    };

    return {
      constraintId: constraint.id,
      constraintName: constraint.name,
      constraintType: constraint.type,
      severity: constraint.severity,
      assetId: asset.id,
      assetType: asset.assetType,
      message: `Nearest road is ${nearestDistance.toFixed(1)}m away, maximum allowed is ${params.maxDistanceToRoad}m`,
      details,
      suggestedFix: {
        description: 'Relocate asset closer to road access or add new access road',
        action: 'move',
      },
    };
  }

  return null;
}

/**
 * Validate terrain suitability constraint
 */
function validateTerrainSuitability(
  asset: AssetPlacement,
  constraint: Constraint,
  context: ValidationContext
): ConstraintViolation | null {
  // This would require DEM data to check elevation variation within footprint
  // For now, return null (pass)
  return null;
}

/**
 * Helper: Get polygon geometry for an asset
 */
function getAssetPolygon(asset: AssetPlacement): Polygon | null {
  if (asset.footprint) {
    return asset.footprint;
  }

  if (asset.geometry.type === 'Polygon') {
    return asset.geometry;
  }

  if (asset.geometry.type === 'Point') {
    // Create a small buffer around the point as the footprint
    const point = turf.point(asset.geometry.coordinates);
    const buffer = turf.buffer(point, 0.005, { units: 'kilometers' }); // 5m radius
    return buffer?.geometry as Polygon || null;
  }

  if (asset.geometry.type === 'MultiPolygon') {
    // Use the first polygon
    return {
      type: 'Polygon',
      coordinates: asset.geometry.coordinates[0],
    };
  }

  return null;
}

/**
 * Find valid placement areas based on constraints
 */
export function findValidPlacementAreas(
  constraints: Constraint[],
  context: ValidationContext,
  assetType: AssetType
): Feature<Polygon | MultiPolygon> | null {
  if (!context.siteBoundary) return null;

  let validArea: Feature<Polygon | MultiPolygon> = turf.feature(context.siteBoundary);

  // Apply boundary setback
  const setbackConstraint = constraints.find(
    c =>
      c.enabled &&
      c.type === ConstraintType.BOUNDARY_SETBACK &&
      (c.appliesToAssets.includes(assetType) || c.appliesToAssets.includes(AssetType.ANY))
  );

  if (setbackConstraint) {
    const params = setbackConstraint.parameters as BoundarySetbackParams;
    const buffered = turf.buffer(validArea, -params.minDistance / 1000, { units: 'kilometers' });
    if (buffered) {
      validArea = buffered;
    }
  }

  // Subtract exclusion zones
  if (context.exclusionZones) {
    const exclusionConstraint = constraints.find(
      c =>
        c.enabled &&
        c.type === ConstraintType.EXCLUSION_ZONE &&
        (c.appliesToAssets.includes(assetType) || c.appliesToAssets.includes(AssetType.ANY))
    );

    if (exclusionConstraint) {
      const params = exclusionConstraint.parameters as ExclusionZoneParams;

      for (const zone of context.exclusionZones) {
        if (!zone.isActive) continue;

        if (params.zoneTypes && params.zoneTypes.length > 0) {
          if (!params.zoneTypes.includes(zone.type)) continue;
        }

        const zoneGeometry = params.includeBuffer && zone.bufferedGeometry
          ? zone.bufferedGeometry
          : zone.geometry;

        try {
          const diff = turf.difference(
            turf.featureCollection([validArea as Feature<Polygon>, turf.feature(zoneGeometry) as Feature<Polygon>])
          );
          if (diff) {
            validArea = diff;
          }
        } catch {
          // Difference calculation failed
        }
      }
    }
  }

  return validArea;
}

/**
 * Calculate buildable area statistics
 */
export function calculateBuildableAreaStats(
  validArea: Feature<Polygon | MultiPolygon>,
  totalSiteArea: number
): {
  buildableArea: number;
  buildablePercentage: number;
  fragmentCount: number;
} {
  const buildableArea = turf.area(validArea);

  let fragmentCount = 1;
  if (validArea.geometry.type === 'MultiPolygon') {
    fragmentCount = validArea.geometry.coordinates.length;
  }

  return {
    buildableArea,
    buildablePercentage: (buildableArea / totalSiteArea) * 100,
    fragmentCount,
  };
}
