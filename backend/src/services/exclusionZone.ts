/**
 * Exclusion Zone Service
 *
 * Handles exclusion zone CRUD operations, buffer calculations,
 * and boundary validation.
 */

import crypto from 'crypto';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
import type {
  ExclusionZone,
  CreateExclusionZoneInput,
  UpdateExclusionZoneInput,
  ZoneValidationResult,
  ExclusionZoneSummary,
  BufferOptions,
  ExclusionZoneFeature,
  ZoneImportResult,
} from '../types/exclusionZone';
import { ExclusionZoneType, DEFAULT_BUFFER_DISTANCES } from '../types/exclusionZone';

// In-memory storage (replace with database in production)
const zonesStore = new Map<string, ExclusionZone>();
const siteZonesIndex = new Map<string, Set<string>>(); // siteId -> zoneIds

/**
 * Calculate the area of a polygon in square meters
 */
function calculateArea(geometry: Polygon | MultiPolygon): number {
  const feature = turf.feature(geometry);
  return turf.area(feature);
}

/**
 * Apply buffer to a geometry
 */
function applyBuffer(
  geometry: Polygon | MultiPolygon,
  options: BufferOptions
): Polygon | MultiPolygon {
  if (options.distance <= 0) {
    return geometry;
  }

  const feature = turf.feature(geometry);
  const buffered = turf.buffer(feature, options.distance, {
    units: 'meters',
    steps: options.segments || 32,
  });

  if (!buffered || !buffered.geometry) {
    return geometry;
  }

  return buffered.geometry as Polygon | MultiPolygon;
}

/**
 * Check if a zone is within a site boundary
 */
function isWithinBoundary(
  zoneGeometry: Polygon | MultiPolygon,
  boundaryGeometry: Polygon | MultiPolygon
): boolean {
  const zone = turf.feature(zoneGeometry);
  const boundary = turf.feature(boundaryGeometry);

  return turf.booleanWithin(zone, boundary);
}

/**
 * Calculate overlap percentage with boundary
 */
function calculateOverlapPercentage(
  zoneGeometry: Polygon | MultiPolygon,
  boundaryGeometry: Polygon | MultiPolygon
): number {
  const zone = turf.feature(zoneGeometry);
  const boundary = turf.feature(boundaryGeometry);

  try {
    const intersection = turf.intersect(turf.featureCollection([zone, boundary]));

    if (!intersection) {
      return 0;
    }

    const zoneArea = turf.area(zone);
    const intersectionArea = turf.area(intersection);

    return (intersectionArea / zoneArea) * 100;
  } catch {
    return 0;
  }
}

/**
 * Find zones that intersect with a given geometry
 */
function findIntersectingZones(
  geometry: Polygon | MultiPolygon,
  siteId: string,
  excludeZoneId?: string
): string[] {
  const siteZoneIds = siteZonesIndex.get(siteId);
  if (!siteZoneIds) return [];

  const intersecting: string[] = [];
  const testFeature = turf.feature(geometry);

  for (const zoneId of siteZoneIds) {
    if (zoneId === excludeZoneId) continue;

    const zone = zonesStore.get(zoneId);
    if (!zone || !zone.isActive) continue;

    const zoneFeature = turf.feature(zone.geometry);

    if (turf.booleanIntersects(testFeature, zoneFeature)) {
      intersecting.push(zoneId);
    }
  }

  return intersecting;
}

/**
 * Create a new exclusion zone
 */
