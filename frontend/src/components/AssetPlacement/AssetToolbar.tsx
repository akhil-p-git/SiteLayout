import React from 'react';
import { useAssetPlacement } from '../../context/AssetPlacementContext';
import './AssetToolbar.css';

interface AssetToolbarProps {
  className?: string;
}

export function AssetToolbar({ className = '' }: AssetToolbarProps) {
  const {
    selectedAssetIds,
    snapToGrid,
    gridSize,
    showConstraints,
    canUndo,
    canRedo,
    undo,
    redo,
    removeSelectedAssets,
    rotateSelected,
    duplicateSelected,
    selectAll,
    deselectAll,
    toggleSnapToGrid,
    setGridSize,
    toggleShowConstraints,
  } = useAssetPlacement();

  const hasSelection = selectedAssetIds.length > 0;

  return (
    <div className={`asset-toolbar ${className}`}>
      {/* Undo/Redo */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10h10a5 5 0 0 1 5 5v2" />
            <polyline points="3 10 9 4" />
            <polyline points="3 10 9 16" />
          </svg>
        </button>
        <button
          className="toolbar-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10H11a5 5 0 0 0-5 5v2" />
            <polyline points="21 10 15 4" />
            <polyline points="21 10 15 16" />
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Selection operations */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={selectAll}
          title="Select All (Ctrl+A)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 9h6v6H9z" />
          </svg>
        </button>
        <button
          className="toolbar-btn"
          onClick={deselectAll}
          disabled={!hasSelection}
          title="Deselect All (Escape)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 4" />
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Transform operations */}
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={() => rotateSelected(-90)}
          disabled={!hasSelection}
          title="Rotate Left (Q)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2.5 10.5a9 9 0 1 0 4-6" />
            <polyline points="2.5 4.5 2.5 10.5 8.5 10.5" />
          </svg>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => rotateSelected(90)}
          disabled={!hasSelection}
          title="Rotate Right (E)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 10.5a9 9 0 1 1-4-6" />
            <polyline points="21.5 4.5 21.5 10.5 15.5 10.5" />
          </svg>
        </button>
        <button
          className="toolbar-btn"
          onClick={duplicateSelected}
          disabled={!hasSelection}
          title="Duplicate (Ctrl+D)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button
          className="toolbar-btn danger"
          onClick={removeSelectedAssets}
          disabled={!hasSelection}
          title="Delete (Delete)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Grid settings */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${snapToGrid ? 'active' : ''}`}
          onClick={toggleSnapToGrid}
          title="Snap to Grid (G)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
          </svg>
        </button>
        {snapToGrid && (
          <select
            className="grid-size-select"
            value={gridSize}
            onChange={e => setGridSize(Number(e.target.value))}
            title="Grid Size"
          >
            <option value="1">1m</option>
            <option value="2">2m</option>
            <option value="5">5m</option>
            <option value="10">10m</option>
            <option value="20">20m</option>
          </select>
        )}
      </div>

      <div className="toolbar-divider" />

      {/* Constraint visibility */}
      <div className="toolbar-group">
        <button
          className={`toolbar-btn ${showConstraints ? 'active' : ''}`}
          onClick={toggleShowConstraints}
          title="Show Constraints (C)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            {showConstraints && <polyline points="9 12 11 14 15 10" />}
          </svg>
        </button>
      </div>

      {/* Selection info */}
      {hasSelection && (
        <>
          <div className="toolbar-divider" />
          <div className="selection-info">
            <span>{selectedAssetIds.length} selected</span>
          </div>
        </>
      )}
    </div>
  );
}

export default AssetToolbar;
