import express from 'express';
import { CouponController } from './coupon.controller';

const router = express.Router();

// Admin Routes (Should be protected in real app, but open for now based on current auth setup)
router.post('/', CouponController.createCoupon);
router.get('/', CouponController.getAllCoupons);
router.delete('/:id', CouponController.deleteCoupon);
router.patch('/:id/toggle', CouponController.toggleCouponStatus);

// Public Routes
router.post('/verify', CouponController.verifyCoupon);

export default router;
