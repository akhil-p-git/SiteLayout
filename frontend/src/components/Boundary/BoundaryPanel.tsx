import { useState, useCallback, useEffect } from 'react';
import { useMapContext } from '../../context/MapContext';
import type { Polygon, MultiPolygon } from 'geojson';
import './BoundaryPanel.css';

interface SiteBoundary {
  id: string;
  name: string;
  geometry: Polygon | MultiPolygon;
  area: number; // square meters
}

interface BoundaryPanelProps {
  siteId: string;
  onBoundaryChange?: (boundary: SiteBoundary | null) => void;
}

// Calculate area of a polygon in square meters (approximate)
function calculateArea(geometry: Polygon | MultiPolygon): number {
  // Simple approximation using shoelace formula
  // For production, use turf.js or similar
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0];
    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1];
      area -= coords[i + 1][0] * coords[i][1];
    }
    // Convert from degrees to approximate square meters
    // This is a rough approximation - use turf for accuracy
    return Math.abs(area / 2) * 111319.9 * 111319.9;
  }
  return 0;
}

function formatArea(areaM2: number): string {
  if (areaM2 >= 4046.86) {
    // Convert to acres
    const acres = areaM2 / 4046.86;
    return `${acres.toFixed(2)} acres`;
  }
  return `${areaM2.toFixed(0)} m²`;
}

export function BoundaryPanel({ siteId, onBoundaryChange }: BoundaryPanelProps) {
  const { setDrawingMode, draw } = useMapContext();
  const [boundary, setBoundary] = useState<SiteBoundary | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Load boundary from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`boundary_${siteId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBoundary(parsed);
        onBoundaryChange?.(parsed);
      } catch (e) {
        console.error('Failed to parse saved boundary:', e);
      }
    }
  }, [siteId, onBoundaryChange]);

  // Save boundary to localStorage when it changes
  useEffect(() => {
    if (boundary) {
      localStorage.setItem(`boundary_${siteId}`, JSON.stringify(boundary));
    } else {
      localStorage.removeItem(`boundary_${siteId}`);
    }
  }, [boundary, siteId]);

  const handleStartDrawing = useCallback(() => {
    setIsDrawing(true);
    setDrawingMode('draw_polygon');
  }, [setDrawingMode]);

  const handleSaveBoundary = useCallback((geometry: Polygon | MultiPolygon) => {
    const newBoundary: SiteBoundary = {
      id: `boundary_${Date.now()}`,
      name: 'Site Boundary',
      geometry,
      area: calculateArea(geometry),
    };
    setBoundary(newBoundary);
    onBoundaryChange?.(newBoundary);
    setIsDrawing(false);
    setDrawingMode('simple_select');
  }, [onBoundaryChange, setDrawingMode]);

  const handleDeleteBoundary = useCallback(() => {
    if (boundary && draw) {
      // Try to find and delete the boundary feature from the map
      const allFeatures = draw.getAll();
      const boundaryFeature = allFeatures.features.find(
        f => f.properties?.isBoundary === true
      );
      if (boundaryFeature && boundaryFeature.id) {
        draw.delete([boundaryFeature.id as string]);
      }
    }
    setBoundary(null);
    onBoundaryChange?.(null);
  }, [boundary, draw, onBoundaryChange]);

  const handleCancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawingMode('simple_select');
  }, [setDrawingMode]);

  return (
    <div className="boundary-panel">
      <div className="boundary-panel-header">
        <h3>Site Boundary</h3>
        <p className="boundary-help">
          Define the property boundary for your solar site. The optimizer will only place assets within this boundary.
        </p>
      </div>

      {boundary ? (
        <div className="boundary-info">
          <div className="boundary-card">
            <div className="boundary-card-header">
              <span className="boundary-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
                </svg>
              </span>
              <div className="boundary-card-title">
                <strong>{boundary.name}</strong>
                <span className="boundary-area">{formatArea(boundary.area)}</span>
              </div>
            </div>
            <div className="boundary-actions">
              <button
                className="boundary-btn boundary-btn-edit"
                onClick={handleStartDrawing}
                title="Redraw boundary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Redraw
              </button>
              <button
                className="boundary-btn boundary-btn-delete"
                onClick={handleDeleteBoundary}
                title="Delete boundary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : isDrawing ? (
        <div className="boundary-drawing">
          <div className="boundary-drawing-message">
            <span className="drawing-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
              </svg>
            </span>
            <p>Click on the map to draw your site boundary polygon.</p>
            <p className="drawing-hint">Double-click or click the first point to complete.</p>
          </div>
          <button className="boundary-btn boundary-btn-cancel" onClick={handleCancelDrawing}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="boundary-empty">
          <div className="boundary-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" strokeDasharray="4 4" />
            </svg>
          </div>
          <p>No boundary defined</p>
          <button className="boundary-btn boundary-btn-primary" onClick={handleStartDrawing}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Draw Boundary
          </button>
        </div>
      )}
    </div>
  );
}

export type { SiteBoundary };
export default BoundaryPanel;
