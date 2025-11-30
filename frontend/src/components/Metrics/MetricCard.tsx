import React from 'react';
import type { TrendDirection, MetricFormatOptions } from './types';
import { formatMetricValue } from './types';
import './MetricCard.css';

interface MetricCardProps {
  title: string;
  value: number;
  format: MetricFormatOptions;
  icon?: string;
  trend?: TrendDirection;
  changeValue?: number;
  changeFormat?: MetricFormatOptions;
  subtitle?: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function MetricCard({
  title,
  value,
  format,
  icon,
  trend,
  changeValue,
  changeFormat,
  subtitle,
  color = 'default',
  size = 'medium',
  className = '',
}: MetricCardProps) {
  const formattedValue = formatMetricValue(value, format);
  const formattedChange =
    changeValue !== undefined && changeFormat ? formatMetricValue(changeValue, changeFormat) : null;

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  const getTrendClass = () => {
    switch (trend) {
      case 'up':
        return 'trend-up';
      case 'down':
        return 'trend-down';
      default:
        return 'trend-neutral';
    }
  };

  return (
    <div className={`metric-card metric-card-${size} metric-card-${color} ${className}`}>
      <div className="metric-card-header">
        {icon && <span className="metric-icon">{icon}</span>}
        <span className="metric-title">{title}</span>
      </div>

      <div className="metric-card-body">
        <span className="metric-value">{formattedValue}</span>

        {(trend || formattedChange) && (
          <div className={`metric-trend ${getTrendClass()}`}>
            {trend && <span className="trend-icon">{getTrendIcon()}</span>}
            {formattedChange && <span className="trend-value">{formattedChange}</span>}
          </div>
        )}
      </div>

      {subtitle && (
        <div className="metric-card-footer">
          <span className="metric-subtitle">{subtitle}</span>
        </div>
      )}
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: number;
  format: MetricFormatOptions;
  highlight?: boolean;
}

export function MetricRow({ label, value, format, highlight = false }: MetricRowProps) {
  return (
    <div className={`metric-row ${highlight ? 'metric-row-highlight' : ''}`}>
      <span className="metric-row-label">{label}</span>
      <span className="metric-row-value">{formatMetricValue(value, format)}</span>
    </div>
  );
}

interface MetricGroupProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function MetricGroup({
  title,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true,
}: MetricGroupProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div className={`metric-group ${expanded ? 'expanded' : 'collapsed'}`}>
      <div
        className="metric-group-header"
        onClick={collapsible ? () => setExpanded(!expanded) : undefined}
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
      >
        {icon && <span className="metric-group-icon">{icon}</span>}
        <span className="metric-group-title">{title}</span>
        {collapsible && <span className="metric-group-toggle">{expanded ? '−' : '+'}</span>}
      </div>
      {expanded && <div className="metric-group-content">{children}</div>}
    </div>
  );
}

export default MetricCard;
