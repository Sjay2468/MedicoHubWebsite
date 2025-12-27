
import { Router } from 'express';
import { ProductService } from './product.service';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';
import { z } from 'zod';

const ProductSchema = z.object({
    name: z.string().min(2, "Name is required"),
    description: z.string().optional(),
    price: z.number().min(0, "Price must be positive"),
    images: z.array(z.string()).optional(),
    category: z.enum(['Textbooks', 'Essentials', 'Stationery', 'Other']),
    stockCount: z.number().int().optional().default(100),
    isFeatured: z.boolean().optional().default(false)
});

const router = Router();

// Anybody can GET the list of products (to see them in the store)
router.get('/', async (req, res) => {
    try {
        const results = await ProductService.getAllProducts();
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to fetch products" });
    }
});

// Adding or Deleting products is restricted!
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const validatedData = ProductSchema.parse(req.body);
        const result = await ProductService.createProduct(validatedData);
        res.json(result);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            });
        }
        res.status(500).json({ error: error.message || "Failed to create product" });
    }
});

router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await ProductService.deleteProduct(req.params.id);
        res.json({ success: true, message: "Product deleted" });
    } catch (error: any) {
        res.status(500).json({ error: error.message || "Failed to delete product" });
    }
});

export default router;
