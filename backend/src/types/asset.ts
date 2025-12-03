import { AssetType } from '../generated/prisma';

export interface AssetPlacement {
  id: string;
  layoutId: string;
  assetType: AssetType;
  name: string;
  geometry: { type: 'Polygon'; coordinates: [number, number][][] };
  constraintViolations?: ConstraintViolation[];
  createdAt: Date;
}

export interface ConstraintViolation {
  constraintId: string;
  constraintName: string;
  constraintType: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: Record<string, any>;
}

export interface CreateAssetInput {
  layoutId: string;
  assetType: AssetType;
  name: string;
  coordinates: [number, number][][]; // Polygon rings
}

export interface UpdateAssetInput {
  name?: string;
  coordinates?: [number, number][][];
}

export const ASSET_CONSTRAINTS = {
  bess_container: { minSetback: 15, maxSlope: 5 },
  bess_array: { minSetback: 20, maxSlope: 10 },
  substation: { minSetback: 50, maxSlope: 2 },
  om_building: { minSetback: 20, maxSlope: 3 },
  parking: { minSetback: 10, maxSlope: 8 },
  laydown: { minSetback: 10, maxSlope: 8 },
  transformer: { minSetback: 10, maxSlope: 5 },
  inverter: { minSetback: 15, maxSlope: 3 },
  solar_array: { minSetback: 15, maxSlope: 15 },
  custom: { minSetback: 10, maxSlope: 10 },
};
