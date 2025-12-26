import express from 'express';
import { DeliveryZoneController } from './delivery.controller';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';

const router = express.Router();

router.get('/', DeliveryZoneController.getAllZones);
router.get('/admin', verifyAdmin, DeliveryZoneController.getAdminZones);
router.post('/', verifyAdmin, DeliveryZoneController.createZone);
router.patch('/:id', verifyAdmin, DeliveryZoneController.updateZone);
router.delete('/:id', verifyAdmin, DeliveryZoneController.deleteZone);

export default router;
