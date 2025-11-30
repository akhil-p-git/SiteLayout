/**
 * Constraint Controller
 *
 * Handles HTTP requests for constraint validation and management.
 */

import type { Request, Response } from 'express';
import {
  createDefaultConstraintSet,
  getConstraintSets,
  getConstraintSet,
  validateAssetPlacement,
  validateBatch,
  findValidPlacementAreas,
  calculateBuildableAreaStats,
  type ValidationContext,
} from '../services/constraint';
import { getExclusionZonesBySite } from '../services/exclusionZone';
import {
  ConstraintType,
  ViolationSeverity,
  AssetType,
  DEFAULT_ASSET_CONSTRAINTS,
  getDefaultSlopeLimit,
  getDefaultSetback,
} from '../types/constraint';
import * as turf from '@turf/turf';

/**
 * Get available constraint types
 */
export async function getConstraintTypes(req: Request, res: Response) {
  const types = Object.values(ConstraintType).map((type) => ({
    value: type,
    label: formatConstraintType(type),
    description: getConstraintTypeDescription(type),
  }));

  res.json({ types });
}

/**
 * Get available asset types
 */
export async function getAssetTypes(req: Request, res: Response) {
  const types = Object.values(AssetType)
    .filter((type) => type !== AssetType.ANY)
    .map((type) => ({
      value: type,
      label: formatAssetType(type),
      defaultSlopeLimit: getDefaultSlopeLimit(type),
      defaultSetback: getDefaultSetback(type),
    }));

  res.json({ types });
}

/**
 * Get default constraints for an asset type
 */
export async function getDefaultConstraints(req: Request, res: Response) {
  const { assetType } = req.params;

  if (!Object.values(AssetType).includes(assetType as AssetType)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_ASSET_TYPE',
        message: `Invalid asset type: ${assetType}`,
      },
    });
  }

  const defaults = DEFAULT_ASSET_CONSTRAINTS[assetType as AssetType] || [];

  res.json({
    assetType,
    constraints: defaults.map((c, i) => ({
      id: `default-${assetType}-${i}`,
      ...c,
    })),
  });
}

/**
 * Get constraint sets for a project
 */
export async function getProjectConstraints(req: Request, res: Response) {
  const { projectId } = req.params;

  let constraintSets = getConstraintSets(projectId);

  // Create default if none exist
  if (constraintSets.length === 0) {
    const userId = req.user?.id || 'system';
    const defaultSet = createDefaultConstraintSet(projectId, userId);
    constraintSets = [defaultSet];
  }

  res.json({ constraintSets });
}

/**
 * Get a specific constraint set
 */
export async function getConstraintSetById(req: Request, res: Response) {
  const { constraintSetId } = req.params;

  const constraintSet = getConstraintSet(constraintSetId);

  if (!constraintSet) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Constraint set not found',
      },
    });
  }

  res.json({ constraintSet });
}

/**
 * Validate a single asset placement
 */
export async function validateAsset(req: Request, res: Response) {
  const { projectId } = req.params;
  const { asset, siteId, siteBoundary } = req.body;

  if (!asset) {
    return res.status(400).json({
      error: {
        code: 'MISSING_ASSET',
        message: 'Asset placement is required',
      },
    });
  }

  // Get constraint set
  let constraintSets = getConstraintSets(projectId);
  if (constraintSets.length === 0) {
    const userId = req.user?.id || 'system';
    constraintSets = [createDefaultConstraintSet(projectId, userId)];
  }

  const activeConstraintSet = constraintSets.find((cs) => cs.isDefault) || constraintSets[0];

  // Build validation context
  const context: ValidationContext = {};

  if (siteBoundary) {
    context.siteBoundary = siteBoundary;
  }

  if (siteId) {
    try {
      const zones = await getExclusionZonesBySite(siteId, true);
      context.exclusionZones = zones;
    } catch (err) {
      console.error('Failed to fetch exclusion zones:', err);
    }
  }

  // Validate
  const result = await validateAssetPlacement(asset, activeConstraintSet.constraints, context);

  res.json({ result });
}

/**
 * Validate multiple assets in batch
 */
export async function validateAssets(req: Request, res: Response) {
  const { projectId } = req.params;
  const { assets, siteId, siteBoundary } = req.body;

  if (!assets || !Array.isArray(assets) || assets.length === 0) {
    return res.status(400).json({
      error: {
        code: 'MISSING_ASSETS',
        message: 'Asset placements array is required',
      },
    });
  }

  // Get constraint set
  let constraintSets = getConstraintSets(projectId);
  if (constraintSets.length === 0) {
    const userId = req.user?.id || 'system';
    constraintSets = [createDefaultConstraintSet(projectId, userId)];
  }

  const activeConstraintSet = constraintSets.find((cs) => cs.isDefault) || constraintSets[0];

  // Build validation context
  const context: ValidationContext = {};

  if (siteBoundary) {
    context.siteBoundary = siteBoundary;
  }

  if (siteId) {
    try {
      const zones = await getExclusionZonesBySite(siteId, true);
      context.exclusionZones = zones;
    } catch (err) {
      console.error('Failed to fetch exclusion zones:', err);
    }
  }

  // Validate batch
  const result = await validateBatch(assets, activeConstraintSet.constraints, context);

  // Convert Map to object for JSON serialization
  const assetResultsObj: Record<string, unknown> = {};
  result.assetResults.forEach((value, key) => {
    assetResultsObj[key] = value;
  });

  res.json({
    result: {
      ...result,
      assetResults: assetResultsObj,
    },
  });
}

