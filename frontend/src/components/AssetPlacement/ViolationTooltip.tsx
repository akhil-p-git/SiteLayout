import React from 'react';
import type { PlacedAsset, ConstraintViolation } from '../../types/asset';
import { ASSET_DEFINITIONS } from '../../types/asset';
import './ViolationTooltip.css';

interface ViolationTooltipProps {
  asset: PlacedAsset;
  position: { x: number; y: number };
  onClose: () => void;
}

export function ViolationTooltip({ asset, position, onClose }: ViolationTooltipProps) {
  const definition = ASSET_DEFINITIONS[asset.type];
  const hasErrors = asset.violations.some(v => v.type === 'error');
  const hasWarnings = asset.violations.some(v => v.type === 'warning');

  if (asset.violations.length === 0) return null;

  return (
    <div
      className={`violation-tooltip ${hasErrors ? 'has-errors' : ''} ${hasWarnings && !hasErrors ? 'has-warnings' : ''}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-icon" style={{ backgroundColor: definition.color }}>
          {definition.icon}
        </span>
        <span className="tooltip-title">{asset.name}</span>
        <button className="tooltip-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="tooltip-violations">
        {asset.violations.map((violation, index) => (
          <ViolationItem key={index} violation={violation} />
        ))}
      </div>

      <div className="tooltip-footer">
        <span className="violation-count">
          {asset.violations.length} issue{asset.violations.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

interface ViolationItemProps {
  violation: ConstraintViolation;
}

function ViolationItem({ violation }: ViolationItemProps) {
  const getIcon = () => {
    switch (violation.type) {
      case 'error':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div className={`violation-item ${violation.type}`}>
      <span className="violation-icon">{getIcon()}</span>
      <div className="violation-content">
        <span className="violation-message">{violation.message}</span>
        <span className="violation-type">{violation.constraintType}</span>
      </div>
    </div>
  );
}

export default ViolationTooltip;
