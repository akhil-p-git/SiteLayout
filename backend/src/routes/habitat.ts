import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getOverlay,
  getImpact,
  getSpecies,
  getWetlands,
  getLayerConfig,
} from '../controllers/habitat';

const router = Router();

/**
 * @route   GET /api/v1/habitat/config
 * @desc    Get habitat layer configuration (colors, layer options)
 * @access  Private - any authenticated user
 */
router.get('/config', authenticate, getLayerConfig);

/**
 * @route   POST /api/v1/habitat/site/:siteId
 * @desc    Get full habitat overlay data for a site boundary
 * @access  Private - any authenticated user
 * @body    boundaryGeometry - site boundary polygon
 * @query   format - 'json' or 'geojson' (default: 'json')
 * @query   includeBuffers - include buffer zones (default: 'true')
 */
router.post('/site/:siteId', authenticate, getOverlay);

/**
 * @route   POST /api/v1/habitat/impact
 * @desc    Calculate habitat impact score for a boundary
 * @access  Private - any authenticated user
 * @body    boundaryGeometry - site boundary polygon
 */
router.post('/impact', authenticate, getImpact);

/**
 * @route   POST /api/v1/habitat/species
 * @desc    Get endangered/threatened species in an area
 * @access  Private - any authenticated user
 * @body    boundaryGeometry - site boundary polygon
 */
router.post('/species', authenticate, getSpecies);

/**
 * @route   POST /api/v1/habitat/wetlands
 * @desc    Get wetlands (NWI) in an area
 * @access  Private - any authenticated user
 * @body    boundaryGeometry - site boundary polygon
 */
router.post('/wetlands', authenticate, getWetlands);

export default router;
