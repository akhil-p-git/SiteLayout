/**
 * Portfolio Analytics Types
 *
 * Types for cross-site comparison and portfolio management.
 */

export type SiteStatus =
  | 'prospecting'
  | 'feasibility'
  | 'design'
  | 'permitting'
  | 'construction'
  | 'operational'
  | 'on_hold'
  | 'cancelled';

export type SortDirection = 'asc' | 'desc';

export interface SiteLocation {
  latitude: number;
  longitude: number;
  address?: string;
  region?: string;
  country: string;
}

export interface SiteMetrics {
  totalArea: number; // m²
  buildableArea: number; // m²
  buildablePercent: number;
  capacityMw: number;
  cutVolume: number; // m³
  fillVolume: number; // m³
  netEarthwork: number; // m³
  roadLength: number; // m
  assetCount: number;
  estimatedCost: number; // $
  carbonFootprint: number; // metric tons CO2
  carbonOffset: number; // metric tons CO2/year
  carbonPaybackYears: number | null;
}

export interface SiteScores {
  terrain: number; // 0-100
  earthwork: number; // 0-100
  accessibility: number; // 0-100
  environmental: number; // 0-100
  cost: number; // 0-100
  composite: number; // 0-100 weighted average
}

export interface ScoreWeights {
  terrain: number;
  earthwork: number;
  accessibility: number;
  environmental: number;
  cost: number;
}

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  terrain: 0.25,
  earthwork: 0.2,
  accessibility: 0.15,
  environmental: 0.2,
  cost: 0.2,
};

export interface SiteTags {
  priority?: 'high' | 'medium' | 'low';
  type?: 'solar' | 'wind' | 'hybrid' | 'bess';
  ownership?: 'owned' | 'leased' | 'option';
  custom: string[];
}

export interface SiteData {
  id: string;
  name: string;
  projectCode: string;
  status: SiteStatus;
  location: SiteLocation;
  metrics: SiteMetrics;
  scores: SiteScores;
  tags: SiteTags;
  createdAt: string;
  updatedAt: string;
  lastAnalyzedAt?: string;
  thumbnail?: string;
}

export interface PortfolioSummary {
  totalSites: number;
  totalCapacityMw: number;
  totalAreaHa: number;
  averageScore: number;
  statusBreakdown: Record<SiteStatus, number>;
  regionalBreakdown: Record<string, number>;
  totalEstimatedCost: number;
  totalCarbonOffset: number; // annual metric tons
}

export interface PipelineStage {
  status: SiteStatus;
  label: string;
  color: string;
  sites: SiteData[];
  totalCapacity: number;
}

export interface FilterCriteria {
  status?: SiteStatus[];
  region?: string[];
  tags?: string[];
  minCapacity?: number;
  maxCapacity?: number;
  minScore?: number;
  maxScore?: number;
  searchQuery?: string;
}

export interface SortConfig {
  field:
    | keyof SiteData
    | keyof SiteMetrics
    | keyof SiteScores
    | 'name'
    | 'status'
    | 'capacity'
    | 'score';
  direction: SortDirection;
}

export interface PortfolioViewState {
  view: 'table' | 'map' | 'pipeline';
  filters: FilterCriteria;
  sort: SortConfig;
  selectedSites: string[];
  scoreWeights: ScoreWeights;
}

// Status configuration
export const STATUS_CONFIG: Record<SiteStatus, { label: string; color: string; order: number }> = {
  prospecting: { label: 'Prospecting', color: '#9CA3AF', order: 1 },
  feasibility: { label: 'Feasibility', color: '#60A5FA', order: 2 },
  design: { label: 'Design', color: '#A78BFA', order: 3 },
  permitting: { label: 'Permitting', color: '#FBBF24', order: 4 },
  construction: { label: 'Construction', color: '#F97316', order: 5 },
  operational: { label: 'Operational', color: '#10B981', order: 6 },
  on_hold: { label: 'On Hold', color: '#6B7280', order: 7 },
  cancelled: { label: 'Cancelled', color: '#EF4444', order: 8 },
};

// Helper functions
export function calculateCompositeScore(
  scores: Omit<SiteScores, 'composite'>,
  weights: ScoreWeights
): number {
  const weighted =
    scores.terrain * weights.terrain +
    scores.earthwork * weights.earthwork +
    scores.accessibility * weights.accessibility +
    scores.environmental * weights.environmental +
    scores.cost * weights.cost;

  const totalWeight =
    weights.terrain +
    weights.earthwork +
    weights.accessibility +
    weights.environmental +
    weights.cost;

  return Math.round(weighted / totalWeight);
}

