import { distance, point } from '@turf/turf';
import {
  CreateEntryPointInput,
  EntryPoint,
  EntryPointValidationRequest,
  EntryPointValidationResult,
  UpdateEntryPointInput,
  ENTRY_POINT_CONSTRAINTS,
  VALIDATION_RULES,
} from '../types/entryPoint';

// In-memory storage (will be replaced with Prisma queries)
const entryPointsStore = new Map<string, EntryPoint>();

/**
 * Create a new entry point
 */
export async function createEntryPoint(input: CreateEntryPointInput): Promise<EntryPoint> {
  // Validate input
  const validation = await validateEntryPoint(input);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.map((e) => e.message).join('; ')}`);
  }

  const entryPoint: EntryPoint = {
    id: generateId(),
    siteId: input.siteId,
    name: input.name,
    type: input.type,
    capacity: input.capacity,
    restrictions: input.restrictions,
    geometry: {
      type: 'Point',
      coordinates: input.coordinates,
      crs: {
        type: 'name',
        properties: { name: 'EPSG:4326' },
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  entryPointsStore.set(entryPoint.id, entryPoint);
  return entryPoint;
}

/**
 * Get entry point by ID
 */
export async function getEntryPoint(id: string): Promise<EntryPoint | null> {
  return entryPointsStore.get(id) || null;
}

/**
 * List all entry points for a site
 */
export async function listEntryPointsBySite(siteId: string): Promise<EntryPoint[]> {
  return Array.from(entryPointsStore.values()).filter((ep) => ep.siteId === siteId);
}

/**
 * Update entry point
 */
export async function updateEntryPoint(id: string, input: UpdateEntryPointInput): Promise<EntryPoint> {
  const entryPoint = entryPointsStore.get(id);
  if (!entryPoint) {
    throw new Error('Entry point not found');
  }

  const updated: EntryPoint = {
    ...entryPoint,
    name: input.name ?? entryPoint.name,
    type: input.type ?? entryPoint.type,
    capacity: input.capacity ?? entryPoint.capacity,
    restrictions: input.restrictions ?? entryPoint.restrictions,
    geometry: input.coordinates
      ? {
          type: 'Point',
          coordinates: input.coordinates,
          crs: { type: 'name', properties: { name: 'EPSG:4326' } },
        }
      : entryPoint.geometry,
    updatedAt: new Date(),
  };

  // Re-validate after update
  const validation = await validateEntryPoint({
    siteId: entryPoint.siteId,
    name: updated.name,
    type: updated.type,
    capacity: updated.capacity,
    restrictions: updated.restrictions,
    coordinates: updated.geometry.coordinates as [number, number],
  });

  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.map((e) => e.message).join('; ')}`);
  }

  entryPointsStore.set(id, updated);
  return updated;
}

/**
 * Delete entry point
 */
export async function deleteEntryPoint(id: string): Promise<void> {
  const entryPoint = entryPointsStore.get(id);
  if (!entryPoint) {
    throw new Error('Entry point not found');
  }

  entryPointsStore.delete(id);
}

/**
 * Validate entry point against constraints
 */
export async function validateEntryPoint(input: EntryPointValidationRequest | CreateEntryPointInput): Promise<EntryPointValidationResult> {
  const errors = [];
  const warnings = [];

  // Validate coordinates
  if (!isValidCoordinates(input.coordinates)) {
    errors.push({
      type: 'INVALID_COORDINATES',
      message: VALIDATION_RULES.INVALID_COORDINATES,
    });
    return { isValid: false, errors, warnings };
  }

  // Check if only one primary per site
  if (input.type === 'primary') {
    const existingPrimary = Array.from(entryPointsStore.values()).some(
      (ep) => ep.siteId === input.siteId && ep.type === 'primary'
    );
    if (existingPrimary) {
      errors.push({
        type: 'MULTIPLE_PRIMARY',
        message: VALIDATION_RULES.ONLY_ONE_PRIMARY_PER_SITE,
      });
    }
  }

  // Check spacing from other entry points
  const otherEps = Array.from(entryPointsStore.values()).filter((ep) => ep.siteId === input.siteId);
  for (const otherEp of otherEps) {
    const dist = distance(point(input.coordinates), point(otherEp.geometry.coordinates as [number, number]));
    if (dist < ENTRY_POINT_CONSTRAINTS.MIN_SPACING / 1000) {
      // distance returns km, constraint is in m
      warnings.push({
        type: 'TOO_CLOSE',
        message: VALIDATION_RULES.MINIMUM_SPACING,
        details: {
          distanceM: dist * 1000,
          minRequiredM: ENTRY_POINT_CONSTRAINTS.MIN_SPACING,
        },
      });
    }
  }

  // Check for duplicate name
  if ('name' in input) {
    const duplicateName = Array.from(entryPointsStore.values()).some(
      (ep) => ep.siteId === input.siteId && ep.name === input.name
    );
    if (duplicateName) {
      errors.push({
        type: 'DUPLICATE_NAME',
        message: VALIDATION_RULES.DUPLICATE_NAME,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate coordinates are valid WGS84
 */
function isValidCoordinates(coords: [number, number]): boolean {
  const [lng, lat] = coords;
  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Export entry points as GeoJSON FeatureCollection
 */
export async function exportAsGeoJSON(siteId: string) {
  const entryPoints = await listEntryPointsBySite(siteId);
  return {
    type: 'FeatureCollection',
    features: entryPoints.map((ep) => ({
      type: 'Feature',
      id: ep.id,
      geometry: ep.geometry,
      properties: {
        name: ep.name,
        type: ep.type,
        capacity: ep.capacity,
        restrictions: ep.restrictions,
      },
    })),
  };
}
