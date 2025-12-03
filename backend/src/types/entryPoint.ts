import { EntryPointType } from '../generated/prisma';

// ============================================================================
// ENUMS
// ============================================================================

export enum EntryPointTypeEnum {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  EMERGENCY = 'emergency',
  MAINTENANCE = 'maintenance',
  CONSTRUCTION = 'construction',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface EntryPoint {
  id: string;
  siteId: string;
  name: string;
  type: EntryPointType;
  capacity?: number;
  restrictions?: Record<string, any>;
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    crs?: {
      type: 'name';
      properties: { name: string };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EntryPointWithoutGeometry {
  id: string;
  siteId: string;
  name: string;
  type: EntryPointType;
  capacity?: number;
  restrictions?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateEntryPointInput {
  siteId: string;
  name: string;
  type: EntryPointType;
  capacity?: number;
  restrictions?: Record<string, any>;
  coordinates: [number, number]; // [lng, lat]
}

export interface UpdateEntryPointInput {
  name?: string;
  type?: EntryPointType;
  capacity?: number;
  restrictions?: Record<string, any>;
  coordinates?: [number, number]; // [lng, lat]
}

export interface EntryPointValidationRequest {
  siteId: string;
  coordinates: [number, number]; // [lng, lat]
  type?: EntryPointType;
}

export interface EntryPointValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationWarning {
  type: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// VALIDATION CONSTRAINTS
// ============================================================================

export const ENTRY_POINT_CONSTRAINTS = {
  BOUNDARY_TOLERANCE: 50, // meters - allow points up to 50m outside boundary
  MIN_SPACING: 50, // meters - minimum distance between entry points
  MAX_CAPACITY: 1000,
  MAX_NAME_LENGTH: 255,
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  ONLY_ONE_PRIMARY_PER_SITE: 'Only one primary entry point allowed per site',
  POINT_MUST_BE_CONTAINED: `Point must be within site boundary (±${ENTRY_POINT_CONSTRAINTS.BOUNDARY_TOLERANCE}m)`,
  MINIMUM_SPACING: `Entry points must be at least ${ENTRY_POINT_CONSTRAINTS.MIN_SPACING}m apart`,
  INVALID_COORDINATES: 'Invalid coordinates format',
  SITE_NOT_FOUND: 'Site not found',
  DUPLICATE_NAME: 'Entry point with this name already exists for this site',
};
