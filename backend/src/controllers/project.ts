import { Request, Response } from 'express';
import * as projectService from '../services/project';
import { logAudit } from '../services/audit';

export async function createProject(req: Request, res: Response) {
  try {
    const project = await projectService.createProject(req.body);
    await logAudit({ userId: (req as any).user?.id, action: 'PROJECT_CREATE', entityType: 'Project', entityId: project.id, ipAddress: req.ip });
    res.status(201).json(project);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function getProject(req: Request, res: Response) {
  try {
    const project = await projectService.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function listProjects(req: Request, res: Response) {
  try {
    const projects = await projectService.listProjects();
    res.json({ count: projects.length, data: projects });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateProject(req: Request, res: Response) {
  try {
    const project = await projectService.updateProject(req.params.id, req.body);
    await logAudit({ userId: (req as any).user?.id, action: 'PROJECT_UPDATE', entityType: 'Project', entityId: req.params.id, ipAddress: req.ip });
    res.json(project);
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 400).json({ error: error.message });
  }
}

export async function deleteProject(req: Request, res: Response) {
  try {
    await projectService.deleteProject(req.params.id);
    await logAudit({ userId: (req as any).user?.id, action: 'PROJECT_DELETE', entityType: 'Project', entityId: req.params.id, ipAddress: req.ip });
    res.json({ success: true });
  } catch (error: any) {
    res.status(error.message.includes('not found') ? 404 : 500).json({ error: error.message });
  }
}
