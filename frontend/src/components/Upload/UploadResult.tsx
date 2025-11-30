import React from 'react';
import type {
  BoundaryUploadResponse,
  ExclusionsUploadResponse,
  PreviewUploadResponse,
  ValidateUploadResponse,
  PolygonGeometry,
} from '../../types/upload';
import { formatFileSize, formatArea } from '../../types/upload';
import './UploadResult.css';

type UploadResultData =
  | BoundaryUploadResponse
  | ExclusionsUploadResponse
  | PreviewUploadResponse
  | ValidateUploadResponse;

interface UploadResultProps {
  result: UploadResultData;
  type: 'boundary' | 'exclusions' | 'preview' | 'validate';
  onDismiss?: () => void;
  onUseData?: (polygons: PolygonGeometry[]) => void;
}

export function UploadResult({ result, type, onDismiss, onUseData }: UploadResultProps) {
  // Type guard helpers
  const isBoundaryResult = (r: UploadResultData): r is BoundaryUploadResponse => {
    return 'polygons' in r && 'validation' in r && 'success' in r;
  };

  const isExclusionsResult = (r: UploadResultData): r is ExclusionsUploadResponse => {
    return 'results' in r && Array.isArray((r as ExclusionsUploadResponse).results);
  };

  const isPreviewResult = (r: UploadResultData): r is PreviewUploadResponse => {
    return 'preview' in r;
  };

  const isValidateResult = (r: UploadResultData): r is ValidateUploadResponse => {
    return 'validation' in r && 'totalFeatures' in (r as ValidateUploadResponse).validation;
  };

  // Render file info
  const renderFileInfo = (file: { name: string; type: string; size: number }) => (
    <div className="result-file-info">
      <div className="file-info-item">
        <span className="label">File:</span>
        <span className="value">{file.name}</span>
      </div>
      <div className="file-info-item">
        <span className="label">Type:</span>
        <span className="value">{file.type.toUpperCase()}</span>
      </div>
      <div className="file-info-item">
        <span className="label">Size:</span>
        <span className="value">{formatFileSize(file.size)}</span>
      </div>
    </div>
  );

  // Render bounds
  const renderBounds = (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null) => {
    if (!bounds) return null;
    return (
      <div className="result-bounds">
        <h4>Bounds</h4>
        <div className="bounds-grid">
          <div className="bound-item">
            <span className="label">North:</span>
            <span className="value">{bounds.maxLat.toFixed(6)}</span>
          </div>
          <div className="bound-item">
            <span className="label">South:</span>
            <span className="value">{bounds.minLat.toFixed(6)}</span>
          </div>
          <div className="bound-item">
            <span className="label">East:</span>
            <span className="value">{bounds.maxLng.toFixed(6)}</span>
          </div>
          <div className="bound-item">
            <span className="label">West:</span>
            <span className="value">{bounds.minLng.toFixed(6)}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render polygon list
  const renderPolygons = (polygons: PolygonGeometry[]) => (
    <div className="result-polygons">
      <h4>Polygons ({polygons.length})</h4>
      <ul className="polygon-list">
        {polygons.map((polygon, index) => (
          <li key={polygon.id || index} className="polygon-item">
            <span className="polygon-name">{polygon.name}</span>
            <span className="polygon-type">{polygon.type}</span>
            <span className="polygon-area">{formatArea(polygon.areaAcres)}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  // Render validation status
  const renderValidation = (validation: { valid: boolean; errors?: { id?: string; name?: string; errors: string[] }[] }) => (
    <div className={`result-validation ${validation.valid ? 'valid' : 'invalid'}`}>
      <div className="validation-status">
        <span className="status-icon">{validation.valid ? '\u2713' : '\u2717'}</span>
        <span className="status-text">
          {validation.valid ? 'All geometries are valid' : 'Some geometries have issues'}
        </span>
      </div>
      {validation.errors && validation.errors.length > 0 && (
        <ul className="validation-errors">
          {validation.errors.map((err, index) => (
            <li key={index} className="validation-error">
              <strong>{err.name || err.id || `Feature ${index + 1}`}:</strong>
              {' '}{err.errors?.join(', ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // Render boundary result
  const renderBoundaryResult = (data: BoundaryUploadResponse) => (
    <>
      {renderFileInfo(data.file)}
      {renderBounds(data.bounds)}
      <div className="result-metadata">
        <h4>Metadata</h4>
        <div className="metadata-grid">
          {data.metadata.name && (
            <div className="metadata-item">
              <span className="label">Name:</span>
              <span className="value">{data.metadata.name}</span>
            </div>
          )}
          <div className="metadata-item">
            <span className="label">Features:</span>
            <span className="value">{data.metadata.featureCount}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Polygons:</span>
            <span className="value">{data.metadata.polygonCount}</span>
          </div>
          <div className="metadata-item">
            <span className="label">CRS:</span>
            <span className="value">{data.crs}</span>
          </div>
        </div>
      </div>
      {renderPolygons(data.polygons)}
      {renderValidation(data.validation)}
      {data.polygons.length > 0 && onUseData && (
        <div className="result-actions">
          <button
            type="button"
            className="btn-use-data"
            onClick={() => onUseData(data.polygons)}
          >
            Use as Site Boundary
          </button>
        </div>
      )}
    </>
  );

  // Render exclusions result
  const renderExclusionsResult = (data: ExclusionsUploadResponse) => (
    <>
      <div className="result-summary">
        <div className={`summary-status ${data.success ? 'success' : 'partial'}`}>
          {data.success ? 'All files processed successfully' : 'Some files had errors'}
        </div>
        <div className="summary-stats">
          <span>{data.results.length} file(s) processed</span>
          {data.errors && data.errors.length > 0 && (
            <span className="error-count">{data.errors.length} error(s)</span>
          )}
        </div>
      </div>
      {data.results.map((result, index) => (
        <div key={index} className="exclusion-file-result">
          <h4>{result.filename}</h4>
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="label">Type:</span>
              <span className="value">{result.type.toUpperCase()}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Polygons:</span>
              <span className="value">{result.polygonCount}</span>
            </div>
          </div>
          {renderPolygons(result.polygons)}
        </div>
      ))}
      {data.errors && data.errors.length > 0 && (
        <div className="result-errors">
          <h4>Errors</h4>
          <ul className="error-list">
            {data.errors.map((error, index) => (
              <li key={index} className="error-item">
                <strong>{error.filename}:</strong> {error.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  // Render preview result
  const renderPreviewResult = (data: PreviewUploadResponse) => (
    <>
      {renderFileInfo(data.file)}
      {renderBounds(data.bounds)}
      <div className="result-preview">
        <h4>
          Preview ({data.preview.featureCount} of {data.preview.totalFeatures} features)
          {data.preview.truncated && <span className="truncated-badge">Truncated</span>}
        </h4>
        <ul className="preview-features">
          {data.preview.features.map((feature, index) => (
            <li key={index} className="preview-feature">
              <span className="feature-type">{feature.type || 'Unknown'}</span>
              <span className="feature-name">{feature.name || `Feature ${index + 1}`}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  // Render validate result
  const renderValidateResult = (data: ValidateUploadResponse) => (
    <>
      {renderFileInfo(data.file)}
      <div className="result-validation-summary">
        <h4>Validation Summary</h4>
        <div className={`validation-summary ${data.validation.valid ? 'valid' : 'invalid'}`}>
          <div className="summary-icon">
            {data.validation.valid ? '\u2713' : '\u2717'}
          </div>
          <div className="summary-details">
            <span className="summary-status">
              {data.validation.valid ? 'File is valid' : 'File has issues'}
            </span>
            <span className="summary-counts">
              {data.validation.validFeatures} valid / {data.validation.totalFeatures} total features
            </span>
          </div>
        </div>
      </div>
      {data.validation.details.length > 0 && (
        <div className="result-validation-details">
          <h4>Invalid Features ({data.validation.invalidFeatures})</h4>
          <ul className="validation-detail-list">
            {data.validation.details.map((detail, index) => (
              <li key={index} className="validation-detail-item">
                <span className="detail-index">#{detail.index + 1}</span>
                <span className="detail-name">{detail.name || 'Unnamed'}</span>
                <span className="detail-type">{detail.type || 'Unknown'}</span>
                {detail.errors && (
                  <ul className="detail-errors">
                    {detail.errors.map((err, errIdx) => (
                      <li key={errIdx}>{err}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="result-metadata">
        <h4>File Info</h4>
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="label">Has Polygons:</span>
            <span className="value">{data.metadata.hasPolygons ? 'Yes' : 'No'}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Polygon Count:</span>
            <span className="value">{data.metadata.polygonCount}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Line Count:</span>
            <span className="value">{data.metadata.lineCount}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Point Count:</span>
            <span className="value">{data.metadata.pointCount}</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="upload-result">
      <div className="result-header">
        <h3>
          {type === 'boundary' && 'Boundary Upload Result'}
          {type === 'exclusions' && 'Exclusion Zones Result'}
          {type === 'preview' && 'File Preview'}
          {type === 'validate' && 'Validation Result'}
        </h3>
        {onDismiss && (
          <button type="button" className="btn-dismiss" onClick={onDismiss}>
            &times;
          </button>
        )}
      </div>

      <div className="result-content">
        {type === 'boundary' && isBoundaryResult(result) && renderBoundaryResult(result)}
        {type === 'exclusions' && isExclusionsResult(result) && renderExclusionsResult(result)}
        {type === 'preview' && isPreviewResult(result) && renderPreviewResult(result)}
        {type === 'validate' && isValidateResult(result) && renderValidateResult(result)}
      </div>
    </div>
  );
}

export default UploadResult;
