/**
 * Asset Types for Manual Placement
 */

import type { Polygon, Point } from 'geojson';

export enum AssetType {
  BESS = 'bess',
  SUBSTATION = 'substation',
  O_AND_M = 'o_and_m',
  PARKING = 'parking',
  LAYDOWN = 'laydown',
  INVERTER_PAD = 'inverter_pad',
  TRANSFORMER_PAD = 'transformer_pad',
  WEATHER_STATION = 'weather_station',
}

export interface AssetDimensions {
  width: number;  // meters
  length: number; // meters
  height: number; // meters
}

export interface AssetDefinition {
  type: AssetType;
  name: string;
  icon: string;
  color: string;
  dimensions: AssetDimensions;
  rotationAllowed: boolean;
  rotationStep: number;
  maxSlope: number;
  minSetback: number;
}

export interface PlacedAsset {
  id: string;
  type: AssetType;
  name: string;
  position: { x: number; y: number };
  rotation: number;
  dimensions: AssetDimensions;
  footprint?: Polygon;
  isSelected: boolean;
  isValid: boolean;
  violations: ConstraintViolation[];
}

export interface ConstraintViolation {
  type: 'error' | 'warning' | 'info';
  message: string;
  constraintType: string;
}

export interface AssetPlacementState {
  assets: PlacedAsset[];
  selectedAssetIds: string[];
  draggedAssetType: AssetType | null;
  isDragging: boolean;
  snapToGrid: boolean;
  gridSize: number;
  showConstraints: boolean;
}

export type AssetAction =
  | { type: 'ADD_ASSET'; payload: PlacedAsset }
  | { type: 'UPDATE_ASSET'; payload: { id: string; updates: Partial<PlacedAsset> } }
  | { type: 'REMOVE_ASSET'; payload: string }
  | { type: 'SELECT_ASSET'; payload: string }
  | { type: 'DESELECT_ASSET'; payload: string }
  | { type: 'SELECT_ALL' }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_DRAGGED_TYPE'; payload: AssetType | null }
  | { type: 'TOGGLE_SNAP_TO_GRID' }
  | { type: 'SET_GRID_SIZE'; payload: number }
  | { type: 'TOGGLE_SHOW_CONSTRAINTS' }
  | { type: 'SET_ASSETS'; payload: PlacedAsset[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

// Default asset definitions
export const ASSET_DEFINITIONS: Record<AssetType, AssetDefinition> = {
  [AssetType.BESS]: {
    type: AssetType.BESS,
    name: 'Battery Storage (BESS)',
    icon: '🔋',
    color: '#22c55e',
    dimensions: { width: 50, length: 80, height: 3 },
    rotationAllowed: true,
    rotationStep: 90,
    maxSlope: 2,
    minSetback: 30,
  },
  [AssetType.SUBSTATION]: {
    type: AssetType.SUBSTATION,
    name: 'Substation',
    icon: '⚡',
    color: '#eab308',
    dimensions: { width: 40, length: 60, height: 8 },
    rotationAllowed: true,
    rotationStep: 90,
    maxSlope: 1,
    minSetback: 50,
  },
  [AssetType.O_AND_M]: {
    type: AssetType.O_AND_M,
    name: 'O&M Building',
    icon: '🏢',
    color: '#3b82f6',
    dimensions: { width: 20, length: 30, height: 5 },
    rotationAllowed: true,
    rotationStep: 90,
    maxSlope: 3,
    minSetback: 20,
  },
  [AssetType.PARKING]: {
    type: AssetType.PARKING,
    name: 'Parking Area',
    icon: '🅿️',
    color: '#64748b',
    dimensions: { width: 30, length: 50, height: 0 },
    rotationAllowed: true,
    rotationStep: 90,
    maxSlope: 5,
    minSetback: 10,
  },
  [AssetType.LAYDOWN]: {
    type: AssetType.LAYDOWN,
    name: 'Laydown Area',
    icon: '📦',
    color: '#f97316',
    dimensions: { width: 60, length: 100, height: 0 },
    rotationAllowed: true,
    rotationStep: 90,
    maxSlope: 3,
    minSetback: 15,
  },
  [AssetType.INVERTER_PAD]: {
    type: AssetType.INVERTER_PAD,
    name: 'Inverter Pad',
    icon: '🔌',
    color: '#8b5cf6',
    dimensions: { width: 5, length: 8, height: 2 },
    rotationAllowed: true,
    rotationStep: 90,
    maxSlope: 3,
    minSetback: 10,
  },
  [AssetType.TRANSFORMER_PAD]: {
    type: AssetType.TRANSFORMER_PAD,
    name: 'Transformer Pad',
    icon: '🔧',
    color: '#ec4899',
    dimensions: { width: 8, length: 10, height: 3 },
    rotationAllowed: true,
    rotationStep: 90,
    maxSlope: 2,
    minSetback: 15,
  },
  [AssetType.WEATHER_STATION]: {
    type: AssetType.WEATHER_STATION,
    name: 'Weather Station',
    icon: '🌡️',
    color: '#06b6d4',
    dimensions: { width: 3, length: 3, height: 10 },
    rotationAllowed: false,
    rotationStep: 0,
    maxSlope: 10,
    minSetback: 20,
  },
};

// Helper functions
export function getAssetDefinition(type: AssetType): AssetDefinition {
  return ASSET_DEFINITIONS[type];
}

export function createPlacedAsset(
  type: AssetType,
  position: { x: number; y: number },
  rotation = 0
): PlacedAsset {
  const definition = getAssetDefinition(type);
  return {
    id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    name: definition.name,
    position,
    rotation,
    dimensions: { ...definition.dimensions },
    isSelected: false,
    isValid: true,
    violations: [],
  };
}

export function calculateAssetFootprint(asset: PlacedAsset): Polygon {
  const { position, rotation, dimensions } = asset;
  const w = dimensions.width / 2;
  const l = dimensions.length / 2;

  // Create corners relative to center
  let corners: [number, number][] = [
    [-w, -l],
    [w, -l],
    [w, l],
    [-w, l],
  ];

  // Rotate if needed
  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    corners = corners.map(([x, y]) => [
      x * cos - y * sin,
      x * sin + y * cos,
    ]);
  }

  // Translate to position
  const coordinates = corners.map(([x, y]) => [
    position.x + x,
    position.y + y,
  ]);

  // Close the polygon
  coordinates.push(coordinates[0]);

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
