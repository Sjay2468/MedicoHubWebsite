import express from 'express';
import { OrderController } from './order.controller';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';

const router = express.Router();

router.post('/', OrderController.createOrder);
router.get('/', verifyAdmin, OrderController.getAllOrders);
router.patch('/:id/status', verifyAdmin, OrderController.updateStatus);

export default router;