export async function createExclusionZone(
  input: CreateExclusionZoneInput,
  userId: string
): Promise<ExclusionZone> {
  const id = crypto.randomUUID();
  const now = new Date();

  // Get buffer distance (use default if not provided)
  const bufferDistance = input.bufferDistance ?? DEFAULT_BUFFER_DISTANCES[input.type];

  // Calculate area
  const area = calculateArea(input.geometry);

  // Apply buffer
  const bufferedGeometry = applyBuffer(input.geometry, { distance: bufferDistance });
  const bufferedArea = bufferDistance > 0 ? calculateArea(bufferedGeometry) : area;

  const zone: ExclusionZone = {
    id,
    siteId: input.siteId,
    name: input.name,
    type: input.type,
    description: input.description,
    geometry: input.geometry,
    bufferDistance,
    bufferedGeometry: bufferDistance > 0 ? bufferedGeometry : undefined,
    area,
    bufferedArea,
    properties: input.properties || {},
    source: input.source || 'drawn',
    sourceFile: input.sourceFile,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };

  // Store the zone
  zonesStore.set(id, zone);

  // Update site index
  if (!siteZonesIndex.has(input.siteId)) {
    siteZonesIndex.set(input.siteId, new Set());
  }
  siteZonesIndex.get(input.siteId)!.add(id);

  return zone;
}

/**
 * Get an exclusion zone by ID
 */
export async function getExclusionZone(id: string): Promise<ExclusionZone | null> {
  return zonesStore.get(id) || null;
}

/**
 * Get all exclusion zones for a site
 */
export async function getExclusionZonesBySite(
  siteId: string,
  includeInactive = false
): Promise<ExclusionZone[]> {
  const zoneIds = siteZonesIndex.get(siteId);
  if (!zoneIds) return [];

  const zones: ExclusionZone[] = [];

  for (const id of zoneIds) {
    const zone = zonesStore.get(id);
    if (zone && (includeInactive || zone.isActive)) {
      zones.push(zone);
    }
  }

  return zones;
}

/**
 * Update an exclusion zone
 */
export async function updateExclusionZone(
  id: string,
  input: UpdateExclusionZoneInput
): Promise<ExclusionZone | null> {
  const zone = zonesStore.get(id);
  if (!zone) return null;

  // Update fields
  if (input.name !== undefined) zone.name = input.name;
  if (input.type !== undefined) zone.type = input.type;
  if (input.description !== undefined) zone.description = input.description;
  if (input.properties !== undefined) zone.properties = input.properties;
  if (input.isActive !== undefined) zone.isActive = input.isActive;

  // Update geometry if provided
  if (input.geometry) {
    zone.geometry = input.geometry;
    zone.area = calculateArea(input.geometry);
  }

  // Update buffer if distance changed or geometry changed
  if (input.bufferDistance !== undefined || input.geometry) {
    const bufferDistance = input.bufferDistance ?? zone.bufferDistance;
    zone.bufferDistance = bufferDistance;

    if (bufferDistance > 0) {
      zone.bufferedGeometry = applyBuffer(zone.geometry, { distance: bufferDistance });
      zone.bufferedArea = calculateArea(zone.bufferedGeometry);
    } else {
      zone.bufferedGeometry = undefined;
      zone.bufferedArea = zone.area;
    }
  }

  zone.updatedAt = new Date();
  zonesStore.set(id, zone);

  return zone;
}

/**
 * Delete an exclusion zone
 */
export async function deleteExclusionZone(id: string): Promise<boolean> {
  const zone = zonesStore.get(id);
  if (!zone) return false;

  // Remove from site index
  const siteZones = siteZonesIndex.get(zone.siteId);
  if (siteZones) {
    siteZones.delete(id);
  }

  // Remove from store
  zonesStore.delete(id);

  return true;
}

/**
 * Validate an exclusion zone against a site boundary
 */
