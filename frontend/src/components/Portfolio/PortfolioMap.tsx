/**
 * Portfolio Map Component
 *
 * Map view of all sites with status indicators.
 * Uses simple SVG markers (no external map library dependency).
 */

import React, { useState, useMemo } from 'react';
import {
  SiteData,
  SiteStatus,
  STATUS_CONFIG,
  FilterCriteria,
  filterSites,
  formatCapacity,
  getScoreColor,
} from './types';
import './PortfolioMap.css';

interface PortfolioMapProps {
  sites: SiteData[];
  filters: FilterCriteria;
  onSiteClick?: (site: SiteData) => void;
  selectedSiteId?: string;
}

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface MapMarkerProps {
  site: SiteData;
  x: number;
  y: number;
  isSelected: boolean;
  onClick: () => void;
  onHover: (site: SiteData | null) => void;
}

const MapMarker: React.FC<MapMarkerProps> = ({ site, x, y, isSelected, onClick, onHover }) => {
  const status = STATUS_CONFIG[site.status];
  const scoreColor = getScoreColor(site.scores.composite);
  const size = Math.min(40, Math.max(20, site.metrics.capacityMw / 5 + 20));

  return (
    <g
      className={`map-marker ${isSelected ? 'selected' : ''}`}
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      onMouseEnter={() => onHover(site)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Outer ring - status color */}
      <circle
        r={size / 2 + 3}
        fill="transparent"
        stroke={status.color}
        strokeWidth={3}
        className="marker-ring"
      />
      {/* Inner circle - score color */}
      <circle
        r={size / 2}
        fill={scoreColor}
        opacity={0.9}
      />
      {/* Selection highlight */}
      {isSelected && (
        <circle
          r={size / 2 + 8}
          fill="transparent"
          stroke="var(--accent-color, #64ffda)"
          strokeWidth={2}
          strokeDasharray="4 2"
          className="selection-ring"
        />
      )}
      {/* Score text */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={size > 30 ? 12 : 10}
        fontWeight="bold"
      >
        {site.scores.composite}
      </text>
    </g>
  );
};

interface TooltipProps {
  site: SiteData;
  x: number;
  y: number;
}

const SiteTooltip: React.FC<TooltipProps> = ({ site, x, y }) => {
  const status = STATUS_CONFIG[site.status];

  return (
    <div
      className="map-tooltip"
      style={{
        left: x + 20,
        top: y - 10,
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-name">{site.name}</span>
        <span
          className="tooltip-status"
          style={{ backgroundColor: status.color }}
        >
          {status.label}
        </span>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-row">
          <span>Capacity:</span>
          <span>{formatCapacity(site.metrics.capacityMw)}</span>
        </div>
        <div className="tooltip-row">
          <span>Score:</span>
          <span style={{ color: getScoreColor(site.scores.composite) }}>
            {site.scores.composite}/100
          </span>
        </div>
        {site.location.region && (
          <div className="tooltip-row">
            <span>Region:</span>
            <span>{site.location.region}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const PortfolioMap: React.FC<PortfolioMapProps> = ({
  sites,
  filters,
  onSiteClick,
  selectedSiteId,
}) => {
  const [hoveredSite, setHoveredSite] = useState<SiteData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const filteredSites = useMemo(() => filterSites(sites, filters), [sites, filters]);

  // Calculate map bounds
  const bounds = useMemo<MapBounds>(() => {
    if (filteredSites.length === 0) {
      return { minLat: -90, maxLat: 90, minLng: -180, maxLng: 180 };
    }

    const lats = filteredSites.map((s) => s.location.latitude);
    const lngs = filteredSites.map((s) => s.location.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const latPad = Math.max((maxLat - minLat) * 0.1, 1);
    const lngPad = Math.max((maxLng - minLng) * 0.1, 1);

    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad,
    };
  }, [filteredSites]);

  // Convert lat/lng to SVG coordinates
  const projectPoint = (lat: number, lng: number, width: number, height: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * height;
    return { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // Group sites by status for legend
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSites.forEach((site) => {
      counts[site.status] = (counts[site.status] || 0) + 1;
    });
    return counts;
  }, [filteredSites]);

  return (
    <div className="portfolio-map" onMouseMove={handleMouseMove}>
      <div className="map-header">
        <h3>Site Locations</h3>
        <span className="map-count">{filteredSites.length} sites</span>
      </div>

      <div className="map-container">
        <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
          {/* Background */}
          <rect width="100%" height="100%" fill="var(--bg-secondary, #16213e)" />

          {/* Grid lines */}
          <g className="map-grid" opacity={0.1}>
            {[...Array(10)].map((_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * 50}
                x2={800}
                y2={i * 50}
                stroke="currentColor"
              />
            ))}
            {[...Array(16)].map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 50}
                y1={0}
                x2={i * 50}
                y2={500}
                stroke="currentColor"
              />
            ))}
          </g>

          {/* Site markers */}
          {filteredSites.map((site) => {
            const { x, y } = projectPoint(
              site.location.latitude,
              site.location.longitude,
              800,
              500
            );
            return (
              <MapMarker
                key={site.id}
                site={site}
                x={x}
                y={y}
                isSelected={site.id === selectedSiteId}
                onClick={() => onSiteClick?.(site)}
                onHover={setHoveredSite}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredSite && (
          <SiteTooltip site={hoveredSite} x={mousePos.x} y={mousePos.y} />
        )}
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-section">
          <span className="legend-title">Status</span>
          <div className="legend-items">
            {Object.entries(STATUS_CONFIG)
              .filter(([status]) => statusCounts[status] > 0)
              .sort((a, b) => a[1].order - b[1].order)
              .map(([status, config]) => (
                <div key={status} className="legend-item">
                  <span className="legend-ring" style={{ borderColor: config.color }} />
                  <span className="legend-label">{config.label}</span>
                  <span className="legend-count">{statusCounts[status]}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="legend-section">
          <span className="legend-title">Score</span>
          <div className="legend-items score-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: getScoreColor(80) }} />
              <span className="legend-label">80+</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: getScoreColor(60) }} />
              <span className="legend-label">60-79</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: getScoreColor(40) }} />
              <span className="legend-label">40-59</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: getScoreColor(20) }} />
              <span className="legend-label">&lt;40</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioMap;
