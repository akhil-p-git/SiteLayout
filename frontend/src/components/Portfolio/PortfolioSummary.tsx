/**
 * Portfolio Summary Component
 *
 * Aggregate statistics and KPIs for the portfolio.
 */

import React from 'react';
import {
  PortfolioSummary as PortfolioSummaryData,
  SiteStatus,
  STATUS_CONFIG,
  formatCapacity,
  formatCurrency,
  getScoreColor,
} from './types';
import './PortfolioSummary.css';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryData;
  onStatusClick?: (status: SiteStatus) => void;
}

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const KPICard: React.FC<KPICardProps> = ({ label, value, subValue, trend, trendValue }) => {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {subValue && <div className="kpi-sub">{subValue}</div>}
      {trend && trendValue && (
        <div className={`kpi-trend ${trend}`}>
          <span className="trend-icon">{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
};

const StatusPill: React.FC<{ status: SiteStatus; count: number; onClick?: () => void }> = ({
  status,
  count,
  onClick,
}) => {
  const config = STATUS_CONFIG[status];
  return (
    <button className="status-pill" style={{ borderColor: config.color }} onClick={onClick}>
      <span className="status-dot" style={{ backgroundColor: config.color }} />
      <span className="status-label">{config.label}</span>
      <span className="status-count">{count}</span>
    </button>
  );
};

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ summary, onStatusClick }) => {
  const activeStatuses: SiteStatus[] = [
    'prospecting',
    'feasibility',
    'design',
    'permitting',
    'construction',
    'operational',
  ];

  const activeSites = activeStatuses.reduce(
    (acc, status) => acc + summary.statusBreakdown[status],
    0
  );

  return (
    <div className="portfolio-summary">
      <div className="summary-header">
        <h2>Portfolio Overview</h2>
        <span className="summary-date">As of {new Date().toLocaleDateString()}</span>
      </div>

      <div className="kpi-grid">
        <KPICard
          label="Total Sites"
          value={summary.totalSites}
          subValue={`${activeSites} active`}
        />
        <KPICard
          label="Total Capacity"
          value={formatCapacity(summary.totalCapacityMw)}
          subValue={`${summary.totalAreaHa.toFixed(0)} hectares`}
        />
        <KPICard label="Average Score" value={summary.averageScore} subValue="out of 100" />
        <KPICard label="Est. Investment" value={formatCurrency(summary.totalEstimatedCost)} />
        <KPICard
          label="Carbon Offset"
          value={`${(summary.totalCarbonOffset / 1000).toFixed(1)}K`}
          subValue="tonnes CO₂/year"
        />
      </div>

      <div className="status-section">
        <h3>Pipeline Status</h3>
        <div className="status-grid">
          {Object.entries(STATUS_CONFIG)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([status]) => (
              <StatusPill
                key={status}
                status={status as SiteStatus}
                count={summary.statusBreakdown[status as SiteStatus]}
                onClick={() => onStatusClick?.(status as SiteStatus)}
              />
            ))}
        </div>
      </div>

      {Object.keys(summary.regionalBreakdown).length > 0 && (
        <div className="region-section">
          <h3>By Region</h3>
          <div className="region-bars">
            {Object.entries(summary.regionalBreakdown)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([region, count]) => {
                const percent = (count / summary.totalSites) * 100;
                return (
                  <div key={region} className="region-bar">
                    <div className="region-info">
                      <span className="region-name">{region}</span>
                      <span className="region-count">{count} sites</span>
                    </div>
                    <div className="region-bar-track">
                      <div className="region-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="score-distribution">
        <h3>Score Distribution</h3>
        <div className="score-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: getScoreColor(80) }} />
            <span>Excellent (80+)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: getScoreColor(60) }} />
            <span>Good (60-79)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: getScoreColor(40) }} />
            <span>Fair (40-59)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: getScoreColor(20) }} />
            <span>Poor (&lt;40)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;
