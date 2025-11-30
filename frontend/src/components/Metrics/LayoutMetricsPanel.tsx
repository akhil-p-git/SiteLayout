import React, { useMemo } from 'react';
import { MetricCard, MetricRow, MetricGroup } from './MetricCard';
import { SimpleBarChart, SimplePieChart } from './Charts';
import type { LayoutMetrics, ChartDataPoint } from './types';
import './LayoutMetricsPanel.css';

interface LayoutMetricsPanelProps {
  metrics: LayoutMetrics | null;
  isLoading?: boolean;
  comparisonMetrics?: LayoutMetrics | null;
  className?: string;
}

export function LayoutMetricsPanel({
  metrics,
  isLoading = false,
  comparisonMetrics,
  className = '',
}: LayoutMetricsPanelProps) {
  // Prepare chart data
  const earthworkChartData = useMemo((): ChartDataPoint[] => {
    if (!metrics) return [];
    return [
      { label: 'Cut', value: metrics.earthwork.totalCutVolume, color: '#ef4444' },
      { label: 'Fill', value: metrics.earthwork.totalFillVolume, color: '#3b82f6' },
    ];
  }, [metrics]);

  const costChartData = useMemo((): ChartDataPoint[] => {
    if (!metrics) return [];
    return [
      { label: 'Excavation', value: metrics.cost.cutCost, color: '#ef4444' },
      { label: 'Fill', value: metrics.cost.fillCost, color: '#3b82f6' },
      { label: 'Hauling', value: metrics.cost.haulCost, color: '#f59e0b' },
      { label: 'Import', value: metrics.cost.importCost, color: '#8b5cf6' },
      { label: 'Export', value: metrics.cost.exportCost, color: '#6b7280' },
    ].filter(d => d.value > 0);
  }, [metrics]);

  const assetChartData = useMemo((): ChartDataPoint[] => {
    if (!metrics) return [];
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return Object.entries(metrics.assets.byType).map(([type, count], i) => ({
      label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
      color: colors[i % colors.length],
    }));
  }, [metrics]);

  if (isLoading) {
    return (
      <div className={`layout-metrics-panel loading ${className}`}>
        <div className="metrics-loading">
          <div className="loading-spinner"></div>
          <span>Calculating metrics...</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`layout-metrics-panel empty ${className}`}>
        <div className="metrics-empty">
          <span className="empty-icon">📊</span>
          <span className="empty-text">No metrics available</span>
          <span className="empty-hint">Place assets to see layout metrics</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`layout-metrics-panel ${className}`}>
      <div className="metrics-header">
        <h3>Layout Metrics</h3>
        <span className="metrics-timestamp">
          Updated: {new Date(metrics.calculatedAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Key Performance Indicators */}
      <div className="metrics-kpi-grid">
        <MetricCard
          title="Utilization"
          value={metrics.area.utilizationRate}
          format={{ type: 'percent', precision: 1 }}
          icon="📐"
          color={metrics.area.utilizationRate > 70 ? 'success' : 'warning'}
          subtitle={`${(metrics.area.developedArea / 10000).toFixed(2)} ha developed`}
        />
        <MetricCard
          title="Net Earthwork"
          value={metrics.earthwork.netVolume}
          format={{ type: 'volume', precision: 0 }}
          icon="🏗️"
          color={Math.abs(metrics.earthwork.netVolume) < 1000 ? 'success' : 'warning'}
          subtitle={metrics.earthwork.netVolume > 0 ? 'Excess cut' : 'Needs fill'}
        />
        <MetricCard
          title="Total Cost"
          value={metrics.cost.totalCost}
          format={{ type: 'currency', precision: 0 }}
          icon="💰"
          color="info"
          subtitle="Earthwork estimate"
        />
        <MetricCard
          title="Road Length"
          value={metrics.roads.totalLength}
          format={{ type: 'distance', precision: 0 }}
          icon="🛤️"
          color="default"
          subtitle={`${metrics.roads.segmentCount} segments`}
        />
      </div>

      {/* Area Metrics */}
      <MetricGroup title="Area Analysis" icon="📏" collapsible defaultExpanded>
        <MetricRow
          label="Total Site Area"
          value={metrics.area.totalArea}
          format={{ type: 'area', precision: 2 }}
        />
        <MetricRow
          label="Usable Area"
          value={metrics.area.usableArea}
          format={{ type: 'area', precision: 2 }}
        />
        <MetricRow
          label="Developed Area"
          value={metrics.area.developedArea}
          format={{ type: 'area', precision: 2 }}
          highlight
        />
        <MetricRow
          label="Exclusion Zones"
          value={metrics.area.exclusionArea}
          format={{ type: 'area', precision: 2 }}
        />
        <MetricRow
          label="Utilization Rate"
          value={metrics.area.utilizationRate}
          format={{ type: 'percent', precision: 1 }}
          highlight
        />
      </MetricGroup>

      {/* Earthwork Metrics */}
      <MetricGroup title="Earthwork Volumes" icon="⛏️" collapsible defaultExpanded>
        <div className="chart-container">
          <SimpleBarChart data={earthworkChartData} height={120} />
        </div>
        <MetricRow
          label="Total Cut"
          value={metrics.earthwork.totalCutVolume}
          format={{ type: 'volume', precision: 0 }}
        />
        <MetricRow
          label="Total Fill"
          value={metrics.earthwork.totalFillVolume}
          format={{ type: 'volume', precision: 0 }}
        />
        <MetricRow
          label="Net Balance"
          value={metrics.earthwork.netVolume}
          format={{ type: 'volume', precision: 0 }}
          highlight
        />
        <div className="metrics-divider" />
        <MetricRow
          label="Adjusted Cut (w/ shrink)"
          value={metrics.earthwork.adjustedCut}
          format={{ type: 'volume', precision: 0 }}
        />
        <MetricRow
          label="Adjusted Fill (w/ swell)"
          value={metrics.earthwork.adjustedFill}
          format={{ type: 'volume', precision: 0 }}
        />
        <div className="metrics-divider" />
        <MetricRow
          label="Import Required"
          value={metrics.earthwork.importRequired}
          format={{ type: 'volume', precision: 0 }}
        />
        <MetricRow
          label="Export Required"
          value={metrics.earthwork.exportRequired}
          format={{ type: 'volume', precision: 0 }}
        />
        <MetricRow
          label="Balanced On-Site"
          value={metrics.earthwork.balanceOnSite}
          format={{ type: 'volume', precision: 0 }}
          highlight
        />
      </MetricGroup>

      {/* Cost Breakdown */}
      <MetricGroup title="Cost Estimate" icon="💵" collapsible defaultExpanded>
        <div className="chart-container">
          <SimplePieChart data={costChartData} size={150} />
        </div>
        <MetricRow
          label="Excavation"
          value={metrics.cost.cutCost}
          format={{ type: 'currency', precision: 0 }}
        />
        <MetricRow
          label="Fill Placement"
          value={metrics.cost.fillCost}
          format={{ type: 'currency', precision: 0 }}
        />
        <MetricRow
          label="On-Site Hauling"
          value={metrics.cost.haulCost}
          format={{ type: 'currency', precision: 0 }}
        />
        <MetricRow
          label="Material Import"
          value={metrics.cost.importCost}
          format={{ type: 'currency', precision: 0 }}
        />
        <MetricRow
          label="Material Export"
          value={metrics.cost.exportCost}
          format={{ type: 'currency', precision: 0 }}
        />
        <div className="metrics-divider" />
        <MetricRow
          label="Total Estimated Cost"
          value={metrics.cost.totalCost}
          format={{ type: 'currency', precision: 0 }}
          highlight
        />
      </MetricGroup>

      {/* Road Metrics */}
      <MetricGroup title="Road Network" icon="🛣️" collapsible defaultExpanded={false}>
        <MetricRow
          label="Total Length"
          value={metrics.roads.totalLength}
          format={{ type: 'distance', precision: 0 }}
        />
        <MetricRow
          label="Segments"
          value={metrics.roads.segmentCount}
          format={{ type: 'number' }}
        />
        <MetricRow
          label="Max Gradient"
          value={metrics.roads.maxGradient}
          format={{ type: 'percent', precision: 1 }}
        />
        <MetricRow
          label="Avg Gradient"
          value={metrics.roads.averageGradient}
          format={{ type: 'percent', precision: 1 }}
        />
        <MetricRow
          label="Avg Haul Distance"
          value={metrics.roads.averageHaulDistance}
          format={{ type: 'distance', precision: 0 }}
        />
      </MetricGroup>

      {/* Asset Summary */}
      <MetricGroup title="Assets" icon="🏭" collapsible defaultExpanded={false}>
        {assetChartData.length > 0 && (
          <div className="chart-container">
            <SimplePieChart data={assetChartData} size={150} />
          </div>
        )}
        <MetricRow
          label="Total Assets"
          value={metrics.assets.totalCount}
          format={{ type: 'number' }}
        />
        <MetricRow
          label="Total Footprint"
          value={metrics.assets.totalFootprint}
          format={{ type: 'area', precision: 0 }}
        />
        <MetricRow
          label="Valid Placements"
          value={metrics.assets.validCount}
          format={{ type: 'number' }}
        />
        <MetricRow
          label="With Violations"
          value={metrics.assets.invalidCount}
          format={{ type: 'number' }}
        />
        <div className="metrics-divider" />
        {Object.entries(metrics.assets.byType).map(([type, count]) => (
          <MetricRow
            key={type}
            label={type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            value={count}
            format={{ type: 'number' }}
          />
        ))}
      </MetricGroup>
    </div>
  );
}

export default LayoutMetricsPanel;
