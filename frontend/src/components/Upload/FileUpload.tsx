import React, { useCallback, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import type {
  UploadType,
  UploadState,
  UploadProgress,
  BoundaryUploadResponse,
  ExclusionsUploadResponse,
  PreviewUploadResponse,
  ValidateUploadResponse,
} from '../../types/upload';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  isValidFileExtension,
  formatFileSize,
} from '../../types/upload';
import './FileUpload.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface FileUploadProps {
  type: UploadType;
  onSuccess?: (
    result:
      | BoundaryUploadResponse
      | ExclusionsUploadResponse
      | PreviewUploadResponse
      | ValidateUploadResponse
  ) => void;
  onError?: (error: string) => void;
  multiple?: boolean;
  className?: string;
}

export function FileUpload({
  type,
  onSuccess,
  onError,
  multiple = false,
  className = '',
}: FileUploadProps) {
  const { accessToken, hasPermission } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null,
    result: null,
  });

  // Check permissions based on upload type
  const canUpload = useCallback(() => {
    switch (type) {
      case 'boundary':
        return hasPermission('canCreateSite');
      case 'exclusions':
        return hasPermission('canEditSite');
      case 'preview':
      case 'validate':
        return true; // Any authenticated user
      default:
        return false;
    }
  }, [type, hasPermission]);

  // Validate files before upload
  const validateFiles = useCallback(
    (files: File[]): string | null => {
      if (files.length === 0) {
        return 'No files selected';
      }

      for (const file of files) {
        if (!isValidFileExtension(file.name)) {
          return `Invalid file type: ${file.name}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
        }

        if (file.size > MAX_FILE_SIZE) {
          return `File too large: ${file.name} (${formatFileSize(file.size)}). Maximum: ${formatFileSize(MAX_FILE_SIZE)}`;
        }
      }

      if (!multiple && files.length > 1) {
        return 'Only one file allowed';
      }

      if (type === 'exclusions' && files.length > 10) {
        return 'Maximum 10 files allowed';
      }

      return null;
    },
    [multiple, type]
  );

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const error = validateFiles(fileArray);

      if (error) {
        setUploadState((prev) => ({ ...prev, error }));
        onError?.(error);
        return;
      }

      setSelectedFiles(fileArray);
      setUploadState((prev) => ({ ...prev, error: null }));
    },
    [validateFiles, onError]
  );

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
    },
    [handleFileSelect]
  );

  // Upload files
  const uploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    if (!accessToken) {
      const error = 'Not authenticated';
      setUploadState((prev) => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    if (!canUpload()) {
      const error = 'You do not have permission to perform this upload';
      setUploadState((prev) => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    setUploadState({
      isUploading: true,
      progress: { loaded: 0, total: 100, percentage: 0 },
      error: null,
      result: null,
    });

    try {
      const formData = new FormData();

      if (multiple || type === 'exclusions') {
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
      } else {
        formData.append('file', selectedFiles[0]);
      }

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress: UploadProgress = {
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          };
          setUploadState((prev) => ({ ...prev, progress }));
        }
      });

      // Create promise to handle response
      const response = await new Promise<Response>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          resolve(
            new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
            })
          );
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('POST', `${API_URL}/api/v1/upload/${type}`);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.send(formData);
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.message || errorData.error || 'Upload failed');
      }

      const result = await response.json();

      setUploadState({
        isUploading: false,
        progress: null,
        error: null,
        result,
      });

      onSuccess?.(result);
      setSelectedFiles([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setUploadState({
        isUploading: false,
        progress: null,
        error: message,
        result: null,
      });
      onError?.(message);
    }
  }, [selectedFiles, accessToken, canUpload, multiple, type, onSuccess, onError]);

  // Remove file from selection
  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setUploadState({
      isUploading: false,
      progress: null,
      error: null,
      result: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Get title based on type
  const getTitle = () => {
    switch (type) {
      case 'boundary':
        return 'Upload Site Boundary';
      case 'exclusions':
        return 'Upload Exclusion Zones';
      case 'preview':
        return 'Preview File';
      case 'validate':
        return 'Validate File';
      default:
        return 'Upload File';
    }
  };

  // Get description based on type
  const getDescription = () => {
    switch (type) {
      case 'boundary':
        return 'Upload a KML, KMZ, or GeoJSON file containing your site boundary polygon.';
      case 'exclusions':
        return 'Upload one or more files containing exclusion zone polygons (e.g., wetlands, setbacks).';
      case 'preview':
        return 'Preview file contents before importing.';
      case 'validate':
        return 'Validate file structure and geometry.';
      default:
        return 'Upload a geospatial file.';
    }
  };

  return (
    <div className={`file-upload ${className}`}>
      <div className="file-upload-header">
        <h3>{getTitle()}</h3>
        <p>{getDescription()}</p>
      </div>

      {/* Drop zone */}
      <div
        className={`file-upload-dropzone ${dragActive ? 'active' : ''} ${uploadState.isUploading ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploadState.isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          multiple={multiple || type === 'exclusions'}
          onChange={handleInputChange}
          disabled={uploadState.isUploading}
        />
        <div className="dropzone-content">
          <div className="dropzone-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="dropzone-text">
            {dragActive ? 'Drop files here' : 'Drag & drop files here or click to browse'}
          </p>
          <p className="dropzone-hint">
            Accepted: {ALLOWED_EXTENSIONS.join(', ')} (max {formatFileSize(MAX_FILE_SIZE)})
          </p>
        </div>
      </div>

      {/* Selected files */}
      {selectedFiles.length > 0 && (
        <div className="file-upload-selected">
          <div className="selected-header">
            <span>
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
            <button type="button" onClick={clearAll} className="btn-clear">
              Clear all
            </button>
          </div>
          <ul className="selected-files">
            {selectedFiles.map((file, index) => (
              <li key={`${file.name}-${index}`} className="selected-file">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="btn-remove"
                  disabled={uploadState.isUploading}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Progress */}
      {uploadState.isUploading && uploadState.progress && (
        <div className="file-upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadState.progress.percentage}%` }}
            />
          </div>
          <span className="progress-text">Uploading... {uploadState.progress.percentage}%</span>
        </div>
      )}

      {/* Error */}
      {uploadState.error && (
        <div className="file-upload-error">
          <span className="error-icon">!</span>
          <span className="error-message">{uploadState.error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="file-upload-actions">
        <button
          type="button"
          onClick={uploadFiles}
          disabled={selectedFiles.length === 0 || uploadState.isUploading}
          className="btn-upload"
        >
          {uploadState.isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

export default FileUpload;
