import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as controller from '../controllers/entryPoint';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/entry-points - Create entry point
 * Requires: canEditSite permission
 */
router.post('/', requirePermission('canEditSite'), controller.createEntryPoint);

/**
 * GET /api/v1/entry-points/:id - Get single entry point
 */
router.get('/:id', controller.getEntryPoint);

/**
 * GET /api/v1/entry-points/site/:siteId - List by site
 */
router.get('/site/:siteId', controller.listEntryPointsBySite);

/**
 * PATCH /api/v1/entry-points/:id - Update entry point
 * Requires: canEditSite permission
 */
router.patch('/:id', requirePermission('canEditSite'), controller.updateEntryPoint);

/**
 * DELETE /api/v1/entry-points/:id - Delete entry point
 * Requires: canEditSite permission
 */
router.delete('/:id', requirePermission('canEditSite'), controller.deleteEntryPoint);

/**
 * POST /api/v1/entry-points/validate - Validate entry point
 */
router.post('/validate', controller.validateEntryPoint);

/**
 * GET /api/v1/entry-points/geojson/:siteId - Export as GeoJSON
 */
router.get('/geojson/:siteId', controller.exportAsGeoJSON);

export default router;
