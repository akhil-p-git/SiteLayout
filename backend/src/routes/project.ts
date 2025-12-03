import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as projectController from '../controllers/project';

const router = Router();
router.use(authenticate);

router.post('/', requirePermission('canEditSite'), projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProject);
router.patch('/:id', requirePermission('canEditSite'), projectController.updateProject);
router.delete('/:id', requirePermission('canEditSite'), projectController.deleteProject);

export default router;
