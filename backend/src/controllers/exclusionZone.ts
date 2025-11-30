/**
 * Exclusion Zone Controller
 *
 * Handles HTTP requests for exclusion zone management.
 */

import { Response } from 'express';
import type { Polygon, MultiPolygon, Feature } from 'geojson';
import type { AuthenticatedRequest } from '../types/auth';
import {
  ExclusionZoneType,
  DEFAULT_BUFFER_DISTANCES,
  ZONE_TYPE_COLORS,
  ZONE_TYPE_LABELS,
} from '../types/exclusionZone';
import * as exclusionZoneService from '../services/exclusionZone';
import { logFromRequest, AuditActions } from '../services/audit';

/**
 * Get zone type options
 * GET /api/v1/exclusion-zones/types
 */
export async function getZoneTypes(_req: AuthenticatedRequest, res: Response): Promise<void> {
  const types = Object.values(ExclusionZoneType).map(type => ({
    value: type,
    label: ZONE_TYPE_LABELS[type],
    color: ZONE_TYPE_COLORS[type],
    defaultBuffer: DEFAULT_BUFFER_DISTANCES[type],
  }));

  res.json({ types });
}

/**
 * Create a new exclusion zone
 * POST /api/v1/exclusion-zones
 */
export async function createZone(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { siteId, name, type, description, geometry, bufferDistance, properties } = req.body;

  // Validate required fields
  if (!siteId || !name || !type || !geometry) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'siteId, name, type, and geometry are required',
    });
    return;
  }

  // Validate zone type
  if (!Object.values(ExclusionZoneType).includes(type)) {
    res.status(400).json({
      error: 'Invalid zone type',
      message: `Type must be one of: ${Object.values(ExclusionZoneType).join(', ')}`,
    });
    return;
  }

  // Validate geometry type
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    res.status(400).json({
      error: 'Invalid geometry',
      message: 'Geometry must be a Polygon or MultiPolygon',
    });
    return;
  }

  try {
    const zone = await exclusionZoneService.createExclusionZone({
      siteId,
      name,
      type,
      description,
      geometry,
      bufferDistance,
      properties,
      source: 'drawn',
    }, req.user!.id);

    await logFromRequest(req, AuditActions.CREATE_ZONE, 'exclusion_zone', zone.id, {
      siteId,
      name,
      type,
      area: zone.area,
    });

    res.status(201).json({
      success: true,
      zone,
    });
  } catch (error) {
    console.error('Failed to create exclusion zone:', error);
    res.status(500).json({
      error: 'Creation failed',
      message: error instanceof Error ? error.message : 'Failed to create exclusion zone',
    });
  }
}

/**
 * Get an exclusion zone by ID
 * GET /api/v1/exclusion-zones/:id
 */
export async function getZone(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const zone = await exclusionZoneService.getExclusionZone(id);

    if (!zone) {
      res.status(404).json({
        error: 'Not found',
        message: 'Exclusion zone not found',
      });
      return;
    }

    res.json({ zone });
  } catch (error) {
    console.error('Failed to get exclusion zone:', error);
    res.status(500).json({
      error: 'Retrieval failed',
      message: error instanceof Error ? error.message : 'Failed to get exclusion zone',
    });
  }
}

/**
 * Get all exclusion zones for a site
 * GET /api/v1/exclusion-zones/site/:siteId
 */
export async function getZonesBySite(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { siteId } = req.params;
  const includeInactive = req.query.includeInactive === 'true';
  const format = req.query.format as string | undefined;

  try {
    const zones = await exclusionZoneService.getExclusionZonesBySite(siteId, includeInactive);

    if (format === 'geojson') {
      const includeBuffered = req.query.includeBuffered === 'true';
      const geojson = exclusionZoneService.zonesToGeoJSON(zones, includeBuffered);
      res.json(geojson);
    } else {
      res.json({ zones });
    }
  } catch (error) {
    console.error('Failed to get exclusion zones:', error);
    res.status(500).json({
      error: 'Retrieval failed',
      message: error instanceof Error ? error.message : 'Failed to get exclusion zones',
    });
  }
}

/**
 * Update an exclusion zone
 * PATCH /api/v1/exclusion-zones/:id
 */
export async function updateZone(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, type, description, geometry, bufferDistance, properties, isActive } = req.body;

  // Validate zone type if provided
  if (type && !Object.values(ExclusionZoneType).includes(type)) {
    res.status(400).json({
      error: 'Invalid zone type',
      message: `Type must be one of: ${Object.values(ExclusionZoneType).join(', ')}`,
    });
    return;
  }

  // Validate geometry type if provided
  if (geometry && geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    res.status(400).json({
      error: 'Invalid geometry',
      message: 'Geometry must be a Polygon or MultiPolygon',
    });
    return;
  }

  try {
    const zone = await exclusionZoneService.updateExclusionZone(id, {
      name,
      type,
      description,
      geometry,
      bufferDistance,
      properties,
      isActive,
    });

    if (!zone) {
      res.status(404).json({
        error: 'Not found',
        message: 'Exclusion zone not found',
      });
      return;
    }

    await logFromRequest(req, AuditActions.UPDATE_ZONE, 'exclusion_zone', id, {
      updatedFields: Object.keys(req.body),
    });

    res.json({
      success: true,
      zone,
    });
  } catch (error) {
    console.error('Failed to update exclusion zone:', error);
    res.status(500).json({
      error: 'Update failed',
      message: error instanceof Error ? error.message : 'Failed to update exclusion zone',
    });
  }
}

