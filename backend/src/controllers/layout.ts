import { Request, Response } from 'express';
import * as layoutService from '../services/layout';
import { logAudit } from '../services/audit';

export async function createLayout(req: Request, res: Response) {
  try {
    const layout = await layoutService.createLayout(req.body);
    await logAudit({ userId: (req as any).user?.id, action: 'LAYOUT_CREATE', entityType: 'Layout', entityId: layout.id, ipAddress: req.ip });
    res.status(201).json(layout);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getLayout(req: Request, res: Response) {
  try {
    const layout = await layoutService.getLayout(req.params.id);
    if (!layout) return res.status(404).json({ error: 'Layout not found' });
    res.json(layout);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listLayoutsBySite(req: Request, res: Response) {
  try {
    const layouts = await layoutService.listLayoutsBySite(req.params.siteId);
    res.json({ count: layouts.length, data: layouts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateLayout(req: Request, res: Response) {
  try {
    const layout = await layoutService.updateLayout(req.params.id, req.body);
    await logAudit({ userId: (req as any).user?.id, action: 'LAYOUT_UPDATE', entityType: 'Layout', entityId: req.params.id, ipAddress: req.ip });
    res.json(layout);
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
  }
}

export async function deleteLayout(req: Request, res: Response) {
  try {
    await layoutService.deleteLayout(req.params.id);
    await logAudit({ userId: (req as any).user?.id, action: 'LAYOUT_DELETE', entityType: 'Layout', entityId: req.params.id, ipAddress: req.ip });
    res.json({ success: true });
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
  }
}
