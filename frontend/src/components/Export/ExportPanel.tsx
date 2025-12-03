import React, { useState, useCallback } from 'react';
import './ExportPanel.css';

/**
 * Export format options
 */
export type ExportFormat = 'geojson' | 'kml' | 'kmz';

/**
 * Layer type options for export
 */
export type ExportLayer = 'boundary' | 'assets' | 'roads' | 'exclusion_zones';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  layers: ExportLayer[];
  includeStyles: boolean;
  includeMetadata: boolean;
  coordinatePrecision: number;
}

/**
 * Layout data for export
 */
export interface LayoutExportData {
  projectId: string;
  projectName: string;
  exportDate: string;
  crs: string;
  boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  assets: Array<{
    id: string;
    type: string;
    name: string;
    position: { x: number; y: number };
    dimensions: { width: number; length: number; height: number };
    rotation: number;
    footprint: GeoJSON.Polygon;
  }>;
  roads?: {
    entryPoint: GeoJSON.Point;
    segments: Array<{
      id: string;
      startPoint: [number, number];
      endPoint: [number, number];
      length: number;
      gradient: number;
      width: number;
      geometry: GeoJSON.LineString;
    }>;
    totalLength: number;
    maxGradient: number;
  };
  exclusionZones: Array<{
    id: string;
    name: string;
    type: string;
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    buffer?: number;
    reason?: string;
  }>;
  metadata: {
    totalArea: number;
    assetCount: number;
    roadLength: number;
    exclusionZoneCount: number;
  };
}

interface ExportPanelProps {
  layoutData: LayoutExportData | null;
  onExportStart?: () => void;
  onExportComplete?: (success: boolean, filename?: string) => void;
  className?: string;
}

const FORMAT_INFO: Record<ExportFormat, { label: string; icon: string; description: string }> = {
  geojson: {
    label: 'GeoJSON',
    icon: '{ }',
    description: 'Open standard format for GIS applications',
  },
  kml: {
    label: 'KML',
    icon: '🌍',
    description: 'Google Earth format (uncompressed)',
  },
  kmz: {
    label: 'KMZ',
    icon: '📦',
    description: 'Google Earth format (compressed, recommended)',
  },
};

const LAYER_INFO: Record<ExportLayer, { label: string; icon: string }> = {
  boundary: { label: 'Site Boundary', icon: '🔲' },
  assets: { label: 'Assets', icon: '🏗️' },
  roads: { label: 'Roads', icon: '🛤️' },
  exclusion_zones: { label: 'Exclusion Zones', icon: '🚫' },
};

export function ExportPanel({
  layoutData,
  onExportStart,
  onExportComplete,
  className = '',
}: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('kmz');
  const [selectedLayers, setSelectedLayers] = useState<ExportLayer[]>([
    'boundary',
    'assets',
    'roads',
    'exclusion_zones',
  ]);
  const [includeStyles, setIncludeStyles] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLayer = useCallback((layer: ExportLayer) => {
    setSelectedLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  }, []);

  const handleExport = useCallback(async () => {
    if (!layoutData) {
      setError('No layout data to export');
      return;
    }

    if (selectedLayers.length === 0) {
      setError('Please select at least one layer to export');
      return;
    }

    setIsExporting(true);
    setError(null);
    onExportStart?.();

    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? '';
      const endpoint = `${apiUrl}/api/v1/export/${format}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          layoutData: {
            ...layoutData,
            exportDate: new Date().toISOString(),
          },
          layers: selectedLayers,
          includeStyles,
          includeMetadata,
          coordinatePrecision: 6,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${layoutData.projectName}.${format}`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onExportComplete?.(true, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      onExportComplete?.(false);
    } finally {
      setIsExporting(false);
    }
  }, [
    layoutData,
    format,
    selectedLayers,
    includeStyles,
    includeMetadata,
    onExportStart,
    onExportComplete,
  ]);

  const canExport = layoutData && selectedLayers.length > 0 && !isExporting;

  return (
    <div className={`export-panel ${className}`}>
      <div className="export-panel-header">
        <h3>Export Layout</h3>
        <p className="export-panel-subtitle">Export your layout to GIS-compatible formats</p>
      </div>

      {/* Format Selection */}
      <div className="export-section">
        <label className="export-section-label">Export Format</label>
        <div className="export-format-options">
          {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              className={`export-format-btn ${format === fmt ? 'active' : ''}`}
              onClick={() => setFormat(fmt)}
              disabled={isExporting}
            >
              <span className="format-icon">{FORMAT_INFO[fmt].icon}</span>
              <span className="format-label">{FORMAT_INFO[fmt].label}</span>
              <span className="format-desc">{FORMAT_INFO[fmt].description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer Selection */}
      <div className="export-section">
        <label className="export-section-label">Include Layers</label>
        <div className="export-layer-options">
          {(Object.keys(LAYER_INFO) as ExportLayer[]).map((layer) => (
            <label
              key={layer}
              className={`export-layer-checkbox ${selectedLayers.includes(layer) ? 'checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedLayers.includes(layer)}
                onChange={() => toggleLayer(layer)}
                disabled={isExporting}
              />
              <span className="layer-icon">{LAYER_INFO[layer].icon}</span>
              <span className="layer-label">{LAYER_INFO[layer].label}</span>
              {layoutData && (
                <span className="layer-count">
                  {layer === 'boundary' && '1'}
                  {layer === 'assets' && layoutData.assets.length}
                  {layer === 'roads' && (layoutData.roads?.segments.length || 0)}
                  {layer === 'exclusion_zones' && layoutData.exclusionZones.length}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="export-section">
        <label className="export-section-label">Options</label>
        <div className="export-options">
          <label className="export-option-checkbox">
            <input
              type="checkbox"
              checked={includeStyles}
              onChange={(e) => setIncludeStyles(e.target.checked)}
              disabled={isExporting}
            />
            <span>Include styling (colors, line widths)</span>
          </label>
          <label className="export-option-checkbox">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              disabled={isExporting}
            />
            <span>Include metadata (dimensions, earthwork)</span>
          </label>
        </div>
      </div>

      {/* Summary */}
      {layoutData && (
        <div className="export-summary">
          <div className="summary-item">
            <span className="summary-label">Project</span>
            <span className="summary-value">{layoutData.projectName}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Features</span>
            <span className="summary-value">
              {(selectedLayers.includes('boundary') ? 1 : 0) +
                (selectedLayers.includes('assets') ? layoutData.assets.length : 0) +
                (selectedLayers.includes('roads') ? layoutData.roads?.segments.length || 0 : 0) +
                (selectedLayers.includes('exclusion_zones') ? layoutData.exclusionZones.length : 0)}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="export-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Export Button */}
      <button className="export-button" onClick={handleExport} disabled={!canExport}>
        {isExporting ? (
          <>
            <span className="spinner"></span>
            Exporting...
          </>
        ) : (
          <>
            <span className="export-icon">📥</span>
            Export as {FORMAT_INFO[format].label}
          </>
        )}
      </button>

      {!layoutData && (
        <p className="export-no-data">No layout data available. Create or load a layout first.</p>
      )}
    </div>
  );
}

export default ExportPanel;
