import express from 'express';
import { DeliveryZoneController } from './delivery.controller';

const router = express.Router();

router.get('/', DeliveryZoneController.getAllZones);
router.get('/admin', DeliveryZoneController.getAdminZones);
router.post('/', DeliveryZoneController.createZone);
router.patch('/:id', DeliveryZoneController.updateZone);
router.delete('/:id', DeliveryZoneController.deleteZone);

export default router;
