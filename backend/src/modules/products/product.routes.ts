
import { Router } from 'express';
import { ProductService } from './product.service';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.middleware';

/**
 * PRODUCT ROUTES:
 * This file handles all the "Pathways" for our store items.
 * It's how the frontend asks for a list of textbooks or deletes an item.
 */
const router = Router();

// Anybody can GET the list of products (to see them in the store)
router.get('/', async (req, res) => {
    try {
        const results = await ProductService.getAllProducts();
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

// Adding or Deleting products is restricted!
// Only ADMINS (Store Owners) are allowed to do this.
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const result = await ProductService.createProduct(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Failed to create product" });
    }
});

router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await ProductService.deleteProduct(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to delete product" });
    }
});

export default router;
