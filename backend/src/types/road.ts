import { RoadType } from '../generated/prisma';

export interface RoadSegment {
  id: string;
  layoutId: string;
  type: RoadType;
  length?: number;
  width?: number;
  maxGrade?: number;
  avgGrade?: number;
  elevationProfile?: ElevationProfile;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  createdAt: Date;
}

export interface ElevationProfile {
  samplingInterval: number;
  totalLength: number;
  samples: ElevationSample[];
  stats: ElevationStats;
}

export interface ElevationSample {
  distance: number;
  elevation: number;
  grade: number;
  lat: number;
  lng: number;
}

export interface ElevationStats {
  minElevation: number;
  maxElevation: number;
  minGrade: number;
  maxGrade: number;
  avgGrade: number;
  elevationGain: number;
  elevationLoss: number;
}

export interface CreateRoadInput {
  layoutId: string;
  type: RoadType;
  width?: number;
  coordinates: [number, number][];
  demUrl?: string;
}

export interface UpdateRoadInput {
  type?: RoadType;
  width?: number;
  coordinates?: [number, number][];
}

export const ROAD_CONSTRAINTS = {
  MAX_GRADE: 12,
  RECOMMENDED_GRADE: 8,
  MIN_SPACING: 5,
  ELEVATION_SAMPLING: 10, // meters
};
