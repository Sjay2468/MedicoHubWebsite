import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
    code: string;
    type: 'percentage' | 'fixed';
    value: number; // For percentage: 10 means 10%, for fixed: 1000 means ₦1000
    minOrderAmount: number; // Minimum subtotal required to use this coupon
    isActive: boolean;
    expiresAt?: Date;
    usageCount: number;
    createdAt: Date;
}

const CouponSchema: Schema = new Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
    usageCount: { type: Number, default: 0 }
}, { timestamps: true });

export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);
