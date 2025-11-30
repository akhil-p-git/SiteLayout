// Upload types

export type UploadType = 'boundary' | 'exclusions' | 'preview' | 'validate';

export interface UploadedFile {
  name: string;
  type: 'kml' | 'kmz' | 'geojson';
  size: number;
}

export interface GeometryBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface FileMetadata {
  name?: string;
  description?: string;
  featureCount: number;
  polygonCount: number;
  lineCount: number;
  pointCount: number;
}

export interface PolygonGeometry {
  id: string;
  name: string;
  type: 'polygon' | 'multipolygon';
  geometry: GeoJSON.Geometry;
  wkt: string;
  area?: number;
  areaAcres?: number;
  areaHectares?: number;
  properties: Record<string, unknown>;
}

export interface ValidationError {
  id?: string;
  name?: string;
  valid: boolean;
  errors: string[];
}

export interface BoundaryUploadResponse {
  success: boolean;
  file: UploadedFile;
  metadata: FileMetadata;
  bounds: GeometryBounds | null;
  crs: string;
  polygons: PolygonGeometry[];
  validation: {
    valid: boolean;
    errors: ValidationError[];
  };
}

export interface ExclusionResult {
  filename: string;
  type: 'kml' | 'kmz' | 'geojson';
  polygonCount: number;
  polygons: PolygonGeometry[];
}

export interface ExclusionError {
  filename: string;
  error: string;
}

export interface ExclusionsUploadResponse {
  success: boolean;
  results: ExclusionResult[];
  errors?: ExclusionError[];
}

export interface PreviewFeature {
  type?: string;
  name?: string;
  properties?: Record<string, unknown>;
}

export interface PreviewUploadResponse {
  file: UploadedFile;
  metadata: FileMetadata;
  bounds: GeometryBounds | null;
  crs: string;
  preview: {
    featureCount: number;
    totalFeatures: number;
    truncated: boolean;
    features: PreviewFeature[];
  };
}

export interface ValidationDetail {
  index: number;
  name?: string;
  type?: string;
  valid: boolean;
  errors?: string[];
}

export interface ValidateUploadResponse {
  file: UploadedFile;
  validation: {
    valid: boolean;
    totalFeatures: number;
    validFeatures: number;
    invalidFeatures: number;
    details: ValidationDetail[];
  };
  metadata: FileMetadata & {
    hasPolygons: boolean;
    polygonCount: number;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  result:
    | BoundaryUploadResponse
    | ExclusionsUploadResponse
    | PreviewUploadResponse
    | ValidateUploadResponse
    | null;
}

// Allowed file extensions
export const ALLOWED_EXTENSIONS = ['.kml', '.kmz', '.geojson', '.json'];

// Max file size (100MB)
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

export function isValidFileExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS.includes(ext);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatArea(areaAcres: number | undefined): string {
  if (!areaAcres) return 'N/A';
  if (areaAcres < 1) return `${(areaAcres * 43560).toFixed(0)} sq ft`;
  if (areaAcres >= 640) return `${(areaAcres / 640).toFixed(2)} sq mi`;
  return `${areaAcres.toFixed(2)} acres`;
}
