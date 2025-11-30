/**
 * Site Comparison Table Component
 *
 * Sortable, filterable table for cross-site comparison.
 */

import React, { useState, useMemo } from 'react';
import {
  SiteData,
  SortConfig,
  SortDirection,
  FilterCriteria,
  STATUS_CONFIG,
  filterSites,
  sortSites,
  formatCapacity,
  formatArea,
  formatCurrency,
  getScoreColor,
} from './types';
import './SiteComparisonTable.css';

interface SiteComparisonTableProps {
  sites: SiteData[];
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  selectedSites: string[];
  onSelectionChange: (selected: string[]) => void;
  onSiteClick?: (site: SiteData) => void;
}

type SortField = 'name' | 'status' | 'capacity' | 'score' | 'area' | 'cost' | 'region';

interface Column {
  key: SortField;
  label: string;
  sortable: boolean;
  width?: string;
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Site Name', sortable: true, width: '200px' },
  { key: 'status', label: 'Status', sortable: true, width: '120px' },
  { key: 'region', label: 'Region', sortable: true, width: '120px' },
  { key: 'capacity', label: 'Capacity', sortable: true, width: '100px' },
  { key: 'area', label: 'Area', sortable: true, width: '100px' },
  { key: 'score', label: 'Score', sortable: true, width: '80px' },
  { key: 'cost', label: 'Est. Cost', sortable: true, width: '120px' },
];

export const SiteComparisonTable: React.FC<SiteComparisonTableProps> = ({
  sites,
  filters,
  onFiltersChange,
  selectedSites,
  onSelectionChange,
  onSiteClick,
}) => {
  const [sort, setSort] = useState<SortConfig>({ field: 'score', direction: 'desc' });

  const filteredSites = useMemo(() => filterSites(sites, filters), [sites, filters]);
  const sortedSites = useMemo(() => sortSites(filteredSites, sort), [filteredSites, sort]);

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleSelectAll = () => {
    if (selectedSites.length === sortedSites.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(sortedSites.map((s) => s.id));
    }
  };

  const handleSelectSite = (siteId: string) => {
    if (selectedSites.includes(siteId)) {
      onSelectionChange(selectedSites.filter((id) => id !== siteId));
    } else {
      onSelectionChange([...selectedSites, siteId]);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sort.field !== field) {
      return <span className="sort-icon inactive">↕</span>;
    }
    return <span className="sort-icon active">{sort.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const renderScoreBar = (score: number) => {
    const color = getScoreColor(score);
    return (
      <div className="score-cell">
        <div className="score-bar-container">
          <div
            className="score-bar"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
        <span className="score-value" style={{ color }}>{score}</span>
      </div>
    );
  };

  const renderStatusBadge = (status: SiteData['status']) => {
    const config = STATUS_CONFIG[status];
    return (
      <span
        className="status-badge"
        style={{ backgroundColor: config.color }}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div className="site-comparison-table">
      <div className="table-header">
        <div className="table-info">
          <span className="site-count">{sortedSites.length} sites</span>
          {selectedSites.length > 0 && (
            <span className="selected-count">{selectedSites.length} selected</span>
          )}
        </div>
        <div className="table-search">
          <input
            type="text"
            placeholder="Search sites..."
            value={filters.searchQuery || ''}
            onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="checkbox-col">
                <input
                  type="checkbox"
                  checked={selectedSites.length === sortedSites.length && sortedSites.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={col.sortable ? 'sortable' : ''}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && renderSortIcon(col.key)}
                </th>
              ))}
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSites.map((site) => (
              <tr
                key={site.id}
                className={selectedSites.includes(site.id) ? 'selected' : ''}
                onClick={() => onSiteClick?.(site)}
              >
                <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedSites.includes(site.id)}
                    onChange={() => handleSelectSite(site.id)}
                  />
                </td>
                <td className="name-col">
                  <div className="site-name">{site.name}</div>
                  <div className="project-code">{site.projectCode}</div>
                </td>
                <td>{renderStatusBadge(site.status)}</td>
                <td>{site.location.region || '-'}</td>
                <td className="numeric">{formatCapacity(site.metrics.capacityMw)}</td>
                <td className="numeric">{formatArea(site.metrics.totalArea)}</td>
                <td>{renderScoreBar(site.scores.composite)}</td>
                <td className="numeric">{formatCurrency(site.metrics.estimatedCost)}</td>
                <td className="actions-col" onClick={(e) => e.stopPropagation()}>
                  <button className="action-btn" title="View details">
                    <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
            {sortedSites.length === 0 && (
              <tr className="empty-row">
                <td colSpan={COLUMNS.length + 2}>
                  <div className="empty-message">
                    No sites match the current filters
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedSites.length > 0 && (
        <div className="bulk-actions">
          <span>{selectedSites.length} sites selected</span>
          <button className="bulk-btn">Compare Selected</button>
          <button className="bulk-btn">Export Selected</button>
          <button className="bulk-btn secondary" onClick={() => onSelectionChange([])}>
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default SiteComparisonTable;
