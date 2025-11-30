/**
 * Export Controller
 *
 * Handles HTTP requests for layout export functionality.
 */

import type { Request, Response } from 'express';
import {
  exportLayout,
  exportToGeoJSON,
  exportToKML,
  exportToKMZ,
  validateExportData,
  getDefaultExportOptions,
} from '../services/export';
import {
  ExportFormat,
  ExportLayerType,
  type LayoutExportData,
  type ExportOptions,
} from '../types/export';

/**
 * Get available export formats
 */
export async function getExportFormats(req: Request, res: Response) {
  const formats = [
    {
      value: ExportFormat.GEOJSON,
      label: 'GeoJSON',
      description: 'Open standard format for geographic features with properties',
      extension: '.geojson',
      mimeType: 'application/geo+json',
    },
    {
      value: ExportFormat.KML,
      label: 'KML',
      description: 'Keyhole Markup Language for Google Earth',
      extension: '.kml',
      mimeType: 'application/vnd.google-earth.kml+xml',
    },
    {
      value: ExportFormat.KMZ,
      label: 'KMZ',
      description: 'Compressed KML for Google Earth (recommended)',
      extension: '.kmz',
      mimeType: 'application/vnd.google-earth.kmz',
    },
  ];

  res.json({ formats });
}

/**
 * Get available export layers
 */
export async function getExportLayers(req: Request, res: Response) {
  const layers = [
    {
      value: ExportLayerType.BOUNDARY,
      label: 'Site Boundary',
      description: 'The project site boundary polygon',
      default: true,
    },
    {
      value: ExportLayerType.ASSETS,
      label: 'Assets',
      description: 'Placed assets (BESS, substation, O&M, etc.)',
      default: true,
    },
    {
      value: ExportLayerType.ROADS,
      label: 'Roads',
      description: 'Access road network',
      default: true,
    },
    {
      value: ExportLayerType.EXCLUSION_ZONES,
      label: 'Exclusion Zones',
      description: 'Areas excluded from development',
      default: true,
    },
    {
      value: ExportLayerType.CONTOURS,
      label: 'Contours',
      description: 'Elevation contour lines',
      default: false,
    },
    {
      value: ExportLayerType.SLOPE_AREAS,
      label: 'Slope Areas',
      description: 'Slope classification areas',
      default: false,
    },
  ];

  res.json({ layers });
}

/**
 * Export layout to specified format
 */
export async function exportLayoutHandler(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const {
      format = ExportFormat.GEOJSON,
      layers,
      includeStyles = true,
      coordinatePrecision = 6,
      includeMetadata = true,
      filename,
    } = req.body;

    // Get layout data from request body (or could fetch from database)
    const layoutData: LayoutExportData = req.body.layoutData;

    if (!layoutData) {
      return res.status(400).json({
        error: 'Layout data is required',
        message: 'Please provide layoutData in the request body',
      });
    }

    // Validate export data
    const validationErrors = validateExportData(layoutData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Invalid layout data',
        validationErrors,
      });
    }

    // Build export options
    const exportOptions: ExportOptions = {
      format: format as ExportFormat,
      layers: layers ?? [
        ExportLayerType.BOUNDARY,
        ExportLayerType.ASSETS,
        ExportLayerType.ROADS,
        ExportLayerType.EXCLUSION_ZONES,
      ],
      includeStyles,
      coordinatePrecision,
      includeMetadata,
      filename,
    };

    // Perform export
    const result = await exportLayout(layoutData, exportOptions);

    if (!result.success) {
      return res.status(500).json({
        error: 'Export failed',
        message: result.error,
      });
    }

    // Set appropriate headers based on format
    const mimeTypes: Record<ExportFormat, string> = {
      [ExportFormat.GEOJSON]: 'application/geo+json',
      [ExportFormat.KML]: 'application/vnd.google-earth.kml+xml',
      [ExportFormat.KMZ]: 'application/vnd.google-earth.kmz',
    };

    res.setHeader('Content-Type', mimeTypes[result.format]);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.size);

    // Send data
    if (result.data instanceof Buffer) {
      res.send(result.data);
    } else {
      res.send(result.data);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Export to GeoJSON (convenience endpoint)
 */
export async function exportGeoJSON(req: Request, res: Response) {
  try {
    const layoutData: LayoutExportData = req.body.layoutData;

    if (!layoutData) {
      return res.status(400).json({
        error: 'Layout data is required',
      });
    }

    const options = getDefaultExportOptions(ExportFormat.GEOJSON);
    const geojson = exportToGeoJSON(layoutData, options);

    res.setHeader('Content-Type', 'application/geo+json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${layoutData.projectName.replace(/\s+/g, '_')}.geojson"`
    );

    res.json(geojson);
  } catch (error) {
    console.error('GeoJSON export error:', error);
    res.status(500).json({
      error: 'GeoJSON export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Export to KML (convenience endpoint)
 */
export async function exportKML(req: Request, res: Response) {
  try {
    const layoutData: LayoutExportData = req.body.layoutData;

    if (!layoutData) {
      return res.status(400).json({
        error: 'Layout data is required',
      });
    }

    const options = getDefaultExportOptions(ExportFormat.KML);
    const kml = exportToKML(layoutData, options);

    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${layoutData.projectName.replace(/\s+/g, '_')}.kml"`
    );

    res.send(kml);
  } catch (error) {
    console.error('KML export error:', error);
    res.status(500).json({
      error: 'KML export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Export to KMZ (convenience endpoint)
 */
export async function exportKMZHandler(req: Request, res: Response) {
  try {
    const layoutData: LayoutExportData = req.body.layoutData;

    if (!layoutData) {
      return res.status(400).json({
        error: 'Layout data is required',
      });
    }

    const options = getDefaultExportOptions(ExportFormat.KMZ);
    const kmz = await exportToKMZ(layoutData, options);

    res.setHeader('Content-Type', 'application/vnd.google-earth.kmz');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${layoutData.projectName.replace(/\s+/g, '_')}.kmz"`
    );

    res.send(kmz);
  } catch (error) {
    console.error('KMZ export error:', error);
    res.status(500).json({
      error: 'KMZ export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Preview export (returns metadata without file)
 */
export async function previewExport(req: Request, res: Response) {
  try {
    const layoutData: LayoutExportData = req.body.layoutData;
    const format = (req.query.format as ExportFormat) ?? ExportFormat.GEOJSON;

    if (!layoutData) {
      return res.status(400).json({
        error: 'Layout data is required',
      });
    }

    // Validate data
    const validationErrors = validateExportData(layoutData);

    // Calculate statistics
    const stats = {
      projectName: layoutData.projectName,
      format,
      layers: {
        boundary: layoutData.boundary ? 1 : 0,
        assets: layoutData.assets?.length ?? 0,
        roadSegments: layoutData.roads?.segments?.length ?? 0,
        exclusionZones: layoutData.exclusionZones?.length ?? 0,
      },
      totalFeatures:
        (layoutData.boundary ? 1 : 0) +
        (layoutData.assets?.length ?? 0) +
        (layoutData.roads?.segments?.length ?? 0) +
        (layoutData.exclusionZones?.length ?? 0),
      isValid: validationErrors.length === 0,
      validationErrors,
    };

    res.json(stats);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({
      error: 'Preview failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