/**
 * Delete an exclusion zone
 * DELETE /api/v1/exclusion-zones/:id
 */
export async function deleteZone(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const success = await exclusionZoneService.deleteExclusionZone(id);

    if (!success) {
      res.status(404).json({
        error: 'Not found',
        message: 'Exclusion zone not found',
      });
      return;
    }

    await logFromRequest(req, AuditActions.DELETE_ZONE, 'exclusion_zone', id);

    res.json({
      success: true,
      message: 'Exclusion zone deleted',
    });
  } catch (error) {
    console.error('Failed to delete exclusion zone:', error);
    res.status(500).json({
      error: 'Deletion failed',
      message: error instanceof Error ? error.message : 'Failed to delete exclusion zone',
    });
  }
}

/**
 * Validate an exclusion zone geometry
 * POST /api/v1/exclusion-zones/validate
 */
export async function validateZone(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { siteId, geometry, boundaryGeometry, excludeZoneId } = req.body;

  if (!siteId || !geometry) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'siteId and geometry are required',
    });
    return;
  }

  try {
    const validation = await exclusionZoneService.validateExclusionZone(
      geometry,
      siteId,
      boundaryGeometry,
      excludeZoneId
    );

    res.json({ validation });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Failed to validate zone',
    });
  }
}

/**
 * Get exclusion zone summary for a site
 * GET /api/v1/exclusion-zones/site/:siteId/summary
 */
export async function getZoneSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { siteId } = req.params;
  const siteBoundaryArea = req.query.boundaryArea
    ? parseFloat(req.query.boundaryArea as string)
    : undefined;

  try {
    const summary = await exclusionZoneService.getExclusionZoneSummary(siteId, siteBoundaryArea);
    res.json({ summary });
  } catch (error) {
    console.error('Failed to get zone summary:', error);
    res.status(500).json({
      error: 'Summary failed',
      message: error instanceof Error ? error.message : 'Failed to get zone summary',
    });
  }
}

/**
 * Import exclusion zones from uploaded file
 * POST /api/v1/exclusion-zones/import
 */
export async function importZones(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { siteId, features, defaultType } = req.body;

  if (!siteId || !features || !Array.isArray(features)) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'siteId and features array are required',
    });
    return;
  }

  // Validate default type
  const zoneType = defaultType && Object.values(ExclusionZoneType).includes(defaultType)
    ? defaultType
    : ExclusionZoneType.CUSTOM;

  try {
    const result = await exclusionZoneService.importExclusionZones(
      features as Feature<Polygon | MultiPolygon>[],
      siteId,
      zoneType,
      req.user!.id
    );

    await logFromRequest(req, AuditActions.DATA_IMPORT, 'exclusion_zones', undefined, {
      siteId,
      imported: result.imported,
      failed: result.failed,
    });

    res.json(result);
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({
      error: 'Import failed',
      message: error instanceof Error ? error.message : 'Failed to import zones',
    });
  }
}

/**
 * Calculate buildable area for a site
 * POST /api/v1/exclusion-zones/site/:siteId/buildable-area
 */
export async function getBuildableArea(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { siteId } = req.params;
  const { boundaryGeometry } = req.body;

  if (!boundaryGeometry) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'boundaryGeometry is required',
    });
    return;
  }

  try {
    const result = await exclusionZoneService.calculateBuildableArea(boundaryGeometry, siteId);

    res.json({
      siteId,
      ...result,
    });
  } catch (error) {
    console.error('Buildable area calculation error:', error);
    res.status(500).json({
      error: 'Calculation failed',
      message: error instanceof Error ? error.message : 'Failed to calculate buildable area',
    });
  }
}

/**
 * Apply buffer to a geometry (utility endpoint)
 * POST /api/v1/exclusion-zones/buffer
 */
export async function applyBuffer(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { geometry, distance } = req.body;

  if (!geometry || distance === undefined) {
    res.status(400).json({
      error: 'Missing required fields',
      message: 'geometry and distance are required',
    });
    return;
  }

  try {
    const buffered = exclusionZoneService.applyBuffer(geometry, { distance });
    const originalArea = exclusionZoneService.calculateArea(geometry);
    const bufferedArea = exclusionZoneService.calculateArea(buffered);

    res.json({
      original: {
        geometry,
        area: originalArea,
      },
      buffered: {
        geometry: buffered,
        area: bufferedArea,
        distance,
      },
      areaIncrease: bufferedArea - originalArea,
      areaIncreasePercent: ((bufferedArea - originalArea) / originalArea) * 100,
    });
  } catch (error) {
    console.error('Buffer calculation error:', error);
    res.status(500).json({
      error: 'Buffer failed',
      message: error instanceof Error ? error.message : 'Failed to apply buffer',
    });
  }
}
