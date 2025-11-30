import React from 'react';
import { AssetType, ASSET_DEFINITIONS, type AssetDefinition } from '../../types/asset';
import './AssetPalette.css';

interface AssetPaletteProps {
  onDragStart: (assetType: AssetType) => void;
  onDragEnd: () => void;
  disabled?: boolean;
  className?: string;
}

interface AssetItemProps {
  definition: AssetDefinition;
  onDragStart: (assetType: AssetType) => void;
  onDragEnd: () => void;
  disabled?: boolean;
}

function AssetItem({ definition, onDragStart, onDragEnd, disabled }: AssetItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('assetType', definition.type);
    e.dataTransfer.effectAllowed = 'copy';

    // Create custom drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'asset-drag-image';
    dragImage.style.backgroundColor = definition.color;
    dragImage.innerHTML = `<span>${definition.icon}</span>`;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 25, 25);

    // Clean up drag image after drag starts
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);

    onDragStart(definition.type);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  return (
    <div
      className={`asset-item ${disabled ? 'disabled' : ''}`}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={`${definition.name}\nSize: ${definition.dimensions.width}m × ${definition.dimensions.length}m\nMax slope: ${definition.maxSlope}°`}
    >
      <div className="asset-icon" style={{ backgroundColor: definition.color }}>
        <span>{definition.icon}</span>
      </div>
      <div className="asset-info">
        <span className="asset-name">{definition.name}</span>
        <span className="asset-size">
          {definition.dimensions.width}m × {definition.dimensions.length}m
        </span>
      </div>
    </div>
  );
}

export function AssetPalette({
  onDragStart,
  onDragEnd,
  disabled = false,
  className = '',
}: AssetPaletteProps) {
  return (
    <div className={`asset-palette ${className}`}>
      <div className="palette-header">
        <h3>Assets</h3>
        <span className="palette-hint">Drag to place</span>
      </div>

      <div className="palette-content">
        {/* Primary assets */}
        <div className="asset-group">
          <div className="group-label">Infrastructure</div>
          <div className="asset-grid">
            {[AssetType.SUBSTATION, AssetType.BESS, AssetType.O_AND_M].map((type) => (
              <AssetItem
                key={type}
                definition={ASSET_DEFINITIONS[type]}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        {/* Secondary assets */}
        <div className="asset-group">
          <div className="group-label">Site Facilities</div>
          <div className="asset-grid">
            {[AssetType.PARKING, AssetType.LAYDOWN].map((type) => (
              <AssetItem
                key={type}
                definition={ASSET_DEFINITIONS[type]}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                disabled={disabled}
              />
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="asset-group">
          <div className="group-label">Equipment</div>
          <div className="asset-grid">
            {[AssetType.INVERTER_PAD, AssetType.TRANSFORMER_PAD, AssetType.WEATHER_STATION].map(
              (type) => (
                <AssetItem
                  key={type}
                  definition={ASSET_DEFINITIONS[type]}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  disabled={disabled}
                />
              )
            )}
          </div>
        </div>
      </div>

      <div className="palette-footer">
        <div className="palette-tip">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>Drag assets onto the map to place them</span>
        </div>
      </div>
    </div>
  );
}

export default AssetPalette;
