import { Request, Response } from 'express';
import * as siteService from '../services/site';
import { logAudit } from '../services/audit';

export async function createSite(req: Request, res: Response) {
  try {
    const site = await siteService.createSite(req.body);
    await logAudit({ userId: (req as any).user?.id, action: 'SITE_CREATE', entityType: 'Site', entityId: site.id, ipAddress: req.ip });
    res.status(201).json(site);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getSite(req: Request, res: Response) {
  try {
    const site = await siteService.getSite(req.params.id);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    res.json(site);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listSitesByProject(req: Request, res: Response) {
  try {
    const sites = await siteService.listSitesByProject(req.params.projectId);
    res.json({ count: sites.length, data: sites });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateSite(req: Request, res: Response) {
  try {
    const site = await siteService.updateSite(req.params.id, req.body);
    await logAudit({ userId: (req as any).user?.id, action: 'SITE_UPDATE', entityType: 'Site', entityId: req.params.id, ipAddress: req.ip });
    res.json(site);
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
  }
}

export async function deleteSite(req: Request, res: Response) {
  try {
    await siteService.deleteSite(req.params.id);
    await logAudit({ userId: (req as any).user?.id, action: 'SITE_DELETE', entityType: 'Site', entityId: req.params.id, ipAddress: req.ip });
    res.json({ success: true });
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
  }
}
