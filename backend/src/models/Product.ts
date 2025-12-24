import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    description: string;
    price: number;
    images: string[];
    category: 'Textbooks' | 'Essentials' | 'Stationery';
    condition: {
        label: string;
        color: string;
    };
    stockCount: number;
    isFeatured: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    images: [String],
    category: { type: String, required: true },
    condition: {
        label: { type: String, default: 'Brand New' },
        color: { type: String, default: 'green' }
    },
    stockCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false }
}, { timestamps: true });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
