/**
 * Metrics Types
 *
 * Type definitions for layout metrics and KPIs.
 */

/**
 * Area metrics
 */
export interface AreaMetrics {
  totalArea: number; // Total site area (m²)
  usableArea: number; // Area after exclusions (m²)
  developedArea: number; // Area used by assets (m²)
  utilizationRate: number; // Percentage of usable area developed
  exclusionArea: number; // Total exclusion zone area (m²)
}

/**
 * Earthwork volume metrics
 */
export interface EarthworkMetrics {
  totalCutVolume: number; // Total cut volume (m³)
  totalFillVolume: number; // Total fill volume (m³)
  netVolume: number; // Cut - Fill (m³)
  adjustedCut: number; // After shrink factor
  adjustedFill: number; // After swell factor
  importRequired: number; // Fill needed from off-site
  exportRequired: number; // Cut to be removed
  balanceOnSite: number; // Material balanced on-site
}

/**
 * Cost breakdown
 */
export interface CostMetrics {
  cutCost: number; // Excavation cost ($)
  fillCost: number; // Fill placement cost ($)
  haulCost: number; // On-site hauling cost ($)
  importCost: number; // Import material cost ($)
  exportCost: number; // Export material cost ($)
  totalCost: number; // Total earthwork cost ($)
}

/**
 * Road network metrics
 */
export interface RoadMetrics {
  totalLength: number; // Total road length (m)
  segmentCount: number; // Number of road segments
  maxGradient: number; // Maximum gradient (%)
  averageGradient: number; // Average gradient (%)
  averageHaulDistance: number; // Average haul distance (m)
}

/**
 * Asset metrics
 */
export interface AssetMetrics {
  totalCount: number; // Total number of assets
  byType: Record<string, number>; // Count by asset type
  totalFootprint: number; // Total asset footprint area (m²)
  validCount: number; // Number passing all constraints
  invalidCount: number; // Number with violations
}

/**
 * Combined layout metrics
 */
export interface LayoutMetrics {
  projectId: string;
  projectName: string;
  calculatedAt: string;
  area: AreaMetrics;
  earthwork: EarthworkMetrics;
  cost: CostMetrics;
  roads: RoadMetrics;
  assets: AssetMetrics;
}

/**
 * Metric trend direction
 */
export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Metric with comparison
 */
export interface MetricComparison {
  current: number;
  previous?: number;
  change?: number;
  changePercent?: number;
  trend?: TrendDirection;
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

/**
 * Format options for metric display
 */
export interface MetricFormatOptions {
  type: 'number' | 'currency' | 'percent' | 'area' | 'volume' | 'distance';
  precision?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Helper function to format metric values
 */
export function formatMetricValue(value: number, options: MetricFormatOptions): string {
  const { type, precision = 0, prefix = '', suffix = '' } = options;

  let formatted: string;

  switch (type) {
    case 'currency':
      formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(value);
      break;

    case 'percent':
      formatted = `${value.toFixed(precision)}%`;
      break;

    case 'area':
      if (value >= 10000) {
        formatted = `${(value / 10000).toFixed(precision)} ha`;
      } else {
        formatted = `${value.toFixed(precision)} m²`;
      }
      break;

    case 'volume':
      if (Math.abs(value) >= 1000) {
        formatted = `${(value / 1000).toFixed(precision)}k m³`;
      } else {
        formatted = `${value.toFixed(precision)} m³`;
      }
      break;

    case 'distance':
      if (value >= 1000) {
        formatted = `${(value / 1000).toFixed(precision)} km`;
      } else {
        formatted = `${value.toFixed(precision)} m`;
      }
      break;

    default:
      formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      });
  }

  return `${prefix}${formatted}${suffix}`;
}

/**
 * Calculate trend direction
 */
export function getTrendDirection(
  current: number,
  previous: number,
  positiveIsGood: boolean = true
): TrendDirection {
  if (current === previous) return 'neutral';
  const isUp = current > previous;
  if (positiveIsGood) {
    return isUp ? 'up' : 'down';
  }
  return isUp ? 'down' : 'up';
}
