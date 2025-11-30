/**
 * Constraint Routes
 *
 * API endpoints for constraint validation and management.
 */

import { Router } from 'express';
import {
  getConstraintTypes,
  getAssetTypes,
  getDefaultConstraints,
  getProjectConstraints,
  getConstraintSetById,
  validateAsset,
  validateAssets,
  getValidPlacementAreas,
  getSeverityLevels,
} from '../controllers/constraint';
import { authenticate } from '../middleware/auth';

const router = Router();

// Reference data endpoints
router.get('/types', authenticate, getConstraintTypes);
router.get('/asset-types', authenticate, getAssetTypes);
router.get('/severity-levels', authenticate, getSeverityLevels);
router.get('/defaults/:assetType', authenticate, getDefaultConstraints);

// Project constraint sets
router.get('/project/:projectId', authenticate, getProjectConstraints);
router.get('/set/:constraintSetId', authenticate, getConstraintSetById);

// Validation endpoints
router.post('/project/:projectId/validate', authenticate, validateAsset);
router.post('/project/:projectId/validate-batch', authenticate, validateAssets);
router.post('/project/:projectId/valid-areas', authenticate, getValidPlacementAreas);

export default router;
