import { Request, Response } from 'express';
import * as assetService from '../services/asset';
import { logAudit } from '../services/audit';

export async function createAsset(req: Request, res: Response) {
  try {
    const asset = await assetService.createAsset(req.body);
    await logAudit({ userId: (req as any).user?.id, action: 'ASSET_CREATE', entityType: 'Asset', entityId: asset.id, ipAddress: req.ip });
    res.status(201).json(asset);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getAsset(req: Request, res: Response) {
  try {
    const asset = await assetService.getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listAssetsByLayout(req: Request, res: Response) {
  try {
    const assets = await assetService.listAssetsByLayout(req.params.layoutId);
    res.json({ count: assets.length, data: assets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateAsset(req: Request, res: Response) {
  try {
    const asset = await assetService.updateAsset(req.params.id, req.body);
    await logAudit({ userId: (req as any).user?.id, action: 'ASSET_UPDATE', entityType: 'Asset', entityId: req.params.id, ipAddress: req.ip });
    res.json(asset);
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
  }
}

export async function deleteAsset(req: Request, res: Response) {
  try {
    await assetService.deleteAsset(req.params.id);
    await logAudit({ userId: (req as any).user?.id, action: 'ASSET_DELETE', entityType: 'Asset', entityId: req.params.id, ipAddress: req.ip });
    res.json({ success: true });
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
  }
}
