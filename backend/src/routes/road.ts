import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as controller from '../controllers/road';

const router = Router();
router.use(authenticate);

router.post('/', requirePermission('canEditSite'), controller.createRoad);
router.get('/:id', controller.getRoad);
router.get('/layout/:layoutId', controller.listRoadsByLayout);
router.patch('/:id', requirePermission('canEditSite'), controller.updateRoad);
router.delete('/:id', requirePermission('canEditSite'), controller.deleteRoad);
router.post('/validate', controller.validateRoad);

export default router;
