import { useMapContext } from '../../context/MapContext';
import type { DrawingMode } from '../../types/map';
import './DrawingToolbar.css';

interface DrawingToolbarProps {
  className?: string;
  onDelete?: () => void;
  vertical?: boolean;
}

interface ToolButtonProps {
  mode: DrawingMode;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
}

const ToolButton = ({ mode, icon, label, tooltip }: ToolButtonProps) => {
  const { drawingMode, setDrawingMode, isDrawing } = useMapContext();
  const isActive = drawingMode === mode;

  const handleClick = () => {
    if (isActive) {
      setDrawingMode('simple_select');
    } else {
      setDrawingMode(mode);
    }
  };

  return (
    <button
      className={`tool-button ${isActive ? 'active' : ''} ${isDrawing && !isActive ? 'dimmed' : ''}`}
      onClick={handleClick}
      title={tooltip}
      aria-label={label}
    >
      <span className="tool-button-icon">{icon}</span>
      <span className="tool-button-label">{label}</span>
    </button>
  );
};

export function DrawingToolbar({ className = '', onDelete, vertical = false }: DrawingToolbarProps) {
  const { isLoaded, selectedFeatureId, setDrawingMode } = useMapContext();

  if (!isLoaded) {
    return null;
  }

  const handleCancel = () => {
    setDrawingMode('simple_select');
  };

  return (
    <div className={`drawing-toolbar ${vertical ? 'vertical' : ''} ${className}`}>
      <div className="toolbar-section">
        <ToolButton
          mode="simple_select"
          label="Select"
          tooltip="Select and move features (V)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              <path d="M13 13l6 6" />
            </svg>
          }
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <ToolButton
          mode="draw_polygon"
          label="Polygon"
          tooltip="Draw exclusion zone polygon (P)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
            </svg>
          }
        />
        <ToolButton
          mode="draw_line_string"
          label="Line"
          tooltip="Draw elevation transect line (L)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="20" x2="20" y2="4" />
              <circle cx="4" cy="20" r="2" />
              <circle cx="20" cy="4" r="2" />
            </svg>
          }
        />
        <ToolButton
          mode="draw_point"
          label="Point"
          tooltip="Place marker point (M)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <circle cx="12" cy="12" r="8" strokeDasharray="4 4" />
            </svg>
          }
        />
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button
          className="tool-button danger"
          onClick={onDelete}
          disabled={!selectedFeatureId}
          title="Delete selected feature (Delete)"
          aria-label="Delete"
        >
          <span className="tool-button-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </span>
          <span className="tool-button-label">Delete</span>
        </button>
        <button
          className="tool-button"
          onClick={handleCancel}
          title="Cancel drawing (Escape)"
          aria-label="Cancel"
        >
          <span className="tool-button-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
          <span className="tool-button-label">Cancel</span>
        </button>
      </div>

      <DrawingHelp />
    </div>
  );
}

function DrawingHelp() {
  const { drawingMode, isDrawing } = useMapContext();

  if (!isDrawing) return null;

  const helpText: Record<DrawingMode, string> = {
    simple_select: '',
    draw_polygon: 'Click to add points. Double-click or click first point to complete.',
    draw_line_string: 'Click to add points. Double-click to complete the line.',
    draw_point: 'Click on the map to place a point.',
    static: '',
  };

  return (
    <div className="drawing-help">
      <span className="drawing-help-text">{helpText[drawingMode]}</span>
      <span className="drawing-help-hint">Press Escape to cancel</span>
    </div>
  );
}

export default DrawingToolbar;
