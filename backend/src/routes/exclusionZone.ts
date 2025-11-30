import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getZoneTypes,
  createZone,
  getZone,
  getZonesBySite,
  updateZone,
  deleteZone,
  validateZone,
  getZoneSummary,
  importZones,
  getBuildableArea,
  applyBuffer,
} from '../controllers/exclusionZone';

const router = Router();

/**
 * @route   GET /api/v1/exclusion-zones/types
 * @desc    Get available zone types with colors and default buffers
 * @access  Private - any authenticated user
 */
router.get('/types', authenticate, getZoneTypes);

/**
 * @route   POST /api/v1/exclusion-zones
 * @desc    Create a new exclusion zone
 * @access  Private - requires canEditSite permission
 */
router.post('/', authenticate, requirePermission('canEditSite'), createZone);

/**
 * @route   GET /api/v1/exclusion-zones/:id
 * @desc    Get an exclusion zone by ID
 * @access  Private - any authenticated user
 */
router.get('/:id', authenticate, getZone);

/**
 * @route   PATCH /api/v1/exclusion-zones/:id
 * @desc    Update an exclusion zone
 * @access  Private - requires canEditSite permission
 */
router.patch('/:id', authenticate, requirePermission('canEditSite'), updateZone);

/**
 * @route   DELETE /api/v1/exclusion-zones/:id
 * @desc    Delete an exclusion zone
 * @access  Private - requires canEditSite permission
 */
router.delete('/:id', authenticate, requirePermission('canEditSite'), deleteZone);

/**
 * @route   GET /api/v1/exclusion-zones/site/:siteId
 * @desc    Get all exclusion zones for a site
 * @access  Private - any authenticated user
 * @query   includeInactive - include inactive zones (default: false)
 * @query   format - response format: 'json' or 'geojson' (default: 'json')
 * @query   includeBuffered - include buffered geometries in GeoJSON (default: false)
 */
router.get('/site/:siteId', authenticate, getZonesBySite);

/**
 * @route   GET /api/v1/exclusion-zones/site/:siteId/summary
 * @desc    Get exclusion zone summary for a site
 * @access  Private - any authenticated user
 * @query   boundaryArea - site boundary area in sq meters for percentage calculation
 */
router.get('/site/:siteId/summary', authenticate, getZoneSummary);

/**
 * @route   POST /api/v1/exclusion-zones/site/:siteId/buildable-area
 * @desc    Calculate buildable area after excluding zones
 * @access  Private - any authenticated user
 * @body    boundaryGeometry - site boundary polygon
 */
router.post('/site/:siteId/buildable-area', authenticate, getBuildableArea);

/**
 * @route   POST /api/v1/exclusion-zones/validate
 * @desc    Validate a zone geometry against site boundary
 * @access  Private - any authenticated user
 * @body    siteId, geometry, boundaryGeometry (optional), excludeZoneId (optional)
 */
router.post('/validate', authenticate, validateZone);

/**
 * @route   POST /api/v1/exclusion-zones/import
 * @desc    Import exclusion zones from GeoJSON features
 * @access  Private - requires canEditSite permission
 * @body    siteId, features (GeoJSON Feature array), defaultType (optional)
 */
router.post('/import', authenticate, requirePermission('canEditSite'), importZones);

/**
 * @route   POST /api/v1/exclusion-zones/buffer
 * @desc    Apply buffer to a geometry (utility endpoint)
 * @access  Private - any authenticated user
 * @body    geometry, distance (in meters)
 */
router.post('/buffer', authenticate, applyBuffer);

export default router;
