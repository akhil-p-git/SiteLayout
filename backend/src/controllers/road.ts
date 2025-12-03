import { Request, Response } from 'express';
import * as roadService from '../services/road';
import { logAudit } from '../services/audit';
import { CreateRoadInput, UpdateRoadInput } from '../types/road';

export async function createRoad(req: Request, res: Response) {
  try {
    const input: CreateRoadInput = req.body;
    if (!input.layoutId || !input.coordinates || !input.type) {
      return res.status(400).json({
        error: 'Missing required fields: layoutId, coordinates, type',
      });
    }

    const road = await roadService.createRoad(input);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'ROAD_CREATE',
      entityType: 'Road',
      entityId: road.id,
      changes: { type: road.type, length: road.length },
      ipAddress: req.ip,
    });

    res.status(201).json(road);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getRoad(req: Request, res: Response) {
  try {
    const road = await roadService.getRoad(req.params.id);
    if (!road) return res.status(404).json({ error: 'Road not found' });
    res.json(road);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listRoadsByLayout(req: Request, res: Response) {
  try {
    const roads = await roadService.listRoadsByLayout(req.params.layoutId);
    res.json({ count: roads.length, data: roads });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateRoad(req: Request, res: Response) {
  try {
    const input: UpdateRoadInput = req.body;
    const road = await roadService.updateRoad(req.params.id, input);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'ROAD_UPDATE',
      entityType: 'Road',
      entityId: req.params.id,
      changes: input,
      ipAddress: req.ip,
    });

    res.json(road);
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 400;
    res.status(status).json({ error: error.message });
  }
}

export async function deleteRoad(req: Request, res: Response) {
  try {
    await roadService.deleteRoad(req.params.id);

    await logAudit({
      userId: (req as any).user?.id,
      action: 'ROAD_DELETE',
      entityType: 'Road',
      entityId: req.params.id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error: any) {
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
}

export async function validateRoad(req: Request, res: Response) {
  try {
    const { coordinates } = req.body;
    if (!coordinates) return res.status(400).json({ error: 'Missing coordinates' });

    const result = await roadService.validateRoad(coordinates);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
