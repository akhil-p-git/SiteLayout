import { Request, Response } from 'express';
import * as entryPointService from '../services/entryPoint';
import { logAudit } from '../services/audit';
import { CreateEntryPointInput, UpdateEntryPointInput, EntryPointValidationRequest } from '../types/entryPoint';

/**
 * POST /api/v1/entry-points - Create entry point
 */
export async function createEntryPoint(req: Request, res: Response) {
  try {
    const input: CreateEntryPointInput = req.body;

    // Validate required fields
    if (!input.siteId || !input.name || !input.type || !input.coordinates) {
      return res.status(400).json({
        error: 'Missing required fields: siteId, name, type, coordinates',
      });
    }

    const entryPoint = await entryPointService.createEntryPoint(input);

    // Log audit
    await logAudit({
      userId: (req as any).user?.id,
      action: 'ENTRY_POINT_CREATE',
      entityType: 'EntryPoint',
      entityId: entryPoint.id,
      changes: entryPoint,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json(entryPoint);
  } catch (error: any) {
    console.error('Error creating entry point:', error);
    res.status(400).json({ error: error.message });
  }
}

/**
 * GET /api/v1/entry-points/:id - Get entry point
 */
export async function getEntryPoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const entryPoint = await entryPointService.getEntryPoint(id);

    if (!entryPoint) {
      return res.status(404).json({ error: 'Entry point not found' });
    }

    res.json(entryPoint);
  } catch (error: any) {
    console.error('Error fetching entry point:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/entry-points/site/:siteId - List entry points by site
 */
export async function listEntryPointsBySite(req: Request, res: Response) {
  try {
    const { siteId } = req.params;
    const entryPoints = await entryPointService.listEntryPointsBySite(siteId);

    res.json({
      count: entryPoints.length,
      data: entryPoints,
    });
  } catch (error: any) {
    console.error('Error listing entry points:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/v1/entry-points/:id - Update entry point
 */
export async function updateEntryPoint(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const input: UpdateEntryPointInput = req.body;

    const entryPoint = await entryPointService.updateEntryPoint(id, input);

    // Log audit
    await logAudit({
      userId: (req as any).user?.id,
      action: 'ENTRY_POINT_UPDATE',
      entityType: 'EntryPoint',
      entityId: id,
      changes: input,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(entryPoint);
  } catch (error: any) {
    console.error('Error updating entry point:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
  }
}

/**
 * DELETE /api/v1/entry-points/:id - Delete entry point
 */
export async function deleteEntryPoint(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await entryPointService.deleteEntryPoint(id);

    // Log audit
    await logAudit({
      userId: (req as any).user?.id,
      action: 'ENTRY_POINT_DELETE',
      entityType: 'EntryPoint',
      entityId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting entry point:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/entry-points/validate - Validate entry point location
 */
export async function validateEntryPoint(req: Request, res: Response) {
  try {
    const input: EntryPointValidationRequest = req.body;

    if (!input.siteId || !input.coordinates) {
      return res.status(400).json({
        error: 'Missing required fields: siteId, coordinates',
      });
    }

    const validation = await entryPointService.validateEntryPoint(input);

    res.json(validation);
  } catch (error: any) {
    console.error('Error validating entry point:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/entry-points/geojson/:siteId - Export as GeoJSON
 */
export async function exportAsGeoJSON(req: Request, res: Response) {
  try {
    const { siteId } = req.params;
    const geojson = await entryPointService.exportAsGeoJSON(siteId);

    res.set('Content-Type', 'application/geo+json');
    res.json(geojson);
  } catch (error: any) {
    console.error('Error exporting GeoJSON:', error);
    res.status(500).json({ error: error.message });
  }
}
