import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import type {
  ExclusionZone,
  ZoneTypeOption,
  CreateExclusionZoneInput,
  UpdateExclusionZoneInput,
  ExclusionZoneType,
} from '../../types/exclusionZone';
import { getZoneColor } from '../../types/exclusionZone';
import type { Polygon, MultiPolygon } from 'geojson';
import './ZoneForm.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

interface ZoneFormProps {
  siteId: string;
  zone?: ExclusionZone; // If provided, editing existing zone
  geometry?: Polygon | MultiPolygon; // Geometry from map drawing
  onSave: (zone: ExclusionZone) => void;
  onCancel: () => void;
  className?: string;
}

export function ZoneForm({
  siteId,
  zone,
  geometry,
  onSave,
  onCancel,
  className = '',
}: ZoneFormProps) {
  const { accessToken } = useAuth();
  const [zoneTypes, setZoneTypes] = useState<ZoneTypeOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(zone?.name || '');
  const [type, setType] = useState<ExclusionZoneType>(
    zone?.type || ('wetland' as ExclusionZoneType)
  );
  const [description, setDescription] = useState(zone?.description || '');
  const [bufferDistance, setBufferDistance] = useState<number>(zone?.bufferDistance || 0);

  const isEditing = !!zone;

  // Fetch zone types
  useEffect(() => {
    const fetchTypes = async () => {
      if (!accessToken) return;

      try {
        const response = await fetch(`${API_URL}/api/v1/exclusion-zones/types`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setZoneTypes(data.types);

          // Set default buffer for selected type
          if (!zone) {
            const selectedType = data.types.find((t: ZoneTypeOption) => t.value === type);
            if (selectedType) {
              setBufferDistance(selectedType.defaultBuffer);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch zone types:', err);
      }
    };

    fetchTypes();
  }, [accessToken, type, zone]);

  // Update buffer when type changes
  const handleTypeChange = useCallback(
    (newType: ExclusionZoneType) => {
      setType(newType);

      // Update buffer to default for this type if not editing
      if (!isEditing) {
        const typeOption = zoneTypes.find((t) => t.value === newType);
        if (typeOption) {
          setBufferDistance(typeOption.defaultBuffer);
        }
      }
    },
    [isEditing, zoneTypes]
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken) return;

    // Validate
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!isEditing && !geometry) {
      setError('Please draw a zone on the map first');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let response: Response;

      if (isEditing) {
        // Update existing zone
        const updateData: UpdateExclusionZoneInput = {
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          bufferDistance,
        };

        if (geometry) {
          updateData.geometry = geometry;
        }

        response = await fetch(`${API_URL}/api/v1/exclusion-zones/${zone.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updateData),
        });
      } else {
        // Create new zone
        const createData: CreateExclusionZoneInput = {
          siteId,
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          geometry: geometry!,
          bufferDistance,
        };

        response = await fetch(`${API_URL}/api/v1/exclusion-zones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(createData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save zone');
      }

      const data = await response.json();
      onSave(data.zone);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save zone');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeColor = getZoneColor(type);

  return (
    <form className={`zone-form ${className}`} onSubmit={handleSubmit}>
      <div className="form-header">
        <h3>{isEditing ? 'Edit Exclusion Zone' : 'Create Exclusion Zone'}</h3>
      </div>

      {error && (
        <div className="form-error">
          <span className="error-icon">!</span>
          {error}
        </div>
      )}

      <div className="form-body">
        {/* Name */}
        <div className="form-group">
          <label htmlFor="zone-name">Name *</label>
          <input
            id="zone-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter zone name"
            required
          />
        </div>

        {/* Type */}
        <div className="form-group">
          <label htmlFor="zone-type">Type *</label>
          <div className="type-select-wrapper">
            <div className="type-color-indicator" style={{ backgroundColor: selectedTypeColor }} />
            <select
              id="zone-type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as ExclusionZoneType)}
              required
            >
              {zoneTypes.map((typeOption) => (
                <option key={typeOption.value} value={typeOption.value}>
                  {typeOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buffer Distance */}
        <div className="form-group">
          <label htmlFor="zone-buffer">Buffer Distance (meters)</label>
          <input
            id="zone-buffer"
            type="number"
            min="0"
            max="1000"
            step="1"
            value={bufferDistance}
            onChange={(e) => setBufferDistance(parseInt(e.target.value) || 0)}
          />
          <span className="form-hint">Additional buffer around the zone boundary</span>
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="zone-description">Description</label>
          <textarea
            id="zone-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
          />
        </div>

        {/* Geometry status */}
        {!isEditing && (
          <div className={`geometry-status ${geometry ? 'has-geometry' : ''}`}>
            {geometry ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Zone boundary drawn</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                <span>Draw zone boundary on map</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn-submit"
          disabled={isSubmitting || (!isEditing && !geometry)}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Zone' : 'Create Zone'}
        </button>
      </div>
    </form>
  );
}

export default ZoneForm;
