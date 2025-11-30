import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import type {
  ExclusionZone,
  ExclusionZoneSummary,
  ZoneTypeOption,
  ExclusionZoneType,
} from '../../types/exclusionZone';
import { formatArea, getZoneColor, getZoneLabel } from '../../types/exclusionZone';
import './ExclusionZonePanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ExclusionZonePanelProps {
  siteId: string;
  onZoneSelect?: (zone: ExclusionZone) => void;
  onZoneCreate?: () => void;
  onZoneEdit?: (zone: ExclusionZone) => void;
  onZoneDelete?: (zoneId: string) => void;
  selectedZoneId?: string;
  className?: string;
}

export function ExclusionZonePanel({
  siteId,
  onZoneSelect,
  onZoneCreate,
  onZoneEdit,
  onZoneDelete,
  selectedZoneId,
  className = '',
}: ExclusionZonePanelProps) {
  const { accessToken, hasPermission } = useAuth();
  const [zones, setZones] = useState<ExclusionZone[]>([]);
  const [summary, setSummary] = useState<ExclusionZoneSummary | null>(null);
  const [zoneTypes, setZoneTypes] = useState<ZoneTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [filterType, setFilterType] = useState<ExclusionZoneType | 'all'>('all');

  const canEdit = hasPermission('canEditSite');

  // Fetch zone types
  const fetchZoneTypes = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${API_URL}/api/v1/exclusion-zones/types`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setZoneTypes(data.types);
      }
    } catch (err) {
      console.error('Failed to fetch zone types:', err);
    }
  }, [accessToken]);

  // Fetch zones for the site
  const fetchZones = useCallback(async () => {
    if (!accessToken || !siteId) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (showInactive) params.append('includeInactive', 'true');

      const response = await fetch(
        `${API_URL}/api/v1/exclusion-zones/site/${siteId}?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch zones');
      }

      const data = await response.json();
      setZones(data.zones);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load zones');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, siteId, showInactive]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (!accessToken || !siteId) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/exclusion-zones/site/${siteId}/summary`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  }, [accessToken, siteId]);

  // Initial load
  useEffect(() => {
    fetchZoneTypes();
  }, [fetchZoneTypes]);

  useEffect(() => {
    fetchZones();
    fetchSummary();
  }, [fetchZones, fetchSummary]);

  // Handle zone toggle (active/inactive)
  const handleToggleActive = async (zone: ExclusionZone) => {
    if (!accessToken || !canEdit) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/exclusion-zones/${zone.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ isActive: !zone.isActive }),
        }
      );

      if (response.ok) {
        fetchZones();
        fetchSummary();
      }
    } catch (err) {
      console.error('Failed to toggle zone:', err);
    }
  };

  // Handle zone deletion
  const handleDelete = async (zoneId: string) => {
    if (!accessToken || !canEdit) return;

    if (!confirm('Are you sure you want to delete this exclusion zone?')) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/v1/exclusion-zones/${zoneId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        fetchZones();
        fetchSummary();
        onZoneDelete?.(zoneId);
      }
    } catch (err) {
      console.error('Failed to delete zone:', err);
    }
  };

  // Filter zones
  const filteredZones = zones.filter(zone => {
    if (filterType !== 'all' && zone.type !== filterType) {
      return false;
    }
    return true;
  });

  return (
    <div className={`exclusion-zone-panel ${className}`}>
      <div className="panel-header">
        <h3>Exclusion Zones</h3>
        {canEdit && (
          <button
            type="button"
            className="btn-add-zone"
            onClick={onZoneCreate}
          >
            + Add Zone
          </button>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="zone-summary">
          <div className="summary-stat">
            <span className="stat-value">{summary.activeZones}</span>
            <span className="stat-label">Active Zones</span>
          </div>
          <div className="summary-stat">
            <span className="stat-value">{formatArea(summary.totalBufferedArea)}</span>
            <span className="stat-label">Total Excluded</span>
          </div>
          {summary.excludedPercentage > 0 && (
            <div className="summary-stat">
              <span className="stat-value">{summary.excludedPercentage.toFixed(1)}%</span>
              <span className="stat-label">Of Site</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="zone-filters">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as ExclusionZoneType | 'all')}
          className="filter-select"
        >
          <option value="all">All Types</option>
          {zoneTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <label className="filter-checkbox">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
          />
          Show Inactive
        </label>
      </div>

      {/* Zone list */}
      <div className="zone-list">
        {isLoading && (
          <div className="loading-state">Loading zones...</div>
        )}

        {error && (
          <div className="error-state">{error}</div>
        )}

        {!isLoading && !error && filteredZones.length === 0 && (
          <div className="empty-state">
            <p>No exclusion zones defined</p>
            {canEdit && (
              <button type="button" onClick={onZoneCreate}>
                Create First Zone
              </button>
            )}
          </div>
        )}

        {filteredZones.map(zone => (
          <div
            key={zone.id}
            className={`zone-item ${selectedZoneId === zone.id ? 'selected' : ''} ${!zone.isActive ? 'inactive' : ''}`}
            onClick={() => onZoneSelect?.(zone)}
          >
            <div
              className="zone-color"
              style={{ backgroundColor: getZoneColor(zone.type) }}
            />
            <div className="zone-info">
              <div className="zone-name">{zone.name}</div>
              <div className="zone-meta">
                <span className="zone-type">{getZoneLabel(zone.type)}</span>
                <span className="zone-area">{formatArea(zone.bufferedArea || zone.area)}</span>
              </div>
              {zone.bufferDistance > 0 && (
                <div className="zone-buffer">
                  Buffer: {zone.bufferDistance}m
                </div>
              )}
            </div>
            {canEdit && (
              <div className="zone-actions">
                <button
                  type="button"
                  className="btn-icon"
                  onClick={e => {
                    e.stopPropagation();
                    onZoneEdit?.(zone);
                  }}
                  title="Edit"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={e => {
                    e.stopPropagation();
                    handleToggleActive(zone);
                  }}
                  title={zone.isActive ? 'Deactivate' : 'Activate'}
                >
                  {zone.isActive ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-icon btn-delete"
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(zone.id);
                  }}
                  title="Delete"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Type breakdown */}
      {summary && Object.keys(summary.byType).length > 0 && (
        <div className="zone-breakdown">
          <h4>By Type</h4>
          <div className="breakdown-list">
            {Object.entries(summary.byType)
              .filter(([, data]) => data.count > 0)
              .map(([type, data]) => (
                <div key={type} className="breakdown-item">
                  <div
                    className="breakdown-color"
                    style={{ backgroundColor: getZoneColor(type as ExclusionZoneType) }}
                  />
                  <span className="breakdown-label">
                    {getZoneLabel(type as ExclusionZoneType)}
                  </span>
                  <span className="breakdown-count">{data.count}</span>
                  <span className="breakdown-area">{formatArea(data.area)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExclusionZonePanel;