export async function validateExclusionZone(
  geometry: Polygon | MultiPolygon,
  siteId: string,
  boundaryGeometry?: Polygon | MultiPolygon,
  excludeZoneId?: string
): Promise<ZoneValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate geometry
  const feature = turf.feature(geometry);

  // Check if geometry is valid
  try {
    const area = turf.area(feature);
    if (area <= 0) {
      errors.push('Geometry has zero or negative area');
    }
    if (area < 1) {
      warnings.push('Geometry area is very small (< 1 sq meter)');
    }
  } catch {
    errors.push('Invalid geometry');
  }

  // Check boundary containment
  let withinBoundary = true;
  let overlapPercentage = 100;

  if (boundaryGeometry) {
    withinBoundary = isWithinBoundary(geometry, boundaryGeometry);

    if (!withinBoundary) {
      overlapPercentage = calculateOverlapPercentage(geometry, boundaryGeometry);

      if (overlapPercentage < 50) {
        errors.push(
          `Zone is mostly outside site boundary (${overlapPercentage.toFixed(1)}% overlap)`
        );
      } else {
        warnings.push(
          `Zone extends beyond site boundary (${overlapPercentage.toFixed(1)}% within boundary)`
        );
      }
    }
  }

  // Find intersecting zones
  const intersectingZones = findIntersectingZones(geometry, siteId, excludeZoneId);

  if (intersectingZones.length > 0) {
    warnings.push(`Zone intersects with ${intersectingZones.length} existing zone(s)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    withinBoundary,
    overlapPercentage,
    intersectingZones: intersectingZones.length > 0 ? intersectingZones : undefined,
  };
}

/**
 * Get exclusion zone summary for a site
 */
export async function getExclusionZoneSummary(
  siteId: string,
  siteBoundaryArea?: number
): Promise<ExclusionZoneSummary> {
  const zones = await getExclusionZonesBySite(siteId);

  const byType: Record<ExclusionZoneType, { count: number; area: number }> = {} as Record<
    ExclusionZoneType,
    { count: number; area: number }
  >;

  // Initialize all types
  for (const type of Object.values(ExclusionZoneType)) {
    byType[type] = { count: 0, area: 0 };
  }

  let totalExcludedArea = 0;
  let totalBufferedArea = 0;
  let activeZones = 0;

  for (const zone of zones) {
    if (zone.isActive) {
      activeZones++;
      totalExcludedArea += zone.area;
      totalBufferedArea += zone.bufferedArea || zone.area;

      byType[zone.type].count++;
      byType[zone.type].area += zone.area;
    }
  }

  // Calculate excluded percentage
  const excludedPercentage = siteBoundaryArea ? (totalBufferedArea / siteBoundaryArea) * 100 : 0;

  return {
    siteId,
    totalZones: zones.length,
    activeZones,
    totalExcludedArea,
    totalBufferedArea,
    excludedPercentage,
    byType,
  };
}

/**
 * Import exclusion zones from GeoJSON features
 */
export async function importExclusionZones(
  features: Feature<Polygon | MultiPolygon>[],
  siteId: string,
  defaultType: ExclusionZoneType,
  userId: string
): Promise<ZoneImportResult> {
  const zones: ExclusionZone[] = [];
  const errors: Array<{ index: number; name?: string; error: string }> = [];

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];

    try {
      // Extract properties
      const props = feature.properties || {};
      const name = (props.name as string) || (props.Name as string) || `Zone ${i + 1}`;

      // Try to determine zone type from properties
      let zoneType = defaultType;
      const typeField = (props.type as string) || (props.Type as string) || '';

      if (typeField) {
        const normalizedType = typeField.toLowerCase();
        for (const type of Object.values(ExclusionZoneType)) {
          if (normalizedType.includes(type)) {
            zoneType = type;
            break;
          }
        }
      }

      // Validate geometry type
      if (
        !feature.geometry ||
        (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')
      ) {
        errors.push({
          index: i,
          name,
          error: 'Feature must be a Polygon or MultiPolygon',
        });
        continue;
      }

      // Create the zone
      const zone = await createExclusionZone(
        {
          siteId,
          name,
          type: zoneType,
          description: props.description as string | undefined,
          geometry: feature.geometry as Polygon | MultiPolygon,
          properties: props,
          source: 'imported',
        },
        userId
      );

      zones.push(zone);
    } catch (error) {
      errors.push({
        index: i,
        name: feature.properties?.name as string | undefined,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: errors.length === 0,
    imported: zones.length,
    failed: errors.length,
    zones,
    errors,
  };
}

/**
 * Convert zones to GeoJSON FeatureCollection
 */
export function zonesToGeoJSON(
  zones: ExclusionZone[],
  includeBuffered = false
): FeatureCollection<Polygon | MultiPolygon> {
  const features: ExclusionZoneFeature[] = [];

  for (const zone of zones) {
    // Original zone
    features.push({
      type: 'Feature',
      geometry: zone.geometry,
      properties: {
        id: zone.id,
        name: zone.name,
        type: zone.type,
        bufferDistance: zone.bufferDistance,
        area: zone.area,
        isActive: zone.isActive,
        isBuffered: false,
      },
    });

    // Buffered zone (if applicable)
    if (includeBuffered && zone.bufferedGeometry && zone.bufferDistance > 0) {
      features.push({
        type: 'Feature',
        geometry: zone.bufferedGeometry,
        properties: {
          id: `${zone.id}_buffer`,
          name: `${zone.name} (Buffer)`,
          type: zone.type,
          bufferDistance: zone.bufferDistance,
          area: zone.bufferedArea || zone.area,
          isActive: zone.isActive,
          isBuffered: true,
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Calculate union of all exclusion zones (with buffers)
 */
export async function calculateExclusionUnion(
  siteId: string
): Promise<Polygon | MultiPolygon | null> {
  const zones = await getExclusionZonesBySite(siteId);

  if (zones.length === 0) {
    return null;
  }

  // Collect all geometries (use buffered if available)
  const features = zones
    .filter((z) => z.isActive)
    .map((z) => turf.feature(z.bufferedGeometry || z.geometry));

  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0].geometry as Polygon | MultiPolygon;
  }

  // Union all features
  try {
    let union = features[0];

    for (let i = 1; i < features.length; i++) {
      const result = turf.union(turf.featureCollection([union, features[i]]));
      if (result) {
        union = result;
      }
    }

    return union.geometry as Polygon | MultiPolygon;
  } catch {
    // If union fails, return a MultiPolygon of all geometries
    const polygons: Polygon[] = [];

    for (const feature of features) {
      if (feature.geometry.type === 'Polygon') {
        polygons.push(feature.geometry);
      } else if (feature.geometry.type === 'MultiPolygon') {
        for (const coords of feature.geometry.coordinates) {
          polygons.push({ type: 'Polygon', coordinates: coords });
        }
      }
    }

    return {
      type: 'MultiPolygon',
      coordinates: polygons.map((p) => p.coordinates),
    };
  }
}

/**
 * Get buildable area by subtracting exclusion zones from boundary
 */
export async function calculateBuildableArea(
  boundaryGeometry: Polygon | MultiPolygon,
  siteId: string
): Promise<{
  buildableGeometry: Polygon | MultiPolygon | null;
  buildableArea: number;
  excludedArea: number;
  buildablePercentage: number;
}> {
  const boundaryFeature = turf.feature(boundaryGeometry);
  const boundaryArea = turf.area(boundaryFeature);

  const exclusionUnion = await calculateExclusionUnion(siteId);

  if (!exclusionUnion) {
    return {
      buildableGeometry: boundaryGeometry,
      buildableArea: boundaryArea,
      excludedArea: 0,
      buildablePercentage: 100,
    };
  }

  try {
    const exclusionFeature = turf.feature(exclusionUnion);
    const difference = turf.difference(turf.featureCollection([boundaryFeature, exclusionFeature]));

    if (!difference) {
      return {
        buildableGeometry: null,
        buildableArea: 0,
        excludedArea: boundaryArea,
        buildablePercentage: 0,
      };
    }

    const buildableArea = turf.area(difference);
    const excludedArea = boundaryArea - buildableArea;

    return {
      buildableGeometry: difference.geometry as Polygon | MultiPolygon,
      buildableArea,
      excludedArea,
      buildablePercentage: (buildableArea / boundaryArea) * 100,
    };
  } catch {
    return {
      buildableGeometry: boundaryGeometry,
      buildableArea: boundaryArea,
      excludedArea: 0,
      buildablePercentage: 100,
    };
  }
}

// Export helper functions
export { calculateArea, applyBuffer, isWithinBoundary, calculateOverlapPercentage };
