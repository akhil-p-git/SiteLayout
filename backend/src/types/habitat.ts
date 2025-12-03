/**
 * Habitat Types
 *
 * Types for USFWS endangered species and NWI wetlands data integration.
 */

import type { Polygon, MultiPolygon, Point, Feature, FeatureCollection } from 'geojson';

// Endangered Species Types
export type SpeciesStatus =
  | 'endangered'
  | 'threatened'
  | 'candidate'
  | 'proposed_endangered'
  | 'proposed_threatened'
  | 'under_review';

export interface EndangeredSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  status: SpeciesStatus;
  group: 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'fish' | 'invertebrate' | 'plant';
  criticalHabitat: boolean;
  bufferDistance: number; // meters
}

export interface CriticalHabitat {
  id: string;
  speciesId: string;
  species: EndangeredSpecies;
  geometry: Polygon | MultiPolygon;
  area: number; // square meters
  designation: string;
  dateDesignated: string;
}

// Wetland Types (NWI)
export type WetlandSystem =
  | 'marine'
  | 'estuarine'
  | 'riverine'
  | 'lacustrine'
  | 'palustrine';

export type WetlandClass =
  | 'emergent'
  | 'scrub_shrub'
  | 'forested'
  | 'aquatic_bed'
  | 'unconsolidated_shore'
  | 'unconsolidated_bottom'
  | 'rock_bottom';

export interface Wetland {
  id: string;
  nwiCode: string; // e.g., "PFO1A" - Palustrine Forested Broad-leaved Deciduous Temporary
  system: WetlandSystem;
  wetlandClass: WetlandClass;
  geometry: Polygon | MultiPolygon;
  area: number; // square meters
  waterRegime: string;
  specialModifiers: string[];
}

// Impact Scoring
export interface HabitatImpactFactor {
  factorId: string;
  name: string;
  weight: number; // 0-1
  value: number; // calculated value
  description: string;
}

export interface HabitatImpactScore {
  overall: number; // 0-100, lower is better (less impact)
  factors: HabitatImpactFactor[];
  criticalHabitatOverlap: number; // percentage
  wetlandOverlap: number; // percentage
  speciesAtRisk: EndangeredSpecies[];
  wetlandsAffected: Wetland[];
  requiredPermits: EnvironmentalPermit[];
  recommendations: string[];
}

// Environmental Permits
export type PermitType =
  | 'section_404'         // Clean Water Act Section 404
  | 'section_7'           // ESA Section 7 Consultation
  | 'section_10'          // ESA Section 10 Incidental Take Permit
  | 'nepa'                // National Environmental Policy Act
  | 'biological_opinion'  // USFWS Biological Opinion
  | 'wetland_delineation' // Wetland Delineation Report
  | 'state_permit';       // State-specific environmental permit

export interface EnvironmentalPermit {
  type: PermitType;
  name: string;
  authority: string;
  estimatedTimeline: string;
  triggerReason: string;
  required: boolean;
  notes: string;
}

// API Response Types
export interface HabitatOverlayData {
  siteId: string;
  boundaryArea: number;
  criticalHabitats: CriticalHabitat[];
  wetlands: Wetland[];
  impactScore: HabitatImpactScore;
  bufferZones: Feature<Polygon | MultiPolygon>[];
  timestamp: string;
}

export interface HabitatQueryParams {
  siteId: string;
  boundaryGeometry: Polygon | MultiPolygon;
  includeBuffers?: boolean;
  bufferDistance?: number;
}

// GeoJSON Feature Properties
export interface CriticalHabitatProperties {
  type: 'critical_habitat';
  speciesId: string;
  commonName: string;
  scientificName: string;
  status: SpeciesStatus;
  designation: string;
}

export interface WetlandProperties {
  type: 'wetland';
  nwiCode: string;
  system: WetlandSystem;
  wetlandClass: WetlandClass;
  waterRegime: string;
}

export type HabitatFeature =
  | Feature<Polygon | MultiPolygon, CriticalHabitatProperties>
  | Feature<Polygon | MultiPolygon, WetlandProperties>;

// Layer Colors
export const HABITAT_COLORS = {
  criticalHabitat: {
    endangered: '#dc2626',    // red-600
    threatened: '#f97316',    // orange-500
    candidate: '#eab308',     // yellow-500
    proposed_endangered: '#ec4899', // pink-500
    proposed_threatened: '#f472b6', // pink-400
    under_review: '#a3a3a3',  // gray-400
  },
  wetland: {
    marine: '#0369a1',        // sky-700
    estuarine: '#0284c7',     // sky-600
    riverine: '#0ea5e9',      // sky-500
    lacustrine: '#38bdf8',    // sky-400
    palustrine: '#7dd3fc',    // sky-300
  },
  buffer: '#fbbf24',          // amber-400
} as const;

export const DEFAULT_BUFFER_DISTANCES: Record<SpeciesStatus, number> = {
  endangered: 500,
  threatened: 300,
  candidate: 200,
  proposed_endangered: 400,
  proposed_threatened: 250,
  under_review: 100,
};
