/**
 * Portfolio Dashboard Component
 *
 * Main dashboard combining all portfolio views and analytics.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  SiteData,
  SiteStatus,
  FilterCriteria,
  STATUS_CONFIG,
  calculatePortfolioSummary,
  filterSites,
} from './types';
import { SiteComparisonTable } from './SiteComparisonTable';
import { PortfolioSummary } from './PortfolioSummary';
import { PipelineKanban } from './PipelineKanban';
import { PortfolioMap } from './PortfolioMap';
import './PortfolioDashboard.css';

interface PortfolioDashboardProps {
  sites: SiteData[];
  onSiteSelect?: (site: SiteData) => void;
}

type ViewMode = 'table' | 'map' | 'pipeline';

interface FilterPanelProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  sites: SiteData[];
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFiltersChange, sites }) => {
  // Get unique regions from sites
  const regions = useMemo(() => {
    const uniqueRegions = new Set(sites.map((s) => s.location.region).filter(Boolean));
    return Array.from(uniqueRegions).sort() as string[];
  }, [sites]);

  const handleStatusToggle = (status: SiteStatus) => {
    const currentStatuses = filters.status || [];
    if (currentStatuses.includes(status)) {
      onFiltersChange({
        ...filters,
        status: currentStatuses.filter((s) => s !== status),
      });
    } else {
      onFiltersChange({
        ...filters,
        status: [...currentStatuses, status],
      });
    }
  };

  const handleRegionToggle = (region: string) => {
    const currentRegions = filters.region || [];
    if (currentRegions.includes(region)) {
      onFiltersChange({
        ...filters,
        region: currentRegions.filter((r) => r !== region),
      });
    } else {
      onFiltersChange({
        ...filters,
        region: [...currentRegions, region],
      });
    }
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
  );

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <span className="filter-title">Filters</span>
        {hasFilters && (
          <button className="clear-filters" onClick={clearFilters}>
            Clear all
          </button>
        )}
      </div>

      <div className="filter-section">
        <span className="filter-label">Status</span>
        <div className="filter-options">
          {Object.entries(STATUS_CONFIG)
            .sort((a, b) => a[1].order - b[1].order)
            .map(([status, config]) => (
              <label key={status} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.status?.includes(status as SiteStatus) ?? false}
                  onChange={() => handleStatusToggle(status as SiteStatus)}
                />
                <span className="checkbox-dot" style={{ backgroundColor: config.color }} />
                <span>{config.label}</span>
              </label>
            ))}
        </div>
      </div>

      {regions.length > 0 && (
        <div className="filter-section">
          <span className="filter-label">Region</span>
          <div className="filter-options">
            {regions.map((region) => (
              <label key={region} className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filters.region?.includes(region) ?? false}
                  onChange={() => handleRegionToggle(region)}
                />
                <span>{region}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="filter-section">
        <span className="filter-label">Score Range</span>
        <div className="filter-range">
          <input
            type="number"
            placeholder="Min"
            min={0}
            max={100}
            value={filters.minScore ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                minScore: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
          <span>to</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            max={100}
            value={filters.maxScore ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                maxScore: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">Capacity (MW)</span>
        <div className="filter-range">
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={filters.minCapacity ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                minCapacity: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
          />
          <span>to</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={filters.maxCapacity ?? ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                maxCapacity: e.target.value ? parseFloat(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>
    </div>
  );
};

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ sites, onSiteSelect }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<FilterCriteria>({});
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filteredSites = useMemo(() => filterSites(sites, filters), [sites, filters]);
  const summary = useMemo(() => calculatePortfolioSummary(filteredSites), [filteredSites]);

  const handleStatusFilter = useCallback((status: SiteStatus) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status?.includes(status) ? prev.status.filter((s) => s !== status) : [status],
    }));
  }, []);

  const handleSiteClick = useCallback(
    (site: SiteData) => {
      onSiteSelect?.(site);
    },
    [onSiteSelect]
  );

  return (
    <div className="portfolio-dashboard">
      <div className="dashboard-header">
        <div className="header-title">
          <h1>Portfolio Analytics</h1>
          <span className="site-count">
            {filteredSites.length} of {sites.length} sites
          </span>
        </div>

        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              Table
            </button>
            <button
              className={viewMode === 'map' ? 'active' : ''}
              onClick={() => setViewMode('map')}
            >
              Map
            </button>
            <button
              className={viewMode === 'pipeline' ? 'active' : ''}
              onClick={() => setViewMode('pipeline')}
            >
              Pipeline
            </button>
          </div>

          <button
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <span>Filters</span>
            {Object.values(filters).some((v) =>
              Array.isArray(v) ? v.length > 0 : v !== undefined
            ) && <span className="filter-badge" />}
          </button>

          <button className="export-btn">Export</button>
        </div>
      </div>

      <div className="dashboard-body">
        {showFilters && (
          <aside className="dashboard-sidebar">
            <FilterPanel filters={filters} onFiltersChange={setFilters} sites={sites} />
          </aside>
        )}

        <div className="dashboard-main">
          <div className="summary-row">
            <PortfolioSummary summary={summary} onStatusClick={handleStatusFilter} />
          </div>

          <div className="content-area">
            {viewMode === 'table' && (
              <SiteComparisonTable
                sites={sites}
                filters={filters}
                onFiltersChange={setFilters}
                selectedSites={selectedSites}
                onSelectionChange={setSelectedSites}
                onSiteClick={handleSiteClick}
              />
            )}

            {viewMode === 'map' && (
              <PortfolioMap
                sites={sites}
                filters={filters}
                onSiteClick={handleSiteClick}
                selectedSiteId={selectedSites[0]}
              />
            )}

            {viewMode === 'pipeline' && (
              <PipelineKanban sites={filteredSites} onSiteClick={handleSiteClick} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioDashboard;
