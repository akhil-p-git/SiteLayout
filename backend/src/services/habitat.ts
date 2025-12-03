/**
 * Habitat Service
 *
 * Integrates with USFWS Endangered Species API and NWI data
 * to provide habitat overlay information and impact scoring.
 */

import crypto from 'crypto';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
import type {
  EndangeredSpecies,
  CriticalHabitat,
  Wetland,
  WetlandSystem,
  WetlandClass,
  HabitatOverlayData,
  HabitatImpactScore,
  HabitatImpactFactor,
  EnvironmentalPermit,
  PermitType,
  SpeciesStatus,
  HabitatQueryParams,
  CriticalHabitatProperties,
  WetlandProperties,
} from '../types/habitat';
import { HABITAT_COLORS, DEFAULT_BUFFER_DISTANCES } from '../types/habitat';

// USFWS ECOS API base URL
const USFWS_API_BASE = 'https://ecos.fws.gov/ecp/report/species-listings';

// NWI WMS Service
const NWI_WMS_BASE = 'https://fwspublicservices.wim.usgs.gov/wetlandsmapservice';

// Cache for habitat data (in production, use Redis)
const habitatCache = new Map<string, { data: HabitatOverlayData; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

/**
 * Generate sample endangered species data for a given boundary
 * In production, this would call the USFWS ECOS API
 */
function generateSampleSpeciesData(
  boundaryGeometry: Polygon | MultiPolygon
): EndangeredSpecies[] {
  const bbox = turf.bbox(turf.feature(boundaryGeometry));

  // Generate consistent sample data based on location
  const seed = Math.abs(bbox[0] + bbox[1]) % 10;

  const speciesDatabase: EndangeredSpecies[] = [
    {
      id: 'sp-001',
      commonName: 'California Tiger Salamander',
      scientificName: 'Ambystoma californiense',
      status: 'threatened',
      group: 'amphibian',
      criticalHabitat: true,
      bufferDistance: 300,
    },
    {
      id: 'sp-002',
      commonName: 'San Joaquin Kit Fox',
      scientificName: 'Vulpes macrotis mutica',
      status: 'endangered',
      group: 'mammal',
      criticalHabitat: true,
      bufferDistance: 500,
    },
    {
      id: 'sp-003',
      commonName: 'Blunt-nosed Leopard Lizard',
      scientificName: 'Gambelia sila',
      status: 'endangered',
      group: 'reptile',
      criticalHabitat: false,
      bufferDistance: 400,
    },
    {
      id: 'sp-004',
      commonName: 'Giant Garter Snake',
      scientificName: 'Thamnophis gigas',
      status: 'threatened',
      group: 'reptile',
      criticalHabitat: true,
      bufferDistance: 200,
    },
    {
      id: 'sp-005',
      commonName: 'Valley Elderberry Longhorn Beetle',
      scientificName: 'Desmocerus californicus dimorphus',
      status: 'threatened',
      group: 'invertebrate',
      criticalHabitat: false,
      bufferDistance: 100,
    },
  ];

  // Return a subset based on location
  return speciesDatabase.slice(0, Math.max(1, seed % 4 + 1));
}

/**
 * Generate sample critical habitat polygons
 */
function generateCriticalHabitats(
  species: EndangeredSpecies[],
  boundaryGeometry: Polygon | MultiPolygon
): CriticalHabitat[] {
  const habitats: CriticalHabitat[] = [];
  const boundary = turf.feature(boundaryGeometry);
  const bbox = turf.bbox(boundary);
  const boundaryArea = turf.area(boundary);

  species.filter(s => s.criticalHabitat).forEach((sp, index) => {
    // Create a habitat polygon that overlaps with the site
    const centerLng = bbox[0] + (bbox[2] - bbox[0]) * (0.3 + index * 0.2);
    const centerLat = bbox[1] + (bbox[3] - bbox[1]) * (0.3 + index * 0.15);

    // Create a polygon that partially overlaps with boundary
    const habitatRadius = Math.sqrt(boundaryArea) * 0.3 / 1000; // km
    const habitatPoly = turf.circle([centerLng, centerLat], habitatRadius, {
      steps: 64,
      units: 'kilometers',
    });

    // Intersect with boundary to get the actual overlap
    try {
      const intersection = turf.intersect(
        turf.featureCollection([boundary, habitatPoly])
      );

      if (intersection) {
        habitats.push({
          id: `ch-${sp.id}`,
          speciesId: sp.id,
          species: sp,
          geometry: intersection.geometry as Polygon | MultiPolygon,
          area: turf.area(intersection),
          designation: 'Critical Habitat',
          dateDesignated: '2020-01-15',
        });
      }
    } catch {
      // No intersection
    }
  });

  return habitats;
}

/**
 * Generate sample wetland data
 * In production, this would query the NWI WMS service
 */
function generateWetlandData(
  boundaryGeometry: Polygon | MultiPolygon
): Wetland[] {
  const wetlands: Wetland[] = [];
  const boundary = turf.feature(boundaryGeometry);
  const bbox = turf.bbox(boundary);
  const boundaryArea = turf.area(boundary);

  // Generate 0-3 wetlands based on location
  const seed = Math.abs(bbox[0] * 100 + bbox[1] * 100) % 10;
  const numWetlands = seed % 4;

  const wetlandTypes: Array<{ system: WetlandSystem; wetlandClass: WetlandClass; code: string }> = [
    { system: 'palustrine', wetlandClass: 'emergent', code: 'PEM1C' },
    { system: 'palustrine', wetlandClass: 'forested', code: 'PFO1A' },
    { system: 'palustrine', wetlandClass: 'scrub_shrub', code: 'PSS1C' },
    { system: 'riverine', wetlandClass: 'unconsolidated_bottom', code: 'R2UBH' },
  ];

  for (let i = 0; i < numWetlands; i++) {
    const type = wetlandTypes[i % wetlandTypes.length];
    const centerLng = bbox[0] + (bbox[2] - bbox[0]) * (0.2 + i * 0.25);
    const centerLat = bbox[1] + (bbox[3] - bbox[1]) * (0.5 + i * 0.1);

    // Create wetland polygon
    const wetlandRadius = Math.sqrt(boundaryArea) * 0.1 / 1000; // km
    const wetlandPoly = turf.circle([centerLng, centerLat], wetlandRadius, {
      steps: 32,
      units: 'kilometers',
    });

    try {
      const intersection = turf.intersect(
        turf.featureCollection([boundary, wetlandPoly])
      );

      if (intersection) {
        wetlands.push({
          id: `wl-${i + 1}`,
          nwiCode: type.code,
          system: type.system,
          wetlandClass: type.wetlandClass,
          geometry: intersection.geometry as Polygon | MultiPolygon,
          area: turf.area(intersection),
          waterRegime: 'Seasonally Flooded',
          specialModifiers: [],
        });
      }
    } catch {
      // No intersection
    }
  }

  return wetlands;
}

/**
 * Calculate impact score based on habitat overlaps
 */
function calculateImpactScore(
  boundaryGeometry: Polygon | MultiPolygon,
  criticalHabitats: CriticalHabitat[],
  wetlands: Wetland[]
): HabitatImpactScore {
  const boundary = turf.feature(boundaryGeometry);
  const boundaryArea = turf.area(boundary);

  // Calculate critical habitat overlap
  let criticalHabitatArea = 0;
  criticalHabitats.forEach(ch => {
    criticalHabitatArea += ch.area;
  });
  const criticalHabitatOverlap = Math.min(100, (criticalHabitatArea / boundaryArea) * 100);

  // Calculate wetland overlap
  let wetlandArea = 0;
  wetlands.forEach(w => {
    wetlandArea += w.area;
  });
  const wetlandOverlap = Math.min(100, (wetlandArea / boundaryArea) * 100);

  // Build impact factors
  const factors: HabitatImpactFactor[] = [
    {
      factorId: 'critical_habitat',
      name: 'Critical Habitat Overlap',
      weight: 0.35,
      value: criticalHabitatOverlap,
      description: `${criticalHabitatOverlap.toFixed(1)}% of site overlaps with designated critical habitat`,
    },
    {
      factorId: 'wetland_overlap',
      name: 'Wetland Overlap',
      weight: 0.25,
      value: wetlandOverlap,
      description: `${wetlandOverlap.toFixed(1)}% of site contains wetland features`,
    },
    {
      factorId: 'species_count',
      name: 'Species at Risk',
      weight: 0.25,
      value: Math.min(100, criticalHabitats.length * 25),
      description: `${criticalHabitats.length} protected species may be affected`,
    },
    {
      factorId: 'endangered_presence',
      name: 'Endangered Species Present',
      weight: 0.15,
      value: criticalHabitats.some(ch => ch.species.status === 'endangered') ? 100 : 0,
      description: criticalHabitats.some(ch => ch.species.status === 'endangered')
        ? 'Endangered species habitat present'
        : 'No endangered species habitat overlap',
    },
  ];

  // Calculate overall score (weighted average)
  const overall = factors.reduce((sum, f) => sum + f.weight * f.value, 0);

  // Determine required permits
  const permits = determineRequiredPermits(
    criticalHabitats,
    wetlands,
    criticalHabitatOverlap,
    wetlandOverlap
  );

  // Generate recommendations
  const recommendations = generateRecommendations(
    criticalHabitats,
    wetlands,
    overall
  );

  return {
    overall: Math.round(overall),
    factors,
    criticalHabitatOverlap,
    wetlandOverlap,
    speciesAtRisk: criticalHabitats.map(ch => ch.species),
    wetlandsAffected: wetlands,
    requiredPermits: permits,
    recommendations,
  };
}

/**
 * Determine required environmental permits
 */
function determineRequiredPermits(
  criticalHabitats: CriticalHabitat[],
  wetlands: Wetland[],
  criticalHabitatOverlap: number,
  wetlandOverlap: number
): EnvironmentalPermit[] {
  const permits: EnvironmentalPermit[] = [];

  // Section 404 - Clean Water Act (wetlands)
  if (wetlands.length > 0) {
    permits.push({
      type: 'section_404',
      name: 'Clean Water Act Section 404 Permit',
      authority: 'U.S. Army Corps of Engineers',
      estimatedTimeline: '6-12 months',
      triggerReason: `Site contains ${wetlands.length} wetland feature(s)`,
      required: true,
      notes: 'May require wetland delineation report and mitigation plan',
    });

    permits.push({
      type: 'wetland_delineation',
      name: 'Wetland Delineation Report',
      authority: 'Qualified Wetland Scientist',
      estimatedTimeline: '2-4 weeks',
      triggerReason: 'Required to determine wetland boundaries',
      required: true,
      notes: 'Must follow USACE delineation manual',
    });
  }

  // Section 7 Consultation (endangered species)
  if (criticalHabitats.length > 0) {
    const hasEndangered = criticalHabitats.some(ch => ch.species.status === 'endangered');

    permits.push({
      type: 'section_7',
      name: 'ESA Section 7 Consultation',
      authority: 'U.S. Fish and Wildlife Service',
      estimatedTimeline: hasEndangered ? '12-18 months' : '6-9 months',
      triggerReason: `Project may affect ${criticalHabitats.length} listed species`,
      required: true,
      notes: 'Formal consultation required if project may adversely affect listed species',
    });

    permits.push({
      type: 'biological_opinion',
      name: 'Biological Opinion',
      authority: 'U.S. Fish and Wildlife Service',
      estimatedTimeline: '135 days (statutory)',
      triggerReason: 'Formal Section 7 consultation outcome',
      required: criticalHabitatOverlap > 5,
      notes: 'May include incidental take statement and conservation measures',
    });
  }

  // NEPA (major federal action)
  if (criticalHabitatOverlap > 10 || wetlandOverlap > 5) {
    permits.push({
      type: 'nepa',
      name: 'NEPA Environmental Review',
      authority: 'Lead Federal Agency',
      estimatedTimeline: '12-24 months',
      triggerReason: 'Significant environmental impact potential',
      required: criticalHabitatOverlap > 20 || wetlandOverlap > 10,
      notes: 'May require Environmental Impact Statement (EIS)',
    });
  }

  return permits;
}

/**
 * Generate recommendations based on impact analysis
 */
function generateRecommendations(
  criticalHabitats: CriticalHabitat[],
  wetlands: Wetland[],
  overallScore: number
): string[] {
  const recommendations: string[] = [];

  if (overallScore > 50) {
    recommendations.push('Consider alternative site layouts to minimize habitat overlap');
  }

  if (criticalHabitats.length > 0) {
    recommendations.push('Conduct pre-construction surveys for listed species');
    recommendations.push('Develop species-specific avoidance and minimization measures');

    if (criticalHabitats.some(ch => ch.species.group === 'amphibian' || ch.species.group === 'reptile')) {
      recommendations.push('Install wildlife-friendly fencing to prevent entrapment');
    }
  }

  if (wetlands.length > 0) {
    recommendations.push('Implement erosion and sediment control best practices');
    recommendations.push('Maintain minimum 50-foot buffer from wetland edges where feasible');
    recommendations.push('Consider compensatory mitigation for unavoidable wetland impacts');
  }

  if (overallScore < 30) {
    recommendations.push('Site shows relatively low habitat impact - proceed with standard precautions');
  }

  return recommendations;
}

/**
 * Generate buffer zones around critical habitats
 */
function generateBufferZones(
  criticalHabitats: CriticalHabitat[]
): Feature<Polygon | MultiPolygon>[] {
  const buffers: Feature<Polygon | MultiPolygon>[] = [];

  criticalHabitats.forEach(ch => {
    const bufferDistance = ch.species.bufferDistance;
    const feature = turf.feature(ch.geometry);
    const buffered = turf.buffer(feature, bufferDistance, {
      units: 'meters',
      steps: 32,
    });

    if (buffered) {
      buffers.push({
        ...buffered,
        properties: {
          type: 'buffer',
          sourceId: ch.id,
          speciesId: ch.speciesId,
          bufferDistance,
        },
      } as Feature<Polygon | MultiPolygon>);
    }
  });

  return buffers;
}

// =====================
// Exported Service Functions
// =====================

/**
 * Get habitat overlay data for a site boundary
 */
export async function getHabitatOverlay(
  params: HabitatQueryParams
): Promise<HabitatOverlayData> {
  const { siteId, boundaryGeometry, includeBuffers = true } = params;

  // Check cache
  const cacheKey = `${siteId}-${JSON.stringify(boundaryGeometry).slice(0, 100)}`;
  const cached = habitatCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Generate habitat data (in production, these would be API calls)
  const species = generateSampleSpeciesData(boundaryGeometry);
  const criticalHabitats = generateCriticalHabitats(species, boundaryGeometry);
  const wetlands = generateWetlandData(boundaryGeometry);

  // Calculate impact score
  const impactScore = calculateImpactScore(boundaryGeometry, criticalHabitats, wetlands);

  // Generate buffer zones
  const bufferZones = includeBuffers ? generateBufferZones(criticalHabitats) : [];

  const boundary = turf.feature(boundaryGeometry);

  const data: HabitatOverlayData = {
    siteId,
    boundaryArea: turf.area(boundary),
    criticalHabitats,
    wetlands,
    impactScore,
    bufferZones,
    timestamp: new Date().toISOString(),
  };

  // Cache the result
  habitatCache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}

/**
 * Get habitat data as GeoJSON FeatureCollection
 */
export async function getHabitatGeoJSON(
  params: HabitatQueryParams
): Promise<FeatureCollection> {
  const overlay = await getHabitatOverlay(params);
  const features: Feature[] = [];

  // Add critical habitats
  overlay.criticalHabitats.forEach(ch => {
    features.push({
      type: 'Feature',
      id: ch.id,
      geometry: ch.geometry,
      properties: {
        type: 'critical_habitat',
        speciesId: ch.speciesId,
        commonName: ch.species.commonName,
        scientificName: ch.species.scientificName,
        status: ch.species.status,
        designation: ch.designation,
        area: ch.area,
        color: HABITAT_COLORS.criticalHabitat[ch.species.status],
      } as CriticalHabitatProperties & { area: number; color: string },
    });
  });

  // Add wetlands
  overlay.wetlands.forEach(w => {
    features.push({
      type: 'Feature',
      id: w.id,
      geometry: w.geometry,
      properties: {
        type: 'wetland',
        nwiCode: w.nwiCode,
        system: w.system,
        wetlandClass: w.wetlandClass,
        waterRegime: w.waterRegime,
        area: w.area,
        color: HABITAT_COLORS.wetland[w.system],
      } as WetlandProperties & { area: number; color: string },
    });
  });

  // Add buffer zones
  overlay.bufferZones.forEach(buffer => {
    features.push({
      ...buffer,
      properties: {
        ...buffer.properties,
        color: HABITAT_COLORS.buffer,
      },
    });
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Get impact score only (lightweight endpoint)
 */
export async function getImpactScore(
  boundaryGeometry: Polygon | MultiPolygon
): Promise<HabitatImpactScore> {
  const species = generateSampleSpeciesData(boundaryGeometry);
  const criticalHabitats = generateCriticalHabitats(species, boundaryGeometry);
  const wetlands = generateWetlandData(boundaryGeometry);

  return calculateImpactScore(boundaryGeometry, criticalHabitats, wetlands);
}

/**
 * Get list of species potentially affected
 */
export async function getSpeciesInArea(
  boundaryGeometry: Polygon | MultiPolygon
): Promise<EndangeredSpecies[]> {
  return generateSampleSpeciesData(boundaryGeometry);
}

/**
 * Get wetlands in area
 */
export async function getWetlandsInArea(
  boundaryGeometry: Polygon | MultiPolygon
): Promise<Wetland[]> {
  return generateWetlandData(boundaryGeometry);
}

/**
 * Clear habitat cache
 */
export function clearHabitatCache(): void {
  habitatCache.clear();
}
