import { length, along, lineString } from '@turf/turf';
import { RoadSegment, CreateRoadInput, UpdateRoadInput, ROAD_CONSTRAINTS, ElevationProfile, ElevationSample, ElevationStats } from '../types/road';

const roadsStore = new Map<string, RoadSegment>();

export async function createRoad(input: CreateRoadInput): Promise<RoadSegment> {
  const coords = input.coordinates;
  if (coords.length < 2) throw new Error('Road must have at least 2 points');

  const road: RoadSegment = {
    id: `road_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    layoutId: input.layoutId,
    type: input.type,
    width: input.width || 5,
    geometry: { type: 'LineString', coordinates: coords },
    createdAt: new Date(),
  };

  // Calculate road properties
  const lineStr = lineString(coords);
  road.length = length(lineStr, { units: 'kilometers' }) * 1000; // Convert to meters

  // Calculate elevation profile (simplified - would use real DEM in production)
  const profile = await calculateElevationProfile(coords, input.demUrl);
  road.elevationProfile = profile;
  road.maxGrade = Math.max(...profile.stats.maxGrade);
  road.avgGrade = profile.stats.avgGrade;

  roadsStore.set(road.id, road);
  return road;
}

export async function getRoad(id: string): Promise<RoadSegment | null> {
  return roadsStore.get(id) || null;
}

export async function listRoadsByLayout(layoutId: string): Promise<RoadSegment[]> {
  return Array.from(roadsStore.values()).filter((r) => r.layoutId === layoutId);
}

export async function updateRoad(id: string, input: UpdateRoadInput): Promise<RoadSegment> {
  const road = roadsStore.get(id);
  if (!road) throw new Error('Road not found');

  if (input.coordinates) {
    road.geometry.coordinates = input.coordinates;
    const lineStr = lineString(input.coordinates);
    road.length = length(lineStr, { units: 'kilometers' }) * 1000;
    const profile = await calculateElevationProfile(input.coordinates);
    road.elevationProfile = profile;
    road.maxGrade = profile.stats.maxGrade;
    road.avgGrade = profile.stats.avgGrade;
  }

  if (input.type) road.type = input.type;
  if (input.width) road.width = input.width;

  roadsStore.set(id, road);
  return road;
}

export async function deleteRoad(id: string): Promise<void> {
  if (!roadsStore.has(id)) throw new Error('Road not found');
  roadsStore.delete(id);
}

/**
 * Calculate elevation profile from coordinates (simplified)
 * In production, this would fetch from a DEM service like Mapbox or USGS
 */
async function calculateElevationProfile(
  coordinates: [number, number][],
  demUrl?: string
): Promise<ElevationProfile> {
  const samples: ElevationSample[] = [];
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  const elevations: number[] = [];

  // Simplified: calculate distances and mock elevations
  for (let i = 0; i < coordinates.length; i++) {
    const [lng, lat] = coordinates[i];
    const distance = i === 0 ? 0 : calculateDistance(coordinates[i - 1], [lng, lat]);
    totalDistance += distance;

    // Mock elevation (in production, fetch from DEM)
    const elevation = 100 + Math.sin(lng * 0.1) * 50;
    elevations.push(elevation);

    const grade = i === 0 ? 0 : ((elevation - elevations[i - 1]) / distance) * 100;

    samples.push({
      distance: totalDistance,
      elevation,
      grade: Math.min(Math.abs(grade), ROAD_CONSTRAINTS.MAX_GRADE),
      lat,
      lng,
    });
  }

  // Calculate statistics
  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) elevationGain += diff;
    else elevationLoss += -diff;
  }

  const stats: ElevationStats = {
    minElevation: Math.min(...elevations),
    maxElevation: Math.max(...elevations),
    minGrade: Math.min(...samples.map((s) => s.grade)) * -1,
    maxGrade: Math.max(...samples.map((s) => s.grade)),
    avgGrade: samples.reduce((sum, s) => sum + s.grade, 0) / samples.length,
    elevationGain,
    elevationLoss,
  };

  return {
    samplingInterval: ROAD_CONSTRAINTS.ELEVATION_SAMPLING,
    totalLength: totalDistance,
    samples,
    stats,
  };
}

function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const dLng = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[1] * Math.PI) / 180) * Math.cos((coord2[1] * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function validateRoad(coordinates: [number, number][]): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  if (coordinates.length < 2) errors.push('Road must have at least 2 points');
  if (coordinates.some((c) => c[0] < -180 || c[0] > 180 || c[1] < -90 || c[1] > 90)) {
    errors.push('Invalid coordinates');
  }
  return { isValid: errors.length === 0, errors };
}