/**
 * Find valid placement areas for an asset type
 */
export async function getValidPlacementAreas(req: Request, res: Response) {
  const { projectId } = req.params;
  const { assetType, siteId, siteBoundary } = req.body;

  if (!assetType) {
    return res.status(400).json({
      error: {
        code: 'MISSING_ASSET_TYPE',
        message: 'Asset type is required',
      },
    });
  }

  if (!siteBoundary) {
    return res.status(400).json({
      error: {
        code: 'MISSING_BOUNDARY',
        message: 'Site boundary is required',
      },
    });
  }

  // Get constraint set
  let constraintSets = getConstraintSets(projectId);
  if (constraintSets.length === 0) {
    const userId = req.user?.id || 'system';
    constraintSets = [createDefaultConstraintSet(projectId, userId)];
  }

  const activeConstraintSet = constraintSets.find((cs) => cs.isDefault) || constraintSets[0];

  // Build validation context
  const context: ValidationContext = {
    siteBoundary,
  };

  if (siteId) {
    try {
      const zones = await getExclusionZonesBySite(siteId, true);
      context.exclusionZones = zones;
    } catch (err) {
      console.error('Failed to fetch exclusion zones:', err);
    }
  }

  // Find valid areas
  const validArea = findValidPlacementAreas(
    activeConstraintSet.constraints,
    context,
    assetType as AssetType
  );

  if (!validArea) {
    return res.status(400).json({
      error: {
        code: 'NO_VALID_AREA',
        message: 'Could not calculate valid placement areas',
      },
    });
  }

  // Calculate statistics
  const totalSiteArea = turf.area(turf.feature(siteBoundary));
  const stats = calculateBuildableAreaStats(validArea, totalSiteArea);

  res.json({
    validArea: validArea.geometry,
    statistics: stats,
    totalSiteArea,
  });
}

/**
 * Get violation severity levels
 */
export async function getSeverityLevels(req: Request, res: Response) {
  const levels = Object.values(ViolationSeverity).map((level) => ({
    value: level,
    label: level.charAt(0).toUpperCase() + level.slice(1),
    description: getSeverityDescription(level),
  }));

  res.json({ levels });
}

// Helper functions
function formatConstraintType(type: ConstraintType): string {
  const labels: Record<ConstraintType, string> = {
    [ConstraintType.BOUNDARY_SETBACK]: 'Boundary Setback',
    [ConstraintType.EXCLUSION_ZONE]: 'Exclusion Zone Avoidance',
    [ConstraintType.SLOPE_LIMIT]: 'Slope Limit',
    [ConstraintType.ASPECT_RANGE]: 'Aspect Range',
    [ConstraintType.INTER_ASSET_BUFFER]: 'Inter-Asset Buffer',
    [ConstraintType.ACCESS_REQUIREMENT]: 'Access Requirement',
    [ConstraintType.TERRAIN_SUITABILITY]: 'Terrain Suitability',
    [ConstraintType.CUSTOM]: 'Custom Constraint',
  };
  return labels[type] || type;
}

function getConstraintTypeDescription(type: ConstraintType): string {
  const descriptions: Record<ConstraintType, string> = {
    [ConstraintType.BOUNDARY_SETBACK]: 'Minimum distance from property boundary',
    [ConstraintType.EXCLUSION_ZONE]: 'Prevent placement in restricted areas',
    [ConstraintType.SLOPE_LIMIT]: 'Maximum terrain slope for placement',
    [ConstraintType.ASPECT_RANGE]: 'Allowed slope direction range',
    [ConstraintType.INTER_ASSET_BUFFER]: 'Minimum distance between assets',
    [ConstraintType.ACCESS_REQUIREMENT]: 'Road access requirements',
    [ConstraintType.TERRAIN_SUITABILITY]: 'Terrain flatness requirements',
    [ConstraintType.CUSTOM]: 'Custom validation rules',
  };
  return descriptions[type] || '';
}

function formatAssetType(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    [AssetType.SOLAR_PANEL]: 'Solar Panel',
    [AssetType.SOLAR_ARRAY]: 'Solar Array',
    [AssetType.INVERTER]: 'Inverter',
    [AssetType.TRANSFORMER]: 'Transformer',
    [AssetType.SUBSTATION]: 'Substation',
    [AssetType.ACCESS_ROAD]: 'Access Road',
    [AssetType.FENCE]: 'Fence',
    [AssetType.COMBINER_BOX]: 'Combiner Box',
    [AssetType.WEATHER_STATION]: 'Weather Station',
    [AssetType.STORAGE_BUILDING]: 'Storage Building',
    [AssetType.ANY]: 'Any Asset',
  };
  return labels[type] || type;
}

function getSeverityDescription(severity: ViolationSeverity): string {
  const descriptions: Record<ViolationSeverity, string> = {
    [ViolationSeverity.ERROR]: 'Hard constraint - must be resolved',
    [ViolationSeverity.WARNING]: 'Soft constraint - can be overridden',
    [ViolationSeverity.INFO]: 'Informational - for awareness only',
  };
  return descriptions[severity] || '';
}
