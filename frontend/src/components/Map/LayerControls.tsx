import { useMapContext } from '../../context/MapContext';
import type { LayerVisibility, TerrainOverlayType } from '../../types/map';
import './LayerControls.css';

interface LayerControlsProps {
  className?: string;
  compact?: boolean;
}

interface LayerToggleProps {
  label: string;
  layerKey: keyof LayerVisibility;
  icon?: React.ReactNode;
  disabled?: boolean;
}

const LayerToggle = ({ label, layerKey, icon, disabled = false }: LayerToggleProps) => {
  const { layerVisibility, toggleLayer } = useMapContext();
  const isActive = layerVisibility[layerKey];

  return (
    <button
      className={`layer-toggle ${isActive ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && toggleLayer(layerKey)}
      disabled={disabled}
      title={label}
    >
      {icon && <span className="layer-toggle-icon">{icon}</span>}
      <span className="layer-toggle-label">{label}</span>
      <span className={`layer-toggle-indicator ${isActive ? 'on' : 'off'}`} />
    </button>
  );
};

export function LayerControls({ className = '', compact = false }: LayerControlsProps) {
  const { terrainOverlay, setTerrainOverlay, isLoaded } = useMapContext();

  const handleTerrainChange = (overlay: TerrainOverlayType) => {
    setTerrainOverlay(overlay);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <div className={`layer-controls ${compact ? 'compact' : ''} ${className}`}>
      <div className="layer-controls-header">
        <h3>Layers</h3>
      </div>

      <div className="layer-controls-section">
        <h4>Site Features</h4>
        <div className="layer-toggles">
          <LayerToggle
            label="Boundary"
            layerKey="boundary"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            }
          />
          <LayerToggle
            label="Exclusion Zones"
            layerKey="exclusionZones"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <line x1="4" y1="4" x2="20" y2="20" />
              </svg>
            }
          />
          <LayerToggle
            label="Entry Points"
            layerKey="entryPoints"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="10" r="3" />
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="layer-controls-section">
        <h4>Layout Elements</h4>
        <div className="layer-toggles">
          <LayerToggle
            label="Assets"
            layerKey="assets"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <line x1="6" y1="6" x2="6" y2="18" />
                <line x1="18" y1="6" x2="18" y2="18" />
              </svg>
            }
          />
          <LayerToggle
            label="Roads"
            layerKey="roads"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19L8 5" />
                <path d="M16 5L20 19" />
                <line x1="9" y1="10" x2="15" y2="10" />
                <line x1="8" y1="14" x2="16" y2="14" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="layer-controls-section">
        <h4>Terrain Analysis</h4>
        <div className="terrain-overlay-buttons">
          <button
            className={`terrain-btn ${terrainOverlay === 'none' ? 'active' : ''}`}
            onClick={() => handleTerrainChange('none')}
          >
            None
          </button>
          <button
            className={`terrain-btn ${terrainOverlay === 'elevation' ? 'active' : ''}`}
            onClick={() => handleTerrainChange('elevation')}
          >
            Elevation
          </button>
          <button
            className={`terrain-btn ${terrainOverlay === 'slope' ? 'active' : ''}`}
            onClick={() => handleTerrainChange('slope')}
          >
            Slope
          </button>
          <button
            className={`terrain-btn ${terrainOverlay === 'aspect' ? 'active' : ''}`}
            onClick={() => handleTerrainChange('aspect')}
          >
            Aspect
          </button>
        </div>
        <div className="layer-toggles">
          <LayerToggle
            label="Contours"
            layerKey="contours"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="18" rx="8" ry="3" />
                <ellipse cx="12" cy="14" rx="6" ry="2.5" />
                <ellipse cx="12" cy="10" rx="4" ry="2" />
                <ellipse cx="12" cy="7" rx="2" ry="1" />
              </svg>
            }
          />
        </div>
      </div>

      {terrainOverlay !== 'none' && (
        <div className="layer-controls-section">
          <h4>Legend</h4>
          <TerrainLegend type={terrainOverlay} />
        </div>
      )}
    </div>
  );
}

interface TerrainLegendProps {
  type: TerrainOverlayType;
}

function TerrainLegend({ type }: TerrainLegendProps) {
  const legends: Record<TerrainOverlayType, { label: string; color: string }[]> = {
    none: [],
    elevation: [
      { label: 'Low', color: '#22c55e' },
      { label: '', color: '#84cc16' },
      { label: 'Medium', color: '#eab308' },
      { label: '', color: '#f97316' },
      { label: 'High', color: '#dc2626' },
    ],
    slope: [
      { label: '0-5%', color: '#22c55e' },
      { label: '5-10%', color: '#eab308' },
      { label: '10-15%', color: '#f97316' },
      { label: '>15%', color: '#dc2626' },
    ],
    aspect: [
      { label: 'N', color: '#3b82f6' },
      { label: 'E', color: '#22c55e' },
      { label: 'S', color: '#eab308' },
      { label: 'W', color: '#ef4444' },
    ],
  };

  const items = legends[type];

  return (
    <div className="terrain-legend">
      <div className="terrain-legend-gradient">
        {items.map((item, index) => (
          <div
            key={index}
            className="terrain-legend-item"
            style={{ backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="terrain-legend-labels">
        {items
          .filter((item) => item.label)
          .map((item, index) => (
            <span key={index} className="terrain-legend-label">
              {item.label}
            </span>
          ))}
      </div>
    </div>
  );
}

export default LayerControls;
