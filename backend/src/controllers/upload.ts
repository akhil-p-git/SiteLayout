import { Response } from 'express';
import { parseFile, extractPolygons, validateGeometry, geometryToWkt } from '../services/fileParser';
import { cleanupFile, getFileInfo } from '../middleware/upload';
import { logFromRequest, AuditActions } from '../services/audit';
import type { AuthenticatedRequest } from '../types/auth';

/**
 * Upload and parse a boundary file (KML/KMZ/GeoJSON)
 * POST /api/v1/upload/boundary
 */
export async function uploadBoundary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const file = req.file;

  if (!file) {
    res.status(400).json({
      error: 'No file uploaded',
      message: 'Please upload a KML, KMZ, or GeoJSON file',
    });
    return;
  }

  try {
    const fileInfo = getFileInfo(file);

    // Parse the uploaded file
    const parsedFile = await parseFile(file.path);

    // Extract polygon geometries
    const polygons = extractPolygons(parsedFile);

    if (polygons.length === 0) {
      await cleanupFile(file.path);
      res.status(400).json({
        error: 'No polygons found',
        message: 'The uploaded file does not contain any polygon geometries',
      });
      return;
    }

    // Validate geometries
    const validationResults = polygons.map(p => ({
      id: p.id,
      name: p.name,
      ...validateGeometry(p.geometry),
    }));

    const invalidGeometries = validationResults.filter(v => !v.valid);

    // Log the upload
    await logFromRequest(req, AuditActions.DATA_IMPORT, 'boundary', undefined, {
      filename: fileInfo.originalName,
      fileType: parsedFile.type,
      featureCount: parsedFile.metadata.featureCount,
      polygonCount: polygons.length,
    });

    // Convert to WKT for potential PostGIS storage
    const polygonsWithWkt = polygons.map(p => ({
      ...p,
      wkt: geometryToWkt(p.geometry),
      areaAcres: p.area ? p.area / 4046.86 : undefined, // Convert sq meters to acres
      areaHectares: p.area ? p.area / 10000 : undefined, // Convert sq meters to hectares
    }));

    res.json({
      success: true,
      file: {
        name: fileInfo.originalName,
        type: parsedFile.type,
        size: fileInfo.size,
      },
      metadata: parsedFile.metadata,
      bounds: parsedFile.bounds,
      crs: parsedFile.crs,
      polygons: polygonsWithWkt,
      validation: {
        valid: invalidGeometries.length === 0,
        errors: invalidGeometries,
      },
    });

    // Cleanup file after processing (or keep for reference based on config)
    if (process.env.CLEANUP_UPLOADS !== 'false') {
      await cleanupFile(file.path);
    }
  } catch (error) {
    await cleanupFile(file.path);

    console.error('File parsing error:', error);
    res.status(400).json({
      error: 'Parsing failed',
      message: error instanceof Error ? error.message : 'Failed to parse the uploaded file',
    });
  }
}

/**
 * Upload and parse exclusion zone files
 * POST /api/v1/upload/exclusions
 */
export async function uploadExclusions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[] | undefined;

  if (!files || files.length === 0) {
    res.status(400).json({
      error: 'No files uploaded',
      message: 'Please upload one or more KML, KMZ, or GeoJSON files',
    });
    return;
  }

  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      const fileInfo = getFileInfo(file);
      const parsedFile = await parseFile(file.path);
      const polygons = extractPolygons(parsedFile);

      results.push({
        filename: fileInfo.originalName,
        type: parsedFile.type,
        polygonCount: polygons.length,
        polygons: polygons.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          geometry: p.geometry,
          wkt: geometryToWkt(p.geometry),
          area: p.area,
          areaAcres: p.area ? p.area / 4046.86 : undefined,
          properties: p.properties,
        })),
      });

      if (process.env.CLEANUP_UPLOADS !== 'false') {
        await cleanupFile(file.path);
      }
    } catch (error) {
      errors.push({
        filename: file.originalname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      await cleanupFile(file.path);
    }
  }

  // Log the upload
  await logFromRequest(req, AuditActions.DATA_IMPORT, 'exclusion_zones', undefined, {
    filesUploaded: files.length,
    filesSuccessful: results.length,
    filesFailed: errors.length,
  });

  res.json({
    success: errors.length === 0,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * Preview file contents without persisting
 * POST /api/v1/upload/preview
 */
export async function previewFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const file = req.file;

  if (!file) {
    res.status(400).json({
      error: 'No file uploaded',
      message: 'Please upload a file to preview',
    });
    return;
  }

  try {
    const fileInfo = getFileInfo(file);
    const parsedFile = await parseFile(file.path);

    // Limit features for preview (first 100)
    const previewFeatures = parsedFile.features.slice(0, 100);

    res.json({
      file: {
        name: fileInfo.originalName,
        type: parsedFile.type,
        size: fileInfo.size,
      },
      metadata: parsedFile.metadata,
      bounds: parsedFile.bounds,
      crs: parsedFile.crs,
      preview: {
        featureCount: previewFeatures.length,
        totalFeatures: parsedFile.features.length,
        truncated: parsedFile.features.length > 100,
        features: previewFeatures.map(f => ({
          type: f.geometry?.type,
          name: f.properties?.name,
          properties: f.properties,
        })),
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(400).json({
      error: 'Preview failed',
      message: error instanceof Error ? error.message : 'Failed to preview the file',
    });
  } finally {
    await cleanupFile(file.path);
  }
}

/**
 * Validate a file without processing
 * POST /api/v1/upload/validate
 */
export async function validateFile(req: AuthenticatedRequest, res: Response): Promise<void> {
  const file = req.file;

  if (!file) {
    res.status(400).json({
      error: 'No file uploaded',
      message: 'Please upload a file to validate',
    });
    return;
  }

  try {
    const fileInfo = getFileInfo(file);
    const parsedFile = await parseFile(file.path);
    const polygons = extractPolygons(parsedFile);

    // Validate all geometries
    const validationResults = parsedFile.features.map((f, idx) => {
      if (!f.geometry) {
        return {
          index: idx,
          name: f.properties?.name as string | undefined,
          valid: false,
          errors: ['No geometry found'],
        };
      }
      return {
        index: idx,
        name: f.properties?.name as string | undefined,
        type: f.geometry.type,
        ...validateGeometry(f.geometry),
      };
    });

    const invalidCount = validationResults.filter(v => !v.valid).length;

    res.json({
      file: {
        name: fileInfo.originalName,
        type: parsedFile.type,
        size: fileInfo.size,
      },
      validation: {
        valid: invalidCount === 0,
        totalFeatures: parsedFile.features.length,
        validFeatures: parsedFile.features.length - invalidCount,
        invalidFeatures: invalidCount,
        details: validationResults.filter(v => !v.valid),
      },
      metadata: {
        ...parsedFile.metadata,
        hasPolygons: polygons.length > 0,
        polygonCount: polygons.length,
      },
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(400).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Failed to validate the file',
    });
  } finally {
    await cleanupFile(file.path);
  }
}
