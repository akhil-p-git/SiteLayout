import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as layoutController from '../controllers/layout';

const router = Router();
router.use(authenticate);

router.post('/', requirePermission('canEditSite'), layoutController.createLayout);
router.get('/:id', layoutController.getLayout);
router.get('/site/:siteId', layoutController.listLayoutsBySite);
router.patch('/:id', requirePermission('canEditSite'), layoutController.updateLayout);
router.delete('/:id', requirePermission('canEditSite'), layoutController.deleteLayout);

export default router;
