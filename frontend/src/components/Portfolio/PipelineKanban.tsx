/**
 * Pipeline Kanban Component
 *
 * Kanban-style visualization of sites in the development pipeline.
 */

import React, { useMemo } from 'react';
import {
  SiteData,
  SiteStatus,
  STATUS_CONFIG,
  PipelineStage,
  formatCapacity,
  formatCurrency,
  getScoreColor,
} from './types';
import './PipelineKanban.css';

interface PipelineKanbanProps {
  sites: SiteData[];
  onSiteClick?: (site: SiteData) => void;
  onStatusChange?: (siteId: string, newStatus: SiteStatus) => void;
}

interface SiteCardProps {
  site: SiteData;
  onClick?: () => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, onClick }) => {
  const scoreColor = getScoreColor(site.scores.composite);

  return (
    <div className="pipeline-card" onClick={onClick}>
      <div className="card-header">
        <span className="card-name">{site.name}</span>
        <span className="card-code">{site.projectCode}</span>
      </div>

      <div className="card-metrics">
        <div className="card-metric">
          <span className="metric-label">Capacity</span>
          <span className="metric-value">{formatCapacity(site.metrics.capacityMw)}</span>
        </div>
        <div className="card-metric">
          <span className="metric-label">Cost</span>
          <span className="metric-value">{formatCurrency(site.metrics.estimatedCost)}</span>
        </div>
      </div>

      <div className="card-score">
        <div className="score-track">
          <div
            className="score-fill"
            style={{ width: `${site.scores.composite}%`, backgroundColor: scoreColor }}
          />
        </div>
        <span className="score-text" style={{ color: scoreColor }}>
          {site.scores.composite}
        </span>
      </div>

      <div className="card-footer">
        {site.location.region && (
          <span className="card-region">{site.location.region}</span>
        )}
        {site.tags.priority && (
          <span className={`card-priority priority-${site.tags.priority}`}>
            {site.tags.priority}
          </span>
        )}
      </div>
    </div>
  );
};

interface StageColumnProps {
  stage: PipelineStage;
  onSiteClick?: (site: SiteData) => void;
}

const StageColumn: React.FC<StageColumnProps> = ({ stage, onSiteClick }) => {
  const config = STATUS_CONFIG[stage.status];

  return (
    <div className="pipeline-column">
      <div className="column-header" style={{ borderColor: stage.color }}>
        <div className="column-title">
          <span className="column-dot" style={{ backgroundColor: stage.color }} />
          <span className="column-name">{stage.label}</span>
        </div>
        <div className="column-stats">
          <span className="column-count">{stage.sites.length}</span>
          {stage.totalCapacity > 0 && (
            <span className="column-capacity">{formatCapacity(stage.totalCapacity)}</span>
          )}
        </div>
      </div>

      <div className="column-body">
        {stage.sites.length === 0 ? (
          <div className="column-empty">No sites</div>
        ) : (
          stage.sites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onClick={() => onSiteClick?.(site)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const PipelineKanban: React.FC<PipelineKanbanProps> = ({
  sites,
  onSiteClick,
  onStatusChange,
}) => {
  const stages = useMemo<PipelineStage[]>(() => {
    const pipelineStatuses: SiteStatus[] = [
      'prospecting',
      'feasibility',
      'design',
      'permitting',
      'construction',
      'operational',
    ];

    return pipelineStatuses.map((status) => {
      const config = STATUS_CONFIG[status];
      const stageSites = sites.filter((s) => s.status === status);
      const totalCapacity = stageSites.reduce((sum, s) => sum + s.metrics.capacityMw, 0);

      return {
        status,
        label: config.label,
        color: config.color,
        sites: stageSites,
        totalCapacity,
      };
    });
  }, [sites]);

  const totalInPipeline = stages.reduce((sum, stage) => sum + stage.sites.length, 0);
  const totalCapacity = stages.reduce((sum, stage) => sum + stage.totalCapacity, 0);

  // Calculate funnel metrics
  const funnelData = stages.map((stage, index) => {
    const previousTotal = index === 0 ? totalInPipeline : stages[index - 1].sites.length;
    const conversionRate = previousTotal > 0 ? (stage.sites.length / previousTotal) * 100 : 0;
    return { ...stage, conversionRate };
  });

  return (
    <div className="pipeline-kanban">
      <div className="pipeline-header">
        <div className="pipeline-title">
          <h2>Development Pipeline</h2>
          <span className="pipeline-subtitle">
            {totalInPipeline} sites • {formatCapacity(totalCapacity)} total capacity
          </span>
        </div>
        <div className="pipeline-legend">
          <span className="legend-item">Drag to change status</span>
        </div>
      </div>

      <div className="pipeline-funnel">
        {funnelData.map((stage, index) => (
          <div key={stage.status} className="funnel-stage">
            <div
              className="funnel-bar"
              style={{
                backgroundColor: stage.color,
                width: `${(stage.sites.length / Math.max(totalInPipeline, 1)) * 100}%`,
                minWidth: stage.sites.length > 0 ? '4px' : '0',
              }}
            />
            {index > 0 && stage.conversionRate > 0 && (
              <span className="funnel-rate">{stage.conversionRate.toFixed(0)}%</span>
            )}
          </div>
        ))}
      </div>

      <div className="pipeline-columns">
        {stages.map((stage) => (
          <StageColumn
            key={stage.status}
            stage={stage}
            onSiteClick={onSiteClick}
          />
        ))}
      </div>

      <div className="pipeline-other">
        <div className="other-section">
          <h4>On Hold</h4>
          <span className="other-count">
            {sites.filter((s) => s.status === 'on_hold').length}
          </span>
        </div>
        <div className="other-section">
          <h4>Cancelled</h4>
          <span className="other-count">
            {sites.filter((s) => s.status === 'cancelled').length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PipelineKanban;
