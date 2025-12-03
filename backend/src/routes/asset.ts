import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import * as assetController from '../controllers/asset';

const router = Router();
router.use(authenticate);

router.post('/', requirePermission('canEditSite'), assetController.createAsset);
router.get('/:id', assetController.getAsset);
router.get('/layout/:layoutId', assetController.listAssetsByLayout);
router.patch('/:id', requirePermission('canEditSite'), assetController.updateAsset);
router.delete('/:id', requirePermission('canEditSite'), assetController.deleteAsset);

export default router;
