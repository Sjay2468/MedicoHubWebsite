
import { db } from '../../config/firebase';

export class ProductService {
    static async getAllProducts() {
        const snapshot = await db.collection('products').get();
        if (snapshot.empty) return [];
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    }

    static async createProduct(data: any) {
        const docRef = db.collection('products').doc();
        const newProduct = {
            ...data,
            id: docRef.id,
            createdAt: new Date().toISOString()
        };
        await docRef.set(newProduct);
        return newProduct;
    }

    static async deleteProduct(id: string) {
        await db.collection('products').doc(id).delete();
        return { success: true };
    }
}
