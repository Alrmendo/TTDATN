import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, searchProducts } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/search', authMiddleware, searchProducts);

router.get('/', authMiddleware, getProducts);

router.post('/', authMiddleware, createProduct);

router.put('/:id', authMiddleware, updateProduct);

router.delete('/:id', authMiddleware, deleteProduct);

export default router;
