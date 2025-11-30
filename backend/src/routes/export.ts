/**
 * Export Routes
 *
 * API routes for layout export functionality.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getExportFormats,
  getExportLayers,
  exportLayoutHandler,
  exportGeoJSON,
  exportKML,
  exportKMZHandler,
  previewExport,
} from '../controllers/export';

const router = Router();

/**
 * GET /api/export/formats
 * Get available export formats
 */
router.get('/formats', getExportFormats);

/**
 * GET /api/export/layers
 * Get available export layers
 */
router.get('/layers', getExportLayers);

/**
 * POST /api/export/project/:projectId
 * Export layout to specified format
 * Body: { format, layers[], layoutData, includeStyles, coordinatePrecision, includeMetadata, filename }
 */
router.post('/project/:projectId', authenticate, exportLayoutHandler);

/**
 * POST /api/export/geojson
 * Export layout to GeoJSON format
 * Body: { layoutData }
 */
router.post('/geojson', authenticate, exportGeoJSON);

/**
 * POST /api/export/kml
 * Export layout to KML format
 * Body: { layoutData }
 */
router.post('/kml', authenticate, exportKML);

/**
 * POST /api/export/kmz
 * Export layout to KMZ format
 * Body: { layoutData }
 */
router.post('/kmz', authenticate, exportKMZHandler);

/**
 * POST /api/export/preview
 * Preview export metadata without generating file
 * Body: { layoutData }
 * Query: ?format=geojson|kml|kmz
 */
router.post('/preview', authenticate, previewExport);

export default router;
