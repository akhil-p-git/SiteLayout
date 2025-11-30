/**
 * MVP+ Site Layouts - Shared Types
 *
 * Core type definitions shared between frontend and backend.
 */

// ============================================================================
// GeoJSON Types
// ============================================================================

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: number[][];
}

export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONMultiPolygon | GeoJSONLineString;

// ============================================================================
// Core Entities
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  defaultUnits: 'metric' | 'imperial';
  defaultCRS: string;
  costFactors: CostFactors;
  assetTemplates: AssetTemplate[];
}

export interface CostFactors {
  cutCostPerUnit: number;
  fillCostPerUnit: number;
  haulCostPerUnit: number;
  currency: string;
}

export interface AssetTemplate {
  type: AssetType;
  name: string;
  defaultDimensions: Dimensions;
  defaultConstraints: AssetConstraints;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'active' | 'archived' | 'completed';

export interface Site {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  location: SiteLocation;
  boundary: GeoJSONPolygon | GeoJSONMultiPolygon;
  boundaryArea: number;
  terrainData: TerrainData;
  exclusionZones: ExclusionZone[];
  entryPoints: GeoJSONPoint[];
  status: SiteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SiteLocation {
  lat: number;
  lng: number;
  address?: string;
  region?: string;
}

export interface TerrainData {
  demUrl: string;
  resolution: number;
  minElevation: number;
  maxElevation: number;
  averageSlope: number;
}

export type SiteStatus = 'draft' | 'analyzed' | 'optimized' | 'finalized';

export interface ExclusionZone {
  id: string;
  siteId: string;
  name: string;
  type: ExclusionZoneType;
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
  buffer: number;
  notes?: string;
}

export type ExclusionZoneType = 'wetland' | 'setback' | 'easement' | 'environmental' | 'custom';

// ============================================================================
// Layout Types
// ============================================================================

export interface Layout {
  id: string;
  siteId: string;
  version: number;
  name: string;
  status: LayoutStatus;
  configuration: LayoutConfiguration;
  assets: AssetPlacement[];
  roads: RoadNetwork;
  earthwork: EarthworkSummary;
  metrics: LayoutMetrics;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type LayoutStatus = 'draft' | 'optimized' | 'approved' | 'rejected';

export interface LayoutConfiguration {
  optimizationObjective: OptimizationObjective;
  constraints: LayoutConstraints;
  assetRequirements: AssetRequirement[];
}

export type OptimizationObjective = 'min_earthwork' | 'max_capacity' | 'balanced';

export interface LayoutConstraints {
  maxSlope: number;
  boundarySetback: number;
  interAssetBuffer: number;
  maxRoadGrade: number;
  roadWidth: number;
}

export interface AssetRequirement {
  type: AssetType;
  count: number;
  dimensions: Dimensions;
}

export interface LayoutMetrics {
  totalArea: number;
  usableArea: number;
  utilizationRate: number;
  totalCutVolume: number;
  totalFillVolume: number;
  netBalance: number;
  estimatedCost: number;
  roadLength: number;
  averageHaulDistance: number;
}

// ============================================================================
// Asset Types
// ============================================================================

export interface AssetPlacement {
  id: string;
  layoutId: string;
  assetType: AssetType;
  name: string;
  geometry: GeoJSONPolygon;
  centroid: GeoJSONPoint;
  dimensions: Dimensions;
  elevation: ElevationData;
  earthwork: AssetEarthwork;
  constraints: AssetConstraints;
  metadata: Record<string, unknown>;
}

export type AssetType =
  | 'bess_container'
  | 'bess_array'
  | 'substation'
  | 'om_building'
  | 'parking'
  | 'laydown'
  | 'transformer'
  | 'inverter'
  | 'solar_array'
  | 'custom';

export interface Dimensions {
  length: number;
  width: number;
  area: number;
}

export interface ElevationData {
  existing: number;
  proposed: number;
  grade: number;
}

export interface AssetEarthwork {
  cutVolume: number;
  fillVolume: number;
}

export interface AssetConstraints {
  minSetback: number;
  maxSlope: number;
}

// ============================================================================
// Road Types
// ============================================================================

export interface RoadNetwork {
  id: string;
  layoutId: string;
  segments: RoadSegment[];
  totalLength: number;
  totalEarthwork: AssetEarthwork;
}

export interface RoadSegment {
  id: string;
  geometry: GeoJSONLineString;
  length: number;
  width: number;
  grade: number[];
  maxGrade: number;
  avgGrade: number;
  earthwork: AssetEarthwork;
  type: RoadType;
}

export type RoadType = 'access' | 'internal' | 'emergency';

// ============================================================================
// Earthwork Types
// ============================================================================

export interface EarthworkSummary {
  id: string;
  layoutId: string;
  components: EarthworkComponent[];
  totals: EarthworkTotals;
  costs: EarthworkCosts;
  calculatedAt: string;
}

export interface EarthworkComponent {
  assetId?: string;
  roadSegmentId?: string;
  name: string;
  cutVolume: number;
  fillVolume: number;
  avgHaulDistance: number;
}

export interface EarthworkTotals {
  cutVolume: number;
  fillVolume: number;
  netBalance: number;
  importRequired: number;
  exportRequired: number;
}

export interface EarthworkCosts {
  unitCutCost: number;
  unitFillCost: number;
  unitHaulCost: number;
  totalCutCost: number;
  totalFillCost: number;
  totalHaulCost: number;
  grandTotal: number;
}

// ============================================================================
// ESG Types
// ============================================================================

export interface ESGMetrics {
  carbonFootprint: CarbonFootprint;
  habitatImpact: HabitatImpact;
  permitRequirements: string[];
}

export interface CarbonFootprint {
  constructionEmissions: number;
  operationalOffset: number;
  netLifetimeImpact: number;
  projectLifeYears: number;
}

export interface HabitatImpact {
  score: number;
  affectedSpecies: string[];
  wetlandArea: number;
  criticalHabitatArea: number;
}

// ============================================================================
// Portfolio Types
// ============================================================================

export interface PortfolioSummary {
  totalSites: number;
  totalCapacity: number;
  averageCost: number;
  pipelineValue: number;
  statusBreakdown: Record<SiteStatus, number>;
}

export interface SiteScore {
  siteId: string;
  compositeScore: number;
  riskAdjustedScore: number;
  components: ScoreComponent[];
}

export interface ScoreComponent {
  name: string;
  value: number;
  weight: number;
  weightedValue: number;
}

// ============================================================================
// API Types
// ============================================================================

export interface APIResponse<T> {
  data: T;
  pagination?: PaginationInfo;
}

export interface APIError {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    requestId: string;
  };
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface JobStatus {
  id: string;
  type: JobType;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: unknown;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export type JobType = 'terrain_analysis' | 'optimization' | 'export';
