import { Router } from 'express';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload';
import { authenticate, requirePermission } from '../middleware/auth';
import { uploadBoundary, uploadExclusions, previewFile, validateFile } from '../controllers/upload';

const router = Router();

/**
 * @route   POST /api/v1/upload/boundary
 * @desc    Upload and parse a site boundary file (KML/KMZ/GeoJSON)
 * @access  Private - requires canCreateSite permission
 */
router.post(
  '/boundary',
  authenticate,
  requirePermission('canCreateSite'),
  uploadSingle,
  handleUploadError,
  uploadBoundary
);

/**
 * @route   POST /api/v1/upload/exclusions
 * @desc    Upload and parse exclusion zone files
 * @access  Private - requires canEditSite permission
 */
router.post(
  '/exclusions',
  authenticate,
  requirePermission('canEditSite'),
  uploadMultiple,
  handleUploadError,
  uploadExclusions
);

/**
 * @route   POST /api/v1/upload/preview
 * @desc    Preview file contents without persisting
 * @access  Private - any authenticated user
 */
router.post('/preview', authenticate, uploadSingle, handleUploadError, previewFile);

/**
 * @route   POST /api/v1/upload/validate
 * @desc    Validate a file without processing
 * @access  Private - any authenticated user
 */
router.post('/validate', authenticate, uploadSingle, handleUploadError, validateFile);

export default router;
