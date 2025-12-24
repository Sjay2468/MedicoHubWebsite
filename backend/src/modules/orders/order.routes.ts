import express from 'express';
import { OrderController } from './order.controller';

const router = express.Router();

router.post('/', OrderController.createOrder);
router.get('/', OrderController.getAllOrders);
router.patch('/:id/status', OrderController.updateStatus);

export default router;
