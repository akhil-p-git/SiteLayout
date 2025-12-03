import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as siteController from '../controllers/site';

const router = Router();
router.use(authenticate);

router.post('/', requirePermission('canEditSite'), siteController.createSite);
router.get('/:id', siteController.getSite);
router.get('/project/:projectId', siteController.listSitesByProject);
router.patch('/:id', requirePermission('canEditSite'), siteController.updateSite);
router.delete('/:id', requirePermission('canEditSite'), siteController.deleteSite);

export default router;
