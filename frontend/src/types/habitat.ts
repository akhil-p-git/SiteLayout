/**
 * Habitat Types for Frontend
 */

import type { Polygon, MultiPolygon, Feature, FeatureCollection } from 'geojson';

export type SpeciesStatus =
  | 'endangered'
  | 'threatened'
  | 'candidate'
  | 'proposed_endangered'
  | 'proposed_threatened'
  | 'under_review';

export type SpeciesGroup = 'mammal' | 'bird' | 'reptile' | 'amphibian' | 'fish' | 'invertebrate' | 'plant';

export interface EndangeredSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  status: SpeciesStatus;
  group: SpeciesGroup;
  criticalHabitat: boolean;
  bufferDistance: number;
}

export interface CriticalHabitat {
  id: string;
  speciesId: string;
  species: EndangeredSpecies;
  geometry: Polygon | MultiPolygon;
  area: number;
  designation: string;
  dateDesignated: string;
}

export type WetlandSystem = 'marine' | 'estuarine' | 'riverine' | 'lacustrine' | 'palustrine';
export type WetlandClass = 'emergent' | 'scrub_shrub' | 'forested' | 'aquatic_bed' | 'unconsolidated_shore' | 'unconsolidated_bottom' | 'rock_bottom';

export interface Wetland {
  id: string;
  nwiCode: string;
  system: WetlandSystem;
  wetlandClass: WetlandClass;
  geometry: Polygon | MultiPolygon;
  area: number;
  waterRegime: string;
  specialModifiers: string[];
}

export interface HabitatImpactFactor {
  factorId: string;
  name: string;
  weight: number;
  value: number;
  description: string;
}

export type PermitType =
  | 'section_404'
  | 'section_7'
  | 'section_10'
  | 'nepa'
  | 'biological_opinion'
  | 'wetland_delineation'
  | 'state_permit';

export interface EnvironmentalPermit {
  type: PermitType;
  name: string;
  authority: string;
  estimatedTimeline: string;
  triggerReason: string;
  required: boolean;
  notes: string;
}

export interface HabitatImpactScore {
  overall: number;
  factors: HabitatImpactFactor[];
  criticalHabitatOverlap: number;
  wetlandOverlap: number;
  speciesAtRisk: EndangeredSpecies[];
  wetlandsAffected: Wetland[];
  requiredPermits: EnvironmentalPermit[];
  recommendations: string[];
}

export interface HabitatOverlayData {
  siteId: string;
  boundaryArea: number;
  criticalHabitats: CriticalHabitat[];
  wetlands: Wetland[];
  impactScore: HabitatImpactScore;
  bufferZones: Feature<Polygon | MultiPolygon>[];
  timestamp: string;
}

export interface HabitatLayerConfig {
  colors: {
    criticalHabitat: Record<SpeciesStatus, string>;
    wetland: Record<WetlandSystem, string>;
    buffer: string;
  };
  bufferDistances: Record<SpeciesStatus, number>;
  layers: Array<{
    id: string;
    name: string;
    description: string;
    visible: boolean;
    opacity: number;
  }>;
}

// Color constants (matching backend)
export const HABITAT_COLORS = {
  criticalHabitat: {
    endangered: '#dc2626',
    threatened: '#f97316',
    candidate: '#eab308',
    proposed_endangered: '#ec4899',
    proposed_threatened: '#f472b6',
    under_review: '#a3a3a3',
  },
  wetland: {
    marine: '#0369a1',
    estuarine: '#0284c7',
    riverine: '#0ea5e9',
    lacustrine: '#38bdf8',
    palustrine: '#7dd3fc',
  },
  buffer: '#fbbf24',
} as const;

// Status labels
export const STATUS_LABELS: Record<SpeciesStatus, string> = {
  endangered: 'Endangered',
  threatened: 'Threatened',
  candidate: 'Candidate',
  proposed_endangered: 'Proposed Endangered',
  proposed_threatened: 'Proposed Threatened',
  under_review: 'Under Review',
};

export const WETLAND_SYSTEM_LABELS: Record<WetlandSystem, string> = {
  marine: 'Marine',
  estuarine: 'Estuarine',
  riverine: 'Riverine',
  lacustrine: 'Lacustrine',
  palustrine: 'Palustrine',
};

export const WETLAND_CLASS_LABELS: Record<WetlandClass, string> = {
  emergent: 'Emergent',
  scrub_shrub: 'Scrub-Shrub',
  forested: 'Forested',
  aquatic_bed: 'Aquatic Bed',
  unconsolidated_shore: 'Unconsolidated Shore',
  unconsolidated_bottom: 'Unconsolidated Bottom',
  rock_bottom: 'Rock Bottom',
};

export function formatArea(areaM2: number): string {
  if (areaM2 >= 4046.86) {
    return `${(areaM2 / 4046.86).toFixed(2)} acres`;
  }
  return `${areaM2.toFixed(0)} m²`;
}

export function getImpactSeverity(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score < 25) return 'low';
  if (score < 50) return 'moderate';
  if (score < 75) return 'high';
  return 'critical';
}

export function getImpactColor(score: number): string {
  if (score < 25) return '#22c55e'; // green
  if (score < 50) return '#eab308'; // yellow
  if (score < 75) return '#f97316'; // orange
  return '#dc2626'; // red
}
