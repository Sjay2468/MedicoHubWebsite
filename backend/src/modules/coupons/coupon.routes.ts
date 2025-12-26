import express from 'express';
import { CouponController } from './coupon.controller';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';

const router = express.Router();

// Admin Routes
router.post('/', verifyAdmin, CouponController.createCoupon);
router.get('/', verifyAdmin, CouponController.getAllCoupons);
router.delete('/:id', verifyAdmin, CouponController.deleteCoupon);
router.patch('/:id/toggle', verifyAdmin, CouponController.toggleCouponStatus);

// Public Routes
router.post('/verify', CouponController.verifyCoupon);

export default router;