export function formatCapacity(mw: number): string {
  if (mw >= 1000) {
    return `${(mw / 1000).toFixed(1)} GW`;
  }
  return `${mw.toFixed(1)} MW`;
}

export function formatArea(m2: number): string {
  const ha = m2 / 10000;
  if (ha >= 100) {
    return `${Math.round(ha)} ha`;
  }
  return `${ha.toFixed(1)} ha`;
}

export function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#10B981'; // green
  if (score >= 60) return '#FBBF24'; // yellow
  if (score >= 40) return '#F97316'; // orange
  return '#EF4444'; // red
}

export function filterSites(sites: SiteData[], criteria: FilterCriteria): SiteData[] {
  return sites.filter((site) => {
    // Status filter
    if (criteria.status && criteria.status.length > 0) {
      if (!criteria.status.includes(site.status)) return false;
    }

    // Region filter
    if (criteria.region && criteria.region.length > 0) {
      if (!site.location.region || !criteria.region.includes(site.location.region)) return false;
    }

    // Tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      const siteTags = [
        site.tags.priority,
        site.tags.type,
        site.tags.ownership,
        ...site.tags.custom,
      ].filter(Boolean);
      if (!criteria.tags.some((tag) => siteTags.includes(tag))) return false;
    }

    // Capacity filter
    if (criteria.minCapacity !== undefined && site.metrics.capacityMw < criteria.minCapacity) {
      return false;
    }
    if (criteria.maxCapacity !== undefined && site.metrics.capacityMw > criteria.maxCapacity) {
      return false;
    }

    // Score filter
    if (criteria.minScore !== undefined && site.scores.composite < criteria.minScore) {
      return false;
    }
    if (criteria.maxScore !== undefined && site.scores.composite > criteria.maxScore) {
      return false;
    }

    // Search query
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      const searchable = [
        site.name,
        site.projectCode,
        site.location.address,
        site.location.region,
        site.location.country,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    return true;
  });
}

export function sortSites(sites: SiteData[], config: SortConfig): SiteData[] {
  return [...sites].sort((a, b) => {
    let valueA: number | string;
    let valueB: number | string;

    switch (config.field) {
      case 'name':
        valueA = a.name;
        valueB = b.name;
        break;
      case 'status':
        valueA = STATUS_CONFIG[a.status].order;
        valueB = STATUS_CONFIG[b.status].order;
        break;
      case 'capacity':
        valueA = a.metrics.capacityMw;
        valueB = b.metrics.capacityMw;
        break;
      case 'score':
        valueA = a.scores.composite;
        valueB = b.scores.composite;
        break;
      default:
        valueA = 0;
        valueB = 0;
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return config.direction === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }

    return config.direction === 'asc'
      ? (valueA as number) - (valueB as number)
      : (valueB as number) - (valueA as number);
  });
}

export function calculatePortfolioSummary(sites: SiteData[]): PortfolioSummary {
  const statusBreakdown: Record<SiteStatus, number> = {
    prospecting: 0,
    feasibility: 0,
    design: 0,
    permitting: 0,
    construction: 0,
    operational: 0,
    on_hold: 0,
    cancelled: 0,
  };

  const regionalBreakdown: Record<string, number> = {};

  let totalCapacity = 0;
  let totalArea = 0;
  let totalScore = 0;
  let totalCost = 0;
  let totalOffset = 0;

  sites.forEach((site) => {
    statusBreakdown[site.status]++;

    if (site.location.region) {
      regionalBreakdown[site.location.region] = (regionalBreakdown[site.location.region] || 0) + 1;
    }

    totalCapacity += site.metrics.capacityMw;
    totalArea += site.metrics.totalArea;
    totalScore += site.scores.composite;
    totalCost += site.metrics.estimatedCost;
    totalOffset += site.metrics.carbonOffset;
  });

  return {
    totalSites: sites.length,
    totalCapacityMw: totalCapacity,
    totalAreaHa: totalArea / 10000,
    averageScore: sites.length > 0 ? Math.round(totalScore / sites.length) : 0,
    statusBreakdown,
    regionalBreakdown,
    totalEstimatedCost: totalCost,
    totalCarbonOffset: totalOffset,
  };
}
